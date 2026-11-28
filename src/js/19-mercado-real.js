/* ---------- Mercado con datos verificables (etapa 4) ----------
   Las tasas vienen de la tabla market_observations de Supabase (vista market_latest: el último dato de cada serie).
   Cada dato muestra institución, producto, tasa, tipo, plazo, mínimo, vigencia, fecha, fuente y estado.
   Nada se edita ni se borra: una corrección es una fila nueva que reemplaza a la anterior. */
const MKR_PROD={certificado:'Certificados',cuenta_ahorro:'Cuentas de ahorro',fondo:'Fondos',bono:'Bonos',sbb:'Sell Buy Back',mutuo:'Mutuos',prestamo:'Préstamos',tarjeta:'Tarjetas',tasa_cambio:'Tasa de cambio',referencia:'Tasas de referencia',otro:'Otros'};
const MKR_RT={nominal:'nominal',efectiva:'efectiva',rendimiento:'rendimiento',compra:'compra',venta:'venta',referencia:'referencia'};
const MKR_ST={real:'Dato real',por_verificar:'Por verificar',simulado:'Simulado'};
const MKR_ITYPE={banco:'Banco',asociacion:'Asociación de ahorros',puesto_bolsa:'Puesto de bolsa',afi:'Administradora de fondos',gobierno:'Gobierno o Banco Central',casa_cambio:'Agente de cambio',cooperativa:'Cooperativa',otro:'Otra'};
/* Equivalencia entre el tipo de inversión de la persona y el producto del mercado */
const SAV2MK={'Certificado':'certificado','Cuenta de ahorro':'cuenta_ahorro','Fondo de inversión':'fondo','Bono':'bono','Sell Buy Back (SBB)':'sbb','Mutuo':'mutuo'};
let mkr={rows:null,at:0,err:'',loading:false,prod:''};
try{const c=JSON.parse(localStorage.getItem(KEY+'.mkr')||'null');if(c&&Array.isArray(c.rows)){mkr.rows=c.rows;mkr.at=c.at}}catch(e){}
async function loadMarket(force){
  if(mkr.loading||(!force&&mkr.rows&&Date.now()-mkr.at<10*60e3))return;
  if(!canCloud())return;mkr.loading=true;
  try{const r=await fetch(SUPABASE_URL+'/rest/v1/market_latest?select=*&order=observed_at.desc&limit=1000',{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY}});
    if(!r.ok)throw new Error('HTTP '+r.status);mkr.rows=await r.json();mkr.at=Date.now();mkr.err='';
    try{localStorage.setItem(KEY+'.mkr',JSON.stringify({rows:mkr.rows,at:mkr.at}))}catch(e){}
    widgetSync();
  }catch(e){mkr.err=mkr.rows?'Sin conexión: mostrando los datos guardados el '+dtFmt.format(new Date(mkr.at))+'.':'No se pudieron cargar las tasas. Revisa tu conexión.'}
  mkr.loading=false;if(view==='mercado'&&mk.seg==='inversion'&&mk.inv==='entidades')render();
}
const mkrTerm=d=>d==null?'Sin plazo':d===0?'A la vista':d%365===0?d/365+(d/365===1?' año':' años'):d%30===0?d/30+(d/30===1?' mes':' meses'):d+' días';
const mkrDate=v=>v?dateFmt.format(new Date(String(v).length<=10?v+'T12:00:00':v)):'';
function mkrRow(o){
  const fx=o.product==='tasa_cambio';
  return `<article class="mkr-r st-${o.status}">
    <div class="mkr-h">${inst(o.institution,1)}<span class="mkr-t"><b>${esc(o.institution)}</b><small>${esc(o.product_name||MKR_PROD[o.product]||o.product)} · ${esc(o.currency)}${fx?'':' · '+esc(mkrTerm(o.term_days))}${o.min_amount?' · desde '+esc(fmt(+o.min_amount,o.currency,0)):''}</small></span>
      <span class="mkr-v num"><b>${fx?'RD$'+(+o.rate).toFixed(4):(+o.rate).toFixed(2)+' %'}</b><small>${esc(MKR_RT[o.rate_type]||o.rate_type)}</small></span></div>
    <div class="mkr-m"><span class="mkr-st">${esc(MKR_ST[o.status]||o.status)}</span><span>Actualizado ${esc(mkrDate(o.observed_at))}</span>${o.valid_to?`<span>Vigente hasta ${esc(mkrDate(o.valid_to))}</span>`:''}
      <span>Fuente: ${o.source_url?`<a href="${esc(o.source_url)}" target="_blank" rel="noopener">${esc(o.source_name)}</a>`:esc(o.source_name)}</span></div>
    ${o.notes?`<p class="mkr-n">${esc(o.notes)}</p>`:''}</article>`;
}
/* Compara las inversiones de la persona con el mejor dato real cargado del mismo producto y moneda */
function mkrCompareHTML(rows){
  const real=rows.filter(o=>o.status==='real'&&o.product!=='tasa_cambio'&&['nominal','efectiva','rendimiento'].includes(o.rate_type));
  const mine=S.example?[]:S.savings.filter(s=>s.status!=='liquidada'&&SAV2MK[s.type]&&s.rate>0);
  const out=mine.map(s=>{const L=real.filter(o=>o.product===SAV2MK[s.type]&&o.currency===s.cur);if(!L.length)return '';
    const best=L.reduce((a,b)=>+b.rate>+a.rate?b:a),d=+best.rate-s.rate;
    return `<div class="mkr-cmp-r"><span><b>${esc(s.name)}</b><small>Recibes ${s.rate.toFixed(2)} %${s.rateKind==='efectiva'?' efectiva':''}</small></span><span class="num ${d>0.005?'up':'eq'}">${d>0.005?'Hay '+d.toFixed(2)+' puntos más':'Estás en la mejor tasa cargada'}<small>${esc(best.institution)} · ${(+best.rate).toFixed(2)} % ${esc(MKR_RT[best.rate_type])} · ${esc(mkrDate(best.observed_at))}</small></span></div>`}).filter(Boolean);
  return out.length?`<section class="panel mkr-cmp"><div class="panel-h"><b>Tus inversiones frente al mercado</b><span class="panel-s">Solo datos reales</span></div>${out.join('')}<p class="hint">Compara tasas del mismo tipo (nominal con nominal). Revisa plazo, monto mínimo y condiciones con la entidad antes de decidir.</p></section>`:'';
}
function realHTML(){
  if(!mkr.rows&&!mkr.err){loadMarket();return '<p class="hint center" style="margin:28px 0">Cargando tasas…</p>'}
  loadMarket();
  const rows=mkr.rows||[],prods=[...new Set(rows.map(o=>o.product))];
  if(mkr.prod&&!prods.includes(mkr.prod))mkr.prod='';
  const L=rows.filter(o=>!mkr.prod||o.product===mkr.prod).sort((a,b)=>a.product.localeCompare(b.product)||(+b.rate)-(+a.rate));
  return `${mkr.err?`<p class="mk-note warn">${esc(mkr.err)}</p>`:''}
    ${rows.length?`${mkrCompareHTML(rows)}<div class="mk-types" role="group" aria-label="Producto"><button type="button" data-mkr="" aria-pressed="${!mkr.prod}">Todos</button>${prods.map(k=>`<button type="button" data-mkr="${k}" aria-pressed="${mkr.prod===k}">${esc(MKR_PROD[k]||k)}</button>`).join('')}</div>
      <div class="mkr-list">${L.map(mkrRow).join('')}</div>`
    :`<section class="conn-empty"><h2>Todavía no hay tasas por entidad</h2><p>Aquí aparecerán las tasas de certificados, cuentas y otros productos de cada banco o puesto de bolsa, con su fuente, su fecha y su estado. Ninguna tasa se inventa: se cargan cuando se pueden verificar.</p></section>`}`;
}
