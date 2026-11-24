/* ---------- Tabs y FAB ---------- */
function renderTabs(){
  const more={id:'mas',n:'Más',c:'var(--ink)',s:'var(--surface-2)',i:'<circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/>'};
  $('#tabs').innerHTML=[...TABS,more].map(t=>{const on=t.id===view||(t.id==='mas'&&view==='mercado');return `<button role="tab" data-tab="${t.id}" aria-selected="${on}" aria-label="${t.t||t.n}" style="--tc:${t.c};--tcs:${t.s}"><span class="ic"><svg viewBox="0 0 24 24">${t.i}</svg></span>${t.n}</button>`}).join('');
}
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;if(b.dataset.tab==='mas'){openMore();return}view=b.dataset.tab;try{localStorage.setItem(KEY+'.view',view)}catch(err){}render();window.scrollTo({top:0})});
$('#curSeg').addEventListener('click',e=>{const b=e.target.closest('[data-base]');if(!b||b.dataset.base===S.base)return;S.base=b.dataset.base;save();render();toast(S.base==='USD'?'Mostrando todo en dólares':'Mostrando todo en pesos')});
$('#setBtn').addEventListener('click',openSettings);$('#sideSet').addEventListener('click',openSettings);
$('#accBtn').addEventListener('click',()=>openAccount());


/* ---------- Cuentas, tarjetas y medio de pago de cada movimiento ---------- */
const ACCT_TYPES=['Cuenta de ahorro','Cuenta corriente','Efectivo'];
const LOAN_T=['Vehículo','Hipotecario','Personal','Comercial','Estudios','Otro'];
const SAV_T=['Cuenta de ahorro','Cuenta corriente','Certificado','Bono','Sell Buy Back (SBB)','Mutuo','Fondo de inversión','Acciones','Efectivo','Otro'];
const TYPE_PL={'Cuenta de ahorro':'Cuentas de ahorro','Cuenta corriente':'Cuentas corrientes','Certificado':'Certificados','Bono':'Bonos','Sell Buy Back (SBB)':'Sell Buy Back (SBB)','Mutuo':'Mutuos','Fondo de inversión':'Fondos de inversión','Acciones':'Acciones','Efectivo':'Efectivo','Otro':'Otros'};
const TYPE_C={'Cuenta de ahorro':'var(--c1)','Cuenta corriente':'var(--c7)','Certificado':'var(--c3)','Bono':'var(--c2)','Sell Buy Back (SBB)':'var(--c4)','Mutuo':'var(--c5)','Fondo de inversión':'var(--c6)','Acciones':'var(--c8)','Efectivo':'var(--c-gray)','Otro':'var(--c-gray)'};
const INC_C={salario:'var(--c3)',independiente:'var(--c2)',negocio:'var(--c8)',remesa:'var(--c4)',renta:'var(--c7)',otros:'var(--c-gray)'};
const isAcct=s=>ACCT_TYPES.includes(s.type);
const accts=()=>S.savings.filter(isAcct);
function viaObj(v){
  if(!v)return null;const i=v.indexOf(':'),k=v.slice(0,i),id=v.slice(i+1);
  if(k==='a'){const s=S.savings.find(x=>x.id===id);return s?{k,o:s}:null}
  if(k==='c'){const c=S.cards.find(x=>x.id===id);return c?{k,o:c}:null}
  return null;
}
function viaName(v){const o=viaObj(v);if(!o)return v?'Cuenta eliminada':'Efectivo';return o.o.name}
function viaColor(v){
  const o=viaObj(v);if(!o)return 'var(--c-gray)';
  const A=accts(),pal=['var(--c1)','var(--c7)','var(--c3)','var(--c6)','var(--c4)','var(--c5)','var(--c2)','var(--c8)'];
  const i=o.k==='a'?A.indexOf(o.o):A.length+S.cards.indexOf(o.o);return pal[i%pal.length];
}
/* Un gasto con tarjeta de crédito no toca tus cuentas: aumenta lo consumido de la tarjeta. Uno con cuenta, la descuenta. */
function applyVia(x,sign,kind){
  const o=viaObj(x.via);if(!o)return;const d=conv(x.amt,x.cur,o.o.cur)*sign;
  if(o.k==='a')o.o.principal+=kind==='i'?d:-d;
  else if(kind==='e')o.o.balance+=d;
}
function viaOpts(kind,val){
  const A=accts(),avail=c=>Math.max(0,c.limit-c.balance);
  const accO=A.length?`<optgroup label="${kind==='i'?'Tus cuentas':'Cuentas y tarjetas de débito'}">${A.map(s=>`<option value="a:${s.id}" ${val==='a:'+s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</optgroup>`:'';
  const cardO=kind==='e'&&S.cards.length?`<optgroup label="Tarjetas de crédito">${S.cards.map(c=>`<option value="c:${c.id}" ${val==='c:'+c.id?'selected':''}>${esc(c.name)} · disp. ${esc(fmt(avail(c),c.cur,0))}</option>`).join('')}</optgroup>`:'';
  return accO+cardO+`<option value="" ${!val?'selected':''}>${kind==='i'?'Otro (no se suma a una cuenta)':'Efectivo u otro (no descuenta de una cuenta)'}</option>`;
}

/* ---------- Vencimiento de ahorros e inversiones ---------- */
function termMs(s){if(s.open)return MONTH;if(s.due&&s.due>s.start)return s.due-s.start;return Math.max(1,s.months||1)*MONTH}
function nextMat(s,t=Date.now()){if(s.open)return null;const term=termMs(s),el=Math.max(0,t-s.start);return s.start+(Math.floor(el/term)+1)*term}
const longDate=new Intl.DateTimeFormat('es-DO',{day:'numeric',month:'short',year:'numeric'});
function matText(s){const d=nextMat(s);return d?'Vence '+longDate.format(new Date(d)):'Sin vencimiento'}
function addMonthsISO(m){const d=new Date();d.setMonth(d.getMonth()+m);return isoLocal(d)}

/* ---------- Entidades: lista desplegable con «Otra» ---------- */
const ENTS={
  'Bancos múltiples':['Banco Popular','Banreservas','Banco BHD','Scotiabank','Banco Santa Cruz','Banco Caribe','Banco Promerica','Banco Vimenca','Banco López de Haro','Banesco','Banco BDI','Banco Lafise','Bancamérica','Citibank','Qik Banco Digital','Banco Ademi','Banco Activo'],
  'Asociaciones de ahorros':['APAP','Asociación Cibao','Asociación La Nacional','ALAVER','Asociación Duarte','Asociación Mocana','ABONAP','Asociación Maguana','Asociación Romana','Asociación Peravia'],
  'Bancos de ahorro y crédito':['Banco Adopem','Banco Atlántico','Banco BACC','Banco Confisa','Banco Cofaci','Banco Fihogar','Banco Gruficorp','Banco Óptima','Banco Unión','Bancotui','Banfondesa','Bonanza Banco','JMMB Bank','Leasing Confisa','Motor Crédito'],
  'Corporaciones de crédito':['Corporación de Crédito Monumental','Corporación de Crédito Nordestana','Corporación de Crédito Oficorp'],
  'Bancos públicos':['Banco Agrícola','Bandex'],
  'Puestos de bolsa':['Alpha Inversiones','BHD Puesto de Bolsa','Capitalia','CCI Puesto de Bolsa','Citinversiones','Excel Puesto de Bolsa','Interval Puesto de Bolsa','Inversiones & Reservas','Inversiones Popular','Inversiones Santa Cruz','JMMB Puesto de Bolsa','Parallax Valores (Parval)','Primma Valores','United Capital','Vertex Valores'],
  'Fondos de inversión':['AFI Universal','AFI Popular','AFI Reservas','JMMB Funds'],
  'Emisores públicos':['Ministerio de Hacienda','Banco Central']
};
const ALL_ENTS=Object.values(ENTS).flat();
function entPick(id,val){
  const v=(val||'').trim(),other=!!v&&v!=='Sin entidad'&&!ALL_ENTS.includes(v);
  return `<select id="${id}" data-ent><option value="">Elige la entidad</option>${Object.entries(ENTS).map(([g,l])=>`<optgroup label="${g}">${l.map(e=>`<option ${e===v?'selected':''}>${esc(e)}</option>`).join('')}</optgroup>`).join('')}<option value="__o" ${other?'selected':''}>Otra entidad…</option></select><span class="ent-ob" id="${id}_ob" ${other?'':'hidden'}><input id="${id}_o" class="ent-o" value="${other?esc(v):''}" maxlength="40" placeholder="Escribe el nombre de la entidad" aria-label="Nombre de la entidad"><label class="check otro-k"><input type="checkbox" id="${id}_k" checked><span>Agregarla a mi lista de entidades</span></label></span>`;
}
function wireEnt(scope){scope.querySelectorAll('[data-ent]').forEach(s=>{const o=document.getElementById(s.id+'_o'),b=document.getElementById(s.id+'_ob');if(o)s.addEventListener('change',()=>{b.hidden=s.value!=='__o';if(!b.hidden)o.focus()})})}
function readEnt(id){const s=document.getElementById(id);if(!s)return '';if(s.value!=='__o')return s.value;const v=(document.getElementById(id+'_o').value||'').trim(),k=document.getElementById(id+'_k');if(v&&k&&k.checked)addCustomList('customEnts',v);return v}

/* ---------- Períodos ---------- */
const PER={hoy:'Hoy',sem:'Semana',mes:'Mes',d30:'30 días',m3:'3 meses',m6:'6 meses',y1:'1 año',todo:'Todo',fechas:'Rango'};
let per={resumen:'mes',ingresos:'d30',gastos:'d30'},perC={from:'',to:''};
try{Object.assign(per,JSON.parse(localStorage.getItem(KEY+'.per')||'{}'))}catch(e){}
function perRange(k){
  const n=new Date(),y=n.getFullYear(),m=n.getMonth(),sod=new Date(y,m,n.getDate()).getTime(),end=sod+DAY-1;
  switch(k){
    case 'hoy':return [sod,end];
    case 'sem':return [sod-((n.getDay()+6)%7)*DAY,end];
    case 'mes':return [new Date(y,m,1).getTime(),end];
    case 'm3':return [new Date(y,m-2,1).getTime(),end];
    case 'm6':return [new Date(y,m-5,1).getTime(),end];
    case 'y1':return [new Date(y,m-11,1).getTime(),end];
    case 'todo':{const all=[...S.expenses,...S.incomes].map(x=>x.date);const a=all.length?Math.min(...all):sod;return [new Date(new Date(a).getFullYear(),new Date(a).getMonth(),1).getTime(),Math.max(end,...all)]}
    case 'fechas':{const f=perC.from?parseDate(perC.from)-DAY/2:sod-29*DAY,t=perC.to?parseDate(perC.to)+DAY/2-1:end;return [Math.min(f,t),Math.max(f,t)]}
    default:return [sod-29*DAY,end];
  }
}
const inR=(x,R)=>x.date>=R[0]&&x.date<=R[1];
const sumB=(a,x)=>a+conv(x.amt,x.cur,S.base);
function rangeText(R){const a=new Date(R[0]),b=new Date(R[1]);return a.toDateString()===b.toDateString()?longDate.format(a):dateFmt.format(a)+(a.getFullYear()!==b.getFullYear()?' '+a.getFullYear():'')+' – '+longDate.format(b)}
function perChips(key,list,dark){
  return `<div class="per${dark?'':' light'}" role="group" aria-label="Período">${list.map(k=>`<button type="button" data-per="${key}:${k}" aria-pressed="${per[key]===k}">${k==='fechas'?'<svg class="cal" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>':''}${PER[k]}</button>`).join('')}</div>
  ${per[key]==='fechas'?`<div class="per-dates${dark?'':' light'}"><label>Desde<input type="date" data-pf="from" value="${esc(perC.from)}"></label><label>Hasta<input type="date" data-pf="to" value="${esc(perC.to)}"></label></div>`:''}`;
}
function bindPer(){
  document.querySelectorAll('[data-per]').forEach(b=>b.onclick=()=>{const [k,v]=b.dataset.per.split(':');per[k]=v;
    if(v==='fechas'&&!perC.from){const R=perRange('d30');perC.from=isoLocal(new Date(R[0]));perC.to=today()}
    try{localStorage.setItem(KEY+'.per',JSON.stringify(per))}catch(e){}render()});
  document.querySelectorAll('[data-pf]').forEach(i=>i.onchange=()=>{perC[i.dataset.pf]=i.value;render()});
}

/* ---------- Gráficos: dona + lista de barras, y columnas en el tiempo ---------- */
const curSym={DOP:'RD$',USD:'US$',EUR:'€'};
const fmtFit=(v,cur)=>Math.abs(v)>=1e6?(v<0?'−':'')+(curSym[cur]||'')+(Math.abs(v)/1e6).toFixed(2)+' M':fmt(v,cur,0);
function compact(v,cur){const s=curSym[cur]||'',a=Math.abs(v);return (v<0?'−':'')+s+(a>=1e6?(a/1e6).toFixed(a>=1e7?0:1)+' M':a>=1e4?Math.round(a/1e3)+' mil':a>=1e3?(a/1e3).toFixed(1)+' mil':Math.round(a))}
function agg(items,keyFn,nameFn,colorFn,valFn){
  const m=new Map();items.forEach(x=>{const k=keyFn(x);m.set(k,(m.get(k)||0)+(valFn?valFn(x):conv(x.amt,x.cur,S.base)))});
  let parts=[...m.entries()].map(([k,v])=>({k,n:nameFn(k),v,c:colorFn(k)})).filter(p=>p.v>0).sort((a,b)=>b.v-a.v);
  if(parts.length>6){const rest=parts.slice(5).reduce((a,p)=>a+p.v,0);parts=parts.slice(0,5).concat({k:'_o',n:'Otros',v:rest,c:'var(--c-gray)'})}
  return parts;
}
function donutBlock(parts,label){
  const tot=parts.reduce((a,p)=>a+p.v,0);if(!tot)return '<p class="hint">Sin datos en este período.</p>';
  const R=44,C=2*Math.PI*R,gap=parts.length>1?2.2:0;let off=0;
  const arcs=parts.map(p=>{const L=p.v/tot*C,len=Math.max(.6,L-gap);const s=`<circle r="${R}" cx="58" cy="58" fill="none" stroke="${p.c}" stroke-width="15" stroke-dasharray="${len.toFixed(2)} ${(C-len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 58 58)"><title>${esc(p.n)}: ${esc(fmt(p.v,S.base,0))}</title></circle>`;off+=L;return s}).join('');
  return `<div class="dn"><svg class="dn-svg" viewBox="0 0 116 116" role="img" aria-label="${esc(label)}: ${parts.map(p=>esc(p.n)+' '+Math.round(p.v/tot*100)+' %').join(', ')}">${arcs}<text x="58" y="56" text-anchor="middle" class="dn-t1" style="font-size:${Math.min(12,62/(compact(tot,S.base).length*.6)).toFixed(1)}px">${esc(compact(tot,S.base))}</text><text x="58" y="72" text-anchor="middle" class="dn-t2">total</text></svg>
    <div class="ml">${parts.map(p=>`<div class="ml-row"><span class="sw" style="background:${p.c}"></span><span class="ml-n">${esc(p.n)}</span><b class="num">${esc(compact(p.v,S.base))}</b><span class="ml-t"><i style="width:${(p.v/parts[0].v*100).toFixed(1)}%;background:${p.c}"></i></span><small class="num">${Math.round(p.v/tot*100)} %</small></div>`).join('')}</div></div>`;
}
function bucketsFor(R,items){
  const span=R[1]-R[0],a=new Date(R[0]);
  const unit=span<=15*DAY?'day':span<=75*DAY?'week':span<=800*DAY?'month':'year';
  let s;if(unit==='day')s=new Date(a.getFullYear(),a.getMonth(),a.getDate());else if(unit==='week'){s=new Date(a.getFullYear(),a.getMonth(),a.getDate());s.setDate(s.getDate()-((s.getDay()+6)%7))}else if(unit==='month')s=new Date(a.getFullYear(),a.getMonth(),1);else s=new Date(a.getFullYear(),0,1);
  const B=[],wk=new Intl.DateTimeFormat('es-DO',{weekday:'narrow'}),mo=new Intl.DateTimeFormat('es-DO',{month:'short'});
  while(s.getTime()<=R[1]&&B.length<60){
    const e=unit==='day'?new Date(s.getFullYear(),s.getMonth(),s.getDate()+1):unit==='week'?new Date(s.getFullYear(),s.getMonth(),s.getDate()+7):unit==='month'?new Date(s.getFullYear(),s.getMonth()+1,1):new Date(s.getFullYear()+1,0,1);
    const v=items.filter(x=>x.date>=s.getTime()&&x.date<e.getTime()).reduce(sumB,0);
    const l=unit==='day'?(span<=8*DAY?wk.format(s)+' '+s.getDate():String(s.getDate())):unit==='week'?s.getDate()+' '+mo.format(s).replace('.',''):unit==='month'?mo.format(s).replace('.',''):String(s.getFullYear());
    const cap=unit==='day'?dayShort.format(s):unit==='week'?'Semana del '+dateFmt.format(s):unit==='month'?monthFmt.format(s):'Año '+s.getFullYear();
    B.push({l,cap,v});s=e;
  }
  return {B,unit:{day:'por día',week:'por semana',month:'por mes',year:'por año'}[unit]};
}
function colsBlock(id,bk,color){
  const B=bk.B,mx=Math.max(0,...B.map(b=>b.v)),n=B.length,every=Math.ceil(n/7);let sel=n-1;while(sel>0&&!B[sel].v)sel--;
  return `<div class="colw" data-colw="${id}"><div class="cols" style="--cc:${color}">${B.map((b,i)=>`<button type="button" class="col" data-ci="${i}" data-cap="${esc(b.cap)}" data-val="${esc(fmt(b.v,S.base,0))}" aria-label="${esc(b.cap)}: ${esc(fmt(b.v,S.base,0))}" aria-pressed="${i===sel}"><i style="height:${mx&&b.v?Math.max(2.5,b.v/mx*100).toFixed(1):0}%"></i></button>`).join('')}</div>
    <div class="col-l" aria-hidden="true">${B.map((b,i)=>`<span>${(i%every===0||i===n-1)&&(n-1-i>=every/2||i===n-1)?esc(b.l):''}</span>`).join('')}</div>
    <div class="col-cap num" aria-live="polite"><span>${esc(B[sel].cap)}</span><b>${esc(fmt(B[sel].v,S.base,0))}</b></div></div>`;
}
function bindCols(){document.querySelectorAll('[data-colw]').forEach(w=>w.querySelectorAll('.col').forEach(b=>b.onclick=()=>{
  w.querySelectorAll('.col').forEach(x=>x.setAttribute('aria-pressed',x===b));const c=w.querySelector('.col-cap');c.firstElementChild.textContent=b.dataset.cap;c.lastElementChild.textContent=b.dataset.val}))}
const heroAdd=label=>`<button class="addb" type="button" id="heroAdd" aria-label="${label}"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>`;
function goTo(v,sg){view=v;if(v==='gastos'&&sg)gastSeg=sg;if(v==='prestamos'&&sg)credSeg=sg;try{localStorage.setItem(KEY+'.view',view)}catch(e){}render();window.scrollTo({top:0})}
function bindGo(){document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{const [v,sg]=b.dataset.go.split(':');goTo(v,sg)})}

