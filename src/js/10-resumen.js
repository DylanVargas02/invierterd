/* ---------- Foto financiera ---------- */
function snapshot(t){
  const T=totals(t);
  let loans=0,cuotas=0;
  S.loans.forEach(l=>{const st=loanState(l);loans+=conv(st.left,l.cur,S.base);if(st.left)cuotas+=conv(st.cuota,l.cur,S.base)});
  let cards=0,lim=0,mins=0;
  S.cards.forEach(c=>{cards+=conv(c.balance,c.cur,S.base);lim+=conv(c.limit,c.cur,S.base);mins+=conv(minPay(c),c.cur,S.base)});
  const n=new Date();
  const spent=S.expenses.filter(x=>{const d=new Date(x.date);return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()}).reduce((a,x)=>a+conv(x.amt,x.cur,S.base),0);
  return {assets:T.v,ps:T.ps,loans,cards,debt:loans+cards,cuotas,mins,lim,spent};
}
let netMode='con';
function netValue(F){return netMode==='con'?F.assets-F.debt:F.assets}

/* ---------- Resumen ---------- */
let openG={};
const MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const chev='<span class="chev" aria-hidden="true">›</span>';
const secAdd=id=>`<button type="button" class="sec-add" id="${id}">+ Agregar</button>`;
const CUR_N={DOP:'Pesos · RD$',USD:'Dólares · US$',EUR:'Euros · €'},CUR_C={DOP:'var(--c1)',USD:'var(--c3)',EUR:'var(--c7)'};
/* Montos por moneda: «RD$86,634 · US$3,215» */
function byCurHTML(list,sep){const m={};list.forEach(([v,c])=>{m[c]=(m[c]||0)+v});return Object.entries(m).filter(([,v])=>Math.abs(v)>=.005).sort((a,b)=>CURS.indexOf(a[0])-CURS.indexOf(b[0])).map(([c,v])=>`<span class="cpill" style="--cc:${CUR_C[c]}">${esc(fmt(v,c,0))}</span>`).join(sep||'')}
function holdGroup(g){
  const ents={};g.items.forEach(it=>{(ents[it.entity]=ents[it.entity]||[]).push(it)});
  const E=Object.entries(ents).map(([e,L])=>({e,L,b:L.reduce((a,it)=>a+conv(it.val,it.cur,S.base),0)})).sort((a,b)=>b.b-a.b);
  const tot=E.reduce((a,x)=>a+x.b,0),n=g.items.length,oweT=g.card?g.items.reduce((a,it)=>a+conv(it.owe,it.cur,S.base),0):0;
  return `<details class="grp" data-g="${g.key}" ${openG[g.key]?'open':''} style="--gc:${g.color}"><summary class="grp-h">
      <span class="grp-ic" aria-hidden="true"><svg viewBox="0 0 24 24">${g.icon}</svg></span>
      <span class="grp-t"><b>${g.title}</b><span>${E.length} ${E.length===1?'entidad':'entidades'} · ${n} ${n===1?g.unit[0]:g.unit[1]}</span></span>
      <span class="chev rot" aria-hidden="true">›</span>
      <span class="grp-v num${g.card?' card':''}">${g.card?'<span class="grp-k">Disponible</span>':''}<b>${esc(fmt(tot,S.base,0))}</b>${new Set(g.items.map(it=>it.cur)).size>1?`<span class="cpills">${byCurHTML(g.items.map(it=>[it.val,it.cur]))}</span>`:''}${g.card?`<span class="grp-owe">Debes <b>${esc(fmt(oweT,S.base,0))}</b>${new Set(g.items.map(it=>it.cur)).size>1?' · '+g.items.filter(it=>it.owe>0).map(it=>esc(fmt(it.owe,it.cur,0))).join(' + '):''}</span>`:''}</span></summary>
    <div class="grp-in">
      ${n?E.map(x=>`<details class="ent" data-g="${g.key}:${esc(x.e)}" ${openG[g.key+':'+x.e]?'open':''}><summary class="ent-h">${inst(x.e,1)}
          <span class="ent-t"><b>${esc(x.e)}</b><span>${x.L.length} ${x.L.length===1?g.unit[0]:g.unit[1]} · ${tot?Math.round(x.b/tot*100):0} %</span></span>
          <span class="ent-v num">${byCurHTML(x.L.map(it=>[it.val,it.cur]),'')}${g.card?`<small class="owe-s">Debes ${x.L.map(it=>esc(fmt(it.owe,it.cur,0))).join(' + ')}</small>`:''}</span><span class="chev rot" aria-hidden="true">›</span></summary>
        <div class="ent-in">${x.L.map(it=>`<button type="button" class="it-r" ${it.attr}="${it.id}"><span class="it-t"><b>${esc(it.name)}</b>${g.card?'<small class="it-k">Disponible</small>':''}<span>${it.sub}</span></span><span class="it-v num"><b ${it.live?`data-sv="${it.id}"`:''}>${esc(fmt(it.val,it.cur,2))}</b>${g.card?`<small class="owe-s">Debes ${esc(fmt(it.owe,it.cur,2))}</small>`:it.cur!==S.base?`<small>≈ ${esc(fmt(conv(it.val,it.cur,S.base),S.base,0))}</small>`:''}</span>${chev}</button>`).join('')}</div></details>`).join('')
        :`<p class="hint grp-empty">${g.empty}</p>`}
      <button type="button" class="grp-add" id="${g.add[0]}">+ ${g.add[1]}</button>
    </div></details>`;
}
/* ---- Lista única de gastos e ingresos con filtros ---- */
let movF={per:'d30',type:'all',ent:'',cat:'',cur:'',from:'',to:'',lim:6};
const NAT={fijo:'Fijo',variable:'Variable',extra:'Extraordinario'};
const APP_VER='3.0 beta';window.__swUpdated=()=>undoToast('Hay una versión nueva de la app',()=>location.reload(),'Actualizar');
function movRange(){const n=new Date(),sod=new Date(n.getFullYear(),n.getMonth(),n.getDate()).getTime(),end=sod+DAY-1;
  if(movF.per==='m3')return [new Date(n.getFullYear(),n.getMonth()-3,n.getDate()).getTime(),end];
  if(movF.per==='y1')return [new Date(n.getFullYear()-1,n.getMonth(),n.getDate()).getTime(),end];
  if(movF.per==='rango'){const f=movF.from?parseDate(movF.from)-DAY/2:sod-29*DAY,t=movF.to?parseDate(movF.to)+DAY/2-1:end;return [Math.min(f,t),Math.max(f,t)]}
  return [sod-29*DAY,end]}
const viaEnt=v=>{const o=viaObj(v);return o?o.o.entity:'_'};
function movListHTML(){
  const R=movRange();
  let L=[...(movF.type==='inc'?[]:S.expenses.map(x=>({x,k:'e'}))),...(movF.type==='exp'?[]:S.incomes.map(x=>({x,k:'i'})))].filter(m=>m.x.date>=R[0]&&m.x.date<=R[1]);
  if(movF.type==='all')L=L.concat((S.transfers||[]).filter(x=>x.date>=R[0]&&x.date<=R[1]).map(x=>({x,k:'t'})));
  if(movF.ent)L=L.filter(m=>m.k==='t'?(viaEnt(m.x.from)===movF.ent||viaEnt(m.x.to)===movF.ent):viaEnt(m.x.via)===movF.ent);
  if(movF.cur)L=L.filter(m=>m.x.cur===movF.cur);
  if(movF.cat)L=L.filter(m=>m.k==='e'?'e:'+m.x.cat===movF.cat:m.k==='i'?'i:'+m.x.src===movF.cat||'n:'+(m.x.nat||'')===movF.cat:false);
  L.sort((a,b)=>b.x.date-a.x.date);
  const te=L.filter(m=>m.k==='e').reduce((a,m)=>a+conv(m.x.amt,m.x.cur,S.base),0),ti=L.filter(m=>m.k==='i').reduce((a,m)=>a+conv(m.x.amt,m.x.cur,S.base),0);
  const ents=[...new Set([...accts().map(s=>s.entity),...S.cards.map(c=>c.entity)])].sort();
  const show=L.slice(0,movF.lim);let lastDay='';
  const rows=show.map(({x,k})=>{const d=new Date(x.date).toDateString(),hd=d!==lastDay?`<div class="mv-day"><span>${esc(dayShort.format(new Date(x.date)))}</span></div>`:'';lastDay=d;
    if(k==='t')return hd+`<button type="button" class="mvr mid" data-edit-t="${x.id}"><b>${esc(x.desc)}</b><small>${esc(viaName(x.from))} → ${esc(viaName(x.to))}</small><strong class="num">⇄ ${esc(fmt(x.amt,x.cur,2))}</strong></button>`;
    const sub=k==='e'?(CATS[x.cat]?CATS[x.cat].n:'Otros'):(INC[x.src]||'Ingreso')+(x.nat?' · '+NAT[x.nat]:'');
    return hd+`<button type="button" class="mvr ${k==='e'?'out':'in'}" data-edit-${k}="${x.id}"><b>${esc(x.desc)}</b><small>${esc(sub)} · ${esc(viaName(x.via))}</small><strong class="num">${k==='e'?'−':'+'}${esc(fmt(x.amt,x.cur,2))}</strong></button>`}).join('');
  return `<section class="panel mvp">
    <div class="mv-pl">Últimos</div><div class="per light mv-per" role="group" aria-label="Período">${[['d30','30 días'],['m3','3 meses'],['y1','1 año'],['rango','Rango']].map(([k,l])=>`<button type="button" data-mvp="${k}" aria-pressed="${movF.per===k}">${k==='rango'?'<svg class="cal" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>':''}${l}</button>`).join('')}</div>
    ${movF.per==='rango'?`<div class="per-dates light"><label>Desde<input type="date" data-mvd="from" value="${esc(movF.from)}"></label><label>Hasta<input type="date" data-mvd="to" value="${esc(movF.to)}"></label></div>`:''}
    <div class="mvf"><div class="seg tiny" role="group" aria-label="Tipo">${[['all','Todos'],['exp','Gastos'],['inc','Ingresos']].map(([k,l])=>`<button type="button" data-mvt="${k}" aria-pressed="${movF.type===k}">${l}</button>`).join('')}</div>
      <label class="ym-sel mv-ent"><span class="sr">Entidad</span><select id="mvEnt"><option value="">Todas las entidades</option>${ents.map(e=>`<option ${e===movF.ent?'selected':''}>${esc(e)}</option>`).join('')}<option value="_" ${movF.ent==='_'?'selected':''}>Efectivo u otro</option></select></label></div>
    <div class="mvf mvf2"><label class="ym-sel"><span class="sr">Categoría</span><select id="mvCat"><option value="">Todas las categorías</option><optgroup label="Gastos">${Object.keys(CATS).map(k=>`<option value="e:${k}" ${movF.cat==='e:'+k?'selected':''}>${esc(CATS[k].n)}</option>`).join('')}</optgroup><optgroup label="Ingresos">${Object.keys(INC).map(k=>`<option value="i:${k}" ${movF.cat==='i:'+k?'selected':''}>${esc(INC[k])}</option>`).join('')}${Object.keys(NAT).map(k=>`<option value="n:${k}" ${movF.cat==='n:'+k?'selected':''}>Ingresos ${NAT[k].toLowerCase()}s</option>`).join('')}</optgroup></select></label>
      <label class="ym-sel"><span class="sr">Moneda</span><select id="mvCur"><option value="">Todas las monedas</option>${CURS.map(c=>`<option ${movF.cur===c?'selected':''}>${c}</option>`).join('')}</select></label></div>
    <div class="mv-sum num">${movF.type!=='inc'?`<span class="negc">−${esc(fmt(te,S.base,0))}</span>`:'<span></span>'}<span class="mv-n">${L.filter(m=>m.k!=='t').length} ${L.filter(m=>m.k!=='t').length===1?'movimiento':'movimientos'}</span>${movF.type!=='exp'?`<span class="pos">+${esc(fmt(ti,S.base,0))}</span>`:'<span></span>'}</div>
    <div class="mv-list">${rows||'<p class="hint center" style="margin:16px 0">No hay movimientos con estos filtros.</p>'}</div>
    ${L.length>show.length?`<button type="button" class="grp-add" id="mvMore" style="--gc:var(--brand)">Ver ${Math.min(15,L.length-show.length)} más</button>`:''}
  </section>`;
}
function bindMov(){
  const r=()=>render();
  document.querySelectorAll('[data-mvp]').forEach(b=>b.onclick=()=>{movF.per=b.dataset.mvp;movF.lim=6;if(movF.per==='rango'&&!movF.from){movF.from=isoLocal(new Date(Date.now()-29*DAY));movF.to=today()}r()});
  document.querySelectorAll('[data-mvd]').forEach(i=>i.onchange=()=>{movF[i.dataset.mvd]=i.value;r()});
  document.querySelectorAll('[data-mvt]').forEach(b=>b.onclick=()=>{movF.type=b.dataset.mvt;movF.lim=6;r()});
  const s=$('#mvEnt');if(s)s.onchange=()=>{movF.ent=s.value;movF.lim=6;r()};
  const sc=$('#mvCat');if(sc)sc.onchange=()=>{movF.cat=sc.value;movF.lim=6;r()};const su=$('#mvCur');if(su)su.onchange=()=>{movF.cur=su.value;movF.lim=6;r()};
  const m=$('#mvMore');if(m)m.onclick=()=>{movF.lim+=15;const y=scrollY;r();scrollTo(0,y)};
}

/* Acceso al calendario: muestra lo próximo y abre el calendario completo */
function calBtnHTML(filter){
  const n=new Date(),a=+new Date(n.getFullYear(),n.getMonth(),n.getDate());let E=calEvents(a,a+45*DAY).filter(e=>!e.done);if(filter)E=E.filter(filter);const e=E[0];
  const d=e?Math.round((e.t-a)/DAY):0,when=!e?'':d===0?'hoy':d===1?'mañana':'en '+d+' días';
  return `<button type="button" class="calbtn" id="calOpen"><span class="calbtn-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h2M14 14h2M8 17h2"/></svg></span>
    <span class="calbtn-t"><b>Calendario de pagos</b><small>${e?`Próximo: ${esc(e.title)} · ${when}`:'Agrega gastos fijos, cobros y recordatorios'}</small></span>${chev}</button>`;
}
function vResumen(){
  const t=Date.now(),F=snapshot(t),net=netValue(F),neg=net<0,total=OSTEPS.length-2;
  const A=accts(),avail=A.reduce((a,s)=>a+conv(savValue(s,t),s.cur,S.base),0),inv=invList();
  const sameAvail=Math.abs(avail-F.assets)<1;
  const groups=[
    {key:'acc',title:'Cuentas y efectivo',color:'var(--brand)',icon:'<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h3"/>',unit:['cuenta','cuentas'],add:['addAcc','Agregar cuenta'],empty:'Agrega tus cuentas de ahorro, corrientes o efectivo.',
      items:A.map(s=>({id:s.id,entity:s.entity,name:s.name,cur:s.cur,val:savValue(s,t),live:1,attr:'data-edit-s',sub:(s.last4?'•••• '+esc(s.last4)+' · ':'')+esc(s.type)+(s.rate?' · '+rateTxt(s):'')}))},
    {key:'inv',title:'Ahorros e inversiones',color:'var(--grow)',icon:'<path d="M12 21v-8.5"/><path d="M12 12.5c0-4.2 3-7.5 8.5-7.5 0 4.2-3 7.5-8.5 7.5z"/><path d="M12 15c0-3-2.6-5.6-7.5-5.6 0 3.6 2.6 5.6 7.5 5.6z"/>',unit:['inversión','inversiones'],add:['addInv','Agregar inversión'],empty:'Certificados, bonos, SBB, mutuos o fondos.',
      items:inv.map(s=>({id:s.id,entity:s.entity,name:s.name,cur:s.cur,val:savValue(s,t),live:1,attr:'data-edit-s',sub:`<span class="ty" style="--tc:${TYPE_C[s.type]||'var(--c-gray)'}">${esc(s.type==='Sell Buy Back (SBB)'?'SBB':s.type)}</span> ${s.rate?rateTxt(s)+' · ':''}${esc(matText(s))}`}))},
    {key:'card',title:'Tarjetas de crédito',color:'var(--debt)',card:1,icon:'<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20M6 15h4"/>',unit:['tarjeta','tarjetas'],add:['addCard','Agregar tarjeta'],empty:'Sin tarjetas de crédito registradas.',
      items:S.cards.map(c=>{const dd=daysTo(dueDate(c));return {id:c.id,entity:c.entity,name:c.name,cur:c.cur,val:Math.max(0,c.limit-c.balance),owe:c.balance,attr:'data-card',sub:`Usado ${c.limit?Math.round(c.balance/c.limit*100):0} % de ${esc(fmt(c.limit,c.cur,0))}${c.balance>0?` <span class="due${dd<=5?' soon':''}">pagar ${dd===0?'hoy':dd===1?'mañana':'en '+dd+' d'}</span>`:''}`}})}
  ];
  const full=groups.filter(g=>g.items.length),miss=groups.filter(g=>!g.items.length);
  $('#view').innerHTML=`<div class="res-g"><div class="col-a">
    ${S.onboarded||S.example?'':`<button class="onb-cta" id="goOnb"><span><b>Empieza tu organización financiera</b><small>${S.onbDraft&&S.onbDraft.step>1?'Sigue donde lo dejaste · paso '+Math.min(S.onbDraft.step,total)+' de '+total:'Unos 5 minutos, paso a paso.'}</small></span><span aria-hidden="true">›</span></button>`}
    <div class="qa" role="group" aria-label="Registrar">
      <button type="button" class="qa-b inc" id="qaInc"><span class="qa-ic"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span>Ingreso</button>
      <button type="button" class="qa-b exp" id="qaExp"><span class="qa-ic"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></span>Gasto</button>
      <button type="button" class="qa-b more" id="qaMore" aria-label="Agregar cuentas, tarjetas, préstamos, inversiones y más"><span class="qa-ic"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8.5v7M8.5 12h7"/></svg></span>Agregar</button>
    </div>
    ${payBannerHTML()}
    <section class="deep hero brandc${neg?' neg':''}">
      <div class="hero-top"><span class="lbl">Saldo neto · ${S.base}</span>${F.debt>0?`<div class="seg-mini" role="group" aria-label="Incluir deudas"><button data-nm="con" aria-pressed="${netMode==='con'}">Con deudas</button><button data-nm="sin" aria-pressed="${netMode==='sin'}">Sin deudas</button></div>`:''}</div>
      <div class="big num" id="netBig">${split(net,S.base,2)}</div>
      <div class="hrows num">
        <div><span>Tienes</span><b id="netA">${esc(fmt(F.assets,S.base,0))}</b></div>
        ${F.debt>0?`<div><span>Debes</span><b>${esc(fmt(F.debt,S.base,0))}</b></div>`:''}
        ${sameAvail?'':`<div><span>Disponible en cuentas</span><b id="netD">${esc(fmt(avail,S.base,0))}</b></div>`}
      </div>
    </section>
    ${calBtnHTML()}
    ${ioPanel()}
    </div><div class="col-b">
    <h2 class="sec">Desglose de movimientos</h2>
    ${movListHTML()}
    <h2 class="sec">¿Dónde está tu dinero?</h2>
    <div class="grps">${full.map(holdGroup).join('')}</div>
    ${miss.length?`<div class="grp-miss">${miss.map(g=>`<button type="button" class="grp-add" id="${g.add[0]}" style="--gc:${g.color}">+ ${g.add[1]}</button>`).join('')}</div>`:''}
    </div></div>`;
  document.querySelectorAll('[data-nm]').forEach(b=>b.onclick=()=>{netMode=b.dataset.nm;render()});
  document.querySelectorAll('details.grp,details.ent').forEach(d=>d.ontoggle=()=>{openG[d.dataset.g]=d.open});
  const go=$('#goOnb');if(go)go.onclick=()=>openOnboarding(false);
  $('#qaInc').onclick=()=>openExpense('ingreso');$('#qaExp').onclick=()=>openExpense('gasto');$('#qaMore').onclick=openAddMenu;
  $('#addAcc').onclick=()=>openSaving({type:'Cuenta de ahorro'});$('#addCard').onclick=()=>openCard();$('#addInv').onclick=()=>openInvChooser();
  $('#calOpen').onclick=()=>openCalendar();
  bindGo();bindIo();bindMov();bindEdit();bindPay();
}

/* Tocar un producto abre su ficha (cuentas y bonos) o su formulario (otras inversiones) */
function openItem(id){const s=S.savings.find(x=>x.id===id);if(!s)return;if(ACCT_TYPES.includes(s.type))return openAcctDetail(id);if(s.bond)return openBondDetail(id);openSaving({id})}
function bindEdit(){
  document.querySelectorAll('[data-edit-e]').forEach(b=>b.onclick=()=>openExpense('gasto',{},b.dataset.editE));
  document.querySelectorAll('[data-edit-i]').forEach(b=>b.onclick=()=>openExpense('ingreso',{},b.dataset.editI));
  document.querySelectorAll('[data-edit-s]').forEach(b=>b.onclick=()=>openItem(b.dataset.editS));
  document.querySelectorAll('[data-edit-t]').forEach(b=>b.onclick=()=>openTransfer(b.dataset.editT));
  document.querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>openCardActions(b.dataset.card));
}
/* Borrar exige dos pasos: tocar «Eliminar» y luego confirmar */
function confirmDel(what,detail,onYes){
  sheet(`<div class="confirm"><span class="confirm-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/></svg></span>
    <h3>¿Eliminar «${esc(what)}»?</h3><p class="lead-s">${detail}</p>
    <div class="form"><button class="btn" type="button" id="cfYes" style="--accent:var(--spend)">Sí, eliminar</button><button class="btn ghost" type="button" id="cfNo">No, conservarlo</button></div></div>`,'var(--spend)');
  $('#cfNo').onclick=close;$('#cfYes').onclick=()=>{close();onYes()};
}
function viaEffect(x,kind){const o=viaObj(x.via);if(!o)return '';const a=esc(fmt(conv(x.amt,x.cur,o.o.cur),o.o.cur));
  return o.k==='c'?` Se liberarán ${a} en «${esc(o.o.name)}».`:kind==='i'?` Se restarán ${a} de «${esc(o.o.name)}».`:` Se devolverán ${a} a «${esc(o.o.name)}».`}
function delDetail(coll,x){
  return {expenses:'El gasto saldrá de tus totales y gráficos.'+viaEffect(x,'e'),incomes:'El ingreso saldrá de tus totales y gráficos.'+viaEffect(x,'i'),
    savings:'Se quitará de tus ahorros junto con los intereses calculados.',cards:'Se quitará la tarjeta y su consumo de tu deuda.',loans:'Se quitará el préstamo y sus cuotas.',recurring:'Dejarás de ver este pago fijo y sus avisos.'}[coll]||'Se quitará este registro.';
}
function removeItem(coll,id){
  const i=S[coll].findIndex(x=>x.id===id);if(i<0)return;
  const item=S[coll].splice(i,1)[0],mv=coll==='expenses'?'e':coll==='incomes'?'i':null;
  if(mv)applyVia(item,-1,mv);save();render();
  undoToast('Eliminado',()=>{S[coll].splice(Math.min(i,S[coll].length),0,item);if(mv)applyVia(item,1,mv);save();render();toast('Restaurado')});
}
function openCardActions(id){
  const c=S.cards.find(x=>x.id===id);if(!c)return;
  sheet(`<h3>${esc(c.name)}</h3><p class="lead-s">Consumido <b>${esc(fmt(c.balance,c.cur))}</b> de ${esc(fmt(c.limit,c.cur,0))} · disponible ${esc(fmt(Math.max(0,c.limit-c.balance),c.cur,0))}</p>
    <div class="form" style="margin-top:14px"><button class="btn" type="button" id="caBuy" style="--accent:var(--spend)">Registrar consumo</button><button class="btn ghost" type="button" id="caPay">Registrar pago</button><button class="btn ghost" type="button" id="caEdit">Editar tarjeta</button><button class="link-btn danger" type="button" id="caDel">Eliminar tarjeta</button></div>`,'var(--brand)');
  $('#caBuy').onclick=()=>openExpense('gasto',{via:'c:'+id});$('#caPay').onclick=()=>openCardMove(id);$('#caEdit').onclick=()=>openCard(id);
  $('#caDel').onclick=()=>holdConfirm({title:'¿Eliminar «'+esc(c.name)+'»?',detail:'Se borra la tarjeta. Los gastos que hiciste con ella se conservan.',list:[],ms:3000,confirm:'Sí, eliminar tarjeta',keep:'No, conservarla',onConfirm:()=>removeItem('cards',id)});
}

/* ---------- Tasa variable ---------- */
const rateTxt=s=>(s.vr?'≈ ':'')+s.rate.toFixed(2)+' %'+(s.rateKind==='efectiva'?' efectiva':'')+(s.vr?' variable':'');

/* ---------- Cobros fijos (salario): «¿Ya cobraste?» ---------- */
function payOccs(p){
  const n=new Date(),sod=new Date(n.getFullYear(),n.getMonth(),n.getDate()),L=[];
  for(const mo of [-1,0]){const y=n.getFullYear(),m=n.getMonth()+mo,last=new Date(y,m+1,0).getDate();
    p.days.forEach(d=>{const dt=new Date(y,m,Math.min(d,last),12);if(dt<=new Date(+sod+DAY-1)&&dt.getTime()>=(p.start||0)-DAY&&!p.done[isoLocal(dt)])L.push(dt)})}
  return L.sort((a,b)=>a-b);
}
function pendingPays(){const t=today();return (S.paydays||[]).flatMap(p=>(p.snooze&&p.snooze>t)?[]:payOccs(p).map(d=>({p,d})))}
function payBannerHTML(){
  const L=pendingPays();if(!L.length)return '';const {p,d}=L[0];
  return `<section class="payq" aria-label="Confirmar cobro"><div class="payq-t"><span class="payq-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/></svg></span>
    <div><b>¿Ya cobraste ${p.name==='Salario'?'tu salario':'«'+esc(p.name)+'»'}?</b><span>${esc(fmt(p.amt,p.cur))} · ${esc(viaName(p.via))} · ${esc(dayShort.format(d))}</span></div></div>
    <div class="payq-b"><button type="button" class="btn" id="payYes" data-pd="${p.id}" data-dt="${isoLocal(d)}">Sí, ya cobré</button><button type="button" class="btn ghost" id="payNo" data-pd="${p.id}">Todavía no</button></div>
    <button type="button" class="link-btn payq-skip" id="paySkip" data-pd="${p.id}" data-dt="${isoLocal(d)}">Este no lo voy a cobrar</button>${L.length>1?`<p class="hint">Y ${L.length-1} ${L.length===2?'cobro más':'cobros más'} por confirmar.</p>`:''}</section>`;
}
function bindPay(){
  const y=$('#payYes');if(!y)return;const P=id=>(S.paydays||[]).find(p=>p.id===id);
  y.onclick=()=>{const p=P(y.dataset.pd),k=y.dataset.dt;if(!p)return;const x={id:uid(),desc:p.name,src:p.src||'salario',amt:p.amt,cur:p.cur,date:parseDate(k),via:p.via};
    if(!viaObj(x.via))x.via='';applyVia(x,1,'i');S.incomes.push(x);p.done[k]='y';save();render();
    undoToast(x.via?`Sumamos ${fmt(x.amt,x.cur)} a ${viaName(x.via)}`:'Cobro registrado',()=>{applyVia(x,-1,'i');S.incomes=S.incomes.filter(i=>i.id!==x.id);delete p.done[k];save();render()})};
  $('#payNo').onclick=()=>{const p=P($('#payNo').dataset.pd);if(!p)return;p.snooze=isoLocal(new Date(Date.now()+DAY));save();render();toast('Te preguntamos de nuevo mañana')};
  $('#paySkip').onclick=()=>{const b=$('#paySkip'),p=P(b.dataset.pd);if(!p)return;p.done[b.dataset.dt]='n';save();render();toast('Listo, no lo contamos')};
}
function acctOpts(val,extra){return accts().filter(s=>s.type!=='Efectivo').map(s=>`<option value="a:${s.id}" ${val==='a:'+s.id?'selected':''}>${esc(s.name)}</option>`).join('')+(extra||'')}
function openPayday(id){
  const ed=id?(S.paydays||[]).find(p=>p.id===id):null,v=ed||{name:'Salario',amt:'',cur:'DOP',freq:'mensual',days:[30],via:(accts()[0]?'a:'+accts()[0].id:'')};
  let q=v.freq==='quincenal';
  const draw=()=>{const keep=$('#pdAmt')?{name:$('#pdName').value,amt:$('#pdAmt').value,cur:$('#pdCur').value,via:$('#pdVia').value,src:(document.querySelector('[name=pdS]:checked')||{}).value||v.src}:{};Object.assign(v,keep);
  sheet(`<h3>${ed?'Editar cobro fijo':'Nuevo cobro fijo'}</h3><form class="form" id="f">
    <fieldset class="field"><legend>¿Qué tipo de ingreso es?</legend><div class="o-chips">${Object.keys(INC).map(k=>pill('pdS',k,k==='otros'?'Otro':INC[k].replace('Trabajo independiente','Independiente').replace('Alquileres cobrados','Alquiler'),(v.src||'salario')===k)).join('')}</div>${otroBox('pdO','Ej. Pensión, mesada',v.src==='otros')}</fieldset>
    <div class="field"><label for="pdName">Nombre</label><input id="pdName" value="${esc(v.name)}" maxlength="40" placeholder="Ej. Salario de la empresa"></div>
    <fieldset class="field"><legend>¿Cada cuánto cobras?</legend><div class="choice two-c">${pill('pdF','mensual','Una vez al mes',!q)}${pill('pdF','quincenal','Cada quincena',q)}</div></fieldset>
    <div class="two"><div class="field"><label for="pdAmt">${q?'Monto por quincena':'Monto al mes'}</label><input id="pdAmt" data-money="pdCur" inputmode="decimal" value="${esc(String(v.amt||''))}" placeholder="0.00"></div><div class="field"><label for="pdCur">Moneda</label>${curSel('pdCur',v.cur)}</div></div>
    ${q?`<div class="two"><div class="field"><label for="pdD1">Primer cobro, día</label><input id="pdD1" inputmode="numeric" maxlength="2" value="${v.days[0]||15}"></div><div class="field"><label for="pdD2">Segundo cobro, día</label><input id="pdD2" inputmode="numeric" maxlength="2" value="${v.days[1]||30}"></div></div>`
      :`<div class="field"><label for="pdD">Día de cobro</label><input id="pdD" inputmode="numeric" maxlength="2" value="${v.days[v.days.length-1]||30}"></div>`}
    <div class="field"><label for="pdVia">¿A qué cuenta te llega?</label><select id="pdVia">${acctOpts(v.via,`<option value="" ${!v.via?'selected':''}>Efectivo u otra</option>`)}</select></div>
    <p class="hint">El día del cobro aparece en tu calendario y en el Resumen para que confirmes si te llegó; al confirmarlo se suma a esa cuenta.</p>
    <div class="err" id="err"></div><button class="btn" type="submit" style="--accent:var(--brand)">${ed?'Guardar cambios':'Guardar'}</button>
    ${ed?`<button type="button" class="link-btn danger del-link" id="pdDel">Eliminar este cobro fijo</button>`:''}</form>`,'var(--brand)');
  document.querySelectorAll('[name=pdF]').forEach(r=>r.onchange=()=>{q=r.value==='quincenal';draw()});
  document.querySelectorAll('[name=pdS]').forEach(r=>r.onchange=()=>{$('#pdO').hidden=r.value!=='otros';const nm=$('#pdName');if(!ed&&(!nm.value||Object.values(INC).includes(nm.value)))nm.value=r.value==='otros'?'':INC[r.value]})
  if(ed)$('#pdDel').onclick=()=>confirmDel(ed.name,'Dejarás de recibir la pregunta «¿Ya cobraste?». Los cobros ya registrados se quedan.',()=>{S.paydays=S.paydays.filter(p=>p.id!==ed.id);save();render();toast('Cobro fijo eliminado')});
  $('#f').onsubmit=e=>{e.preventDefault();const amt=money($('#pdAmt').value);if(!(amt>0))return $('#err').textContent='Escribe el monto en números, por ejemplo 45000.';
    const dd=x=>Math.min(31,Math.max(1,parseInt(x,10)||0)),days=q?[dd($('#pdD1').value),dd($('#pdD2').value)]:[dd($('#pdD').value)];
    if(days.some(d=>!(d>=1)))return $('#err').textContent='Escribe el día del mes, del 1 al 31.';
    let src=(document.querySelector('[name=pdS]:checked')||{}).value||'salario';const on=otroVal('pdO');if(src==='otros'&&on.n&&on.keep)src=addCustomCat('inc',on.n)||'otros';
    const x={name:$('#pdName').value.trim()||(src==='otros'?(on.n||'Cobro fijo'):INC[src]),src,amt,cur:$('#pdCur').value,freq:q?'quincenal':'mensual',days:[...new Set(days)].sort((a,b)=>a-b),via:$('#pdVia').value};
    if(ed)Object.assign(ed,x);else{S.paydays=S.paydays||[];
      const n=new Date(),done={};x.days.forEach(d=>{const dt=new Date(n.getFullYear(),n.getMonth(),Math.min(d,new Date(n.getFullYear(),n.getMonth()+1,0).getDate()));if(dt.getDate()<n.getDate())done[isoLocal(dt)]='n'});
      S.paydays.push({id:uid(),...x,done,start:Date.now()})}
    save();close();render();toast('Cobro fijo guardado')};
  };draw();
}

/* ---------- Retiro de efectivo y transferencias entre cuentas ---------- */
function applyTr(x,sign){const a=viaObj(x.from),b=viaObj(x.to);if(a)a.o.principal-=x.amt*sign;if(b)b.o.principal+=conv(x.amt,x.cur,b.o.cur)*sign}
function openTransfer(id,pre={}){
  const ed=id?(S.transfers||[]).find(x=>x.id===id):null,A=accts(),cash=A.find(s=>s.type==='Efectivo');
  const bank=A.filter(s=>s.type!=='Efectivo');
  if(!ed&&!bank.length){sheet(`<h3>Retiro o transferencia</h3><p class="lead-s">Primero agrega la cuenta de banco de donde sale el dinero.</p><div class="form" style="margin-top:14px"><button class="btn" type="button" id="trAcc" style="--accent:var(--brand)">Agregar cuenta</button></div>`,'var(--brand)');$('#trAcc').onclick=()=>openSaving({type:'Cuenta de ahorro'});return}
  let kind=ed?(viaObj(ed.to)&&viaObj(ed.to).o.type==='Efectivo'?'cash':'tr'):(pre.kind||'cash');
  const pf=pre.from&&bank.find(b=>'a:'+b.id===pre.from);
  const v=ed?{from:ed.from,to:ed.to,amt:String(ed.amt),date:isoLocal(new Date(ed.date))}:{from:'a:'+(pf||bank[0]).id,to:cash?'a:'+cash.id:'new',amt:'',date:today()};
  const draw=()=>{if($('#trAmt')){v.from=$('#trFrom').value;v.amt=$('#trAmt').value;v.date=$('#trDate').value;if($('#trTo'))v.to=$('#trTo').value}
    const fo=viaObj(v.from),cur=fo?fo.o.cur:'DOP',td=today();
    const toOpts=A.filter(s=>'a:'+s.id!==v.from&&s.type!=='Efectivo').map(s=>`<option value="a:${s.id}" ${v.to==='a:'+s.id?'selected':''}>${esc(s.name)}</option>`).join('');
    if(kind==='cash')v.to=cash?'a:'+cash.id:'new';else if(!toOpts.includes(`"${v.to}"`)){const f=A.find(s=>'a:'+s.id!==v.from&&s.type!=='Efectivo');v.to=f?'a:'+f.id:''}
    sheet(`<div class="mv-top">${ed?`<h3>${kind==='cash'?'Editar retiro':'Editar transferencia'}</h3>`:`<div class="kind-tog neutral" role="group" aria-label="Tipo"><button type="button" data-tk="cash" aria-pressed="${kind==='cash'}">Retiro de efectivo</button><button type="button" data-tk="tr" aria-pressed="${kind==='tr'}">Entre mis cuentas</button></div>`}</div>
    <form class="form" id="f">
      <div class="field"><label for="trFrom">${kind==='cash'?'¿De qué cuenta sacaste?':'¿De qué cuenta sale?'}</label><select id="trFrom">${A.filter(s=>s.type!=='Efectivo').map(s=>`<option value="a:${s.id}" ${v.from==='a:'+s.id?'selected':''}>${esc(s.name)} · ${esc(fmt(savValue(s,Date.now()),s.cur,0))}</option>`).join('')}</select></div>
      ${kind==='tr'?(toOpts?`<div class="field"><label for="trTo">¿A qué cuenta va?</label><select id="trTo">${toOpts}</select></div>`:'<p class="hint">Necesitas al menos dos cuentas de banco para transferir entre ellas.</p>')
        :`<p class="tr-to">${CASH_IC}<span>Va a <b>Efectivo</b>${cash?' · tienes '+esc(fmt(savValue(cash,Date.now()),cash.cur,0)):' · lo creamos para ti'}</span></p>`}
      <div class="field"><label for="trAmt">Monto</label><div class="o-amtline"><span class="num">${curSym[cur]}</span><input id="trAmt" data-money="${cur}" inputmode="decimal" value="${esc(v.amt)}" placeholder="0.00"></div></div>
      <fieldset class="field"><legend>Fecha</legend><div class="date-pick"><button type="button" data-dq="${td}" aria-pressed="${v.date===td}">Hoy</button><button type="button" data-dq="${isoLocal(new Date(Date.now()-DAY))}" aria-pressed="${v.date===isoLocal(new Date(Date.now()-DAY))}">Ayer</button><input type="date" id="trDate" value="${v.date}" max="${td}" aria-label="Otra fecha"></div></fieldset>
      <p class="hint">No cuenta como gasto ni como ingreso: solo mueve tu dinero de un lugar a otro.</p>
      <div class="err" id="err"></div><button class="btn" type="submit" style="--accent:var(--brand)">${ed?'Guardar cambios':kind==='cash'?'Guardar retiro':'Guardar transferencia'}</button>
      ${ed?`<button type="button" class="link-btn danger del-link" id="trDel">Eliminar</button>`:''}</form>`,'var(--brand)');
    document.querySelectorAll('[data-tk]').forEach(b=>b.onclick=()=>{kind=b.dataset.tk;draw()});
    $('#trFrom').onchange=draw;
    document.querySelectorAll('[data-dq]').forEach(b=>b.onclick=()=>{$('#trDate').value=b.dataset.dq;document.querySelectorAll('[data-dq]').forEach(x=>x.setAttribute('aria-pressed',x===b))});
    if(ed)$('#trDel').onclick=()=>confirmDel(kind==='cash'?'Retiro de efectivo':'Transferencia','El dinero vuelve a la cuenta de donde salió.',()=>{applyTr(ed,-1);S.transfers=S.transfers.filter(x=>x.id!==ed.id);save();render();toast('Eliminado')});
    $('#f').onsubmit=e=>{e.preventDefault();const amt=money($('#trAmt').value),dv=$('#trDate').value;let to=kind==='cash'?v.to:($('#trTo')||{}).value;
      if(!(amt>0))return $('#err').textContent='Escribe el monto en números, por ejemplo 2000.';
      if(!to)return $('#err').textContent='Elige a qué cuenta va el dinero.';
      if(ed)applyTr(ed,-1);
      if(to==='new'){const c={id:uid(),name:'Efectivo',entity:'Efectivo',type:'Efectivo',cur,principal:0,rate:0,start:parseDate(dv),months:1,open:true,isr:false,liquid:true};S.savings.push(c);to='a:'+c.id}
      const x={id:ed?ed.id:uid(),from:$('#trFrom').value,to,amt,cur,date:parseDate(dv),desc:kind==='cash'?'Retiro de efectivo':'Transferencia'};
      S.transfers=S.transfers||[];if(ed)Object.assign(ed,x);else S.transfers.push(x);applyTr(x,1);
      save();close();render();toast(kind==='cash'?'Retiro guardado':'Transferencia guardada')};
    if(!ed)setTimeout(()=>{const a=$('#trAmt');if(a&&!a.value)a.focus()},60);
  };draw();
}


/* ---------- Calendario de pagos y cobros ---------- */
const INT_F={'Certificado':1,'Bono':6,'Sell Buy Back (SBB)':0,'Mutuo':0,'Otro':0};
const intF=s=>s.intFreq!==undefined?s.intFreq:(INT_F[s.type]!==undefined?INT_F[s.type]:null);
const dim=(y,m)=>new Date(y,m+1,0).getDate();
function addM(t0,k){const d=new Date(t0),x=new Date(d.getFullYear(),d.getMonth()+k,1,12);x.setDate(Math.min(d.getDate(),dim(x.getFullYear(),x.getMonth())));return x}
function calEvents(a,b){
  const E=[],push=(d,o)=>{const t=+d;if(t>=a&&t<=b)E.push({t,...o})};
  const months=[];for(let d=new Date(new Date(a).getFullYear(),new Date(a).getMonth(),1);+d<=b;d=new Date(d.getFullYear(),d.getMonth()+1,1))months.push([d.getFullYear(),d.getMonth()]);
  S.cards.forEach(c=>{if(c.balance>0){const d=dueDate(c);d.setHours(12);push(d,{k:'out',g:'debt',ic:'card',title:'Pago de '+c.name,sub:'Mínimo '+fmt(minPay(c),c.cur,0)+' · total',amt:c.balance,cur:c.cur,go:'card:'+c.id})}});
  S.loans.forEach(l=>{const st=loanState(l);if(st.left<=0.005)return;for(let k=st.n+1,i=0;k<=st.n+st.rem&&i<600;k++,i++){const d=addM(l.start,k);if(+d>b)break;
    push(d,{k:'out',g:'debt',ic:'loan',title:'Cuota de '+l.name,sub:'Cuota '+k+' de '+(st.n+st.rem)+' · '+l.entity,amt:Math.min(st.cuota,st.left+st.left*l.rate/1200),cur:l.cur,go:'loan:'+l.id})}});
  S.recurring.forEach(r=>months.forEach(([y,m])=>{const d=new Date(y,m,Math.min(r.day,dim(y,m)),12),done=r.lastPaid===y+'-'+(m+1);
    push(d,{k:'out',g:'fix',ic:'fix',title:r.name,sub:done?'Ya pagado':'Gasto fijo',amt:r.amt,cur:r.cur,done,go:'fix:'+r.id})}));
  (S.paydays||[]).forEach(p=>months.forEach(([y,m])=>p.days.forEach(dd=>{const d=new Date(y,m,Math.min(dd,dim(y,m)),12),st=p.done[isoLocal(d)];if(+d<(p.start||0)-DAY)return;
    push(d,{k:'in',g:'pay',ic:'pay',title:p.name,sub:st==='y'?'Ya cobrado':st==='n'?'No se cobró':'Cobro fijo · '+viaName(p.via),amt:p.amt,cur:p.cur,done:!!st,go:'pay:'+p.id})})));
  (S.reminders||[]).forEach(r=>{const t0=new Date(r.date);const tries=r.rep==='mes'?months.map(([y,m])=>new Date(y,m,Math.min(t0.getDate(),dim(y,m)),12)):r.rep==='ano'?months.filter(([,m])=>m===t0.getMonth()).map(([y,m])=>new Date(y,m,Math.min(t0.getDate(),dim(y,m)),12)):[t0];
    tries.forEach(d=>{if(+d<+t0-DAY/2)return;push(d,{k:r.k==='in'?'in':r.k==='out'?'out':'rem',g:'rem',ic:'rem',title:r.title,sub:'Recordatorio'+(r.rep==='mes'?' · cada mes':r.rep==='ano'?' · cada año':''),amt:r.amt||0,cur:r.cur||'DOP',go:'rem:'+r.id})})});
  S.savings.filter(s=>!isAcct(s)&&s.bond&&s.status!=='liquidada').forEach(s=>{bondSchedule(s).forEach(c=>{if(c.st==='recibido')return;
      push(new Date(c.d),{k:'in',g:'inv',ic:'int',title:'Cupón · '+s.name,sub:c.st==='por registrar'?'¿Ya lo cobraste? Regístralo':'Cupón esperado',amt:c.exp,cur:s.cur,go:'sav:'+s.id})});
    if(s.due)push(new Date(s.due),{k:'in',g:'inv',ic:'mat',title:'Vence '+s.name,sub:'Recibes el valor nominal',amt:bN(s.bond),cur:s.cur,go:'sav:'+s.id})});
  S.savings.filter(s=>!isAcct(s)&&!s.bond&&s.status!=='liquidada').forEach(s=>{const f=intF(s),end=s.open?null:(s.due||null),r=effRate(s);
    if(f&&r){for(let k=1;k<600;k++){const d=addM(s.start,k*f);if(+d>b||(end&&+d>end+DAY/2))break;
      push(d,{k:'in',g:'inv',ic:'int',title:(s.type==='Bono'?'Cupón · ':'Intereses · ')+s.name,sub:(s.vr?'Aproximado · ':'')+(f===1?'Cada mes':'Cada '+f+' meses'),amt:s.principal*r*f/12,cur:s.cur,approx:true,go:'sav:'+s.id})}}
    if(!s.open){let m=nextMat(s,a-1);for(let i=0;m&&m<=b&&i<40;i++){
      push(new Date(m),{k:'in',g:'inv',ic:'mat',title:'Vence '+s.name,sub:f?'Recibes tu capital':'Capital más intereses',amt:f?s.principal:savValue(s,m),cur:s.cur,go:'sav:'+s.id});m=nextMat(s,m+1)}}});
  return E.sort((x,y)=>x.t-y.t||(x.k==='in'?-1:1));
}
const CAL_IC={card:'<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/>',loan:'<path d="M4 20V10l8-6 8 6v10"/><path d="M9 20v-6h6v6"/>',fix:'<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4M16 2v4M4 10h16"/>',pay:'<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/>',int:'<path d="M12 21v-8.5"/><path d="M12 12.5c0-4.2 3-7.5 8.5-7.5 0 4.2-3 7.5-8.5 7.5z"/><path d="M12 15c0-3-2.6-5.6-7.5-5.6 0 3.6 2.6 5.6 7.5 5.6z"/>',mat:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',rem:'<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/>'};
const calRow=e=>`<button type="button" class="cal-r ${e.k}${e.done?' done':''}" data-cgo="${e.go}"><span class="cal-d"><b>${new Date(e.t).getDate()}</b><small>${MESES[new Date(e.t).getMonth()].slice(0,3)}</small></span><span class="cal-ic" aria-hidden="true"><svg viewBox="0 0 24 24">${CAL_IC[e.ic]}</svg></span><span class="cal-t"><b>${esc(e.title)}</b><small>${esc(e.sub)}</small></span><span class="cal-v num">${e.amt?(e.k==='in'?'+':e.k==='out'?'−':'')+(e.approx?'≈ ':'')+esc(fmt(e.amt,e.cur,0)):''}</span></button>`;
function bindCalGo(){document.querySelectorAll('[data-cgo]').forEach(b=>b.onclick=()=>{const [k,id]=b.dataset.cgo.split(':');
  if(k==='card')openCardActions(id);else if(k==='sav')openItem(id);else if(k==='pay')openPayday(id);else if(k==='rem')openReminder(id);else if(k==='loan')openLoanActions(id);else{close();goTo('gastos','fijos')}})}
function nextPaysHTML(filter,fk){
  const n=new Date(),a=+new Date(n.getFullYear(),n.getMonth(),n.getDate());let E=calEvents(a,a+31*DAY-1).filter(e=>!e.done);if(filter)E=E.filter(filter);
  if(!E.length)return '';
  return `<section class="panel calp"><div class="panel-h"><b>Próximos pagos</b><span class="sec-note">30 días</span></div>
    <div class="cal-list">${E.slice(0,4).map(calRow).join('')}</div>
    ${E.length>4?`<button type="button" class="grp-add" id="calMore" data-fk="${fk||''}" style="--gc:var(--brand)">Ver los ${E.length} en el calendario</button>`:''}</section>`;
}
function bindNextPays(){const m=$('#calMore');if(m)m.onclick=()=>openCalendar(null,null,null,m.dataset.fk||undefined);bindCalGo()}
const CAL_F={inv:{t:'Vencimientos y cupones',f:e=>e.g==='inv'},debt:{t:'Pagos de tarjetas y préstamos',f:e=>e.g==='debt'}};
function openCalendar(y0,m0,sel0,fk){
  const n=new Date(),F=CAL_F[fk];let y=y0!==undefined&&y0!==null?y0:n.getFullYear(),m=m0!==undefined&&m0!==null?m0:n.getMonth(),sel=sel0||(y===n.getFullYear()&&m===n.getMonth()?n.getDate():1);
  const a=+new Date(y,m,1),b=+new Date(y,m+1,1)-1;let E=calEvents(a,b);if(F)E=E.filter(F.f);const by={};E.forEach(e=>{const d=new Date(e.t).getDate();(by[d]=by[d]||[]).push(e)});
  const out=E.filter(e=>e.k==='out').reduce((s,e)=>s+conv(e.amt,e.cur,S.base),0),inn=E.filter(e=>e.k==='in').reduce((s,e)=>s+conv(e.amt,e.cur,S.base),0);
  const lead=(new Date(y,m,1).getDay()+6)%7,isT=d=>y===n.getFullYear()&&m===n.getMonth()&&d===n.getDate();
  const cells=[...Array(lead).fill('<span></span>'),...[...Array(dim(y,m)).keys()].map(i=>{const d=i+1,L=by[d]||[];
    return `<button type="button" class="cal-day${isT(d)?' today':''}" data-cd="${d}" aria-pressed="${d===sel}" aria-label="${d} de ${MESES[m]}${L.length?': '+L.length+(L.length===1?' movimiento':' movimientos'):''}"><span>${d}</span><i aria-hidden="true">${L.some(e=>e.k==='out')?'<em class="o"></em>':''}${L.some(e=>e.k==='in')?'<em class="n"></em>':''}${L.some(e=>e.k==='rem')?'<em class="r"></em>':''}</i></button>`})];
  const L=by[sel]||[],keepSc=y0!==undefined&&$('.sheet')?$('.sheet').scrollTop:0;
  sheet(`<div class="cal-hd"><h3>${F?F.t:'Calendario de pagos'}</h3>${F?'':'<button type="button" class="cal-addb" id="clAdd"><span aria-hidden="true">+</span> Agregar</button>'}</div>
    <div class="mp-y"><button type="button" class="ym-arr" id="clPrev" aria-label="Mes anterior">‹</button><b>${MESES[m][0].toUpperCase()+MESES[m].slice(1)} de ${y}</b><button type="button" class="ym-arr" id="clNext" aria-label="Mes siguiente">›</button></div>
    <div class="cal-sum num">${fk==='inv'?'':`<span><em class="o"></em>Pagas <b>−${esc(fmt(out,S.base,0))}</b></span>`}${fk==='debt'?'':`<span><em class="n"></em>Recibes <b>+${esc(fmt(inn,S.base,0))}</b></span>`}</div>
    <div class="cal-g" aria-hidden="true">${['L','M','M','J','V','S','D'].map(d=>`<span class="cal-wd">${d}</span>`).join('')}</div>
    <div class="cal-g" role="group" aria-label="Días">${cells.join('')}</div>
    <div class="cal-dh"><span>${sel} de ${MESES[m]}</span>${F?'':`<button type="button" class="link-btn" id="clRem">+ Recordatorio este día</button>`}</div>
    <div class="cal-list">${L.length?L.map(calRow).join(''):'<p class="hint center" style="margin:10px 0">Nada para este día.</p>'}</div>
    <p class="hint">${fk==='debt'?'Las tarjetas muestran solo su próximo pago.':'Intereses aproximados según la tasa, con ISR si aplica.'+(fk?'':' Las tarjetas muestran solo su próximo pago.')}</p>`,'var(--brand)');
  if(keepSc)$('.sheet').scrollTop=keepSc;
  $('#clPrev').onclick=()=>{const d=new Date(y,m-1,1);openCalendar(d.getFullYear(),d.getMonth(),1,fk)};
  $('#clNext').onclick=()=>{const d=new Date(y,m+1,1);openCalendar(d.getFullYear(),d.getMonth(),1,fk)};
  document.querySelectorAll('[data-cd]').forEach(c=>c.onclick=()=>openCalendar(y,m,+c.dataset.cd,fk));
  const ad=$('#clAdd');if(ad)ad.onclick=()=>openCalAdd(isoLocal(new Date(y,m,sel)));
  const rm=$('#clRem');if(rm)rm.onclick=()=>openReminder(null,isoLocal(new Date(y,m,sel)));
  bindCalGo();
}
function openCalAdd(iso){
  const it=(id,ic,c,t,s)=>`<button type="button" class="menu-r" id="${id}"><span class="menu-ic" style="--mc:${c}"><svg viewBox="0 0 24 24">${ic}</svg></span><span><b>${t}</b><small>${s}</small></span>${chev}</button>`;
  sheet(`<h3>Agregar al calendario</h3><div class="menu">
    ${it('caFix',CAL_IC.fix,'var(--spend)','Gasto fijo','Alquiler, luz, colegio… algo que pagas cada mes')}
    ${it('caPay',CAL_IC.pay,'var(--grow)','Ingreso fijo','Salario, pensión, alquiler que cobras')}
    ${it('caRem',CAL_IC.rem,'var(--brand)','Recordatorio','Una fecha que no quieres olvidar')}
    ${it('caCard',CAL_IC.card,'var(--debt)','Tarjeta de crédito','Te mostramos su fecha de pago')}
    ${it('caLoan',CAL_IC.loan,'var(--debt)','Préstamo','Te mostramos cada cuota')}
  </div>`,'var(--brand)');
  $('#caFix').onclick=()=>openRecurring();$('#caPay').onclick=()=>openPayday();$('#caRem').onclick=()=>openReminder(null,iso);$('#caCard').onclick=()=>openCard();$('#caLoan').onclick=()=>openLoan();
}
function openReminder(id,iso){
  const ed=id?(S.reminders||[]).find(r=>r.id===id):null,r=ed||{title:'',date:iso?parseDate(iso):Date.now(),rep:'no',k:'rem',amt:'',cur:'DOP'};
  sheet(`<h3>${ed?'Editar recordatorio':'Nuevo recordatorio'}</h3><form class="form" id="f" novalidate>
    <div class="field"><label for="rT">¿Qué quieres recordar?</label><input id="rT" value="${esc(r.title)}" maxlength="50" placeholder="Ej. Renovar el marbete, pagar el seguro"></div>
    <div class="two"><div class="field"><label for="rD">Fecha</label><input type="date" id="rD" value="${isoLocal(new Date(r.date))}"></div>
      <div class="field"><label for="rR">Se repite</label><select id="rR"><option value="no">No</option><option value="mes" ${r.rep==='mes'?'selected':''}>Cada mes</option><option value="ano" ${r.rep==='ano'?'selected':''}>Cada año</option></select></div></div>
    <fieldset class="field"><legend>¿Hay dinero de por medio? <span class="opt">opcional</span></legend><div class="choice">${pill('rK','rem','No',r.k==='rem')}${pill('rK','out','Es un pago',r.k==='out')}${pill('rK','in','Es un cobro',r.k==='in')}</div></fieldset>
    <div class="two" id="rAF" ${r.k==='rem'?'hidden':''}><div class="field"><label for="rA">Monto</label><input id="rA" inputmode="decimal" value="${r.amt||''}" placeholder="0.00"></div><div class="field"><label for="rC">Moneda</label>${curSel('rC',r.cur||'DOP')}</div></div>
    <p class="err" id="err" role="alert"></p>
    <button class="btn" type="submit">${ed?'Guardar cambios':'Guardar recordatorio'}</button>
    ${ed?'<button type="button" class="link-btn danger del-link" id="rDel">Eliminar recordatorio</button>':''}</form>`,'var(--brand)');
  document.querySelectorAll('[name=rK]').forEach(x=>x.onchange=()=>{$('#rAF').hidden=x.value==='rem'&&x.checked});
  setTimeout(()=>{if(!ed)$('#rT').focus()},60);
  if(ed)$('#rDel').onclick=()=>confirmDel(ed.title,'Se quita del calendario.',()=>{S.reminders=S.reminders.filter(x=>x.id!==ed.id);save();render();toast('Recordatorio eliminado')});
  $('#f').onsubmit=e=>{e.preventDefault();const t=$('#rT').value.trim(),d=$('#rD').value,k=(document.querySelector('[name=rK]:checked')||{}).value||'rem';
    if(!t){$('#rT').focus();return $('#err').textContent='Escribe qué quieres recordar.'}if(!d)return $('#err').textContent='Elige la fecha.';
    const o={id:ed?ed.id:uid(),title:t,date:parseDate(d),rep:$('#rR').value,k,amt:k==='rem'?0:(money($('#rA').value)||0),cur:$('#rC').value};
    S.reminders=S.reminders||[];if(ed)Object.assign(ed,o);else S.reminders.push(o);save();close();render();toast(ed?'Recordatorio actualizado':'Recordatorio guardado')};
}

