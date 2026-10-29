import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { blankData, demoData, validData } from './model.js';
import { getValue, putValue, updateValue } from './storage.js';
import { createRemote, decryptData, encryptData, makeSyncConfig, parseSyncCode, readRemote, syncCode, writeRemote } from './sync.js';

const Ctx=createContext(null);
export const useShop=()=>useContext(Ctx);
export function ShopProvider({children}) {
  const [data,setData]=useState(null), [sync,setSync]=useState(null), [syncStatus,setSyncStatus]=useState('local');
  const [storageError,setStorageError]=useState(''), [bootError,setBootError]=useState(''), [online,setOnline]=useState(navigator.onLine);
  const dataRef=useRef(null), syncRef=useRef(null), queue=useRef(Promise.resolve()), pendingWrites=useRef(0), locked=useRef(false), alive=useRef(true), channel=useRef(null);
  const enqueue=useCallback(operation=>{
    pendingWrites.current++;
    const work=queue.current.then(operation);
    queue.current=work.catch(error=>{if(!error?.expected && alive.current) setStorageError('Data is device par save nahi ho raha. Browser storage check karein; backup zaroor banayein.');}).finally(()=>{pendingWrites.current--;});
    return work;
  },[]);
  const announce=useCallback(key=>{try{channel.current?.postMessage({key});}catch(_){}},[]);
  const setConfig=useCallback(value=>enqueue(async()=>{await putValue('sync',structuredClone(value));syncRef.current=value;setSync(value);announce('sync');}),[enqueue,announce]);
  const setRawData=useCallback(value=>enqueue(async()=>{await putValue('data',structuredClone(value));dataRef.current=value;setData(value);announce('data');}),[enqueue,announce]);
  const atomicData=useCallback(transform=>enqueue(async()=>{
    const value=await updateValue('data',current=>{
      if(!validData(current)){const e=new Error('Saved data ka format theek nahi.');e.expected=true;throw e;}
      return transform(current);
    });
    dataRef.current=value;setData(value);announce('data');return value;
  }),[enqueue,announce]);
  const mutate=useCallback(fn=>{
    if (!dataRef.current) return Promise.resolve();
    if (syncRef.current) setSyncStatus(current=>current==='conflict'?'conflict':navigator.onLine?'pending':'offline');
    return atomicData(current=>{
      const draft=structuredClone(current);
      try { fn(draft); } catch(e) { e.expected=true;throw e; }
      draft.localRevision=(Number(current.localRevision)||0)+1;
      if(!validData(draft)){const e=new Error('Yeh details sahi format ya had mein nahi hain. Dobara check karein.');e.expected=true;throw e;}
      return draft;
    });
  },[atomicData]);
  const replaceLocal=useCallback(replacement=>{
    if (syncRef.current) setSyncStatus(current=>current==='conflict'?'conflict':navigator.onLine?'pending':'offline');
    return atomicData(current=>{const next=structuredClone(replacement);next.localRevision=(Number(current.localRevision)||0)+1;if(!validData(next)){const e=new Error('Yeh data valid nahi hai.');e.expected=true;throw e;}return next;});
  },[atomicData]);
  useEffect(()=>{
    alive.current=true;
    (async()=>{try {
      const existing=await getValue('data');
      // Two tabs may initialize at once: never replace the other tab's first write.
      const initial=existing || await updateValue('data',current=>current || demoData());
      if(!validData(initial)) throw new Error('Is device ka saved data nahi parh saka. Browser storage saaf na karein; madad lein.');
      dataRef.current=initial; setData(initial);
      const config=await getValue('sync');
      if(config?.id && config?.token && config?.key) { syncRef.current=config; setSync(config); setSyncStatus('pending'); }
    } catch(e) {setBootError(e?.message || 'Browser storage nahi khul saki. Browser ki site storage allow karein.');}})();
    const onOnline=()=>setOnline(navigator.onLine); window.addEventListener('online',onOnline);window.addEventListener('offline',onOnline);
    const beforeUnload=e=>{if(pendingWrites.current){e.preventDefault();e.returnValue='';}}; window.addEventListener('beforeunload',beforeUnload);
    if('BroadcastChannel' in globalThis){
      channel.current=new BroadcastChannel('darzi-dukaan-changes-v1');
      channel.current.onmessage=async event=>{try{
        if(event.data?.key==='data'){const incoming=await getValue('data');if(validData(incoming)){dataRef.current=incoming;setData(incoming);}}
        if(event.data?.key==='sync'){const incoming=await getValue('sync');syncRef.current=incoming||null;setSync(incoming||null);if(!incoming)setSyncStatus('local');}
      }catch(_){}};
    }
    return ()=>{alive.current=false;window.removeEventListener('online',onOnline);window.removeEventListener('offline',onOnline);window.removeEventListener('beforeunload',beforeUnload);channel.current?.close();channel.current=null;};
  },[]);
  const performSync=useCallback(async()=>{
    const cfg=syncRef.current;
    if (!cfg || locked.current) return;
    if (!navigator.onLine) {setSyncStatus('offline'); return;}
    locked.current=true; setSyncStatus('working');
    try {
      const remote=await readRemote(cfg);
      // Another tab can commit just before its broadcast arrives. Read the
      // latest persisted data rather than uploading an in-memory stale copy.
      const local=await getValue('data');
      if(!validData(local) || syncRef.current?.id!==cfg.id || syncRef.current?.revision!==cfg.revision) return;
      if(dataRef.current?.localRevision !== local.localRevision){dataRef.current=local;setData(local);}
      const dirty=(Number(local.localRevision)||0) !== cfg.syncedLocalRevision;
      if(remote.revision > cfg.revision) {
        if(dirty) {setSyncStatus('conflict'); return;}
        const incoming=await decryptData(remote,cfg);
        if(!validData(incoming)) throw new Error('Server data ka format theek nahi.');
        if(syncRef.current?.id!==cfg.id || syncRef.current?.revision!==cfg.revision) return;
        // Compare and replace in the same transaction; another tab may have
        // written local data while the remote snapshot was being decrypted.
        await atomicData(current=>{
          if((Number(current.localRevision)||0)!==cfg.syncedLocalRevision){const e=new Error('Local changes');e.expected=true;e.syncConflict=true;throw e;}
          return incoming;
        });
        await setConfig({...cfg,revision:remote.revision,syncedLocalRevision:Number(incoming.localRevision)||0});
      } else if(remote.revision === cfg.revision && dirty) {
        const snapshot=local;
        const encrypted=await encryptData(snapshot,cfg);
        const result=await writeRemote(cfg,encrypted);
        if(syncRef.current?.id!==cfg.id) return;
        await setConfig({...cfg,revision:result.revision,syncedLocalRevision:Number(snapshot.localRevision)||0});
      } else if(remote.revision < cfg.revision) throw new Error('Server ka version purana hai. Backup check karein.');
      if(syncRef.current?.id===cfg.id) setSyncStatus((Number(dataRef.current.localRevision)||0) === syncRef.current.syncedLocalRevision ? 'synced' : 'pending');
    } catch(e) {
      if(syncRef.current?.id===cfg.id) setSyncStatus(e?.status===409 || e?.syncConflict ? 'conflict' : 'error');
    } finally {locked.current=false;}
  },[setConfig,setRawData,atomicData]);
  useEffect(()=>{
    if(!sync || !data || !online) return;
    const delay=setTimeout(()=>performSync(),1200);
    const interval=setInterval(()=>performSync(),30000);
    const focus=()=>performSync(); window.addEventListener('focus',focus);
    return ()=>{clearTimeout(delay);clearInterval(interval);window.removeEventListener('focus',focus);};
  },[sync?.id,sync?.revision,data?.localRevision,online,performSync]);
  const createSync=async()=>{
    if(locked.current) throw new Error('Sync ka doosra kaam chal raha hai.');
    locked.current=true; setSyncStatus('working');
    try {
      const cfg=makeSyncConfig(), snapshot=dataRef.current;
      const result=await createRemote(cfg,await encryptData(snapshot,cfg));
      const newCfg={...cfg,revision:result.revision,syncedLocalRevision:Number(snapshot.localRevision)||0};
      await setConfig(newCfg); setSyncStatus((Number(dataRef.current.localRevision)||0)===newCfg.syncedLocalRevision?'synced':'pending');
      return syncCode(newCfg);
    } catch(e) {setSyncStatus('error');throw e;} finally {locked.current=false;}
  };
  const connectSync=async(code)=>{
    if(locked.current) throw new Error('Sync ka doosra kaam chal raha hai.');
    locked.current=true;setSyncStatus('working');
    try {
      const cfg=parseSyncCode(code), remote=await readRemote(cfg), incoming=await decryptData(remote,cfg);
      if(!validData(incoming)) throw new Error('Server data ka format theek nahi.');
      await setRawData(incoming); await setConfig({...cfg,revision:remote.revision,syncedLocalRevision:Number(incoming.localRevision)||0});setSyncStatus('synced');
    } catch(e) {setSyncStatus('error');throw e;} finally {locked.current=false;}
  };
  const useRemote=async()=>{
    const cfg=syncRef.current; if(!cfg) throw new Error('Sync connected nahi hai.');
    if(locked.current) throw new Error('Sync ka doosra kaam chal raha hai.');
    locked.current=true;
    try {const remote=await readRemote(cfg),incoming=await decryptData(remote,cfg); if(!validData(incoming))throw new Error('Server data ka format theek nahi.');
      await setRawData(incoming);await setConfig({...cfg,revision:remote.revision,syncedLocalRevision:Number(incoming.localRevision)||0});setSyncStatus('synced');
    } finally {locked.current=false;}
  };
  const disconnectSync=async()=>{await setConfig(null);setSyncStatus('local');};
  const startFresh=()=>replaceLocal(blankData());
  if(bootError) return <div className="fatal"><strong>Storage nahi khul saki</strong><p>{bootError}</p><p>Browser settings mein site storage allow karke dobara kholain.</p></div>;
  if(!data) return <div className="app-loading"><span className="spinner"/>Dukaan khul rahi hai…</div>;
  return <Ctx.Provider value={{data,mutate,replaceLocal,startFresh,sync,syncStatus,online,storageError,performSync,createSync,connectSync,useRemote,disconnectSync}}>{children}</Ctx.Provider>;
}
