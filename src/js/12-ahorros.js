/* ---------- Gastos ---------- */
let gastSeg='mov';
function vGastos(){
  const segH=`<div class="seg" role="group" aria-label="Sección de gastos">${[['mov','Movimientos'],['pres','Presupuesto'],['fijos','Fijos']].map(([k,l])=>`<button data-gs="${k}" aria-pressed="${gastSeg===k}">${l}</button>`).join('')}</div>`;
  const bindGS=()=>document.querySelectorAll('[data-gs]').forEach(b=>b.onclick=()=>{gastSeg=b.dataset.gs;render()});
  if(gastSeg==='pres'){$('#view').innerHTML=segH+presHTML();bindGS();bindPres();return}
  if(gastSeg==='fijos'){$('#view').innerHTML=segH+fijosHTML();bindGS();bindFijos();return}
  $('#view').innerHTML=segH+'<div style="margin-top:14px"></div>'+flowView('gastos')+promoHTML('gastos');
  $('#heroAdd').onclick=()=>openExpense('gasto');
  bindGS();bindFlow('gastos',render);
}

/* ---------- Ahorros e inversiones ---------- */
/* ---------- Anúnciate aquí (reemplaza los patrocinados de ejemplo) ---------- */
const WA_ADS='https://wa.me/18293443506?text='+encodeURIComponent('Hola, me interesa anunciarme en Caoba.');
let promoHidden={}; try{promoHidden=JSON.parse(localStorage.getItem(KEY+'.promo')||'{}')}catch(e){}
function promoHTML(key){
  if(promoHidden[key])return '';
  return `<section class="adv-inv" aria-label="Espacio para anunciantes"><div class="adv-top"><span class="ptag">Espacio para anunciantes</span><button class="pclose" data-pclose="${key}" aria-label="Ocultar este espacio"><svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg></button></div>
    <h3>Aquí podrías anunciarte</h3><p>¿Tienes un banco, un puesto de bolsa o un negocio? Llega a personas que están organizando su dinero.</p>
    <a class="adv-cta" href="${WA_ADS}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8c-.9-.4-1.6-1.1-2-2l.8-1-1-2z"/></svg>Escríbenos por WhatsApp</a></section>`;
}
function bindPromos(){
  document.querySelectorAll('[data-pclose]').forEach(b=>b.onclick=()=>{promoHidden[b.dataset.pclose]=1;try{localStorage.setItem(KEY+'.promo',JSON.stringify(promoHidden))}catch(e){}render();toast('Espacio oculto en esta sección')});
}

/* ---------- Elegir qué ahorro o inversión agregar ---------- */
const INV_GUIDE=[
  ['Dinero disponible',[['Cuenta de ahorro','Lo usas cuando quieras. Paga poco interés.'],['Cuenta corriente','Para pagos y cheques. Casi nunca paga interés.'],['Efectivo','Lo que tienes en la mano o en la casa.']]],
  ['A plazo fijo',[['Certificado','Dejas el dinero en un banco por un plazo y te paga una tasa fija. Ej. 6 meses al 9 %.'],['Bono','Le prestas al Gobierno o a una empresa. Te paga cupones, casi siempre cada 6 meses.'],['Sell Buy Back (SBB)','Un puesto de bolsa te vende un título y te lo recompra en una fecha acordada.'],['Mutuo','Le prestas a un puesto de bolsa por poco tiempo, a una tasa acordada.']]],
  ['Rendimiento variable',[['Fondo de inversión','Tu dinero se junta con el de otros y lo maneja una administradora. La tasa cambia cada día.'],['Acciones','Compras una parte de una empresa. Su precio sube y baja.']]]
];
const INV_IC={'Cuenta de ahorro':'<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h3"/>','Cuenta corriente':'<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M7 14h6M7 11h10"/>','Efectivo':'<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/>',
  'Certificado':'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/>','Bono':'<path d="M4 7h16v10H4z"/><circle cx="12" cy="12" r="2.5"/><path d="M7 7v10M17 7v10"/>','Sell Buy Back (SBB)':'<path d="M7 7h13l-3-3M17 17H4l3 3"/>','Mutuo':'<path d="M7 11l4-4 3 3 5-5"/><path d="M4 20h16"/><path d="M4 16h4M10 16h4"/>',
  'Fondo de inversión':'<circle cx="8" cy="9" r="4"/><circle cx="16" cy="9" r="4"/><circle cx="12" cy="15.5" r="4"/>','Acciones':'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>','Otro':'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'};
function openInvChooser(){
  const row=([t,d])=>`<button type="button" class="menu-r" data-it="${esc(t)}"><span class="menu-ic" style="--mc:var(--grow)"><svg viewBox="0 0 24 24">${INV_IC[t]||INV_IC.Otro}</svg></span><span><b>${t==='Certificado'?'Certificado financiero':t}</b><small>${d}</small></span>${chev}</button>`;
  sheet(`<h3>¿Qué quieres agregar?</h3><p class="lead-s">Elige el que se parezca más. Puedes cambiarlo después.</p>
    ${INV_GUIDE.map(([g,L])=>`<h4 class="menu-g">${g}</h4><div class="menu">${L.map(row).join('')}</div>`).join('')}
    <div class="menu" style="margin-top:12px">${row(['Otro','Algo distinto: escribe qué es y lo agregamos a tus opciones.'])}</div>`,'var(--grow)');
  document.querySelectorAll('[data-it]').forEach(b=>b.onclick=()=>openSaving({type:b.dataset.it}));
}

/* ---------- Ahorros e inversiones ---------- */
let openEnt={};
function vAhorros(){
  const t=Date.now(),T=totals(t);
  const val=s=>conv(savValue(s,t),s.cur,S.base);
  const types=agg(S.savings,s=>s.type,k=>TYPE_PL[k]||k,k=>TYPE_C[k]||'var(--c-gray)',val);
  const byE={};S.savings.forEach(s=>{(byE[s.entity]=byE[s.entity]||[]).push(s)});
  const ents=Object.entries(byE).map(([e,L])=>({e,L,v:L.reduce((a,s)=>a+val(s),0)})).sort((a,b)=>b.v-a.v);
  const tot=T.v||1;
  $('#view').innerHTML=`
    <button type="button" class="mkt-link" id="goMkt"><span class="mkt-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg></span><span><b>Descubre y compara oportunidades de inversión</b><small>Tasas de bancos, puestos de bolsa y tasas de cambio</small></span>${chev}</button>
    <section class="deep inv-card">
      <div class="hero-top"><span class="lbl">Ahorros e inversiones · ${S.base}</span><span class="hero-r"><span class="hero-pulse"><i></i>En vivo</span>${heroAdd('Agregar un ahorro o una inversión')}</span></div>
      <div class="big num" id="liveTotal">${split(T.v,S.base,4)}</div>
      <div class="pace num"><div><small>Ganancia</small><strong id="liveGain">${esc(fmt(T.v-T.p,S.base,0))}</strong></div><div><small>Por día</small><strong>+${esc(fmt(T.ps*86400,S.base))}</strong></div><div><small>Por mes</small><strong>+${esc(fmt(T.ps*86400*30.44,S.base,0))}</strong></div></div>
    </section>
    ${S.savings.length?`
    <section class="panel"><div class="panel-h"><b>Por tipo de instrumento</b><span class="panel-s">${S.savings.length} en total</span></div>${donutBlock(types,'Ahorros por tipo de instrumento')}</section>
    <h2 class="sec">Desglose por entidad<span class="sec-note">Toca para ver tus productos</span></h2>
    <div class="ents">${ents.map(g=>{const [,sec]=instInfo(g.e);return `<details class="eg2" data-ent="${esc(g.e)}" ${openEnt[g.e]?'open':''}><summary>${inst(g.e)}
      <span class="eg2-t"><b>${esc(g.e)}</b><small>${SECTOR[sec]} · ${g.L.length} ${g.L.length===1?'producto':'productos'}</small></span>
      <span class="eg2-v num"><b>${esc(fmt(g.v,S.base,0))}</b><small>${Math.round(g.v/tot*100)} % del total</small></span><span class="chev rot" aria-hidden="true">›</span></summary>
      <div class="eg2-in">${g.L.map(s=>{const d=nextMat(s,t),dl=d?Math.ceil((d-t)/DAY):null;return `<button class="eg-r rowbtn" data-edit-s="${s.id}"><div class="mid"><b>${esc(s.name)}</b><span class="eg-meta"><span class="ty" style="--tc:${TYPE_C[s.type]||'var(--c-gray)'}">${esc(s.type==='Sell Buy Back (SBB)'?'SBB':s.type)}</span>${s.rate?`<span class="num">${rateTxt(s)}</span>`:''}<span class="${dl!==null&&dl<=15?'soonc':''}">${esc(matText(s))}${dl!==null&&dl<=30?` · ${dl} d`:''}</span></span></div>
        <div class="eg-a num"><span data-sv="${s.id}">${esc(fmt(savValue(s,t),s.cur,2))}</span>${s.rate?`<small data-si="${s.id}">+${esc(fmt(savValue(s,t)-s.principal,s.cur,2))}</small>`:''}</div>${chev}</button>`}).join('')}</div></details>`}).join('')}</div>
    ${calBtnHTML(e=>e.g==='inv').replace('Calendario de pagos','Vencimientos y cupones').replace('Agrega gastos fijos, cobros y recordatorios','Cuándo cobras intereses y cuándo vence cada inversión')}
    ${nextPaysHTML(e=>e.g==='inv','inv').replace('Próximos pagos','Próximos cobros')}
    ${promoHTML('ahorros')}`
    :`<div class="empty" style="margin-top:14px">Aún no registras ahorros ni inversiones.<button class="btn" id="emptyS" style="--accent:var(--grow)">Agregar</button></div>`}`;
  $('#heroAdd').onclick=openInvChooser;const e=$('#emptyS');if(e)e.onclick=openInvChooser;$('#goMkt').onclick=()=>goTo('mercado');
  const co=$('#calOpen');if(co)co.onclick=()=>openCalendar(null,null,null,'inv');
  document.querySelectorAll('details.eg2').forEach(d=>d.ontoggle=()=>{openEnt[d.dataset.ent]=d.open});
  bindInv();bindEdit();bindNextPays();
}


function cardsHTML(){
  if(!S.cards.length)return empty('No tienes tarjetas registradas.','emptyC','var(--brand)');
  return S.cards.map((c,i)=>{
    const u=c.limit?c.balance/c.limit:0, due=dueDate(c), dd=daysTo(due), mp=minPay(c);
    const intr=Math.max(0,c.balance-mp)*c.rate/1200, art=CARD_ART[i%CARD_ART.length];
    return `<article class="ccwrap">
      <div class="ccard" style="--c1:${art[0]};--c2:${art[1]}">
        <div class="cc-top">${inst(c.entity,1)}<div class="cc-id"><b>${esc(c.name)}</b><span>${esc(c.entity)}</span></div><button type="button" class="cc-more" data-cc-more="${c.id}" aria-label="Opciones de ${esc(c.name)}"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button></div>
        <div class="cc-bal"><small>Saldo</small><strong class="num">${esc(fmt(c.balance,c.cur,2))}</strong></div>
        <div class="cc-bar"><i style="width:${Math.min(100,u*100).toFixed(1)}%;background:${utilColor(u)}"></i></div>
        <div class="cc-row num"><span>Disponible ${esc(fmt(Math.max(0,c.limit-c.balance),c.cur,0))}</span><span>${Math.round(u*100)} % de ${esc(fmt(c.limit,c.cur,0))}</span></div>
      </div>
      <div class="cc-info num">
        <div><small>Pago mínimo</small><strong>${esc(fmt(mp,c.cur,0))}</strong></div>
        <div><small>Fecha límite</small><strong>${dateFmt.format(due)} <span class="due${dd<=5?' soon':''}">${dd} d</span></strong></div>
        <div><small>Tasa anual</small><strong>${c.rate.toFixed(0)} %</strong></div>
      </div>
      ${c.balance>0?`<p class="cc-tip">Si pagas solo el mínimo, pagarías unos <b class="num">${esc(fmt(intr,c.cur,0))}</b> de intereses el próximo mes.</p>`:''}
      <div class="cc-actions">${c.balance>0?`<button class="btn ghost" data-cc-pay="${c.id}">Registrar pago</button>`:`<span class="cc-zero">Sin saldo por pagar</span>`}<button class="btn ghost" data-cc-buy="${c.id}">Registrar consumo</button></div>
    </article>`}).join('');
}
function bindCards(){
  const e=$('#emptyC');if(e)e.onclick=openCard;
  document.querySelectorAll('[data-cc-pay]').forEach(b=>b.onclick=()=>openCardMove(b.dataset.ccPay,'pago'));
  document.querySelectorAll('[data-cc-buy]').forEach(b=>b.onclick=()=>openExpense('gasto',{via:'c:'+b.dataset.ccBuy}));
  document.querySelectorAll('[data-cc-more]').forEach(b=>b.onclick=()=>openCardActions(b.dataset.ccMore));
}

function openCardMove(id){
  const c=S.cards.find(x=>x.id===id); if(!c)return;
  const A=accts();
  sheet(`<h3>Pago · ${esc(c.name)}</h3><form class="form" id="f">
  <div class="two"><div class="field"><label for="mAmt">Monto (${c.cur})</label><input id="mAmt" data-money="${c.cur}" inputmode="decimal" placeholder="0.00"></div>
  <div class="field"><label>Consumido</label><input value="${esc(fmt(c.balance,c.cur))}" disabled></div></div>
  <div class="chips" style="margin:0"><button type="button" data-fill="${minPay(c).toFixed(2)}">Mínimo</button><button type="button" data-fill="${c.balance.toFixed(2)}">Total</button></div>
  <div class="field"><label for="mFrom">Pagar desde</label><select id="mFrom">${A.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}<option value="">Otra cuenta o efectivo</option></select><small class="hint">Se descuenta de esa cuenta. Un pago a la tarjeta no es un gasto nuevo: el gasto ya se contó al consumir.</small></div>
  <div class="err" id="err"></div><button class="btn" type="submit">Guardar</button></form>`,'var(--brand)');
  document.querySelectorAll('[data-fill]').forEach(b=>b.onclick=()=>{$('#mAmt').value=b.dataset.fill;$('#mAmt').dispatchEvent(new Event('input'))});
  $('#f').onsubmit=ev=>{ev.preventDefault();const amt=money($('#mAmt').value);
    if(!(amt>0))return $('#err').textContent='Escribe el monto en números, por ejemplo 1500.';
    const pay=Math.min(amt,Math.max(0,c.balance));c.balance=Math.max(0,c.balance-amt);
    const s=S.savings.find(x=>x.id===$('#mFrom').value);if(s)s.principal-=conv(pay,c.cur,s.cur);
    save();close();render();toast('Pago registrado')};
}

const AD='Anunciante de ejemplo';
/* ---------- Quitar con un toque y opción de deshacer ---------- */
function bindDel(sel,coll){
  const attr=sel.slice(1,-1);
  document.querySelectorAll(sel).forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    const id=b.getAttribute(attr), item=S[coll].find(x=>x.id===id); if(!item)return;
    if(coll==='pending'||coll==='pendingInv')return removeItem(coll,id);
    confirmDel(item.desc||item.name||'este registro',delDetail(coll,item),()=>removeItem(coll,id));
  });
}

