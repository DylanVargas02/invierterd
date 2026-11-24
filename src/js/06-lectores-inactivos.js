/* ---------- Lectores de avisos: consumos con tarjeta y acuerdos de puestos de bolsa ---------- */
const MES={enero:0,febrero:1,marzo:2,abril:3,mayo:4,junio:5,julio:6,agosto:7,septiembre:8,setiembre:8,octubre:9,noviembre:10,diciembre:11,ene:0,feb:1,mar:2,abr:3,may:4,jun:5,jul:6,ago:7,sep:8,sept:8,oct:9,nov:10,dic:11};
const DATE_RX='(\\d{1,2}[\\/\\-.]\\d{1,2}[\\/\\-.]\\d{2,4}|\\d{4}-\\d{1,2}-\\d{1,2}|\\d{1,2}\\s+de\\s+[a-záéíóú]+\\s+(?:de|del)\\s+\\d{4}|\\d{1,2}[\\-\\s][a-z]{3,4}[\\-\\s]\\d{2,4})';
function parseDateEs(s){
  if(!s)return null;s=s.trim().toLowerCase();let m;
  if((m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)))return new Date(+m[1],+m[2]-1,+m[3]).getTime();
  if((m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/))){let y=+m[3];if(y<100)y+=2000;return new Date(y,+m[2]-1,+m[1]).getTime()}
  if((m=s.match(/^(\d{1,2})\s+de\s+([a-záéíóú]+)\s+(?:de|del)\s+(\d{4})$/))&&MES[m[2]]!==undefined)return new Date(+m[3],MES[m[2]],+m[1]).getTime();
  if((m=s.match(/^(\d{1,2})[\-\s]([a-z]{3,4})[\-\s](\d{2,4})$/))&&MES[m[2]]!==undefined){let y=+m[3];if(y<100)y+=2000;return new Date(y,MES[m[2]],+m[1]).getTime()}
  return null;
}
const clean=t=>String(t||'').replace(/ /g,' ').replace(/[ \t]+/g,' ').replace(/\r/g,'');
function curOf(sym,ctx){
  const s=(sym||'').toUpperCase();
  if(/US|USD|U\$S/.test(s))return 'USD';if(/EUR|€/.test(s))return 'EUR';if(/RD|DOP/.test(s))return 'DOP';
  if(ctx&&/d[oó]lares|USD|US\$/i.test(ctx)&&!/RD\$|DOP|pesos/i.test(ctx))return 'USD';
  return 'DOP';
}
const MONEY_RX=/(RD\$|US\$|U\$S|USD|DOP|EUR|€|\$)\s*([0-9][0-9.,]*[0-9])|([0-9][0-9.,]*[0-9])\s*(DOP|USD|EUR|pesos|d[oó]lares)/gi;

/* Categoría probable según el comercio */
const CAT_RULES=[
  ['comida',/SUPERMERC|SUPER |COLMADO|NACIONAL|BRAVO|JUMBO|SIRENA|PLAZA LAMA|CARREFOUR|PRICESMART|ALMACENES|REST|PIZZA|BURGER|CAFE|COFFEE|KFC|MCDONALD|WENDY|PANADER|FOOD|DELIVERY|PEDIDOSYA|UBER ?EATS|CARNIC|POLLO/],
  ['transporte',/SHELL|TEXACO|ESSO|TOTAL|SUNIX|PETRO|GASOLIN|ESTACION|COMBUSTIBLE|UBER(?! ?EATS)|INDRIVE|CABIFY|TAXI|PEAJE|PASO RAPIDO|PARQUEO|AUTO ?PARTS|GOMER/],
  ['salud',/FARMACIA|CAROL|CLINICA|HOSPITAL|LABORAT|REFERENCIA|AMADITA|MEDIC|ODONT|DENTAL|OPTICA|GYM|GIMNASIO|SMART FIT|BODY SHOP/],
  ['ocio',/NETFLIX|SPOTIFY|CINE|CARIBBEAN CINEMAS|PALACIO DEL CINE|DISNEY|HBO|MAX\.COM|PRIME VIDEO|STEAM|PLAYSTATION|XBOX|APPLE\.COM|GOOGLE \*|BAR |LOUNGE|DISCO|HOTEL|AIRBNB|BOOKING|EXPEDIA|AEROL|ARAJET|JETBLUE|AMERICAN AIR/],
  ['servicios',/EDESUR|EDENORTE|EDEESTE|CLARO|ALTICE|VIVA|CAASD|CORAASAN|WIND|INTERNET|TELECABLE|SEGURO|SURA|MAPFRE|HUMANO|PALIC/],
  ['educacion',/COLEGIO|ESCUELA|UNIVERSIDAD|INTEC|PUCMM|UNIBE|UASD|UNAPEC|APEC|LIBRER|CUESTA|COURSERA|UDEMY|PLATZI|DUOLINGO/],
  ['vivienda',/ALQUILER|INMOBILI|CONDOMINIO|MANTENIMIENTO|FERRETER|OCHOA|HOME DEPOT|IKEA|MUEBLES/]
];
function guessCat(merchant){const m=(merchant||'').toUpperCase();for(const [c,rx] of CAT_RULES)if(rx.test(m))return c;return 'otros'}

/* Aviso de consumo con tarjeta → {amt,cur,merchant,last4} o null */
function parseCardAlert(raw){
  const t=clean(raw), one=t.replace(/\n+/g,' ');
  if(!/(consumo|compra|transacci[oó]n|cargo|autorizad|fue utilizada|uso de (su|tu) tarjeta|retiro|purchase)/i.test(one))return null;
  if(/(pago (recibido|aplicado)|hemos recibido (su|tu) pago|abono a (su|tu)|reverso|devoluci[oó]n|estado de cuenta|promoci[oó]n|oferta especial|c[oó]digo de (seguridad|verificaci[oó]n)|token|OTP)/i.test(one)&&!/(consumo|compra) (por|de)/i.test(one))return null;
  if(!/(tarjeta|card|TC\b|d[eé]bito|cr[eé]dito|\*{2,}\d{4}|x{2,}\d{4})/i.test(one))return null;
  let best=null;
  const kw=one.search(/(monto|por (un )?(valor|monto) de|importe|por RD|por US|por \$|amount)/i);
  for(const m of one.matchAll(MONEY_RX)){
    const sym=m[1]||m[4], num=money(m[2]||m[3]);
    if(!(num>0)||num>5e7)continue;
    const near=kw>=0?Math.abs(m.index-kw):9999;
    if(!best||near<best.near)best={amt:num,cur:curOf(sym,one),near};
  }
  if(!best)return null;
  let merchant='';let mm;
  if((mm=one.match(/(?:comercio|establecimiento|merchant|lugar|negocio)\s*[:\-]\s*([^\n|;]{3,45}?)(?=\s+(?:fecha|monto|hora|tarjeta|el d[ií]a|por|referencia|ciudad|pa[ií]s)\b|[.;|]|$)/i)))merchant=mm[1];
  else{for(const m of one.matchAll(/\ben\s+(?:el\s+comercio\s+)?([A-Z0-9][A-Z0-9 &'.\-*\/#]{2,40}[A-Z0-9])(?=\s+(?:el|por|con|fecha|monto|a las|en fecha|de fecha|\d)|[.,;]|$)/g)){if(/[A-Z]{2}/.test(m[1])){merchant=m[1];break}}}
  merchant=merchant.replace(/\s{2,}/g,' ').trim().replace(/^(EL|LA)\s+COMERCIO\s+/,'');
  const l4=one.match(/(?:terminad[ao]s?\s+en|termina(?:da)?\s+en|finalizad[ao]\s+en|que termina en|[uú]ltimos\s+(?:4|cuatro)\s+d[ií]gitos\s*:?|ending in|\*{2,}|x{2,}|X{2,})\s*(\d{4})\b/i);
  return {amt:best.amt,cur:best.cur,merchant:merchant.toUpperCase()||'',last4:l4?l4[1]:'',kind:/retiro/i.test(one)?'retiro':'consumo'};
}

/* Aviso de depósito o transferencia recibida → {amt,cur,last4,from} o null */
function parseDeposit(raw){
  const t=clean(raw),one=t.replace(/\n+/g,' ');
  if(!/(dep[oó]sito|transferencia recibida|recibiste una transferencia|ha recibido|cr[eé]dito a (su|tu) cuenta|acreditad[oa]|abono a (su|tu) cuenta|n[oó]mina)/i.test(one))return null;
  if(/(c[oó]digo de (seguridad|verificaci[oó]n)|token|OTP|promoci[oó]n|estado de cuenta)/i.test(one))return null;
  let best=null;const kw=one.search(/(monto|por (un )?(valor|monto) de|importe|por RD|por US|por \$|amount)/i);
  for(const m of one.matchAll(MONEY_RX)){const sym=m[1]||m[4],num=money(m[2]||m[3]);if(!(num>0)||num>5e7)continue;const near=kw>=0?Math.abs(m.index-kw):9999;if(!best||near<best.near)best={amt:num,cur:curOf(sym,one),near}}
  if(!best)return null;
  const l4=one.match(/(?:terminad[ao]s?\s+en|termina(?:da)?\s+en|cuenta\s+(?:no\.?\s*)?(?:\*+|x+)?|[uú]ltimos\s+(?:4|cuatro)\s+d[ií]gitos\s*:?|\*{2,}|x{2,}|X{2,})\s*(\d{4})\b/i);
  const fr=one.match(/(?:de parte de|enviad[ao] por|ordenante|remitente)\s*:?\s*([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ .]{2,40}?)(?=\s+(?:por|el|en|monto|a su)\b|[.,;]|$)/);
  return {amt:best.amt,cur:best.cur,last4:l4?l4[1]:'',from:fr?fr[1].trim():''};
}
/* Acuerdo o confirmación de un puesto de bolsa → {rate,amt,cur,name,issuer,start,end,months} o null */
function parseBroker(raw,sender){
  const t=clean(raw), one=t.replace(/\n+/g,' ');
  if(!/(tasa|rendimiento|cup[oó]n|yield|ytm)/i.test(one))return null;
  const num='(\\d{1,2}(?:[.,]\\d{1,6})?)';
  const rateRx=new RegExp('(tasa(?:\\s+de)?(?:\\s+(?:rendimiento|cup[oó]n|inter[eé]s|anual|pactada|de\\s+compra|de\\s+colocaci[oó]n|efectiva))?|rendimiento(?:\\s+(?:anual|al\\s+vencimiento|a\\s+vencimiento|esperado|efectivo))?|yield|ytm)\\s*(?:\\(\\s*%\\s*\\))?\\s*(?:anual)?\\s*[:=]?\\s*'+num+'\\s*(%|por\\s*ciento)?','gi');
  let rate=null;
  for(const m of one.matchAll(rateRx)){
    const val=parseFloat(m[2].replace(',','.'));
    if(!(val>0.05&&val<40))continue;
    const lab=m[1].toLowerCase();
    const score=/rendimiento|yield|ytm|pactada|compra|colocaci|efectiva/.test(lab)?3:/cup/.test(lab)?1:2;
    if(!rate||score>rate.score)rate={val,score};
  }
  if(!rate)return null;
  const amtRx=/(monto\s+(?:a\s+liquidar|liquidado|invertido|transado|total|neto|de\s+la\s+operaci[oó]n|a\s+pagar|nominal)|monto|valor\s+(?:transado|de\s+compra|liquidado|a\s+pagar|efectivo|nominal|facial)|total\s+a\s+(?:pagar|liquidar|debitar)|importe(?:\s+total)?|capital(?:\s+invertido)?|inversi[oó]n)\s*(?:\(\s*(?:RD\$|US\$|DOP|USD)\s*\))?\s*[:=]?\s*(?:de\s+|por\s+)?(RD\$|US\$|DOP|USD|\$)?\s*([0-9][0-9.,]{2,}[0-9])/gi;
  let amt=null;
  for(const m of one.matchAll(amtRx)){
    const v=money(m[3]);if(!(v>=1000))continue;
    const lab=m[1].toLowerCase();
    const score=/liquid|pagar|transado|invertido|debitar|efectivo|neto|compra|capital|inversi/.test(lab)?3:/nominal|facial/.test(lab)?1:2;
    if(!amt||score>amt.score)amt={v,score,cur:curOf(m[2],one)};
  }
  if(!amt)return null;
  const dateAfter=lab=>{const m=one.match(new RegExp('('+lab+')\\s*[:=]?\\s*'+DATE_RX,'i'));return m?parseDateEs(m[2]):null};
  const start=dateAfter('fecha\\s+(?:valor|de\\s+liquidaci[oó]n|de\\s+operaci[oó]n|de\\s+pacto|de\\s+compra|de\\s+transacci[oó]n|de\\s+colocaci[oó]n|de\\s+emisi[oó]n)');
  const end=dateAfter('fecha\\s+de\\s+(?:vencimiento|redenci[oó]n|recompra|retroventa)|vencimiento|vence');
  let months=null;
  const pd=one.match(/plazo\s*[:=]?\s*(\d{1,4})\s*d[ií]as/i), pm=one.match(/plazo\s*[:=]?\s*(\d{1,3})\s*mes/i);
  if(start&&end&&end>start)months=Math.max(1,Math.round((end-start)/(30.44*864e5)));
  else if(pd)months=Math.max(1,Math.round(+pd[1]/30.44));else if(pm)months=+pm[1];
  const ins=one.match(/\b(bonos?\s+(?:soberanos?|corporativos?|del\s+ministerio\s+de\s+hacienda|de\s+deuda\s+subordinada)?|certificados?\s+(?:de\s+inversi[oó]n|financieros?)?|letras?\s+del\s+banco\s+central|notas?\s+de\s+renta\s+fija|papel(?:es)?\s+comercial(?:es)?|reportos?|cuotas?\s+de\s+(?:un\s+)?fondo|valores?\s+de\s+fideicomiso)/i);
  const iss=one.match(/(Ministerio\s+de\s+Hacienda|Banco\s+Central(?:\s+de\s+la\s+Rep[uú]blica\s+Dominicana)?|BCRD|Hacienda)/i);
  const yr=end?new Date(end).getFullYear():null;
  let name=(ins?ins[1].replace(/\s+/g,' ').trim():'Inversión');name=name.charAt(0).toUpperCase()+name.slice(1).toLowerCase();
  if(iss&&!/hacienda|banco central/i.test(name))name+=' · '+(/hacienda/i.test(iss[1])?'Hacienda':'Banco Central');
  name=name.replace(/ministerio de hacienda/i,'Ministerio de Hacienda').replace(/banco central/i,'Banco Central');
  if(yr)name+=' '+yr;
  return {rate:rate.val,amt:amt.v,cur:amt.cur,name,issuer:iss?iss[1]:'',entity:sender||'Puesto de bolsa',start,end,months:months||12,reporto:/reporto/i.test(one)};
}

/* ---------- Correo: Gmail solo lectura, desde el propio teléfono ---------- */
const GOOGLE_CLIENT_ID='841813943891-ue07m6inn374ki8gch2uj3ktaq0jij12.apps.googleusercontent.com';
const MAIL_DEFAULT={clientId:GOOGLE_CLIENT_ID,connected:false,lastScan:0,seen:{},minRate:'',keepCed:false,
  cardQ:'newer_than:60d (consumo OR compra OR transacción OR transaccion OR cargo OR "fue utilizada") (tarjeta OR débito OR crédito)',
  incQ:'newer_than:60d (depósito OR deposito OR "transferencia recibida" OR "ha recibido" OR acreditado OR "crédito a su cuenta" OR nómina)',
  brokerQ:'newer_than:365d ("puesto de bolsa" OR valores OR "casa de bolsa") (confirmación OR confirmacion OR operación OR operacion OR liquidación OR colocación OR colocacion OR reporto)'};
const GSI_SRC='https://accounts.google.com/gsi/client', GAPI='https://gmail.googleapis.com/gmail/v1/users/me/';
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
let gTok=null,gTokExp=0,cedSession='',pdfReady=null;
const dtFmt=new Intl.DateTimeFormat('es-DO',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});
function loadScript(src){return new Promise((res,rej)=>{if(document.querySelector(`script[src="${src}"]`)){res();return}const s=document.createElement('script');s.src=src;s.async=true;s.onload=res;s.onerror=()=>rej(new Error('No se pudo cargar un componente necesario. Revisa tu conexión.'));document.head.appendChild(s)})}
function loadPdf(){
  if(!pdfReady)pdfReady=(async()=>{await loadScript(PDFJS+'pdf.worker.min.js');await loadScript(PDFJS+'pdf.min.js');const L=window.pdfjsLib;L.GlobalWorkerOptions.workerSrc=PDFJS+'pdf.worker.min.js';return L})().catch(e=>{pdfReady=null;throw e});
  return pdfReady;
}
function getCed(){if(cedSession)return cedSession;try{return localStorage.getItem(KEY+'.ced')||''}catch(e){return ''}}
function setCed(v,keep){cedSession=v;try{if(keep&&v)localStorage.setItem(KEY+'.ced',v);else localStorage.removeItem(KEY+'.ced')}catch(e){}}
function cedVariants(){const c=getCed(),d=c.replace(/\D/g,'');if(!d)return [];return [...new Set([d,d.replace(/^(\d{3})(\d{7})(\d)$/,'$1-$2-$3'),c.trim()])]}
/* Abre un PDF; si está protegido prueba la cédula (con y sin guiones). Todo ocurre en el teléfono. */
async function pdfText(bytes,pwds){
  const L=await loadPdf();
  for(const pw of [undefined,...pwds]){
    try{const doc=await L.getDocument({data:bytes.slice(0),password:pw,isEvalSupported:false}).promise;let out='';
      for(let i=1;i<=Math.min(doc.numPages,8);i++){const p=await doc.getPage(i);const tc=await p.getTextContent();out+=tc.items.map(it=>it.str+(it.hasEOL?'\n':' ')).join('')+'\n'}
      await doc.destroy();return out}
    catch(e){if(e&&e.name==='PasswordException')continue;throw e}
  }
  const err=new Error(pwds.length?'La cédula no abre este PDF.':'Este PDF está protegido. Escribe tu cédula para abrirlo.');err.code='pw';throw err;
}
async function gToken(interactive=true){
  if(gTok&&Date.now()<gTokExp-60e3)return gTok;
  if(!S.mail.clientId)throw new Error('Falta el ID de cliente de Google. Sigue la guía de instalación y pégalo en Configuración avanzada.');
  await loadScript(GSI_SRC);
  if(!window.google||!google.accounts)throw new Error('Google no respondió. Esta función trabaja en la app instalada desde tu propio enlace.');
  return new Promise((res,rej)=>{
    const c=google.accounts.oauth2.initTokenClient({client_id:S.mail.clientId,scope:'https://www.googleapis.com/auth/gmail.readonly',
      callback:r=>{if(r.error)return rej(new Error('Google no dio permiso ('+r.error+').'));gTok=r.access_token;gTokExp=Date.now()+(+r.expires_in||3600)*1000;S.mail.connected=true;save();res(gTok)},
      error_callback:e=>rej(new Error(e&&e.type==='popup_closed'?'Cerraste la ventana de Google antes de terminar.':'No se pudo abrir la ventana de Google. Permite ventanas emergentes e inténtalo de nuevo.'))});
    c.requestAccessToken({prompt:S.mail.connected?'':'consent'});
  });
}
async function gGet(path){const t=await gToken();const r=await fetch(GAPI+path,{headers:{Authorization:'Bearer '+t}});if(r.status===401){gTok=null;throw new Error('El permiso de Google venció. Toca «Revisar correo ahora» otra vez.')}if(!r.ok)throw new Error('Gmail respondió con un error ('+r.status+').');return r.json()}
const b64u=s=>{const bin=atob(s.replace(/-/g,'+').replace(/_/g,'/'));const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u};
const htmlText=h=>{try{const d=new DOMParser().parseFromString(h,'text/html');d.querySelectorAll('br,p,div,tr,li').forEach(n=>n.append('\n'));return d.body?d.body.textContent:''}catch(e){return h.replace(/<[^>]+>/g,' ')}};
function walk(p,acc){
  if(p.parts)p.parts.forEach(x=>walk(x,acc));
  else if(p.filename&&/\.pdf$/i.test(p.filename)&&p.body&&p.body.attachmentId)acc.pdfs.push(p.body.attachmentId);
  else if(p.body&&p.body.data){const txt=new TextDecoder().decode(b64u(p.body.data));if(p.mimeType==='text/plain')acc.plain+=txt;else if(p.mimeType==='text/html')acc.html+=txt}
  return acc;
}
async function gMessage(id){
  const m=await gGet('messages/'+id+'?format=full');
  const h=Object.fromEntries((m.payload.headers||[]).map(x=>[x.name.toLowerCase(),x.value]));
  const acc=walk(m.payload,{plain:'',html:'',pdfs:[]});
  return {id,from:h.from||'',subject:h.subject||'',date:+m.internalDate||Date.now(),text:acc.plain||htmlText(acc.html),pdfs:acc.pdfs};
}
const senderName=f=>{const m=f.match(/^\s*"?([^"<]+?)"?\s*</);if(m)return m[1].trim();const d=f.match(/@([\w.-]+)/);return d?d[1]:'Puesto de bolsa'};
function cardPending(r,date,src){
  const card=r.last4?S.cards.find(c=>c.last4===r.last4):null,acc=!card&&r.last4?S.savings.find(s=>s.last4===r.last4):null;
  return {acctId:acc?acc.id:null,id:'m'+(src||uid()),desc:r.merchant||(r.kind==='retiro'?'Retiro con tarjeta':'Consumo con tarjeta'),amt:r.amt,cur:r.cur,cat:guessCat(r.merchant),cardId:card?card.id:null,last4:r.last4,date:date||Date.now(),src:'correo'};
}
function invPending(r,date,src){return {id:'i'+(src||uid()),name:r.name,entity:r.entity,issuer:r.issuer,rate:r.rate,amt:r.amt,cur:r.cur,start:r.start||date||Date.now(),end:r.end,months:r.months,date:date||Date.now()}}
async function scanMail(step,opt={}){
  const M=S.mail,seen=M.seen||(M.seen={});let nc=0,ni=0,nin=0,locked=0,hits=[];
  const days=opt.days||(M.lastScan?0:90),q=s=>days?s.replace(/newer_than:\d+d/,'newer_than:'+days+'d'):s;
  const W4=(M.watch||[]).map(w=>w.last4),watched=l4=>!W4.length||!l4||W4.includes(l4);
  const list=async qq=>((await gGet('messages?maxResults='+(days>60?100:40)+'&q='+encodeURIComponent(q(qq)))).messages||[]);
  step('Buscando consumos…');
  for(const {id} of await list(M.cardQ)){if(seen[id])continue;const m=await gMessage(id);seen[id]=1;const r=parseCardAlert(m.subject+'\n'+m.text);if(r&&watched(r.last4)&&!S.pending.some(p=>p.id==='m'+id)){S.pending.push(cardPending(r,m.date,id));nc++}}
  step('Buscando depósitos…');
  for(const {id} of await list(M.incQ||MAIL_DEFAULT.incQ)){if(seen[id])continue;const m=await gMessage(id);seen[id]=1;const r=parseDeposit(m.subject+'\n'+m.text);
    if(r&&watched(r.last4)&&!S.pending.some(p=>p.id==='d'+id)){const acc=r.last4?S.savings.find(s=>s.last4===r.last4):null;S.pending.push({id:'d'+id,k:'in',desc:r.from?'Depósito de '+r.from:'Depósito recibido',amt:r.amt,cur:r.cur,src:'otros',acctId:acc?acc.id:null,last4:r.last4,date:m.date||Date.now(),src2:'correo'});nin++}}
  step('Leyendo acuerdos de inversión…');
  for(const {id} of await list(M.brokerQ)){
    if(seen[id])continue;const m=await gMessage(id);let text=m.subject+'\n'+m.text,lockedHere=false;
    for(const aid of m.pdfs.slice(0,4)){try{const a=await gGet('messages/'+id+'/attachments/'+aid);text+='\n'+await pdfText(b64u(a.data),cedVariants())}catch(e){if(e.code==='pw'){locked++;lockedHere=true}}}
    const r=parseBroker(text,senderName(m.from));
    if(r&&!S.pendingInv.some(p=>p.id==='i'+id)){S.pendingInv.push(invPending(r,m.date,id));ni++;if(+M.minRate&&r.rate>=+M.minRate)hits.push(r)}
    if(r||!lockedHere)seen[id]=1;
  }
  M.lastScan=Date.now();save();return {nc,ni,nin,locked,hits};
}

/* ---- Inversiones detectadas ---- */
function invInboxHTML(){
  if(!S.pendingInv.length)return '';const min=+S.mail.minRate||0;
  return `<section class="inbox" aria-label="Inversiones detectadas"><div class="inbox-h"><span>Inversiones detectadas <span class="count num">${S.pendingInv.length}</span></span>${S.example?'<span class="tag">Ejemplo</span>':''}</div>
  ${S.pendingInv.map(p=>`<div class="pend">${inst(p.entity,1)}<div class="pm"><b>${esc(p.name)}</b><span>${esc(p.entity)}${p.end?' · vence '+monthShort.format(new Date(p.end)):' · '+p.months+' meses'}</span></div><span class="rate-pill g num">${p.rate.toFixed(2)}%</span>
    <div class="pend-act"><span class="num inv-amt">${esc(fmt(p.amt,p.cur,0))}${min&&p.rate>=min?' · <b class="hit">sobre tu tasa mínima</b>':''}</span><button class="mini-btn" data-ino="${p.id}">Descartar</button><button class="mini-btn go" data-iok="${p.id}">Agregar</button></div></div>`).join('')}</section>`;
}
function bindInv(){
  document.querySelectorAll('[data-iok]').forEach(b=>b.onclick=()=>{
    const i=S.pendingInv.findIndex(x=>x.id===b.dataset.iok);if(i<0)return;const p=S.pendingInv.splice(i,1)[0];
    S.savings.push({id:uid(),name:p.name,entity:p.entity,type:/certificado/i.test(p.name)?'Certificado':/sell|buy|sbb|recompra/i.test(p.name)?'Sell Buy Back (SBB)':/mutuo/i.test(p.name)?'Mutuo':/bono|letra|nota/i.test(p.name)?'Bono':'Otro',cur:p.cur,principal:p.amt,rate:p.rate,start:p.start,months:p.months,due:p.end&&p.end>p.start?p.end:undefined,isr:true,liquid:false});
    save();render();toast('Inversión agregada. Ya está creciendo.')});
  bindDel('[data-ino]','pendingInv');
}

/* ---- Pantalla «Correo y documentos» ---- */
function openMail(){
  const M=S.mail;
  const reg=[...S.cards.filter(c=>c.last4).map(c=>({name:c.name,last4:c.last4})),...accts().filter(s=>s.last4).map(s=>({name:s.name,last4:s.last4}))];
  const W0=M.watch||[],all=[...reg,...W0.filter(w=>!reg.some(r=>r.last4===w.last4))];
  sheet(`<h3>Conectar tu correo</h3><div class="form">
  <div class="mail-st${M.connected?' on':''}"><b>${M.connected?'Gmail conectado · solo lectura':'Gmail sin conectar'}</b><span>${M.lastScan?'Última revisión: '+dtFmt.format(new Date(M.lastScan)):'Tus consumos, depósitos e inversiones se anotan solos con los avisos de tu banco.'}</span></div>
  <fieldset class="field mw"><legend>Tarjetas y cuentas que seguimos</legend>
    ${all.length?all.map((w,i)=>`<label class="o-w"><input type="checkbox" data-mw="${i}" ${W0.some(x=>x.last4===w.last4)?'checked':''}><span class="o-w-t"><b>${esc(w.name)}</b><small>•••• ${esc(w.last4)}</small></span></label>`).join(''):'<p class="hint">Agrega los últimos 4 dígitos de tus tarjetas o cuentas para reconocer sus avisos.</p>'}
    <div class="mc-add mw-add"><input id="mwN" maxlength="30" placeholder="Ej. Tarjeta Popular" aria-label="Nombre"><input id="mw4" inputmode="numeric" maxlength="4" placeholder="1234" aria-label="Últimos 4 dígitos"><button type="button" class="btn ghost" id="mwAdd">Agregar</button></div>
    <small class="hint">Si no marcas ninguna, leemos los avisos de todas tus tarjetas y cuentas.</small></fieldset>
  <button class="btn" type="button" id="mScan">${G_LOGO}${M.connected?'Revisar correo ahora':'Conectar Gmail y cargar 3 meses'}</button>
  <p class="err" id="mErr" role="alert"></p>
  <div class="field"><label for="mCed">Cédula para abrir PDF protegidos</label><input id="mCed" type="password" inputmode="numeric" autocomplete="off" value="${esc(getCed())}" placeholder="001-0000000-0"></div>
  <label class="check"><input type="checkbox" id="mKeep" ${M.keepCed?'checked':''}><span>Recordarla en este teléfono. Se usa solo aquí para abrir los PDF; no se envía a ningún lado.</span></label>
  <div class="field"><label for="mMin">Avísame si una colocación paga al menos (%)</label><input id="mMin" inputmode="decimal" value="${esc(M.minRate||'')}" placeholder="10.00"></div>
  <details class="adv"><summary>Probar con un archivo o un texto</summary>
    <div class="adv-in"><div class="field"><label for="mFile">PDF de tu puesto de bolsa o aviso guardado</label><input type="file" id="mFile" accept=".pdf,.txt,.eml,application/pdf,text/plain,message/rfc822"></div>
    <div class="field"><label for="mTxt">O pega el texto de un aviso</label><textarea id="mTxt" rows="4" placeholder="Pega aquí el correo del banco o del puesto de bolsa"></textarea></div>
    <button class="btn ghost" type="button" id="mTry">Leer</button><div id="mOut" class="mail-out" aria-live="polite"></div></div></details>
  <details class="adv"><summary>Configuración avanzada</summary>
    <div class="adv-in"><div class="field"><label for="mCid">ID de cliente de Google</label><input id="mCid" value="${esc(M.clientId||'')}" placeholder="xxxx.apps.googleusercontent.com" autocomplete="off"></div>
    <div class="field"><label for="mQ1">Búsqueda de consumos (formato de Gmail)</label><textarea id="mQ1" rows="3">${esc(M.cardQ)}</textarea></div>
    <div class="field"><label for="mQ2">Búsqueda de puestos de bolsa</label><textarea id="mQ2" rows="3">${esc(M.brokerQ)}</textarea></div>
    ${M.connected?'<button class="btn ghost" type="button" id="mOff">Desconectar Gmail</button>':''}</div></details>
  <button class="btn ghost" type="button" id="mSave">Guardar</button></div>`,'var(--brand)');
  const watchSave=()=>{M.watch=all.filter((w,i)=>{const c=document.querySelector(`[data-mw="${i}"]`);return c&&c.checked})};
  $('#mwAdd').onclick=()=>{const n=$('#mwN').value.trim()||'Tarjeta o cuenta',l=$('#mw4').value.replace(/\D/g,'');if(l.length!==4){$('#mw4').focus();return toast('Escribe los 4 últimos dígitos')}watchSave();M.watch.push({name:n,last4:l});save();openMail()};
  const keep=()=>{watchSave();M.keepCed=$('#mKeep').checked;setCed($('#mCed').value.trim(),M.keepCed);M.minRate=$('#mMin').value.trim()?String(rate($('#mMin').value)):'';
    const cid=$('#mCid').value.trim();if(cid!==M.clientId){M.clientId=cid;gTok=null}M.cardQ=$('#mQ1').value.trim()||MAIL_DEFAULT.cardQ;M.brokerQ=$('#mQ2').value.trim()||MAIL_DEFAULT.brokerQ;save()};
  $('#mSave').onclick=()=>{keep();close();toast('Guardado')};
  $('#mScan').onclick=async()=>{keep();const b=$('#mScan'),er=$('#mErr');er.textContent='';b.disabled=true;
    try{const r=await scanMail(t=>{b.textContent=t});close();render();
      const parts=[];if(r.nc)parts.push(r.nc+(r.nc===1?' consumo nuevo':' consumos nuevos'));if(r.nin)parts.push(r.nin+(r.nin===1?' depósito':' depósitos'));if(r.ni)parts.push(r.ni+(r.ni===1?' inversión':' inversiones'));
      toast(parts.length?parts.join(' y ')+' por confirmar':'Sin novedades en el correo');
      if(r.hits.length)setTimeout(()=>toast(`Colocación al ${r.hits[0].rate.toFixed(2)} %: supera tu mínimo de ${(+M.minRate).toFixed(2)} %`),2400);
      if(r.locked&&!getCed())setTimeout(()=>toast(r.locked+' PDF protegido: escribe tu cédula para abrirlo'),4800);}
    catch(e){er.textContent=e.message;b.disabled=false;b.innerHTML=G_LOGO+(M.connected?'Revisar correo ahora':'Conectar Gmail y cargar 3 meses')}};
  const off=$('#mOff');if(off)off.onclick=()=>{try{if(gTok&&window.google)google.accounts.oauth2.revoke(gTok,()=>{})}catch(e){}gTok=null;M.connected=false;save();close();toast('Gmail desconectado')};
  $('#mTry').onclick=async()=>{keep();const out=$('#mOut');out.textContent='Leyendo…';
    try{let text=$('#mTxt').value;const f=$('#mFile').files[0];
      if(f){const bytes=new Uint8Array(await f.arrayBuffer());text+='\n'+(/pdf$/i.test(f.type)||/\.pdf$/i.test(f.name)?await pdfText(bytes,cedVariants()):new TextDecoder().decode(bytes))}
      if(!text.trim()){out.textContent='Elige un archivo o pega un texto.';return}
      const c=parseCardAlert(text),v=parseBroker(text,'Puesto de bolsa');
      if(v){S.pendingInv.push(invPending(v));save();out.innerHTML=`<b>Inversión detectada:</b> ${esc(v.name)} al <b>${v.rate.toFixed(2)} %</b> por ${esc(fmt(v.amt,v.cur,0))}, ${v.months} meses. Quedó en Ahorros para que la confirmes.`}
      else if(c){S.pending.push(cardPending(c));save();out.innerHTML=`<b>Consumo detectado:</b> ${esc(fmt(c.amt,c.cur))}${c.merchant?' en '+esc(c.merchant):''}${c.last4?' · tarjeta '+c.last4:''}. Quedó en Gastos para que lo confirmes.`}
      else out.textContent='No encontré un consumo ni una inversión en ese texto. Si es un aviso real, compártelo sin datos personales para ajustar el lector.';
      render();}
    catch(e){out.textContent=e.message}};
}

