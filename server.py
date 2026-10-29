#!/usr/bin/env python3
"""Darzi Dukaan static app + optional encrypted snapshot sync (standard library only)."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
from pathlib import Path
import argparse, base64, hashlib, hmac, json, os, re, sqlite3, time, uuid

ROOT = Path(__file__).resolve().parent
SITE = ROOT / 'site'
DB = Path(os.environ.get('DARZI_SYNC_DB', str(ROOT / 'data' / 'sync.sqlite3')))
MAX_BODY = 12 * 1024 * 1024
TOKEN = re.compile(r'^[A-Za-z0-9_-]{43}$')


def db():
    DB.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    con = sqlite3.connect(DB, timeout=10)
    con.execute('PRAGMA busy_timeout=10000')
    con.execute('CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, revision INTEGER NOT NULL, iv TEXT NOT NULL, ciphertext TEXT NOT NULL, updated_at INTEGER NOT NULL)')
    try: os.chmod(DB, 0o600)
    except OSError: pass
    return con


def uuid_ok(value):
    try: return str(uuid.UUID(value)) == value.lower()
    except (ValueError, TypeError, AttributeError): return False


def payload_ok(payload):
    try:
        iv, ciphertext = payload['iv'], payload['ciphertext']
        if not isinstance(iv, str) or not isinstance(ciphertext, str) or len(ciphertext) > 11_000_000: return False
        if not re.fullmatch(r'[A-Za-z0-9_-]+', iv) or not re.fullmatch(r'[A-Za-z0-9_-]+', ciphertext): return False
        decode = lambda s: base64.urlsafe_b64decode(s + '=' * (-len(s) % 4))
        return len(decode(iv)) == 12 and len(decode(ciphertext)) >= 16
    except (ValueError, KeyError, TypeError): return False


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs): super().__init__(*args, directory=str(SITE), **kwargs)

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        if self.path.startswith('/api/'): self.send_header('Cache-Control', 'no-store')
        if self.path.split('?')[0] in ('/', '/index.html', '/sw.js'): self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def reply(self, status, body):
        raw = json.dumps(body, separators=(',', ':')).encode()
        self.send_response(status); self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(raw))); self.end_headers(); self.wfile.write(raw)

    def auth_hash(self):
        val = self.headers.get('Authorization', '')
        token = val[7:] if val.startswith('Bearer ') else ''
        return hashlib.sha256(token.encode()).hexdigest() if TOKEN.fullmatch(token) else ''

    def read_json(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length < 2 or length > MAX_BODY: return None
            body = self.rfile.read(length)
            obj = json.loads(body)
            return obj if isinstance(obj, dict) else None
        except (ValueError, UnicodeError, json.JSONDecodeError): return None

    def row_authorized(self, con, sid):
        auth = self.auth_hash()
        if not auth or not uuid_ok(sid): return None
        row = con.execute('SELECT token_hash,revision,iv,ciphertext FROM snapshots WHERE id=?', (sid,)).fetchone()
        if row is None or not hmac.compare_digest(row[0], auth): return None
        return row

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/api/health': return self.reply(200, {'ok': True, 'sync': 'encrypted-snapshot-v1'})
        if path.startswith('/api/sync/'):
            sid = path[len('/api/sync/'):]
            with db() as con: row = self.row_authorized(con, sid)
            if not row: return self.reply(404, {'error':'Sync key ya server data nahi mila.'})
            return self.reply(200, {'revision':row[1], 'iv':row[2], 'ciphertext':row[3]})
        if path.startswith('/api/'): return self.reply(404, {'error':'Not found'})
        return super().do_GET()

    def do_POST(self):
        if urlsplit(self.path).path != '/api/sync/create': return self.reply(404, {'error':'Not found'})
        body, auth = self.read_json(), self.auth_hash()
        if not body or not auth or not uuid_ok(body.get('id')) or not payload_ok(body): return self.reply(400, {'error':'Sync request ghalat hai.'})
        try:
            with db() as con:
                con.execute('INSERT INTO snapshots (id,token_hash,revision,iv,ciphertext,updated_at) VALUES (?,?,?,?,?,?)', (body['id'],auth,1,body['iv'],body['ciphertext'],int(time.time())))
            return self.reply(201, {'revision':1})
        except sqlite3.IntegrityError: return self.reply(409, {'error':'Sync ID pehle se hai.'})

    def do_PUT(self):
        path = urlsplit(self.path).path
        if not path.startswith('/api/sync/'): return self.reply(404, {'error':'Not found'})
        sid = path[len('/api/sync/'):]; body = self.read_json()
        if not body or not payload_ok(body) or type(body.get('revision')) is not int or body['revision'] < 1:
            return self.reply(400, {'error':'Sync request ghalat hai.'})
        with db() as con:
            con.execute('BEGIN IMMEDIATE')
            row = self.row_authorized(con, sid)
            if not row: return self.reply(404, {'error':'Sync key ya server data nahi mila.'})
            if row[1] != body['revision']: return self.reply(409, {'error':'Dono devices par alag changes hain. Koi data overwrite nahi hua.', 'revision':row[1]})
            new_revision = row[1] + 1
            con.execute('UPDATE snapshots SET revision=?,iv=?,ciphertext=?,updated_at=? WHERE id=?', (new_revision, body['iv'], body['ciphertext'], int(time.time()), sid))
        return self.reply(200, {'revision':new_revision})

    def log_message(self, fmt, *args):
        # Do not log authorization headers or request bodies.
        super().log_message(fmt, *args)


def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--host', default='127.0.0.1'); parser.add_argument('--port',type=int,default=4173); args=parser.parse_args()
    if not (SITE / 'index.html').exists(): raise SystemExit('site/ missing. Run npm install && npm run build first.')
    with db(): pass
    print(f'Darzi Dukaan listening on http://{args.host}:{args.port}', flush=True)
    ThreadingHTTPServer((args.host,args.port),Handler).serve_forever()

if __name__ == '__main__': main()
