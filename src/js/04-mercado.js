/* ---------- Mercado (prototipo con datos simulados) ---------- */
const MK_T=[['cert','Certificados'],['aho','Cuentas de ahorro'],['fon','Fondos'],['bon','Bonos'],['pre','Préstamos']];
const MK=[ /* tipo, entidad, producto, moneda, tasa, plazo en meses (0 = libre), monto mínimo, extra */
  ['cert','Banco Ademi','Certificado financiero','DOP',10.5,12,10000],['cert','Banco Caribe','Certificado financiero','DOP',10.25,6,25000],['cert','APAP','Certificado de inversión','DOP',10.0,12,5000],
  ['cert','Asociación Cibao','Certificado financiero','DOP',9.9,6,10000],['cert','Banco Santa Cruz','Certificado financiero','DOP',9.5,6,50000],['cert','Banco BHD','Certificado financiero','DOP',9.25,12,25000],
  ['cert','Banco Popular','Certificado financiero','DOP',9.0,6,10000],['cert','Banreservas','Certificado financiero','DOP',8.75,3,10000],['cert','Banco Promerica','Certificado financiero','DOP',9.6,3,20000],
  ['cert','Banco Popular','Certificado en dólares','USD',3.25,12,1000],['cert','Banco BHD','Certificado en dólares','USD',3.5,12,1000],['cert','Scotiabank','Depósito a plazo en dólares','USD',3.0,6,2000],
  ['aho','Asociación Cibao','Ahorro programado','DOP',4.0,0,1000],['aho','APAP','Cuenta de ahorro','DOP',2.0,0,500],['aho','Banco BHD','Cuenta de ahorro','DOP',1.5,0,500],['aho','Banco Popular','Cuenta de ahorro','DOP',0.5,0,500],
  ['aho','Banreservas','Ahorro en dólares','USD',1.5,0,100],['aho','Banco Popular','Ahorro en dólares','USD',0.75,0,100],
  ['fon','AFI Universal','Fondo de liquidez','DOP',10.8,0,1000,'Rescate en 24 h'],['fon','AFI Popular','Fondo plazo 30 días','DOP',10.2,1,5000,'Rescate cada 30 días'],['fon','AFI Reservas','Fondo de liquidez','DOP',9.9,0,1000,'Rescate en 24 h'],
  ['fon','JMMB Funds','Fondo en dólares','USD',4.6,0,500,'Rescate en 48 h'],['fon','AFI Universal','Fondo en dólares','USD',4.9,0,500,'Rescate en 48 h'],
  ['bon','Ministerio de Hacienda','Bono 2031','DOP',10.15,52,10000,'Cupón semestral'],['bon','Ministerio de Hacienda','Bono 2034','DOP',10.6,93,10000,'Cupón semestral'],['bon','Banco Central','Notas de renta fija 2028','DOP',10.9,24,10000,'Cupón semestral'],
  ['bon','Ministerio de Hacienda','Bono global 2035','USD',6.4,105,1000,'Cupón semestral'],
  ['pre','Banreservas','Préstamo de vehículo','DOP',11.25,60,0,'Vehículo'],['pre','Banco Popular','Préstamo de vehículo','DOP',11.5,60,0,'Vehículo'],['pre','Banco BHD','Préstamo de vehículo','DOP',11.95,60,0,'Vehículo'],['pre','Banco Santa Cruz','Préstamo de vehículo usado','DOP',13.5,48,0,'Vehículo'],
  ['pre','Asociación Cibao','Préstamo hipotecario','DOP',8.9,240,0,'Hipotecario'],['pre','Banreservas','Préstamo hipotecario','DOP',9.75,240,0,'Hipotecario'],['pre','Banco Popular','Hipotecario tasa fija 3 años','DOP',10.25,240,0,'Hipotecario'],['pre','APAP','Préstamo hipotecario','DOP',10.5,240,0,'Hipotecario'],
  ['pre','Banreservas','Préstamo personal','DOP',16.5,36,0,'Personal'],['pre','Banco Popular','Préstamo personal','DOP',18.0,36,0,'Personal'],['pre','Banco Ademi','Préstamo para negocio','DOP',22.0,24,0,'Comercial']
].map(([t,e,n,cur,r,m,min,x],i)=>({id:'p'+i,t,e,n,cur,r,m,min,x:x||''}));
const FXE=[['Banco Popular','b',.55],['Banco BHD','b',.6],['Banreservas','b',.5],['Scotiabank','b',.7],['Banco Santa Cruz','b',.65],['Banco Caribe','b',.75],['Banco Promerica','b',.7],['APAP','b',.6],
  ['Casa de cambio · Zona Colonial','c',.35],['Casa de cambio · Piantini','c',.4],['Casa de cambio · Santiago','c',.3],['Agente de cambio · Bávaro','c',.45]];
/* Series simuladas y estables: la misma entidad siempre muestra la misma historia */
function seeded(key){let h=2166136261;for(const c of key){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return ()=>{h^=h<<13;h^=h>>>17;h^=h<<5;return ((h>>>0)%10000)/10000}}
function mkSeries(key,now,days,vol,step){const R=seeded(key),v=[now];let x=now;for(let i=1;i<days;i++){if(R()<step)x-= (R()-.5)*vol;v.push(+x.toFixed(4))}return v.reverse()}
const MK_D=365;
const rateHist=p=>mkSeries(p.id+p.e,p.r,MK_D,p.t==='pre'?.5:.35,.05).map(v=>Math.max(.05,v));
function fxNow(e,cur){const base=cur==='USD'?(S.rates.USD||60.9):(S.rates.EUR||70.6),R=seeded(e[0]+cur),off=(R()-.5)*.3,sp=e[2]*(cur==='EUR'?1.4:1);return {buy:+(base+off-sp).toFixed(2),sell:+(base+off+sp).toFixed(2)}}
function fxHist(e,cur){const n=fxNow(e,cur),b=mkSeries(e[0]+cur+'fx',n.buy,MK_D,cur==='USD'?.18:.24,.7);const sp=n.sell-n.buy;return {buy:b,sell:b.map(v=>+(v+sp).toFixed(2))}}
let mk={seg:'real',t:'cert',ent:'',cur:'',plazo:'',sort:'',fx:'USD',fxk:'',amt:'',dir:'vendo',cmp:[]};
try{Object.assign(mk,JSON.parse(localStorage.getItem(KEY+'.mk')||'{}'));mk.cmp=[];if(!mk.v2){mk.seg='real';mk.v2=1}}catch(e){}
const mkKeep=()=>{try{const {cmp,...o}=mk;localStorage.setItem(KEY+'.mk',JSON.stringify(o))}catch(e){}};
const plazoTxt=p=>p.m===0?(p.x||'Libre'):p.m<12?p.m+(p.m===1?' mes':' meses'):p.m%12===0?(p.m/12)+(p.m===12?' año':' años'):p.m+' meses';
function sparkL(h,col){const v=h.slice(-60),mn=Math.min(...v),mx=Math.max(...v),r=mx-mn||1;const d='M'+v.map((y,i)=>(i/(v.length-1)*64).toFixed(1)+' '+(22-(y-mn)/r*20).toFixed(1)).join(' L');return `<svg class="spk" viewBox="0 0 64 24" aria-hidden="true"><path d="${d}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
function vMercado(){
  if(!['real','prod','fx'].includes(mk.seg))mk.seg='real';
  const seg=`<div class="seg seg-top" role="group" aria-label="Sección"><button data-mks="real" aria-pressed="${mk.seg==='real'}">Tasas verificadas</button><button data-mks="prod" aria-pressed="${mk.seg==='prod'}">Productos</button><button data-mks="fx" aria-pressed="${mk.seg==='fx'}">Cambio</button></div>`;
  const note=`<p class="mk-note sim"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16v.5"/></svg><span><b>Datos simulados.</b> Esta sección es un prototipo para mostrar cómo funcionará la comparación; sus tasas no son reales. Las tasas verificadas están en la primera pestaña.</span></p>`;
  $('#view').innerHTML=`<p class="mk-lead">Compara y descubre dónde te conviene ahorrar, invertir o cambiar tus dólares.</p>${seg}${mk.seg==='real'?realHTML():note+(mk.seg==='fx'?fxHTML():prodHTML())}${promoHTML('mercado')}`;
  document.querySelectorAll('[data-mks]').forEach(b=>b.onclick=()=>{mk.seg=b.dataset.mks;mkKeep();render();track('mercado_'+mk.seg)});
  document.querySelectorAll('[data-mkr]').forEach(b=>b.onclick=()=>{mkr.prod=b.dataset.mkr;render()});
  if(mk.seg==='fx')bindFx();else if(mk.seg==='prod')bindProd();
}
function prodHTML(){
  const L0=MK.filter(p=>p.t===mk.t),ents=[...new Set(L0.map(p=>p.e))].sort(),loan=mk.t==='pre';
  let L=L0.filter(p=>(!mk.ent||p.e===mk.ent)&&(!mk.cur||p.cur===mk.cur)&&(!mk.plazo||(mk.plazo==='c'?p.m>0&&p.m<=3:mk.plazo==='m'?p.m>3&&p.m<=12:mk.plazo==='l'?p.m>12:p.m===0)));
  const asc=mk.sort?mk.sort==='asc':loan;L.sort((a,b)=>asc?a.r-b.r:b.r-a.r);
  const best=L[0];
  return `<div class="mk-types" role="group" aria-label="Tipo de producto">${MK_T.map(([k,l])=>`<button type="button" data-mkt="${k}" aria-pressed="${mk.t===k}">${l}</button>`).join('')}</div>
    <div class="ch-flt mk-flt"><label><span>Entidad</span><select id="mkEnt"><option value="">Todas</option>${ents.map(e=>`<option ${e===mk.ent?'selected':''}>${esc(e)}</option>`).join('')}</select></label>
      <label><span>Moneda</span><select id="mkCur"><option value="">Todas</option><option value="DOP" ${mk.cur==='DOP'?'selected':''}>Pesos</option><option value="USD" ${mk.cur==='USD'?'selected':''}>Dólares</option></select></label>
      <label><span>${loan?'Plazo':'Vencimiento'}</span><select id="mkPl"><option value="">Cualquiera</option>${loan?'':`<option value="0" ${mk.plazo==='0'?'selected':''}>Sin vencimiento</option>`}<option value="c" ${mk.plazo==='c'?'selected':''}>Hasta 3 meses</option><option value="m" ${mk.plazo==='m'?'selected':''}>De 3 a 12 meses</option><option value="l" ${mk.plazo==='l'?'selected':''}>Más de 1 año</option></select></label>
      <label><span>Ordenar</span><select id="mkSo"><option value="">${loan?'Menor tasa':'Mayor tasa'}</option><option value="${loan?'desc':'asc'}" ${mk.sort===(loan?'desc':'asc')?'selected':''}>${loan?'Mayor tasa':'Menor tasa'}</option></select></label></div>
    ${best?`<p class="mk-best">${loan?'La tasa más baja':'La tasa más alta'} con estos filtros: <b>${esc(best.e)}</b> al <b class="num">${best.r.toFixed(2)} %</b></p>`:''}
    <div class="mk-list">${L.map(p=>{const h=rateHist(p),ch=p.r-h[h.length-31];return `<div class="mk-r${mk.cmp.includes(p.id)?' cmp':''}"><button type="button" class="mk-main" data-mkp="${p.id}">${inst(p.e,1)}
      <span class="mk-t"><b>${esc(p.e)}</b><small>${esc(p.n)} · ${esc(plazoTxt(p))}${p.min?' · desde '+esc(fmt(p.min,p.cur,0)):''}</small></span>
      ${sparkL(h,loan?(ch>0?'var(--spend)':'var(--grow)'):(ch>=0?'var(--grow)':'var(--spend)'))}
      <span class="mk-v num"><b>${p.r.toFixed(2)} %</b><small class="${(loan?-ch:ch)>=0?'up':'dn'}">${ch>=0?'▲':'▼'} ${Math.abs(ch).toFixed(2)} en 30 d</small></span></button>
      <label class="mk-c"><input type="checkbox" data-mkc="${p.id}" ${mk.cmp.includes(p.id)?'checked':''}><span>Comparar</span></label></div>`}).join('')||'<p class="hint center" style="margin:18px 0">No hay productos con esos filtros.</p>'}</div>
    <div class="mk-cmpbar" id="mkCmp" ${mk.cmp.length?'':'hidden'}><span>${mk.cmp.length} de 3 elegidos</span><button type="button" class="btn" id="mkCmpGo" ${mk.cmp.length<2?'disabled':''}>Comparar</button></div>`;
}
function bindProd(){
  document.querySelectorAll('[data-mkt]').forEach(b=>b.onclick=()=>{mk.t=b.dataset.mkt;mk.ent='';mk.plazo='';mk.sort='';mk.cmp=[];mkKeep();render()});
  [['#mkEnt','ent'],['#mkCur','cur'],['#mkPl','plazo'],['#mkSo','sort']].forEach(([s,k])=>$(s).onchange=()=>{mk[k]=$(s).value;mkKeep();render()});
  document.querySelectorAll('[data-mkp]').forEach(b=>b.onclick=()=>openProduct(b.dataset.mkp));
  document.querySelectorAll('[data-mkc]').forEach(c=>c.onchange=()=>{const id=c.dataset.mkc;if(c.checked){if(mk.cmp.length>=3){c.checked=false;return toast('Compara hasta 3 a la vez')}mk.cmp.push(id)}else mk.cmp=mk.cmp.filter(x=>x!==id);
    c.closest('.mk-r').classList.toggle('cmp',c.checked);const bar=$('#mkCmp');bar.hidden=!mk.cmp.length;bar.querySelector('span').textContent=mk.cmp.length+' de 3 elegidos';$('#mkCmpGo').disabled=mk.cmp.length<2});
  const g=$('#mkCmpGo');if(g)g.onclick=()=>openCompare(mk.cmp.map(id=>MK.find(p=>p.id===id)));
}
/* Gráfico de línea con guía al tocar */
const LC=['var(--brand)','var(--grow)','#3F7CB8'];
function lineChart(series,days,fmtV,id){
  const S2=series.map(s=>({...s,v:s.v.slice(-days)})),all=S2.flatMap(s=>s.v),mn=Math.min(...all),mx=Math.max(...all),pad=(mx-mn)*.12||Math.max(.05,mx*.01),lo=mn-pad,hi=mx+pad,W=320,H=150,n=S2[0].v.length;
  const X=i=>(i/(n-1)*W).toFixed(1),Y=v=>(H-(v-lo)/(hi-lo)*H).toFixed(1);
  const d0=new Date(Date.now()-(n-1)*DAY),mo=new Intl.DateTimeFormat('es-DO',{day:'numeric',month:'short'});
  return `<div class="lc" id="${id}" data-n="${n}"><div class="lc-y num"><span>${fmtV(hi)}</span><span>${fmtV((hi+lo)/2)}</span><span>${fmtV(lo)}</span></div>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Evolución en ${days} días">${[0,.5,1].map(f=>`<line x1="0" x2="${W}" y1="${f*H}" y2="${f*H}" class="lc-g"/>`).join('')}
      ${S2.map((s,k)=>`<path d="M${s.v.map((v,i)=>X(i)+' '+Y(v)).join(' L')}" fill="none" stroke="${s.c||LC[k]}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>`).join('')}
      <line class="lc-cross" x1="0" x2="0" y1="0" y2="${H}" vector-effect="non-scaling-stroke" visibility="hidden"/></svg>
    <div class="lc-x"><span>${mo.format(d0)}</span><span>${mo.format(new Date(Date.now()-Math.round((n-1)/2)*DAY))}</span><span>Hoy</span></div>
    <div class="dtip num lc-tip" hidden></div></div>`;
}
function bindLine(id,series,days,fmtV){
  const w=document.getElementById(id);if(!w)return;const svg=w.querySelector('svg'),cr=w.querySelector('.lc-cross'),tip=w.querySelector('.lc-tip'),n=+w.dataset.n,S2=series.map(s=>({...s,v:s.v.slice(-days)})),df=new Intl.DateTimeFormat('es-DO',{day:'numeric',month:'short',year:'numeric'});
  const at=x=>{const r=svg.getBoundingClientRect(),f=Math.max(0,Math.min(1,(x-r.left)/r.width)),i=Math.round(f*(n-1));cr.setAttribute('x1',f*320);cr.setAttribute('x2',f*320);cr.setAttribute('visibility','visible');
    tip.innerHTML=`<span class="dt-c">${df.format(new Date(Date.now()-(n-1-i)*DAY))}</span>`+S2.map((s,k)=>`<span><i style="background:${s.c||LC[k]}"></i>${esc(s.n)} ${fmtV(s.v[i])}</span>`).join('');tip.hidden=false;
    const wr=w.getBoundingClientRect(),tw=tip.offsetWidth,px=r.left-wr.left+f*r.width,lf=Math.max(0,Math.min(wr.width-tw,px-tw/2));tip.style.left=lf+'px';tip.style.setProperty('--ax',(px-lf)+'px')};
  svg.addEventListener('pointerdown',e=>{at(e.clientX);svg.setPointerCapture&&svg.setPointerCapture(e.pointerId)});svg.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='mouse')at(e.clientX)});
  svg.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'){tip.hidden=true;cr.setAttribute('visibility','hidden')}});
}
const RANGES=[[30,'30 días'],[90,'3 meses'],[180,'6 meses'],[365,'1 año']];
function openProduct(id,days=90){
  const p=MK.find(x=>x.id===id);if(!p)return;const h=rateHist(p),v=h.slice(-days),loan=p.t==='pre',fv=x=>x.toFixed(2)+' %',a0=v[0],ch=p.r-a0;
  const amt=money(mk.amt)||(loan?1000000:(p.cur==='USD'?5000:100000));
  sheet(`<div class="la-h">${inst(p.e)}<div><h3>${esc(p.n)}</h3><p class="lead-s">${esc(p.e)} · ${esc(plazoTxt(p))} · ${p.cur==='USD'?'Dólares':'Pesos'}</p></div></div>
    <div class="mk-big num"><b>${p.r.toFixed(2)} %</b><span class="${(loan?-ch:ch)>=0?'up':'dn'}">${ch>=0?'▲':'▼'} ${Math.abs(ch).toFixed(2)} puntos en ${RANGES.find(r=>r[0]===days)[1]}</span></div>
    <div class="per light" role="group" aria-label="Período">${RANGES.map(([d,l])=>`<button type="button" data-pr="${d}" aria-pressed="${d===days}">${l}</button>`).join('')}</div>
    ${lineChart([{n:'Tasa',v:h,c:'var(--brand)'}],days,fv,'lcP')}
    <div class="la-kpi num"><div><span>Mínima</span><b>${Math.min(...v).toFixed(2)} %</b></div><div><span>Máxima</span><b>${Math.max(...v).toFixed(2)} %</b></div>${p.min?`<div><span>Monto mínimo</span><b>${esc(fmt(p.min,p.cur,0))}</b></div>`:''}<div><span>${loan?'Plazo típico':'Plazo'}</span><b>${esc(plazoTxt(p))}</b></div></div>
    <div class="mk-calc"><label for="mkAmt">${loan?'Si te prestan':'Si inviertes'}</label><div class="o-amt"><input id="mkAmt" inputmode="decimal" value="${amt}"><span>${p.cur}</span></div><p class="num" id="mkCalc"></p></div>
    ${loan?`<button class="btn" type="button" id="mkUse" style="--accent:var(--debt)">Ya tengo este préstamo · registrarlo</button>`:`<button class="btn" type="button" id="mkUse" style="--accent:var(--grow)">Ya invertí aquí · agregarlo a mis ahorros</button>`}
    <p class="hint">Datos simulados para el prototipo. Confirma siempre la tasa con la entidad.</p>`,'var(--brand)');
  const calc=()=>{const a=money($('#mkAmt').value)||0;mk.amt=String(a);
    if(loan){const n=p.m||60,c=cuota(a,p.r,n);$('#mkCalc').innerHTML=`Cuota de <b>${esc(fmt(c,p.cur,0))}</b> al mes por ${n} meses. Pagarías <b>${esc(fmt(c*n-a,p.cur,0))}</b> de intereses.`}
    else{const y=a*p.r/100*.9;$('#mkCalc').innerHTML=`Ganarías unos <b>${esc(fmt(y/12,p.cur,0))}</b> al mes, <b>${esc(fmt(y,p.cur,0))}</b> al año, ya con ISR del 10 %.`}};
  $('#mkAmt').oninput=calc;calc();
  document.querySelectorAll('[data-pr]').forEach(b=>b.onclick=()=>openProduct(id,+b.dataset.pr));
  bindLine('lcP',[{n:'Tasa',v:h,c:'var(--brand)'}],days,fv);
  $('#mkUse').onclick=()=>{const a=money($('#mkAmt').value)||0;if(loan)openLoan();else openSaving({type:{cert:'Certificado',aho:'Cuenta de ahorro',fon:'Fondo de inversión',bon:'Bono'}[p.t],entity:p.e,cur:p.cur,rate:p.r,principal:a||'',months:p.m||undefined,mode:p.m?'meses':'sin',vr:p.t==='fon'})};
}
function openCompare(P,days=90){
  const ser=P.map((p,k)=>({n:p.e,v:rateHist(p),c:LC[k]})),fv=x=>x.toFixed(2)+' %';
  sheet(`<h3>Comparar tasas</h3>
    <div class="per light" role="group" aria-label="Período">${RANGES.map(([d,l])=>`<button type="button" data-pr="${d}" aria-pressed="${d===days}">${l}</button>`).join('')}</div>
    ${lineChart(ser,days,fv,'lcC')}
    <div class="cmp-t">${P.map((p,k)=>`<div class="cmp-c"><span class="cmp-sw" style="background:${LC[k]}"></span><b>${esc(p.e)}</b><small>${esc(p.n)}</small><dl class="num"><dt>Tasa hoy</dt><dd>${p.r.toFixed(2)} %</dd><dt>Plazo</dt><dd>${esc(plazoTxt(p))}</dd><dt>Mínimo</dt><dd>${p.min?esc(fmt(p.min,p.cur,0)):'—'}</dd><dt>Moneda</dt><dd>${p.cur}</dd></dl></div>`).join('')}</div>`,'var(--brand)');
  document.querySelectorAll('[data-pr]').forEach(b=>b.onclick=()=>openCompare(P,+b.dataset.pr));bindLine('lcC',ser,days,fv);
}
function fxHTML(){
  const cur=mk.fx,R=FXE.filter(e=>!mk.fxk||e[1]===mk.fxk).map(e=>({e,...fxNow(e,cur)}));
  const bestB=Math.max(...R.map(r=>r.buy)),bestS=Math.min(...R.map(r=>r.sell)),a=money(mk.amt)||0,sell=mk.dir==='vendo';
  const res=r=>sell?a*r.buy:a/r.sell;
  const L=[...R].sort((x,y)=>a?(sell?res(y)-res(x):res(y)-res(x)):(sell?y.buy-x.buy:x.sell-y.sell));
  return `<div class="fx-top"><div class="seg tiny" role="group" aria-label="Moneda">${[['USD','Dólar · US$'],['EUR','Euro · €']].map(([k,l])=>`<button type="button" data-fxc="${k}" aria-pressed="${cur===k}">${l}</button>`).join('')}</div>
      <div class="seg tiny" role="group" aria-label="Dónde">${[['','Todos'],['b','Bancos'],['c','Casas de cambio']].map(([k,l])=>`<button type="button" data-fxk="${k}" aria-pressed="${mk.fxk===k}">${l}</button>`).join('')}</div></div>
    <section class="panel fx-calc"><div class="fx-q"><div class="seg tiny" role="group" aria-label="Operación"><button type="button" data-fxd="vendo" aria-pressed="${sell}">Tengo ${cur==='USD'?'dólares':'euros'}</button><button type="button" data-fxd="compro" aria-pressed="${!sell}">Tengo pesos</button></div>
      <div class="o-amt"><input id="fxAmt" inputmode="decimal" value="${esc(mk.amt||'')}" placeholder="${sell?'Ej. 500':'Ej. 30,000'}" aria-label="Monto"><span>${sell?(cur==='USD'?'US$':'€'):'RD$'}</span></div></div>
      <p class="hint">${a?(sell?'Recibirías en pesos:':'Recibirías en '+(cur==='USD'?'dólares':'euros')+':')+' ordenado de mejor a peor.':'Escribe un monto y te decimos dónde te conviene cambiar.'}</p></section>
    <div class="fx-h"><span>Entidad</span><span>Compra</span><span>Venta</span></div>
    <div class="mk-list fx-list">${L.map((r,i)=>`<button type="button" class="fx-r" data-fxe="${esc(r.e[0])}">${r.e[1]==='b'?inst(r.e[0],1):`<span class="tx-ic ic2" style="--ic:var(--ink-2)">${svgIc('<path d="M7 7h13l-3-3M17 17H4l3 3"/>')}</span>`}
      <span class="mk-t"><b>${esc(r.e[0])}</b><small>${a?`Recibes <b class="num">${esc(sell?fmt(res(r),'DOP',2):fmt(res(r),cur,2))}</b>${i===0?' · la mejor':''}`:(r.e[1]==='b'?'Banco':'Casa de cambio')}</small></span>
      <span class="fx-v num${r.buy===bestB?' best':''}">${r.buy.toFixed(2)}</span><span class="fx-v num${r.sell===bestS?' best':''}">${r.sell.toFixed(2)}</span></button>`).join('')}</div>
    <p class="hint fx-leg"><b>Compra</b>: lo que te pagan por cada ${cur==='USD'?'dólar':'euro'}. <b>Venta</b>: lo que te cobran por cada uno. En verde, la mejor de cada columna. Toca una entidad para ver su historial.</p>`;
}
function bindFx(){
  document.querySelectorAll('[data-fxc]').forEach(b=>b.onclick=()=>{mk.fx=b.dataset.fxc;mkKeep();render()});
  document.querySelectorAll('[data-fxk]').forEach(b=>b.onclick=()=>{mk.fxk=b.dataset.fxk;mkKeep();render()});
  document.querySelectorAll('[data-fxd]').forEach(b=>b.onclick=()=>{mk.dir=b.dataset.fxd;mk.amt='';mkKeep();render()});
  const a=$('#fxAmt');a.onchange=()=>{mk.amt=a.value;mkKeep();const y=scrollY;render();scrollTo(0,y)};
  document.querySelectorAll('[data-fxe]').forEach(b=>b.onclick=()=>openFx(b.dataset.fxe));
}
function openFx(name,days=90){
  const e=FXE.find(x=>x[0]===name),cur=mk.fx,n=fxNow(e,cur),H=fxHist(e,cur),ser=[{n:'Compra',v:H.buy,c:'var(--grow)'},{n:'Venta',v:H.sell,c:'var(--brand)'}],fv=x=>x.toFixed(2);
  const ch=n.buy-H.buy[H.buy.length-days];
  sheet(`<div class="la-h">${e[1]==='b'?inst(name):''}<div><h3>${esc(name)}</h3><p class="lead-s">${cur==='USD'?'Dólar estadounidense':'Euro'} · pesos por cada ${cur==='USD'?'US$1':'€1'}</p></div></div>
    <div class="la-kpi num"><div><span>Compra</span><b>${n.buy.toFixed(2)}</b><small>te pagan</small></div><div><span>Venta</span><b>${n.sell.toFixed(2)}</b><small>te cobran</small></div><div><span>Diferencia</span><b>${(n.sell-n.buy).toFixed(2)}</b><small>margen</small></div><div><span>Cambio</span><b class="${ch>=0?'up':'dn'}">${ch>=0?'+':''}${ch.toFixed(2)}</b><small>en el período</small></div></div>
    <div class="per light" role="group" aria-label="Período">${RANGES.map(([d,l])=>`<button type="button" data-pr="${d}" aria-pressed="${d===days}">${l}</button>`).join('')}</div>
    ${lineChart(ser,days,fv,'lcF')}<div class="ch-leg"><span><i style="background:var(--grow)"></i>Compra</span><span><i style="background:var(--brand)"></i>Venta</span></div>
    <p class="hint">Datos simulados para el prototipo.</p>`,'var(--brand)');
  document.querySelectorAll('[data-pr]').forEach(b=>b.onclick=()=>openFx(name,+b.dataset.pr));bindLine('lcF',ser,days,fv);
}

