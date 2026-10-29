import React,{useMemo,useState} from 'react';
import { ArrowUpRight, History, MapPin, Plus, Ruler, Users, UserRound, Trash2, Pencil, Phone, Check } from 'lucide-react';
import { useShop } from './store.jsx';
import { addMeasurement, EMPTY_MEASURE, fmtDate, GARMENTS, hasMeasure, MEASURES, uid } from './model.js';
import { Empty, ErrorText, Field, Initials, Modal, ModalFooter, PageHead, SearchBox } from './ui.jsx';

export function CustomerForm({customer,onClose,onSaved}) {
  const {mutate}=useShop(); const [name,setName]=useState(customer?.name||''),[phone,setPhone]=useState(customer?.phone||''),[village,setVillage]=useState(customer?.village||''),[notes,setNotes]=useState(customer?.notes||''),[error,setError]=useState(''),[saving,setSaving]=useState(false);
  async function submit(e){e.preventDefault();if(!name.trim())return setError('Customer ka naam likhein.');
    const clean=name.trim().slice(0,100); const id=customer?.id||uid('c');
    setSaving(true);try { await mutate(d=>{if(customer){const c=d.customers.find(x=>x.id===id);if(!c)throw new Error('Customer ka record ab mojood nahi.');const original=c.name;c.name=clean;c.phone=phone.trim().slice(0,40);c.village=village.trim().slice(0,100);c.notes=notes.trim().slice(0,1000);const self=c.people.find(p=>p.relation==='Khud');if(self&&self.name===original)self.name=clean;d.orders.filter(o=>o.customerId===id).forEach(o=>o.customerName=clean);}
      else d.customers.push({id,name:clean,phone:phone.trim().slice(0,40),village:village.trim().slice(0,100),notes:notes.trim().slice(0,1000),people:[{id:uid('p'),name:clean,relation:'Khud',measurements:[]}]});});
    onSaved?.(id);onClose();} catch (_) {setError('Save nahi ho saka. Browser storage check karein.');} finally {setSaving(false);}}
  return <Modal title={customer?'Customer ki details badlein':'Naya customer'} subtitle="Phone number zaroori nahi. Ek number par alag customers bhi ho sakte hain." onClose={onClose}>
    <form onSubmit={submit}><div className="form-grid"><Field label="Customer ka naam" required><input autoFocus value={name} maxLength={100} onChange={e=>setName(e.target.value)} placeholder="Jaise Ahmed Khan" required/></Field>
      <Field label="Mobile number" help="Agar available ho"><input type="tel" value={phone} maxLength={40} onChange={e=>setPhone(e.target.value)} placeholder="03xx xxxxxxx"/></Field>
      <Field label="Gaon / ilaqa"><input value={village} maxLength={100} onChange={e=>setVillage(e.target.value)} placeholder="Jaise Chak 17"/></Field>
      <Field label="Zaroori note" className="span-all"><textarea value={notes} maxLength={1000} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Koi khaas baat…"/></Field></div>
      <ErrorText>{error}</ErrorText><ModalFooter onClose={onClose} busy={saving} save={customer?'Tabdeeli save karein':'Customer save karein'}/></form>
  </Modal>;
}

export function MeasurementEditor({initial,typeFixed=false,personName,onClose,onSave,allowProfile=false}) {
  const base=initial?structuredClone(initial):EMPTY_MEASURE();
  const [form,setForm]=useState({...EMPTY_MEASURE(),...base,values:{...(base.values||{})},extra:[...(base.extra||[])]});
  const [saveProfile,setSaveProfile]=useState(true),[error,setError]=useState(''),[saving,setSaving]=useState(false);
  const patch=(key,value)=>setForm(x=>({...x,[key]:value}));
  const setValue=(key,value)=>setForm(x=>({...x,values:{...x.values,[key]:value.slice(0,40)}}));
  async function submit(e){e.preventDefault();if(!hasMeasure(form))return setError('Kam az kam aik naap likhein.');setSaving(true);try{await onSave({...form, type:form.type},saveProfile);onClose();}catch(_){setError('Naap save nahi ho saka. Browser storage check karein.');}finally{setSaving(false);}}
  return <Modal title="Naap likhein" subtitle={`${personName||'Customer'} · Har darzi ke tareeqay ke mutabiq`} onClose={onClose} wide>
    <form onSubmit={submit}>
      <div className="measurement-intro"><Ruler size={19}/><span>Sirf wohi fields bharain jo aap istemal karte hain. Fractions, jaise <strong>22½</strong>, bhi likh sakte hain.</span></div>
      <div className="form-grid three-col">
        <Field label="Kapray ki qisam"><select value={form.type} disabled={typeFixed} onChange={e=>setForm({...EMPTY_MEASURE(),type:e.target.value})}>{GARMENTS.map(g=><option key={g}>{g}</option>)}</select></Field>
        <Field label="Naap kis ka hai?"><select value={form.basis} onChange={e=>patch('basis',e.target.value)}><option value="tayyar">Tayyar kapray ka</option><option value="jism">Jism ka</option></select></Field>
        <Field label="Chaurai ka tareeqa"><select value={form.width} onChange={e=>patch('width',e.target.value)}><option value="aadha">Aadha / flat</option><option value="poora">Poora ghera</option><option value="mixed">Alag — note mein likhein</option></select></Field>
      </div>
      <div className="unit-line"><span>Unit</span><label><input type="radio" name="unit" checked={form.unit==='inch'} onChange={()=>patch('unit','inch')}/> Inches</label><label><input type="radio" name="unit" checked={form.unit==='cm'} onChange={()=>patch('unit','cm')}/> Centimeters</label></div>
      {(MEASURES[form.type]||MEASURES.Dusra).map(([group,fields])=><div className="measure-section" key={group}><div className="section-kicker">{group}</div><div className="measure-grid">{fields.map(([key,label])=><Field key={key} label={label}><input inputMode="decimal" value={form.values[key]||''} onChange={e=>setValue(key,e.target.value)} placeholder="—" aria-label={`${label} naap`}/></Field>)}</div></div>)}
      <div className="measure-section"><div className="section-kicker">Apna field</div>{form.extra.map((entry,i)=><div className="extra-row" key={i}><input value={entry.label||''} maxLength={60} onChange={e=>patch('extra',form.extra.map((x,j)=>j===i?{...x,label:e.target.value}:x))} placeholder="Naap ka naam"/><input value={entry.value||''} maxLength={40} onChange={e=>patch('extra',form.extra.map((x,j)=>j===i?{...x,value:e.target.value}:x))} placeholder="Naap"/><button type="button" className="icon-btn" onClick={()=>patch('extra',form.extra.filter((_,j)=>j!==i))} aria-label="Field hatayein"><Trash2 size={16}/></button></div>)}
        <button type="button" className="text-action" onClick={()=>patch('extra',[...form.extra,{label:'',value:''}])}><Plus size={15}/> Apna naap add karein</button></div>
      <Field label="Fitting ya tareeqay ka note"><textarea rows={2} maxLength={1000} value={form.note||''} onChange={e=>patch('note',e.target.value)} placeholder="Jaise: pichli baar kandha thora tight tha"/></Field>
      {allowProfile&&<label className="check-line"><input type="checkbox" checked={saveProfile} onChange={e=>setSaveProfile(e.target.checked)}/> Yeh naap customer ke profile mein bhi save karein</label>}
      <ErrorText>{error}</ErrorText><ModalFooter onClose={onClose} busy={saving} save="Naap save karein"/>
    </form>
  </Modal>;
}

export function MeasurementSummary({measure}) {
  const labels=Object.fromEntries((MEASURES[measure.type]||MEASURES.Dusra).flatMap(x=>x[1]));
  const entries=[...Object.entries(measure.values||{}).filter(([,v])=>String(v||'').trim()).map(([k,v])=>[labels[k]||k,v]),...(measure.extra||[]).filter(x=>x.value).map(x=>[x.label||'Custom',x.value])];
  return <div className="measure-summary"><div className="measure-chips">{entries.map(([k,v],i)=><span key={i}><small>{k}</small><strong>{v}</strong></span>)}</div>{measure.note&&<p><strong>Fitting note:</strong> {measure.note}</p>}<div className="measure-meta">{measure.basis==='jism'?'Jism':'Tayyar kapray'} ka naap · {measure.width==='aadha'?'Aadha':measure.width==='poora'?'Poora':'Mixed'} · {measure.unit||'inch'}</div></div>;
}

export function CustomerDetail({id,onClose,onEdit,onOrder}) {
  const {data,mutate}=useShop();const customer=data.customers.find(c=>c.id===id);
  const [personId,setPersonId]=useState(customer?.people?.[0]?.id||''),[measure,setMeasure]=useState(null),[newPerson,setNewPerson]=useState(false),[personName,setPersonName]=useState(''),[relation,setRelation]=useState('Beta'),[error,setError]=useState('');
  if(!customer)return null;const person=customer.people.find(p=>p.id===personId)||customer.people[0];
  const measurements=[...(person?.measurements||[])].reverse();
  const latestTypes=measurements.filter((m,i,arr)=>arr.findIndex(x=>x.type===m.type)===i);
  async function addPerson(e){e.preventDefault();if(!personName.trim())return setError('Naam likhein.');const pid=uid('p');try{await mutate(d=>d.customers.find(c=>c.id===id).people.push({id:pid,name:personName.trim().slice(0,100),relation,measurements:[]}));setPersonId(pid);setPersonName('');setNewPerson(false);setError('');}catch(_){setError('Save nahi ho saka. Browser storage check karein.');}}
  async function deleteCustomer(){if(data.orders.some(o=>o.customerId===id))return setError('Is customer ke orders maujood hain. Record delete nahi ho sakta.');if(window.confirm('Is customer aur uske naap delete kar dein?')){try{await mutate(d=>{if(d.orders.some(o=>o.customerId===id))throw new Error('Customer ke orders mojood hain.');d.customers=d.customers.filter(c=>c.id!==id)});onClose();}catch(_){setError('Delete save nahi ho saka.');}}}
  return <><Modal title={customer.name} subtitle={`${customer.phone||'Phone number nahi'}${customer.village?' · '+customer.village:''}`} onClose={onClose} wide>
    <div className="detail-actions"><button className="btn btn-soft" onClick={()=>onEdit(customer)}><Pencil size={15}/> Details badlein</button><button className="btn btn-outline" onClick={()=>onOrder(id)}><Plus size={15}/> Naya order</button><button className="icon-btn danger-icon" onClick={deleteCustomer} aria-label="Customer delete karein"><Trash2 size={16}/></button></div>
    {customer.notes&&<div className="note-box">{customer.notes}</div>}<ErrorText>{error}</ErrorText>
    <div className="detail-section-title"><div><span className="mini-eyebrow">EK GHAR, ALAG NAAP</span><h3>Kapray kis ke liye?</h3></div><button className="text-action" onClick={()=>setNewPerson(true)}><Plus size={15}/> Ghar ka fard</button></div>
    <div className="person-tabs">{customer.people.map(p=><button key={p.id} onClick={()=>setPersonId(p.id)} className={p.id===person?.id?'active':''}><UserRound size={15}/>{p.name}<small>{p.relation}</small></button>)}</div>
    {person&&<div className="profile-panel"><div className="profile-head"><div><h3>{person.name} ka naap</h3><p>Purane naap mehfooz rehte hain; naya naap alag save hota hai.</p></div><button className="btn btn-primary btn-small" onClick={()=>setMeasure({type:'Shalwar Kameez'})}><Plus size={15}/> Naap add karein</button></div>
      {latestTypes.length?latestTypes.map(m=><div className="measure-card" key={m.id}><div className="measure-card-top"><div><strong>{m.type}</strong><small>Update: {fmtDate(m.savedAt)}</small></div><button className="text-action" onClick={()=>setMeasure(m)}><Pencil size={14}/> Naya version</button></div><MeasurementSummary measure={m}/></div>):<Empty icon={Ruler} title="Abhi naap save nahi hai" text="Pehla naap add karein; order mein use ho jayega."/>}
      {measurements.length>latestTypes.length&&<details className="history-details"><summary><History size={15}/> Purane naap ({measurements.length})</summary>{measurements.map(m=><div className="history-row" key={m.id}><span>{m.type} · {fmtDate(m.savedAt)}</span><button className="text-action" onClick={()=>setMeasure(m)}>Dekhain / copy</button></div>)}</details>}
    </div>}
  </Modal>
  {newPerson&&<Modal title="Ghar ka fard add karein" subtitle="Is shakhs ka naap alag rahega." onClose={()=>setNewPerson(false)}><form onSubmit={addPerson}><div className="form-grid"><Field label="Naam" required><input autoFocus value={personName} onChange={e=>setPersonName(e.target.value)} placeholder="Jaise Bilal" required/></Field><Field label="Rishta"><select value={relation} onChange={e=>setRelation(e.target.value)}><option>Beta</option><option>Bhai</option><option>Walid</option><option>Dusra</option></select></Field></div><ErrorText>{error}</ErrorText><ModalFooter onClose={()=>setNewPerson(false)} save="Fard add karein"/></form></Modal>}
  {measure&&<MeasurementEditor initial={measure} personName={person?.name} onClose={()=>setMeasure(null)} onSave={m=>mutate(d=>addMeasurement(d,id,person.id,m))}/>}
  </>;
}

export default function Customers({onNew,onCustomer}) {
  const {data}=useShop(); const [search,setSearch]=useState('');
  const list=useMemo(()=>{const q=search.trim().toLowerCase();return [...data.customers].filter(c=>[c.name,c.phone,c.village,...c.people.map(p=>p.name)].some(x=>String(x||'').toLowerCase().includes(q))).sort((a,b)=>a.name.localeCompare(b.name));},[data.customers,search]);
  const people=data.customers.reduce((n,c)=>n+c.people.length,0),measured=data.customers.reduce((n,c)=>n+c.people.filter(p=>p.measurements.length).length,0);
  return <div className="page"><PageHead eyebrow="CUSTOMERS & NAAP" title={<>Har naap, <em>yaad rahe.</em></>} subtitle="Customer ki pehchaan aur har fard ka naap, alag aur mehfooz." actions={<button className="btn btn-primary" onClick={onNew}><Plus size={17}/> Naya customer</button>}/>
    <div className="summary-strip"><span><Users size={17}/><strong>{data.customers.length}</strong> customers</span><span><UserRound size={17}/><strong>{people}</strong> log</span><span><Ruler size={17}/><strong>{measured}</strong> ke naap saved</span></div>
    <section className="card list-card"><div className="list-toolbar"><div><h2>Customer register</h2><p>Naam, mobile ya gaon se dhoondein.</p></div><SearchBox value={search} onChange={setSearch} placeholder="Naam ya mobile dhoondein"/></div>
    {list.length?<div className="customer-grid">{list.map(c=>{const count=data.orders.filter(o=>o.customerId===c.id).length;return <button className="customer-card" key={c.id} onClick={()=>onCustomer(c.id)}><div className="customer-card-top"><Initials name={c.name}/><ArrowUpRight size={17}/></div><strong>{c.name}</strong><span>{c.phone||'Phone number nahi'}</span><div className="customer-card-bottom"><span><MapPin size={13}/> {c.village||'Ilaqa nahi likha'}</span><span>{count} orders</span></div></button>})}</div>:<Empty icon={Users} title={search?'Koi customer nahi mila':'Customer register khaali hai'} text={search?'Dusra naam ya number try karein.':'Apna pehla customer add karein.'} action={!search&&<button className="btn btn-soft" onClick={onNew}>Customer add karein</button>}/>}
    </section></div>;
}
