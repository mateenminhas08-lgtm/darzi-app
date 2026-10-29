import React from 'react';
import { ArrowUpRight, CalendarClock, ClipboardList, Clock3, PackageCheck, Wallet, ChevronRight, Sparkles, TrendingUp } from 'lucide-react';
import { useShop } from './store.jsx';
import { dateKey, fmtDate, metrics, money, nextDueDate, orderBalance, overallStatus, receivedByDate, remainingPieces, shiftDay } from './model.js';
import { CardHead, Initials, PageHead, StatusPill, TextLink, Empty } from './ui.jsx';

function StatCard({icon:Icon,label,value,detail,tone}) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className={'stat-icon '+tone}><Icon size={17}/></span></div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></div>;
}
function DueRow({order,onOpen,today}) {
  const due=nextDueDate(order);const when=due<today?'Late':due===today?'Aaj':fmtDate(due);
  return <button type="button" onClick={()=>onOpen(order.id)} className="due-row">
    <Initials name={order.customerName}/><span className="due-person"><strong>{order.customerName}</strong><small>{order.number} · {remainingPieces(order)} joray</small></span>
    <span className={'due-date '+(due<today?'late':'')}><CalendarClock size={14}/>{when}</span><span className="due-status"><StatusPill status={overallStatus(order)}/></span><ChevronRight className="row-arrow" size={17}/>
  </button>;
}
export default function Dashboard({onOrder,onView,onNew}) {
  const {data}=useShop(); const today=dateKey(); const m=metrics(data,today);
  const queue=[...m.open].sort((a,b)=>(nextDueDate(a)||'9999').localeCompare(nextDueDate(b)||'9999')).slice(0,5);
  const capacity=Math.max(1,Number(data.shop.capacity)||1), pct=Math.min(100,Math.round(m.dueTodayPieces/capacity*100));
  const days=Array.from({length:7},(_,i)=>shiftDay(today,i-6)); const values=days.map(d=>receivedByDate(data,d)); const max=Math.max(...values,1); const weekly=values.reduce((s,n)=>s+n,0);
  return <div className="page dashboard-page">
    <PageHead eyebrow="DUKAAN OVERVIEW" title={<>Aaj ka kaam, <em>aasan.</em></>} subtitle="Aapki dukaan ka saara haal, ek nazar mein." actions={<div className="today-chip"><CalendarClock size={15}/> {fmtDate(today,{weekday:'short',day:'numeric',month:'long'})}</div>}/>
    <div className="stats-grid">
      <StatCard icon={ClipboardList} label="Kaam jaari" value={`${m.openPieces} joray`} detail={`${m.open.length} open orders`} tone="sage"/>
      <StatCard icon={CalendarClock} label="Aaj ki delivery" value={`${m.dueTodayPieces} joray`} detail={`${m.dueToday.length} orders aaj due`} tone="sand"/>
      <StatCard icon={PackageCheck} label="Tayyar kapray" value={`${m.readyPieces} joray`} detail="Customer ko dene hain" tone="mint"/>
      <StatCard icon={Wallet} label="Total baqaya" value={money(m.dueAmount)} detail="Tamam orders ka baqaya" tone="rose"/>
    </div>
    <div className="dashboard-grid">
      <section className="card delivery-card">
        <CardHead eyebrow="PEHLE YEH DEKH LEIN" title="Qareebi deliveries" subtitle="Jin orders par ab nazar rakhni hai." action={<TextLink onClick={()=>onView('orders')}>Sab orders</TextLink>}/>
        {queue.length?<div className="due-list">{queue.map(o=><DueRow key={o.id} order={o} onOpen={onOrder} today={today}/>)}</div>:<Empty title="Abhi koi open order nahi" text="Naya order add karte hi yahan dikh jayega." action={<button className="btn btn-soft" onClick={onNew}>Pehla order banayein</button>}/>}
        {queue.length>0&&<div className="card-foot"><span><span className="legend-dot"/> Delivery date ke hisaab se</span><button onClick={()=>onView('orders')}>Orders kholain <ArrowUpRight size={14}/></button></div>}
      </section>
      <aside className="dashboard-side">
        <section className="workload-card">
          <div className="workload-top"><span className="workload-icon"><Clock3 size={18}/></span><span>AAJ KA LOAD</span><Sparkles size={16}/></div>
          <h2>Waday, soch samajh kar.</h2><p>Aaj due joray aur aapki batayi hui daily capacity.</p>
          <div className="load-numbers"><strong>{m.dueTodayPieces}<span> / {capacity}</span></strong><span>joray</span></div>
          <div className="load-track"><span style={{width:`${pct}%`}}/></div>
          <div className="load-bottom"><span>{m.dueTodayPieces>capacity?'Capacity se zyada due':'Daily capacity ka andaza'}</span><button onClick={()=>onView('settings')}>Badlein <ArrowUpRight size={13}/></button></div>
        </section>
        <section className="card late-card"><span className="late-icon"><Clock3 size={18}/></span><div><strong>{m.late.length} late {m.late.length===1?'order':'orders'}</strong><p>{m.latePieces} joray ki date guzar chuki hai.</p></div><button className="icon-btn" onClick={()=>onView('orders')} aria-label="Orders dekhain"><ChevronRight size={18}/></button></section>
      </aside>
    </div>
    <div className="lower-grid">
      <section className="card chart-card">
        <CardHead eyebrow="PAISAY KA HAAL" title="Pichlay 7 din ki wasooli" subtitle="Sirf received payments; total sales nahi." action={<TextLink onClick={()=>onView('reports')}>Reports</TextLink>}/>
        <div className="chart-top"><div><strong>{money(weekly)}</strong><span> total wasooli</span></div><div className="chart-tag"><TrendingUp size={14}/> 7 din</div></div>
        <div className="bar-chart" role="img" aria-label={`Pichlay 7 din ki wasooli ${money(weekly)}`}>
          {days.map((day,i)=><div className="bar-col" key={day} title={`${fmtDate(day)}: ${money(values[i])}`}><div className="bar-area"><div className={'bar '+(i===6?'bar-current':'')} style={{height:`${Math.max(3, values[i]/max*100)}%`}}/></div><span>{fmtDate(day,{weekday:'short'})}</span></div>)}
        </div>
      </section>
      <section className="card insight-card"><div className="insight-mark">✳</div><div className="mini-eyebrow">CHHOTI SI BAAT</div><h2>Achhi fitting ki shuruat, <em>sahi naap se.</em></h2><p>Har customer ke purane naap aur pasand ko aglay order mein dobara use karein.</p><button onClick={()=>onView('customers')}>Customers aur naap <ArrowUpRight size={15}/></button><div className="stitch-line"/></section>
    </div>
  </div>;
}
