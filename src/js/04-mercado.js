/* ---------- Mercado: solo datos reales (Fase 2 del portal) ----------
   Lee las vistas públicas de Supabase (mkt_obs, mkt_notas, mkt_subastas, mkt_fondos, mkt_estado).
   Nada se simula ni se estima: si un dato no está, no se muestra. Cada bloque dice su fuente y su fecha.
   Convenciones: las variaciones del dólar se muestran en gris (no son buenas ni malas); la del valor cuota
   de un fondo en verde o rojo para quien tiene cuotas. */
const MKF={c:'bcrd.usd_dop.compra.diaria',v:'bcrd.usd_dop.venta.diaria',cm:'bcrd.usd_dop.compra.prom_mensual',vm:'bcrd.usd_dop.venta.prom_mensual'};
const MK_SRC={bcrd:'https://www.bancentral.gov.do/SectorExterno/HistoricoTasas',notas:'https://www.bancentral.gov.do/a/d/2711-notas-del-banco-central',simv:'https://datos.gob.do/dataset/variacion-del-valor-cuota-de-los-instrumentos-de-renta-variable'};
let mk={seg:'moneda',inv:'notas',per:'1a',fcur:'',ftipo:'',fsort:'v12',fact:1};
try{Object.assign(mk,JSON.parse(localStorage.getItem(KEY+'.mk2')||'{}'))}catch(e){}
const mkKeep=()=>{try{localStorage.setItem(KEY+'.mk2',JSON.stringify(mk))}catch(e){}};
let mkt={fx:null,fxm:null,notas:null,fondos:null,fobs:null,estado:null,at:0,err:'',loading:false};
try{const c=JSON.parse(localStorage.getItem(KEY+'.mkt')||'null');if(c&&c.v===2)Object.assign(mkt,c.d,{at:c.at})}catch(e){}
const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const dIso=s=>new Date(s+'T12:00:00');
const dLong=new Intl.DateTimeFormat('es-DO',{day:'numeric',month:'short',year:'numeric'});
const dMon=new Intl.DateTimeFormat('es-DO',{month:'short',year:'numeric'});
const fD=s=>s?dLong.format(dIso(s)):'';
const fM=s=>s?dMon.format(dIso(s)):'';
const fx4=v=>'RD$'+(+v).toFixed(4);
const pct=(v,d=2)=>(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(d)+' %';
async function restAll(path){
  let out=[],off=0;
  for(let i=0;i<20;i++){
    const r=await fetch(SUPABASE_URL+'/rest/v1/'+path+(path.includes('?')?'&':'?')+'limit=1000&offset='+off,{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY}});
    if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();out=out.concat(j);if(j.length<1000)break;off+=1000;
  }
  return out;
}
const byDate=(rows,serie)=>rows.filter(o=>o.serie===serie).map(o=>({d:o.fecha_ref,v:+o.valor})).sort((a,b)=>a.d<b.d?-1:1);
async function loadMkt(force){
  if(mkt.loading||(!force&&mkt.fx&&Date.now()-mkt.at<30*60e3))return;
  if(!canCloud())return;mkt.loading=true;
  try{
    const t=new Date(),d5=new Date(t.getFullYear()-5,t.getMonth(),t.getDate()-10),d14=new Date(t.getFullYear(),t.getMonth()-14,1);
    const [fx,fxm,notas,fondos,fobs,estado]=await Promise.all([
      restAll(`mkt_obs?select=serie,fecha_ref,valor&serie=in.(${MKF.c},${MKF.v})&fecha_ref=gte.${iso(d5)}&order=fecha_ref`),
      restAll(`mkt_obs?select=serie,fecha_ref,valor&serie=in.(${MKF.cm},${MKF.vm})&order=fecha_ref`),
      restAll('mkt_notas?select=*&order=vencimiento'),
      restAll('mkt_fondos?select=*&order=nombre'),
      restAll(`mkt_obs?select=serie,fecha_ref,valor&serie=like.simv.vc.*&fecha_ref=gte.${iso(d14)}&order=fecha_ref`),
      restAll('mkt_estado?select=*')]);
    Object.assign(mkt,{fx:{c:byDate(fx,MKF.c),v:byDate(fx,MKF.v)},fxm:{c:byDate(fxm,MKF.cm),v:byDate(fxm,MKF.vm)},notas,fondos,fobs,estado,at:Date.now(),err:''});
    try{localStorage.setItem(KEY+'.mkt',JSON.stringify({v:2,at:mkt.at,d:{fx:mkt.fx,fxm:mkt.fxm,notas,fondos,fobs,estado}}))}catch(e){}
    widgetSync();
  }catch(e){mkt.err=mkt.fx?'Sin conexión: se muestran los datos guardados el '+dtFmt.format(new Date(mkt.at))+'.':'No se pudieron cargar los datos del mercado. Revisa tu conexión.'}
  mkt.loading=false;if(view==='mercado')render();
}
/* Valor en o antes de una fecha (búsqueda binaria sobre una serie ordenada) */
function onOrBefore(arr,d){let lo=0,hi=arr.length-1,r=null;while(lo<=hi){const m=(lo+hi)>>1;if(arr[m].d<=d){r=arr[m];lo=m+1}else hi=m-1}return r}
const shiftIso=(s,{y=0,m=0,d=0})=>{const x=dIso(s);x.setFullYear(x.getFullYear()+y,x.getMonth()+m,x.getDate()+d);return iso(x)};
function fxStats(arr){
  if(!arr||arr.length<2)return null;
  const L=arr.at(-1),P=arr.at(-2),m1=onOrBefore(arr,shiftIso(L.d,{m:-1})),y1=onOrBefore(arr,shiftIso(L.d,{y:-1})),ye=onOrBefore(arr,(+L.d.slice(0,4)-1)+'-12-31');
  const ch=x=>x?{from:x,abs:L.v-x.v,rel:(L.v/x.v-1)*100}:null;
  return {last:L,prev:P,day:ch(P),mon:ch(m1),year:ch(y1),ytd:ch(ye),pesoYtd:ye?(ye.v/L.v-1)*100:null};
}
/* ---------- Gráfico de líneas con fechas reales ---------- */
const mkCharts={};
function tChart(ser,id,fv){
  const all=ser.flatMap(s=>s.p);if(all.length<2)return '<p class="hint">No hay suficientes datos para graficar.</p>';
  const T=x=>dIso(x).getTime(),t0=T(all.reduce((a,b)=>a.d<b.d?a:b).d),t1=T(all.reduce((a,b)=>a.d>b.d?a:b).d),vs=all.map(p=>p.v),mn=Math.min(...vs),mx=Math.max(...vs),pad=(mx-mn)*.1||Math.abs(mx)*.01||1,lo=mn-pad,hi=mx+pad,W=320,H=160;
  const X=t=>((t-t0)/((t1-t0)||1)*W).toFixed(1),Y=v=>(H-(v-lo)/(hi-lo)*H).toFixed(1),span=(t1-t0)/864e5,lab=t=>(span>400?dMon:dLong).format(new Date(t));
  mkCharts[id]={ser,t0,t1,fv};
  return `<div class="lc mk2-lc" id="${id}"><div class="lc-y num"><span>${fv(hi)}</span><span>${fv((hi+lo)/2)}</span><span>${fv(lo)}</span></div>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Evolución de ${esc(ser.map(s=>s.n).join(' y '))} del ${esc(lab(t0))} al ${esc(lab(t1))}">${[0,.5,1].map(f=>`<line x1="0" x2="${W}" y1="${f*H}" y2="${f*H}" class="lc-g"/>`).join('')}
      ${ser.map(s=>`<path d="M${s.p.map(p=>X(T(p.d))+' '+Y(p.v)).join(' L')}" fill="none" stroke="${s.c}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>`).join('')}
      <line class="lc-cross" x1="0" x2="0" y1="0" y2="${H}" vector-effect="non-scaling-stroke" visibility="hidden"/></svg>
    <div class="lc-x"><span>${esc(lab(t0))}</span><span>${esc(lab((t0+t1)/2))}</span><span>${esc(lab(t1))}</span></div>
    <div class="dtip num lc-tip" hidden></div></div>`;
}
function bindT(id){
  const w=document.getElementById(id),C=mkCharts[id];if(!w||!C)return;const svg=w.querySelector('svg'),cr=w.querySelector('.lc-cross'),tip=w.querySelector('.lc-tip');
  const near=(p,t)=>{let lo=0,hi=p.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(dIso(p[m].d).getTime()<=t)lo=m;else hi=m}return Math.abs(dIso(p[lo].d).getTime()-t)<=Math.abs(dIso(p[hi].d).getTime()-t)?p[lo]:p[hi]};
  const at=x=>{const r=svg.getBoundingClientRect(),f0=Math.max(0,Math.min(1,(x-r.left)/r.width)),f=f0>.985?1:f0<.015?0:f0,t=C.t0+f*(C.t1-C.t0),pts=C.ser.map(s=>near(s.p,t)),fx=(dIso(pts[0].d).getTime()-C.t0)/((C.t1-C.t0)||1);
    cr.setAttribute('x1',fx*320);cr.setAttribute('x2',fx*320);cr.setAttribute('visibility','visible');
    tip.innerHTML=`<span class="dt-c">${esc(fD(pts[0].d))}</span>`+C.ser.map((s,k)=>`<span><i style="background:${s.c}"></i>${esc(s.n)} ${esc(C.fv(pts[k].v))}</span>`).join('');tip.hidden=false;
    const wr=w.getBoundingClientRect(),tw=tip.offsetWidth,px=r.left-wr.left+fx*r.width,lf=Math.max(0,Math.min(wr.width-tw,px-tw/2));tip.style.left=lf+'px';tip.style.setProperty('--ax',(px-lf)+'px')};
  svg.addEventListener('pointerdown',e=>{at(e.clientX);svg.setPointerCapture&&svg.setPointerCapture(e.pointerId)});svg.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='mouse')at(e.clientX)});
  svg.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'){tip.hidden=true;cr.setAttribute('visibility','hidden')}});
}
/* ---------- Encabezado: indicadores y estado de actualización ---------- */
function mkIndHTML(){
  const S1=fxStats(mkt.fx&&mkt.fx.c),S2=fxStats(mkt.fx&&mkt.fx.v);
  const card=(lbl,s,k)=>s?`<button type="button" class="mk2-ind" data-mkgo="moneda" aria-label="${esc(lbl)}: ${esc(fx4(s.last.v))}"><span class="mk2-il">${esc(lbl)}</span><b class="num">${esc(fx4(s.last.v))}</b>
    <span class="mk2-ch num">${s.day.abs>=0?'▲':'▼'} ${esc(Math.abs(s.day.abs).toFixed(4))} · ${esc(pct(s.day.rel))} <small>frente al ${esc(fD(s.prev.d))}</small></span><small class="mk2-src">${esc(fD(s.last.d))} · BCRD</small></button>`:'';
  return S1?`<div class="mk2-inds">${card('Dólar, tasa de compra',S1)}${card('Dólar, tasa de venta',S2)}</div>`:'';
}
function mkStatusHTML(){
  const E=(mkt.estado||[]).filter(e=>e.ultima_observacion);if(!E.length)return '';
  const last=E.map(e=>e.ultima_consulta).filter(Boolean).sort().at(-1),bad=E.filter(e=>e.estado&&e.estado!=='al_dia').length;
  return `<p class="mk2-status"><span class="mk2-dot${bad?' warn':''}" aria-hidden="true"></span>${bad?`${bad} ${bad===1?'fuente pendiente':'fuentes pendientes'} de actualizar · `:''}${E.length} fuentes con datos · última carga ${esc(last?dtFmt.format(new Date(last)):'')}</p>`;
}
/* ---------- Moneda ---------- */
const MK_PER=[['1m','1 mes',{m:-1}],['3m','3 meses',{m:-3}],['6m','6 meses',{m:-6}],['1a','1 año',{y:-1}],['3a','3 años',{y:-3}],['5a','5 años',{y:-5}],['todo','Todo',null]];
function monedaHTML(){
  if(!mkt.fx||!mkt.fx.c.length)return '';
  const C=mkt.fx.c,V=mkt.fx.v,S=fxStats(C),Sv=fxStats(V),per=MK_PER.find(p=>p[0]===mk.per)||MK_PER[3],all=per[0]==='todo';
  const from=all?null:shiftIso(C.at(-1).d,per[2]),cut=a=>all?a:a.filter(p=>p.d>=from);
  const pc=all?mkt.fxm.c:cut(C),pv=all?mkt.fxm.v:cut(V),vs=pc.map(p=>p.v),mxp=pc.reduce((a,b)=>b.v>a.v?b:a,pc[0]),mnp=pc.reduce((a,b)=>b.v<a.v?b:a,pc[0]);
  const ser=[{n:'Compra',c:'var(--grow)',p:pc},{n:'Venta',c:'var(--brand)',p:pv}];
  const kpi=(l,c)=>c?`<div><span>${esc(l)}</span><b class="num">${esc(pct(c.rel))}</b><small>${c.abs>=0?'+':'−'}${esc(Math.abs(c.abs).toFixed(4))} desde el ${esc(fD(c.from.d))}</small></div>`:'';
  const peso=S.pesoYtd,dir=peso>=0?'se apreció':'se depreció';
  const why=`El dólar ${S.day.abs>=0?'subió':'bajó'} ${esc(Math.abs(S.day.abs).toFixed(4))} pesos (${esc(pct(S.day.rel))}) en la tasa de compra frente al ${esc(fD(S.prev.d))}. En lo que va de ${S.last.d.slice(0,4)}, el peso ${dir} ${esc(Math.abs(peso).toFixed(1))} % frente al dólar, medido como lo publica el BCRD (tasa de cierre del año anterior entre la de hoy). Son cálculos de Caoba sobre los datos del BCRD; no explican la causa del movimiento.`;
  return `<section class="panel mk2-fx"><div class="panel-h"><b>Dólar estadounidense</b><span class="panel-s">Tasa de referencia del mercado spot · pesos por US$1</span></div>
    <div class="per light" role="group" aria-label="Período">${MK_PER.map(([k,l])=>`<button type="button" data-mkper="${k}" aria-pressed="${k===per[0]}">${l}</button>`).join('')}</div>
    ${tChart(ser,'mkFx',v=>v.toFixed(2))}
    <div class="ch-leg"><span><i style="background:var(--grow)"></i>Compra</span><span><i style="background:var(--brand)"></i>Venta</span>${all?'<span>Promedios mensuales desde 1985</span>':''}</div>
    <div class="la-kpi mk2-kpi">${kpi('En el día',S.day)}${kpi('En un mes',S.mon)}${kpi('En un año',S.year)}<div><span>El peso en ${S.last.d.slice(0,4)}</span><b class="num">${peso>=0?'▲':'▼'} ${esc(Math.abs(peso).toFixed(1))} %</b><small>${peso>=0?'apreciación':'depreciación'} acumulada</small></div>
      <div><span>Máximo del período</span><b class="num">${esc(mxp.v.toFixed(4))}</b><small>${esc((all?fM:fD)(mxp.d))}</small></div><div><span>Mínimo del período</span><b class="num">${esc(mnp.v.toFixed(4))}</b><small>${esc((all?fM:fD)(mnp.d))}</small></div></div>
    <h4 class="menu-g">¿Qué significa este movimiento?</h4><p class="mk2-why">${why}</p>
    <div class="mk2-tbl" role="table" aria-label="Últimos días"><div role="row" class="mk2-th"><span role="columnheader">Fecha</span><span role="columnheader">Compra</span><span role="columnheader">Venta</span><span role="columnheader">Diferencia</span></div>
      ${C.slice(-6).reverse().map((p,i)=>{const q=onOrBefore(V,p.d);return `<div role="row"><span role="cell">${esc(fD(p.d))}</span><span role="cell" class="num">${p.v.toFixed(4)}</span><span role="cell" class="num">${q?q.v.toFixed(4):''}</span><span role="cell" class="num">${q?(q.v-p.v).toFixed(4):''}</span></div>`}).join('')}</div>
    <p class="mk2-src-l">Fuente: <a href="${MK_SRC.bcrd}" target="_blank" rel="noopener">Banco Central de la República Dominicana</a> · datos al ${esc(fD(S.last.d))}. Diferencia = venta − compra.</p></section>
    <section class="panel mk2-empty"><b>Tasas de bancos y casas de cambio</b><p>Todavía no hay una fuente verificable que publique estas tasas de forma que se puedan comprobar. Se mostrarán cuando cada tasa tenga su fuente y su fecha.</p></section>`;
}
/* ---------- Notas del Banco Central ---------- */
const yrs=(a,b)=>(dIso(b)-dIso(a))/(365.25*864e5);
const plazoRest=(a,b)=>{const d=Math.round((dIso(b)-dIso(a))/864e5);return d<=0?'vence hoy':d<60?d+(d===1?' día':' días'):d<365?Math.round(d/30.44)+' meses':yrs(a,b).toFixed(1)+' años'};
function notasHTML(){
  const hoy=iso(new Date()),L=(mkt.notas||[]).filter(n=>n.estado==='vigente'&&n.vencimiento>=hoy);if(!L.length)return '<p class="hint center">No hay Notas vigentes cargadas.</p>';
  const T=[['Hasta 1 año',0,1],['De 1 a 3 años',1,3],['De 3 a 5 años',3,5],['Más de 5 años',5,99]];
  const row=n=>{const r=n.ultimo_rendimiento!=null?+n.ultimo_rendimiento*100:null;return `<button type="button" class="mk2-row" data-nota="${esc(n.isin)}"><span class="mk2-rt"><b>${esc(n.isin)}</b><small>Cupón ${(+n.cupon*100).toFixed(2)} % · vence el ${esc(fD(n.vencimiento))} · ${esc(plazoRest(hoy,n.vencimiento))}</small></span>
    <span class="mk2-rv num">${r!=null?`<b>${r.toFixed(2)} %</b><small>${n.ultimo_en_revision?'dato en revisión · ':''}subasta del ${esc(fD(n.ultima_adjudicacion))}</small>`:'<small>Sin adjudicación</small>'}</span></button>`};
  return `<p class="mk2-lead">Notas vigentes del BCRD y el rendimiento promedio ponderado de su última subasta adjudicada. Ese rendimiento es lo que obtuvo quien compró en esa subasta; no es la tasa cupón ni una oferta disponible hoy. Se agrupan por plazo restante porque plazos distintos no se comparan.</p>
    ${T.map(([lbl,a,b])=>{const G=L.filter(n=>{const y=yrs(hoy,n.vencimiento);return y>=a&&y<b});return G.length?`<h4 class="menu-g">${esc(lbl)}</h4><div class="mk2-list">${G.map(row).join('')}</div>`:''}).join('')}
    <p class="mk2-src-l">Fuente: <a href="${MK_SRC.notas}" target="_blank" rel="noopener">Banco Central, histórico de subastas de Notas</a> · ${L.length} Notas vigentes · última subasta ${esc(fD((mkt.notas||[]).map(n=>n.ultima_subasta).filter(Boolean).sort().at(-1)))}.</p>`;
}
async function openNota(isin){
  const n=(mkt.notas||[]).find(x=>x.isin===isin);if(!n)return;
  sheet(`<h3>${esc(isin)}</h3><p class="lead-s">Nota del Banco Central · cupón ${(+n.cupon*100).toFixed(2)} % · vence el ${esc(fD(n.vencimiento))}</p><p class="hint center" id="ntLoad">Cargando subastas…</p>`,'var(--market)');
  let S=[];try{S=await restAll(`mkt_subastas?select=*&isin=eq.${encodeURIComponent(isin)}&order=fecha_subasta`)}catch(e){$('#ntLoad').textContent='No se pudieron cargar las subastas.';return}
  const A=S.filter(s=>s.estado==='adjudicada'&&s.rendimiento_prom!=null&&!s.en_revision),p=A.map(s=>({d:s.fecha_subasta,v:+s.rendimiento_prom*100}));
  const a=A.at(-1),b=A.at(-2),bp=a&&b?Math.round((a.rendimiento_prom-b.rendimiento_prom)*1e4):null;
  const why=a&&b&&bp===0?`El rendimiento promedio ponderado se mantuvo en ${(+a.rendimiento_prom*100).toFixed(2)} % entre las subastas del ${esc(fD(b.fecha_subasta))} y del ${esc(fD(a.fecha_subasta))} (menos de medio punto básico de diferencia). Cálculo de Caoba sobre los resultados publicados.`:a&&b?`El rendimiento promedio ponderado pasó de ${(+b.rendimiento_prom*100).toFixed(2)} % en la subasta del ${esc(fD(b.fecha_subasta))} a ${(+a.rendimiento_prom*100).toFixed(2)} % en la del ${esc(fD(a.fecha_subasta))}: ${bp>0?'+':bp<0?'−':''}${Math.abs(bp)} ${Math.abs(bp)===1?'punto básico':'puntos básicos'} (${((a.rendimiento_prom-b.rendimiento_prom)*100).toFixed(2)} puntos porcentuales). Cálculo de Caoba sobre los resultados publicados; no indica la causa.`:'Solo hay una subasta adjudicada válida para esta Nota.';
  const money=v=>v==null?'':'RD$'+(v/1e6).toLocaleString('en-US',{maximumFractionDigits:1})+' M';
  $('.sheet').innerHTML=`<div class="grab"></div><h3>${esc(isin)}</h3><p class="lead-s">Nota del Banco Central · cupón ${(+n.cupon*100).toFixed(2)} % · vence el ${esc(fD(n.vencimiento))}</p>
    <div class="la-kpi num"><div><span>Último rendimiento</span><b>${a?(+a.rendimiento_prom*100).toFixed(2)+' %':'—'}</b><small>${a?esc(fD(a.fecha_subasta)):''}</small></div><div><span>Precio promedio</span><b>${a&&a.adjudicado_precio_prom!=null?(+a.adjudicado_precio_prom*100).toFixed(2)+' %':'—'}</b><small>del valor nominal</small></div><div><span>Subastas</span><b>${S.length}</b><small>desde ${esc(fD(S[0]&&S[0].fecha_subasta))}</small></div><div><span>Plazo restante</span><b>${esc(plazoRest(iso(new Date()),n.vencimiento))}</b></div></div>
    ${p.length>1?tChart([{n:'Rendimiento',c:'var(--market)',p}],'mkNt',v=>v.toFixed(2)+' %'):''}
    <h4 class="menu-g">¿Qué significa este movimiento?</h4><p class="mk2-why">${why}</p>
    <div class="mk2-tbl five" role="table" aria-label="Subastas"><div role="row" class="mk2-th"><span role="columnheader">Subasta</span><span role="columnheader">Recibido</span><span role="columnheader">Adjudicado</span><span role="columnheader">Rendimiento</span><span role="columnheader">Estado</span></div>
      ${[...S].reverse().map(s=>`<div role="row"${s.en_revision?' class="rev"':''}><span role="cell">${esc(fD(s.fecha_subasta))}</span><span role="cell" class="num">${esc(money(s.recibido_vn))}</span><span role="cell" class="num">${esc(money(s.adjudicado_vn))}</span><span role="cell" class="num">${s.rendimiento_prom!=null?(+s.rendimiento_prom*100).toFixed(2)+' %':''}</span><span role="cell">${s.estado==='adjudicada'?'Adjudicada':s.estado==='desierta'?'Desierta':'Sin adjudicación'}${s.en_revision?' · en revisión':''}</span></div>`).join('')}</div>
    <p class="mk2-src-l">Las filas «en revisión» tienen datos dudosos en el archivo oficial y no se usan en el gráfico. Fuente: <a href="${MK_SRC.notas}" target="_blank" rel="noopener">Banco Central</a>.</p>`;
  bindT('mkNt');
}
/* ---------- Fondos cerrados y fideicomisos ---------- */
function fondosData(){
  const by={};(mkt.fobs||[]).forEach(o=>{(by[o.serie]=by[o.serie]||[]).push({d:o.fecha_ref,v:+o.valor})});
  const ult=Object.values(by).map(a=>a.at(-1).d).sort().at(-1);
  return (mkt.fondos||[]).map(f=>{const a=(by[f.serie]||[]).sort((x,y)=>x.d<y.d?-1:1),L=a.at(-1);if(!L)return f.ultima_fecha?{...f,last:{d:f.ultima_fecha,v:null},v1:null,v12:null,al:false}:null;
    const m1=a.find(p=>p.d===shiftIso(L.d.slice(0,8)+'01',{d:-1})),y12=a.find(p=>p.d.slice(0,7)===shiftIso(L.d.slice(0,8)+'01',{y:-1}).slice(0,7));
    return {...f,last:L,v1:m1?(L.v/m1.v-1)*100:null,v12:y12?(L.v/y12.v-1)*100:null,al:L.d===ult}}).filter(Boolean);
}
function fondosHTML(){
  let F=fondosData();if(!F.length)return '<p class="hint center">No hay fondos cargados.</p>';
  const ult=F.filter(f=>f.last.v!=null).map(f=>f.last.d).sort().at(-1);
  F=F.filter(f=>(!mk.fact||f.al)&&(!mk.fcur||f.moneda===mk.fcur)&&(!mk.ftipo||f.tipo===mk.ftipo));
  F.sort((a,b)=>mk.fsort==='nom'?a.nombre.localeCompare(b.nombre):((b.v12??-1e9)-(a.v12??-1e9)));
  const seg=(k,opts)=>`<div class="seg tiny" role="group">${opts.map(([v,l])=>`<button type="button" data-mkf="${k}:${v}" aria-pressed="${String(mk[k])===String(v)}">${l}</button>`).join('')}</div>`;
  const cv=v=>v==null?'—':`<span class="${v>0?'up':v<0?'dn':''}">${esc(pct(v,1))}</span>`;
  return `<p class="mk2-lead">Valor cuota mensual de fondos de inversión cerrados y fideicomisos de oferta pública. La variación del valor cuota no incluye los beneficios que el fondo reparte, así que no es la rentabilidad total. Los fondos en pesos y en dólares no se comparan entre sí.</p>
    <div class="mk2-flt">${seg('fcur',[['','Todas'],['DOP','RD$'],['USD','US$']])}${seg('ftipo',[['','Todos'],['cerrado','Fondos cerrados'],['fideicomiso','Fideicomisos']])}${seg('fsort',[['v12','Por 12 meses'],['nom','Por nombre']])}${seg('fact',[[1,'Con dato de '+esc(fM(ult))],[0,'Todos']])}</div>
    <div class="mk2-list">${F.map(f=>`<button type="button" class="mk2-row" data-fondo="${esc(f.codigo)}"><span class="mk2-rt"><b>${esc(f.nombre)}</b><small>${f.tipo==='fideicomiso'?'Fideicomiso':'Fondo cerrado'} · ${f.moneda==='USD'?'US$':'RD$'}${f.last.v==null?' · sin datos recientes':' · '+esc(fM(f.last.d))}</small></span>
      <span class="mk2-rv num">${f.last.v==null?`<small>Último dato: ${esc(fM(f.last.d))}</small>`:`<b>${esc(fmt(f.last.v,f.moneda,2))}</b><small>mes ${cv(f.v1)} · 12 meses ${cv(f.v12)}</small>`}</span></button>`).join('')||'<p class="hint center">Ningún fondo con esos filtros.</p>'}</div>
    <p class="mk2-src-l">Fuente: <a href="${MK_SRC.simv}" target="_blank" rel="noopener">SIMV en datos.gob.do</a>, con datos de la BVRD que la SIMV indica que no están auditados por ella · datos a ${esc(fM(ult))}.</p>`;
}
async function openFondo(code){
  const f=(mkt.fondos||[]).find(x=>x.codigo===code);if(!f)return;
  sheet(`<h3>${esc(f.nombre)}</h3><p class="hint center" id="fdLoad">Cargando historial…</p>`,'var(--market)');
  let O=[];try{O=(await restAll(`mkt_obs?select=fecha_ref,valor&serie=eq.${encodeURIComponent(f.serie)}&order=fecha_ref`)).map(o=>({d:o.fecha_ref,v:+o.valor}))}catch(e){$('#fdLoad').textContent='No se pudo cargar el historial.';return}
  if(!O.length){$('#fdLoad').textContent='Sin datos.';return}
  const L=O.at(-1),F0=O[0],P=O.at(-2),y12=O.find(p=>p.d.slice(0,7)===shiftIso(L.d.slice(0,8)+'01',{y:-1}).slice(0,7)),yrsN=yrs(F0.d,L.d);
  const cagr=yrsN>=1?(Math.pow(L.v/F0.v,1/yrsN)-1)*100:null,mx=O.reduce((a,b)=>b.v>a.v?b:a),mn=O.reduce((a,b)=>b.v<a.v?b:a);
  const why=P?`El valor cuota ${L.v>=P.v?'subió':'bajó'} ${esc(pct((L.v/P.v-1)*100))} entre ${esc(fM(P.d))} y ${esc(fM(L.d))}. Es la variación del valor de cada cuota; si el fondo repartió beneficios en ese período, no están incluidos. Cálculo de Caoba sobre los datos publicados; no indica la causa.`:'';
  $('.sheet').innerHTML=`<div class="grab"></div><h3>${esc(f.nombre)}</h3><p class="lead-s">${f.tipo==='fideicomiso'?'Fideicomiso de oferta pública':'Fondo de inversión cerrado'} · ${f.moneda==='USD'?'dólares':'pesos'} · ${O.length} meses de datos</p>
    <div class="la-kpi num"><div><span>Valor cuota</span><b>${esc(fmt(L.v,f.moneda,2))}</b><small>${esc(fM(L.d))}</small></div><div><span>En 12 meses</span><b class="${y12?(L.v>=y12.v?'up':'dn'):''}">${y12?esc(pct((L.v/y12.v-1)*100,1)):'—'}</b><small>variación del valor cuota</small></div>
      <div><span>Anualizada desde el inicio</span><b>${cagr!=null?esc(pct(cagr,1)):'—'}</b><small>desde ${esc(fM(F0.d))}</small></div><div><span>Máximo y mínimo</span><b>${esc(fmt(mx.v,f.moneda,0))} · ${esc(fmt(mn.v,f.moneda,0))}</b><small>${esc(fM(mx.d))} · ${esc(fM(mn.d))}</small></div></div>
    ${tChart([{n:'Valor cuota',c:'var(--market)',p:O}],'mkFd',v=>fmt(v,f.moneda,0))}
    <h4 class="menu-g">¿Qué significa este movimiento?</h4><p class="mk2-why">${why}</p>
    <p class="mk2-src-l">Fuente: <a href="${MK_SRC.simv}" target="_blank" rel="noopener">SIMV en datos.gob.do</a>, datos de la BVRD no auditados por la SIMV.</p>`;
  bindT('mkFd');
}
/* ---------- Vista ---------- */
function vMercado(){
  if(!['moneda','inversion'].includes(mk.seg))mk.seg='moneda';
  if(!['notas','fondos','entidades'].includes(mk.inv))mk.inv='notas';
  loadMkt();
  const seg=`<div class="seg seg-top mk-types" role="group" aria-label="Sección"><button type="button" data-mks="moneda" aria-pressed="${mk.seg==='moneda'}">Moneda</button><button type="button" data-mks="inversion" aria-pressed="${mk.seg==='inversion'}">Tasas e inversiones</button></div>`;
  let body;
  if(!mkt.fx&&!mkt.err)body='<p class="hint center" style="margin:28px 0">Cargando datos del mercado…</p>';
  else if(!mkt.fx)body=`<p class="mk-note warn">${esc(mkt.err)}</p>`;
  else if(mk.seg==='moneda')body=monedaHTML();
  else body=`<div class="mk-types mk2-sub" role="group" aria-label="Instrumento">${[['notas','Notas del BCRD'],['fondos','Fondos cerrados'],['entidades','Tasas por entidad']].map(([k,l])=>`<button type="button" data-mkinv="${k}" aria-pressed="${mk.inv===k}">${l}</button>`).join('')}</div>`+(mk.inv==='notas'?notasHTML():mk.inv==='fondos'?fondosHTML():realHTML());
  $('#view').innerHTML=`<div class="mk2">${mkIndHTML()}${mkStatusHTML()}${mkt.err&&mkt.fx?`<p class="mk-note warn">${esc(mkt.err)}</p>`:''}${seg}${body}</div>${promoHTML('mercado')}`;
  document.querySelectorAll('[data-mks]').forEach(b=>b.onclick=()=>{mk.seg=b.dataset.mks;mkKeep();render();track('mercado_'+mk.seg)});
  document.querySelectorAll('[data-mkgo]').forEach(b=>b.onclick=()=>{mk.seg='moneda';mkKeep();render()});
  document.querySelectorAll('[data-mkinv]').forEach(b=>b.onclick=()=>{mk.inv=b.dataset.mkinv;mkKeep();render();track('mercado_'+mk.inv)});
  document.querySelectorAll('[data-mkper]').forEach(b=>b.onclick=()=>{mk.per=b.dataset.mkper;mkKeep();const y=scrollY;render();scrollTo(0,y)});
  document.querySelectorAll('[data-mkf]').forEach(b=>b.onclick=()=>{const [k,v]=b.dataset.mkf.split(':');mk[k]=k==='fact'?+v:v;mkKeep();const y=scrollY;render();scrollTo(0,y)});
  document.querySelectorAll('[data-nota]').forEach(b=>b.onclick=()=>openNota(b.dataset.nota));
  document.querySelectorAll('[data-fondo]').forEach(b=>b.onclick=()=>openFondo(b.dataset.fondo));
  document.querySelectorAll('[data-mkr]').forEach(b=>b.onclick=()=>{mkr.prod=b.dataset.mkr;render()});
  bindT('mkFx');
}
