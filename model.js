export const STATUS = [
  { id: 'naya', label: 'Naya', color: '#718575' },
  { id: 'cutting', label: 'Cutting', color: '#b18a42' },
  { id: 'silai', label: 'Silai mein', color: '#c17e5e' },
  { id: 'fitting', label: 'Fitting', color: '#9077a6' },
  { id: 'tayyar', label: 'Tayyar', color: '#4e8467' },
  { id: 'diya', label: 'Diya gaya', color: '#607f8a' },
];
export const GARMENTS = ['Shalwar Kameez', 'Kurta', 'Shalwar', 'Waistcoat', 'Shirt', 'Trouser', 'Dusra'];
export const MEASURES = {
  'Shalwar Kameez': [
    ['Kameez', [['length','Lambai'], ['shoulder','Kandha / Teera'], ['sleeve','Bazu lambai'], ['chest','Chaati'], ['waist','Kamar'], ['daman','Daman'], ['neck','Gala / Ban'], ['cuff','Kaf'], ['armhole','Mori / Armhole']]],
    ['Shalwar', [['shalwarLength','Shalwar lambai'], ['shalwarWaist','Kamar'], ['asan','Aasan'], ['bottom','Paincha']]],
  ],
  Kurta: [['Kurta', [['length','Lambai'], ['shoulder','Kandha / Teera'], ['sleeve','Bazu lambai'], ['chest','Chaati'], ['waist','Kamar'], ['daman','Daman'], ['neck','Gala / Ban'], ['cuff','Kaf'], ['armhole','Mori / Armhole']]]],
  Shalwar: [['Shalwar', [['shalwarLength','Lambai'], ['shalwarWaist','Kamar'], ['asan','Aasan'], ['bottom','Paincha']]]],
  Waistcoat: [['Waistcoat', [['length','Lambai'], ['shoulder','Kandha'], ['chest','Chaati'], ['waist','Kamar'], ['daman','Daman'], ['neck','Gala']]]],
  Shirt: [['Shirt', [['length','Lambai'], ['shoulder','Kandha'], ['sleeve','Bazu'], ['chest','Chaati'], ['waist','Kamar'], ['neck','Gala'], ['cuff','Kaf']]]],
  Trouser: [['Trouser', [['length','Lambai'], ['waist','Kamar'], ['hip','Hip'], ['thigh','Raan'], ['rise','Aasan'], ['bottom','Paincha']]]],
  Dusra: [['Naap', [['length','Lambai'], ['chest','Chaati'], ['waist','Kamar']]]],
};
export const EMPTY_MEASURE = () => ({ type: 'Shalwar Kameez', basis: 'tayyar', width: 'aadha', unit: 'inch', values: {}, extra: [], note: '' });
export function uid(prefix = '') {
  const value = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return prefix ? `${prefix}-${value}` : value;
}
export function dateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}
export function shiftDay(day, delta) {
  const [y,m,d] = String(day || dateKey()).split('-').map(Number);
  return dateKey(new Date(y, m-1, d + delta, 12));
}
export function fmtDate(day, options = { day: 'numeric', month: 'short' }) {
  if (!day) return '—';
  const [y,m,d] = String(day).slice(0,10).split('-').map(Number);
  if (!y || !m || !d) return '—';
  return new Intl.DateTimeFormat('en-PK', options).format(new Date(y, m-1, d, 12));
}
export function money(value) {
  const n = Number(value);
  return `Rs. ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0)}`;
}
export const amount = value => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
};
export function blankData() {
  return { schema: 1, localRevision: 0, nextOrderSerial: 1001, isDemo: false,
    shop: { name: 'Meri Darzi Dukaan', owner: '', phone: '', address: '', capacity: 8 },
    customers: [], workers: [], orders: [], expenses: [] };
}
export function orderTotal(order) {
  const subtotal = (order?.items || []).reduce((sum, item) => sum + amount(item.rate) * Math.max(1, Number(item.quantity) || 1), 0);
  return Math.max(0, Math.round((subtotal - amount(order?.discount)) * 100) / 100);
}
export function orderPaid(order) {
  return Math.round((order?.payments || []).reduce((sum,p) => sum + amount(p.amount), 0) * 100) / 100;
}
export const orderBalance = order => Math.max(0, Math.round((orderTotal(order) - orderPaid(order)) * 100) / 100);
export function remainingPieces(order) {
  return (order?.items || []).reduce((sum, item) => sum + (item.status === 'diya' ? 0 : Math.max(1, Number(item.quantity) || 1)), 0);
}
export function itemDueDate(item, order) { return item?.dueDate || order?.dueDate || ''; }
export function duePieces(order, day) {
  return (order?.items || []).reduce((sum,item)=>sum+(item.status!=='diya'&&itemDueDate(item,order)===day ? Math.max(1,Number(item.quantity)||1) : 0),0);
}
export function latePieces(order, day=dateKey()) {
  return (order?.items || []).reduce((sum,item)=>sum+(item.status!=='diya'&&itemDueDate(item,order)&&itemDueDate(item,order)<day ? Math.max(1,Number(item.quantity)||1) : 0),0);
}
export function nextDueDate(order) {
  const dates=(order?.items||[]).filter(item=>item.status!=='diya').map(item=>itemDueDate(item,order)).filter(Boolean).sort();
  return dates[0] || order?.dueDate || '';
}
export function totalPieces(order) {
  return (order?.items || []).reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0);
}
export function overallStatus(order) {
  const items = order?.items || [];
  if (!items.length) return 'naya';
  if (items.every(i => i.status === 'diya')) return 'diya';
  if (items.every(i => ['tayyar','diya'].includes(i.status))) return 'tayyar';
  const statuses = [...new Set(items.filter(i => i.status !== 'diya').map(i => i.status || 'naya'))];
  return statuses.length === 1 ? statuses[0] : 'mixed';
}
export const statusInfo = id => STATUS.find(s => s.id === id) || { id: 'mixed', label: 'Kaam jaari', color: '#ad8055' };
export const personById = (data, customerId, personId) => data.customers.find(c => c.id === customerId)?.people?.find(p => p.id === personId);
export function latestMeasure(data, customerId, personId, type) {
  const person = personById(data, customerId, personId);
  return [...(person?.measurements || [])].reverse().find(m => m.type === type) || null;
}
export function hasMeasure(measure) {
  return !!measure && (Object.values(measure.values || {}).some(v => String(v ?? '').trim()) || (measure.extra || []).some(v => String(v?.value || '').trim()));
}
export function addMeasurement(data, customerId, personId, measure) {
  const p = personById(data, customerId, personId);
  if (!p || !hasMeasure(measure)) return;
  p.measurements ||= [];
  p.measurements.push({ ...structuredClone(measure), id: uid('m'), savedAt: new Date().toISOString() });
}
export function nextOrderNumber(data) {
  const maximum = (data.orders || []).reduce((n, o) => Math.max(n, Number(String(o.number || '').replace(/\D/g,'')) || 0), 1000);
  return `DD-${Math.max(maximum+1, Number(data.nextOrderSerial)||1001)}`;
}
export function workerTotals(data, workerId) {
  let agreed = 0, completed = 0;
  for (const order of data.orders) for (const item of order.items || []) {
    if (item.workerId !== workerId) continue;
    const wages = amount(item.wage) * Math.max(1, Number(item.quantity) || 1);
    agreed += wages;
    if (['tayyar','diya'].includes(item.status)) completed += wages;
  }
  const paid = data.expenses.filter(e => e.workerId === workerId && e.category === 'Mazdoori').reduce((s,e) => s + amount(e.amount),0);
  return { agreed, completed, paid, due: Math.max(0, completed-paid), advance: Math.max(0, paid-completed) };
}
export function metrics(data, today = dateKey()) {
  const open = data.orders.filter(o => remainingPieces(o) > 0);
  const dueToday = open.filter(o => duePieces(o,today)>0);
  const late = open.filter(o => latePieces(o,today)>0);
  const dueAmount = data.orders.reduce((s, o) => s + orderBalance(o), 0);
  const todayReceived = data.orders.flatMap(o => o.payments || []).filter(p => p.date === today).reduce((s,p) => s+amount(p.amount),0);
  const readyPieces = data.orders.flatMap(o => o.items || []).filter(i => i.status === 'tayyar').reduce((s,i) => s+Math.max(1,Number(i.quantity)||1),0);
  return { open, dueToday, late, dueAmount, todayReceived, readyPieces,
    openPieces: open.reduce((s,o) => s+remainingPieces(o),0),
    dueTodayPieces: dueToday.reduce((s,o) => s+duePieces(o,today),0),
    latePieces: late.reduce((s,o) => s+latePieces(o,today),0) };
}
export function receivedByDate(data, day) {
  return data.orders.flatMap(o => o.payments || []).filter(p => p.date === day).reduce((sum,p) => sum+amount(p.amount),0);
}
export function spentByDate(data, day) {
  return data.expenses.filter(e => e.date === day).reduce((sum,e) => sum+amount(e.amount),0);
}
export function validData(data) {
  const text = value => typeof value === 'string' && value.length <= 10000;
  const optionalText = value => value == null || text(value);
  const number = value => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1e12;
  const date = value => {
    if(!text(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
    const [y,m,d]=value.split('-').map(Number), parsed=new Date(y,m-1,d,12);
    return parsed.getFullYear()===y && parsed.getMonth()+1===m && parsed.getDate()===d;
  };
  const unique = list => new Set(list.map(x=>x?.id)).size === list.length;
  const measure = m => m && typeof m === 'object' && text(m.type) && ['basis','width','unit','note','savedAt'].every(k=>optionalText(m[k]))
    && m.values && typeof m.values === 'object' && !Array.isArray(m.values) && Object.values(m.values).every(v=>text(v)||number(v))
    && Array.isArray(m.extra) && m.extra.every(x=>x && optionalText(x.label) && (optionalText(x.value)||number(x.value)));
  if (!data || typeof data !== 'object' || data.schema !== 1 || !data.shop || !text(data.shop.name) || !number(data.localRevision || 0)) return false;
  if (!['owner','phone','address'].every(k=>optionalText(data.shop[k])) || !number(data.shop.capacity||0)) return false;
  if (!['customers','workers','orders','expenses'].every(key => Array.isArray(data[key]) && data[key].length <= 50000 && unique(data[key]))) return false;
  if (!data.customers.every(c => c && text(c.id) && text(c.name) && ['phone','village','notes'].every(k=>optionalText(c[k]))
    && Array.isArray(c.people) && c.people.length && unique(c.people) && c.people.every(p => p && text(p.id) && text(p.name) && optionalText(p.relation) && Array.isArray(p.measurements) && p.measurements.every(measure)))) return false;
  if (!data.workers.every(w => w && text(w.id) && text(w.name) && optionalText(w.phone))) return false;
  const customers=new Map(data.customers.map(c=>[c.id,c]));
  if (!data.orders.every(o => {
    const customer=customers.get(o?.customerId);
    return o && text(o.id) && text(o.number) && customer && optionalText(o.customerName) && optionalText(o.note) && number(o.discount||0) && date(o.createdDate) && date(o.dueDate) && Array.isArray(o.items) && o.items.length && unique(o.items)
      && o.items.every(i => i && text(i.id) && text(i.type) && text(i.personName) && customer.people.some(p=>p.id===i.personId)
        && ['workerId','note','fabric','statusAt'].every(k=>optionalText(i[k])) && (i.style==null || (typeof i.style==='object' && ['collar','cuff','pocket','bottom'].every(k=>optionalText(i.style[k]))))
        && Number.isInteger(Number(i.quantity)) && Number(i.quantity)>=1 && Number(i.quantity)<=100 && number(i.rate) && number(i.wage||0)
        && STATUS.some(s=>s.id===i.status) && (!i.dueDate || date(i.dueDate)) && (!i.measurement || measure(i.measurement)))
      && Array.isArray(o.payments) && unique(o.payments) && o.payments.every(p=>p && text(p.id) && date(p.date) && number(p.amount) && optionalText(p.method) && optionalText(p.note));
  })) return false;
  return data.expenses.every(e => e && text(e.id) && text(e.category) && date(e.date) && number(e.amount) && optionalText(e.workerId) && optionalText(e.note));
}

export function demoData() {
  const today = dateKey();
  const mkMeasure = (values, note='') => ({ id:uid('m'), type:'Shalwar Kameez', basis:'tayyar', width:'aadha', unit:'inch', values, extra:[], note, savedAt:new Date().toISOString() });
  const a = {id:'demo-c1',name:'Ahmed Khan',phone:'0300 XXX XXXX',village:'Chak 17',notes:'',people:[
    {id:'demo-p1',name:'Ahmed Khan',relation:'Khud',measurements:[mkMeasure({length:'42',shoulder:'18',sleeve:'24',chest:'22½',daman:'23',neck:'15½',shalwarLength:'40',bottom:'17'},'Pehle wala fit pasand hai')]},
    {id:'demo-p2',name:'Bilal',relation:'Beta',measurements:[mkMeasure({length:'35',shoulder:'16',sleeve:'21',chest:'19',shalwarLength:'36',bottom:'15'})]}
  ]};
  const b = {id:'demo-c2',name:'Muhammad Aslam',phone:'0301 XXX XXXX',village:'Gulabad',notes:'',people:[{id:'demo-p3',name:'Muhammad Aslam',relation:'Khud',measurements:[mkMeasure({length:'43',shoulder:'18½',sleeve:'24',chest:'23',shalwarLength:'41',bottom:'16'})]}]};
  const c = {id:'demo-c3',name:'Imran Ali',phone:'',village:'Main bazaar',notes:'Phone number nahi hai',people:[{id:'demo-p4',name:'Imran Ali',relation:'Khud',measurements:[mkMeasure({length:'41',shoulder:'17',sleeve:'23',chest:'21',shalwarLength:'40',bottom:'16'})]}]};
  const d = {id:'demo-c4',name:'Rashid Mehmood',phone:'0321 XXX XXXX',village:'Chak 22',notes:'',people:[{id:'demo-p5',name:'Rashid Mehmood',relation:'Khud',measurements:[mkMeasure({length:'42',shoulder:'18',sleeve:'24',chest:'22',shalwarLength:'42',bottom:'17'})]}]};
  const w1 = {id:'demo-w1',name:'Naveed',phone:''}, w2={id:'demo-w2',name:'Ahsan',phone:''};
  const item = (id,p,type,qty,rate,status,workerId,wage) => ({id,personId:p.id,personName:p.name,type,quantity:qty,rate,status,workerId,wage,
    style:{collar:'Ban',cuff:'Gol',pocket:'Dono side',bottom:'Shalwar'}, note:'', measurement:structuredClone(p.measurements[0]), statusAt:today});
  const pay=(id,amt,off)=>({id,amount:amt,date:shiftDay(today,off),method:'Cash',note:''});
  const orders=[
    {id:'demo-o1',number:'DD-1008',customerId:a.id,customerName:a.name,createdDate:shiftDay(today,-5),dueDate:today,discount:0,note:'Jumma se pehle chahiye',items:[item('demo-i1',a.people[0],'Shalwar Kameez',2,1800,'silai',w1.id,650),item('demo-i2',a.people[1],'Shalwar Kameez',1,1500,'cutting',w2.id,550)],payments:[pay('demo-pay1',2000,-5)]},
    {id:'demo-o2',number:'DD-1007',customerId:b.id,customerName:b.name,createdDate:shiftDay(today,-7),dueDate:shiftDay(today,-1),discount:0,note:'',items:[item('demo-i3',b.people[0],'Shalwar Kameez',1,2000,'tayyar',w1.id,650)],payments:[pay('demo-pay2',1000,-7)]},
    {id:'demo-o3',number:'DD-1006',customerId:c.id,customerName:c.name,createdDate:shiftDay(today,-3),dueDate:today,discount:0,note:'',items:[item('demo-i4',c.people[0],'Shalwar Kameez',1,1800,'naya','',0)],payments:[]},
    {id:'demo-o4',number:'DD-1005',customerId:d.id,customerName:d.name,createdDate:shiftDay(today,-6),dueDate:shiftDay(today,2),discount:0,note:'',items:[item('demo-i5',d.people[0],'Shalwar Kameez',2,1800,'cutting',w2.id,600)],payments:[pay('demo-pay3',1500,-3)]},
    {id:'demo-o5',number:'DD-1004',customerId:b.id,customerName:b.name,createdDate:shiftDay(today,-12),dueDate:shiftDay(today,-2),discount:0,note:'',items:[item('demo-i6',b.people[0],'Shalwar Kameez',1,1800,'diya',w1.id,600)],payments:[pay('demo-pay4',500,-9),pay('demo-pay5',1300,-2)]},
    {id:'demo-o6',number:'DD-1003',customerId:c.id,customerName:c.name,createdDate:shiftDay(today,-16),dueDate:shiftDay(today,-8),discount:0,note:'',items:[item('demo-i7',c.people[0],'Shalwar Kameez',1,1600,'diya',w2.id,500)],payments:[pay('demo-pay6',1600,-8)]}
  ];
  const base=blankData();
  return {...base,nextOrderSerial:1009,isDemo:true,shop:{name:'Rehmat Tailors',owner:'',phone:'',address:'',capacity:6},customers:[a,b,c,d],workers:[w1,w2],orders,
    expenses:[{id:'demo-e1',category:'Mazdoori',workerId:w1.id,amount:500,date:shiftDay(today,-2),note:'Karigar payment'}, {id:'demo-e2',category:'Dhaga / samaan',workerId:'',amount:350,date:shiftDay(today,-3),note:'Dhaga aur button'}]};
}
