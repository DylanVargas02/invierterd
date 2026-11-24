/* ---------- Rendimientos: intereses ganados como ingreso ---------- */
function intOf(s,a,b){const t2=Math.min(b,Date.now()),t1=Math.max(a,s.start);if(!(s.rate>0)||t2<=t1)return 0;return Math.max(0,savValue(s,t2)-savValue(s,t1))}
const intIn=(a,b)=>S.savings.reduce((x,s)=>x+conv(intOf(s,a,b),s.cur,S.base),0);
const intYM=(y,ms)=>ms.reduce((x,m)=>x+intIn(+new Date(y,m,1),+new Date(y,m+1,1)-1),0);
let intR=null;
/* ---------- Ingresos y Gastos: Día · Semana · Mes · Año · Período ---------- */
const FLT_U=[['dia','Día'],['sem','Semana'],['mes','Mes'],['ano','Año'],['per','Período']];
let flt={gastos:{u:'mes',off:0},ingresos:{u:'mes',off:0}},openCat={};
try{Object.assign(flt,JSON.parse(localStorage.getItem(KEY+'.flt')||'{}'))}catch(e){}
function fltRange(f){
  const n=new Date(),y=n.getFullYear(),m=n.getMonth(),sod=new Date(y,m,n.getDate()),o=f.off||0;
  if(f.u==='dia'){const s=new Date(y,m,n.getDate()-o);return [+s,+new Date(y,m,n.getDate()-o+1)-1]}
  if(f.u==='sem'){const s=new Date(y,m,n.getDate()-((n.getDay()+6)%7)-7*o);return [+s,+new Date(s.getFullYear(),s.getMonth(),s.getDate()+7)-1]}
  if(f.u==='ano')return [+new Date(y-o,0,1),+new Date(y-o+1,0,1)-1];
  if(f.u==='per')return perRange('fechas');
  return [+new Date(y,m-o,1),+new Date(y,m-o+1,1)-1];
}
function fltLabel(f,R){
  const a=new Date(R[0]),b=new Date(R[1]),cap=s=>s[0].toUpperCase()+s.slice(1);
  if(f.u==='dia')return f.off===0?'Hoy':f.off===1?'Ayer':cap(dayShort.format(a));
  if(f.u==='sem')return (f.off===0?'Esta semana · ':'')+a.getDate()+(a.getMonth()!==b.getMonth()?' '+dateFmt.format(a).split(' ').slice(1).join(' '):'')+' – '+dateFmt.format(b);
  if(f.u==='ano')return String(a.getFullYear());
  return cap(MESES[a.getMonth()])+' de '+a.getFullYear();
}
/* ---------- Gráficos en el tiempo: Diario · Semanal · Mensual · Anual · Fechas ---------- */
const CH_U=[['dia','Diario'],['sem','Semanal'],['mes','Mensual'],['ano','Anual']],CH_N={dia:14,sem:12,mes:6,ano:5};
let CH={};try{CH=JSON.parse(localStorage.getItem(KEY+'.ch')||'{}')||{}}catch(e){}
const chS=k=>CH[k]||(CH[k]={u:'mes',rng:false,from:'',to:'',typ:'',acc:'',sel:null});
const chKeep=()=>{try{localStorage.setItem(KEY+'.ch',JSON.stringify(CH))}catch(e){}};
function tsBuckets(st){
  const u=st.u,n=new Date(),mo=new Intl.DateTimeFormat('es-DO',{month:'short'});
  const s0=d=>u==='dia'?new Date(d.getFullYear(),d.getMonth(),d.getDate()):u==='sem'?new Date(d.getFullYear(),d.getMonth(),d.getDate()-((d.getDay()+6)%7)):u==='mes'?new Date(d.getFullYear(),d.getMonth(),1):new Date(d.getFullYear(),0,1);
  const add=(d,k)=>u==='dia'?new Date(d.getFullYear(),d.getMonth(),d.getDate()+k):u==='sem'?new Date(d.getFullYear(),d.getMonth(),d.getDate()+7*k):u==='mes'?new Date(d.getFullYear(),d.getMonth()+k,1):new Date(d.getFullYear()+k,0,1);
  let a,end;
  if(st.rng&&st.from&&st.to){a=s0(new Date(parseDate(st.from)));end=parseDate(st.to)+DAY/2;if(end<+a)end=+add(a,1)-1}
  else{a=add(s0(n),-(CH_N[u]-1));end=Date.now()}
  const B=[];for(let d=a;+d<=end&&B.length<400;d=add(d,1)){const e=add(d,1);
    B.push({s:+d,e:+e,lf:u==='dia'?String(d.getDate()):u==='sem'?d.getDate()+' '+mo.format(d).replace('.',''):u==='mes'?mo.format(d).replace('.','').slice(0,3)+(d.getMonth()===0||!B.length?' '+String(d.getFullYear()).slice(2):''):String(d.getFullYear()),
      cap:u==='dia'?dayShort.format(d):u==='sem'?'Semana del '+dateFmt.format(d):u==='mes'?monthFmt.format(d):'Año '+d.getFullYear()})}
  const out=B.slice(-60),ev=Math.ceil(out.length/7);out.forEach((b,i)=>{b.l=(out.length-1-i)%ev===0?b.lf:''});out.cut=B.length>60;return out;
}
/* Controles comunes: frecuencia y fechas */
const chRng=k=>`<button type="button" class="ch-rng" data-chr="${k}" aria-pressed="${!!chS(k).rng}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>Fechas</button>`;
function chCtl(k){const st=chS(k);
  return `<div class="ch-ctl"><div class="seg tiny" role="group" aria-label="Frecuencia">${CH_U.map(([u,l])=>`<button type="button" data-chu="${k}:${u}" aria-pressed="${st.u===u}">${l}</button>`).join('')}</div>
</div>
    ${st.rng?`<div class="per-dates light ch-dates"><label>Desde<input type="date" data-chf="${k}:from" value="${esc(st.from)}" max="${today()}"></label><label>Hasta<input type="date" data-chf="${k}:to" value="${esc(st.to)}" max="${today()}"></label></div>`:''}`}
function bindChCtl(rerender){
  document.querySelectorAll('[data-chu]').forEach(b=>b.onclick=()=>{const [k,u]=b.dataset.chu.split(':'),st=chS(k);st.u=u;st.sel=null;chKeep();rerender()});
  document.querySelectorAll('[data-chr]').forEach(b=>b.onclick=()=>{const st=chS(b.dataset.chr);st.rng=!st.rng;st.sel=null;
    if(st.rng&&!st.from){const n=new Date();st.from=isoLocal(new Date(n.getFullYear(),n.getMonth()-5,1));st.to=today()}chKeep();rerender()});
  document.querySelectorAll('[data-chf]').forEach(i=>i.onchange=()=>{const [k,f]=i.dataset.chf.split(':'),st=chS(k);st[f]=i.value;st.sel=null;chKeep();rerender()});
}
function tipCol(w,tip,html,onPick){if(!w||!tip)return;
  w.insertAdjacentHTML('beforeend','<span class="dguide" aria-hidden="true" hidden></span>');const g=w.querySelector('.dguide');
  const show=b=>{w.querySelectorAll('.col').forEach(x=>x.setAttribute('aria-pressed',x===b));w.classList.add('picked');tip.innerHTML=html(b);tip.hidden=false;g.hidden=false;
    const cr=w.getBoundingClientRect(),br=b.getBoundingClientRect(),tw=tip.offsetWidth,x=br.left-cr.left+br.width/2,lf=Math.max(0,Math.min(cr.width-tw,x-tw/2));
    tip.style.left=lf+'px';tip.style.setProperty('--ax',(x-lf)+'px');g.style.left=x+'px'};
  w.querySelectorAll('.col').forEach(b=>b.onclick=()=>{const was=b.getAttribute('aria-pressed')==='true';
    if(was&&!onPick){w.querySelectorAll('.col').forEach(x=>x.setAttribute('aria-pressed','false'));w.classList.remove('picked');tip.hidden=true;g.hidden=true;return}
    show(b);if(onPick)onPick(+b.dataset.i)});
  return show;
}

/* Resumen: un solo panel con los totales del período tocado y las barras */
function ioPanel(){
  const st=chS('resumen'),B=tsBuckets(st);
  B.forEach(b=>{b.vi=S.incomes.filter(x=>x.date>=b.s&&x.date<b.e).reduce(sumB,0)+intIn(b.s,b.e);b.ve=S.expenses.filter(x=>x.date>=b.s&&x.date<b.e).reduce(sumB,0)});
  const has=B.some(b=>b.vi||b.ve);let sel=st.sel!=null&&st.sel<B.length?st.sel:B.length-1;
  const mx=Math.max(0,...B.map(b=>Math.max(b.vi,b.ve))),h=v=>mx&&v?Math.max(2.5,v/mx*100).toFixed(1):0,n=B.length;
  const sum=b=>{const bal=b.vi-b.ve;return `<p class="io-cap">${esc(b.cap[0].toUpperCase()+b.cap.slice(1))}${b===B[n-1]&&!st.rng?' · hasta hoy':''}</p>
    <div class="iol num">
      <button type="button" class="iol-r" data-go="ingresos"><span><span class="sw" style="background:var(--grow)"></span>Ingresos</span><b class="pos">+${esc(fmt(b.vi,S.base,0))}</b>${chev}</button>
      <button type="button" class="iol-r" data-go="gastos:mov"><span><span class="sw" style="background:var(--spend)"></span>Gastos</span><b class="negc">−${esc(fmt(b.ve,S.base,0))}</b>${chev}</button>
      <div class="iol-r tot"><span>${bal>=0?'Te queda':'Gastaste de más'}</span><b>${esc(fmt(bal,S.base,0))}</b></div></div>
    ${b.vi?`<p class="flow-t num">Gastaste el <b>${Math.round(b.ve/b.vi*100)} %</b> de lo que te entró</p>`:''}`};
  return `<section class="panel iop" id="ioP"><div class="panel-h"><b>Ingresos y gastos</b>${chRng('resumen')}</div>
    ${chCtl('resumen')}
    <div id="ioSum">${sum(B[sel])}</div>
    ${has?`<div class="colw dual tipc${n>20?' dense':''}${n<6?' few':''}" id="ioW"><div class="cols">${B.map((b,i)=>`<button type="button" class="col" data-i="${i}" data-cap="${esc(b.cap)}" aria-label="${esc(b.cap)}: ingresos ${esc(fmt(b.vi,S.base,0))}, gastos ${esc(fmt(b.ve,S.base,0))}" aria-pressed="${i===sel}"><i class="ci" style="height:${h(b.vi)}%"></i><i class="ce" style="height:${h(b.ve)}%"></i></button>`).join('')}</div>
      <div class="col-l" aria-hidden="true">${B.map(b=>`<span>${esc(b.l)}</span>`).join('')}</div></div>
      <div class="ch-leg"><span><i style="background:var(--grow)"></i>Ingresos</span><span><i style="background:var(--spend)"></i>Gastos</span><small>Toca una barra para ver ese período</small></div>${B.cut?'<p class="hint dnote">Se muestran los últimos 60 períodos.</p>':''}`
    :`<div class="dempty"><b>Aquí verás cómo se mueve tu dinero</b><span>Registra tus primeros ingresos y gastos y el gráfico aparecerá solo.</span></div>`}
  </section>`;
}
function bindIo(){
  bindChCtl(render);const w=$('#ioW');if(!w)return;const st=chS('resumen');
  w.querySelectorAll('.col').forEach(b=>b.onclick=()=>{st.sel=+b.dataset.i;chKeep();const y=window.scrollY;render();window.scrollTo({top:y})});
}

/* Ingresos / Gastos: barras apiladas por tipo con filtros de tipo y cuenta */
function stackPanel(kind){
  const inc=kind==='ingresos',st=chS(kind),B=tsBuckets(st),src=inc?S.incomes:S.expenses;
  const key=x=>inc?(INC[x.src]?x.src:'otros'):(CATS[x.cat]?x.cat:'otros');
  const nm=k=>k==='interes'?'Intereses ganados':inc?(INC[k]||'Otro ingreso'):(CATS[k]||CATS.otros).n,col=k=>k==='interes'?'var(--grow)':inc?(INC_C[k]||'var(--c-gray)'):(CATS[k]||CATS.otros).c;
  const typs=[...new Set(src.map(key))];if(inc&&S.savings.some(s=>s.rate>0&&!isAcct(s)||s.rate>0))typs.push('interes');
  const vias=[...new Set(src.map(x=>x.via||''))];if(inc&&typs.includes('interes'))S.savings.filter(s=>s.rate>0).forEach(s=>{if(!vias.includes('a:'+s.id))vias.push('a:'+s.id)});
  if(st.typ&&!typs.includes(st.typ))st.typ='';if(st.acc&&!vias.includes(st.acc))st.acc='';
  const ok=x=>(!st.typ||key(x)===st.typ)&&(!st.acc||st.acc==='-'&&!x.via||(x.via||'')===st.acc);
  B.forEach(b=>{const m={};src.filter(x=>x.date>=b.s&&x.date<b.e&&ok(x)).forEach(x=>{const k=key(x);m[k]=(m[k]||0)+conv(x.amt,x.cur,S.base)});
    if(inc&&(!st.typ||st.typ==='interes')){S.savings.forEach(s=>{if(st.acc&&st.acc!=='a:'+s.id)return;const v=conv(intOf(s,b.s,b.e),s.cur,S.base);if(v>0)m.interes=(m.interes||0)+v})}
    b.m=m;b.t=Object.values(m).reduce((a,v)=>a+v,0)});
  const order=typs.map(k=>[k,B.reduce((a,b)=>a+(b.m[k]||0),0)]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
  const mx=Math.max(0,...B.map(b=>b.t)),n=B.length,has=mx>0;
  const viaLbl=v=>v===''?'Efectivo':viaName(v);
  return `<section class="panel"><div class="panel-h"><b>${inc?'Tus ingresos en el tiempo':'Tus gastos en el tiempo'}</b>${chRng(kind)}</div>
    ${chCtl(kind)}
    <div class="ch-flt"><label><span>${inc?'Tipo':'Categoría'}</span><select data-cht="${kind}"><option value="">${inc?'Todos los tipos':'Todas'}</option>${typs.map(k=>`<option value="${k}" ${st.typ===k?'selected':''}>${esc(nm(k))}</option>`).join('')}</select></label>
      <label><span>Cuenta</span><select data-cha="${kind}"><option value="">Todas</option>${vias.map(v=>`<option value="${v||'-'}" ${st.acc===(v||'-')?'selected':''}>${esc(viaLbl(v))}</option>`).join('')}</select></label></div>
    ${has?`<div class="colw stk tipc${n>20?' dense':''}${n<6?' few':''}" id="stW"><div class="cols">${B.map((b,i)=>`<button type="button" class="col" data-i="${i}" data-cap="${esc(b.cap)}" aria-label="${esc(b.cap)}: ${esc(fmt(b.t,S.base,0))}" aria-pressed="false"><span class="stk-in" style="height:${b.t?Math.max(2.5,b.t/mx*100).toFixed(1):0}%">${order.filter(k=>b.m[k]).map(k=>`<i style="flex:${b.m[k].toFixed(2)};background:${col(k)}"></i>`).join('')}</span></button>`).join('')}</div>
      <div class="col-l" aria-hidden="true">${B.map(b=>`<span>${esc(b.l)}</span>`).join('')}</div><div class="dtip num" id="stTip" role="status" aria-live="polite" hidden></div></div>
      <div class="ch-leg">${order.slice(0,8).map(k=>`<span><i style="background:${col(k)}"></i>${esc(nm(k))}</span>`).join('')}</div>${B.cut?'<p class="hint dnote">Se muestran los últimos 60 períodos.</p>':''}`
    :`<div class="dempty"><b>Aquí verás cómo cambian tus ${inc?'ingresos':'gastos'}</b><span>${st.typ||st.acc?'No hay movimientos con ese filtro en estas fechas.':'Aparece solo cuando registres los primeros.'}</span></div>`}
  </section>`;
}
function bindStack(kind,rerender){
  bindChCtl(rerender);const st=chS(kind);
  document.querySelectorAll('[data-cht]').forEach(s=>s.onchange=()=>{st.typ=s.value;chKeep();rerender()});
  document.querySelectorAll('[data-cha]').forEach(s=>s.onchange=()=>{st.acc=s.value;chKeep();rerender()});
  const w=$('#stW');if(!w)return;
  const det=stackDetail(kind);
  tipCol(w,$('#stTip'),b=>`<span class="dt-c">${esc(b.dataset.cap)}</span><span><b>${esc(b.getAttribute('aria-label').split(': ').pop())}</b></span>${det[+b.dataset.i]||''}`);
}
function stackDetail(kind){
  const inc=kind==='ingresos',st=chS(kind),B=tsBuckets(st),src=inc?S.incomes:S.expenses;
  const key=x=>inc?(INC[x.src]?x.src:'otros'):(CATS[x.cat]?x.cat:'otros');
  const nm=k=>k==='interes'?'Intereses':inc?(INC[k]||'Otro ingreso'):(CATS[k]||CATS.otros).n,col=k=>k==='interes'?'var(--grow)':inc?(INC_C[k]||'var(--c-gray)'):(CATS[k]||CATS.otros).c;
  const ok=x=>(!st.typ||key(x)===st.typ)&&(!st.acc||st.acc==='-'&&!x.via||(x.via||'')===st.acc);
  return B.map(b=>{const m={};src.filter(x=>x.date>=b.s&&x.date<b.e&&ok(x)).forEach(x=>{const k=key(x);m[k]=(m[k]||0)+conv(x.amt,x.cur,S.base)});
    if(inc&&(!st.typ||st.typ==='interes'))S.savings.forEach(s=>{if(st.acc&&st.acc!=='a:'+s.id)return;const v=conv(intOf(s,b.s,b.e),s.cur,S.base);if(v>0)m.interes=(m.interes||0)+v});
    return Object.entries(m).sort((a,c)=>c[1]-a[1]).slice(0,5).map(([k,v])=>`<span><i style="background:${col(k)}"></i>${esc(nm(k))} ${esc(fmt(v,S.base,0))}</span>`).join('')});
}

/* Dona: cada parte se puede tocar; el total del centro siempre cabe */
function bigDonut(parts,tot,label,sub){
  const R=50,C=2*Math.PI*R,gap=parts.length>1?1.6:0;let off=0;
  const arcs=parts.map((p,i)=>{const L=p.v/tot*C,len=Math.max(.6,L-gap),mid=(off+L/2)/C*2*Math.PI-Math.PI/2;
    const s=`<circle class="arc" data-a="${i}" data-x="${(50+Math.cos(mid)*R/1.4).toFixed(1)}" data-y="${(50+Math.sin(mid)*R/1.4).toFixed(1)}" data-n="${esc(p.n)}" data-v="${esc(fmt(p.v,S.base,0))}" data-p="${tot?Math.round(p.v/tot*100):0}" r="${R}" cx="70" cy="70" fill="none" stroke="${p.c}" stroke-width="18" stroke-dasharray="${len.toFixed(2)} ${(C-len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 70 70)"><title>${esc(p.n)}</title></circle>`;off+=L;return s}).join('');
  return `<div class="bdn" id="bdn"><svg viewBox="0 0 140 140" role="img" aria-label="${esc(label)}: ${parts.map(p=>esc(p.n)+' '+Math.round(p.v/tot*100)+' %').join(', ')}">${tot?arcs:`<circle r="${R}" cx="70" cy="70" fill="none" stroke="var(--surface-2)" stroke-width="18"/>`}</svg>
    <div class="bdn-c"><b class="num fit" id="bdnTot">${esc(fmt(tot,S.base,0))}</b><span>${sub}</span></div><div class="dtip bdn-tip num" id="bdnTip" role="status" aria-live="polite" hidden></div></div>
    ${parts.length?'<p class="hint center bdn-h">Toca una parte del círculo para ver qué es</p>':''}`;
}
function bindDonut(){
  const w=$('#bdn');if(!w)return;const tip=$('#bdnTip');let on=null;
  const pick=a=>{w.querySelectorAll('.arc').forEach(x=>x.classList.toggle('dim',!!a&&x!==a));on=a;
    if(!a){tip.hidden=true;return}tip.innerHTML=`<span class="dt-c">${a.dataset.n}</span><span><b>${a.dataset.v}</b>&nbsp;· ${a.dataset.p} %</span>`;tip.hidden=false;
    const x=+a.dataset.x,y=+a.dataset.y;tip.style.left=x+'%';tip.style.top=y+'%';tip.classList.toggle('below',y<30)};
  w.querySelectorAll('.arc').forEach(a=>a.addEventListener('click',e=>{e.stopPropagation();pick(on===a?null:a)}));
  w.addEventListener('click',()=>pick(null));
}
/* Ajusta el tamaño del texto para que nunca se corte */
function fitText(){document.querySelectorAll('.fit').forEach(el=>{el.style.fontSize='';const max=parseFloat(getComputedStyle(el).fontSize);let f=max;
  const box=el.parentElement,w=box.clientWidth-parseFloat(getComputedStyle(box).paddingLeft)-parseFloat(getComputedStyle(box).paddingRight);
  while(f>11&&el.scrollWidth>w+0.5){f-=1;el.style.fontSize=f+'px'}})}
let flowBy={ingresos:'tipo',gastos:'tipo'};try{Object.assign(flowBy,JSON.parse(localStorage.getItem(KEY+'.by')||'{}'))}catch(e){}
function viaIcon(v){const o=viaObj(v);if(!o)return `<span class="tx-ic ic2" style="--ic:var(--ink-2)">${svgIc('<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/>')}</span>`;return o.o.type==='Efectivo'?`<span class="tx-ic ic2" style="--ic:var(--ink-2)">${svgIc('<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/>')}</span>`:inst(o.o.entity)}
function flowView(kind,extra){
  const inc=kind==='ingresos',f=flt[kind],R=fltRange(f),src=inc?S.incomes:S.expenses,by=flowBy[kind];
  const L=src.filter(x=>inR(x,R)).sort((a,b)=>b.date-a.date);let tot=L.reduce(sumB,0);
  const tkey=x=>inc?(INC[x.src]?x.src:'otros'):(CATS[x.cat]?x.cat:'otros');
  const G={};L.forEach(x=>{const k=tkey(x);(G[k]=G[k]||{k,L:[],v:0}).L.push(x);G[k].v+=conv(x.amt,x.cur,S.base)});
  let parts=Object.values(G).map(g=>({...g,n:inc?(INC[g.k]||'Otro ingreso'):(CATS[g.k]||CATS.otros).n,c:inc?(INC_C[g.k]||'var(--c-gray)'):(CATS[g.k]||CATS.otros).c}));
  let IT=[];if(inc){intR=R;IT=S.savings.map(s=>({s,v:intOf(s,R[0],R[1])})).filter(x=>x.v>0).sort((a,b)=>conv(b.v,b.s.cur,S.base)-conv(a.v,a.s.cur,S.base));
    const iv=IT.reduce((a,x)=>a+conv(x.v,x.s.cur,S.base),0);if(iv>0){parts.push({k:'interes',n:'Intereses ganados',c:'var(--grow)',L:[],v:iv,int:true});tot+=iv}}
  parts.sort((a,b)=>b.v-a.v);
  /* desglose por cuenta */
  let acc=[];if(by==='cuenta'){const A={};L.forEach(x=>{const v=x.via||'';(A[v]=A[v]||{k:v,L:[],v:0}).L.push(x);A[v].v+=conv(x.amt,x.cur,S.base)});
    acc=Object.values(A).map(g=>({...g,n:g.k===''?'Efectivo':viaName(g.k)}));const ip=parts.find(p=>p.int);if(ip)acc.push(ip);acc.sort((a,b)=>b.v-a.v)}
  const days=Math.max(1,Math.round((Math.min(R[1],Date.now())-R[0])/DAY));
  const sub=L.length?`${L.length} ${inc?(L.length===1?'ingreso':'ingresos'):(L.length===1?'gasto':'gastos')}${inc&&IT.length?' + intereses':''}`:(inc&&IT.length?'Intereses ganados':(inc?'Sin ingresos':'Sin gastos'));
  const nav=f.u==='per'?`<div class="per-dates light flt-dates"><label>Desde<input type="date" data-pf="from" value="${esc(perC.from)}"></label><label>Hasta<input type="date" data-pf="to" value="${esc(perC.to)}"></label></div>`
    :`<div class="flt-nav"><button type="button" class="flt-arr" data-fo="1" aria-label="Anterior"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><b>${esc(fltLabel(f,R))}</b><button type="button" class="flt-arr" data-fo="-1" aria-label="Siguiente" ${f.off<=0?'disabled':''}><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></div>`;
  const row=x=>`<button type="button" class="cat-it" data-edit-${inc?'i':'e'}="${x.id}"><span class="cat-it-t"><b>${esc(x.desc)}</b><small>${esc(dayShort.format(new Date(x.date)))} · ${esc(by==='cuenta'?(inc?(INC[x.src]||'Otro ingreso'):(CATS[x.cat]||CATS.otros).n):(x.via?viaName(x.via):'Efectivo'))}</small></span><span class="cat-it-v num">${inc?'+':'−'}${esc(fmt(x.amt,x.cur,2))}${x.cur!==S.base?`<small>≈ ${esc(fmt(conv(x.amt,x.cur,S.base),S.base,0))}</small>`:''}</span></button>`;
  const intGroup=p=>`<details class="cat2 intc" data-oc="${kind}:interes" ${openCat[kind+':interes']?'open':''}><summary><span class="tx-ic ic2 int-ic" style="--ic:var(--grow)">${incSvg('interes')}</span><span class="cat2-n"><b>Intereses ganados</b><small>${IT.length} ${IT.length===1?'inversión':'inversiones'} · en vivo</small></span><span class="cat2-p num">${tot?Math.round(p.v/tot*100):0} %</span><b class="cat2-v num" id="intTot">${esc(fmt(p.v,S.base,2))}</b><span class="chev rot" aria-hidden="true">›</span></summary>
      <div class="cat2-in">${IT.map(({s,v})=>`<button type="button" class="cat-it" data-edit-s="${s.id}"><span class="cat-it-t"><b>${esc(s.name)}</b><small>${esc(s.entity)} · ${s.rate?esc(rateTxt(s)):''}</small></span><span class="cat-it-v num">+<span data-int="${s.id}">${esc(fmt(v,s.cur,4))}</span>${s.cur!==S.base?`<small>≈ ${esc(fmt(conv(v,s.cur,S.base),S.base,0))}</small>`:''}</span></button>`).join('')}
      <p class="hint int-note">Lo que generan tus ahorros e inversiones en este período, ya con ISR si aplica. Se suma solo; no tienes que registrarlo.</p></div></details>`;
  const grp=(p,ic,key)=>`<details class="cat2" data-oc="${kind}:${by}:${esc(key)}" ${openCat[kind+':'+by+':'+key]?'open':''}><summary>${ic}<span class="cat2-n"><b>${esc(p.n)}</b><small>${p.L.length} ${p.L.length===1?'movimiento':'movimientos'}</small></span><span class="cat2-p num">${tot?Math.round(p.v/tot*100):0} %</span><b class="cat2-v num">${esc(fmt(p.v,S.base,0))}</b><span class="chev rot" aria-hidden="true">›</span></summary>
      <div class="cat2-in">${p.L.map(row).join('')}</div></details>`;
  const list=by==='cuenta'?acc.map(p=>p.int?intGroup(p):grp(p,viaIcon(p.k),p.k||'cash')).join(''):parts.map(p=>p.int?intGroup(p):grp(p,inc?incIc(p.k):catIc(p.k),p.k)).join('');
  return `<div class="flowg"><div class="fg-a"><section class="panel flt">
      <div class="flt-tabs" role="tablist" aria-label="Período">${FLT_U.map(([k,l])=>`<button type="button" role="tab" data-fu="${k}" aria-selected="${f.u===k}">${l}</button>`).join('')}</div>
      ${nav}
      ${bigDonut(parts,tot,inc?'Ingresos por tipo':'Gastos por categoría',sub)}
      ${L.length&&!inc?`<p class="flt-avg num">${esc(fmt(tot/days,S.base,0))} por día en promedio</p>`:''}
      <button type="button" class="flt-add ${inc?'inc':'exp'}" id="heroAdd"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>${inc?'Agregar ingreso':'Agregar gasto'}</button>
    </section></div>
    <div class="fg-b">${parts.length?`<h2 class="sec">Desglose<div class="seg tiny" role="group" aria-label="Agrupar"><button type="button" data-by="tipo" aria-pressed="${by!=='cuenta'}">${inc?'Por tipo':'Por categoría'}</button><button type="button" data-by="cuenta" aria-pressed="${by==='cuenta'}">Por cuenta</button></div></h2>
    <div class="cats2">${list}</div>`
    :`<p class="hint center" style="margin:18px 0">${inc?'No registraste ingresos':'No registraste gastos'} en este período.</p>`}${extra||''}</div>
    <div class="fg-c">${stackPanel(kind)}</div></div>`;
}
function bindFlow(kind,rerender){
  const f=flt[kind],keep=()=>{try{localStorage.setItem(KEY+'.flt',JSON.stringify(flt))}catch(e){}rerender()};
  document.querySelectorAll('[data-fu]').forEach(b=>b.onclick=()=>{f.u=b.dataset.fu;f.off=0;if(f.u==='per'&&!perC.from){perC.from=isoLocal(new Date(Date.now()-29*DAY));perC.to=today()}keep()});
  document.querySelectorAll('[data-fo]').forEach(b=>b.onclick=()=>{f.off=Math.max(0,(f.off||0)+(+b.dataset.fo));keep()});
  document.querySelectorAll('[data-pf]').forEach(i=>i.onchange=()=>{perC[i.dataset.pf]=i.value;rerender()});
  document.querySelectorAll('[data-by]').forEach(b=>b.onclick=()=>{flowBy[kind]=b.dataset.by;try{localStorage.setItem(KEY+'.by',JSON.stringify(flowBy))}catch(e){}rerender()});
  document.querySelectorAll('details.cat2').forEach(d=>d.ontoggle=()=>{openCat[d.dataset.oc]=d.open});
  bindDonut();bindStack(kind,rerender);bindEdit();
}
function paydaysHTML(){
  const P=S.paydays||[];
  return `<h2 class="sec">Cobros fijos</h2><p class="sec-lead">Salario, pensión, alquiler que cobras, remesa fija o cualquier ingreso que te llega en fechas fijas. Aparecen en tu calendario y, al confirmarlos, se suman a tu cuenta.</p>
    <div class="set-card pd-list">${P.map(p=>`<button type="button" class="set-row" data-pday="${p.id}">${incIc(p.src||'salario')}<span class="set-t"><b>${esc(p.name)} · ${esc(fmt(p.amt,p.cur,0))}</b><small>${p.freq==='quincenal'?'Cada quincena, días '+p.days.join(' y '):'Cada mes, el día '+p.days[0]} · ${esc(viaName(p.via))}</small></span><span class="set-go"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span></button>`).join('')}
    <button type="button" class="set-row" id="addPday"><span class="set-ic">+</span><span class="set-t"><b>${P.length?'Agregar otro cobro fijo':'Agregar un cobro fijo'}</b><small>Salario, pensión, alquiler, remesa…</small></span></button></div>`;
}
function vIngresos(){
  $('#view').innerHTML=flowView('ingresos',paydaysHTML());
  $('#heroAdd').onclick=()=>openExpense('ingreso');
  document.querySelectorAll('[data-pday]').forEach(b=>b.onclick=()=>openPayday(b.dataset.pday));$('#addPday').onclick=()=>openPayday();
  bindFlow('ingresos',render);
}

