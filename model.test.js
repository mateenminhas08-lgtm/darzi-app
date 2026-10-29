import test from 'node:test';
import assert from 'node:assert/strict';
import { addMeasurement, blankData, dateKey, demoData, hasMeasure, metrics, nextOrderNumber, orderBalance, orderPaid, orderTotal, overallStatus, shiftDay, validData, workerTotals } from '../src/model.js';
import { backupText, csv, parseBackup, reportCsv } from '../src/export.js';

test('each order balance includes partial payments and discount without negative balances',()=>{
  const order={items:[{quantity:2,rate:1800},{quantity:1,rate:1500}],discount:100,payments:[{amount:1000},{amount:500}]};
  assert.equal(orderTotal(order),5000);assert.equal(orderPaid(order),1500);assert.equal(orderBalance(order),3500);
});
test('mixed statuses and completed pieces are reported honestly',()=>{
  const order={items:[{quantity:2,status:'tayyar'},{quantity:1,status:'cutting'}]};
  assert.equal(overallStatus(order),'mixed');order.items[1].status='diya';assert.equal(overallStatus(order),'tayyar');order.items[0].status='diya';assert.equal(overallStatus(order),'diya');
});
test('naap history preserves separate people and historical order snapshots',()=>{
  const d=blankData();d.customers=[{id:'c',name:'Ali',phone:'',people:[{id:'p1',name:'Ali',measurements:[]},{id:'p2',name:'Bilal',measurements:[]}]}];
  const m={type:'Shalwar Kameez',basis:'tayyar',width:'aadha',unit:'inch',values:{chest:'22½'},extra:[],note:''};
  addMeasurement(d,'c','p1',m);const orderSnapshot=structuredClone(d.customers[0].people[0].measurements[0]);m.values.chest='23';addMeasurement(d,'c','p1',m);
  assert.equal(orderSnapshot.values.chest,'22½');assert.equal(d.customers[0].people[0].measurements.length,2);assert.equal(d.customers[0].people[1].measurements.length,0);
});
test('worker wages include completed items and treat excess payment as advance',()=>{
  const d=blankData();d.workers=[{id:'w',name:'Rafi'}];d.orders=[{items:[{workerId:'w',quantity:2,wage:500,status:'tayyar'},{workerId:'w',quantity:1,wage:700,status:'silai'}]}];
  d.expenses=[{workerId:'w',category:'Mazdoori',amount:1200}];assert.deepEqual(workerTotals(d,'w'),{agreed:1700,completed:1000,paid:1200,due:0,advance:200});
});
test('dashboard distinguishes today, overdue and complete orders',()=>{
  const d=demoData(), today=dateKey(), m=metrics(d,today);assert.equal(m.openPieces,7);assert.equal(m.dueTodayPieces,4);assert.equal(m.late.length,1);assert.equal(m.dueAmount,8000);assert.equal(shiftDay('2026-01-01',-1),'2025-12-31');
});
test('backup round trip validates format and rejects malformed data',()=>{
  const d=demoData();assert.equal(validData(d),true);assert.equal(parseBackup(backupText(d)).orders.length,d.orders.length);
  assert.throws(()=>parseBackup('{bad'));assert.throws(()=>parseBackup(JSON.stringify({format:'darzi-dukaan-backup',version:1,data:{schema:1}})));
});
test('CSV neutralizes formulas and structured reports contain totals',()=>{
  assert.match(csv([['=1+1','-cmd','ok']]),/"'=1\+1","'-cmd","ok"/);
  const d=demoData();assert.match(reportCsv(d,'orders'),/total_pkr/);assert.match(reportCsv(d,'payments'),/amount_pkr/);assert.match(reportCsv(d,'items'),/wage_per_piece/);
});
test('empty and next order numbering are predictable',()=>{const d=blankData();assert.equal(nextOrderNumber(d),'DD-1001');d.orders=[{number:'DD-1008'}];assert.equal(nextOrderNumber(d),'DD-1009');assert.equal(hasMeasure({values:{chest:'22½'},extra:[]}),true);});

test('each item can have its own delivery date and dashboard counts only matching pieces',()=>{
  const d=blankData(), today=dateKey();
  d.orders=[{id:'o',customerId:'c',dueDate:shiftDay(today,3),items:[{quantity:2,status:'silai',dueDate:today},{quantity:1,status:'naya',dueDate:shiftDay(today,-1)},{quantity:5,status:'diya',dueDate:today}],payments:[]}];
  const m=metrics(d,today);assert.equal(m.dueTodayPieces,2);assert.equal(m.latePieces,1);assert.equal(m.openPieces,3);
});

test('a deleted highest order number is not reused once the serial is recorded',()=>{
  const d=blankData();d.nextOrderSerial=1006;d.orders=[{number:'DD-1004'}];assert.equal(nextOrderNumber(d),'DD-1006');
});

test('corrupt nested records are rejected before an import can replace local data',()=>{
  const a=demoData();a.customers[0].people[0].measurements=[null];assert.equal(validData(a),false);
  const b=demoData();b.orders[0].payments=[null];assert.equal(validData(b),false);
  const c=demoData();c.orders[0].items[0].personId='missing';assert.equal(validData(c),false);
});
