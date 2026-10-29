import React,{useEffect,useMemo,useRef,useState} from 'react';
import { ArrowUpRight, CalendarDays, ChevronRight, CirclePlus, MessageCircle, Pencil, Plus, Printer, ReceiptText, Ruler, Scissors, Trash2, Wallet, X } from 'lucide-react';
import { useShop } from './store.jsx';
import { addMeasurement, amount, dateKey, EMPTY_MEASURE, fmtDate, GARMENTS, hasMeasure, latestMeasure, latePieces, money, nextDueDate, nextOrderNumber, orderBalance, orderPaid, orderTotal, overallStatus, remainingPieces, STATUS, totalPieces, uid } from './model.js';
import { CardHead, Empty, ErrorText, Field, Initials, Modal, ModalFooter, PageHead, SearchBox, StatusPill } from './ui.jsx';
import { CustomerForm, MeasurementEditor, MeasurementSummary } from './Customers.jsx';

function newItem(data,customerId) {
  const c=data.customers.find(x=>x.id===customerId),person=c?.people?.[0],type='Shalwar Kameez';
  return {id:uid('i'),personId:person?.id||'',personName:person?.name||'',type,quantity:1,rate:'',status:'naya',workerId:'',wage:'',style:{collar:'',cuff:'',pocket:'',bottom:''},fabric:'',dueDate:'',note:'',measurement:structuredClone(latestMeasure(data,customerId,person?.id,type)||{...EMPTY_MEASURE(),type}),measurementDirty:false,saveProfile:true};
}
export function OrderForm({order,customerId:prefill,onClose,onSaved}) {
  const {data,mutate}=useShop();
  const initialCustomer=order?.customerId||prefill||'';
  const [customerId,setCustomerId]=useState(initialCustomer),[items,setItems]=useState(()=>order?.items?.length?structuredClone(order.items).map(x=>({...x,measurementDirty:false,saveProfile:true})): [newItem(data,initialCustomer)]);
  const [createdDate,setCreatedDate]=useState(order?.createdDate||dateKey()),[dueDate,setDueDate]=useState(order?.dueDate||''),[discount,setDiscount]=useState(order?.discount||''),[advance,setAdvance]=useState(''),[note,setNote]=useState(order?.note||'');
  const [newCustomer,setNewCustomer]=useState(false),[editMeasure,setEditMeasure]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false);
  const originalOrder=useRef(order ? JSON.stringify(order) : '');
  const liveOrder=order ? data.orders.find(x=>x.id===order.id) : null;
  const customer=data.customers.find(c=>c.id===customerId);
  useEffect(()=>{
    if(!customer||order)return;
    setItems(current=>current.map(item=>{
      if(customer.people.some(p=>p.id===item.personId))return item;
      const person=customer.people[0];
      return {...item,personId:person?.id||'',personName:person?.name||'',measurement:structuredClone(latestMeasure(data,customer.id,person?.id,item.type)||{...EMPTY_MEASURE(),type:item.type}),measurementDirty:false};
    }));
  },[customerId,customer?.people?.length]);
  const patch=(id,key,value)=>setItems(current=>current.map(i=>i.id===id?{...i,[key]:value}:i));
  const patchStyle=(id,key,value)=>setItems(current=>current.map(i=>i.id===id?{...i,style:{...(i.style||{}),[key]:value}}:i));
  function changePerson(id,pid){const item=items.find(x=>x.id===id),p=customer?.people.find(x=>x.id===pid);setItems(current=>current.map(x=>x.id===id?{...x,personId:pid,personName:p?.name||'',measurement:structuredClone(latestMeasure(data,customerId,pid,item.type)||{...EMPTY_MEASURE(),type:item.type}),measurementDirty:false}:x));}
  function changeType(id,type){const item=items.find(x=>x.id===id);setItems(current=>current.map(x=>x.id===id?{...x,type,measurement:structuredClone(latestMeasure(data,customerId,item.personId,type)||{...EMPTY_MEASURE(),type}),measurementDirty:false}:x));}
  const draft={items,discount,payments:liveOrder?.payments||[]};const total=orderTotal(draft),paid=orderPaid(draft);
  async function submit(e){e.preventDefault();setError('');
    if(order && (!liveOrder || JSON.stringify(liveOrder)!==originalOrder.current))return setError('Yeh order edit ke dauran badal gaya hai. Band karke dobara kholain taa-ke koi tabdeeli na mitay.');
    if(!customer)return setError('Pehle customer select karein ya add karein.');
    if(!dueDate)return setError('Delivery ki date select karein.');
    if(items.some(i=>!i.personId||!i.type||!Number.isInteger(Number(i.quantity))||Number(i.quantity)<1||Number(i.quantity)>100||String(i.rate).trim()===''||!Number.isFinite(Number(i.rate))||Number(i.rate)<0))return setError('Har item ka fard, quantity aur sahi rate likhein.');
    const subtotal=items.reduce((s,i)=>s+Number(i.quantity)*Number(i.rate),0);
    if(Number(discount)<0||Number(discount)>subtotal)return setError('Discount total se zyada nahi ho sakta.');
    if(order && total<paid)return setError('Naya bill pehle se received paison se kam nahi ho sakta.');
    if(!order && (Number(advance)<0||amount(advance)>total))return setError('Advance bill se zyada nahi ho sakta.');
    const id=order?.id||uid('o');
    setSaving(true);try{await mutate(d=>{
      const savedCustomer=d.customers.find(c=>c.id===customerId);
      if(!savedCustomer || items.some(item=>!savedCustomer.people.some(p=>p.id===item.personId))) throw new Error('Customer ya fard badal gaya hai. Order dobara kholain.');
      if(items.some(item=>item.workerId && !d.workers.some(w=>w.id===item.workerId))) throw new Error('Select kiya hua karigar ab mojood nahi.');
      if(order){const latest=d.orders.find(o=>o.id===id);if(!latest || JSON.stringify(latest)!==originalOrder.current)throw new Error('Order badal gaya hai. Band karke dobara kholain.');}
      for(const item of items) if(item.measurementDirty&&item.saveProfile&&hasMeasure(item.measurement)) addMeasurement(d,customerId,item.personId,item.measurement);
      const clean=items.map(({measurementDirty,saveProfile,...item})=>({...item,quantity:Number(item.quantity),rate:amount(item.rate),wage:amount(item.wage),measurement:structuredClone(item.measurement)}));
      const number=order?.number||nextOrderNumber(d);
      if(!order) d.nextOrderSerial=(Number(number.replace(/\D/g,''))||1000)+1;
      const next={id,number,customerId,customerName:savedCustomer.name,createdDate,dueDate,discount:amount(discount),note:note.trim().slice(0,1500),items:clean,payments:liveOrder?.payments||[]};
      if(!order&&amount(advance)>0)next.payments=[{id:uid('pay'),amount:amount(advance),date:createdDate,method:'Cash',note:'Order par advance'}];
      if(order){const idx=d.orders.findIndex(o=>o.id===id);if(idx>=0)d.orders[idx]=next;}else d.orders.unshift(next);
    });
    onSaved?.(id);onClose();}catch(e){setError(e?.expected ? e.message : 'Order save nahi ho saka. Browser storage check karein.');}finally{setSaving(false);}
  }
  const currentItem=items.find(i=>i.id===editMeasure);
  return <><Modal title={order?'Order badlein':'Naya order'} subtitle="Pehle customer, phir kapray aur delivery ki details." onClose={onClose} wide>
    <form onSubmit={submit}>
      <div className="form-block"><div className="block-heading"><span>01</span><div><strong>Customer</strong><small>Kapray kis ne diye hain?</small></div></div>
        <div className="inline-select"><Field label="Customer select karein" required><select value={customerId} disabled={!!order} onChange={e=>setCustomerId(e.target.value)} required><option value="">Customer choose karein</option>{data.customers.map(c=><option key={c.id} value={c.id}>{c.name}{c.phone?' · '+c.phone:''}</option>)}</select></Field>{!order&&<button className="btn btn-soft" type="button" onClick={()=>setNewCustomer(true)}><Plus size={15}/> Naya</button>}</div>
      </div>
      <div className="form-block"><div className="block-heading"><span>02</span><div><strong>Kapray aur naap</strong><small>Alag fard ya alag status ke liye alag item add karein.</small></div></div>
        {items.map((item,index)=><div className="item-editor" key={item.id}><div className="item-top"><strong>Item {index+1}</strong>{items.length>1&&<button type="button" className="icon-btn danger-icon" onClick={()=>setItems(items.filter(x=>x.id!==item.id))} aria-label={`Item ${index+1} hatayein`}><Trash2 size={16}/></button>}</div>
          <div className="form-grid three-col"><Field label="Kis ke liye?" required><select value={item.personId} disabled={!customer} onChange={e=>changePerson(item.id,e.target.value)} required><option value="">Fard choose karein</option>{customer?.people.map(p=><option key={p.id} value={p.id}>{p.name} · {p.relation}</option>)}</select></Field>
            <Field label="Kapray ki qisam"><select value={item.type} onChange={e=>changeType(item.id,e.target.value)}>{GARMENTS.map(g=><option key={g}>{g}</option>)}</select></Field>
            <Field label="Quantity" required help="Is group ka status ek hoga"><input type="number" min="1" max="100" step="1" value={item.quantity} onChange={e=>patch(item.id,'quantity',e.target.value)} required/></Field>
            <Field label="Rate / piece (Rs.)" required><input type="number" min="0" step="0.01" value={item.rate} onChange={e=>patch(item.id,'rate',e.target.value)} placeholder="1800" required/></Field>
            <Field label="Karigar (optional)"><select value={item.workerId||''} onChange={e=>patch(item.id,'workerId',e.target.value)}><option value="">Khud / abhi nahi</option>{data.workers.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></Field>
            <Field label="Mazdoori / piece (Rs.)"><input type="number" min="0" step="0.01" value={item.wage??''} onChange={e=>patch(item.id,'wage',e.target.value)} placeholder="Optional"/></Field>
          </div>
          <div className="form-grid two-col item-extra-fields"><Field label="Kapray ki pehchan"><input value={item.fabric||''} maxLength={150} onChange={e=>patch(item.id,'fabric',e.target.value)} placeholder="Jaise: safed, 2 pieces"/></Field><Field label="Alag delivery date" help="Khali ho to order ki date lagegi"><input type="date" value={item.dueDate||''} onChange={e=>patch(item.id,'dueDate',e.target.value)}/></Field></div>
          <div className="measure-action"><div><Ruler size={17}/><span><strong>{hasMeasure(item.measurement)?'Naap maujood hai':'Naap abhi nahi likha'}</strong><small>{hasMeasure(item.measurement)?'Order mein is naap ki copy save hogi.':'Baad mein bhi add kar sakte hain.'}</small></span></div><button type="button" className="btn btn-soft btn-small" disabled={!item.personId} onClick={()=>setEditMeasure(item.id)}>{hasMeasure(item.measurement)?'Naap dekhain':'Naap likhein'}</button></div>
          <details className="style-details"><summary>Design / stitching ki details <span>+</span></summary><div className="form-grid two-col style-grid">
            <Field label="Gala"><select value={item.style?.collar||''} onChange={e=>patchStyle(item.id,'collar',e.target.value)}><option value="">Select nahi</option><option>Ban</option><option>Collar</option><option>Gol gala</option><option>Dusra</option></select></Field>
            <Field label="Bazu / kaf"><select value={item.style?.cuff||''} onChange={e=>patchStyle(item.id,'cuff',e.target.value)}><option value="">Select nahi</option><option>Gol</option><option>Kaf</option><option>Half sleeve</option><option>Dusra</option></select></Field>
            <Field label="Jaib"><select value={item.style?.pocket||''} onChange={e=>patchStyle(item.id,'pocket',e.target.value)}><option value="">Select nahi</option><option>Dono side</option><option>Ek side</option><option>Chest</option><option>Nahi</option></select></Field>
            <Field label="Neeche"><select value={item.style?.bottom||''} onChange={e=>patchStyle(item.id,'bottom',e.target.value)}><option value="">Select nahi</option><option>Shalwar</option><option>Trouser</option><option>Churidar</option><option>Dusra</option></select></Field>
            <Field label="Khaas hidayat" className="span-all"><textarea rows={2} value={item.note||''} maxLength={1000} onChange={e=>patch(item.id,'note',e.target.value)} placeholder="Design ya fitting ka note"/></Field>
          </div></details>
        </div>)}
        <button className="add-item" type="button" disabled={!customerId} onClick={()=>setItems([...items,newItem(data,customerId)])}><Plus size={16}/> Ek aur item add karein</button>
      </div>
      <div className="form-block"><div className="block-heading"><span>03</span><div><strong>Wada aur hisaab</strong><small>Delivery aur payment ki details.</small></div></div>
        <div className="form-grid two-col"><Field label="Order ki date"><input type="date" value={createdDate} onChange={e=>setCreatedDate(e.target.value)} required/></Field><Field label="Delivery date" required><input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} required/></Field><Field label="Discount (Rs.)"><input type="number" min="0" step="0.01" value={discount} onChange={e=>setDiscount(e.target.value)} placeholder="0"/></Field>{!order&&<Field label="Advance (Rs.)"><input type="number" min="0" step="0.01" value={advance} onChange={e=>setAdvance(e.target.value)} placeholder="0"/></Field>}<Field label="Order note" className="span-all"><textarea rows={2} maxLength={1500} value={note} onChange={e=>setNote(e.target.value)} placeholder="Kapray ya delivery se related koi baat"/></Field></div>
        <div className="order-total-line"><span>Total bill <strong>{money(total)}</strong></span><span>{order?'Pehle se wasool':'Advance'} <strong>{money(order?paid:amount(advance))}</strong></span><span>Baqaya <strong>{money(Math.max(0,total-(order?paid:amount(advance))))}</strong></span></div>
      </div>
      <ErrorText>{error}</ErrorText><ModalFooter onClose={onClose} busy={saving} save={order?'Order save karein':'Order banayein'}/>
    </form>
  </Modal>
  {newCustomer&&<CustomerForm onClose={()=>setNewCustomer(false)} onSaved={id=>setCustomerId(id)}/>}
  {currentItem&&<MeasurementEditor initial={currentItem.measurement||{...EMPTY_MEASURE(),type:currentItem.type}} typeFixed personName={currentItem.personName} allowProfile onClose={()=>setEditMeasure('')} onSave={(m,saveProfile)=>setItems(current=>current.map(i=>i.id===editMeasure?{...i,measurement:m,measurementDirty:true,saveProfile}:i))}/>}
  </>;
}

function PaymentForm({order,onClose}) {
  const {mutate}=useShop();const [value,setValue]=useState(''),[date,setDate]=useState(dateKey()),[method,setMethod]=useState('Cash'),[note,setNote]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false);const due=orderBalance(order);
  async function submit(e){e.preventDefault();if(!amount(value)||amount(value)>due)return setError(`Sahi amount likhein; baqaya ${money(due)} hai.`);setSaving(true);try{await mutate(d=>{const o=d.orders.find(x=>x.id===order.id);if(!o||amount(value)>orderBalance(o))throw new Error('Baqaya badal gaya hai; dobara check karein.');o.payments.push({id:uid('pay'),amount:amount(value),date,method,note:note.trim().slice(0,500)});});onClose();}catch(e){setError(e.message||'Payment save nahi ho saki.');}finally{setSaving(false);}}
  return <Modal title="Payment receive karein" subtitle={`${order.number} · Baqaya ${money(due)}`} onClose={onClose}><form onSubmit={submit}><div className="form-grid"><Field label="Amount (Rs.)" required><input autoFocus type="number" min="0.01" max={due} step="0.01" value={value} onChange={e=>setValue(e.target.value)} required/></Field><Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></Field><Field label="Tareeqa"><select value={method} onChange={e=>setMethod(e.target.value)}><option>Cash</option><option>Bank / mobile wallet</option><option>Dusra</option></select></Field><Field label="Note" className="span-all"><input value={note} maxLength={500} onChange={e=>setNote(e.target.value)} placeholder="Optional"/></Field></div><ErrorText>{error}</ErrorText><ModalFooter onClose={onClose} busy={saving} save="Payment save karein"/></form></Modal>;
}

export function OrderDetail({id,onClose,onEdit,onPrint}) {
  const {data,mutate}=useShop();const [payment,setPayment]=useState(false),[detailError,setDetailError]=useState('');const order=data.orders.find(x=>x.id===id);if(!order)return null;
  const customer=data.customers.find(c=>c.id===order.customerId),status=overallStatus(order),due=orderBalance(order);
  async function setStatus(itemId,status){try{await mutate(d=>{const item=d.orders.find(o=>o.id===id).items.find(i=>i.id===itemId);item.status=status;item.statusAt=dateKey();});}catch(_){setDetailError('Status save nahi ho saka.');}}
  async function removePayment(pid){if(window.confirm('Yeh payment record delete karein? Hisaab dobara calculate hoga.'))try{await mutate(d=>{const o=d.orders.find(x=>x.id===id);o.payments=o.payments.filter(p=>p.id!==pid);});}catch(_){setDetailError('Payment delete save nahi ho saki.');}}
  async function removeOrder(){if(window.confirm('Pura order aur iski payments delete ho jayengi. Kya aap sure hain?')){try{await mutate(d=>{d.orders=d.orders.filter(o=>o.id!==id)});onClose();}catch(_){setDetailError('Order delete save nahi ho saka.');}}}
  function whatsapp(){let number=(customer?.phone||'').replace(/\D/g,'');if(number.startsWith('0'))number='92'+number.slice(1);if(number.length<10||number.length>15){window.alert('Customer ka sahi mobile number pehle save karein.');return;}const text=`Assalam-o-Alaikum ${order.customerName}, aapke order ${order.number} ki qareeb tareen delivery ${fmtDate(nextDueDate(order),{day:'numeric',month:'long',year:'numeric'})} hai. Baqaya: ${money(due)}. — ${data.shop.name}`;window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer');}
  return <><Modal title={`${order.number} · ${order.customerName}`} subtitle={`Order ${fmtDate(order.createdDate)} · Delivery ${fmtDate(order.dueDate,{day:'numeric',month:'short',year:'numeric'})}`} onClose={onClose} wide>
    <div className="detail-actions wrap"><StatusPill status={status}/><span className="grow"/><button className="btn btn-soft btn-small" onClick={()=>onEdit(order)}><Pencil size={15}/> Badlein</button><button className="btn btn-outline btn-small" onClick={()=>onPrint(order)}><Printer size={15}/> Receipt</button><button className="btn btn-outline btn-small" onClick={whatsapp}><MessageCircle size={15}/> WhatsApp</button><button className="icon-btn danger-icon" onClick={removeOrder} aria-label="Order delete karein"><Trash2 size={16}/></button></div>
    <ErrorText>{detailError}</ErrorText><div className="invoice-summary"><div><span>Total bill</span><strong>{money(orderTotal(order))}</strong></div><div><span>Wasool</span><strong>{money(orderPaid(order))}</strong></div><div><span>Baqaya</span><strong>{money(due)}</strong></div></div>
    {order.note&&<div className="note-box">{order.note}</div>}
    <div className="detail-section-title"><div><span className="mini-eyebrow">ORDER ITEMS</span><h3>Kapray ka kaam</h3></div><span className="muted-small">{totalPieces(order)} pieces</span></div>
    <div className="order-detail-items">{order.items.map((item,index)=><div className="detail-item" key={item.id}><div className="detail-item-top"><div className="item-icon"><Scissors size={17}/></div><div className="grow"><strong>{item.type}</strong><p>{item.personName} · {item.quantity} piece · {money(item.rate)} / piece</p></div><label className="status-select"><span className="sr-only">Item {index+1} status</span><select value={item.status||'naya'} onChange={e=>setStatus(item.id,e.target.value)}>{STATUS.map(s=><option value={s.id} key={s.id}>{s.label}</option>)}</select></label></div>
      {(item.fabric||item.dueDate)&&<div className="item-note">{item.fabric?`Kapra: ${item.fabric}`:''}{item.fabric&&item.dueDate?' · ':''}{item.dueDate?`Delivery: ${fmtDate(item.dueDate,{day:'numeric',month:'short',year:'numeric'})}`:''}</div>}
      {(item.workerId||item.wage>0)&&<div className="item-note">Karigar: {data.workers.find(w=>w.id===item.workerId)?.name||'—'} {item.wage>0?`· Mazdoori ${money(item.wage)} / piece`:''}</div>}
      {item.style&&Object.values(item.style).some(Boolean)&&<div className="style-pills">{Object.entries(item.style).filter(([,v])=>v).map(([k,v])=><span key={k}>{v}</span>)}</div>}{item.note&&<div className="item-note">{item.note}</div>}
      <details className="history-details"><summary><Ruler size={15}/> Order ke waqt ka naap</summary>{hasMeasure(item.measurement)?<MeasurementSummary measure={item.measurement}/>:<p className="muted-small">Naap save nahi tha. Order edit karke add kar sakte hain.</p>}</details>
    </div>)}</div>
    <div className="detail-section-title"><div><span className="mini-eyebrow">HISAAB</span><h3>Payment history</h3></div><button disabled={!due} className="btn btn-primary btn-small" onClick={()=>setPayment(true)}><Plus size={15}/> Payment</button></div>
    {order.payments.length?<div className="payment-list">{[...order.payments].reverse().map(p=><div className="payment-row" key={p.id}><span className="payment-icon"><Wallet size={15}/></span><div className="grow"><strong>{money(p.amount)}</strong><small>{fmtDate(p.date)} · {p.method}{p.note?' · '+p.note:''}</small></div><button className="icon-btn danger-icon" onClick={()=>removePayment(p.id)} aria-label="Payment delete karein"><Trash2 size={15}/></button></div>)}</div>:<p className="muted-small">Abhi koi payment receive nahi hui.</p>}
    <div className="modal-bottom-space"/>
  </Modal>{payment&&<PaymentForm order={order} onClose={()=>setPayment(false)}/>}</>;
}

export default function Orders({onNew,onOrder,initialSearch=''}) {
  const {data}=useShop();const [search,setSearch]=useState(initialSearch),[filter,setFilter]=useState('all');
  useEffect(()=>{if(initialSearch)setSearch(initialSearch);},[initialSearch]);
  const today=dateKey();const filters=[['all','Sab'],['open','Jaari'],['late','Late'],['naya','Naye'],['silai','Silai mein'],['tayyar','Tayyar'],['diya','Diye gaye']];
  const list=useMemo(()=>{const q=search.trim().toLowerCase();return [...data.orders].filter(o=>{
    const matches=[o.number,o.customerName,data.customers.find(c=>c.id===o.customerId)?.phone,...o.items.map(i=>i.personName)].some(v=>String(v||'').toLowerCase().includes(q));
    const status=overallStatus(o);const ok=filter==='all'||(filter==='open'&&remainingPieces(o)>0)||(filter==='late'&&latePieces(o,today)>0)||(filter==='diya'&&status==='diya')||(filter==='tayyar'&&o.items.some(i=>i.status==='tayyar'))||(['naya','silai'].includes(filter)&&o.items.some(i=>i.status===filter));return matches&&ok;
  }).sort((a,b)=>(b.createdDate||'').localeCompare(a.createdDate||'')||String(b.number).localeCompare(String(a.number)));},[data,search,filter,today]);
  return <div className="page"><PageHead eyebrow="ORDERS" title={<>Har wada, <em>yaad rahe.</em></>} subtitle="Kapray, delivery aur baqaya — sab ek jagah." actions={<button className="btn btn-primary" onClick={onNew}><Plus size={17}/> Naya order</button>}/>
    <section className="card list-card"><div className="list-toolbar"><div><h2>Saare orders <span className="count-badge">{list.length}</span></h2><p>Kisi order ko khol kar kaam ya payment badlein.</p></div><SearchBox value={search} onChange={setSearch} placeholder="Naam ya order number"/></div>
      <div className="filter-row">{filters.map(([id,label])=><button key={id} className={filter===id?'active':''} onClick={()=>setFilter(id)}>{label}</button>)}</div>
      {list.length?<><div className="order-table-head"><span>ORDER / CUSTOMER</span><span>DELIVERY</span><span>KAAM</span><span>BAQAYA</span><span/></div><div className="order-list">{list.map(o=><button className="order-row" key={o.id} onClick={()=>onOrder(o.id)}><div className="order-main"><Initials name={o.customerName}/><div><strong>{o.customerName}</strong><small>{o.number} · {totalPieces(o)} pieces</small></div></div><div className={'order-date '+(latePieces(o,today)>0?'late':'')}><span className="mobile-label">Delivery</span>{fmtDate(nextDueDate(o),{day:'numeric',month:'short',year:'numeric'})}</div><div className="order-status"><StatusPill status={overallStatus(o)}/></div><div className="order-balance"><span className="mobile-label">Baqaya </span><strong>{money(orderBalance(o))}</strong></div><ChevronRight size={16} className="row-arrow"/></button>)}</div></>:<Empty icon={ReceiptText} title={search||filter!=='all'?'Koi order nahi mila':'Abhi order nahi hai'} text={search||filter!=='all'?'Search ya filter badal kar dekhain.':'Pehla order banayein aur kaam shuru karein.'} action={!search&&filter==='all'&&<button className="btn btn-soft" onClick={onNew}>Naya order</button>}/>}
    </section></div>;
}
