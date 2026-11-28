/* ---------- Widgets nativos (etapa 5) ----------
   En la web no hace nada. En la app Android entrega a los widgets un resumen ya calculado (formato v1):
   solo totales, nombres y saldos de cuentas e inversiones y tasas del mercado (formato v2). Nunca movimientos, notas, números de cuenta
   ni datos de inicio de sesión. El lado nativo lo guarda cifrado con una clave del Android Keystore.
   iOS usará el mismo formato y la misma interfaz (CaobaWidgets.update / clear). */
const isNative=()=>!!(window.CAOBA_NATIVE&&window.capacitorExports&&window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
let CW=null,wsT=null,wsLast='';
function cwPlugin(){if(!CW&&isNative())CW=capacitorExports.registerPlugin('CaobaWidgets');return CW}
const both=v=>({d:+conv(v,S.base,'DOP').toFixed(4),u:+conv(v,S.base,'USD').toFixed(6)});
function widgetSnapshot(){
  const t=Date.now(),out={v:2,ts:t,base:S.base==='USD'?'USD':'DOP',hideAll:!!S.wHide,prof:S.profiles&&S.profiles.list.length>1?activeProfile().name:'',fin:null,mkt:null};
  if(!S.example){
    const F=snapshot(t),Ts=totals(t),L=invList(),Ti=totalsOf(L,t),now=new Date();
    const inMonth=x=>{const d=new Date(x.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()};
    const pm=new Date(now.getFullYear(),now.getMonth()-1,1),inPrev=x=>{const d=new Date(x.date);return d.getMonth()===pm.getMonth()&&d.getFullYear()===pm.getFullYear()&&d.getDate()<=now.getDate()};
    const sum=(A,f)=>A.filter(f).reduce((a,x)=>a+conv(x.amt,x.cur,S.base),0);
    const inc=sum(S.incomes,inMonth),exp=sum(S.expenses,inMonth),pinc=sum(S.incomes,inPrev),pexp=sum(S.expenses,inPrev);
    let cpn=null;L.filter(s=>s.bond).forEach(s=>{try{const n=bondSchedule(s).find(o=>o.st==='próximo');if(n&&(!cpn||n.d<cpn.date))cpn={name:s.name,date:n.d,amt:both(conv(n.exp,s.cur,S.base))}}catch(e){}});
    const lastMove=id=>{let m=0;[S.incomes,S.expenses].forEach(A=>A.forEach(x=>{if(x.via==='a:'+id)m=Math.max(m,x.date)}));(S.transfers||[]).forEach(x=>{if(x.from==='a:'+id||x.to==='a:'+id)m=Math.max(m,x.date)});return m};
    let next=null;L.forEach(s=>{const d=nextMat(s,t);if(d&&d>t&&(!next||d<next.date))next={name:s.name,date:d}});
    out.fin={net:both(F.assets-F.debt),assets:both(F.assets),debt:both(F.debt),ps:both(Ts.ps),
      flow:{label:MESES[now.getMonth()]+' '+now.getFullYear(),inc:both(inc),exp:both(exp),prev:{label:'mismo día de '+MESES[pm.getMonth()],inc:both(pinc),exp:both(pexp)}},
      acc:accts().map(s=>{const v=savValue(s,t);return {id:s.id,name:s.name,ent:s.type==='Efectivo'?'Efectivo':s.entity||'',cur:s.cur,
        bal:+v.toFixed(2),cash:s.type==='Efectivo',manual:true,upd:Math.max(lastMove(s.id),s.createdAt||0,s.start||0)}}).slice(0,20),
      inv:{total:both(Ti.v),gain:both(Ti.v-Ti.p),ps:both(Ti.ps),next,cpn,
        items:L.map(s=>({id:s.id,name:s.name,ent:s.entity,v:both(conv(savValue(s,t),s.cur,S.base)),rate:s.rate||0})).sort((a,b)=>b.v.d-a.v.d).slice(0,20)}};
  }
  const fxr=[];
  if(mkt.fx&&mkt.fx.c&&mkt.fx.c.length){[['c','compra'],['v','venta']].forEach(([k,rt])=>{const L=mkt.fx[k].at(-1);fxr.push({id:'bcrd_usd_'+rt,inst:'Banco Central',label:'Dólar',cur:'USD',rate:L.v,rt,st:'real',date:Date.parse(L.d+'T12:00:00')||0,fx:true})})}
  const rr=(mkr.rows||[]).filter(o=>o.status==='real').sort((a,b)=>(b.product==='tasa_cambio')-(a.product==='tasa_cambio')||Date.parse(b.observed_at)-Date.parse(a.observed_at)).map(o=>{const fx=o.product==='tasa_cambio';return {id:String(o.id),inst:o.institution,
      label:fx?(o.currency==='USD'?'Dólar':o.currency==='EUR'?'Euro':o.currency):(o.product_name||MKR_PROD[o.product]||o.product)+' '+o.currency+(o.term_days?' '+mkrTerm(o.term_days):''),
      cur:o.currency,rate:+o.rate,rt:MKR_RT[o.rate_type]||o.rate_type,st:o.status,date:Date.parse(o.observed_at)||0,fx}});
  if(fxr.length||rr.length)out.mkt={at:Math.max(mkt.at||0,mkr.at||0),rows:fxr.concat(rr).slice(0,20)};
  return out;
}
/* Se llama después de cada cambio (render). Espera un momento para agrupar cambios seguidos. */
function widgetSync(){
  if(!cwPlugin())return;clearTimeout(wsT);
  wsT=setTimeout(()=>{try{const s=widgetSnapshot(),k=JSON.stringify(Object.assign({},s,{ts:0}));if(k===wsLast)return;wsLast=k;
    CW.update({snapshot:JSON.stringify(s)}).catch(()=>{})}catch(e){}},900);
}
function widgetClear(){wsLast='';if(cwPlugin())CW.clear().catch(()=>{})}
