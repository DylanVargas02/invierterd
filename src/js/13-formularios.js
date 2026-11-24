/* ---------- Hoja inferior / formularios ---------- */
function wireMoney(scope){
  scope.querySelectorAll('[data-money]').forEach(inp=>{
    const echo=document.createElement('small');echo.className='echo';echo.setAttribute('aria-live','polite');inp.after(echo);
    const src=inp.dataset.money, cur=()=>CURS.includes(src)?src:(($('#'+src)||{}).value||'DOP');
    const upd=()=>{const v=inp.value.trim();if(!v){echo.textContent='';echo.classList.remove('bad');return}
      const n=money(v);const ok=isFinite(n)&&n>=0;echo.textContent=ok?'= '+fmt(n,cur()):'Escribe solo el número, por ejemplo 1500';echo.classList.toggle('bad',!ok)};
    inp.addEventListener('input',upd);const sel=$('#'+src);if(sel)sel.addEventListener('change',upd);upd();
  });
}
let sheetOpener=null;
function sheet(html,accent){
  if(!$('#scrim'))sheetOpener=document.activeElement;
  $('#layer').innerHTML=`<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true" style="--accent:${accent}"><div class="grab"></div>${html}</div></div>`;
  const sh=$('.sheet'),h=sh.querySelector('h3');if(h){h.id=h.id||'shTitle';sh.setAttribute('aria-labelledby',h.id)}
  $('#scrim').onclick=e=>{if(e.target.id==='scrim')close()};
  sh.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const F=[...sh.querySelectorAll('button,[href],input:not([type=hidden]),select,textarea,summary,[tabindex]:not([tabindex="-1"])')].filter(x=>!x.disabled&&x.offsetParent);if(!F.length)return;
    const a=F[0],z=F[F.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}});
  wireMoney($('#layer'));wireEnt($('#layer'));
  const f=$('#layer input,#layer select');if(f)f.focus();else{sh.tabIndex=-1;sh.focus({preventScroll:true})}
}
function close(){if(!$('#layer').firstChild)return;$('#layer').innerHTML='';const o=sheetOpener;sheetOpener=null;if(o&&o.isConnected&&o.focus)try{o.focus({preventScroll:true})}catch(e){}}
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
const isoLocal=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const today=()=>isoLocal(new Date());
const curSel=(id,v)=>`<select id="${id}">${CURS.map(c=>`<option ${c===v?'selected':''}>${c}</option>`).join('')}</select>`;
const uid=()=>Math.random().toString(36).slice(2,9);
function parseDate(v){const [y,m,d]=v.split('-').map(Number);return new Date(y,m-1,d,12).getTime()}

/* ---------- Registrar un gasto o un ingreso ---------- */
const CASH_IC='<span class="via-cash" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/></svg></span>';
function viaCards(k,val){
  const t=Date.now(),A=accts();
  const card=(v,ic,name,sub,amt,cur,extra)=>`<label class="via"><input type="radio" name="eVia" value="${v}" data-vcur="${cur||''}" ${v===val?'checked':''}><span class="via-in">${ic}<span class="via-t"><b>${esc(name)}</b><small>${sub}</small></span><span class="via-a num">${amt?`<b>${esc(amt)}</b>`:''}${extra||''}</span><span class="via-ok" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span></span></label>`;
  let h='';
  if(A.length)h+=`<p class="via-g">Tus cuentas</p><div class="via-list">${A.map(s=>card('a:'+s.id,s.type==='Efectivo'?CASH_IC:inst(s.entity,1),s.name,(s.type==='Efectivo'?'Efectivo':esc(s.entity))+(s.last4?' · •••• '+esc(s.last4):'')+(s.cur!=='DOP'?' · '+s.cur:''),fmt(savValue(s,t),s.cur,0),s.cur,'<small>saldo</small>')).join('')}</div>`;
  if(k==='e'&&S.cards.length)h+=`<p class="via-g">Tarjetas de crédito</p><div class="via-list">${S.cards.map(c=>card('c:'+c.id,inst(c.entity,1),c.name,esc(c.entity)+(c.last4?' · •••• '+esc(c.last4):''),fmt(Math.max(0,c.limit-c.balance),c.cur,0),c.cur,'<small>disponible</small>')).join('')}</div>`;
  h+=`<div class="via-list" style="margin-top:8px">${A.some(s=>s.type==='Efectivo')?'':card('',CASH_IC,'Efectivo',k==='i'?'Lo recibiste en la mano':'Pagaste en la mano','','')}</div>
    <button type="button" class="via-add" id="eAddAcc" aria-expanded="false"><span aria-hidden="true">+</span> Agregar ${k==='e'?'cuenta o tarjeta':'cuenta'}</button>
    <div class="via-new" id="eNew" hidden>
      ${k==='e'?`<div class="choice">${pill('eNt','Cuenta de ahorro','Ahorro',true)}${pill('eNt','Cuenta corriente','Corriente')}${pill('eNt','tc','Tarjeta de crédito')}</div>`:`<div class="choice">${pill('eNt','Cuenta de ahorro','Ahorro',true)}${pill('eNt','Cuenta corriente','Corriente')}</div>`}
      <div class="field"><label for="eNe">Banco</label>${entPick('eNe','')}</div>
      <div class="two"><div class="field"><label for="eNb" id="eNbL">Saldo antes de este movimiento</label><input id="eNb" inputmode="decimal" placeholder="0.00"></div><div class="field"><label for="eN4">Últimos 4 <span class="opt">opcional</span></label><input id="eN4" inputmode="numeric" maxlength="4" placeholder="1234"></div></div>
      <div class="field" id="eNlF" hidden><label for="eNl">Límite de la tarjeta</label><input id="eNl" inputmode="decimal" placeholder="0.00"></div>
    </div>`;
  return h;
}
function openExpense(kind='gasto',keep={},editId){
  if(typeof kind!=='string')kind='gasto';
  const inc=kind==='ingreso',k=inc?'i':'e';
  const ed=editId?(inc?S.incomes:S.expenses).find(x=>x.id===editId):null;
  if(ed)keep={desc:ed.desc,amt:String(ed.amt),cur:ed.cur,date:isoLocal(new Date(ed.date)),via:ed.via||'',cat:inc?ed.src:ed.cat};
  const lv=(S.lastVia||{})[k],A=accts();
  const via=keep.via!==undefined?keep.via:(lv!==undefined&&(lv===''||viaObj(lv))?lv:(A[0]?'a:'+A[0].id:''));
  const vo=viaObj(via);let cur=keep.cur||(vo?vo.o.cur:S.base),manualCur=!!keep.cur;
  const curs=['DOP','USD'].concat(cur==='EUR'?['EUR']:[]);
  const keys=inc?Object.keys(INC).filter(x=>x!=='otros').concat('otros'):Object.keys(CATS).filter(x=>x!=='otros').concat('otros');
  const catList=keys.map(kk=>inc?[kk,kk==='otros'?'Otro':INC[kk],INC_C[kk]||'var(--c-gray)',incSvg(kk)]:[kk,kk==='otros'?'Otro':CATS[kk].n,CATS[kk].c,catSvg(kk)]);
  const cat0=keep.cat&&keys.includes(keep.cat)?keep.cat:(inc?'salario':'comida');
  const td=today(),yd=isoLocal(new Date(Date.now()-DAY)),dv0=keep.date||td;
  sheet(`<div class="mv-top">${ed?`<h3>Editar ${inc?'ingreso':'gasto'}</h3>`:`<div class="kind-tog" role="group" aria-label="Tipo de movimiento"><button type="button" data-kind="gasto" aria-pressed="${!inc}">− Gasto</button><button type="button" data-kind="ingreso" aria-pressed="${inc}">+ Ingreso</button></div>`}</div>
  <form class="form mv" id="f" novalidate>
    <div class="amt-box ${inc?'inc':'exp'}">
      <label for="eAmt">${inc?'¿Cuánto te entró?':'¿Cuánto gastaste?'}</label>
      <div class="amt-row"><div class="cur-pick" role="group" aria-label="Moneda">${curs.map(c=>`<button type="button" data-ecur="${c}" aria-pressed="${c===cur}">${curSym[c]}</button>`).join('')}</div>
        <input id="eAmt" inputmode="decimal" autocomplete="off" placeholder="0.00" value="${esc(keep.amt||'')}"></div>
      <small class="amt-echo num" id="eEcho" aria-live="polite"></small>
    </div>
    <fieldset class="field"><legend>${inc?'Tipo de ingreso':'Categoría'}</legend><div class="cat-pick">${catList.map(([kk,n,c,ic])=>`<label class="cp"><input type="radio" name="eCat" value="${kk}" ${kk===cat0?'checked':''}><span style="--cc:${c}"><i>${ic}</i>${esc(n.replace('Trabajo independiente','Independiente').replace('Alquileres cobrados','Alquileres'))}</span></label>`).join('')}</div>
      ${otroBox('eOtro',inc?'Ej. Bono navideño, venta de un mueble':'Ej. Mascotas, regalos',cat0==='otros')}</fieldset>
    <fieldset class="field"><legend>${inc?'¿A qué cuenta entró?':'¿Con qué cuenta pagaste?'}</legend><div class="vias">${viaCards(k,via)}</div><p class="via-h" id="eViaH"></p></fieldset>
    <div class="field"><label for="eDesc">Concepto <span class="opt">opcional</span></label><input id="eDesc" value="${esc(keep.desc||'')}" placeholder="${inc?'Ej. Salario de noviembre':'Ej. Supermercado Nacional'}" maxlength="60" autocomplete="off"></div>
    <fieldset class="field"><legend>Fecha</legend><div class="date-pick"><button type="button" data-dq="${td}" aria-pressed="${dv0===td}">Hoy</button><button type="button" data-dq="${yd}" aria-pressed="${dv0===yd}">Ayer</button><input type="date" id="eDate" value="${dv0}" max="${td}" aria-label="Otra fecha"></div></fieldset>
    <div class="err" id="err" role="alert"></div>
    <button class="btn mv-save" type="submit" id="eSave">Guardar</button>
    ${ed?`<button type="button" class="link-btn danger del-link" id="eDel">Eliminar este ${inc?'ingreso':'gasto'}</button>`:''}
  </form>`,inc?'var(--grow)':'var(--spend)');
  let newAcc=false;
  const getVia=()=>newAcc?'new':(document.querySelector('[name=eVia]:checked')||{}).value||'';
  const upd=()=>{
    const amt=money($('#eAmt').value),v=getVia(),o=v==='new'?null:viaObj(v),ok=isFinite(amt)&&amt>0;
    document.querySelectorAll('[data-ecur]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.ecur===cur));
    let echo='';
    if($('#eAmt').value.trim()&&!ok)echo='<span class="bad">Escribe solo el número, por ejemplo 1500</span>';
    else if(ok&&o&&o.o.cur!==cur)echo=`≈ ${esc(fmt(conv(amt,cur,o.o.cur),o.o.cur))} en ${esc(o.o.name)} · tasa RD$${S.rates.USD.toFixed(2)} por US$`;
    else if(ok&&cur!==S.base)echo=`≈ ${esc(fmt(conv(amt,cur,S.base),S.base))}`;
    $('#eEcho').innerHTML=echo;
    const tc=newAcc&&(document.querySelector('[name=eNt]:checked')||{}).value==='tc';
    $('#eViaH').textContent=v==='new'?(tc?'Creamos la tarjeta y le sumamos este consumo.':'Creamos la cuenta con ese saldo y le aplicamos este movimiento.'):!o?(inc?'Efectivo: no cambia el saldo de tus cuentas.':'Efectivo: no descuenta de tus cuentas.'):o.k==='c'?'Se suma a lo consumido de la tarjeta. Tus cuentas no cambian hasta que pagues la tarjeta.':inc?'Se suma al saldo de esta cuenta.':'Se descuenta del saldo de esta cuenta.';
    $('#eSave').textContent=(ed?'Guardar cambios':inc?'Guardar ingreso':'Guardar gasto')+(ok?' · '+fmt(amt,cur):'');
  };
  const L=$('#layer');wireEnt(L);
  document.querySelectorAll('[data-ecur]').forEach(b=>b.onclick=()=>{cur=b.dataset.ecur;manualCur=true;upd()});
  const showNew=on=>{newAcc=on;$('#eNew').hidden=!on;$('#eAddAcc').setAttribute('aria-expanded',on);if(on){document.querySelectorAll('[name=eVia]').forEach(r=>r.checked=false);$('#eNe').focus()}upd()};
  $('#eAddAcc').onclick=()=>showNew(!newAcc);
  document.querySelectorAll('[name=eNt]').forEach(r=>r.onchange=()=>{const tc=r.value==='tc'&&r.checked;$('#eNlF').hidden=!tc;$('#eNbL').textContent=tc?'Consumido antes de este gasto':'Saldo antes de este movimiento';upd()});
  document.querySelectorAll('[name=eVia]').forEach(r=>r.onchange=()=>{if(newAcc)showNew(false);const c=r.dataset.vcur;if(c&&!manualCur&&CURS.includes(c))cur=c;upd()});
  document.querySelectorAll('[name=eCat]').forEach(r=>r.onchange=()=>{const o=r.value==='otros';$('#eOtro').hidden=!o;if(o)$('#eOtro_n').focus()});
  $('#eAmt').oninput=upd;
  document.querySelectorAll('[data-dq]').forEach(b=>b.onclick=()=>{$('#eDate').value=b.dataset.dq;document.querySelectorAll('[data-dq]').forEach(x=>x.setAttribute('aria-pressed',x===b))});
  $('#eDate').onchange=()=>document.querySelectorAll('[data-dq]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.dq===$('#eDate').value));
  upd();setTimeout(()=>{const a=$('#eAmt');if(a&&!ed)a.focus()},60);
  if(ed)$('#eDel').onclick=()=>confirmDel(ed.desc,delDetail(inc?'incomes':'expenses',ed),()=>removeItem(inc?'incomes':'expenses',ed.id));
  document.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{if(b.dataset.kind!==kind)openExpense(b.dataset.kind,{desc:$('#eDesc').value,amt:$('#eAmt').value,cur:manualCur?cur:undefined,date:$('#eDate').value})});
  $('#f').onsubmit=e=>{e.preventDefault();
    const amt=money($('#eAmt').value),dv=$('#eDate').value;let v=getVia(),catV=(document.querySelector('[name=eCat]:checked')||{}).value||'otros';
    if(!(amt>0)){$('#eAmt').focus();return $('#err').textContent='Escribe el monto en números, por ejemplo 1500.'}
    if(!dv)return $('#err').textContent='Elige la fecha.';
    let otroName='';
    if(catV==='otros'){const ov=otroVal('eOtro');otroName=ov.n;if(ov.n&&ov.keep)catV=addCustomCat(inc?'inc':'exp',ov.n)||'otros'}
    if(v==='new'){const ent=readEnt('eNe'),t=(document.querySelector('[name=eNt]:checked')||{}).value||'Cuenta de ahorro',b0=money($('#eNb').value)||0,l4=$('#eN4').value.replace(/\D/g,'').slice(0,4);
      if(!ent){$('#eNe').focus();return $('#err').textContent='Elige el banco de la cuenta nueva.'}
      if(t==='tc'){const lim=money($('#eNl').value);if(!(lim>0)){$('#eNl').focus();return $('#err').textContent='Escribe el límite de la tarjeta.'}
        const c={id:uid(),name:'Tarjeta '+ent,entity:ent,cur,limit:lim,balance:Math.max(0,b0),rate:60,payDay:15,last4:l4};S.cards.push(c);v='c:'+c.id}
      else{const s={id:uid(),name:t.replace('Cuenta de ','Ahorro ').replace('Cuenta corriente','Corriente')+' · '+ent,entity:ent,type:t,cur,principal:Math.max(0,b0),rate:0,start:Date.now(),months:1,open:true,isr:true,liquid:true,last4:l4||undefined};S.savings.push(s);v='a:'+s.id}}
    const desc=$('#eDesc').value.trim()||otroName||(inc?INC[catV]:(CATS[catV]||CATS.otros).n)||'Movimiento';
    const o=viaObj(v);if(ed)applyVia(ed,-1,k);
    if(o&&o.k==='c'){const c=o.o,need=conv(amt,cur,c.cur);if(c.balance+need>c.limit+0.005){const msg='Ese gasto supera el disponible de la tarjeta ('+fmt(Math.max(0,c.limit-c.balance),c.cur)+').';if(ed)applyVia(ed,1,k);return $('#err').textContent=msg}}
    const base={id:uid(),desc,amt,cur,date:parseDate(dv),via:v};
    const x=inc?{...base,src:catV}:{...base,cat:catV};
    if(ed){x.id=ed.id;Object.assign(ed,x);applyVia(ed,1,k)}else{applyVia(x,1,k);(inc?S.incomes:S.expenses).push(x)}
    S.lastVia=Object.assign({},S.lastVia||{},{[k]:v});
    save();close();render();toast(ed?'Cambios guardados':inc?'Ingreso guardado':o&&o.k==='c'?'Gasto guardado en la tarjeta':'Gasto guardado')};
}

function openSaving(pre={}){
  const ed=pre.id?S.savings.find(x=>x.id===pre.id):null;
  if(ed)pre={last4:ed.last4,entity:ed.entity,name:ed.name,type:ed.type,cur:ed.cur,principal:+ed.principal.toFixed(2),rate:ed.rate,months:ed.months,mode:ed.open?'sin':ed.due?'fecha':'meses',dueISO:ed.due?isoLocal(new Date(ed.due)):'',startISO:isoLocal(new Date(ed.start)),isr:ed.isr,liquid:isLiquid(ed),vr:!!ed.vr,intFreq:ed.intFreq};
  const type=SAV_T.includes(pre.type)?pre.type:(ed&&pre.type?(SAV_T.splice(SAV_T.length-1,0,pre.type),pre.type):pre.type?'Otro':'Certificado'), mode0=pre.mode||(ACCT_TYPES.includes(type)||type==='Fondo de inversión'?'sin':'fecha');
  sheet(`<h3>${ed?'Editar '+esc(ed.type==='Sell Buy Back (SBB)'?'SBB':ed.type.toLowerCase()):type==='Certificado'?'Nuevo certificado financiero':ACCT_TYPES.includes(type)?'Nueva cuenta':type==='Otro'?'Nuevo ahorro o inversión':'Nuevo: '+esc(type==='Sell Buy Back (SBB)'?'SBB':type.toLowerCase())}</h3><form class="form" id="f">
  <div class="two"><div class="field"><label for="sType">Tipo</label><select id="sType">${SAV_T.map(t=>`<option ${t===type?'selected':''}>${t}</option>`).join('')}</select></div><div class="field"><label for="sEnt">Entidad</label>${entPick('sEnt',pre.entity===AD?'':pre.entity)}</div></div>${otroBox('sOtro','Ej. Plan de retiro, criptomonedas',type==='Otro')}
  <div class="field"><label for="sName">Nombre <span class="opt">opcional</span></label><input id="sName" value="${esc(pre.name||'')}" placeholder="Ej. Certificado de 6 meses" maxlength="50"></div>
  <div class="two"><div class="field"><label for="sAmt" id="sAmtL">Monto invertido</label><input id="sAmt" data-money="sCur" inputmode="decimal" value="${pre.principal||''}" placeholder="0.00"></div><div class="field"><label for="sCur">Moneda</label>${curSel('sCur',pre.cur||'DOP')}</div></div>
  <div class="field" id="sRateF"><label for="sRate" id="sRateL">${pre.vr?'Rendimiento anual aproximado %':'Tasa anual %'}</label><input id="sRate" inputmode="decimal" value="${pre.rate||''}" placeholder="9.50"><label class="check" style="margin-top:6px"><input type="checkbox" id="sVr" ${pre.vr?'checked':''}><span>La tasa es variable (cambia con el mercado)</span></label></div>
  <fieldset class="field"><legend>Vencimiento</legend><div class="choice">${pill('sMode','fecha','Fecha',mode0==='fecha')}${pill('sMode','meses','En meses',mode0==='meses')}${pill('sMode','sin','No vence',mode0==='sin')}</div></fieldset>
  <div class="field" id="sDateF"><label for="sDue">Fecha de vencimiento</label><input type="date" id="sDue" value="${pre.dueISO!==undefined?pre.dueISO:pre.months?addMonthsISO(pre.months):''}"><small class="hint">Toca para elegir en el calendario o escribe día, mes y año.</small></div>
  <div class="field" id="sMonF"><label for="sMon">Plazo en meses</label><input id="sMon" inputmode="numeric" value="${pre.months||6}"></div>
  <div class="field" id="sIntF"><label for="sInt">¿Cuándo te pagan los intereses?</label><select id="sInt">${[[1,'Cada mes'],[3,'Cada 3 meses'],[6,'Cada 6 meses'],[0,'Al vencimiento, junto al capital']].map(([v,l])=>`<option value="${v}" ${(pre.intFreq!==undefined?pre.intFreq:intF({type}))===v?'selected':''}>${l}</option>`).join('')}</select><small class="hint">Así aparecen en tu calendario de pagos.</small></div>
  <p class="hint" id="sSinH">Para cuentas de ahorro, corrientes, efectivo y fondos abiertos: el dinero está disponible siempre y los intereses se suman cada mes.</p>
  <div class="field"><label for="sStart" id="sStartL">Fecha de inicio</label><input type="date" id="sStart" value="${pre.startISO||today()}"></div>
  <label class="check" id="sIsrF"><input type="checkbox" id="sIsr" ${pre.isr===false?'':'checked'}><span>Retener ISR 10 % sobre intereses</span></label>
  <div class="field" id="s4F"><label for="s4">Últimos 4 dígitos de la tarjeta de débito o de la cuenta <span class="opt">opcional</span></label><input id="s4" inputmode="numeric" maxlength="4" value="${esc(pre.last4||'')}" placeholder="1234"><small class="hint">Para distinguir tus cuentas del mismo banco.</small></div>
  <label class="check"><input type="checkbox" id="sLiq"><span>Lo puedo usar en una emergencia</span></label>
  <div class="err" id="err"></div><button class="btn" type="submit">${ed?'Guardar cambios':'Guardar'}</button>
  ${ed?`<button type="button" class="link-btn danger del-link" id="sDel">Eliminar ${esc(ed.name)}</button>`:''}</form>`,'var(--brand)');
  if(ed)$('#sDel').onclick=()=>confirmDel(ed.name,delDetail('savings',ed),()=>removeItem('savings',ed.id));
  const mode=()=>(document.querySelector('[name=sMode]:checked')||{}).value||'fecha';
  const sync=()=>{const ty=$('#sType').value,acc=ACCT_TYPES.includes(ty),cash=ty==='Efectivo',m=mode();$('#s4F').hidden=!acc||cash;
    $('#sDateF').hidden=m!=='fecha';$('#sIntF').hidden=acc||m==='sin';$('#sMonF').hidden=m!=='meses';$('#sSinH').hidden=m!=='sin';$('#sRateF').hidden=cash;$('#sIsrF').hidden=cash;
    $('#sAmtL').textContent=acc?'Saldo actual':'Monto invertido';$('#sStartL').textContent=acc?'Desde cuándo':'Fecha de inicio'};
  const setMode=v=>{const r=document.querySelector(`[name=sMode][value="${v}"]`);if(r)r.checked=true};
  $('#sLiq').checked=pre.liquid!==undefined?pre.liquid:ACCT_TYPES.includes(type)||type==='Fondo de inversión';
  $('#sVr').onchange=()=>{$('#sRateL').textContent=$('#sVr').checked?'Rendimiento anual aproximado %':'Tasa anual %'};
  $('#sType').onchange=()=>{const ty=$('#sType').value;$('#sOtro').hidden=ty!=='Otro';if(!ed){const f0=intF({type:ty});if(f0!==null)$('#sInt').value=String(f0);$('#sVr').checked=['Fondo de inversión','Acciones'].includes(ty);$('#sVr').onchange()}if(ACCT_TYPES.includes(ty))setMode('sin');else if(mode()==='sin'&&ty!=='Fondo de inversión'&&ty!=='Acciones')setMode('fecha');$('#sLiq').checked=ACCT_TYPES.includes(ty)||ty==='Fondo de inversión';sync()};
  document.querySelectorAll('[name=sMode]').forEach(r=>r.onchange=sync);sync();
  $('#f').onsubmit=e=>{e.preventDefault();let ty=$('#sType').value;if(ty==='Otro'){const o=otroVal('sOtro');if(o.n)ty=o.keep?addCustomList('customTypes',o.n):o.n}const cash=ty==='Efectivo',P=money($('#sAmt').value),r=cash?0:rate($('#sRate').value||'0'),m=mode(),start=parseDate($('#sStart').value||today()),ent=readEnt('sEnt');
    if(!(P>0))return $('#err').textContent='Escribe el monto en números, por ejemplo 1500.';if(!(r>=0&&r<100))return $('#err').textContent='La tasa debe estar entre 0 y 100 %.';
    const l4=$('#s4').value.replace(/\D/g,'').slice(0,4);if(l4&&l4.length!==4&&!$('#s4F').hidden)return $('#err').textContent='Escribe los 4 últimos dígitos completos o deja el campo vacío.';
    const x={id:uid(),entity:ent||'Sin entidad',type:ty,cur:$('#sCur').value,principal:P,rate:r,start,isr:!cash&&$('#sIsr').checked,liquid:$('#sLiq').checked,last4:ACCT_TYPES.includes(ty)&&ty!=='Efectivo'&&l4?l4:undefined,vr:!cash&&$('#sVr').checked||undefined,intFreq:$('#sIntF').hidden?undefined:+$('#sInt').value};
    if(m==='fecha'){const dv=$('#sDue').value;if(!dv)return $('#err').textContent='Elige la fecha de vencimiento o marca «No vence».';const due=parseDate(dv);if(!(due>start+DAY/2))return $('#err').textContent='La fecha de vencimiento debe ser posterior a la de inicio.';x.due=due;x.months=Math.max(1,Math.round((due-start)/MONTH))}
    else if(m==='meses'){const mo=parseInt($('#sMon').value,10);if(!(mo>0))return $('#err').textContent='El plazo debe ser de al menos 1 mes.';x.months=mo}
    else{x.open=true;x.months=1}
    x.name=$('#sName').value.trim()||(ty==='Efectivo'?'Efectivo':(ty==='Sell Buy Back (SBB)'?'SBB':ty)+(ent?' · '+ent:''));
    if(ed){x.id=ed.id;delete ed.due;delete ed.open;delete ed.vr;delete ed.intFreq;Object.assign(ed,x);save();close();render();toast('Cambios guardados');return}
    S.savings.push(x);save();close();if(view!=='resumen'){view='ahorros';try{localStorage.setItem(KEY+'.view',view)}catch(err){}}render();window.scrollTo({top:0});toast('Guardado')};
}

function openCard(id){
  const ed=id?S.cards.find(x=>x.id===id):null,v=ed||{};
  sheet(`<h3>${ed?'Editar tarjeta':'Nueva tarjeta'}</h3><form class="form" id="f">
  <div class="field"><label for="cName">Nombre</label><input id="cName" value="${esc(v.name||'')}" placeholder="Ej. Tarjeta Platinum" maxlength="40"></div>
  <div class="field"><label for="cEnt">Entidad</label>${entPick('cEnt',v.entity||'')}</div><div class="field"><label for="cCur">Moneda</label>${curSel('cCur',v.cur||'DOP')}</div>
  <div class="two"><div class="field"><label for="cLim">Límite</label><input id="cLim" data-money="cCur" inputmode="decimal" value="${ed?v.limit:''}" placeholder="0.00"></div><div class="field"><label for="cBal">Consumido hoy</label><input id="cBal" data-money="cCur" inputmode="decimal" value="${ed?+v.balance.toFixed(2):''}" placeholder="0.00"></div></div>
  <div class="two"><div class="field"><label for="cRate">Tasa anual %</label><input id="cRate" inputmode="decimal" value="${ed?v.rate:''}" placeholder="60"></div><div class="field"><label for="cDay">Día límite de pago</label><input id="cDay" inputmode="numeric" value="${ed?v.payDay:''}" placeholder="15"></div></div>
  <div class="field"><label for="c4">Últimos 4 dígitos <span class="opt">opcional</span></label><input id="c4" inputmode="numeric" maxlength="4" value="${esc(v.last4||'')}" placeholder="1234"></div>
  <div class="err" id="err"></div><button class="btn" type="submit">${ed?'Guardar cambios':'Guardar'}</button>
  ${ed?`<button type="button" class="link-btn danger del-link" id="cDel">Eliminar tarjeta</button>`:''}</form>`,'var(--brand)');
  if(ed)$('#cDel').onclick=()=>confirmDel(ed.name,delDetail('cards',ed),()=>removeItem('cards',ed.id));
  $('#f').onsubmit=ev=>{ev.preventDefault();const lim=money($('#cLim').value),bal=money($('#cBal').value||'0'),r=rate($('#cRate').value),day=parseInt($('#cDay').value,10),name=$('#cName').value.trim();
    if(!name)return $('#err').textContent='Ponle un nombre a la tarjeta.';if(!(lim>0))return $('#err').textContent='Escribe el límite en números, por ejemplo 50000.';if(!(bal>=0))return $('#err').textContent='Lo consumido no puede ser negativo.';if(bal>lim)return $('#err').textContent='Lo consumido no puede ser mayor que el límite.';if(!(r>=0&&r<200))return $('#err').textContent='Revisa la tasa anual.';if(!(day>=1&&day<=31))return $('#err').textContent='El día de pago va de 1 a 31.';
    const x={name,entity:readEnt('cEnt')||'Sin entidad',cur:$('#cCur').value,limit:lim,balance:bal,rate:r,payDay:day,last4:$('#c4').value.replace(/\D/g,'').slice(0,4)};
    if(ed)Object.assign(ed,x);else S.cards.push({id:uid(),...x});
    save();close();if(view==='prestamos')credSeg='tarjetas';render();toast(ed?'Cambios guardados':'Tarjeta guardada')};
}

/* ---------- Confirmación fuerte: mantener presionado 5 s y luego confirmar ---------- */
const HOLD_MS=5000;
function hasRealData(){return !S.example&&['savings','expenses','incomes','cards','loans','recurring','goals','transfers','paydays'].some(k=>(S[k]||[]).length)}
function lossList(){const n=k=>(S[k]||[]).length,p=(c,a,b)=>c+' '+(c===1?a:b);const L=[];
  if(n('savings'))L.push(p(n('savings'),'cuenta o inversión','cuentas e inversiones'));
  if(n('expenses')+n('incomes'))L.push(p(n('expenses')+n('incomes'),'movimiento','movimientos')+' (gastos e ingresos)');
  if(n('cards'))L.push(p(n('cards'),'tarjeta de crédito','tarjetas de crédito'));
  if(n('loans'))L.push(p(n('loans'),'préstamo','préstamos'));
  if(n('recurring'))L.push(p(n('recurring'),'pago fijo','pagos fijos'));
  return L}
function holdConfirm(o){
  const L=o.list||lossList(),MS=o.ms||HOLD_MS;
  sheet(`<div class="hc"><span class="hc-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/></svg></span>
    <h3>${o.title}</h3><p class="lead-s">${o.detail}</p>
    ${L.length?`<ul class="hc-list">${L.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
    <div id="hcStage"><button type="button" class="hc-hold" id="hcHold" aria-describedby="hcHint"><i class="hc-fill" aria-hidden="true"></i><span id="hcTxt">Mantén presionado para confirmar</span></button>
    <p class="hint hc-hint" id="hcHint">Deja el dedo sobre el botón ${MS/1000} segundos. Si lo sueltas antes, no pasa nada.</p></div>
    <button type="button" class="btn ghost hc-no" id="hcNo">${o.keep||'No, conservar mis datos'}</button></div>`,'var(--spend)');
  const b=$('#hcHold'),fill=b.querySelector('.hc-fill'),txt=$('#hcTxt');let t0=0,raf=0,done=false;
  const reset=()=>{if(done)return;cancelAnimationFrame(raf);t0=0;fill.style.transform='scaleX(0)';txt.textContent='Mantén presionado para confirmar';b.classList.remove('on')};
  const step=()=>{const p=Math.min(1,(performance.now()-t0)/MS);fill.style.transform=`scaleX(${p})`;
    txt.textContent=p<1?`Sigue presionando… ${Math.ceil((1-p)*MS/1000)}`:'';if(p<1)raf=requestAnimationFrame(step);else ready()};
  const start=e=>{if(done||t0)return;if(e&&e.cancelable)e.preventDefault();t0=performance.now();b.classList.add('on');raf=requestAnimationFrame(step)};
  const ready=()=>{done=true;try{navigator.vibrate&&navigator.vibrate(30)}catch(e){}
    $('#hcStage').innerHTML=`<p class="hc-last" role="alert">Último paso. Esto no se puede deshacer después de unos segundos.</p><button type="button" class="btn hc-yes" id="hcYes">${o.confirm||'Sí, borrar todo'}</button>`;
    $('#hcYes').focus();$('#hcYes').onclick=()=>{close();o.onConfirm()}};
  b.addEventListener('pointerdown',start);['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,reset));
  b.addEventListener('contextmenu',e=>e.preventDefault());
  b.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat)start(e)});b.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter')reset()});
  b.onclick=e=>e.preventDefault();
  $('#hcNo').onclick=close;
}
/* Reemplaza los datos guardando una copia para «Deshacer» */
function replaceData(next,msg){const prev=JSON.parse(JSON.stringify(S));S=next;save();render();undoToast(msg,()=>{S=prev;save();render();toast('Tus datos volvieron')})}
function eraseAll(){holdConfirm({title:'¿Borrar todos tus datos?',detail:'Se borrará todo lo que has anotado en la app. Tu nombre, tu moneda y tu apariencia se conservan.',
  onConfirm:()=>replaceData(blank(),'Se borró todo')})}

