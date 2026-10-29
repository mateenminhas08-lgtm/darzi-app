import { amount, itemDueDate, nextDueDate, orderPaid, orderTotal, overallStatus, statusInfo, validData } from './model.js';
export function download(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type }); const href = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=href; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 30_000);
}
export function backupText(data) {
  return JSON.stringify({ format:'darzi-dukaan-backup', version:1, exportedAt:new Date().toISOString(), data }, null, 2);
}
export function parseBackup(text) {
  if (typeof text !== 'string' || text.length > 20_000_000) throw new Error('Backup file bohat bari ya ghalat hai.');
  let parsed; try { parsed=JSON.parse(text); } catch (_) { throw new Error('Yeh valid JSON backup nahi hai.'); }
  if (parsed?.format !== 'darzi-dukaan-backup' || parsed?.version !== 1 || !validData(parsed.data)) throw new Error('Yeh Darzi Dukaan ka valid backup nahi hai.');
  return parsed.data;
}
function cell(value) {
  let text = value == null ? '' : String(value);
  if (typeof value !== 'number' && /^[\s\t\r\n]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function csv(rows) { return '\ufeff' + rows.map(row => row.map(cell).join(',')).join('\r\n') + '\r\n'; }
export function reportCsv(data, kind) {
  const customer = id => data.customers.find(c => c.id === id)?.name || '';
  if (kind === 'orders') return csv([['order_no','customer','order_date','default_due_date','nearest_open_due_date','status','total_pkr','received_pkr','balance_pkr'],
    ...data.orders.map(o => [o.number, customer(o.customerId) || o.customerName, o.createdDate, o.dueDate, nextDueDate(o), statusInfo(overallStatus(o)).label, orderTotal(o), orderPaid(o), Math.max(0,orderTotal(o)-orderPaid(o))])]);
  if (kind === 'items') return csv([['order_no','customer','wearer','garment','quantity','rate_per_piece','status','worker','wage_per_piece','due_date','fabric'],
    ...data.orders.flatMap(o => (o.items||[]).map(i => [o.number, customer(o.customerId)||o.customerName, i.personName, i.type, Number(i.quantity)||1, amount(i.rate), statusInfo(i.status).label, data.workers.find(w=>w.id===i.workerId)?.name||'', amount(i.wage), itemDueDate(i,o), i.fabric||'']))]);
  if (kind === 'payments') return csv([['date','order_no','customer','amount_pkr','method','note'],...data.orders.flatMap(o => (o.payments||[]).map(p => [p.date,o.number,customer(o.customerId)||o.customerName,amount(p.amount),p.method,p.note]))]);
  if (kind === 'expenses') return csv([['date','category','worker','amount_pkr','note'],...data.expenses.map(e => [e.date,e.category,data.workers.find(w=>w.id===e.workerId)?.name||'',amount(e.amount),e.note])]);
  throw new Error('Unknown CSV type');
}
