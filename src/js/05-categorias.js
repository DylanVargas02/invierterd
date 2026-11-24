/* ---------- Ingresos, presupuesto, fijos, metas, plan de deudas y hogar compartido ---------- */
const INC={salario:'Salario',independiente:'Trabajo independiente',remesa:'Remesas',negocio:'Negocio propio',renta:'Alquileres cobrados',otros:'Otro ingreso'};
const ESSENTIAL=['vivienda','servicios','comida','salud','transporte','educacion'];
const monthShort=new Intl.DateTimeFormat('es-DO',{month:'short',year:'numeric'});
const catOpts=sel=>Object.entries(CATS).map(([k,c])=>`<option value="${k}"${k===sel?' selected':''}>${c.n}</option>`).join('');
/* ---------- Íconos de categorías y tipos ---------- */
const CAT_IC={
  comida:'<path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10"/><path d="M17.5 21V3c-2.2 1.2-3.5 4-3.5 8h3.5"/>',
  transporte:'<path d="M4 16v-4l2.2-5.2A2 2 0 0 1 8 5.6h8a2 2 0 0 1 1.8 1.2L20 12v4"/><rect x="3" y="12" width="18" height="5" rx="1.5"/><path d="M6.5 17v2.5M17.5 17v2.5M7 14.5h1M16 14.5h1"/>',
  vivienda:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  servicios:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  salud:'<path d="M20.5 8.8A4.8 4.8 0 0 0 12 6a4.8 4.8 0 0 0-8.5 2.8c0 5.3 8.5 11 8.5 11s8.5-5.7 8.5-11z"/><path d="M7 11.5h2.6l1.4-2.5 2 5 1.4-2.5H17"/>',
  ocio:'<path d="M3 8.5a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v7a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2z"/><path d="M14.5 7v1.5M14.5 11v2M14.5 15.5V17"/>',
  educacion:'<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v5"/>',
  otros:'<path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8.5 8.5-9 9z"/><circle cx="8" cy="8" r="1.4"/>',
  salario:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7V5.2A1.7 1.7 0 0 1 10.2 3.5h3.6a1.7 1.7 0 0 1 1.7 1.7V7M3 12.5h18M11 12.5v2h2v-2"/>',
  independiente:'<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19.5h20M10 8.5l-2 2 2 2M14 8.5l2 2-2 2"/>',
  negocio:'<path d="M4.5 10.5V20h15v-9.5"/><path d="M3 4h18l-1.3 4.6a2.3 2.3 0 0 1-4.4 0 2.3 2.3 0 0 1-4.6 0 2.3 2.3 0 0 1-4.6 0 2.3 2.3 0 0 1-1.8 1.9"/><path d="M10 20v-5h4v5"/>',
  remesa:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.4 3 14.6 0 18M12 3c-3 3.4-3 14.6 0 18"/>',
  renta:'<circle cx="8" cy="15.5" r="4"/><path d="M11 12.5l9-9M15.5 8l3 3M18 5.5l2 2"/>',
  oingreso:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  interes:'<path d="M12 21v-8.5"/><path d="M12 12.5c0-4.2 3-7.5 8.5-7.5 0 4.2-3 7.5-8.5 7.5z"/><path d="M12 15c0-3-2.6-5.6-7.5-5.6 0 3.6 2.6 5.6 7.5 5.6z"/>',
  custom:'<path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8.5 8.5-9 9z"/><circle cx="8" cy="8" r="1.4"/>'
};
Object.assign(CATS,{comida:{n:'Comida',c:'#D9822B'},transporte:{n:'Transporte',c:'#3F7CB8'},vivienda:{n:'Vivienda',c:'#A5452F'},servicios:{n:'Servicios',c:'#2E8C86'},
  salud:{n:'Salud',c:'#C2456B'},ocio:{n:'Ocio',c:'#B8901A'},educacion:{n:'Educación',c:'#5E8F3A'},otros:{n:'Otros',c:'#93857C'}});
const CUSTOM_C=['#8A6BB8','#4F8F8A','#B5651D','#6D7F2F','#A24C7A','#4E6E9E','#9C7A3C'];
const svgIc=p=>`<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const catSvg=k=>svgIc(CAT_IC[k]||CAT_IC.custom),incSvg=k=>svgIc(CAT_IC[k==='otros'?'oingreso':k]||CAT_IC.custom);
const catIc=k=>{const c=(CATS[k]||CATS.otros).c;return `<span class="tx-ic ic2" style="--ic:${c}">${catSvg(k)}</span>`};
const incIc=k=>{const c=INC_C[k]||'var(--c-gray)';return `<span class="tx-ic ic2" style="--ic:${c}">${incSvg(k)}</span>`};
/* Categorías propias: «Otro» → escribir → dejarla fija */
function applyCustom(){
  const C=S.customCats||(S.customCats={exp:[],inc:[]});C.exp=C.exp||[];C.inc=C.inc||[];
  C.exp.forEach((x,i)=>{CATS[x.k]={n:x.n,c:CUSTOM_C[i%CUSTOM_C.length],custom:true}});
  C.inc.forEach((x,i)=>{INC[x.k]=x.n;INC_C[x.k]=CUSTOM_C[(i+3)%CUSTOM_C.length]});
  (S.customEnts||[]).forEach(e=>{if(!ALL_ENTS.includes(e)){ALL_ENTS.push(e);(ENTS['Mis entidades']=ENTS['Mis entidades']||[]).push(e)}});
  (S.customTypes||[]).forEach(t=>{if(!SAV_T.includes(t))SAV_T.splice(SAV_T.length-1,0,t)});
  (S.customLoanTypes||[]).forEach(t=>{if(!LOAN_T.includes(t))LOAN_T.splice(LOAN_T.length-1,0,t)});
}
const slug=s=>'u_'+s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').slice(0,20);
function addCustomCat(kind,name){
  name=name.trim().replace(/\s+/g,' ');if(!name)return null;name=name[0].toUpperCase()+name.slice(1);
  const L=kind==='inc'?INC:CATS,hit=Object.entries(L).find(([,v])=>(typeof v==='string'?v:v.n).toLowerCase()===name.toLowerCase());if(hit)return hit[0];
  const C=S.customCats||(S.customCats={exp:[],inc:[]});const k=slug(name);(C[kind]=C[kind]||[]).push({k,n:name});applyCustom();return k;
}
function addCustomList(key,val){val=(val||'').trim();if(!val)return val;S[key]=S[key]||[];if(!S[key].includes(val))S[key].push(val);applyCustom();return val}
/* Recuadro que aparece al elegir «Otro» */
const otroBox=(id,ph,on,val)=>`<div class="otro" id="${id}" ${on?'':'hidden'}><label for="${id}_n" class="sr">Escribe cuál</label><input id="${id}_n" maxlength="30" placeholder="${ph}" autocomplete="off" value="${esc(val||'')}"><label class="check otro-k"><input type="checkbox" id="${id}_k" checked><span>Agregarla a mis opciones para la próxima vez</span></label></div>`;
const otroVal=id=>{const n=document.getElementById(id+'_n'),k=document.getElementById(id+'_k');return {n:n?n.value.trim():'',keep:!!(k&&k.checked)}};
const partner=()=>(S.home&&S.home.partner)||'tu pareja';
function inMonth(ts,y,m){const t=new Date(ts);return t.getFullYear()===y&&t.getMonth()===m}
function budgetTotal(){return Object.values(S.catBudget||{}).reduce((a,b)=>a+(+b||0),0)}
function monthFlow(y,m){
  const inc=S.incomes.filter(x=>inMonth(x.date,y,m)).reduce((a,x)=>a+conv(x.amt,x.cur,S.base),0);
  const exp=S.expenses.filter(x=>inMonth(x.date,y,m)).reduce((a,x)=>a+conv(x.amt,x.cur,S.base),0);
  return {inc,exp,left:inc-exp,rate:inc>0?(inc-exp)/inc:null};
}
function recDue(r){const n=new Date(),last=new Date(n.getFullYear(),n.getMonth()+1,0).getDate();return new Date(n.getFullYear(),n.getMonth(),Math.min(r.day,last))}
function recStatus(r){
  if(r.lastPaid===ym())return {k:'paid',t:'Pagado'};
  const dd=daysTo(recDue(r));
  return dd<0?{k:'late',t:'Atrasado '+(-dd)+' d'}:dd===0?{k:'soon',t:'Vence hoy'}:dd<=5?{k:'soon',t:'En '+dd+' d'}:{k:'',t:'Día '+r.day};
}
function isLiquid(s){return s.liquid!==undefined?s.liquid:['Cuenta de ahorro','Fondo de inversión'].includes(s.type)}
function emergency(){
  const t=Date.now();
  const liquid=S.savings.filter(isLiquid).reduce((a,s)=>a+conv(savValue(s,t),s.cur,S.base),0);
  let ess=ESSENTIAL.reduce((a,k)=>a+conv(+(S.catBudget||{})[k]||0,'DOP',S.base),0);
  S.loans.forEach(l=>{const st=loanState(l);if(st.left)ess+=conv(st.cuota,l.cur,S.base)});
  S.cards.forEach(c=>ess+=conv(minPay(c),c.cur,S.base));
  return {liquid,ess,months:ess>0?liquid/ess:0,target:S.emTarget||6};
}
function monthsBetween(a,b){return (b.getFullYear()-a.getFullYear())*12+(b.getMonth()-a.getMonth())}

/* ---- Consumos detectados por confirmar ---- */
function pendingHTML(kind){
  const L=S.pending.filter(p=>kind==='i'?p.k==='in':p.k!=='in');if(!L.length)return '';const inc=kind==='i';
  const incOpts=sel=>Object.entries(INC).map(([k,n])=>`<option value="${k}"${k===sel?' selected':''}>${esc(n)}</option>`).join('');
  return `<section class="inbox" aria-label="${inc?'Depósitos':'Consumos'} por confirmar"><div class="inbox-h"><span>${inc?'Depósitos':'Consumos'} por confirmar <span class="count num">${L.length}</span></span>${S.example?'<span class="tag">Ejemplo</span>':''}</div>
  ${L.map(p=>{const c=S.cards.find(x=>x.id===p.cardId)||(p.acctId?S.savings.find(x=>x.id===p.acctId):null);return `<div class="pend">${inst(c?c.entity:'Banco',1)}<div class="pm"><b>${esc(p.desc)}</b><span>${esc(c?c.name:p.last4?'•••• '+p.last4:'Aviso del banco')} · ${dateFmt.format(new Date(p.date))}</span></div><b class="num ${inc?'pos':''}">${inc?'+':''}${esc(fmt(p.amt,p.cur))}</b>
    <div class="pend-act"><select data-pcat="${p.id}" aria-label="${inc?'Tipo de ingreso':'Categoría'}">${inc?incOpts(p.src):catOpts(p.cat)}</select><button class="mini-btn" data-pno="${p.id}">Descartar</button><button class="mini-btn go" data-pok="${p.id}">Confirmar</button></div></div>`}).join('')}
  <p class="hint inbox-f">${S.example?'En tu app llegan de los avisos de tu banco, con tu permiso.':'Llegaron de los avisos de tu banco en Gmail. Confírmalos para registrarlos.'}</p></section>`;
}
function bindPending(){
  document.querySelectorAll('[data-pcat]').forEach(s=>s.onchange=()=>{const p=S.pending.find(x=>x.id===s.dataset.pcat);if(p){if(p.k==='in')p.src=s.value;else p.cat=s.value;save()}});
  document.querySelectorAll('[data-pok]').forEach(b=>b.onclick=()=>{
    const i=S.pending.findIndex(x=>x.id===b.dataset.pok);if(i<0)return;const p=S.pending.splice(i,1)[0];
    if(p.k==='in'){const a=p.acctId?S.savings.find(x=>x.id===p.acctId):null,x={id:uid(),desc:p.desc,amt:p.amt,cur:p.cur,src:p.src||'otros',date:p.date,via:a?'a:'+a.id:''};if(a)applyVia(x,1,'i');
      S.incomes.push(x);save();render();toast(a?'Depósito sumado a '+a.name:'Ingreso registrado');return}
    const c=S.cards.find(x=>x.id===p.cardId),a=!c&&p.acctId?S.savings.find(x=>x.id===p.acctId):null;if(c&&c.cur===p.cur)c.balance+=p.amt;
    const x={id:uid(),desc:p.desc,amt:p.amt,cur:p.cur,cat:p.cat,date:p.date,via:c&&c.cur===p.cur?'c:'+c.id:a?'a:'+a.id:''};if(a)applyVia(x,1,'e');
    S.expenses.push(x);save();render();toast(c?'Consumo registrado en la tarjeta':a?'Consumo descontado de '+a.name:'Consumo registrado')});
  bindDel('[data-pno]','pending');
}

/* ---- Presupuesto por categoría ---- */
function presHTML(){
  const n=new Date(),y=n.getFullYear(),m=n.getMonth(),fl=monthFlow(y,m),B=S.catBudget||{};
  const spent={};S.expenses.filter(x=>inMonth(x.date,y,m)).forEach(x=>spent[x.cat]=(spent[x.cat]||0)+conv(x.amt,x.cur,S.base));
  const tot=conv(budgetTotal(),'DOP',S.base), free=fl.inc-tot, used=tot?fl.exp/tot:0;
  const rows=Object.keys(CATS).filter(k=>(+B[k]>0)||spent[k]).map(k=>{const lim=conv(+B[k]||0,'DOP',S.base),sp=spent[k]||0;return {k,lim,sp,p:lim?sp/lim:null}})
    .sort((a,b)=>(b.p??-1)-(a.p??-1));
  const lvl=p=>p===null?'none':p>1?'over':p>=.8?'warn':'ok';
  const fill=l=>l==='over'?'var(--spend)':l==='warn'?'var(--debt)':'var(--grow)';
  return `<section class="month"><div class="month-h"><span class="capz">${monthFmt.format(n)}</span><button class="link-btn" id="editBud">Editar presupuesto</button></div>
    <div class="mstats three num"><div><small>Ingresos</small><strong>${esc(fmt(fl.inc,S.base,0))}</strong></div><div><small>Presupuestado</small><strong>${esc(fmt(tot,S.base,0))}</strong></div><div><small>${free>=0?'Sin asignar':'Sobre ingresos'}</small><strong style="color:${free>=0?'var(--grow)':'var(--spend)'}">${esc(fmt(Math.abs(free),S.base,0))}</strong></div></div>
    <div class="bar"><i style="width:${Math.min(100,used*100).toFixed(1)}%;--fill:${fill(lvl(tot?used:null))}"></i></div>
    <div class="budget-line num"><span>Gastado ${esc(fmt(fl.exp,S.base,0))}</span><span>${tot?Math.round(used*100)+' % del presupuesto':'Sin presupuesto'}</span></div></section>
  <h2 class="sec">Por categoría</h2>
  ${rows.length?`<div class="tx-group">${rows.map(r=>{const l=lvl(r.p);return `<div class="bud">${catIc(r.k)}<div class="bn"><b>${CATS[r.k].n}</b><span class="num">${esc(fmt(r.sp,S.base,0))} de ${r.lim?esc(fmt(r.lim,S.base,0)):'sin límite'}${r.lim?(r.sp<=r.lim?' · quedan '+esc(fmt(r.lim-r.sp,S.base,0)):' · '+esc(fmt(r.sp-r.lim,S.base,0))+' de más'):''}</span></div><span class="bp num lvl-${l}">${r.p===null?'—':Math.round(r.p*100)+' %'}</span>${r.lim?`<div class="bar"><i style="width:${Math.min(100,r.p*100).toFixed(1)}%;--fill:${fill(l)}"></i></div>`:''}</div>`}).join('')}</div>`
  :`<div class="empty">Asigna un límite a cada categoría y verás cuánto te queda.<button class="btn" id="emptyB" style="--accent:var(--spend)">Crear presupuesto</button></div>`}`;
}
function bindPres(){const a=$('#editBud'),b=$('#emptyB');if(a)a.onclick=openBudget;if(b)b.onclick=openBudget}
function openBudget(keep){
  keep=keep||{};
  sheet(`<h3>Presupuesto mensual</h3><form class="form" id="f"><p class="hint">Montos en RD$. Deja en blanco las categorías sin límite.</p>
  <div class="bud-grid">${Object.entries(CATS).map(([k,c])=>`<div class="field"><label for="b_${k}">${esc(c.n)}</label><input id="b_${k}" data-money="DOP" inputmode="decimal" value="${keep[k]!==undefined?esc(keep[k]):(+(S.catBudget||{})[k]||'')}" placeholder="0"></div>`).join('')}</div>
  <div class="bud-new"><label for="bNew">¿Falta una categoría?</label><div class="mc-add"><input id="bNew" maxlength="30" placeholder="Ej. Mascotas"><button type="button" class="btn ghost" id="bAdd">Agregar</button></div></div>
  <div class="err" id="err"></div><button class="btn" type="submit">Guardar</button></form>`,'var(--spend)');
  const vals=()=>{const o={};Object.keys(CATS).forEach(k=>{const el=$('#b_'+k);if(el)o[k]=el.value});return o};
  $('#bAdd').onclick=()=>{const o=vals(),k=addCustomCat('exp',$('#bNew').value);if(!k){$('#bNew').focus();return}save();openBudget(o);const el=$('#b_'+k);if(el)el.focus();toast('Categoría agregada')};
  $('#f').onsubmit=e=>{e.preventDefault();const nb={};
    for(const k of Object.keys(CATS)){const v=$('#b_'+k).value.trim();if(!v)continue;const n=money(v);if(!(n>=0))return $('#err').textContent=`Revisa el monto de ${CATS[k].n}. Escribe solo números, por ejemplo 5000.`;if(n>0)nb[k]=n}
    S.catBudget=nb;save();close();render();toast('Presupuesto guardado')};
}

/* ---- Gastos fijos ---- */
function fijosHTML(){
  const R=S.recurring,now=ym();let tot=0,pd=0;
  R.forEach(r=>{const v=conv(r.amt,r.cur,S.base);tot+=v;if(r.lastPaid===now)pd+=v});
  const nPaid=R.filter(r=>r.lastPaid===now).length;
  const sorted=[...R].sort((a,b)=>(a.lastPaid===now)-(b.lastPaid===now)||a.day-b.day);
  return `<section class="month"><div class="month-h"><span>Gastos fijos del mes</span><span class="num">${nPaid} de ${R.length} pagados</span></div>
    <div class="mstats three num"><div><small>Total al mes</small><strong>${esc(fmt(tot,S.base,0))}</strong></div><div><small>Pagado</small><strong style="color:var(--grow)">${esc(fmt(pd,S.base,0))}</strong></div><div><small>Pendiente</small><strong style="color:var(--debt)">${esc(fmt(tot-pd,S.base,0))}</strong></div></div>
    <div class="bar"><i style="width:${tot?(pd/tot*100).toFixed(1):0}%"></i></div></section>
  <h2 class="sec">Fijos <span class="count num">${R.length}</span><button type="button" id="addR">+ Agregar</button></h2>
  ${R.length?`<div class="tx-group">${sorted.map(r=>{const st=recStatus(r);return `<div class="tx">${r.icon?fxIc(r.icon,r.cat):catIc(r.cat)}<div class="tx-main"><b>${esc(r.name)}</b><span><span class="due ${st.k}">${st.t}</span></span></div><div class="tx-amt num">${esc(fmt(r.amt,r.cur,0))}</div>${st.k==='paid'?'':`<button class="mini-btn go" data-rpay="${r.id}">Pagar</button>`}${X('data-del-r',r.id)}</div>`}).join('')}</div>`
  :empty('Agrega alquiler, luz, internet y otros pagos que se repiten cada mes.','emptyR','var(--spend)')}`;
}
function bindFijos(){
  const e=$('#emptyR');if(e)e.onclick=openRecurring;const ar=$('#addR');if(ar)ar.onclick=openRecurring;
  document.querySelectorAll('[data-rpay]').forEach(b=>b.onclick=()=>{
    const r=S.recurring.find(x=>x.id===b.dataset.rpay);if(!r)return;const prev=r.lastPaid,eid=uid();
    r.lastPaid=ym();S.expenses.push({id:eid,desc:r.name,amt:r.amt,cur:r.cur,cat:r.cat,date:Date.now()});save();render();
    undoToast(r.name+' pagado',()=>{r.lastPaid=prev;S.expenses=S.expenses.filter(x=>x.id!==eid);save();render()});
  });
  bindDel('[data-del-r]','recurring');
}
function openRecurring(){
  sheet(`<h3>Nuevo gasto fijo</h3><form class="form" id="f">
  <div class="field"><label for="rName">Nombre</label><input id="rName" placeholder="Ej. Internet" maxlength="40"></div>
  <div class="two"><div class="field"><label for="rAmt">Monto</label><input id="rAmt" data-money="rCur" inputmode="decimal" placeholder="0.00"></div><div class="field"><label for="rCur">Moneda</label>${curSel('rCur','DOP')}</div></div>
  <div class="two"><div class="field"><label for="rCat">Categoría</label><select id="rCat">${catOpts('servicios')}</select></div><div class="field"><label for="rDay">Día de pago</label><input id="rDay" inputmode="numeric" placeholder="15"></div></div>${otroBox('rOtro','Ej. Mascotas, mesada',false)}
  <div class="err" id="err"></div><button class="btn" type="submit">Guardar</button></form>`,'var(--spend)');
  $('#f').onsubmit=e=>{e.preventDefault();const name=$('#rName').value.trim(),amt=money($('#rAmt').value),day=parseInt($('#rDay').value,10);
    if(!name)return $('#err').textContent='Ponle un nombre al gasto fijo.';if(!(amt>0))return $('#err').textContent='Escribe el monto en números, por ejemplo 1500.';if(!(day>=1&&day<=31))return $('#err').textContent='El día de pago va de 1 a 31.';
    let cat=$('#rCat').value;if(cat==='otros'){const o=otroVal('rOtro');if(o.n&&o.keep)cat=addCustomCat('exp',o.n)||'otros'}
    S.recurring.push({id:uid(),name,amt,cur:$('#rCur').value,cat,day,lastPaid:null});save();close();render();toast('Gasto fijo guardado')};
  $('#rCat').onchange=()=>{$('#rOtro').hidden=$('#rCat').value!=='otros'};
}



/* ---- Hogar compartido ---- */

