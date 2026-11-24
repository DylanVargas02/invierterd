/* ---------- Navegación de 5 pestañas: Resumen · Movimientos · Cuentas · Inversión · Mercado ---------- */

/* Movimientos: gastos e ingresos en una sola pestaña */
function vMovimientos(){
  (movSeg==='ingresos'?vIngresos:vGastos)();
  $('#view').insertAdjacentHTML('afterbegin',`<div class="seg seg-top" role="group" aria-label="Tipo de movimiento">
    <button type="button" data-ms="gastos" aria-pressed="${movSeg==='gastos'}">Gastos</button><button type="button" data-ms="ingresos" aria-pressed="${movSeg==='ingresos'}">Ingresos</button></div>`);
  document.querySelectorAll('[data-ms]').forEach(b=>b.onclick=()=>{if(movSeg===b.dataset.ms)return;movSeg=b.dataset.ms;render()});
}

/* Colores para las tarjetas de cuenta: los elige la persona; no imitamos la marca de ninguna entidad */
const ACARD=[['#123B5C','#1D5A8A'],['#0E2C44','#24506F'],['#17633B','#2BA35E'],['#0F5248','#1C7D6C'],['#2F3A78','#4A58A8'],['#5C2A55','#8A4A80'],['#7A2630','#A8434C'],['#3A4650','#5E6E7A']];
const aColor=s=>{if(s.color!=null&&ACARD[s.color])return ACARD[s.color];let h=0;for(const ch of String(s.entity||s.name||''))h=(h*31+ch.charCodeAt(0))>>>0;return ACARD[h%ACARD.length]};
function acardHTML(s,t){
  const [c1,c2]=aColor(s),v=savValue(s,t),cash=s.type==='Efectivo';
  return `<button type="button" class="acard" data-edit-s="${s.id}" style="--c1:${c1};--c2:${c2}">
    <span class="ac-top">${cash?'<span class="ac-cash" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/></svg></span>':inst(s.entity,1)}<span class="ac-id"><b>${esc(cash?s.name:s.entity)}</b><small>${esc(s.type)}${s.rate?' · '+rateTxt(s):''}</small></span></span>
    <span class="ac-bal"><small>Saldo</small><strong class="num">${esc(fmt(v,s.cur,2))}</strong></span>
    <span class="ac-foot num"><span>${cash?'':s.last4?'•••• '+esc(s.last4):'<i>Sin últimos 4 dígitos</i>'}</span><span>${esc(s.name!==s.entity&&!cash?s.name:'')}</span></span>
  </button>`;
}

/* Cuentas: registradas por ti (ahorro, corriente, efectivo), crédito (tarjetas y préstamos) y conectadas */
function vCuentas(){
  const segH=`<div class="seg seg-top" role="group" aria-label="Tipo de cuenta">${[['cuentas','Cuentas'],['credito','Crédito'],['conectadas','Conectadas']].map(([k,l])=>`<button type="button" data-cu="${k}" aria-pressed="${cuSeg===k}">${l}</button>`).join('')}</div>`;
  const bindSeg=()=>document.querySelectorAll('[data-cu]').forEach(b=>b.onclick=()=>{if(cuSeg===b.dataset.cu)return;cuSeg=b.dataset.cu;render()});
  if(cuSeg==='credito'){vPrestamos();$('#view').insertAdjacentHTML('afterbegin',segH);bindSeg();return}
  if(cuSeg==='conectadas'){
    $('#view').innerHTML=segH+`<section class="conn-empty">
      <span class="conn-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 15l6-6"/><path d="M11 6l1.5-1.5a4.2 4.2 0 0 1 6 6L17 12"/><path d="M13 18l-1.5 1.5a4.2 4.2 0 0 1-6-6L7 12"/></svg></span>
      <h2>Ninguna entidad ofrece conexión todavía</h2>
      <p>En República Dominicana los bancos aún no ofrecen a las personas una forma autorizada de compartir sus movimientos con otras aplicaciones. Por eso Caoba no se conecta a tu banco y no te pide tus claves bancarias.</p>
      <p>Mientras tanto, tus cuentas se registran a mano en <b>Cuentas</b> y <b>Crédito</b>. Cuando una entidad habilite una conexión segura, aparecerá aquí.</p>
      <button type="button" class="btn ghost" id="connBack">Ver mis cuentas registradas</button></section>`;
    bindSeg();$('#connBack').onclick=()=>{cuSeg='cuentas';render()};return;
  }
  const t=Date.now(),A=accts(),F=snapshot(t);
  const tot=A.reduce((a,s)=>a+conv(savValue(s,t),s.cur,S.base),0);
  const groups=[['Cuenta de ahorro','Cuentas de ahorro'],['Cuenta corriente','Cuentas corrientes'],['Efectivo','Efectivo']].map(([k,n])=>[n,A.filter(s=>s.type===k)]).filter(([,L])=>L.length);
  $('#view').innerHTML=segH+`<section class="deep acc-card">
      <div class="hero-top"><span class="lbl">Dinero en cuentas · ${S.base}</span>${heroAdd('Agregar una cuenta')}</div>
      <div class="big num">${esc(fmt(tot,S.base,0))}</div>
      <div class="pace num"><div><small>Cuentas</small><strong>${A.length}</strong></div><div><small>Debes en tarjetas</small><strong>${esc(fmtFit(F.cards,S.base))}</strong></div><div><small>Debes en préstamos</small><strong>${esc(fmtFit(F.loans,S.base))}</strong></div></div></section>
    ${groups.length?groups.map(([n,L])=>`<h2 class="sec">${n}<span class="sec-note">${L.length}</span></h2><div class="acards">${L.map(s=>acardHTML(s,t)).join('')}</div>`).join('')
      :`<div class="empty" style="margin-top:14px">Aún no registras cuentas. Agrega tu cuenta de ahorro, tu cuenta corriente o tu efectivo.<button class="btn" id="emptyA">Agregar cuenta</button></div>`}
    ${groups.length?'<button type="button" class="grp-add" id="addA2" style="--gc:var(--brand)">+ Agregar cuenta</button>':''}
    <p class="acc-note">Las cuentas las registras tú. Caoba no se conecta a tu banco ni guarda números completos de cuenta o de tarjeta: solo los últimos 4 dígitos, si los escribes.</p>`;
  bindSeg();
  const add=()=>openSaving({type:'Cuenta de ahorro'});$('#heroAdd').onclick=add;const e=$('#emptyA');if(e)e.onclick=add;const a2=$('#addA2');if(a2)a2.onclick=add;
  bindEdit();
}

/* «Agregar» del resumen: todo lo que se puede registrar, agrupado por tipo */
function openAddMenu(){
  const it=(id,ic,c,t,s)=>`<button type="button" class="menu-r" id="${id}"><span class="menu-ic" style="--mc:${c}"><svg viewBox="0 0 24 24">${ic}</svg></span><span><b>${t}</b><small>${s}</small></span>${chev}</button>`;
  sheet(`<h3>¿Qué quieres agregar?</h3>
    <h4 class="menu-g">Movimientos</h4><div class="menu">
    ${it('mInc2','<path d="M12 5v14M5 12h14"/>','var(--grow)','Ingreso','Dinero que recibiste')}
    ${it('mExp2','<path d="M5 12h14"/>','var(--spend)','Gasto','Algo que pagaste')}
    ${it('mCash','<path d="M7 7h13l-3-3M17 17H4l3 3"/>','var(--ink-2)','Retiro de efectivo o transferencia','Mueve dinero entre tus cuentas')}
    </div><h4 class="menu-g">Pagos y cobros que se repiten</h4><div class="menu">
    ${it('mPay','<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>','var(--grow)','Ingreso fijo','Salario, pensión, alquiler o remesa que llega cada mes')}
    ${it('mFix','<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4M16 2v4M4 10h16"/>','var(--spend)','Gasto fijo','Algo que pagas cada mes')}
    ${it('mRem',CAL_IC.rem,'var(--brand)','Recordatorio','Una fecha que no quieres olvidar')}
    </div><h4 class="menu-g">Cuentas y crédito</h4><div class="menu">
    ${it('mAcc','<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/>','var(--brand)','Cuenta','Ahorro, corriente o efectivo')}
    ${it('mCard','<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20M6 15h4"/>','var(--debt)','Tarjeta de crédito','Límite, consumo, corte y fecha de pago')}
    ${it('mLoan','<path d="M4 20V10l8-6 8 6v10"/><path d="M9 20v-6h6v6"/>','var(--debt)','Préstamo','Vehículo, vivienda, personal o negocio')}
    </div><h4 class="menu-g">Inversión</h4><div class="menu">
    ${it('mInv','<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>','var(--grow)','Inversión','Certificado, bono, SBB, mutuo, fondo, acciones u otro')}
  </div>`,'var(--brand)');
  $('#mInc2').onclick=()=>openExpense('ingreso');$('#mExp2').onclick=()=>openExpense('gasto');
  $('#mCash').onclick=()=>openTransfer();$('#mPay').onclick=()=>openPayday();$('#mRem').onclick=()=>openReminder();$('#mAcc').onclick=()=>openSaving({type:'Cuenta de ahorro'});$('#mInv').onclick=()=>openInvChooser(true);$('#mCard').onclick=()=>openCard();$('#mLoan').onclick=()=>openLoan();$('#mFix').onclick=()=>openRecurring();
}
