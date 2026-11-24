/* ---------- Perfiles financieros: Personal, Familiar, Compartido o Negocio ----------
   Una sola cuenta de acceso con varios conjuntos de finanzas. El perfil activo vive en S como siempre;
   los demás se guardan completos en S.profiles.store y viajan con la misma sincronización.
   Los datos que existían antes de esta versión pasan a ser el perfil «Personal», sin cambios. */
const FIN_KEYS=['savings','loans','cards','expenses','incomes','paydays','transfers','catBudget','recurring','goals','pending','pendingInv','reminders','onboarded','onbDraft','emTarget','lastVia'];
const PROF_KINDS={personal:'Personal',familiar:'Familiar',compartido:'Compartido',negocio:'Negocio'};
function ensureProfiles(){
  if(!S.profiles||!Array.isArray(S.profiles.list)||!S.profiles.list.length)S.profiles={active:'p1',list:[{id:'p1',name:'Personal',kind:'personal'}],store:{}};
  S.profiles.store=S.profiles.store||{};
  if(!S.profiles.list.find(p=>p.id===S.profiles.active))S.profiles.active=S.profiles.list[0].id;
}
const activeProfile=()=>{ensureProfiles();return S.profiles.list.find(p=>p.id===S.profiles.active)};
function switchProfile(id){
  ensureProfiles();if(id===S.profiles.active||!S.profiles.list.find(p=>p.id===id))return;
  const cur={};FIN_KEYS.forEach(k=>{if(S[k]!==undefined)cur[k]=S[k]});
  S.profiles.store[S.profiles.active]=JSON.parse(JSON.stringify(cur));
  const nx=S.profiles.store[id]||{},b=blank();
  FIN_KEYS.forEach(k=>{S[k]=nx[k]!==undefined?nx[k]:b[k]});
  if(nx.onboarded===undefined)S.onboarded=false;
  delete S.profiles.store[id];S.profiles.active=id;
  normalizeS();save();close();setView('resumen');render();window.scrollTo({top:0});
  toast('Perfil: '+activeProfile().name);track('perfil_cambiado');
}
function openProfiles(){
  ensureProfiles();const P=S.profiles;
  sheet(`<h3>Perfiles financieros</h3><p class="lead-s">Separa tus finanzas personales de las de tu familia, de un fondo compartido o de tu negocio. Cada perfil tiene sus propias cuentas, movimientos e inversiones.</p>
    <div class="menu">${P.list.map(p=>`<div class="prof-r${p.id===P.active?' on':''}"><button type="button" class="menu-r" data-prof="${p.id}"><span class="menu-ic" style="--mc:var(--brand)"><svg viewBox="0 0 24 24">${PROF_IC[p.kind]||PROF_IC.personal}</svg></span><span><b>${esc(p.name)}</b><small>${PROF_KINDS[p.kind]||'Personal'}${p.id===P.active?' · en uso':''}</small></span>${p.id===P.active?'<span class="prof-ok" aria-hidden="true">✓</span>':chev}</button>
      <button type="button" class="link-btn" data-prof-ed="${p.id}">Editar</button></div>`).join('')}</div>
    ${S.example?'<p class="hint">Con los datos de ejemplo no se pueden crear perfiles. Empieza con tus datos primero.</p>':`<button type="button" class="grp-add" id="profNew" style="--gc:var(--brand)">+ Nuevo perfil</button>`}`,'var(--brand)');
  document.querySelectorAll('[data-prof]').forEach(b=>b.onclick=()=>switchProfile(b.dataset.prof));
  document.querySelectorAll('[data-prof-ed]').forEach(b=>b.onclick=()=>openProfileForm(b.dataset.profEd));
  const n=$('#profNew');if(n)n.onclick=()=>openProfileForm();
}
const PROF_IC={personal:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',familiar:'<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20c1-3.5 3-5 5.5-5s4.5 1.5 5.5 5M14 20c.5-2.5 1.7-4 3.5-4s3 1.5 3.5 4"/>',compartido:'<path d="M8 12h8"/><circle cx="5" cy="12" r="3"/><circle cx="19" cy="12" r="3"/>',negocio:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 12h18"/>'};
function openProfileForm(id){
  ensureProfiles();const p=id?S.profiles.list.find(x=>x.id===id):null;
  sheet(`<h3>${p?'Editar perfil':'Nuevo perfil'}</h3><form class="form" id="f" novalidate>
    <div class="field"><label for="pfN">Nombre</label><input id="pfN" maxlength="30" value="${esc(p?p.name:'')}" placeholder="Ej. Casa, Negocio de camisetas"></div>
    <fieldset class="field"><legend>Tipo</legend><div class="choice two-c">${Object.entries(PROF_KINDS).map(([k,l])=>pill('pfK',k,l,(p?p.kind:'familiar')===k)).join('')}</div></fieldset>
    <p class="err" id="err" role="alert"></p><button class="btn" type="submit">${p?'Guardar':'Crear perfil'}</button>
    ${p&&p.id!==S.profiles.active?`<button type="button" class="link-btn danger del-link" id="pfDel">Eliminar el perfil «${esc(p.name)}» y sus datos</button>`:''}
    ${p&&p.id===S.profiles.active?'<p class="hint">Para eliminar este perfil, cámbiate primero a otro.</p>':''}</form>`,'var(--brand)');
  $('#f').onsubmit=e=>{e.preventDefault();const nm=$('#pfN').value.trim(),k=(document.querySelector('[name=pfK]:checked')||{}).value||'personal';
    if(!nm)return $('#err').textContent='Ponle un nombre al perfil.';
    if(S.profiles.list.some(x=>x!==p&&x.name.toLowerCase()===nm.toLowerCase()))return $('#err').textContent='Ya tienes un perfil con ese nombre.';
    if(p){p.name=nm;p.kind=k;save();openProfiles();render();return}
    const np={id:'p'+uid(),name:nm,kind:k};S.profiles.list.push(np);S.profiles.store[np.id]={onboarded:false};save();track('perfil_creado');switchProfile(np.id)};
  const d=$('#pfDel');if(d)d.onclick=()=>confirmDel(p.name,'Se borran las cuentas, movimientos e inversiones de este perfil. Tus otros perfiles no cambian.',()=>{S.profiles.list=S.profiles.list.filter(x=>x!==p);delete S.profiles.store[p.id];save();openProfiles();toast('Perfil eliminado')});
}
/* Datos de la persona (registro por pasos): se pueden cambiar en Ajustes */
function openMyProfile(){
  const P=Object.assign({age:'',prov:'',occ:'',sex:''},S.profile||{});
  sheet(`<h3>Tu perfil</h3><form class="form" id="f" novalidate><p class="lead-s">Todo es opcional y solo lo ves tú.</p>
    <div class="two"><div class="field"><label for="mpAge">Edad</label><input id="mpAge" inputmode="numeric" maxlength="3" value="${esc(P.age)}"></div>
    <div class="field"><label for="mpProv">Provincia</label><select id="mpProv"><option value="">Elige</option>${PROVINCIAS.map(p=>`<option ${p===P.prov?'selected':''}>${p}</option>`).join('')}</select></div></div>
    <div class="field"><label for="mpOcc">Ocupación</label><select id="mpOcc"><option value="">Elige</option>${OCUPACIONES.map(p=>`<option ${p===P.occ?'selected':''}>${p}</option>`).join('')}</select></div>
    <fieldset class="field"><legend>Sexo <span class="opt">opcional</span></legend><div class="o-chips">${[['mujer','Mujer'],['hombre','Hombre'],['nd','Prefiero no decirlo']].map(([k,l])=>pill('mpSex',k,l,P.sex===k)).join('')}</div></fieldset>
    <p class="err" id="err" role="alert"></p><button class="btn" type="submit">Guardar</button></form>`,'var(--brand)');
  $('#f').onsubmit=e=>{e.preventDefault();const a=$('#mpAge').value.replace(/\D/g,'');if(a&&(+a<16||+a>110))return $('#err').textContent='Revisa la edad: escribe solo el número de años.';
    S.profile={age:a,prov:$('#mpProv').value,occ:$('#mpOcc').value,sex:(document.querySelector('[name=mpSex]:checked')||{}).value||''};save();close();toast('Perfil guardado')};
}
