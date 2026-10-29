"""Optional sync API tests; no third-party Python packages needed."""
import base64, json, os, secrets, sqlite3, sys, tempfile, threading, unittest, urllib.error, urllib.request, uuid
from pathlib import Path
from http.server import ThreadingHTTPServer
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server


def b64(value): return base64.urlsafe_b64encode(value).decode().rstrip('=')

class SyncServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory(); server.DB=Path(cls.tmp.name)/'test.sqlite3'
        server.Handler.log_message=lambda self, fmt, *args: None
        cls.httpd=ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
        cls.thread=threading.Thread(target=cls.httpd.serve_forever,daemon=True);cls.thread.start()
        cls.base=f'http://127.0.0.1:{cls.httpd.server_port}'
    @classmethod
    def tearDownClass(cls): cls.httpd.shutdown();cls.httpd.server_close();cls.tmp.cleanup()
    def request(self,method,path,token,body=None):
        data=json.dumps(body).encode() if body is not None else None
        req=urllib.request.Request(self.base+path,data=data,method=method,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
        try:
            with urllib.request.urlopen(req,timeout=5) as res: return res.status,json.load(res)
        except urllib.error.HTTPError as err: return err.code,json.load(err)
    def test_authentication_ciphertext_and_conflict_protection(self):
        sid=str(uuid.uuid4());token=b64(secrets.token_bytes(32));other=b64(secrets.token_bytes(32))
        blob={'id':sid,'iv':b64(secrets.token_bytes(12)),'ciphertext':b64(secrets.token_bytes(40))}
        status,body=self.request('POST','/api/sync/create',token,blob);self.assertEqual(status,201);self.assertEqual(body['revision'],1)
        self.assertEqual(self.request('GET','/api/sync/'+sid,other)[0],404)
        self.assertEqual(self.request('GET','/api/sync/'+sid,token)[1]['ciphertext'],blob['ciphertext'])
        second={'revision':1,'iv':b64(secrets.token_bytes(12)),'ciphertext':b64(secrets.token_bytes(50))}
        self.assertEqual(self.request('PUT','/api/sync/'+sid,token,second)[1]['revision'],2)
        stale={'revision':1,'iv':b64(secrets.token_bytes(12)),'ciphertext':b64(secrets.token_bytes(50))}
        self.assertEqual(self.request('PUT','/api/sync/'+sid,token,stale)[0],409)
        self.assertEqual(self.request('GET','/api/sync/'+sid,token)[1]['ciphertext'],second['ciphertext'])
        con=sqlite3.connect(server.DB);stored=con.execute('SELECT token_hash FROM snapshots WHERE id=?',(sid,)).fetchone()[0]
        self.assertNotEqual(stored,token);self.assertNotIn(token,server.DB.read_bytes().decode('latin1'))
    def test_invalid_payload_rejected(self):
        token=b64(secrets.token_bytes(32));bad={'id':str(uuid.uuid4()),'iv':'bad','ciphertext':'bad'}
        self.assertEqual(self.request('POST','/api/sync/create',token,bad)[0],400)

if __name__=='__main__': unittest.main()
