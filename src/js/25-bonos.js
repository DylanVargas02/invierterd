/* ---------- Bonos (v3) ----------
   s.bond = {face (valor nominal por bono), qty, price (% del nominal al comprar), mkt (% de mercado, opcional),
             cpn (tasa cupón anual %), rt (fija|variable|indexada), freq (meses entre cupones: 1,3,6,12; 0 = sin cupones; 'c' = calendario propio),
             dates (calendario propio, ms), basis ('30/360'|'act/365'|'act/360'|'act/act'), issue, isin, itype (gobierno|empresa|otro), country,
             ytm (% si la persona lo conoce), pays:[{d: fecha del cupón, amt, recv, via}] }
   Conceptos separados: tasa cupón, rendimiento al vencimiento (YTM), intereses devengados, ganancia de capital y flujo recibido.
   El valor en el patrimonio = nominal × precio + intereses devengados desde el último cupón. Los cupones cobrados van a la cuenta
   donde se depositan y no se suman al bono, para no contar dos veces el mismo dinero. */
const BASIS=[['30/360','30/360'],['act/365','Real/365'],['act/360','Real/360'],['act/act','Real/Real']];
const FREQS=[[6,'Semestral'],[3,'Trimestral'],[1,'Mensual'],[12,'Anual'],['c','Calendario propio'],[0,'Sin pagos periódicos']];
const bN=b=>(+b.face||0)*(+b.qty||1);
const addMo=(t,m)=>{const d=new Date(t),day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+m);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));return +d};
function d360(a,b){const A=new Date(a),B=new Date(b);return ((B.getFullYear()-A.getFullYear())*360+(B.getMonth()-A.getMonth())*30+(Math.min(B.getDate(),30)-Math.min(A.getDate(),30)))}
/* Fechas de cupón del bono, ascendentes: las que caen después de la emisión (o del período anterior a la compra) y hasta el vencimiento */
function bondDates(s){const b=s.bond;if(!b)return [];
  if(b.freq==='c')return (b.dates||[]).slice().sort((x,y)=>x-y);
  const f=+b.freq;if(!f||!s.due)return [];const stop=b.issue||addMo(s.start,-f),out=[];
  for(let d=s.due,i=0;d>stop+DAY/2&&i<1200;i++,d=addMo(s.due,-f*(i+1)))out.unshift(d);return out}
function prevCpn(s,D,t){let p=null;for(const d of D){if(d<=t)p=d;else break}if(p)return p;const b=s.bond;return b.freq==='c'?(b.issue||s.start):(D.length?addMo(D[0],-(+b.freq)):(b.issue||s.start))}
/* Cupón de un período según la base de días */
function cpnAmt(s,a,c){const b=s.bond,N=bN(b),r=(+b.cpn||0)/100,f=+b.freq;
  if(b.basis==='act/365')return N*r*(c-a)/(365*DAY);if(b.basis==='act/360')return N*r*(c-a)/(360*DAY);
  if(f&&b.freq!=='c')return N*r*f/12;return N*r*d360(a,c)/360}
/* Intereses devengados desde el último cupón hasta t (sin cobrar todavía) */
function bondAccrued(s,t){const b=s.bond;if(!b||!(+b.cpn>0)||(s.due&&t>=s.due))return 0;const D=bondDates(s);if(!D.length)return 0;
  const L=Math.max(prevCpn(s,D,t),b.freq==='c'&&!b.issue?s.start:-Infinity),C=D.find(d=>d>t);if(!C)return 0;
  const full=cpnAmt(s,L,C);let fr;if(b.basis==='30/360')fr=d360(L,t)/Math.max(1,d360(L,C));else fr=(t-L)/Math.max(1,C-L);
  return full*Math.max(0,Math.min(1,fr))*(s.isr?0.9:1)}
function bondValue(s,t){const b=s.bond,N=bN(b);if(s.status==='liquidada')return 0;if(s.due&&t>=s.due)return N;return N*((+b.mkt||+b.price||100)/100)+bondAccrued(s,t)}
function bondPerSec(s,t){const b=s.bond;if(!(+b.cpn>0)||(s.due&&t>=s.due)||s.status==='liquidada')return 0;return bN(b)*(+b.cpn/100)*(s.isr?0.9:1)/(YEAR/1000)}
/* Calendario de cupones con su estado: recibido, por registrar o próximo */
function bondSchedule(s){const b=s.bond,D=bondDates(s),buy=s.start,pays=b.pays||[];let prev=prevCpn(s,D,buy);
  return D.filter(d=>d>buy).map(d=>{const exp=cpnAmt(s,prev,d)*(s.isr?0.9:1),p=pays.find(x=>Math.abs(x.d-d)<DAY/2),o={d,exp,pay:p,st:p?'recibido':d<Date.now()?'por registrar':'próximo'};prev=d;return o})}
/* Rendimiento al vencimiento estimado (por 100 de nominal, capitalización según la frecuencia), desde la fecha y el precio de compra */
function bondYTM(s){const b=s.bond,P=+b.price,f=+b.freq,c=+b.cpn||0;if(!(P>0)||!s.due||s.due<=s.start)return null;
  const yrs=(s.due-s.start)/YEAR;if(!f||b.freq==='c'){return (Math.pow(100/P*(1+c/100*yrs),1/yrs)-1)*100}
  const per=12/f,D=bondDates(s).filter(d=>d>s.start);if(!D.length)return null;const L=prevCpn(s,bondDates(s),s.start),tau=(D[0]-s.start)/Math.max(1,D[0]-L),cp=c/per;
  const acc=cp*(1-tau),dirty=P+acc,pv=y=>D.reduce((a,_,k)=>a+(cp+(k===D.length-1?100:0))/Math.pow(1+y/per,tau+k),0);
  let lo=-0.9,hi=2;for(let i=0;i<120;i++){const m=(lo+hi)/2;if(pv(m)>dirty)lo=m;else hi=m}return (lo+hi)/2*100}
const bondPending=s=>{const b=s.bond,m=[];if(!(+b.price>0))m.push('precio de compra');if(!s.due)m.push('vencimiento');if(!(+b.cpn>=0)||b.cpn==='')m.push('tasa cupón');if(b.freq==='c'&&!(b.dates||[]).length)m.push('fechas de cupón');return m};

function openBond(pre={}){
  const ed=pre.id?S.savings.find(x=>x.id===pre.id):null,b=ed&&ed.bond?ed.bond:{};
  const v=ed?{entity:ed.entity,name:ed.name,cur:ed.cur,issuer:ed.issuer||'',isin:b.isin||ed.code||'',itype:b.itype||'gobierno',country:b.country||'República Dominicana',
    face:b.face||(pre.fromLegacy?+ed.principal.toFixed(2):''),qty:b.qty||1,price:b.price||(pre.fromLegacy?100:''),mkt:b.mkt||'',cpn:b.cpn!=null?b.cpn:(pre.fromLegacy?ed.rate:''),rt:b.rt||(ed.vr?'variable':'fija'),
    freq:b.freq!=null?b.freq:(pre.fromLegacy?(ed.intFreq||6):6),dates:b.dates||[],basis:b.basis||'30/360',issue:b.issue,buy:ed.start,due:ed.due,ytm:b.ytm||'',isr:ed.isr!==false,via:b.via||''}
    :{entity:pre.entity||'',name:'',cur:pre.cur||'DOP',issuer:'',isin:'',itype:'gobierno',country:'República Dominicana',face:pre.principal||'',qty:1,price:'',mkt:'',cpn:'',rt:'fija',freq:6,dates:[],basis:'30/360',buy:Date.now(),due:null,ytm:'',isr:true,via:''};
  const iso=t=>t?isoLocal(new Date(t)):'',A=accts().filter(a=>a.type!=='Efectivo');
  sheet(`<h3>${ed?'Editar bono':'Nuevo bono'}</h3><div class="fprog" id="bProg" aria-live="polite"></div>
  <form class="form fblocks" id="f" novalidate>
  <section class="fb"><h4>Identificación</h4>
    <div class="two"><div class="field"><label for="bIss">Emisor</label><input id="bIss" value="${esc(v.issuer)}" placeholder="Ej. Ministerio de Hacienda" maxlength="60"></div><div class="field"><label for="bName">Nombre del bono <span class="opt">opcional</span></label><input id="bName" value="${esc(v.name)}" placeholder="Ej. Bono Hacienda 2031" maxlength="60"></div></div>
    <fieldset class="field"><legend>Tipo de emisor</legend><div class="choice three-c">${[['gobierno','Gobierno'],['empresa','Empresa'],['otro','Otro']].map(([k,l])=>pill('bIt',k,l,v.itype===k)).join('')}</div></fieldset>
    <div class="two"><div class="field"><label for="sEnt">Lo tienes en</label>${entPick('sEnt',v.entity)}</div><div class="field"><label for="bCur">Moneda</label>${curSel('bCur',v.cur)}</div></div></section>
  <section class="fb"><h4>Cuánto</h4>
    <div class="two"><div class="field"><label for="bFace">Valor nominal de cada bono</label><input id="bFace" data-money="bCur" inputmode="decimal" value="${esc(v.face)}" placeholder="Ej. 100,000"></div><div class="field"><label for="bQty">Cantidad de bonos</label><input id="bQty" inputmode="numeric" value="${esc(v.qty)}"></div></div>
    <div class="two"><div class="field"><label for="bPrice">Precio de compra (% del nominal)</label><input id="bPrice" inputmode="decimal" value="${esc(v.price)}" placeholder="Ej. 101.25"></div><div class="field"><label for="bBuy">Fecha de compra</label><input type="date" id="bBuy" value="${iso(v.buy)}"></div></div>
    <p class="calc num" id="bCost"></p></section>
  <section class="fb"><h4>Cupones</h4>
    <div class="two"><div class="field"><label for="bCpn">Tasa cupón anual %</label><input id="bCpn" inputmode="decimal" value="${esc(v.cpn)}" placeholder="Ej. 10.50"></div><div class="field"><label for="bFreq">Pago de cupones</label><select id="bFreq">${FREQS.map(([k,l])=>`<option value="${k}" ${String(v.freq)===String(k)?'selected':''}>${l}</option>`).join('')}</select></div></div>
    <div class="field" id="bDatesF"><label for="bDates">Fechas de pago (una por línea, día/mes/año)</label><textarea id="bDates" rows="3" placeholder="15/06/2027&#10;15/12/2027">${(v.dates||[]).map(t=>{const d=new Date(t);return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()}).join('\n')}</textarea></div>
    <div class="two"><div class="field"><label for="bDue">Vencimiento</label><input type="date" id="bDue" value="${iso(v.due)}"></div><div class="field"><label for="bVia">Los cupones llegan a <span class="opt">opcional</span></label><select id="bVia"><option value="">Elegir al cobrar</option>${A.map(a=>`<option value="a:${a.id}" ${v.via==='a:'+a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select></div></div>
    <p class="calc num" id="bCalc"></p></section>
  <details class="fb adv-d"><summary><b>Más detalles</b><span class="hint">ISIN, emisión, base de días, precio actual, YTM</span></summary>
    <div class="two"><div class="field"><label for="bIsin">Código ISIN u otro <span class="opt">opcional</span></label><input id="bIsin" value="${esc(v.isin)}" maxlength="20" autocomplete="off"></div><div class="field"><label for="bIssue">Fecha de emisión <span class="opt">opcional</span></label><input type="date" id="bIssue" value="${iso(v.issue)}"></div></div>
    <div class="two"><div class="field"><label for="bBasis">Base de días</label><select id="bBasis">${BASIS.map(([k,l])=>`<option value="${k}" ${v.basis===k?'selected':''}>${l}</option>`).join('')}</select></div><div class="field"><label for="bRt">Tipo de tasa</label><select id="bRt">${[['fija','Fija'],['variable','Variable'],['indexada','Indexada']].map(([k,l])=>`<option value="${k}" ${v.rt===k?'selected':''}>${l}</option>`).join('')}</select></div></div>
    <div class="two"><div class="field"><label for="bMkt">Precio actual de mercado % <span class="opt">opcional</span></label><input id="bMkt" inputmode="decimal" value="${esc(v.mkt)}" placeholder="Si no lo sabes, se usa el de compra"></div><div class="field"><label for="bYtm">Rendimiento al vencimiento % <span class="opt">si lo conoces</span></label><input id="bYtm" inputmode="decimal" value="${esc(v.ytm)}"></div></div>
    <div class="field"><label for="bCountry">País</label><input id="bCountry" value="${esc(v.country)}" maxlength="40"></div>
    <label class="check"><input type="checkbox" id="bIsr" ${v.isr?'checked':''}><span>Retener ISR 10 % sobre los cupones ${help('isr')}</span></label>
  </details>
  <div class="err" id="err" role="alert"></div><button class="btn" type="submit">${ed?'Guardar cambios':'Guardar bono'}</button>
  ${ed?`<button type="button" class="link-btn danger del-link" id="bDel">Eliminar ${esc(ed.name)}</button>`:''}</form>`,'var(--grow)');
  wireHelp($('#layer'));if(ed)$('#bDel').onclick=()=>confirmDel(ed.name,delDetail('savings',ed),()=>removeItem('savings',ed.id));
  const fdates=()=>($('#bDates').value||'').split(/\n+/).map(x=>x.trim()).filter(Boolean).map(x=>{const m=/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(x);return m?new Date(+m[3],+m[2]-1,+m[1],12).getTime():NaN});
  const read=()=>{const fq=$('#bFreq').value;return {face:money($('#bFace').value)||0,qty:parseInt($('#bQty').value,10)||1,price:rate($('#bPrice').value||'0')||0,mkt:rate($('#bMkt').value||'0')||0,cpn:$('#bCpn').value.trim()===''?'':rate($('#bCpn').value),
    rt:$('#bRt').value,freq:fq==='c'?'c':+fq,dates:fq==='c'?fdates().filter(x=>!isNaN(x)):[],basis:$('#bBasis').value,issue:$('#bIssue').value?parseDate($('#bIssue').value):undefined,isin:$('#bIsin').value.trim(),itype:(document.querySelector('[name=bIt]:checked')||{}).value||'gobierno',
    country:$('#bCountry').value.trim(),ytm:$('#bYtm').value.trim()===''?'':rate($('#bYtm').value),via:$('#bVia').value,pays:b.pays||[]}};
  const upd=()=>{const B=read(),cur=$('#bCur').value,N=B.face*B.qty;$('#bDatesF').hidden=B.freq!=='c';
    $('#bCost').textContent=N?`Nominal total ${fmt(N,cur,2)}${B.price?' · pagaste '+fmt(N*B.price/100,cur,2)+(B.price!==100?' ('+(B.price>100?'con prima':'con descuento')+')':''):''}`:'';
    const tmp={start:$('#bBuy').value?parseDate($('#bBuy').value):Date.now(),due:$('#bDue').value?parseDate($('#bDue').value):null,isr:$('#bIsr').checked,bond:B};
    let t='';if(N&&B.cpn>0){if(B.freq&&B.freq!=='c'){const per=12/B.freq;t=`Cupón ${FREQS.find(f=>f[0]===B.freq)[1].toLowerCase()} esperado: ${fmt(N*B.cpn/100/per*(tmp.isr?.9:1),cur,2)}${tmp.isr?' neto de ISR':''} (${per} al año).`}
      if(tmp.due&&B.price){const y=bondYTM(tmp);if(y!=null&&isFinite(y))t+=` Rendimiento al vencimiento estimado: ${y.toFixed(2)} %. La tasa cupón (${B.cpn.toFixed(2)} %) no es lo mismo que el rendimiento.`}}
    $('#bCalc').textContent=t;
    const miss=[];if(!N)miss.push('valor nominal');if(!B.price)miss.push('precio');if(B.cpn==='')miss.push('tasa cupón');if(!tmp.due)miss.push('vencimiento');
    $('#bProg').innerHTML=`<span class="fp-bar"><i style="width:${Math.round((4-miss.length)/4*100)}%"></i></span><span>${miss.length?'Pendiente: '+miss.join(', ')+'. Puedes guardarlo y completarlo después.':'Datos esenciales completos'}</span>`};
  $('#f').addEventListener('input',upd);$('#f').addEventListener('change',upd);upd();
  $('#f').onsubmit=e=>{e.preventDefault();const err=t=>{$('#err').textContent=t},B=read(),N=B.face*B.qty;
    if(!(N>0)){$('#bFace').focus();return err('Escribe el valor nominal: es el monto sobre el que se calculan los cupones.')}
    if(B.price&&!(B.price>20&&B.price<200))return err('El precio va como porcentaje del nominal, por ejemplo 101.25.');
    if(B.cpn!==''&&!(B.cpn>=0&&B.cpn<60))return err('Revisa la tasa cupón.');
    const start=$('#bBuy').value?parseDate($('#bBuy').value):Date.now(),due=$('#bDue').value?parseDate($('#bDue').value):null;
    if(due&&due<=start)return err('El vencimiento debe ser posterior a la fecha de compra.');if(start>Date.now()+DAY)return err('La fecha de compra no puede estar en el futuro.');
    if(B.issue&&B.issue>start)return err('La fecha de emisión no puede ser posterior a la de compra.');
    if(B.freq==='c'&&fdates().some(isNaN))return err('Revisa las fechas de pago: una por línea, como 15/06/2027.');
    const ent=readEnt('sEnt'),iss=$('#bIss').value.trim();
    const x={type:'Bono',entity:ent||iss||'Sin entidad',issuer:iss||undefined,code:B.isin||undefined,name:$('#bName').value.trim()||('Bono '+(iss||ent||'')).trim(),cur:$('#bCur').value,start,due:due||undefined,months:due?Math.max(1,Math.round((due-start)/MONTH)):undefined,open:due?undefined:true,
      principal:N*(B.price||100)/100,rate:B.cpn===''?0:B.cpn,vr:B.rt!=='fija'||undefined,isr:$('#bIsr').checked,liquid:false,intFreq:B.freq==='c'?undefined:B.freq,bond:B};
    if(ed){['due','open','vr','intFreq','months','issuer','code'].forEach(k=>delete ed[k]);Object.keys(x).forEach(k=>x[k]===undefined&&delete x[k]);Object.assign(ed,x);save();close();render();toast('Bono actualizado');return}
    x.id=uid();x.createdAt=Date.now();Object.keys(x).forEach(k=>x[k]===undefined&&delete x[k]);S.savings.push(x);track('bono_agregado');save();close();setView('inversion');render();window.scrollTo({top:0});
    const miss=bondPending(x);toast(miss.length?'Bono guardado · pendiente: '+miss.join(', '):'Bono guardado')};
}

/* Ficha del bono: conceptos separados, calendario de cupones y registro de pagos recibidos */
function openBondDetail(id){
  const s=S.savings.find(x=>x.id===id);if(!s||!s.bond)return openSaving({id});const b=s.bond,t=Date.now(),N=bN(b),cur=s.cur;
  const sch=bondSchedule(s),recv=sch.filter(c=>c.pay).reduce((a,c)=>a+c.pay.amt,0),expRecv=sch.filter(c=>c.pay).reduce((a,c)=>a+c.exp,0);
  const acc=bondAccrued(s,t),val=bondValue(s,t),cost=s.principal,capG=N*((+b.mkt||+b.price||100)-(+b.price||100))/100,ytmE=bondYTM(s),miss=bondPending(s);
  const nx=sch.find(c=>c.st==='próximo');
  sheet(`<h3>${esc(s.name)}</h3><p class="lead-s">${esc(s.issuer||s.entity)}${b.isin?' · '+esc(b.isin):''} · ${esc({gobierno:'Gobierno',empresa:'Empresa',otro:'Otro emisor'}[b.itype]||'')} · ${esc(cur)}</p>
  ${miss.length?`<p class="mk-note">Faltan datos: ${esc(miss.join(', '))}. Los cálculos que dependen de ellos no se muestran.</p>`:''}
  <dl class="bd-kv num">
    <div><dt>Valor nominal</dt><dd>${esc(fmt(N,cur,2))}<small>${b.qty} × ${esc(fmt(+b.face,cur,0))}</small></dd></div>
    <div><dt>Pagaste</dt><dd>${esc(fmt(cost,cur,2))}<small>${b.price?(+b.price).toFixed(2)+' % el '+dateFmt.format(new Date(s.start)):'precio pendiente'}</small></dd></div>
    <div><dt>Tasa cupón</dt><dd>${b.cpn!==''?(+b.cpn).toFixed(2)+' %':'—'}<small>${esc({fija:'Fija',variable:'Variable',indexada:'Indexada'}[b.rt]||'')} · ${esc((FREQS.find(f=>String(f[0])===String(b.freq))||[0,''])[1])}</small></dd></div>
    <div><dt>Rendimiento al vencimiento</dt><dd>${b.ytm!==''&&b.ytm!=null?(+b.ytm).toFixed(2)+' %':ytmE!=null&&isFinite(ytmE)?'≈ '+ytmE.toFixed(2)+' %':'—'}<small>${b.ytm!==''&&b.ytm!=null?'Dato que registraste':ytmE!=null?'Estimado con tu precio de compra':''}</small></dd></div>
    <div><dt>Intereses devengados</dt><dd>${esc(fmt(acc,cur,2))}<small>Desde el último cupón, aún sin cobrar</small></dd></div>
    <div><dt>Ganancia o pérdida de capital</dt><dd class="${capG<0?'neg':''}">${esc(fmt(capG,cur,2))}<small>${b.mkt?'Precio actual '+(+b.mkt).toFixed(2)+' %':'Sin precio de mercado: se usa el de compra'}</small></dd></div>
    <div><dt>Cupones cobrados</dt><dd>${esc(fmt(recv,cur,2))}<small>${expRecv&&Math.abs(recv-expRecv)>0.5?'Esperado '+fmt(expRecv,cur,2):'Flujo de efectivo recibido'}</small></dd></div>
    <div><dt>Valor en tu patrimonio</dt><dd>${esc(fmt(val,cur,2))}<small>Nominal × precio + devengados</small></dd></div>
  </dl>
  ${nx?`<p class="calc">Próximo cupón: <b class="num">${esc(fmt(nx.exp,cur,2))}</b> el ${dateFmt.format(new Date(nx.d))}${s.isr?' (neto de ISR)':''}.</p>`:''}
  <h4 class="menu-g">Calendario de cupones</h4>
  ${sch.length?`<div class="scroll"><table class="bd-t"><thead><tr><th>Fecha</th><th class="num">Esperado</th><th class="num">Recibido</th><th>Estado</th></tr></thead><tbody>${sch.map((c,i)=>`<tr class="st-${c.st.replace(' ','-')}"><td>${dateFmt.format(new Date(c.d))}</td><td class="num">${esc(fmt(c.exp,cur,2))}</td><td class="num">${c.pay?esc(fmt(c.pay.amt,cur,2)):'—'}</td><td>${c.st==='por registrar'||c.st==='próximo'&&c.d-t<20*DAY?`<button type="button" class="link-btn" data-cpn="${c.d}">${c.st==='por registrar'?'Registrar':'Ya lo cobré'}</button>`:c.pay?`<button type="button" class="link-btn" data-cpnx="${c.d}">Recibido · quitar</button>`:esc(c.st)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="hint">Sin cupones periódicos: el bono paga al vencimiento.</p>'}
  ${s.due?`<p class="hint">Vence el ${dateFmt.format(new Date(s.due))}: recibes ${esc(fmt(N,cur,2))} de capital.</p>`:''}
  <div class="form"><button class="btn ghost" type="button" id="bdEd">Editar datos del bono</button></div>`,'var(--grow)');
  $('#bdEd').onclick=()=>openBond({id});
  document.querySelectorAll('[data-cpn]').forEach(x=>x.onclick=()=>openCouponPay(id,+x.dataset.cpn));
  document.querySelectorAll('[data-cpnx]').forEach(x=>x.onclick=()=>{const d=+x.dataset.cpnx,p=(b.pays||[]).find(q=>Math.abs(q.d-d)<DAY/2);if(!p)return;
    b.pays=b.pays.filter(q=>q!==p);if(p.inc){const i=S.incomes.find(q=>q.id===p.inc);if(i){applyVia(i,-1,'i');S.incomes=S.incomes.filter(q=>q!==i)}}save();openBondDetail(id);toast('Cupón quitado')});
}
function openCouponPay(id,d){
  const s=S.savings.find(x=>x.id===id),b=s.bond,c=bondSchedule(s).find(q=>Math.abs(q.d-d)<DAY/2);if(!c)return;
  const A=accts().filter(a=>a.type!=='Efectivo');
  sheet(`<h3>Cupón del ${dateFmt.format(new Date(d))}</h3><form class="form" id="f" novalidate>
    <p class="lead-s">Esperado: <b class="num">${esc(fmt(c.exp,s.cur,2))}</b>${s.isr?' neto de ISR':''}. Escribe lo que la entidad te depositó realmente.</p>
    <div class="two"><div class="field"><label for="cpA">Monto recibido</label><input id="cpA" data-money="cpCur" inputmode="decimal" value="${c.exp.toFixed(2)}"><input type="hidden" id="cpCur" value="${s.cur}"></div><div class="field"><label for="cpD">Fecha en que llegó</label><input type="date" id="cpD" value="${isoLocal(new Date(Math.min(d,Date.now())))}"></div></div>
    <div class="field"><label for="cpV">¿A qué cuenta llegó?</label><select id="cpV">${A.map(a=>`<option value="a:${a.id}" ${b.via==='a:'+a.id?'selected':''}>${esc(a.name)}</option>`).join('')}<option value="">Efectivo u otra cuenta no registrada</option></select><small class="hint">Se registra como ingreso de esa cuenta. El bono no cambia de valor por cobrar el cupón.</small></div>
    <p class="err" id="err" role="alert"></p><button class="btn" type="submit">Registrar cupón</button></form>`,'var(--grow)');
  $('#f').onsubmit=e=>{e.preventDefault();const amt=money($('#cpA').value);if(!(amt>0))return $('#err').textContent='Escribe el monto recibido.';
    if((b.pays||[]).some(q=>Math.abs(q.d-d)<DAY/2))return $('#err').textContent='Ese cupón ya está registrado.';
    const via=$('#cpV').value,inc={id:uid(),desc:'Cupón · '+s.name,amt,cur:s.cur,date:parseDate($('#cpD').value||today()),via,src:'renta',nat:'fijo',bondCpn:s.id};
    applyVia(inc,1,'i');S.incomes.push(inc);b.pays=(b.pays||[]).concat({d,amt,recv:inc.date,via,inc:inc.id});save();track('cupon_registrado');openBondDetail(id);render();toast('Cupón registrado')};
}
