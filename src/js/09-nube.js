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
  if(accStep.sent&&accStep.email)return openCodeStep();
  const signup=accMode==='new',forgot=accMode==='forgot',otp=accMode==='otp';
  sheet(`<h3>${signup?'Crea tu cuenta':forgot?'Recupera tu contraseña':otp?'Entra con un código':'Inicia sesión'}</h3><form class="form" id="f" novalidate>
      <p class="lead-s">${signup?'Con tu cuenta, tus datos quedan guardados y los ves en cualquier teléfono o computadora.':forgot?'Escribe el correo de tu cuenta. Te enviaremos un código para crear una contraseña nueva.':otp?'Te enviaremos un código de '+OTP_LEN+' dígitos a tu correo.':'Entra con tu correo y tu contraseña.'}</p>
      ${otp||forgot?'':`<div class="seg tiny acc-tabs" role="group" aria-label="Cuenta"><button type="button" data-am="pw" aria-pressed="${!signup}">Ya tengo cuenta</button><button type="button" data-am="new" aria-pressed="${signup}">Crear cuenta</button></div>`}
      <div class="field"><label for="aEmail">Correo electrónico</label><input id="aEmail" type="email" inputmode="email" autocomplete="email" value="${esc(accStep.email)}" placeholder="tu@correo.com"></div>
      ${otp||forgot?'':`<div class="field"><label for="aPass">Contraseña</label><div class="pw"><input id="aPass" type="password" autocomplete="${signup?'new-password':'current-password'}" placeholder="${signup?'Al menos 8 caracteres':'Tu contraseña'}"><button type="button" class="pw-eye" id="aEye" aria-label="Mostrar contraseña" aria-pressed="false">Ver</button></div></div>
      ${signup?'<div class="field"><label for="aPass2">Repite la contraseña</label><input id="aPass2" type="password" autocomplete="new-password"></div>':''}`}
      <div class="err" id="err" role="alert"></div>
      <button class="btn" type="submit">${otp?'Enviarme un código':forgot?'Enviarme el código':signup?'Crear mi cuenta':'Entrar'}</button>
      <div class="acc-links">${accMode==='pw'?'<button class="link-btn" type="button" id="aForgot">¿Olvidaste tu contraseña?</button>':''}${forgot?'<button class="link-btn" type="button" id="aSwap" data-to="pw">Volver a iniciar sesión</button>':`<button class="link-btn" type="button" id="aSwap" data-to="${otp?'pw':'otp'}">${otp?'Usar contraseña':'Prefiero recibir un código por correo'}</button>`}</div>
      <p class="hint">Si ya registraste datos en este teléfono, se guardan en tu cuenta al entrar. <button class="link-btn" type="button" id="aPriv">Privacidad</button></p>
  </form>`,'var(--brand)');
  const err=m=>{$('#err').textContent=m};
  const pv=$('#aPriv');if(pv)pv.onclick=openPrivacy;
  document.querySelectorAll('[data-am]').forEach(b=>b.onclick=()=>{accStep.email=$('#aEmail').value.trim();accMode=b.dataset.am;openAccount()});
  const sw=$('#aSwap');if(sw)sw.onclick=()=>{accStep.email=($('#aEmail')||{value:''}).value.trim();accMode=sw.dataset.to;accStep.sent=false;openAccount()};
  const eye=$('#aEye');if(eye)eye.onclick=()=>{const i=$('#aPass'),on=i.type==='password';i.type=on?'text':'password';eye.textContent=on?'Ocultar':'Ver';eye.setAttribute('aria-pressed',on)};
  const fg=$('#aForgot');if(fg)fg.onclick=()=>{accStep.email=$('#aEmail').value.trim();accMode='forgot';openAccount()};
  $('#f').onsubmit=async e=>{e.preventDefault();const email=$('#aEmail').value.trim().toLowerCase(),b=e.target.querySelector('[type=submit]'),lbl=b.textContent;
    if(!okMail(email))return err('Revisa el correo: debe verse como nombre@correo.com.');
    if(otp||forgot){b.disabled=true;b.textContent='Enviando…';try{await sendCode(otp?'email':'recovery',email);accStep={email,sent:true,kind:otp?'email':'recovery',at:Date.now()};openAccount()}catch(x){err(friendlyAuth(x));b.disabled=false;b.textContent=lbl}return}
    const pw=$('#aPass').value;if(pw.length<(signup?8:1))return err(signup?'La contraseña debe tener al menos 8 caracteres.':'Escribe tu contraseña.');
    if(signup&&pw!==$('#aPass2').value)return err('Las contraseñas no coinciden.');
    b.disabled=true;b.textContent=signup?'Creando…':'Entrando…';
    try{const c=await sbClient();
      if(signup){const {data,error}=await c.auth.signUp({email,password:pw,options:{emailRedirectTo:APP_URL}});if(error)throw error;
        if(data.session){sbUser=data.user;close();paintAcc();toast('Cuenta creada');track('cuenta_creada');afterLogin()}
        else{accStep={email,sent:true,kind:'signup',at:Date.now()};track('registro_iniciado');openAccount()}}
      else{const {data,error}=await c.auth.signInWithPassword({email,password:pw});if(error)throw error;sbUser=data.user;accStep={email:'',sent:false};close();paintAcc();toast('Sesión iniciada');track('sesion_iniciada');afterLogin()}}
    catch(x){err(/Invalid login credentials/i.test(x&&x.message||'')?'Correo o contraseña incorrectos.':/Email not confirmed/i.test(x&&x.message||'')?'Confirma tu correo primero: escribe el código que te enviamos o toca el enlace del correo.':/already registered|already been registered/i.test(x&&x.message||'')?'Ese correo ya tiene cuenta. Toca «Ya tengo cuenta».':friendlyAuth(x));b.disabled=false;b.textContent=lbl}};
}
/* ---------- Código por correo: casillas individuales, pegar completo, reenviar y vencimiento ---------- */
const OTP_LEN=8, OTP_EXP_MIN=60, OTP_RESEND_S=60;
const okMail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
async function sendCode(kind,email){const c=await sbClient();let r;
  if(kind==='signup')r=await c.auth.resend({type:'signup',email,options:{emailRedirectTo:APP_URL}});
  else if(kind==='recovery')r=await c.auth.resetPasswordForEmail(email,{redirectTo:APP_URL});
  else r=await c.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:APP_URL}});
  if(r&&r.error)throw r.error}
let otpTimer=null;
function openCodeStep(){
  const k=accStep.kind||'email',email=accStep.email;
  const T={email:['Escribe el código','para entrar'],signup:['Confirma tu correo','para confirmar tu cuenta'],recovery:['Escribe el código','para crear una contraseña nueva']}[k];
  sheet(`<h3>${T[0]}</h3><form class="form" id="f" novalidate>
    <p class="lead-s">Te enviamos un código de ${OTP_LEN} dígitos a <b>${esc(email)}</b> ${T[1]}. Revisa también la carpeta de spam.</p>
    <div class="otp" id="otp" role="group" aria-label="Código de ${OTP_LEN} dígitos">${Array.from({length:OTP_LEN},(_,i)=>`<input class="otp-b" inputmode="numeric" pattern="[0-9]*" maxlength="${i===0?OTP_LEN:1}" aria-label="Dígito ${i+1} de ${OTP_LEN}" autocomplete="${i===0?'one-time-code':'off'}">`).join('')}</div>
    <p class="otp-exp num" id="otpExp" aria-live="polite"></p>
    <div class="err" id="err" role="alert"></div>
    <button class="btn" type="submit">${k==='recovery'?'Continuar':k==='signup'?'Confirmar mi cuenta':'Entrar'}</button>
    <div class="two"><button class="btn ghost" type="button" id="aResend" disabled>Reenviar código</button><button class="btn ghost" type="button" id="aBack">Cambiar correo</button></div>
    <button class="link-btn" type="button" id="aLinkT">¿Te llegó un enlace en vez de un código?</button>
    <div class="field" id="aLinkBox" hidden><label for="aLink">Mantén presionado el botón del correo, copia el enlace y pégalo aquí</label><input id="aLink" type="url" autocomplete="off" placeholder="https://…"></div>
  </form>`,'var(--brand)');
  const err=m=>{$('#err').textContent=m};
  const B=[...document.querySelectorAll('.otp-b')],code=()=>B.map(i=>i.value).join('');
  const fill=(start,digits)=>{digits.split('').slice(0,OTP_LEN-start).forEach((d,j)=>{B[start+j].value=d});const n=Math.min(OTP_LEN-1,start+digits.length);B[n].focus();if(code().length===OTP_LEN)$('#f').requestSubmit()};
  B.forEach((inp,i)=>{
    inp.addEventListener('input',()=>{const d=inp.value.replace(/\D/g,'');if(d.length>1){inp.value='';fill(i,d)}else{inp.value=d;if(d&&i<OTP_LEN-1)B[i+1].focus();if(code().length===OTP_LEN)$('#f').requestSubmit()}err('')});
    inp.addEventListener('keydown',e=>{if(e.key==='Backspace'&&!inp.value&&i>0){B[i-1].value='';B[i-1].focus();e.preventDefault()}else if(e.key==='ArrowLeft'&&i>0)B[i-1].focus();else if(e.key==='ArrowRight'&&i<OTP_LEN-1)B[i+1].focus()});
    inp.addEventListener('paste',e=>{const d=((e.clipboardData||window.clipboardData).getData('text')||'').replace(/\D/g,'');if(d){e.preventDefault();fill(d.length>=OTP_LEN?0:i,d)}});
    inp.addEventListener('focus',()=>inp.select());
  });
  setTimeout(()=>B[0].focus(),60);
  const sent=accStep.at||Date.now(),rs=$('#aResend');
  const tick=()=>{if(!document.getElementById('otpExp')){clearInterval(otpTimer);return}
    const left=sent+OTP_EXP_MIN*60e3-Date.now(),wait=Math.ceil((sent+OTP_RESEND_S*1e3-Date.now())/1e3);
    const mm=x=>Math.floor(x/60)+':'+String(x%60).padStart(2,'0');
    $('#otpExp').textContent=left>0?'El código vence en '+mm(Math.ceil(left/1e3)):'Este código ya venció. Pide uno nuevo.';
    $('#otpExp').classList.toggle('late',left<=0);
    rs.disabled=wait>0;rs.textContent=wait>0?'Reenviar en '+mm(wait):'Reenviar código'};
  clearInterval(otpTimer);otpTimer=setInterval(tick,1000);tick();
  $('#aBack').onclick=()=>{accStep={email,sent:false};openAccount()};
  rs.onclick=async()=>{rs.disabled=true;try{await sendCode(k,email);accStep.at=Date.now();B.forEach(i=>i.value='');openCodeStep();toast('Te enviamos otro código')}catch(e){err(friendlyAuth(e));rs.disabled=false}};
  $('#aLinkT').onclick=()=>{$('#aLinkBox').hidden=false;$('#aLinkT').hidden=true;$('#aLink').focus()};
  $('#f').onsubmit=async e=>{e.preventDefault();const c0=code(),lk=linkToken($('#aLink').value);
    if(!lk&&$('#aLink').value.trim())return err('Ese enlace no es el del correo de Caoba. Cópialo completo, desde el botón del correo.');
    if(!lk&&c0.length<OTP_LEN)return err('Escribe los '+OTP_LEN+' dígitos del código.');
    if(!lk&&Date.now()>sent+OTP_EXP_MIN*60e3)return err('Este código ya venció. Toca «Reenviar código».');
    const b=e.target.querySelector('[type=submit]'),lbl=b.textContent;if(b.disabled)return;b.disabled=true;b.textContent='Verificando…';
    try{const c=await sbClient();const {data,error}=await c.auth.verifyOtp(lk?{token_hash:lk.hash,type:lk.type}:{email,token:c0,type:k==='signup'?'signup':k==='recovery'?'recovery':'email'});if(error)throw error;
      sbUser=data.user;accStep={email:'',sent:false};clearInterval(otpTimer);close();paintAcc();
      if(k==='recovery'){loginFor=sbUser.id;openNewPassword(true);return}
      toast(k==='signup'?'Cuenta confirmada':'Sesión iniciada');track(k==='signup'?'cuenta_creada':'sesion_iniciada');afterLogin()}
    catch(x){err(friendlyAuth(x));B.forEach(i=>i.value='');B[0].focus();b.disabled=false;b.textContent=lbl}};
}
function openNewPassword(thenSync){
  sheet(`<h3>Crea tu contraseña nueva</h3><form class="form" id="f" novalidate><div class="field"><label for="nP1">Contraseña nueva</label><input id="nP1" type="password" autocomplete="new-password" placeholder="Al menos 8 caracteres"></div>
    <div class="field"><label for="nP2">Repítela</label><input id="nP2" type="password" autocomplete="new-password"></div><p class="err" id="err" role="alert"></p><button class="btn" type="submit">Guardar contraseña</button></form>`,'var(--brand)');
  $('#f').onsubmit=async e=>{e.preventDefault();const a=$('#nP1').value;if(a.length<8)return $('#err').textContent='Al menos 8 caracteres.';if(a!==$('#nP2').value)return $('#err').textContent='No coinciden.';
    try{const c=await sbClient();const {error}=await c.auth.updateUser({password:a});if(error)throw error;close();toast('Contraseña actualizada');if(thenSync){loginFor='';afterLogin()}}catch(x){$('#err').textContent=friendlyAuth(x)}};
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
  ensureProfiles();
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

