/* ---------- Vistas ---------- */
function render(){
  if(S.theme)document.documentElement.setAttribute('data-theme',S.theme);
  const TB=TABS.find(t=>t.id===view);if(!['DOP','USD'].includes(S.base))S.base='DOP';document.querySelectorAll('[data-base]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.base===S.base)); $('#viewName').textContent=matchMedia('(min-width:1000px)').matches?(TB.t||TB.n):TB.n;$('#viewName').classList.toggle('long',!!TB.t);
  $('#view').className='v-'+view;renderTabs(); renderNotice(); paintAcc();
  $('#brandSmall').innerHTML=S.name&&view==='resumen'?'Hola, '+esc(S.name):'Caoba';
  ({resumen:vResumen,ingresos:vIngresos,gastos:vGastos,ahorros:vAhorros,prestamos:vPrestamos,mercado:vMercado})[view]();
  bindPromos(); tickLive(); fitBig(); fitText();
}
const X=(attr,id)=>`<button class="x" ${attr}="${id}" aria-label="Quitar"><svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg></button>`;
const empty=(txt,id,acc)=>`<div class="empty">${txt}<button class="btn" id="${id}" style="--accent:${acc}">Agregar</button></div>`;


const dayShort=new Intl.DateTimeFormat('es-DO',{weekday:'short',day:'numeric',month:'short'});

let credSeg='tarjetas';
function vPrestamos(){
  if(credSeg==='plan')credSeg='prestamos';
  const F=snapshot(Date.now());
  const loans=S.loans.map(l=>{const st=loanState(l),pp=l.principal?(1-st.left/l.principal)*100:100,total=st.n+st.rem;
    return `<button type="button" class="item loan-c" data-loan="${l.id}">
      <div class="row3">${inst(l.entity)}<div class="mid"><div class="item-title">${esc(l.name)}</div><div class="item-meta">${esc(l.entity)} · ${l.rate.toFixed(2)} %</div></div><div class="item-val num">${esc(fmt(st.left,l.cur,0))}<small class="muted">${st.left?'te falta':'saldado'}</small></div></div>
      <div class="foot"><div class="bar"><i style="width:${pp.toFixed(1)}%;--fill:var(--debt)"></i></div><span class="num">${st.n}/${total||st.n}</span></div>
      <div class="mini num"><span>Cuota <b>${st.left?esc(fmt(st.cuota,l.cur,0)):'—'}</b></span><span>${st.left?(st.late?'<b class="late">Cuota atrasada</b>':'Próxima <b>'+dateFmt.format(st.next)+'</b>'):'<b>Pagado</b>'}</span><span class="loan-go">Pagar o abonar ›</span></div>
    </button>`}).join('');
  $('#view').innerHTML=`<section class="deep debt-card"><div class="hero-top"><span class="lbl">Lo que debes · ${S.base}</span>${heroAdd('Agregar una tarjeta o un préstamo')}</div>
      <div class="big num">${esc(fmt(F.debt,S.base,0))}</div>
      <div class="pace num"><div><small>Préstamos</small><strong>${esc(fmtFit(F.loans,S.base))}</strong></div><div><small>Tarjetas</small><strong>${esc(fmtFit(F.cards,S.base))}</strong></div><div><small>Pagas al mes</small><strong>${esc(fmtFit(F.cuotas+F.mins,S.base))}</strong></div></div></section>
    ${calBtnHTML(e=>e.g==='debt')}
    ${nextPaysHTML(e=>e.g==='debt','debt')}
    <div class="seg" style="margin-top:16px" role="group" aria-label="Tipo de crédito"><button data-cs="tarjetas" aria-pressed="${credSeg==='tarjetas'}">Tarjetas · ${S.cards.length}</button><button data-cs="prestamos" aria-pressed="${credSeg==='prestamos'}">Préstamos · ${S.loans.length}</button></div>
    ${credSeg==='tarjetas'?`<div class="list" style="margin-top:14px">${cardsHTML()}</div>${S.cards.length?'<button type="button" class="grp-add" id="addC2" style="--gc:var(--debt)">+ Agregar tarjeta</button>':''}`
      :`<div class="list" style="margin-top:14px">${loans||empty('No tienes préstamos registrados.','emptyL','var(--debt)')}</div>${S.loans.length?'<button type="button" class="grp-add" id="addL2" style="--gc:var(--debt)">+ Agregar préstamo</button>':''}
      <details class="sim-d"><summary><b>Calcula la cuota de un préstamo</b><span class="chev rot" aria-hidden="true">›</span></summary>${simHTML()}</details>`}
    ${promoHTML('prestamos')}`;
  document.querySelectorAll('[data-cs]').forEach(b=>b.onclick=()=>{credSeg=b.dataset.cs;render()});
  $('#heroAdd').onclick=()=>{sheet(`<h3>¿Qué quieres agregar?</h3><div class="menu"><button type="button" class="menu-r" id="chC"><span class="menu-ic" style="--mc:var(--debt)"><svg viewBox="0 0 24 24">${CAL_IC.card}</svg></span><span><b>Tarjeta de crédito</b><small>Límite, consumo y fecha de pago</small></span>${chev}</button><button type="button" class="menu-r" id="chL"><span class="menu-ic" style="--mc:var(--debt)"><svg viewBox="0 0 24 24">${CAL_IC.loan}</svg></span><span><b>Préstamo</b><small>Vehículo, vivienda, personal o negocio</small></span>${chev}</button></div>`,'var(--debt)');$('#chC').onclick=()=>openCard();$('#chL').onclick=()=>openLoan()};
  $('#calOpen').onclick=()=>openCalendar(null,null,null,'debt');
  const e=$('#emptyL');if(e)e.onclick=()=>openLoan();const a1=$('#addC2');if(a1)a1.onclick=()=>openCard();const a2=$('#addL2');if(a2)a2.onclick=()=>openLoan();
  document.querySelectorAll('[data-loan]').forEach(b=>b.onclick=()=>openLoanActions(b.dataset.loan));
  if(credSeg==='tarjetas')bindCards();else bindSim();
  bindNextPays();
}
/* Calculadora simple de cuota */
let sim={amt:1500000,years:5,rate:12};
function simHTML(){return `<div class="sim">
  <div class="field"><label for="simAmt">Monto <output class="num">${esc(fmt(sim.amt,'DOP',0))}</output></label><input type="range" id="simAmt" min="50000" max="20000000" step="50000" value="${sim.amt}"></div>
  <div class="field"><label for="simYrs">Plazo <output>${sim.years} ${sim.years===1?'año':'años'}</output></label><input type="range" id="simYrs" min="1" max="30" step="1" value="${sim.years}"></div>
  <div class="field"><label for="simRate">Tasa anual <output>${sim.rate.toFixed(2)} %</output></label><input type="range" id="simRate" min="4" max="30" step="0.05" value="${sim.rate}"></div>
  <div id="simOut" class="sim-out">${simOut()}</div><p class="hint">Compara tasas de préstamos en Mercado.</p></div>`}
function simOut(){const n=sim.years*12,c=cuota(sim.amt,sim.rate,n),tot=c*n,intr=tot-sim.amt;
  return `<div class="kv2 num"><div><small>Cuota al mes</small><strong>${esc(fmt(c,'DOP',0))}</strong></div><div><small>Intereses totales</small><strong>${esc(fmt(intr,'DOP',0))}</strong></div><div><small>Pagas en total</small><strong>${esc(fmt(tot,'DOP',0))}</strong></div></div>`}
function bindSim(){const upd=(id,k)=>{const el=$(id);if(!el)return;el.oninput=ev=>{sim[k]=Number(ev.target.value);const o=ev.target.previousElementSibling.querySelector('output');
  o.textContent=k==='amt'?fmt(sim.amt,'DOP',0):k==='years'?`${sim.years} ${sim.years===1?'año':'años'}`:sim.rate.toFixed(2)+' %';$('#simOut').innerHTML=simOut()}};
  upd('#simAmt','amt');upd('#simYrs','years');upd('#simRate','rate')}

