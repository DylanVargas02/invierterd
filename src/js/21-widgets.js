/* ---------- Widgets nativos (etapa 5) ----------
   En la web no hace nada. En la app Android entrega a los widgets un resumen ya calculado (formato v1):
   solo totales, nombres de inversiones y tasas del mercado. Nunca movimientos, notas, números de cuenta
   ni datos de inicio de sesión. El lado nativo lo guarda cifrado con una clave del Android Keystore.
   iOS usará el mismo formato y la misma interfaz (CaobaWidgets.update / clear). */
const isNative=()=>!!(window.CAOBA_NATIVE&&window.capacitorExports&&window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
let CW=null,wsT=null,wsLast='';
function cwPlugin(){if(!CW&&isNative())CW=capacitorExports.registerPlugin('CaobaWidgets');return CW}
const both=v=>({d:+conv(v,S.base,'DOP').toFixed(4),u:+conv(v,S.base,'USD').toFixed(6)});
function widgetSnapshot(){
  const t=Date.now(),out={v:1,ts:t,base:S.base==='USD'?'USD':'DOP',hideAll:!!S.wHide,prof:S.profiles&&S.profiles.list.length>1?activeProfile().name:'',fin:null,mkt:null};
  if(!S.example){
    const F=snapshot(t),Ts=totals(t),L=invList(),Ti=totalsOf(L,t),now=new Date();
    const inMonth=x=>{const d=new Date(x.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()};
    const inc=S.incomes.filter(inMonth).reduce((a,x)=>a+conv(x.amt,x.cur,S.base),0),exp=S.expenses.filter(inMonth).reduce((a,x)=>a+conv(x.amt,x.cur,S.base),0);
    let next=null;L.forEach(s=>{const d=nextMat(s,t);if(d&&d>t&&(!next||d<next.date))next={name:s.name,date:d}});
    out.fin={net:both(F.assets-F.debt),assets:both(F.assets),debt:both(F.debt),ps:both(Ts.ps),
      flow:{label:MESES[now.getMonth()]+' '+now.getFullYear(),inc:both(inc),exp:both(exp)},
      inv:{total:both(Ti.v),gain:both(Ti.v-Ti.p),ps:both(Ti.ps),next,
        items:L.map(s=>({id:s.id,name:s.name,ent:s.entity,v:both(conv(savValue(s,t),s.cur,S.base)),rate:s.rate||0})).sort((a,b)=>b.v.d-a.v.d).slice(0,20)}};
  }
  if(mkr.rows&&mkr.rows.length){
    const R=[...mkr.rows].sort((a,b)=>(b.status==='real')-(a.status==='real')||(b.product==='tasa_cambio')-(a.product==='tasa_cambio')||Date.parse(b.observed_at)-Date.parse(a.observed_at));
    out.mkt={at:mkr.at,rows:R.slice(0,20).map(o=>{const fx=o.product==='tasa_cambio';return {id:String(o.id),inst:o.institution,
      label:fx?(o.currency==='USD'?'Dólar':o.currency==='EUR'?'Euro':o.currency):(o.product_name||MKR_PROD[o.product]||o.product)+' '+o.currency+(o.term_days?' '+mkrTerm(o.term_days):''),
      cur:o.currency,rate:+o.rate,rt:MKR_RT[o.rate_type]||o.rate_type,st:o.status,date:Date.parse(o.observed_at)||0,fx}})};
  }
  return out;
}
/* Se llama después de cada cambio (render). Espera un momento para agrupar cambios seguidos. */
function widgetSync(){
  if(!cwPlugin())return;clearTimeout(wsT);
  wsT=setTimeout(()=>{try{const s=widgetSnapshot(),k=JSON.stringify(Object.assign({},s,{ts:0}));if(k===wsLast)return;wsLast=k;
    CW.update({snapshot:JSON.stringify(s)}).catch(()=>{})}catch(e){}},900);
}
function widgetClear(){wsLast='';if(cwPlugin())CW.clear().catch(()=>{})}
