// Optional sync uses a random capability plus a distinct AES-GCM key.
// Only ciphertext and the capability are sent to the current app server.
const enc = new TextEncoder();
const dec = new TextDecoder();
function b64(bytes) {
  let raw=''; for (let i=0; i<bytes.length; i+=0x8000) raw += String.fromCharCode(...bytes.subarray(i,i+0x8000));
  return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function unb64(text) {
  const base=String(text).replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(base + '='.repeat((4-base.length%4)%4)); return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
function random(length) { const bytes=new Uint8Array(length); crypto.getRandomValues(bytes); return b64(bytes); }
function requireSecure() { if (!globalThis.isSecureContext || !globalThis.crypto?.subtle) throw new Error('Secure sync ke liye HTTPS ya localhost zaroori hai.'); }
export function makeSyncConfig() {
  requireSecure();
  return { version:1, id:crypto.randomUUID(), token:random(32), key:random(32), revision:0, syncedLocalRevision:-1 };
}
export function syncCode(config) {
  return 'DD1.' + b64(enc.encode(JSON.stringify({v:1,id:config.id,t:config.token,k:config.key})));
}
export function parseSyncCode(value) {
  requireSecure();
  try {
    const text=String(value||'').trim();
    if (!text.startsWith('DD1.') || text.length>1000) throw new Error('invalid');
    const x=JSON.parse(dec.decode(unb64(text.slice(4))));
    if (x.v!==1 || !/^[a-f0-9-]{36}$/i.test(x.id) || !/^[A-Za-z0-9_-]{43}$/.test(x.t) || !/^[A-Za-z0-9_-]{43}$/.test(x.k)) throw new Error('invalid');
    if (unb64(x.t).length!==32 || unb64(x.k).length!==32) throw new Error('invalid');
    return {version:1,id:x.id,token:x.t,key:x.k,revision:0,syncedLocalRevision:-1};
  } catch (_) { throw new Error('Sync key ghalat hai. Puri key dobara copy karein.'); }
}
async function keyFor(config) { return crypto.subtle.importKey('raw',unb64(config.key),{name:'AES-GCM'},false,['encrypt','decrypt']); }
export async function encryptData(data, config) {
  requireSecure();
  const iv=new Uint8Array(12); crypto.getRandomValues(iv);
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},await keyFor(config),enc.encode(JSON.stringify(data)));
  return { iv:b64(iv), ciphertext:b64(new Uint8Array(encrypted)) };
}
export async function decryptData(blob, config) {
  requireSecure();
  try {
    const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(blob.iv)},await keyFor(config),unb64(blob.ciphertext));
    return JSON.parse(dec.decode(bytes));
  } catch (_) { throw new Error('Sync key se data nahi khul saka. Key check karein.'); }
}
async function request(path, config, options={}) {
  const headers={ 'Authorization': `Bearer ${config.token}`, ...(options.body ? {'Content-Type':'application/json'} : {}) };
  let response;
  try { response=await fetch(path,{method:options.method||'GET',headers,body:options.body?JSON.stringify(options.body):undefined,cache:'no-store',credentials:'same-origin'}); }
  catch (_) { throw new Error('Sync server tak rasai nahi. Data is device par mehfooz hai.'); }
  let result={}; try { result=await response.json(); } catch (_) {}
  if (!response.ok) { const error=new Error(result.error || 'Sync nahi ho saki.'); error.status=response.status; throw error; }
  return result;
}
export function createRemote(config, blob) { return request('/api/sync/create',config,{method:'POST',body:{id:config.id,...blob}}); }
export function readRemote(config) { return request(`/api/sync/${encodeURIComponent(config.id)}`,config); }
export function writeRemote(config, blob) { return request(`/api/sync/${encodeURIComponent(config.id)}`,config,{method:'PUT',body:{revision:config.revision,...blob}}); }
