import React, {useEffect, useRef} from 'react';
import { createPortal } from 'react-dom';
import { X, Search, ChevronRight, Inbox, AlertCircle } from 'lucide-react';
import { statusInfo } from './model.js';

function refreshModalInert() {
  const dialogs=Array.from(document.querySelectorAll('.modal-backdrop'));
  document.querySelectorAll('.sidebar,.main-shell,.mobile-nav,.mobile-more').forEach(node=>{node.inert=dialogs.length>0;});
  dialogs.forEach((node,index)=>{node.inert=index!==dialogs.length-1;});
  document.body.style.overflow=dialogs.length?'hidden':'';
}
export function Modal({title,subtitle,onClose,children,wide=false}) {
  const root=useRef(null),close=useRef(onClose);close.current=onClose;
  useEffect(()=>{
    const previous=document.activeElement;
    refreshModalInert();
    const first=root.current?.querySelector('[autofocus], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
    first?.focus({preventScroll:true});
    const fn=e=>{
      const dialogs=document.querySelectorAll('.modal-backdrop');
      if(dialogs[dialogs.length-1]!==root.current)return;
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close.current();return;}
      if(e.key==='Tab'){
        const list=Array.from(root.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(el=>el.getClientRects().length);
        if(!list.length)return;
        if(e.shiftKey && (document.activeElement===list[0]||!root.current.contains(document.activeElement))){e.preventDefault();list[list.length-1].focus();}
        else if(!e.shiftKey && document.activeElement===list[list.length-1]){e.preventDefault();list[0].focus();}
      }
    };
    document.addEventListener('keydown',fn,true);
    return ()=>{document.removeEventListener('keydown',fn,true);queueMicrotask(()=>{refreshModalInert();if(previous?.isConnected&&!previous.closest('[inert]'))previous.focus({preventScroll:true});});};
  },[]);
  return createPortal(<div ref={root} className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close.current();}}>
    <section className={'modal '+(wide?'modal-wide':'')} role="dialog" aria-modal="true" aria-label={title}>
      <header className="modal-head"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button className="icon-btn close-btn" type="button" onClick={onClose} aria-label="Band karein"><X size={19}/></button></header>
      <div className="modal-body">{children}</div>
    </section>
  </div>, document.body);
}

export function Field({label,help,required,children,className=''}) {
  return <label className={'field '+className}><span>{label} {required&&<i>*</i>}</span>{children}{help&&<small>{help}</small>}</label>;
}
export function ErrorText({children}) {return children?<div className="form-error" role="alert"><AlertCircle size={16}/><span>{children}</span></div>:null;}
export function PageHead({eyebrow,title,subtitle,actions}) {
  return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>{actions&&<div className="page-actions">{actions}</div>}</div>;
}
export function CardHead({eyebrow,title,subtitle,action}) {
  return <div className="card-head"><div>{eyebrow&&<span className="mini-eyebrow">{eyebrow}</span>}<h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>;
}
export function StatusPill({status}) {const s=statusInfo(status);return <span className={'status-pill status-'+s.id}><span className="status-dot"/>{s.label}</span>;}
export function Empty({title,text,action,icon:Icon=Inbox}) {return <div className="empty"><div className="empty-icon"><Icon size={21}/></div><strong>{title}</strong><p>{text}</p>{action}</div>;}
export function SearchBox({value,onChange,placeholder='Search karein…'}) {return <div className="search-box"><Search size={17}/><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}/>{value&&<button type="button" onClick={()=>onChange('')} aria-label="Search clear karein"><X size={15}/></button>}</div>;}
export function TextLink({children,onClick}) {return <button className="text-link" type="button" onClick={onClick}>{children}<ChevronRight size={15}/></button>;}
export function ModalFooter({onClose,save='Save karein',busy=false,children}) {return <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>{children}<button type="submit" className="btn btn-primary" disabled={busy}>{busy?'Save ho raha hai…':save}</button></div>;}
export function Initials({name,size=''}) {const letters=(String(name||'').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('')||'?').toUpperCase();return <span className={'initials '+size} aria-hidden="true">{letters}</span>;}
