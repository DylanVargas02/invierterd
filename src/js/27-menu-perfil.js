/* ---------- Menú de la inicial: perfiles financieros y cuentas de correo ----------
   Perfil financiero: otro conjunto de finanzas dentro de la misma cuenta (personal, familiar, otra persona, proyecto).
   Otra cuenta de correo: otra persona o acceso separado. En el teléfono hay una sola sesión a la vez: al cambiar,
   los datos de la cuenta anterior se guardan en la nube y se borran de este teléfono, así nunca se mezclan. */
Object.assign(PROF_KINDS,{persona:'Otra persona',negocio:'Proyecto o negocio'});
PROF_IC.persona='<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.6 3.6-5.5 6.5-5.5s5.5 1.9 6.5 5.5"/><path d="M17 8h4M19 6v4"/>';
const MAILS_KEY=KEY+'.correos';
const knownMails=()=>{try{return JSON.parse(localStorage.getItem(MAILS_KEY)||'[]').filter(e=>okMail(e)).slice(0,5)}catch(e){return []}};
function rememberMail(e){if(!e)return;try{const L=[e,...knownMails().filter(x=>x!==e)].slice(0,5);localStorage.setItem(MAILS_KEY,JSON.stringify(L))}catch(x){}}
async function signOutHere(msg){
  try{if(sbUser&&!S.example&&(S._upd||0)>(S._synced||0))await pushNow()}catch(e){}
  try{const c=await sbClient();await c.auth.signOut()}catch(e){}
  sbUser=null;loginFor='';isAdm=false;wipeLocal();widgetClear();close();render();if(msg)toast(msg);
}
function openMeMenu(){
  ensureProfiles();const P=S.profiles,act=activeProfile(),who=sbUser&&sbUser.email,nm=(S.name||'').trim();
  const row=(id,ic,t,s,cls)=>`<button type="button" class="menu-r ${cls||''}" id="${id}"><span class="menu-ic" style="--mc:var(--brand)"><svg viewBox="0 0 24 24">${ic}</svg></span><span><b>${t}</b>${s?`<small>${s}</small>`:''}</span>${chev}</button>`;
  sheet(`<div class="me-h"><span class="me-av" aria-hidden="true">${esc((nm||who||'C').charAt(0).toUpperCase())}</span><span class="me-id"><b>${esc(nm||'Tu perfil')}</b><small>${who?esc(who):'Sin cuenta: tus datos viven solo en este teléfono'}</small></span></div>
    <h3 class="sr">Tu perfil y tus cuentas</h3>
    <h4 class="menu-g">Perfil financiero en uso</h4>
    <div class="menu me-profs" role="radiogroup" aria-label="Cambiar de perfil">${P.list.map(p=>`<button type="button" class="menu-r${p.id===P.active?' on':''}" role="radio" aria-checked="${p.id===P.active}" data-me-prof="${p.id}"><span class="menu-ic" style="--mc:var(--brand)"><svg viewBox="0 0 24 24">${PROF_IC[p.kind]||PROF_IC.personal}</svg></span><span><b>${esc(p.name)}</b><small>${esc(PROF_KINDS[p.kind]||'Personal')}${p.id===P.active?' · en uso':''}</small></span>${p.id===P.active?'<span class="prof-ok" aria-hidden="true">✓</span>':''}</button>`).join('')}</div>
    <div class="menu">${row('meMine',PROF_IC.personal,'Mi perfil','Nombre, edad, provincia y ocupación')}
      ${S.example?'':row('meAdd','<path d="M12 5v14M5 12h14"/>','Agregar otro perfil','Familiar, de otra persona o de un proyecto')}
      ${row('meAdm','<path d="M4 6h16M4 12h16M4 18h10"/>','Administrar perfiles','Cambiar nombre, tipo o eliminar')}</div>
    <h4 class="menu-g">Cuenta de acceso</h4>
    <div class="menu">${who?row('meAcc','<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>','Tu cuenta y sincronización',esc(syncLabel()))+row('meMail','<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>','Entrar con otro correo','Otra persona o un acceso separado')+row('meOut','<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>','Cerrar sesión','Tus datos quedan guardados en tu cuenta','danger')
      :row('meLogin','<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>','Iniciar sesión o crear cuenta','Guarda tus datos y velos en cualquier teléfono')}</div>
    <p class="hint me-note"><b>Perfil</b> separa tus finanzas dentro de tu misma cuenta. <b>Otro correo</b> es otra cuenta: sus datos nunca se mezclan con los tuyos.</p>`,'var(--brand)');
  document.querySelectorAll('[data-me-prof]').forEach(b=>b.onclick=()=>{if(b.dataset.meProf===P.active)return close();switchProfile(b.dataset.meProf)});
  $('#meMine').onclick=openMyProfile;$('#meAdm').onclick=openProfiles;const a=$('#meAdd');if(a)a.onclick=()=>openProfileForm();
  const g=(id,f)=>{const e=$(id);if(e)e.onclick=f};
  g('#meAcc',()=>openAccount());g('#meLogin',()=>{accMode='pw';accStep={email:'',sent:false};openAccount()});
  g('#meOut',()=>signOutHere('Sesión cerrada. Tus datos siguen en tu cuenta.'));g('#meMail',openOtherMail);
}
function openOtherMail(){
  const L=knownMails().filter(e=>!sbUser||e!==sbUser.email);
  sheet(`<h3>Entrar con otro correo</h3><div class="form"><p class="lead-s">Cerraremos la sesión de <b>${esc(sbUser.email)}</b> en este teléfono. Sus datos quedan guardados en su cuenta y vuelven cuando entres de nuevo.</p>
    ${L.length?`<h4 class="menu-g">Usados en este teléfono</h4><div class="menu">${L.map(e=>`<button type="button" class="menu-r" data-mail="${esc(e)}"><span class="menu-ic" style="--mc:var(--brand)"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg></span><span><b>${esc(e)}</b><small>Te pediremos la contraseña o un código</small></span>${chev}</button>`).join('')}</div>`:''}
    <button class="btn" type="button" id="omNew">${L.length?'Usar otro correo':'Continuar'}</button><button class="btn ghost" type="button" id="omNo">Cancelar</button>
    <p class="hint">Caoba recuerda solo los correos, nunca las contraseñas.</p></div>`,'var(--brand)');
  const go=async e=>{await signOutHere();accMode='pw';accStep={email:e||'',sent:false};openAccount()};
  document.querySelectorAll('[data-mail]').forEach(b=>b.onclick=()=>go(b.dataset.mail));$('#omNew').onclick=()=>go('');$('#omNo').onclick=openMeMenu;
}
