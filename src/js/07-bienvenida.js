/* ---------- El árbol de caoba: crece en el arranque y con cada paso de la guía ---------- */
const TREE=[ /* [umbral 0..1, tipo, svg] */
  [0,'g','<ellipse cx="60" cy="113" rx="36" ry="3.2" class="t-gr"/>'],
  [0,'l','<path d="M61 76c3-5 8-6 11-5-2 4-6 6-11 5z" class="t-l3"/>'],
  [0,'k','<path class="t-tr" d="M51 113c4-2 6-6 6.4-13L57.2 70c0-3 5.6-3 5.6 0l-.2 30c.4 7 2.4 11 6.4 13z"/>'],
  [.12,'b','<path class="t-br" d="M59.5 82C55 74 48 69 40 66"/>'],[.24,'b','<path class="t-br" d="M60.5 78C65 70 72 65 81 62"/>'],[.36,'b','<path class="t-br" d="M60 72c0-8 .5-14 0-22"/>'],
  [.46,'l','<ellipse cx="40" cy="58" rx="17" ry="10.5" class="t-l1"/>'],[.56,'l','<ellipse cx="81" cy="55" rx="17" ry="10.5" class="t-l1"/>'],
  [.66,'l','<ellipse cx="60" cy="44" rx="31" ry="15.5" class="t-l2"/>'],[.76,'l','<ellipse cx="46" cy="36" rx="15" ry="9" class="t-l2"/>'],[.84,'l','<ellipse cx="74" cy="35" rx="15" ry="9" class="t-l2"/>'],
  [.92,'l','<ellipse cx="60" cy="27" rx="13" ry="8" class="t-l3"/>'],[1,'h','<ellipse cx="50" cy="40" rx="7" ry="3.2" class="t-h"/><ellipse cx="70" cy="30" rx="6" ry="2.8" class="t-h"/><ellipse cx="85" cy="51" rx="5" ry="2.4" class="t-h"/>']
];
function treeSVG(p,prev,cls){
  return `<svg class="tree ${cls||''}" viewBox="0 0 120 120" aria-hidden="true">${TREE.map(([t,k,s],i)=>t<=p+1e-6?`<g class="tp tp-${k}${prev!==undefined&&t>prev+1e-6?' tg':''}" style="--d:${prev!==undefined&&t>prev?((t-prev)/(p-prev||1)*.5).toFixed(2):0}s;--i:${i}">${s}</g>`:'').join('')}</svg>`;
}
/* Símbolo de Caoba: dos anillos de crecimiento y un billete. Los colores siguen el tema. */
const LOGO_RINGS='<path d="M72.34 19.26 A38 38 0 1 0 86.87 59.19"/><path d="M61.17 34.63 A19 19 0 1 0 68.44 54.6"/>';
const LOGO_BILL=g=>`<g transform="rotate(-20 75 42)"><rect x="55" y="30" width="40" height="24" rx="3.5" fill="#3DBE74" stroke="${g}" stroke-width="4.5" paint-order="stroke"/><rect x="59" y="34" width="32" height="16" rx="2" fill="none" stroke="#E3F7EA" stroke-width="1.4"/><circle cx="75" cy="42" r="5" fill="none" stroke="#E3F7EA" stroke-width="1.8"/></g>`;
function logoSym(cls){return `<svg class="${cls||''}" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="var(--brand)" stroke-width="13" stroke-linecap="round">${LOGO_RINGS.replace(/<path /g,'<path pathLength="1" ')}</g><g class="lg-bill">${LOGO_BILL('var(--bg)')}</g></svg>`}
function showSplash(){
  if(document.getElementById('splash'))return;
  const d=document.createElement('div');d.id='splash';d.setAttribute('aria-hidden','true');
  d.innerHTML=`<div class="sp-in">${logoSym('sp-logo')}<div class="sp-word"><span class="sp-name">Caoba</span><span class="sp-slogan">Decide con información completa</span></div></div>`;
  document.body.appendChild(d);
  const end=()=>{if(!d.isConnected)return;d.classList.add('out');setTimeout(()=>d.remove(),450)};
  d.addEventListener('click',end);setTimeout(end,reduce?700:2200);
}
/* ---------- Pantalla de bienvenida ---------- */
const G_LOGO='<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.6 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.2 0-11.5-4.2-13.4-9.8l-8 6C6.6 42.6 14.6 48 24 48z"/></svg>';
const MS_LOGO='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#F25022" d="M1 1h10.5v10.5H1z"/><path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z"/><path fill="#00A4EF" d="M1 12.5h10.5V23H1z"/><path fill="#FFB900" d="M12.5 12.5H23V23H12.5z"/></svg>';
const W_IC={all:'<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h3"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',fx:'<path d="M7 7h13l-3-3M17 17H4l3 3"/>',rate:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'};
function closeOnbLayer(){$('#onbLayer').innerHTML='';document.documentElement.classList.remove('onb-open')}
function openWelcome(){
  document.documentElement.classList.add('onb-open');
  const pv=(t,body)=>`<figure class="wv"><figcaption>${t}</figcaption>${body}</figure>`;
  $('#onbLayer').innerHTML=`<div class="onb wel" role="dialog" aria-modal="true" aria-labelledby="welT"><div class="wel-in wel3">
    <div class="wel-main">
      <div class="wel-brand">${logoSym('wel-sym')}<span class="wel-name"><span class="wordmark">Caoba</span><small>Organización financiera e inversión</small></span></div>
      <h2 id="welT" tabindex="-1">Decide con información completa</h2>
      <p class="wel-lead">Tus cuentas, tarjetas, préstamos e inversiones en un solo lugar, y las tasas del mercado con su fuente para comparar antes de decidir.</p>
      <div class="wel-strip" id="welStrip" aria-label="Lo que puedes hacer en Caoba">
        ${pv('Tu patrimonio, al día',`<div class="wv-hero"><small>Patrimonio neto</small><b class="num">RD$1,284,560</b><span class="num"><span>Tienes RD$1.90 M</span><span>Debes RD$0.62 M</span></span></div>`)}
        ${pv('Inversiones con fechas reales',`<ul class="wv-l"><li><span><b>Bono Hacienda</b><small>Próximo cupón · 15 dic</small></span><b class="num">RD$16,013</b></li><li><span><b>Certificado</b><small>Vence 14 feb · 9.25 %</small></span><b class="num">RD$252,165</b></li></ul>`)}
        ${pv('Mercado con fuente y fecha',`<ul class="wv-l"><li><span><b>Certificado 180 días</b><small>Dato real · fuente y fecha</small></span><b class="num">9.75 %</b></li><li><span><b>Dólar · venta</b><small>Por verificar</small></span><b class="num">RD$60.34</b></li></ul>`)}
      </div>
      <p class="wel-ex">Cifras de ejemplo.</p>
      <ul class="wel-trust"><li>Nunca te pedimos claves bancarias</li><li>Sin cuenta, tus datos se quedan en tu teléfono</li><li>Con cuenta, los ves en cualquier dispositivo</li></ul>
    </div>
    <div class="wel-act">
      <button type="button" class="btn wel-start" id="wNew">Crear mi cuenta</button>
      <button type="button" class="sso" id="wLogin"><svg viewBox="0 0 24 24" aria-hidden="true">${W_IC.mail}</svg><span>Iniciar sesión</span></button>
      <button type="button" class="o-link wel-forgot" id="wForgot">Olvidé mi contraseña</button>
      <p class="wel-or"><span>o</span></p>
      <div class="wel-two"><button type="button" class="wel-solo" id="wStart">Continuar sin cuenta</button><button type="button" class="wel-solo wel-mkt" id="wMkt">Explorar el Mercado</button></div>
      <p class="wel-note">Sin cuenta, tus datos se guardan solo en este teléfono.</p>
      <button type="button" class="o-link wel-demo" id="wDemo">Conocer Caoba con un ejemplo</button>
      <p class="wel-legal"><button type="button" class="link-btn" id="wPriv">Privacidad</button><button type="button" class="link-btn" id="wTerms">Términos de uso</button></p>
    </div></div></div>`;
  $('#wPriv').onclick=openPrivacy;$('#wTerms').onclick=openTerms;
  $('#welT').focus({preventScroll:true});
  $('#wStart').onclick=()=>openOnboarding(true);
  $('#wDemo').onclick=()=>{S.onbDismissed=true;if(!S.example){const keep={base:S.base,rates:S.rates,theme:S.theme,mail:S.mail};S=Object.assign(sample(),keep);normalizeS()}save();closeOnbLayer();setView('resumen');render();window.scrollTo({top:0});startTour()};
  const acc=m=>{closeOnbLayer();S.onbDismissed=true;save();accMode=m;accStep={email:'',sent:false};openAccount()};
  $('#wNew').onclick=()=>acc('new');$('#wLogin').onclick=()=>acc('pw');$('#wForgot').onclick=()=>acc('forgot');
  $('#wMkt').onclick=()=>{S.onbDismissed=true;S.mktOnly=true;save();closeOnbLayer();goTo('mercado');track('ver_mercado_sin_registro')};
}
/* ---------- Recorrido con datos de ejemplo ---------- */
const TOUR=[
  ['resumen','.hero','Tu saldo neto','Lo que tienes menos lo que debes. Se actualiza solo, hasta con los intereses que ganan tus inversiones.'],
  ['resumen','.qa','Anota en un toque','Registra un ingreso o un gasto. En «Agregar» están las cuentas, tarjetas, préstamos, inversiones y pagos fijos.'],
  ['resumen','#calOpen','Calendario de pagos','Tus fechas de pago, cobros y recordatorios en un solo lugar.'],
  ['resumen','#ioP','Ingresos y gastos','Cámbialo a diario, semanal, mensual o anual, o elige fechas. Toca una barra para ver ese período.'],
  ['ingresos','[data-ms]','Movimientos','Gastos e ingresos en una sola pestaña. En gastos también están tu presupuesto y tus gastos fijos.'],
  ['cuentas','.acc-card','Cuentas','Tus cuentas de ahorro, corrientes y efectivo. En «Crédito» están tus tarjetas y préstamos.'],
  ['inversion','.inv-card','Inversiones que crecen en vivo','Mira cuánto ganas por día y cuándo vence o paga intereses cada inversión.'],
  ['mercado','.mk-types','Mercado','Tipo de cambio del BCRD, Notas del Banco Central y fondos cerrados, con su fuente y su fecha.']
];
let tourI=-1;
function startTour(){tourI=0;tourStep()}
function endTour(){tourI=-1;const t=$('#tour');if(t)t.remove();document.documentElement.classList.remove('tour-open')}
function tourStep(){
  if(tourI<0)return;let t=$('#tour');if(!t){t=document.createElement('div');t.id='tour';document.body.appendChild(t);document.documentElement.classList.add('tour-open')}
  if(tourI>=TOUR.length){t.innerHTML=`<div class="tour-dim"></div><div class="tour-card end" role="dialog" aria-modal="true" aria-labelledby="tourT">${treeSVG(1,0,'tour-tree')}<h3 id="tourT" tabindex="-1">Ahora coloca tus datos y empieza tu organización financiera</h3><p>Toma unos 5 minutos. Puedes saltar lo que no sepas.</p><button type="button" class="btn" id="tGo">Empezar con mis datos</button><button type="button" class="o-link" id="tStay">Seguir viendo el ejemplo</button></div>`;
    $('#tourT').focus();$('#tGo').onclick=()=>{endTour();openOnboarding(true)};$('#tStay').onclick=endTour;return}
  const [v,sel,title,text]=TOUR[tourI];{const pv=view+movSeg+cuSeg;setView(v);if(view+movSeg+cuSeg!==pv)render()}
  const el=document.querySelector(sel);if(!el){tourI++;return tourStep()}
  el.scrollIntoView({block:'center',behavior:'auto'});
  requestAnimationFrame(()=>{const r=el.getBoundingClientRect(),pad=6,vh=innerHeight,below=r.top+r.height/2<vh/2;
    t.innerHTML=`<div class="tour-hole" style="top:${r.top-pad}px;left:${r.left-pad}px;width:${r.width+pad*2}px;height:${Math.min(r.height+pad*2,vh*.6)}px"></div>
      <div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tourT" style="${innerWidth>=1000?`left:${Math.round(Math.max(264,Math.min(r.left,innerWidth-436)))}px;`:''}${below?`top:${Math.min(vh-220,r.top+Math.min(r.height,vh*.6)+pad+12)}px`:`bottom:${Math.max(12,vh-r.top+pad+12)}px`}">
        <p class="tour-n num">${tourI+1} de ${TOUR.length}</p><h3 id="tourT" tabindex="-1">${title}</h3><p>${text}</p>
        <div class="tour-b"><button type="button" class="o-link" id="tSkip">Saltar</button>${tourI?'<button type="button" class="btn ghost" id="tPrev">Atrás</button>':''}<button type="button" class="btn" id="tNext">${tourI===TOUR.length-1?'Terminar':'Siguiente'}</button></div></div>`;
    $('#tourT').focus({preventScroll:true});$('#tNext').onclick=()=>{tourI++;tourStep()};$('#tSkip').onclick=()=>{tourI=TOUR.length;tourStep()};const pv=$('#tPrev');if(pv)pv.onclick=()=>{tourI--;tourStep()}});
}
addEventListener('resize',()=>{if(tourI>=0&&tourI<TOUR.length)tourStep()});
addEventListener('keydown',e=>{if(e.key==='Escape'&&tourI>=0)endTour()});
function renderNotice(){
  $('#notice').innerHTML=S.example?`<div class="notice ex"><span class="ex-t"><b>Estás viendo un ejemplo.</b> Ahora coloca tus datos y empieza tu organización financiera.</span><button type="button" id="clearEx">Empezar</button></div>`:'';
  const b=$('#clearEx'); if(b)b.onclick=()=>openOnboarding(true);
}

