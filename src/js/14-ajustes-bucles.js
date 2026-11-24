/* ---------- Ajustes ---------- */
const SET_IC={user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',shield:'<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>',guide:'<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',chev:'<path d="M9 6l6 6-6 6"/>'};
const sic=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${SET_IC[k]}</svg>`;
const seg=(name,opts,val)=>`<div class="seg" role="radiogroup">${opts.map(([v,l])=>`<label><input type="radio" name="${name}" value="${v}" ${v===val?'checked':''}><span>${l}</span></label>`).join('')}</div>`;
const setRow=(id,ic,title,sub,cls)=>`<button type="button" class="set-row ${cls||''}" id="${id}"><span class="set-ic">${sic(ic)}</span><span class="set-t"><b>${title}</b>${sub?`<small>${sub}</small>`:''}</span><span class="set-go">${sic('chev')}</span></button>`;
function openSettings(){
  const who=sbUser&&sbUser.email,nm=(S.name||'').trim();
  SET_IC.tag=CAT_IC.custom;SET_IC.play='<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/>';
  sheet(`<h3>Ajustes</h3>
  <section class="set-me"><span class="set-av" aria-hidden="true">${nm?esc(nm[0].toUpperCase()):sic('user')}</span>
    <div class="set-me-t"><label for="aName" class="sr">Tu nombre</label><input id="aName" value="${esc(nm)}" maxlength="30" placeholder="Escribe tu nombre" autocomplete="given-name">
      <small>${who?'Conectado como '+esc(who):'Sin cuenta: tus datos viven solo en este teléfono'}</small></div>
    <button type="button" class="btn ${who?'ghost':''} set-acc" id="aAcc">${who?'Tu cuenta':'Iniciar sesión'}</button></section>
  <section class="set-g"><h4>Cómo ves tu dinero</h4><div class="set-card set-form">
    <div class="set-f"><span class="set-l" id="lBase">Moneda de tus totales</span><div aria-labelledby="lBase">${seg('aBase',[['DOP','Pesos · RD$'],['USD','Dólares · US$']],S.base==='USD'?'USD':'DOP')}</div></div>
    <div class="set-f"><label for="aUsd">Tasa del dólar</label><div class="set-rate"><span>US$1 =</span><span class="set-rd">RD$</span><input id="aUsd" inputmode="decimal" value="${S.rates.USD}"></div><small class="set-msg" id="aUsdMsg" aria-live="polite">Convierte tus montos en dólares a pesos.</small></div>
    <div class="set-f"><span class="set-l" id="lTheme">Apariencia</span><div aria-labelledby="lTheme">${seg('aTheme',[['','Automática'],['light','Clara'],['dark','Oscura']],S.theme||'')}</div></div>
  </div></section>
  <section class="set-g"><h4>Tus datos</h4><div class="set-card">
    ${setRow('aCats','tag','Mis categorías','Agrega o quita categorías y tipos de ingreso')}
    ${setRow('aOnb','guide','Organizar mis finanzas paso a paso','Vuelve a la guía inicial')}
  </div></section>
  <section class="set-g"><h4>Aprende a usar Caoba</h4><div class="set-card">
    ${setRow('aTut','play','Ver el recorrido','Un paseo corto por cada sección, con datos de ejemplo')}
    ${S.example?'':setRow('aEx','eye','Ver datos de ejemplo','Reemplaza tus datos por los de una familia de muestra')}
  </div></section>
  <section class="set-g"><h4>Privacidad y seguridad</h4><div class="set-card">
    ${setRow('aPrv','shield','Privacidad','Qué guardamos y cómo')}
    ${setRow('aBlank','trash','Borrar todos mis datos','Te pediremos confirmarlo dos veces','danger')}
  </div></section>
  <p class="set-ver">Caoba ${APP_VER} · los cambios se guardan solos</p>`,'var(--brand)');
  const live=()=>{save();render()};
  $('#aName').onchange=()=>{S.name=$('#aName').value.trim();live();const av=$('.set-av');if(av&&S.name)av.textContent=S.name[0].toUpperCase();toast('Nombre guardado')};
  document.querySelectorAll('[name=aBase]').forEach(r=>r.onchange=()=>{S.base=r.value;live();toast(r.value==='USD'?'Ahora ves todo en dólares':'Ahora ves todo en pesos')});
  document.querySelectorAll('[name=aTheme]').forEach(r=>r.onchange=()=>{S.theme=r.value||null;
    if(S.theme)document.documentElement.setAttribute('data-theme',S.theme);else document.documentElement.removeAttribute('data-theme');live()});
  const usd=$('#aUsd'),msg=$('#aUsdMsg');
  usd.onchange=()=>{const u=rate(usd.value);if(!(u>1&&u<1000)){msg.textContent='Escribe un número válido, por ejemplo 60.90.';msg.classList.add('bad');usd.value=S.rates.USD;return}
    S.rates=Object.assign({},S.rates,{USD:u});msg.classList.remove('bad');msg.textContent='Guardado. US$1 = '+fmt(u,'DOP');live()};
  $('#aAcc').onclick=()=>{close();openAccount()};
  $('#aPrv').onclick=()=>{close();openPrivacy()};
  $('#aCats').onclick=openMyCats;
  $('#aTut').onclick=()=>{close();startTour()};
  $('#aOnb').onclick=()=>{if(!hasRealData()){close();return openOnboarding(true,1)}
    holdConfirm({title:'¿Volver a la guía inicial?',detail:'Al terminar la guía, tus datos actuales se reemplazan por lo que contestes.',confirm:'Sí, empezar la guía',onConfirm:()=>openOnboarding(true,1)})};
  const ex=$('#aEx');if(ex)ex.onclick=()=>{const mk=()=>{const keep={base:S.base,rates:S.rates,theme:S.theme,mail:S.mail,name:S.name,customCats:S.customCats};return Object.assign(sample(),keep)};
    if(!hasRealData()){close();S=mk();save();render();return toast('Datos de ejemplo cargados')}
    holdConfirm({title:'¿Cambiar tus datos por el ejemplo?',detail:'Los datos de ejemplo reemplazan todo lo que has anotado.',confirm:'Sí, ver el ejemplo',onConfirm:()=>replaceData(mk(),'Datos de ejemplo cargados')})};
  {const h=$('#layer h3');h.tabIndex=-1;h.focus({preventScroll:true})}
  $('#aBlank').onclick=()=>{if(!hasRealData()&&!S.example){close();return toast('No tienes datos que borrar')}eraseAll()};
}
/* Mis categorías: las propias se pueden quitar; las de la app quedan */
function openMyCats(){
  const C=S.customCats||{exp:[],inc:[]};
  const row=(k,n,ic,kind)=>`<div class="mc-r">${ic}<span>${esc(n)}</span>${kind?`<button type="button" class="x" data-mcdel="${kind}:${k}" aria-label="Quitar ${esc(n)}"><svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg></button>`:'<small>De la app</small>'}</div>`;
  sheet(`<h3>Mis categorías</h3><p class="lead-s">Las que agregues aparecen al registrar un gasto o un ingreso. Si quitas una, sus movimientos pasan a «Otros».</p>
    <h4 class="menu-g">Gastos</h4><div class="mc">${Object.keys(CATS).map(k=>row(k,CATS[k].n,catIc(k),CATS[k].custom?'exp':'')).join('')}</div>
    <form class="mc-add" id="mcE"><input id="mcEn" maxlength="30" placeholder="Nueva categoría de gasto" aria-label="Nueva categoría de gasto"><button class="btn" type="submit" style="--accent:var(--spend)">Agregar</button></form>
    <h4 class="menu-g">Ingresos</h4><div class="mc">${Object.keys(INC).map(k=>row(k,INC[k],incIc(k),(C.inc||[]).some(x=>x.k===k)?'inc':'')).join('')}</div>
    <form class="mc-add" id="mcI"><input id="mcIn" maxlength="30" placeholder="Nuevo tipo de ingreso" aria-label="Nuevo tipo de ingreso"><button class="btn" type="submit" style="--accent:var(--grow)">Agregar</button></form>`,'var(--brand)');
  $('#mcE').onsubmit=e=>{e.preventDefault();if(addCustomCat('exp',$('#mcEn').value)){save();render();openMyCats();toast('Categoría agregada')}};
  $('#mcI').onsubmit=e=>{e.preventDefault();if(addCustomCat('inc',$('#mcIn').value)){save();render();openMyCats();toast('Tipo de ingreso agregado')}};
  document.querySelectorAll('[data-mcdel]').forEach(b=>b.onclick=()=>{const [kind,k]=b.dataset.mcdel.split(':'),nm=kind==='exp'?CATS[k].n:INC[k];
    confirmDel(nm,'Sus movimientos pasan a «Otros».',()=>{S.customCats[kind]=S.customCats[kind].filter(x=>x.k!==k);
      if(kind==='exp'){delete CATS[k];S.expenses.forEach(x=>{if(x.cat===k)x.cat='otros'});(S.recurring||[]).forEach(r=>{if(r.cat===k)r.cat='otros'});if(S.catBudget)delete S.catBudget[k]}
      else{delete INC[k];delete INC_C[k];S.incomes.forEach(x=>{if(x.src===k)x.src='otros'})}
      applyCustom();save();render();openMyCats();toast('Quitada')})});
}
let tt;function undoToast(m,fn,label){clearTimeout(tt);let el=$('.toast');if(!el){el=document.createElement('div');el.className='toast';el.setAttribute('role','status');document.body.appendChild(el)}
  el.innerHTML='<span>'+esc(m)+'</span><button type="button" id="undoBtn">'+(label||'Deshacer')+'</button>';$('#undoBtn').onclick=()=>{clearTimeout(tt);el.remove();fn()};tt=setTimeout(()=>el.remove(),5000)}
function toast(m){clearTimeout(tt);let el=$('.toast');if(!el){el=document.createElement('div');el.className='toast';el.setAttribute('role','status');document.body.appendChild(el)}el.textContent=m;tt=setTimeout(()=>el.remove(),2200)}

/* ---------- Bucles en vivo ---------- */
let last=0;
function fitBig(){document.querySelectorAll('.deep .big').forEach(el=>{const n=el.textContent.length;el.style.setProperty('--bs',n>15?`max(26px, calc(min(11.5vw, 50px) * ${(15/n).toFixed(3)}))`:'clamp(38px,11.5vw,50px)')})}
let lastLen=0;
function tickLive(){
  const t=Date.now();
  if(view==='resumen'){const F=snapshot(t),nb=$('#netBig');if(nb){nb.innerHTML=split(netValue(F),S.base,2);if(nb.textContent.length!==lastLen){lastLen=nb.textContent.length;fitBig()}$('#netA').textContent=fmt(F.assets,S.base,0);const nd=$('#netD');if(nd)nd.textContent=fmt(accts().reduce((a,s)=>a+conv(savValue(s,t),s.cur,S.base),0),S.base,0);S.savings.forEach(s=>{const a=document.querySelector(`[data-sv="${s.id}"]`);if(a)a.textContent=fmt(savValue(s,t),s.cur,2)})}return}
  if(view==='ingresos'&&intR){const it=$('#intTot');if(it){let sum=0;S.savings.forEach(s=>{const v=intOf(s,intR[0],intR[1]);sum+=conv(v,s.cur,S.base);const e=document.querySelector(`[data-int="${s.id}"]`);if(e)e.textContent=fmt(v,s.cur,4)});
    it.textContent=fmt(sum,S.base,2);const bt=$('#bdnTot');if(bt){if(bt.dataset.b===undefined)bt.dataset.b=String(S.incomes.filter(x=>inR(x,intR)).reduce(sumB,0));bt.textContent=fmt(+bt.dataset.b+sum,S.base,0)}}return}
  if(view!=='ahorros')return;
  const T=totals(t), lt=$('#liveTotal'); if(!lt)return;
  lt.innerHTML=split(T.v,S.base,4);
  $('#liveGain').textContent=fmt(T.v-T.p,S.base,0);
  const wS=$('#wgS'),wM=$('#wgM');if(wS)wS.firstChild.nodeValue=fmt(T.v,S.base,0);if(wM)wM.firstChild.nodeValue=fmt(T.v,S.base,4);
  S.savings.forEach(s=>{const v=savValue(s,t),a=document.querySelector(`[data-sv="${s.id}"]`),b=document.querySelector(`[data-si="${s.id}"]`);if(a)a.textContent=fmt(v,s.cur,2);if(b)b.textContent='+'+fmt(v-s.principal,s.cur,2)});
}
function loop(ts){if(ts-last>(reduce?1000:100)){last=ts;tickLive()}requestAnimationFrame(loop)}
requestAnimationFrame(loop);

