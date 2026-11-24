/* ---------- Cuenta y sincronización en la nube (Supabase) ---------- */
const SUPABASE_URL='https://blvwglrfnwgndflfduir.supabase.co', SUPABASE_KEY='sb_publishable_I7WGlO8D0B0uflXjDOQcnQ_vrqCAnM6';
const APP_URL='https://dylanvargas02.github.io/invierterd/';
const SUPA_JS='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
let sb=null,sbUser=null,syncTimer=null,syncState='idle',accStep={email:'',sent:false},loginFor='',accMode='pw';
const canCloud=()=>/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(SUPABASE_URL);
const isPublished=()=>/(^|\.)github\.io$|^localhost$|^127\.0\.0\.1$/.test(location.hostname);
function persistLocal(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
async function sbClient(){
  if(sb)return sb;
  if(!canCloud())throw new Error('Las cuentas todavía no están activadas.');
  if(!isPublished())throw new Error('Para iniciar sesión abre la app publicada.');
  if(!window.supabase)await loadScript(SUPA_JS);
  if(!window.supabase)throw new Error('No se pudo cargar el servicio de cuentas. Revisa tu conexión.');
  sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit',storageKey:KEY+'.auth'}});
  sb.auth.onAuthStateChange((ev,session)=>{const before=sbUser;sbUser=session?session.user:null;paintAcc();if(sbUser&&(!before||before.id!==sbUser.id))setTimeout(afterLogin,0)});
  return sb;
}
function cloudData(){const d=JSON.parse(JSON.stringify(S));delete d.onbDraft;return d}
async function pushNow(){
  if(!sbUser||S.example)return;
  syncState='sync';paintAcc();
  try{const c=await sbClient();const t=S._upd||Date.now();S._owner=sbUser.id;
    const {error}=await c.from('app_state').upsert({user_id:sbUser.id,data:cloudData(),updated_at:new Date(t).toISOString()});
    if(error)throw error;S._synced=t;persistLocal();syncState='ok';}
  catch(e){syncState='error'}
  paintAcc();
}
function schedulePush(){if(!sbUser||S.example)return;clearTimeout(syncTimer);syncState='pend';paintAcc();syncTimer=setTimeout(pushNow,1200)}
function applyRemote(row){
  const keepTheme=S.theme;S=row.data||{};S._synced=S._upd=Date.parse(row.updated_at)||Date.now();S._owner=sbUser.id;
  if(S.theme===undefined)S.theme=keepTheme;normalizeS();persistLocal();syncState='ok';
  $('#onbLayer').innerHTML='';document.documentElement.classList.remove('onb-open');render();
}
async function fetchRemote(){const c=await sbClient();const {data,error}=await c.from('app_state').select('data,updated_at').eq('user_id',sbUser.id).maybeSingle();if(error)throw error;return data}
async function afterLogin(){
  if(!sbUser||loginFor===sbUser.id)return;loginFor=sbUser.id;
  try{
    const row=await fetchRemote();
    if(!row){if(!S.example){S._owner=sbUser.id;await pushNow();toast('Tus datos quedaron guardados en tu cuenta')}else{toast('Sesión iniciada. Organicemos tus finanzas.');S.onbDismissed=true;save();openOnboarding(true)}return}
    const remoteT=Date.parse(row.updated_at)||0, mine=S._owner===sbUser.id, dirty=(S._upd||0)>(S._synced||0);
    if(S.example||(S._owner&&!mine)||(mine&&!dirty)){if(remoteT!==(S._synced||0)||!mine)applyRemote(row);syncState='ok';paintAcc();return}
    if(mine&&dirty&&remoteT<=(S._synced||0)){await pushNow();return}
    openConflict(row);
  }catch(e){loginFor='';syncState='error';paintAcc()}
}
async function pullIfNewer(){
  if(!sbUser||(S._upd||0)>(S._synced||0))return;
  try{const row=await fetchRemote();if(row&&Date.parse(row.updated_at)>(S._synced||0)){applyRemote(row);toast('Datos actualizados desde tu cuenta')}}catch(e){}
}
function openConflict(row){
  const when=dtFmt.format(new Date(Date.parse(row.updated_at)));
  sheet(`<h3>¿Qué datos quieres usar?</h3><div class="form"><p class="lead-s">Este teléfono tiene datos que no están en tu cuenta, y tu cuenta tiene datos guardados el ${esc(when)}.</p>
  <button class="btn" type="button" id="cfRemote">Usar los de mi cuenta</button>
  <button class="btn ghost" type="button" id="cfLocal">Usar los de este teléfono y guardarlos en mi cuenta</button>
  <p class="hint">La opción que no elijas se reemplaza.</p></div>`,'var(--brand)');
  $('#cfRemote').onclick=()=>{close();applyRemote(row);toast('Listo: estás viendo los datos de tu cuenta')};
  $('#cfLocal').onclick=async()=>{close();S._owner=sbUser.id;S._upd=Date.now();await pushNow();toast('Tus datos de este teléfono quedaron en tu cuenta')};
}
function wipeLocal(){try{localStorage.removeItem(KEY);localStorage.removeItem(KEY+'.ced')}catch(e){}cedSession='';const keep={base:S.base,rates:S.rates,theme:S.theme};S=Object.assign(sample(),keep);S.onbDismissed=true;normalizeS();persistLocal()}
function paintAcc(){
  const b=$('#accBtn');if(!b)return;
  b.classList.toggle('in',!!sbUser);b.dataset.sync=sbUser?syncState:'';
  b.innerHTML=sbUser?`<span class="acc-ini">${esc((sbUser.email||'?').charAt(0).toUpperCase())}</span>`:`<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>`;
  b.setAttribute('aria-label',sbUser?'Tu cuenta: '+sbUser.email:'Iniciar sesión');
  const st=$('#accSync');if(st)st.textContent=syncLabel();
}
const syncLabel=()=>S.example?'Con datos de ejemplo no se sincroniza. Completa la guía o empieza en blanco.':{sync:'Guardando en tu cuenta…',pend:'Cambios por guardar…',error:'No se pudo guardar. Lo intentaremos de nuevo cuando tengas conexión.',ok:'Todo guardado en tu cuenta',idle:'Todo guardado en tu cuenta'}[syncState]||'';
function openAccount(){
  if(!canCloud()){sheet(`<h3>Tu cuenta</h3><div class="form"><p class="lead-s">Las cuentas se están activando. Pronto podrás guardar tus datos en la nube.</p></div>`,'var(--brand)');return}
  if(!isPublished()){sheet(`<h3>Tu cuenta</h3><div class="form"><p class="lead-s">Para iniciar sesión y guardar tus datos en la nube, abre la app publicada:</p><a class="btn" href="${APP_URL}" target="_blank" rel="noopener">Abrir Caoba</a><p class="hint num">${APP_URL}</p></div>`,'var(--brand)');return}
  if(sbUser){
    sheet(`<h3>Tu cuenta</h3><div class="form">
      <div class="mail-st on"><b>${esc(sbUser.email)}</b><span id="accSync">${esc(syncLabel())}</span></div>
      <button class="btn" type="button" id="aSync">Sincronizar ahora</button>
      <button class="btn ghost" type="button" id="aOut">Cerrar sesión</button>
      <p class="hint">Al cerrar sesión, tus datos se borran de este teléfono y quedan guardados en tu cuenta.</p>
      <button class="link-btn danger" type="button" id="aDel">Eliminar mi cuenta y todos mis datos</button>
      <div id="aDelBox" hidden class="del-box"><p><b>Esto no se puede deshacer.</b> Se borran tu cuenta y todos tus datos de la nube y de este teléfono.</p><button class="btn" type="button" id="aDelYes" style="--accent:var(--spend)">Sí, eliminar mi cuenta</button></div>
      <button class="link-btn" type="button" id="aPriv">Privacidad</button>
      <p class="err" id="aErr" role="alert"></p></div>`,'var(--brand)');
    $('#aSync').onclick=async()=>{await pushNow();await pullIfNewer();paintAcc()};
    $('#aOut').onclick=async()=>{try{await sb.auth.signOut()}catch(e){}sbUser=null;loginFor='';wipeLocal();close();render();toast('Sesión cerrada. Tus datos siguen en tu cuenta.')};
    $('#aDel').onclick=()=>{$('#aDelBox').hidden=false};
    $('#aDelYes').onclick=async()=>{const b=$('#aDelYes');b.disabled=true;b.textContent='Eliminando…';
      try{const {error}=await sb.rpc('delete_my_account');if(error)throw error;try{await sb.auth.signOut()}catch(e){}sbUser=null;loginFor='';wipeLocal();close();render();toast('Tu cuenta y tus datos fueron eliminados')}
      catch(e){$('#aErr').textContent='No se pudo eliminar la cuenta. Revisa tu conexión e inténtalo de nuevo.';b.disabled=false;b.textContent='Sí, eliminar mi cuenta'}};
    $('#aPriv').onclick=openPrivacy;return;
  }
  const codeStep=accMode==='otp'&&accStep.sent&&accStep.email;
  const signup=accMode==='new';
  sheet(`<h3>${codeStep?'Escribe el código':signup?'Crea tu cuenta':accMode==='otp'?'Entra con un código':'Inicia sesión'}</h3><form class="form" id="f" novalidate>
    ${codeStep?`<p class="lead-s">Te enviamos un código a <b>${esc(accStep.email)}</b>. Revisa también la carpeta de spam.</p>
      <div class="field"><label for="aCode">Código</label><input id="aCode" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="123456"></div>
      <button class="link-btn" type="button" id="aLinkT">¿Te llegó un enlace en vez de un código?</button>
      <div class="field" id="aLinkBox" hidden><label for="aLink">Mantén presionado el botón del correo, copia el enlace y pégalo aquí</label><input id="aLink" type="url" autocomplete="off" placeholder="https://…"></div>
      <div class="err" id="err" role="alert"></div><button class="btn" type="submit">Entrar</button>
      <div class="two"><button class="btn ghost" type="button" id="aResend">Reenviar código</button><button class="btn ghost" type="button" id="aBack">Cambiar correo</button></div>`
    :`<p class="lead-s">${signup?'Con tu cuenta, tus datos quedan guardados y los ves en cualquier teléfono o computadora.':'Entra con tu correo y tu contraseña.'}</p>
      ${accMode==='otp'?'':`<div class="seg tiny acc-tabs" role="group" aria-label="Cuenta"><button type="button" data-am="pw" aria-pressed="${!signup}">Ya tengo cuenta</button><button type="button" data-am="new" aria-pressed="${signup}">Crear cuenta</button></div>`}
      <div class="field"><label for="aEmail">Correo electrónico</label><input id="aEmail" type="email" inputmode="email" autocomplete="email" value="${esc(accStep.email)}" placeholder="tu@correo.com"></div>
      ${accMode==='otp'?'':`<div class="field"><label for="aPass">Contraseña</label><div class="pw"><input id="aPass" type="password" autocomplete="${signup?'new-password':'current-password'}" placeholder="${signup?'Al menos 8 caracteres':'Tu contraseña'}"><button type="button" class="pw-eye" id="aEye" aria-label="Mostrar contraseña" aria-pressed="false">Ver</button></div></div>
      ${signup?'<div class="field"><label for="aPass2">Repite la contraseña</label><input id="aPass2" type="password" autocomplete="new-password"></div>':''}`}
      <div class="err" id="err" role="alert"></div>
      <button class="btn" type="submit">${accMode==='otp'?'Enviarme un código':signup?'Crear mi cuenta':'Entrar'}</button>
      <div class="acc-links">${accMode==='pw'?'<button class="link-btn" type="button" id="aForgot">¿Olvidaste tu contraseña?</button>':''}<button class="link-btn" type="button" id="aSwap">${accMode==='otp'?'Usar contraseña':'Prefiero recibir un código por correo'}</button></div>
      <p class="hint">Si ya registraste datos en este teléfono, se guardan en tu cuenta al entrar. <button class="link-btn" type="button" id="aPriv">Privacidad</button></p>`}
  </form>`,'var(--brand)');
  const err=m=>{$('#err').textContent=m};
  const send=async email=>{const c=await sbClient();const {error}=await c.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:APP_URL}});if(error)throw error};
  const pv=$('#aPriv');if(pv)pv.onclick=openPrivacy;
  document.querySelectorAll('[data-am]').forEach(b=>b.onclick=()=>{accStep.email=$('#aEmail').value.trim();accMode=b.dataset.am;openAccount()});
  const sw=$('#aSwap');if(sw)sw.onclick=()=>{accStep.email=($('#aEmail')||{value:''}).value.trim();accMode=accMode==='otp'?'pw':'otp';accStep.sent=false;openAccount()};
  const eye=$('#aEye');if(eye)eye.onclick=()=>{const i=$('#aPass'),on=i.type==='password';i.type=on?'text':'password';eye.textContent=on?'Ocultar':'Ver';eye.setAttribute('aria-pressed',on)};
  const okMail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
  const fg=$('#aForgot');if(fg)fg.onclick=async()=>{const email=$('#aEmail').value.trim().toLowerCase();if(!okMail(email)){$('#aEmail').focus();return err('Escribe tu correo y te enviamos un enlace para crear una contraseña nueva.')}
    try{const c=await sbClient();const {error}=await c.auth.resetPasswordForEmail(email,{redirectTo:APP_URL});if(error)throw error;err('');toast('Te enviamos un enlace a '+email+' para cambiar la contraseña')}catch(x){err(friendlyAuth(x))}};
  if(codeStep){
    $('#aBack').onclick=()=>{accStep.sent=false;openAccount()};
    $('#aResend').onclick=async()=>{try{await send(accStep.email);toast('Te enviamos otro código')}catch(e){err(friendlyAuth(e))}};
    $('#aLinkT').onclick=()=>{$('#aLinkBox').hidden=false;$('#aLinkT').hidden=true;$('#aLink').focus()};
    $('#f').onsubmit=async e=>{e.preventDefault();const code=$('#aCode').value.replace(/\D/g,''),lk=linkToken($('#aLink').value);
      if(!lk&&$('#aLink').value.trim())return err('Ese enlace no es el del correo de Caoba. Cópialo completo, desde el botón del correo.');
      if(!lk&&code.length<6)return err('Escribe el código completo que llegó a tu correo.');
      const b=e.target.querySelector('[type=submit]');b.disabled=true;b.textContent='Entrando…';
      try{const c=await sbClient();const {data,error}=await c.auth.verifyOtp(lk?{token_hash:lk.hash,type:lk.type}:{email:accStep.email,token:code,type:'email'});if(error)throw error;sbUser=data.user;accStep={email:'',sent:false};close();paintAcc();toast('Sesión iniciada');afterLogin()}
      catch(x){err(friendlyAuth(x));b.disabled=false;b.textContent='Entrar'}};
    return;
  }
  $('#f').onsubmit=async e=>{e.preventDefault();const email=$('#aEmail').value.trim().toLowerCase(),b=e.target.querySelector('[type=submit]'),lbl=b.textContent;
    if(!okMail(email))return err('Revisa el correo: debe verse como nombre@correo.com.');
    if(accMode==='otp'){b.disabled=true;b.textContent='Enviando…';try{await send(email);accStep={email,sent:true};openAccount()}catch(x){err(friendlyAuth(x));b.disabled=false;b.textContent=lbl}return}
    const pw=$('#aPass').value;if(pw.length<(signup?8:1))return err(signup?'La contraseña debe tener al menos 8 caracteres.':'Escribe tu contraseña.');
    if(signup&&pw!==$('#aPass2').value)return err('Las contraseñas no coinciden.');
    b.disabled=true;b.textContent=signup?'Creando…':'Entrando…';
    try{const c=await sbClient();
      if(signup){const {data,error}=await c.auth.signUp({email,password:pw,options:{emailRedirectTo:APP_URL}});if(error)throw error;
        if(data.session){sbUser=data.user;close();paintAcc();toast('Cuenta creada');afterLogin()}else{accStep.email=email;accMode='pw';close();sheet(`<h3>Revisa tu correo</h3><div class="form"><p class="lead-s">Te enviamos un enlace a <b>${esc(email)}</b> para confirmar tu cuenta. Después vuelve aquí e inicia sesión.</p><button class="btn" type="button" id="aOk">Entendido</button></div>`,'var(--brand)');$('#aOk').onclick=close}}
      else{const {data,error}=await c.auth.signInWithPassword({email,password:pw});if(error)throw error;sbUser=data.user;accStep={email:'',sent:false};close();paintAcc();toast('Sesión iniciada');afterLogin()}}
    catch(x){err(/Invalid login credentials/i.test(x&&x.message||'')?'Correo o contraseña incorrectos.':/already registered|already been registered/i.test(x&&x.message||'')?'Ese correo ya tiene cuenta. Toca «Ya tengo cuenta».':friendlyAuth(x));b.disabled=false;b.textContent=lbl}};
}
function openNewPassword(){
  sheet(`<h3>Crea tu contraseña nueva</h3><form class="form" id="f" novalidate><div class="field"><label for="nP1">Contraseña nueva</label><input id="nP1" type="password" autocomplete="new-password" placeholder="Al menos 8 caracteres"></div>
    <div class="field"><label for="nP2">Repítela</label><input id="nP2" type="password" autocomplete="new-password"></div><p class="err" id="err" role="alert"></p><button class="btn" type="submit">Guardar contraseña</button></form>`,'var(--brand)');
  $('#f').onsubmit=async e=>{e.preventDefault();const a=$('#nP1').value;if(a.length<8)return $('#err').textContent='Al menos 8 caracteres.';if(a!==$('#nP2').value)return $('#err').textContent='No coinciden.';
    try{const c=await sbClient();const {error}=await c.auth.updateUser({password:a});if(error)throw error;close();toast('Contraseña actualizada')}catch(x){$('#err').textContent=friendlyAuth(x)}};
}
function linkToken(v){
  v=String(v||'').trim();if(!v)return null;
  try{const u=new URL(v);if(!/\.supabase\.co$/.test(u.hostname)&&u.origin+u.pathname!==APP_URL)return null;
    const h=u.searchParams.get('token_hash')||u.searchParams.get('token');if(!h)return null;
    const t=u.searchParams.get('type');return{hash:h,type:t==='signup'||t==='invite'?'signup':t==='magiclink'?'magiclink':'email'}}catch(e){return null}
}
async function sessionFromUrl(){
  const h=location.hash||'';if(!/access_token=|error_description=/.test(h))return;const rec=/type=recovery/.test(h);
  const err=/error_description=/.test(h)?decodeURIComponent((h.match(/error_description=([^&]*)/)||[])[1]||'').replace(/\+/g,' '):'';
  try{const c=await sbClient();await c.auth.getSession()}catch(e){}
  try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
  if(err)toast(/expired|invalid/i.test(err)?'Ese enlace ya venció. Pide un código nuevo desde Tu cuenta.':'No se pudo iniciar sesión con ese enlace.');
  else if(sbUser){toast('Sesión iniciada');if(rec)setTimeout(openNewPassword,400)}
}
function friendlyAuth(e){
  const m=String(e&&(e.message||e.error_description||e)||'');
  if(/rate|too many|seconds/i.test(m))return 'Pediste varios códigos seguidos. Espera un minuto e inténtalo de nuevo.';
  if(/expired|invalid|token/i.test(m))return 'El código no es válido o ya venció. Pide uno nuevo.';
  if(/network|fetch|Failed/i.test(m))return 'No hay conexión con el servicio de cuentas. Revisa tu internet.';
  return 'No se pudo completar. '+m;
}
function openPrivacy(){
  sheet(`<h3>Privacidad</h3><div class="form priv">
  <p><b>Qué guardamos.</b> Lo que registras en la app: ingresos, gastos, ahorros, tarjetas, préstamos y ajustes. Sin cuenta, se guarda solo en este teléfono. Con cuenta, además se guarda una copia en la nube (Supabase, servidores en EE. UU.), cifrada en tránsito y en reposo.</p>
  <p><b>Qué no guardamos.</b> Tu cédula ni datos de tus tarjetas o cuentas bancarias. Tu contraseña la guarda cifrada el servicio de cuentas; nosotros no la vemos.</p>
  <p><b>Quién puede ver tus datos.</b> Solo tú. Las reglas de la base de datos impiden que otra cuenta lea o cambie tus datos. No los vendemos ni los compartimos.</p>
  <p><b>Tus derechos.</b> Puedes ver y corregir tus datos en la app, y borrar tu cuenta con todos tus datos desde <i>Ajustes → Tu cuenta</i>. Se borran de inmediato. Esto sigue la Ley 172-13 de protección de datos personales de la República Dominicana.</p>
  </div>`,'var(--brand)');
}

function normalizeS(){
  ['cards','incomes','recurring','goals','pending','savings','loans','expenses','pendingInv','paydays','transfers','reminders'].forEach(k=>{if(!Array.isArray(S[k]))S[k]=[]});
  if(!S.catBudget)S.catBudget={};S.home={on:false,partner:'',adj:0};
  S.rates=S.rates||{DOP:1,USD:63.5,EUR:73.4};if(!['DOP','USD'].includes(S.base))S.base='DOP';
  S.mail=Object.assign({},MAIL_DEFAULT,S.mail||{});if(!S.mail.clientId)S.mail.clientId=GOOGLE_CLIENT_ID;
  applyCustom();
}

/* ---------- Tarjetas de crédito ---------- */
const CARD_ART=[['var(--cart1a)','var(--cart1b)'],['var(--cart2a)','var(--cart2b)'],['var(--cart3a)','var(--cart3b)'],['var(--cart4a)','var(--cart4b)']];
function minPay(c){return c.balance<=0?0:Math.min(c.balance,Math.max(c.balance*0.05,c.cur==='DOP'?500:10))}
function dueDate(c){const n=new Date(),t=new Date(n.getFullYear(),n.getMonth(),n.getDate());const at=(y,m)=>new Date(y,m,Math.min(c.payDay,new Date(y,m+1,0).getDate()));let d=at(n.getFullYear(),n.getMonth());if(d<t)d=at(n.getFullYear(),n.getMonth()+1);return d}
function daysTo(d){const n=new Date();n.setHours(0,0,0,0);return Math.round((d-n)/DAY)}
function utilColor(u){return u<.3?'var(--grow-glow)':u<.7?'var(--debt-glow)':'var(--spend-glow)'}

