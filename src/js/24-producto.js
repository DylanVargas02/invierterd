/* ---------- Formulario de cuentas e inversiones por bloques (v3) ----------
   Lo esencial primero, en bloques (qué es, dónde, cuánto, condiciones, fechas); lo avanzado plegado.
   Ningún dato financiero se elimina: se reorganiza. Los ids se mantienen para no romper lo existente. */
const HELP={
  tasa:'Nominal: la tasa anual sin contar que los intereses generan más intereses. Efectiva (TEA): ya incluye esa capitalización. Una nominal de 10 % con intereses cada mes equivale a 10.47 % efectiva.',
  cap:'Cada cuánto suma el banco los intereses a tu saldo. Si no lo sabes, deja «Cada mes», que es lo más común en cuentas de ahorro.',
  isr:'En República Dominicana, los intereses de muchos instrumentos pagan 10 % de ISR, que la entidad retiene. Desmárcalo si tu instrumento está exento.',
  sbb:'Sell Buy Back: un puesto de bolsa te vende un título y se compromete a recomprarlo en una fecha y a un precio acordados.',
  mutuo:'Le prestas dinero a un puesto de bolsa por un plazo corto a una tasa acordada.',
  liq:'Marca si puedes retirar este dinero rápido, sin penalidad, en caso de emergencia. Sirve para calcular tu fondo de emergencia.',
  fechas:'La fecha en que invertiste es la que cuenta para calcular el rendimiento acumulado, aunque hoy la estés registrando en Caoba.'
};
const help=k=>`<button type="button" class="hlp" data-help="${k}" aria-label="Qué significa" aria-expanded="false">?</button>`;
function wireHelp(scope){scope.querySelectorAll('[data-help]').forEach(b=>b.onclick=()=>{let n=b.parentElement.parentElement.querySelector('.hlp-t[data-for="'+b.dataset.help+'"]');
  if(n){n.remove();b.setAttribute('aria-expanded','false');return}n=document.createElement('p');n.className='hlp-t';n.dataset.for=b.dataset.help;n.textContent=HELP[b.dataset.help];b.parentElement.after(n);b.setAttribute('aria-expanded','true')})}
const CAPS=[[365,'Cada día'],[12,'Cada mes'],[4,'Cada 3 meses'],[2,'Cada 6 meses'],[1,'Una vez al año']];
const ACC_TY=[['Cuenta de ahorro','Ahorro'],['Cuenta corriente','Corriente'],['Efectivo','Efectivo']];
const INV_TY=[['Certificado','Certificado'],['Depósito a plazo','Depósito a plazo'],['Bono','Bono'],['Fondo de inversión','Fondo'],['Acciones','Acciones'],['Sell Buy Back (SBB)','SBB'],['Mutuo','Mutuo'],['Otro','Otro']];
if(!SAV_T.includes('Depósito a plazo'))SAV_T.splice(SAV_T.indexOf('Certificado')+1,0,'Depósito a plazo');
TYPE_PL['Depósito a plazo']='Depósitos a plazo';TYPE_C['Depósito a plazo']='var(--c3)';INT_F['Depósito a plazo']=0;

/* Vista previa de la tarjeta (cuentas y tarjetas de crédito) */
function cardPrev(id,o){const [c1,c2]=ACARD[o.color!=null?o.color:0]||ACARD[0];
  return `<div class="cprev" id="${id}" style="--c1:${c1};--c2:${c2}" aria-live="polite"><span class="cp-e">${esc(o.entity||'Entidad')}</span><span class="cp-n">${esc(o.name||'')}</span><span class="cp-f num"><span>${o.last4?'•••• '+esc(o.last4):'••••'}</span><span>${esc(o.cur||'DOP')}</span></span></div>`}
function swatchesHTML(name,sel){return `<div class="swatches" role="radiogroup" aria-label="Color de la tarjeta">${ACARD.map(([a,b],i)=>`<label class="sw"><input type="radio" name="${name}" value="${i}" ${sel===i?'checked':''}><span style="--c1:${a};--c2:${b}" aria-label="Color ${i+1}"></span></label>`).join('')}</div>`}

function openSaving(pre={}){
  const ed=pre.id?S.savings.find(x=>x.id===pre.id):null;
  if(ed&&ed.type==='Bono'&&ed.bond)return openBond({id:ed.id});
  if(ed)pre={color:ed.color,issuer:ed.issuer,code:ed.code,renew:ed.renew,status:ed.status,rateKind:ed.rateKind,ratePub:ed.ratePub,rateUntil:ed.rateUntil,rateFrom:ed.rateFrom,cap:ed.cap,histFrom:ed.histFrom,last4:ed.last4,entity:ed.entity,name:ed.name,type:ed.type,cur:ed.cur,principal:+ed.principal.toFixed(2),rate:ed.rate,months:ed.months,mode:ed.open?'sin':ed.due?'fecha':'meses',dueISO:ed.due?isoLocal(new Date(ed.due)):'',startISO:isoLocal(new Date(ed.start)),isr:ed.isr,liquid:isLiquid(ed),vr:!!ed.vr,intFreq:ed.intFreq};
  const type=SAV_T.includes(pre.type)?pre.type:(ed&&pre.type?(SAV_T.splice(SAV_T.length-1,0,pre.type),pre.type):pre.type?'Otro':'Certificado');
  const acc=ACCT_TYPES.includes(type),mode0=pre.mode||(acc||type==='Fondo de inversión'||type==='Acciones'?'sin':'fecha'),TY=acc?ACC_TY:INV_TY;
  const pays=acc?(pre.rate>0):true;
  sheet(`<h3>${ed?'Editar: '+esc(ed.name):acc?'Nueva cuenta':'Nueva inversión'}</h3>
  ${ed&&ed.type==='Bono'?`<p class="mk-note">Este bono se registró con la versión anterior. <button type="button" class="link-btn" id="sToBond">Completar los datos del bono</button> para ver cupones, calendario y rendimiento al vencimiento.</p>`:''}
  <div class="fprog" id="sProg" aria-live="polite"></div>
  <form class="form fblocks" id="f" novalidate>
  <input type="hidden" id="sType" value="${esc(type)}">
  <section class="fb"><h4>Qué es</h4><div class="tychips" role="radiogroup" aria-label="Tipo">${TY.map(([v,l])=>`<label class="tyc"><input type="radio" name="sTy" value="${esc(v)}" ${v===type||(!TY.some(t=>t[0]===type)&&v==='Otro')?'checked':''}><span>${INV_IC[v]||INV_IC[v==='Depósito a plazo'?'Certificado':'Otro']?`<svg viewBox="0 0 24 24" aria-hidden="true">${INV_IC[v]||INV_IC[v==='Depósito a plazo'?'Certificado':'Otro']}</svg>`:''}${l}</span></label>`).join('')}</div>
    ${otroBox('sOtro','Ej. Plan de retiro, criptomonedas',type==='Otro'&&!acc)}</section>
  <section class="fb"><h4>Dónde está</h4><div class="two"><div class="field"><label for="sEnt">Entidad</label>${entPick('sEnt',pre.entity===AD?'':pre.entity)}</div>
    <div class="field"><label for="sName">Nombre <span class="opt">opcional</span></label><input id="sName" value="${esc(pre.name||'')}" placeholder="${acc?'Ej. Ahorro nómina':'Ej. Certificado de 6 meses'}" maxlength="60"></div></div></section>
  <section class="fb"><h4>Cuánto</h4><div class="two"><div class="field"><label for="sAmt" id="sAmtL">Monto invertido</label><input id="sAmt" data-money="sCur" inputmode="decimal" value="${pre.principal||''}" placeholder="0.00"></div><div class="field"><label for="sCur">Moneda</label>${curSel('sCur',pre.cur||'DOP')}</div></div></section>
  <section class="fb" id="sCondB"><h4>Condiciones</h4>
    <label class="check" id="sPaysF"><input type="checkbox" id="sPays" ${pays?'checked':''}><span>Esta cuenta paga intereses</span></label>
    <div id="sRateBox"><div class="field" id="sRateF"><label for="sRate" id="sRateL">${pre.vr?'Rendimiento anual aproximado %':'Tasa anual que recibes %'} ${help('tasa')}</label><input id="sRate" inputmode="decimal" value="${pre.rate||''}" placeholder="9.50">
      <div class="choice two-c rk" role="radiogroup" aria-label="Tipo de tasa">${pill('sRk','nominal','Nominal',pre.rateKind!=='efectiva')}${pill('sRk','efectiva','Efectiva (TEA)',pre.rateKind==='efectiva')}</div><small class="hint" id="sRkH"></small>
      <label class="check" style="margin-top:6px"><input type="checkbox" id="sVr" ${pre.vr?'checked':''}><span>La tasa es variable (cambia con el mercado)</span></label></div>
    <div class="two" id="sCapF"><div class="field"><label for="sCap">Los intereses se suman ${help('cap')}</label><select id="sCap">${CAPS.map(([v,l])=>`<option value="${v}" ${(pre.cap||12)===v?'selected':''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label for="sRFrom">Tasa vigente desde</label><input type="date" id="sRFrom" value="${pre.rateFrom?isoLocal(new Date(pre.rateFrom)):pre.startISO||today()}"></div></div></div></section>
  <section class="fb" id="sDatesB"><h4>Fechas ${help('fechas')}</h4>
    <fieldset class="field" id="sModeF"><legend>¿Tiene vencimiento?</legend><div class="choice">${pill('sMode','fecha','Sí, una fecha',mode0==='fecha')}${pill('sMode','meses','Sí, en meses',mode0==='meses')}${pill('sMode','sin','No vence',mode0==='sin')}</div></fieldset>
    <div class="two"><div class="field"><label for="sStart" id="sStartL">Fecha en que invertiste</label><input type="date" id="sStart" value="${pre.startISO||today()}"></div>
      <div class="field" id="sDateF"><label for="sDue">Vencimiento</label><input type="date" id="sDue" value="${pre.dueISO!==undefined?pre.dueISO:pre.months?addMonthsISO(pre.months):''}"></div>
      <div class="field" id="sMonF"><label for="sMon">Plazo en meses</label><input id="sMon" inputmode="numeric" value="${pre.months||6}"></div></div>
    <div class="field" id="sIntF"><label for="sInt">¿Cuándo te pagan los intereses?</label><select id="sInt">${[[1,'Cada mes'],[3,'Cada 3 meses'],[6,'Cada 6 meses'],[0,'Al vencimiento, junto al capital']].map(([v,l])=>`<option value="${v}" ${(pre.intFreq!==undefined?pre.intFreq:intF({type}))===v?'selected':''}>${l}</option>`).join('')}</select></div>
    <p class="hint" id="sSinH">Sin vencimiento: el dinero está disponible y los intereses se suman según la entidad.</p></section>
  <section class="fb" id="sCardB"><h4>Tu tarjeta en Caoba</h4>
    <div class="cardpick"><div class="cp-fields"><div class="field" id="s4F"><label for="s4">Últimos 4 dígitos <span class="opt">opcional</span></label><input id="s4" inputmode="numeric" maxlength="4" value="${esc(pre.last4||'')}" placeholder="1234"><small class="hint">Para distinguir cuentas del mismo banco. Nunca el número completo.</small></div>
      <fieldset class="field" id="sColF"><legend>Color</legend>${swatchesHTML('sCol',pre.color!=null?pre.color:0)}</fieldset></div>
      ${cardPrev('sPrev',{entity:pre.entity,name:pre.name,last4:pre.last4,cur:pre.cur,color:pre.color})}</div></section>
  <details class="fb adv-d" id="sAdv"><summary><b>Más detalles</b><span class="hint">Emisor, tasa publicada, impuestos, estado</span></summary>
    <div class="two inv-only" id="sIssF"><div class="field"><label for="sIss">Emisor <span class="opt">opcional</span></label><input id="sIss" value="${esc(pre.issuer||'')}" placeholder="Ej. ENADOM, Hacienda" maxlength="60"></div><div class="field"><label for="sCode">Identificador <span class="opt">opcional</span></label><input id="sCode" value="${esc(pre.code||'')}" placeholder="Ej. código ISIN" maxlength="30" autocomplete="off"></div></div>
    <div class="two"><div class="field"><label for="sPub">Tasa publicada por la entidad % <span class="opt">opcional</span></label><input id="sPub" inputmode="decimal" value="${pre.ratePub||''}" placeholder="Ej. 10.00"></div><div class="field"><label for="sUntil">Tasa vigente hasta <span class="opt">opcional</span></label><input type="date" id="sUntil" value="${pre.rateUntil?isoLocal(new Date(pre.rateUntil)):''}"></div></div>
    <div class="field inv-only" id="sHistF"><label for="sHist">Tengo datos de esta inversión desde <span class="opt">opcional</span></label><input type="date" id="sHist" value="${pre.histFrom?isoLocal(new Date(pre.histFrom)):''}"><small class="hint">Si la compraste hace años pero solo conoces su valor desde una fecha, ponla aquí.</small></div>
    <label class="check inv-only" id="sRenF"><input type="checkbox" id="sRen" ${pre.renew===false?'':'checked'}><span>Se renueva automáticamente al vencer</span></label>
    <div class="field inv-only" id="sStF"><label for="sSt">Estado</label><select id="sSt">${[['','Según la fecha (vigente, renovada o vencida)'],['renovada','Renovada'],['liquidada','Liquidada: ya la cobré']].map(([v,l])=>`<option value="${v}" ${(pre.status||'')===v?'selected':''}>${l}</option>`).join('')}</select><small class="hint">Una inversión liquidada deja de sumar en tu patrimonio; el dinero cuenta donde lo depositaste.</small></div>
    <label class="check" id="sIsrF"><input type="checkbox" id="sIsr" ${pre.isr===false?'':'checked'}><span>Retener ISR 10 % sobre intereses ${help('isr')}</span></label>
    <label class="check" id="sLiqF"><input type="checkbox" id="sLiq"><span>Lo puedo usar en una emergencia ${help('liq')}</span></label>
  </details>
  <div class="err" id="err" role="alert"></div><button class="btn" type="submit">${ed?'Guardar cambios':'Guardar'}</button>
  ${ed?`<button type="button" class="link-btn danger del-link" id="sDel">Eliminar ${esc(ed.name)}</button>`:''}</form>`,'var(--brand)');
  wireHelp($('#layer'));
  if(ed)$('#sDel').onclick=()=>confirmDel(ed.name,delDetail('savings',ed),()=>removeItem('savings',ed.id));
  const tb=$('#sToBond');if(tb)tb.onclick=()=>openBond({id:ed.id,fromLegacy:true});
  const mode=()=>(document.querySelector('[name=sMode]:checked')||{}).value||'fecha';
  const rkH=()=>{const r=rate($('#sRate').value||'0'),ef=(document.querySelector('[name=sRk]:checked')||{}).value==='efectiva',m=+$('#sCap').value||12;$('#sRkH').textContent=r>0?(ef?'Efectiva: ya incluye la capitalización durante el año.':'Equivale a '+((Math.pow(1+r/100/m,m)-1)*100).toFixed(2)+' % efectiva con intereses '+(CAPS.find(c=>c[0]===m)||[0,'cada mes'])[1].toLowerCase()+'.'):''};
  $('#sRate').addEventListener('input',rkH);$('#sCap').onchange=rkH;document.querySelectorAll('[name=sRk]').forEach(r=>r.onchange=rkH);
  const prog=()=>{const ty=$('#sType').value,a=ACCT_TYPES.includes(ty),cash=ty==='Efectivo',need=[['Entidad',cash||!!readEnt('sEnt')],['Monto',money($('#sAmt').value)>0]];
    if(!cash&&(!a||$('#sPays').checked))need.push(['Tasa',rate($('#sRate').value||'0')>0||$('#sVr').checked]);
    if(!a&&mode()!=='sin')need.push(['Vencimiento',mode()==='meses'?+$('#sMon').value>0:!!$('#sDue').value]);
    const done=need.filter(n=>n[1]).length;$('#sProg').innerHTML=`<span class="fp-bar"><i style="width:${Math.round(done/need.length*100)}%"></i></span><span>${done===need.length?'Datos esenciales completos':'Falta: '+need.filter(n=>!n[1]).map(n=>n[0].toLowerCase()).join(', ')}</span>`};
  const prev=()=>{const p=$('#sPrev');if(!p)return;const i=+((document.querySelector('[name=sCol]:checked')||{}).value||0),[c1,c2]=ACARD[i];p.style.setProperty('--c1',c1);p.style.setProperty('--c2',c2);
    p.querySelector('.cp-e').textContent=readEnt('sEnt')||'Entidad';p.querySelector('.cp-n').textContent=$('#sName').value.trim()||($('#sType').value==='Cuenta corriente'?'Cuenta corriente':'Cuenta de ahorro');
    const l4=$('#s4').value.replace(/\D/g,'').slice(0,4);p.querySelector('.cp-f span').textContent=l4?'•••• '+l4:'••••';p.querySelector('.cp-f span:last-child').textContent=$('#sCur').value};
  const sync=()=>{const ty=$('#sType').value,a=ACCT_TYPES.includes(ty),cash=ty==='Efectivo',m=mode();
    $('#sCardB').hidden=!a||cash;document.querySelectorAll('.inv-only').forEach(e=>e.hidden=a);$('#sPaysF').hidden=!a||cash;
    const showRate=!cash&&(!a||$('#sPays').checked);$('#sRateBox').hidden=!showRate;$('#sCondB').hidden=cash;$('#sCapF').hidden=!a;
    $('#sModeF').hidden=a;if(a&&m!=='sin')setMode('sin');const m2=mode();
    $('#sDateF').hidden=m2!=='fecha';$('#sIntF').hidden=a||m2==='sin';$('#sMonF').hidden=m2!=='meses';$('#sSinH').hidden=m2!=='sin'||a;$('#sIsrF').hidden=cash;$('#sRenF').hidden=a||m2==='sin';
    $('#sAmtL').textContent=a?'Saldo actual':'Monto invertido';$('#sStartL').textContent=a?'Desde cuándo tienes la cuenta':'Fecha en que invertiste';prog();prev()};
  const setMode=v=>{const r=document.querySelector(`[name=sMode][value="${v}"]`);if(r)r.checked=true};
  $('#sLiq').checked=pre.liquid!==undefined?pre.liquid:acc||type==='Fondo de inversión';
  $('#sVr').onchange=()=>{$('#sRateL').firstChild.nodeValue=$('#sVr').checked?'Rendimiento anual aproximado % ':'Tasa anual que recibes % ';prog()};
  const onType=()=>{const ty=$('#sType').value;if(ty==='Bono'&&!ed){openBond({entity:readEnt('sEnt'),cur:$('#sCur').value,principal:money($('#sAmt').value)||''});return}
    const o=$('#sOtro');if(o)o.hidden=ty!=='Otro';if(!ed){const f0=intF({type:ty});if(f0!==null)$('#sInt').value=String(f0);$('#sVr').checked=['Fondo de inversión','Acciones'].includes(ty);$('#sVr').onchange()}
    if(ACCT_TYPES.includes(ty))setMode('sin');else if(mode()==='sin'&&ty!=='Fondo de inversión'&&ty!=='Acciones')setMode('fecha');$('#sLiq').checked=ACCT_TYPES.includes(ty)||ty==='Fondo de inversión';sync()};
  $('#sType').onchange=onType;document.querySelectorAll('[name=sTy]').forEach(r=>r.onchange=()=>{$('#sType').value=r.value;onType()});
  document.querySelectorAll('[name=sMode]').forEach(r=>r.onchange=sync);$('#sPays').onchange=sync;
  $('#f').addEventListener('input',()=>{prog();prev()});$('#f').addEventListener('change',()=>{prog();prev()});
  document.querySelectorAll('[name=sCol]').forEach(r=>r.onchange=prev);
  sync();rkH();
  if(!ed&&!pre.principal)setTimeout(()=>{const e=$('#sEnt');if(e&&document.activeElement&&document.activeElement.name==='sTy')e.focus()},0);
  $('#f').onsubmit=e=>{e.preventDefault();let ty=$('#sType').value;if(ty==='Otro'){const o=otroVal('sOtro');if(o.n)ty=o.keep?addCustomList('customTypes',o.n):o.n}
    const a0=ACCT_TYPES.includes(ty),cash=ty==='Efectivo',pays=!cash&&(!a0||$('#sPays').checked),P=money($('#sAmt').value),r=pays?rate($('#sRate').value||'0'):0,m=a0?'sin':mode(),start=parseDate($('#sStart').value||today()),ent=readEnt('sEnt');
    const err=t=>{$('#err').textContent=t;return false};
    if(!(P>0)){$('#sAmt').focus();return err(a0?'Escribe el saldo en números, por ejemplo 1500.':'Escribe el monto en números, por ejemplo 1500.')}
    if(!(r>=0&&r<100))return err('La tasa debe estar entre 0 y 100 %.');
    const l4=$('#s4').value.replace(/\D/g,'').slice(0,4);if(l4&&l4.length!==4&&!$('#sCardB').hidden)return err('Escribe los 4 últimos dígitos completos o deja el campo vacío.');
    const x={id:uid(),entity:ent||'Sin entidad',type:ty,cur:$('#sCur').value,principal:P,rate:r,start,isr:!cash&&$('#sIsr').checked,liquid:$('#sLiq').checked,last4:a0&&!cash&&l4?l4:undefined,vr:pays&&$('#sVr').checked||undefined,intFreq:$('#sIntF').hidden?undefined:+$('#sInt').value};
    if(a0&&!cash)x.color=+((document.querySelector('[name=sCol]:checked')||{}).value||0);
    x.rateKind=pays&&(document.querySelector('[name=sRk]:checked')||{}).value==='efectiva'?'efectiva':undefined;
    if(a0&&pays){x.cap=+$('#sCap').value||12;x.rateFrom=$('#sRFrom').value?parseDate($('#sRFrom').value):start}
    const pub=$('#sPub').value.trim();if(pub){const pr=rate(pub);if(!(pr>=0&&pr<100))return err('La tasa publicada debe estar entre 0 y 100 %.');x.ratePub=pr}
    if($('#sUntil').value)x.rateUntil=parseDate($('#sUntil').value);
    if(!a0){const iss=$('#sIss').value.trim(),cd=$('#sCode').value.trim();if(iss)x.issuer=iss;if(cd)x.code=cd;if(m!=='sin'&&!$('#sRen').checked)x.renew=false;if($('#sSt').value)x.status=$('#sSt').value;
      if($('#sHist').value){const h=parseDate($('#sHist').value);if(h<start-DAY/2)return err('La fecha de tus datos no puede ser anterior a la fecha en que invertiste.');x.histFrom=h}}
    if(m==='fecha'){const dv=$('#sDue').value;if(!dv)return err('Elige la fecha de vencimiento o marca «No vence».');const due=parseDate(dv);if(!(due>start+DAY/2))return err('La fecha de vencimiento debe ser posterior a la fecha en que invertiste.');x.due=due;x.months=Math.max(1,Math.round((due-start)/MONTH))}
    else if(m==='meses'){const mo=parseInt($('#sMon').value,10);if(!(mo>0))return err('El plazo debe ser de al menos 1 mes.');x.months=mo}
    else{x.open=true;x.months=1}
    if(start>Date.now()+DAY)return err('La fecha en que invertiste no puede estar en el futuro.');
    x.name=$('#sName').value.trim()||(ty==='Efectivo'?'Efectivo':(ty==='Sell Buy Back (SBB)'?'SBB':ty)+(ent?' · '+ent:''));
    if(ed){
      /* Cambio de tasa en una cuenta: se guarda la anterior en el historial */
      if(a0&&(ed.rate!==x.rate||(ed.rateKind||'')!==(x.rateKind||''))&&ed.rate>0){x.rateHist=(ed.rateHist||[]).concat({rate:ed.rate,kind:ed.rateKind||'nominal',cap:ed.cap||12,from:ed.rateFrom||ed.start,to:x.rateFrom||Date.now()})}
      else if(ed.rateHist)x.rateHist=ed.rateHist;
      x.id=ed.id;x.createdAt=ed.createdAt;x.credits=ed.credits;x.accrFrom=ed.accrFrom;
      ['due','open','vr','intFreq','rateKind','ratePub','rateUntil','rateFrom','cap','issuer','code','renew','status','color','histFrom'].forEach(k=>delete ed[k]);Object.keys(x).forEach(k=>x[k]===undefined&&delete x[k]);Object.assign(ed,x);save();close();render();toast('Cambios guardados');return}
    x.createdAt=Date.now();Object.keys(x).forEach(k=>x[k]===undefined&&delete x[k]);
    S.savings.push(x);track(isAcct(x)?'cuenta_agregada':'inversion_agregada');save();close();if(view!=='resumen')setView(isAcct(x)?'cuentas':'inversion',isAcct(x)?'cuentas':undefined);render();window.scrollTo({top:0});toast('Guardado')};
}

