import React,{useEffect,useState} from 'react';
import { BarChart3, BriefcaseBusiness, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, ClipboardList, Cloud, CloudOff, Home, LayoutDashboard, Menu, Plus, Scissors, Search, Settings2, ShieldCheck, Users, Wallet, X } from 'lucide-react';
import { useShop } from './store.jsx';
import { dateKey, fmtDate, itemDueDate, money, orderBalance, orderPaid, orderTotal } from './model.js';
import { CustomerDetail, CustomerForm } from './Customers.jsx';
import { OrderDetail, OrderForm } from './Orders.jsx';
import Dashboard from './Dashboard.jsx';
import Orders from './Orders.jsx';
import Customers from './Customers.jsx';
import { Finance, Reports, Workers } from './Finance.jsx';
import Settings from './Settings.jsx';

const NAV=[
  {id:'dashboard',label:'Dukaan ka haal',icon:LayoutDashboard},
  {id:'orders',label:'Orders',icon:ClipboardList},
  {id:'customers',label:'Customers & Naap',icon:Users},
  {id:'finance',label:'Hisaab kitaab',icon:Wallet},
  {id:'workers',label:'Karigar',icon:Scissors},
  {id:'reports',label:'Reports',icon:BarChart3},
  {id:'settings',label:'Settings',icon:Settings2},
];
const mobile=[NAV[0],NAV[1],NAV[2],NAV[3]];
function Brand(){return <div className="brand"><div className="brand-logo"><Scissors size={20}/></div><div><strong>darzi<span>dukaan</span></strong><small>NAAP SE DELIVERY TAK</small></div></div>;}
function Receipt({order,data}) {
  if(!order)return null;const customer=data.customers.find(c=>c.id===order.customerId);
  return <div className="receipt-print"><div className="receipt-heading"><div><strong>{data.shop.name}</strong><p>{data.shop.address||''}{data.shop.phone?' · '+data.shop.phone:''}</p></div><b>ORDER RECEIPT</b></div><hr/><h1>{order.number}</h1><div className="receipt-info"><div>Customer: <strong>{order.customerName}</strong><br/>Phone: {customer?.phone||'—'}</div><div>Order: {fmtDate(order.createdDate,{day:'numeric',month:'short',year:'numeric'})}<br/>Delivery: <strong>{fmtDate(order.dueDate,{day:'numeric',month:'short',year:'numeric'})}</strong></div></div><table><thead><tr><th>Kapray / kis ke liye</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead><tbody>{order.items.map(i=><tr key={i.id}><td>{i.type} · {i.personName}<br/><small>Delivery: {fmtDate(itemDueDate(i,order),{day:'numeric',month:'short',year:'numeric'})}{i.fabric?' · '+i.fabric:''}</small></td><td>{i.quantity}</td><td>{money(i.rate)}</td><td>{money(i.quantity*i.rate)}</td></tr>)}</tbody></table>{order.discount>0&&<p>Discount: {money(order.discount)}</p>}<div className="receipt-total"><span>Total: <strong>{money(orderTotal(order))}</strong></span><span>Wasool: <strong>{money(orderPaid(order))}</strong></span><span>Baqaya: <strong>{money(orderBalance(order))}</strong></span></div>{order.note&&<p>Note: {order.note}</p>}<p className="receipt-foot">Shukriya! · {data.shop.name}</p></div>;
}
function syncLabel(sync,status,online){if(!online)return 'Offline · device par saved';if(!sync)return 'Sirf is device par';if(status==='working')return 'Sync ho rahi hai';if(status==='synced')return 'Sync ho gayi';if(status==='conflict')return 'Sync mein conflict';return 'Sync pending';}
export default function App(){
  const shop=useShop(),{data,sync,syncStatus,online,storageError,startFresh}=shop;
  const [view,setView]=useState('dashboard'),[more,setMore]=useState(false),[search,setSearch]=useState(''),[orderSearch,setOrderSearch]=useState('');
  const [customerForm,setCustomerForm]=useState(null),[customerDetail,setCustomerDetail]=useState(''),[orderForm,setOrderForm]=useState(null),[orderDetail,setOrderDetail]=useState(''),[receipt,setReceipt]=useState(null),[toast,setToast]=useState('');
  const notify=message=>setToast(message);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),4000);return()=>clearTimeout(t);},[toast]);
  const go=id=>{setView(id);setMore(false);window.scrollTo({top:0,behavior:'instant'});};
  const newOrder=customerId=>setOrderForm({customerId:typeof customerId==='string'?customerId:undefined});
  const editOrder=order=>setOrderForm({order});
  const printOrder=order=>{setReceipt(structuredClone(order));setTimeout(()=>window.print(),120);};
  const fresh=async()=>{if(window.confirm('Sample data aur us par ki gayi tamam changes delete ho jayengi. Agar sync on hai to yeh change server par bhi ja sakta hai. Kya apni khaali dukaan shuru karein?')){try{await startFresh();go('settings');notify('Apni dukaan tayar hai. Naam neeche save karein.');}catch(_){notify('Data save nahi ho saka. Storage check karein.');}}};
  const current=NAV.find(n=>n.id===view);
  return <><div className="app-shell">
    <aside className="sidebar"><Brand/><div className="sidebar-label">MENU</div><nav className="side-nav" aria-label="Main menu">{NAV.map(({id,label,icon:Icon})=><button key={id} className={view===id?'active':''} onClick={()=>go(id)}><Icon size={18}/><span>{label}</span>{view===id&&<ChevronRight className="nav-chevron" size={15}/>}</button>)}</nav><div className="side-bottom"><div className="side-note"><span className="side-note-icon"><ShieldCheck size={18}/></span><strong>Aapki dukaan, aapka data.</strong><p>Backup banate rahein. Customer details private rakhein.</p><button onClick={()=>go('settings')}>Backup settings <ArrowIcon/></button></div><button className="shop-profile" onClick={()=>go('settings')}><span className="shop-avatar">{(data.shop.name||'D').slice(0,1).toUpperCase()}</span><span><strong>{data.shop.name}</strong><small>Dukaan settings</small></span><ChevronDown size={15}/></button></div></aside>
    <div className="main-shell"><header className="topbar"><div className="mobile-brand"><Brand/></div><div className="breadcrumb"><span>DARZI DUKAAN</span><ChevronRight size={14}/><strong>{current?.label}</strong></div><div className="top-actions"><form className="global-search" onSubmit={e=>{e.preventDefault();setOrderSearch(search);go('orders');}}><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} aria-label="Customer ya order search" placeholder="Customer ya order search"/><kbd>↵</kbd></form><button className={'connection '+(!online?'connection-off':'')} onClick={()=>go('settings')} title="Storage aur sync settings"><span/>{syncLabel(sync,syncStatus,online)}</button><button className="btn btn-primary top-new" onClick={()=>newOrder()}><Plus size={16}/> Naya order</button></div></header>
      <main className="content">
        {!online&&<div className="offline-banner">Internet band hai. Kaam is device par save hoga; internet aur app dono chalne par sync dobara hogi.</div>}
        {storageError&&<div className="storage-banner">{storageError}</div>}
        {syncStatus==='conflict'&&<div className="storage-banner">Sync conflict: dono devices par alag changes hain. <button onClick={()=>go('settings')}>Backup aur settings dekhain</button></div>}
        {data.isDemo&&<div className="demo-banner"><div className="demo-icon">✳</div><div><strong>Yeh sample dukaan hai</strong><span>Demo data se app dekhain; apna kaam shuru karne se pehle sample hatayein.</span></div><button onClick={fresh}>Apni dukaan shuru karein <ChevronRight size={15}/></button></div>}
        {view==='dashboard'&&<Dashboard onOrder={setOrderDetail} onView={go} onNew={()=>newOrder()}/>}
        {view==='orders'&&<Orders onNew={()=>newOrder()} onOrder={setOrderDetail} initialSearch={orderSearch}/>}
        {view==='customers'&&<Customers onNew={()=>setCustomerForm({})} onCustomer={setCustomerDetail}/>}
        {view==='finance'&&<Finance onOrder={setOrderDetail}/>}
        {view==='workers'&&<Workers onOrder={setOrderDetail}/>}
        {view==='reports'&&<Reports/>}
        {view==='settings'&&<Settings notify={notify}/>}
      </main><footer className="app-footer"><span>© Darzi Dukaan <i/> Chhoti dukaan. Bara kaam.</span><span>Naap se delivery tak <span className="footer-spark">✳</span></span></footer>
    </div>
    <nav className="mobile-nav" aria-label="Mobile menu">{mobile.map(({id,label,icon:Icon})=><button key={id} onClick={()=>go(id)} className={view===id?'active':''}><Icon size={19}/><span>{id==='dashboard'?'Home':id==='customers'?'Naap':id==='finance'?'Hisaab':label}</span></button>)}<button onClick={()=>setMore(!more)} className={['workers','reports','settings'].includes(view)?'active':''}><Menu size={19}/><span>More</span></button></nav>
    {more&&<div className="mobile-more"><div className="mobile-more-head"><strong>Aur options</strong><button className="icon-btn" onClick={()=>setMore(false)} aria-label="Menu band karein"><X size={17}/></button></div>{NAV.slice(4).map(({id,label,icon:Icon})=><button key={id} onClick={()=>go(id)}><Icon size={17}/>{label}<ChevronRight size={16}/></button>)}</div>}
    {toast&&<div className="toast" role="status"><CheckCircle2 size={17}/>{toast}</div>}
    {customerDetail&&<CustomerDetail id={customerDetail} onClose={()=>setCustomerDetail('')} onEdit={c=>setCustomerForm({customer:c})} onOrder={id=>{setCustomerDetail('');newOrder(id);}}/>}
    {customerForm&&<CustomerForm customer={customerForm.customer} onClose={()=>setCustomerForm(null)} onSaved={()=>notify('Customer save ho gaya.')}/>}
    {orderDetail&&<OrderDetail id={orderDetail} onClose={()=>setOrderDetail('')} onEdit={editOrder} onPrint={printOrder}/>}
    {orderForm&&<OrderForm order={orderForm.order} customerId={orderForm.customerId} onClose={()=>setOrderForm(null)} onSaved={id=>{notify(orderForm.order?'Order update ho gaya.':'Naya order ban gaya.');setOrderDetail(id);}}/>}
  </div><Receipt order={receipt} data={data}/></>;
}
function ArrowIcon(){return <span aria-hidden="true">↗</span>;}
