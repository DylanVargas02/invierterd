/* ---------- Guía inicial: «Dedica 5 minutos a contarnos de ti» ---------- */
const FX_IC={
  alquiler:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  mant:'<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
  luz:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  agua:'<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  internet:'<path d="M2 9a15 15 0 0 1 20 0"/><path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/>',
  celular:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  colegio:'<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
  seguro:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M12 9v6M9 12h6"/>',
  gimnasio:'<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
  streaming:'<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M10 9l4 2-4 2z"/><path d="M8 21h8"/>',
  domestica:'<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M19 15l.8 1.7 1.7.8-1.7.8L19 20l-.8-1.7-1.7-.8 1.7-.8z"/>',
  otro:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>'
};
const fxIc=(k,cat)=>`<span class="fx-ic" style="--c:${CATS[cat]?CATS[cat].c:'var(--ink-2)'}" aria-hidden="true"><svg viewBox="0 0 24 24">${FX_IC[k]||FX_IC.otro}</svg></span>`;
const FIXED=[['alquiler','Alquiler','vivienda',1],['mant','Mantenimiento del edificio','vivienda',5],['luz','Luz','servicios',5],['agua','Agua','servicios',10],['internet','Internet y cable','servicios',10],['celular','Celular','servicios',15],['colegio','Colegio o universidad','educacion',5],['seguro','Seguro médico','salud',20],['gimnasio','Gimnasio','salud',1],['streaming','Plataformas de streaming','ocio',10],['domestica','Ayuda doméstica','vivienda',30]];
const OSTEPS=['tu','cuentas','ingresos','inversiones','tarjetas','prestamos','fijos','listo'];
const SAV_TYPES=['Cuenta de ahorro','Cuenta corriente','Certificado','Bono','Sell Buy Back (SBB)','Mutuo','Fondo de inversión','Acciones','Efectivo'];
const INV_TYPES=['Certificado','Bono','Sell Buy Back (SBB)','Mutuo','Fondo de inversión','Acciones','Otro'];
let W=null,oStep=0;
const newDraft=()=>({v:4,mailOn:false,watchX:[],name:'',base:'DOP',inc:{amt:'',cur:'DOP',src:'salario',freq:'mensual',day:'30',days:['15','30'],acc:0},other:[],
  accounts:[{type:'Cuenta de ahorro',entity:'',amt:'',cur:'DOP',last4:''}],has:{inv:null,cards:null,loans:null},savings:[],cards:[],loans:[],fixed:{},customFixed:[]});
const num=v=>{const n=money(v);return isFinite(n)&&n>0?n:0};
const dop=(v,c)=>conv(num(v),c||'DOP','DOP');
const curPick=(id,v)=>`<select id="${id}" aria-label="Moneda">${CURS.map(c=>`<option ${c===v?'selected':''}>${c}</option>`).join('')}</select>`;
const pill=(name,val,label,on)=>`<label class="pill"><input type="radio" name="${name}" value="${val}" ${on?'checked':''}><span>${label}</span></label>`;
/* Moneda como dos botones (RD$ / US$) con un campo oculto que lee el eco del monto */
const curTog=(id,v)=>`<span class="o-cur" role="radiogroup" aria-label="Moneda"><input type="hidden" id="${id}" value="${v}">${['DOP','USD'].map(c=>`<button type="button" role="radio" data-ct="${id}" data-v="${c}" aria-checked="${c===v}">${c==='DOP'?'RD$':'US$'}</button>`).join('')}</span>`;
function wireCurTog(scope){scope.querySelectorAll('[data-ct]').forEach(b=>b.onclick=()=>{const h=document.getElementById(b.dataset.ct);h.value=b.dataset.v;h.dispatchEvent(new Event('change'));scope.querySelectorAll(`[data-ct="${b.dataset.ct}"]`).forEach(x=>x.setAttribute('aria-checked',x===b))})}
const O_IC={lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',skip:'<path d="M5 12h12M13 6l6 6-6 6"/>',edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',back:'<path d="M15 6l-6 6 6 6"/>'};
const oic=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${O_IC[k]}</svg>`;
function openOnboarding(restart){
  if(restart||!W)W=(!restart&&S.onbDraft&&S.onbDraft.W&&S.onbDraft.W.v===4&&S.onbDraft.W)||newDraft();endTour();
  oStep=restart?0:Math.min((S.onbDraft&&S.onbDraft.W&&S.onbDraft.W.v===4&&S.onbDraft.step)||0,OSTEPS.length-1);oPrevP=0;
  document.documentElement.classList.add('onb-open');close();renderOnb();
}
function leaveOnb(){collectOnb();S.onbDraft={step:oStep,W};S.onbDismissed=true;save();$('#onbLayer').innerHTML='';document.documentElement.classList.remove('onb-open');render()}
function monthlyIncome(){return dop(W.inc.amt,W.inc.cur)*(W.inc.src==='salario'&&W.inc.freq==='quincenal'?2:1)+W.other.reduce((a,o)=>a+dop(o.amt,o.cur),0)}
function fixedByCat(){const o={};FIXED.forEach(([k,,c])=>{const f=W.fixed[k];if(f&&f.on&&num(f.amt))o[c]=(o[c]||0)+num(f.amt)});(W.customFixed||[]).forEach(f=>{if(num(f.amt))o[f.cat||'otros']=(o[f.cat||'otros']||0)+num(f.amt)});return o}
function debtMonthly(){
  let d=0;if(W.has.loans)W.loans.forEach(l=>{if(num(l.amt)&&num(l.months))d+=dop(cuota(num(l.amt),rate(l.rate)||0,num(l.months)),l.cur)});
  if(W.has.cards)W.cards.forEach(c=>{const b=num(c.balance);if(b)d+=dop(Math.max(b*.05,c.cur==='DOP'?500:10),c.cur)});return d;
}
function suggestBudget(){
  const inc=monthlyIncome(),fx=fixedByCat(),fixed=Object.values(fx).reduce((a,b)=>a+b,0),debt=debtMonthly();
  let saveAmt=Math.round(inc*.2/500)*500,free=inc-fixed-debt-saveAmt;
  if(free<inc*.15){saveAmt=Math.max(0,saveAmt-(inc*.15-free));free=Math.max(inc*.15,inc-fixed-debt-saveAmt)}
  const wts={comida:.42,transporte:.22,salud:.08,ocio:.12,educacion:.04,otros:.12},b={};
  Object.keys(CATS).forEach(c=>{const v=(fx[c]||0)+(wts[c]?free*wts[c]:0);if(v>0)b[c]=Math.round(v/100)*100});
  return {b,inc,fixed,debt,save:Math.max(0,Math.round(saveAmt))};
}
/* Tarjeta de un elemento (cuenta, inversión, tarjeta o préstamo) */
const oRow=(title,i,key,body)=>`<div class="o-item"><div class="o-item-h"><b>${title}</b>${W[key].length>1||key!=='accounts'?`<button type="button" class="o-rm" data-orm="${key}:${i}">Quitar</button>`:''}</div>${body}</div>`;
const amtField=(id,label,val,cid,cur)=>`<div class="field"><label for="${id}">${label}</label><div class="o-amt"><input id="${id}" data-money="${cid}" inputmode="decimal" value="${esc(val)}" placeholder="0">${curTog(cid,cur)}</div></div>`;
const gate=(q,yes,no)=>`<div class="o-gate"><button type="button" class="o-opt" id="gYes"><span class="o-opt-ic">${oic('check')}</span><span><b>${yes}</b></span></button><button type="button" class="o-opt" id="gNo"><span class="o-opt-ic">${oic('skip')}</span><span><b>${no}</b></span></button></div>`;
const OS={
  tu:()=>({q:'¿Cómo te llamas?',lead:'Para saludarte.',html:`<div class="form">
    <div class="field"><label for="oName" class="sr">Tu nombre</label><input id="oName" class="o-big" value="${esc(W.name)}" maxlength="30" autocomplete="given-name" placeholder="Tu nombre"></div>
    <fieldset class="field"><legend>¿En qué moneda prefieres ver tus totales?</legend><div class="choice two-c">${pill('oBase','DOP','Pesos · RD$',W.base!=='USD')}${pill('oBase','USD','Dólares · US$',W.base==='USD')}</div></fieldset></div>`,
    collect:()=>{W.name=$('#oName').value.trim();W.base=(document.querySelector('[name=oBase]:checked')||{}).value||'DOP'}}),
  ingresos:()=>{const SRC=[['salario','Salario'],['negocio','Negocio'],['independiente','Independiente'],['remesa','Remesas'],['otros','Otro']],I=W.inc,sal=I.src==='salario',q=I.freq==='quincenal';
    const accOpts=W.accounts.map((a,i)=>[i,a.type==='Efectivo'?'Efectivo':(a.entity||a.type)+(a.last4?' •••• '+a.last4:'')+(a.entity?' · '+a.type.replace('Cuenta de ','').replace('Cuenta ',''):'')]).filter((x,i)=>W.accounts[i].type!=='Efectivo');
    return {q:'¿Cuál es tu ingreso principal?',lead:sal?'Así sabremos cuándo te llega y a qué cuenta.':'Si varía de un mes a otro, pon un promedio.',html:`<div class="form">
    <fieldset class="field"><legend class="sr">Tipo de ingreso</legend><div class="o-chips">${SRC.map(([k,l])=>pill('oSrc',k,l,I.src===k)).join('')}</div>${otroBox('oSrcO','Ej. Pensión, propinas, comisiones',I.src==='otros',I.otro&&I.otro.n)}</fieldset>
    ${sal?`<fieldset class="field"><legend>¿Cada cuánto cobras?</legend><div class="choice two-c">${pill('oFreq','mensual','Una vez al mes',!q)}${pill('oFreq','quincenal','Cada quincena',q)}</div></fieldset>
    ${amtField('oSal',q?'¿Cuánto cobras cada quincena?':'¿Cuánto cobras al mes?',I.amt,'oSalCur',I.cur)}
    ${q?`<div class="two"><div class="field"><label for="oDay1">Primer cobro, día</label><input id="oDay1" inputmode="numeric" maxlength="2" value="${esc(I.days[0])}"></div><div class="field"><label for="oDay2">Segundo cobro, día</label><input id="oDay2" inputmode="numeric" maxlength="2" value="${esc(I.days[1])}"></div></div>`
      :`<div class="field"><label for="oDay">¿Qué día del mes cobras?</label><input id="oDay" inputmode="numeric" maxlength="2" value="${esc(I.day)}" placeholder="30"></div>`}
    <div class="field"><label for="oAcc">¿A qué cuenta te llega?</label><select id="oAcc">${accOpts.map(([i,l])=>`<option value="${i}" ${+I.acc===i?'selected':''}>${esc(l)}</option>`).join('')}<option value="-1" ${+I.acc===-1||!accOpts.length?'selected':''}>Lo cobro en efectivo u otra</option></select></div>
    <p class="o-note">${oic('check')}<span>Ese día te preguntaremos <b>«¿Ya cobraste?»</b> y, si dices que sí, lo sumamos a esa cuenta.</span></p>`
    :amtField('oSal','Monto promedio al mes',I.amt,'oSalCur',I.cur)}
    ${W.other.map((o,i)=>`<div class="o-item"><div class="o-item-h"><b>Otro ingreso</b><button type="button" class="o-rm" data-orm="other:${i}">Quitar</button></div>
      <div class="field"><label for="ot_s${i}">¿Qué es?</label><select id="ot_s${i}">${SRC.filter(([k])=>k!=='salario').map(([k,l])=>`<option value="${k}" ${o.src===k?'selected':''}>${l}</option>`).join('')}<option value="renta" ${o.src==='renta'?'selected':''}>Alquileres</option></select></div>
      ${amtField('ot_a'+i,'Monto promedio al mes',o.amt,'ot_c'+i,o.cur)}</div>`).join('')}
    <button type="button" class="o-add" id="oAddInc">+ Tengo otro ingreso</button></div>`,
    wire:()=>{$('#oAddInc').onclick=()=>{collectOnb();W.other.push({src:'independiente',amt:'',cur:'DOP'});renderOnb(true)};
      document.querySelectorAll('[name=oSrc],[name=oFreq]').forEach(r=>r.onchange=()=>{collectOnb();renderOnb(true)})},
    collect:()=>{const src=(document.querySelector('[name=oSrc]:checked')||{}).value||'otros',o={...W.inc,src,amt:$('#oSal').value,cur:$('#oSalCur').value,otro:src==='otros'&&$('#oSrcO_n')?otroVal('oSrcO'):null};
      if($('#oAcc')){o.freq=(document.querySelector('[name=oFreq]:checked')||{}).value||'mensual';o.acc=+$('#oAcc').value;
        if(o.freq==='quincenal'&&$('#oDay1'))o.days=[$('#oDay1').value,$('#oDay2').value];else if($('#oDay'))o.day=$('#oDay').value}
      W.inc=o;W.other=W.other.map((_,i)=>({src:$('#ot_s'+i).value,amt:$('#ot_a'+i).value,cur:$('#ot_c'+i).value}))}}},
  cuentas:()=>({q:'Tus cuentas del día a día',lead:'Cuentas de ahorro, corrientes y efectivo: dinero que puedes usar cuando quieras y que no tiene fecha de vencimiento. Pon el saldo de hoy, aproximado está bien. Las inversiones van más adelante.',html:`<div class="form">
    ${W.accounts.map((a,i)=>oRow(W.accounts.length>1?'Cuenta '+(i+1):'Tu cuenta principal',i,'accounts',`
      <fieldset class="field"><legend class="sr">Tipo</legend><div class="o-chips">${[['Cuenta de ahorro','Ahorro'],['Cuenta corriente','Corriente'],['Efectivo','Efectivo']].map(([v,l])=>pill('ac_t'+i,v,l,a.type===v)).join('')}</div></fieldset>
      <div class="field" ${a.type==='Efectivo'?'hidden':''} id="ac_eF${i}"><label for="ac_e${i}">Banco</label>${entPick('ac_e'+i,a.entity)}</div>
      ${amtField('ac_a'+i,'Saldo de hoy',a.amt,'ac_c'+i,a.cur)}
      <div class="field" ${a.type==='Efectivo'?'hidden':''} id="ac_4F${i}"><label for="ac_4${i}">Últimos 4 dígitos de la tarjeta <span class="opt">opcional</span></label><input id="ac_4${i}" inputmode="numeric" maxlength="4" value="${esc(a.last4||'')}" placeholder="1234"></div>`)).join('')}
    <button type="button" class="o-add" id="oAddAcc">+ Agregar otra cuenta</button></div>`,
    wire:()=>{$('#oAddAcc').onclick=()=>{collectOnb();W.accounts.push({type:'Cuenta de ahorro',entity:'',amt:'',cur:'DOP',last4:''});renderOnb(true)};
      W.accounts.forEach((_,i)=>document.querySelectorAll(`[name=ac_t${i}]`).forEach(r=>r.onchange=()=>{const c=r.value==='Efectivo';$('#ac_eF'+i).hidden=c;$('#ac_4F'+i).hidden=c}))},
    collect:()=>{W.accounts=W.accounts.map((_,i)=>({type:(document.querySelector(`[name=ac_t${i}]:checked`)||{}).value||'Cuenta de ahorro',entity:readEnt('ac_e'+i),amt:$('#ac_a'+i).value,cur:$('#ac_c'+i).value,last4:$('#ac_4'+i).value.replace(/\D/g,'').slice(0,4)}))}}),
  inversiones:()=>W.has.inv===null?{q:'¿Tienes inversiones en el mercado de valores?',lead:'Por ejemplo certificados financieros, bonos, fondos de inversión, SBB o mutuos. Si solo tienes cuentas de ahorro, toca «No».',gate:'inv',html:gate('','Sí, tengo inversiones','No tengo inversiones')}:
    ({q:'Tus inversiones',lead:'Con la tasa y el vencimiento te mostramos cuánto ganas cada día. Si la tasa cambia, como en los fondos, márcala como variable.',html:`<div class="form">
    ${W.savings.map((s,i)=>oRow('Inversión '+(i+1),i,'savings',`
      <div class="field"><label for="sv_t${i}">Tipo</label><select id="sv_t${i}">${INV_TYPES.map(t=>`<option ${t===s.type?'selected':''}>${t}</option>`).join('')}</select>${otroBox('sv_o'+i,'Ej. Plan de retiro, criptomonedas',s.type==='Otro',s.otro&&s.otro.n)}</div>
      <div class="field"><label for="sv_e${i}">Entidad</label>${entPick('sv_e'+i,s.entity)}</div>
      ${amtField('sv_a'+i,'Monto invertido',s.amt,'sv_c'+i,s.cur)}
      <div class="field"><label for="sv_r${i}" id="sv_rL${i}">${s.vr?'Rendimiento anual aproximado %':'Tasa anual %'}</label><input id="sv_r${i}" inputmode="decimal" value="${esc(s.rate)}" placeholder="9.50">
        <label class="o-chk"><input type="checkbox" id="sv_v${i}" ${s.vr?'checked':''}><span>La tasa es variable (cambia con el mercado)</span></label></div>
      <fieldset class="field"><legend>¿Tiene fecha de vencimiento?</legend><div class="choice two-c">${pill('sv_m'+i,'fecha','Sí, vence',!s.noDue)}${pill('sv_m'+i,'sin','No vence',!!s.noDue)}</div>
        <div id="sv_dF${i}" ${s.noDue?'hidden':''} style="margin-top:10px"><label for="sv_d${i}" class="sr">Fecha de vencimiento</label><input type="date" id="sv_d${i}" value="${esc(s.due||'')}"></div></fieldset>`)).join('')}
    <button type="button" class="o-add" id="oAdd" data-k="savings">+ Agregar otra inversión</button></div>`,
    wire:()=>W.savings.forEach((_,i)=>{const vr=$('#sv_v'+i),L=$('#sv_rL'+i),dF=$('#sv_dF'+i);
      vr.onchange=()=>{L.textContent=vr.checked?'Rendimiento anual aproximado %':'Tasa anual %'};
      document.querySelectorAll(`[name=sv_m${i}]`).forEach(r=>r.onchange=()=>{dF.hidden=r.value==='sin'&&r.checked});
      $('#sv_t'+i).onchange=()=>{$('#sv_o'+i).hidden=$('#sv_t'+i).value!=='Otro';const open=['Fondo de inversión','Acciones'].includes($('#sv_t'+i).value);vr.checked=open;vr.onchange();const r=document.querySelector(`[name=sv_m${i}][value=${open?'sin':'fecha'}]`);r.checked=true;dF.hidden=open}}),
    collect:()=>{W.savings=W.savings.map((_,i)=>({type:$('#sv_t'+i).value,otro:$('#sv_t'+i).value==='Otro'?otroVal('sv_o'+i):null,entity:readEnt('sv_e'+i),amt:$('#sv_a'+i).value,cur:$('#sv_c'+i).value,rate:$('#sv_r'+i).value,vr:$('#sv_v'+i).checked,noDue:(document.querySelector(`[name=sv_m${i}]:checked`)||{}).value==='sin',due:$('#sv_d'+i).value}))}}),
  tarjetas:()=>W.has.cards===null?{q:'¿Tienes tarjetas de crédito?',lead:'Te avisamos antes de la fecha de pago.',gate:'cards',html:gate('','Sí, tengo','No tengo')}:
    ({q:'Tus tarjetas de crédito',lead:'Con el límite y lo consumido te decimos cuánto tienes disponible.',html:`<div class="form">
    ${W.cards.map((c,i)=>oRow('Tarjeta '+(i+1),i,'cards',`
      <div class="field"><label for="cd_e${i}">Banco</label>${entPick('cd_e'+i,c.entity)}</div>
      ${amtField('cd_l'+i,'Límite',c.limit,'cd_c'+i,c.cur)}
      <div class="two"><div class="field"><label for="cd_b${i}">Consumido hoy</label><input id="cd_b${i}" data-money="cd_c${i}" inputmode="decimal" value="${esc(c.balance)}" placeholder="0"></div><div class="field"><label for="cd_d${i}">Día de pago</label><input id="cd_d${i}" inputmode="numeric" maxlength="2" value="${esc(c.day)}" placeholder="15"></div></div>
      <div class="field"><label for="cd_4${i}">Últimos 4 dígitos <span class="opt">opcional</span></label><input id="cd_4${i}" inputmode="numeric" maxlength="4" value="${esc(c.last4)}" placeholder="1234"></div>`)).join('')}
    <button type="button" class="o-add" id="oAdd" data-k="cards">+ Agregar otra tarjeta</button></div>`,
    collect:()=>{W.cards=W.cards.map((_,i)=>({entity:readEnt('cd_e'+i),cur:$('#cd_c'+i).value,limit:$('#cd_l'+i).value,balance:$('#cd_b'+i).value,day:$('#cd_d'+i).value,rate:'60',last4:$('#cd_4'+i).value.replace(/\D/g,'').slice(0,4)}))}}),
  prestamos:()=>W.has.loans===null?{q:'¿Tienes préstamos?',lead:'De vehículo, vivienda, personales o de negocio.',gate:'loans',html:gate('','Sí, tengo','No tengo')}:
    ({q:'Tus préstamos',lead:'Con estos datos calculamos tu cuota, lo que te falta por pagar y las fechas de cada pago. Los encuentras en tu contrato o en la app de tu banco.',html:`<div class="form">
    ${W.loans.map((l,i)=>oRow('Préstamo '+(i+1),i,'loans',`
      <fieldset class="field"><legend class="sr">Tipo</legend><div class="o-chips">${LOAN_T.map(t=>pill('ln_t'+i,t,t,t===l.type)).join('')}</div>${otroBox('ln_o'+i,'Ej. Préstamo de la cooperativa',l.type==='Otro',l.otro&&l.otro.n)}</fieldset>
      <div class="field"><label for="ln_e${i}">¿Quién te prestó?</label>${entPick('ln_e'+i,l.entity)}</div>
      ${amtField('ln_a'+i,'¿Cuánto te prestaron al principio?',l.amt,'ln_c'+i,l.cur)}
      <div class="two"><div class="field"><label for="ln_r${i}">Tasa de interés anual %</label><input id="ln_r${i}" inputmode="decimal" value="${esc(l.rate)}" placeholder="12.50"></div><div class="field"><label for="ln_m${i}">Plazo total en meses</label><input id="ln_m${i}" inputmode="numeric" value="${esc(l.months)}" placeholder="60"><small class="fhelp">5 años = 60</small></div></div>
      <div class="field"><label for="ln_p${i}">¿Cuántas cuotas has pagado?</label><input id="ln_p${i}" inputmode="numeric" value="${esc(l.paidN)}" placeholder="0"></div>
      <div class="lp-prev num o-lcalc" id="ln_x${i}" aria-live="polite"></div>`)).join('')}
    <button type="button" class="o-add" id="oAdd" data-k="loans">+ Agregar otro préstamo</button></div>`,
    wire:()=>W.loans.forEach((_,i)=>{const calc=()=>{const P=num($('#ln_a'+i).value),r=rate($('#ln_r'+i).value),n=parseInt($('#ln_m'+i).value,10),k=Math.max(0,parseInt($('#ln_p'+i).value,10)||0),cur=$('#ln_c'+i).value,x=$('#ln_x'+i);
        if(!(P>0&&r>=0&&n>0)){x.innerHTML='<p class="hint">Completa monto, tasa y plazo y te mostramos tu cuota.</p>';return}
        if(k>n){x.innerHTML='<p class="bad">Las cuotas pagadas no pueden ser más que el plazo.</p>';return}
        const c=cuota(P,r,n),st=loanState({principal:P,rate:r,months:n,start:Date.now(),paid0:k,auto:false});
        x.innerHTML=`<div><span>Tu cuota mensual</span><b>${esc(fmt(c,cur,2))}</b></div><div><span>Te faltan</span><b>${n-k} ${n-k===1?'cuota':'cuotas'}</b></div><div class="tot"><span>Debes hoy, aproximado</span><b>${esc(fmt(st.left,cur,0))}</b></div>`};
      ['#ln_a','#ln_r','#ln_m','#ln_p'].forEach(s=>$(s+i).addEventListener('input',calc));$('#ln_c'+i).addEventListener('change',calc);
      document.querySelectorAll(`[name=ln_t${i}]`).forEach(r=>r.onchange=()=>{$('#ln_o'+i).hidden=r.value!=='Otro'});calc()}),
    collect:()=>{W.loans=W.loans.map((_,i)=>{const t=(document.querySelector(`[name=ln_t${i}]:checked`)||{}).value||'Personal',o=otroVal('ln_o'+i);return {type:t,otro:t==='Otro'?o:null,entity:readEnt('ln_e'+i),amt:$('#ln_a'+i).value,cur:$('#ln_c'+i).value,rate:$('#ln_r'+i).value,months:$('#ln_m'+i).value,paidN:$('#ln_p'+i).value}})}}),
  fijos:()=>({q:'¿Qué pagas todos los meses?',lead:'Marca solo lo que aplique. Te avisamos antes de cada fecha.',html:`<div class="o-fx">
    ${FIXED.map(([k,l,,day])=>{const f=W.fixed[k]||{};return `<div class="o-fx-r${f.on?' on':''}" id="fxr_${k}"><label class="o-fx-h"><input type="checkbox" data-fx="${k}" ${f.on?'checked':''}><span class="o-fx-ic" aria-hidden="true"><svg viewBox="0 0 24 24">${FX_IC[k]||FX_IC.otro}</svg></span><span class="o-fx-n">${l}</span><span class="o-tick" aria-hidden="true">${oic('check')}</span></label>
      <div class="two o-fx-in" id="fx_${k}" ${f.on?'':'hidden'}><div class="field"><label for="fa_${k}">Monto (RD$)</label><input id="fa_${k}" data-money="DOP" inputmode="decimal" value="${esc(f.amt||'')}" placeholder="0"></div><div class="field"><label for="fd_${k}">Día de pago</label><input id="fd_${k}" inputmode="numeric" maxlength="2" value="${esc(f.day||day)}"></div></div></div>`}).join('')}
    ${W.customFixed.map((f,i)=>`<div class="o-item"><div class="o-item-h"><b>Otro pago fijo</b><button type="button" class="o-rm" data-orm="customFixed:${i}">Quitar</button></div>
      <div class="field"><label for="cf_n${i}">¿Qué es?</label><input id="cf_n${i}" value="${esc(f.name)}" maxlength="40" placeholder="Ej. Parqueo, mesada"></div>
      <div class="two"><div class="field"><label for="cf_a${i}">Monto (RD$)</label><input id="cf_a${i}" data-money="DOP" inputmode="decimal" value="${esc(f.amt)}" placeholder="0"></div><div class="field"><label for="cf_d${i}">Día de pago</label><input id="cf_d${i}" inputmode="numeric" maxlength="2" value="${esc(f.day)}" placeholder="15"></div></div></div>`).join('')}
    <button type="button" class="o-add" id="oAddFx">+ Otro pago fijo</button></div>`,
    wire:()=>{document.querySelectorAll('[data-fx]').forEach(c=>c.onchange=()=>{$('#fx_'+c.dataset.fx).hidden=!c.checked;$('#fxr_'+c.dataset.fx).classList.toggle('on',c.checked);if(c.checked)$('#fa_'+c.dataset.fx).focus()});
      $('#oAddFx').onclick=()=>{collectOnb();W.customFixed.push({name:'',amt:'',day:'',cat:'otros'});renderOnb(true);const el=$('#cf_n'+(W.customFixed.length-1));if(el){el.scrollIntoView({block:'center'});el.focus()}}},
    collect:()=>{FIXED.forEach(([k])=>{W.fixed[k]={on:document.querySelector(`[data-fx="${k}"]`).checked,amt:$('#fa_'+k).value,day:$('#fd_'+k).value}});
      W.customFixed=W.customFixed.map((f,i)=>({name:$('#cf_n'+i).value.trim(),amt:$('#cf_a'+i).value,day:$('#cf_d'+i).value,cat:f.cat||'otros'}))}}),
  listo:()=>{const inc=monthlyIncome(),fx=Object.values(fixedByCat()).reduce((a,b)=>a+b,0),debt=debtMonthly();
    const have=W.accounts.reduce((a,s)=>a+dop(s.amt,s.cur),0)+(W.has.inv?W.savings.reduce((a,s)=>a+dop(s.amt,s.cur),0):0);
    const owe=(W.has.cards?W.cards.reduce((a,c)=>a+dop(c.balance,c.cur),0):0)+(W.has.loans?W.loans.reduce((a,l)=>{const P=num(l.amt),n=num(l.months);return a+(P&&n?dop(loanState({principal:P,rate:rate(l.rate)||0,months:n,start:Date.now(),paid0:Math.min(n,num(l.paidN)),auto:false}).left,l.cur):0)},0):0);
    const B=W.base,f=v=>esc(fmt(conv(v,'DOP',B),B,0));
    return {next:'Ver mi resumen',html:`<div class="o-done"><span class="o-done-ic" aria-hidden="true">${oic('check')}</span><h2>¡Listo${W.name?', '+esc(W.name):''}!</h2><p class="o-lead">Así se ven tus finanzas hoy. Puedes cambiar cualquier dato después.</p></div>
    <div class="o-sum num">
      <div><span>Tienes</span><b>${f(have)}</b></div><div><span>Debes</span><b>${f(owe)}</b></div><div class="tot"><span>Saldo neto</span><b>${f(have-owe)}</b></div>
    </div>
    <div class="o-sum num">
      <div><span>Te entra al mes</span><b>${f(inc)}</b></div><div><span>Pagos fijos y cuotas</span><b>${f(fx+debt)}</b></div><div class="tot"><span>Te queda al mes</span><b>${f(inc-fx-debt)}</b></div>
    </div>`}}
};

let oCur=null,oPrevP=0;
function collectOnb(){if(oCur&&oCur.collect)try{oCur.collect()}catch(e){}}
function renderOnb(keepScroll){
  const k=OSTEPS[oStep],total=OSTEPS.length-1,st=OS[k]();oCur=st;
  const y=keepScroll&&$('.onb')?$('.onb').scrollTop:0,last=k==='listo',p=last?1:(oStep+1)/(total+1);
  const tree=treeSVG(p,keepScroll?p:oPrevP,last?'o-tree big':'o-tree');oPrevP=p;
  $('#onbLayer').innerHTML=`<div class="onb onb2" role="dialog" aria-modal="true" aria-label="Organiza tus finanzas"><div class="onb-in">
    <div class="o-top">${last?'<span></span>':`<button class="o-back" type="button" id="oBack" aria-label="Atrás">${oic('back')}</button>`}<div class="o-grow" role="progressbar" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${Math.min(oStep+1,total)}" aria-label="Paso ${Math.min(oStep+1,total)} de ${total}">${tree}</div>${last?'<span></span>':'<button class="o-link" type="button" id="oLater">Salir</button>'}</div>
    <div class="onb-main${keepScroll?'':' o-enter'}">${st.q?`<p class="o-step num">Paso ${oStep+1} de ${total}</p><h2 tabindex="-1">${st.q}</h2>${st.lead?`<p class="o-lead">${st.lead}</p>`:''}`:''}${st.html}</div>
    <p class="err" id="oErr" role="alert"></p>
    ${st.gate?'':`<div class="o-foot"><button class="btn o-next" type="button" id="oNext">${st.next||'Continuar'}</button>${!last?`<button class="o-link o-skip" type="button" id="oSkip">${st.skipTxt||'Saltar este paso'}</button>`:''}</div>`}
  </div></div>`;
  const L=$('#onbLayer');wireMoney(L);wireEnt(L);wireCurTog(L);if(st.wire)st.wire();
  const go=d=>{oStep=Math.max(0,Math.min(OSTEPS.length-1,oStep+d));S.onbDraft={step:oStep,W};save();renderOnb()};
  const nx=$('#oNext');if(nx)nx.onclick=()=>{collectOnb();if(st.onNext)st.onNext();if(k==='listo')return finishOnb();go(1)};
  const G={inversiones:'inv',tarjetas:'cards',prestamos:'loans'},K={inversiones:'savings',tarjetas:'cards',prestamos:'loans'};
  const bk=$('#oBack');if(bk)bk.onclick=()=>{collectOnb();if(oStep===0){S.onbDraft={step:0,W};save();if(!S.onboarded&&!hasRealData())return openWelcome();return leaveOnb()}
    const prev=OSTEPS[oStep-1];if(prev&&W.has[G[prev]]===false)W.has[G[prev]]=null;
    if(st.gate===undefined&&G[k]&&!(W[K[k]]||[]).some(r=>Object.values(r).some(v=>v&&String(v).length&&!/^(DOP|USD|60|Certificado|Vehículo|Cuenta de ahorro|true|false)$/.test(v)))){W.has[G[k]]=null;renderOnb();return}
    go(-1)};
  const sk=$('#oSkip');if(sk)sk.onclick=()=>{collectOnb();if(st.onSkip)st.onSkip();go(1)};
  if(st.gate){$('#gYes').onclick=()=>{W.has[st.gate]=true;const key={inv:'savings',cards:'cards',loans:'loans'}[st.gate];if(!W[key].length)W[key].push(st.gate==='inv'?{type:'Certificado',entity:'',amt:'',cur:'DOP',rate:'',due:'',vr:false,noDue:false}:st.gate==='cards'?{entity:'',cur:'DOP',limit:'',balance:'',day:'',rate:'60',last4:''}:{type:'Vehículo',entity:'',amt:'',cur:'DOP',rate:'',months:'',paidN:''});renderOnb(true)};
    $('#gNo').onclick=()=>{W.has[st.gate]=false;go(1)}}
  const add=$('#oAdd');if(add)add.onclick=()=>{collectOnb();const kk=add.dataset.k;W[kk].push(kk==='savings'?{type:'Certificado',entity:'',amt:'',cur:'DOP',rate:'',due:'',vr:false,noDue:false}:kk==='cards'?{entity:'',cur:'DOP',limit:'',balance:'',day:'',rate:'60',last4:''}:{type:'Vehículo',entity:'',amt:'',cur:'DOP',rate:'',months:'',paidN:''});renderOnb(true)};
  document.querySelectorAll('[data-orm]').forEach(b=>b.onclick=()=>{collectOnb();const [kk,i]=b.dataset.orm.split(':');W[kk].splice(+i,1);
    const g={savings:'inv',cards:'cards',loans:'loans'}[kk];if(g&&!W[kk].length)W.has[g]=null;renderOnb(true)});
  const lt=$('#oLater');if(lt)lt.onclick=leaveOnb;
  $('.onb').scrollTop=y;
  if(!keepScroll){const h=$('.onb h2');if(h){h.tabIndex=-1;h.focus({preventScroll:true})}}
}
function finishOnb(){
  const W0=W;
  const now=new Date(),y=now.getFullYear(),m=now.getMonth(),td=now.getDate(),last=new Date(y,m+1,0).getDate(),id=uid,t0=Date.now();
  const n=blank();Object.assign(n,{example:false,onboarded:true,name:W.name,base:W.base,emTarget:6,home:S.home&&S.home.on?S.home:{on:false,partner:'',adj:0},mail:S.mail,pendingInv:[]});
  const accIds=W.accounts.map(a=>{if(!num(a.amt)&&!(a.type!=='Efectivo'&&a.entity))return null;const cash=a.type==='Efectivo',sid=id();
    const l4=a.last4||a.l4in||'';n.savings.push({id:sid,name:cash?'Efectivo':(a.type+(a.entity?' · '+a.entity:'')),entity:cash?'Efectivo':(a.entity||'Sin entidad'),type:a.type,cur:a.cur,principal:num(a.amt),rate:0,start:t0,months:1,open:true,isr:!cash,liquid:true,last4:!cash&&/^\d{4}$/.test(l4)?l4:undefined});return sid});
  const I=W.inc;if(I.src==='otros'&&I.otro&&I.otro.n){const kk=I.otro.keep?addCustomCat('inc',I.otro.n):null;if(kk)I.src=kk;else I.label=I.otro.n}
  n.customCats=S.customCats;n.customTypes=S.customTypes;n.customLoanTypes=S.customLoanTypes;n.customEnts=S.customEnts;
  if(num(I.amt)){
    if(I.src==='salario'){const q=I.freq==='quincenal',days=(q?I.days:[I.day]).map(d=>Math.min(31,Math.max(1,parseInt(d,10)||(q?15:30))));
      const sid=+I.acc>=0?accIds[+I.acc]:null,via=sid?'a:'+sid:'';
      const p={id:id(),name:'Salario',src:'salario',amt:num(I.amt),cur:I.cur,via,freq:q?'quincenal':'mensual',days,done:{},start:t0};
      days.forEach(d=>{const dd=new Date(y,m,Math.min(d,last),12);if(dd.getDate()<=td){p.done[isoLocal(dd)]='y';n.incomes.push({id:id(),desc:'Salario',src:'salario',amt:num(I.amt),cur:I.cur,date:dd.getTime(),via})}});
      n.paydays=[p]}
    else n.incomes.push({id:id(),desc:(I.label||INC[I.src]||'Ingreso')+' · promedio',src:I.src,amt:num(I.amt),cur:I.cur,date:new Date(y,m,1,12).getTime(),via:''});
  }
  W.other.forEach(o=>{if(num(o.amt))n.incomes.push({id:id(),desc:(INC[o.src]||'Ingreso')+' · promedio',src:o.src,amt:num(o.amt),cur:o.cur,date:new Date(y,m,1,12).getTime(),via:''})});
  if(W.has.inv)W.savings.forEach(s=>{if(!num(s.amt))return;if(s.type==='Otro'&&s.otro&&s.otro.n){s.type=s.otro.keep?addCustomList('customTypes',s.otro.n):s.otro.n;n.customTypes=S.customTypes}let due=!s.noDue&&s.due?parseDate(s.due):null;if(due&&due<=t0+DAY)due=null;const open=!due&&(s.noDue||['Fondo de inversión','Acciones'].includes(s.type));
    n.savings.push({id:id(),name:(s.type==='Sell Buy Back (SBB)'?'SBB':s.type)+(s.entity?' · '+s.entity:''),entity:s.entity||'Sin entidad',type:s.type,cur:s.cur,principal:num(s.amt),rate:rate(s.rate)||0,start:t0,months:due?Math.max(1,Math.round((due-t0)/MONTH)):(open?1:12),due:due||undefined,open:open||undefined,isr:true,liquid:s.type==='Fondo de inversión',vr:s.vr||undefined})});
  if(W.has.cards)W.cards.forEach(c=>{if(!num(c.limit))return;n.cards.push({id:id(),name:'Tarjeta'+(c.entity?' '+c.entity:''),entity:c.entity||'Sin entidad',cur:c.cur,limit:num(c.limit),balance:Math.min(num(c.balance),num(c.limit)),rate:rate(c.rate)||60,payDay:Math.min(31,Math.max(1,parseInt(c.day,10)||15)),last4:c.last4||c.l4in||''})});
  if(W.has.loans)W.loans.forEach(l=>{const P=num(l.amt),mo=parseInt(l.months,10);if(!P||!(mo>0))return;const k=Math.min(mo,parseInt(l.paidN,10)||0);
    let ty=l.type;if(ty==='Otro'&&l.otro&&l.otro.n){ty=l.otro.keep?addCustomList('customLoanTypes',l.otro.n):l.otro.n;n.customLoanTypes=S.customLoanTypes}
    n.loans.push({id:id(),pays:[],auto:true,name:'Préstamo '+ty.toLowerCase()+(l.entity?' · '+l.entity:''),entity:l.entity||'Sin entidad',type:ty,cur:l.cur,principal:P,rate:rate(l.rate)||0,months:mo,start:new Date(y,m-k,Math.min(td,28)).getTime()})});
  const addFixed=(name,c,amt,dayRaw,icon)=>{const day=Math.min(31,Math.max(1,parseInt(dayRaw,10)||1));const paidAlready=Math.min(day,last)<td;
    n.recurring.push({id:id(),name,cat:c,amt,cur:'DOP',day,icon,lastPaid:paidAlready?ym():null});
    if(paidAlready)n.expenses.push({id:id(),desc:name,cat:c,amt,cur:'DOP',date:new Date(y,m,Math.min(day,last),12).getTime(),via:''})};
  (W.customFixed||[]).forEach(f=>{if(f.name&&num(f.amt))addFixed(f.name,f.cat||'otros',num(f.amt),f.day||1,'otro')});
  FIXED.forEach(([k,l,c])=>{const f=W.fixed[k];if(f&&f.on&&num(f.amt))addFixed(l,c,num(f.amt),f.day,k)});
  n.catBudget=suggestBudget().b;
  S=n;delete S.onbDraft;save();W=null;$('#onbLayer').innerHTML='';document.documentElement.classList.remove('onb-open');
  view='resumen';render();window.scrollTo({top:0});toast(S.name?`Listo, ${S.name}. Este es tu resumen.`:'Listo. Este es tu resumen.');
}

