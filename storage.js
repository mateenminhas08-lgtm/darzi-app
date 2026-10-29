const DB = 'darzi-dukaan-v1';
let pending;
function openDB() {
  if (!pending) pending = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('state')) request.result.createObjectStore('state'); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Storage blocked'));
  });
  return pending;
}
export async function getValue(key) {
  const db = await openDB();
  return new Promise((resolve,reject) => {
    const tx=db.transaction('state','readonly'); const req=tx.objectStore('state').get(key);
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
}
export async function putValue(key, value) {
  const db = await openDB();
  return new Promise((resolve,reject) => {
    const tx=db.transaction('state','readwrite'); tx.objectStore('state').put(value,key);
    tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error); tx.onabort=()=>reject(tx.error || new Error('Save aborted'));
  });
}
// Read/modify/write happens inside one IndexedDB transaction, so two tabs do
// not silently replace each other's unrelated edits.
export async function updateValue(key, transform) {
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('state','readwrite'), store=tx.objectStore('state'), req=store.get(key);
    let result, reason;
    req.onsuccess=()=>{
      try { result=transform(req.result); store.put(result,key); }
      catch(error) { reason=error; try { tx.abort(); } catch (_) {} }
    };
    req.onerror=()=>{reason=req.error;};
    tx.oncomplete=()=>resolve(result);
    tx.onabort=()=>reject(reason || tx.error || new Error('Save aborted'));
    tx.onerror=()=>{};
  });
}
