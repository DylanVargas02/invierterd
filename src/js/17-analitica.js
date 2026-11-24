/* ---------- Analítica de uso (etapa 6) ----------
   Solo con tu permiso. Se cuentan pantallas y acciones (por ejemplo «pantalla: mercado» o «gasto registrado»)
   con un identificador aleatorio del dispositivo. Nunca se envían montos, nombres, cuentas, correos,
   contraseñas ni lo que escribes en los formularios. Los eventos van a la tabla usage_events de Supabase,
   que solo el administrador puede leer. */
const AN_OK=/^[a-z0-9_]{2,40}$/;
const anGet=k=>{try{return localStorage.getItem(KEY+'.'+k)}catch(e){return null}};
const anSet=(k,v)=>{try{if(v==null)localStorage.removeItem(KEY+'.'+k);else localStorage.setItem(KEY+'.'+k,v)}catch(e){}};
const rid=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),b=>(b%36).toString(36)).join('');
let anQ=[],anT=null;const anSession=rid(12);
const anConsent=()=>anGet('consent');
function anPlatform(){if(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform())return Capacitor.getPlatform()==='ios'?'ios':'android';return matchMedia('(display-mode: standalone)').matches||navigator.standalone?'pwa':'web'}
function track(event,props,screen){
  if(anConsent()!=='si'||!AN_OK.test(event)||!canCloud())return;
  let aid=anGet('aid');if(!aid){aid=rid(16);anSet('aid',aid)}
  const P={};if(props)for(const k in props){const v=props[k];if(/^[a-z_]{1,20}$/.test(k)&&(typeof v==='boolean'||typeof v==='number'&&Math.abs(v)<1000||typeof v==='string'&&/^[a-z0-9_]{0,30}$/.test(v)))P[k]=v}
  anQ.push({anon_id:aid,session_id:anSession,event,screen:(screen||view||'').replace(/[^a-z0-9_]/g,'').slice(0,30),platform:anPlatform(),app_version:String(APP_VER).slice(0,20),props:Object.keys(P).length?P:null});
  clearTimeout(anT);anT=setTimeout(anFlush,anQ.length>=20?0:8000);
}
async function anFlush(){
  if(!anQ.length||!navigator.onLine)return;const batch=anQ.splice(0,50);
  try{const r=await fetch(SUPABASE_URL+'/rest/v1/usage_events',{method:'POST',keepalive:true,headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(batch)});if(!r.ok&&r.status>=500)anQ.unshift(...batch)}catch(e){anQ.unshift(...batch.slice(0,50))}
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')anFlush()});addEventListener('pagehide',anFlush);
let anLastView='';
function trackView(){if(view+movSeg+cuSeg===anLastView)return;anLastView=view+movSeg+cuSeg;track('pantalla',{sub:view==='movimientos'?movSeg:view==='cuentas'?cuSeg:''})}
/* Aviso de consentimiento: no bloquea la app y no se vuelve a mostrar después de responder */
function askConsent(){
  if(anConsent()||$('#anBar')||!canCloud())return;
  const d=document.createElement('div');d.id='anBar';d.className='an-bar';d.setAttribute('role','region');d.setAttribute('aria-label','Estadísticas de uso');
  d.innerHTML=`<p><b>¿Nos ayudas a mejorar Caoba?</b> Contaríamos qué pantallas se usan, de forma anónima. Nunca montos, nombres ni datos de tus cuentas.</p><div><button type="button" class="btn" id="anYes">Sí, ayudar</button><button type="button" class="btn ghost" id="anNo">No, gracias</button></div>`;
  document.body.appendChild(d);
  $('#anYes').onclick=()=>{anSet('consent','si');d.remove();track('consentimiento_aceptado');track('app_abierta');trackView()};
  $('#anNo').onclick=()=>{anSet('consent','no');d.remove()};
}
function setConsent(on){anSet('consent',on?'si':'no');if(!on){anQ=[];anSet('aid',null)}}

/* Panel de uso para el administrador: resumen de los últimos 30 días, sin datos personales */
async function admUsage(){
  $('#admBody').innerHTML='<p class="hint center">Cargando…</p>';
  try{const c=await sbClient();const {data,error}=await c.rpc('usage_summary',{days:30});if(error)throw error;
    if(!data.length){$('#admBody').innerHTML='<p class="hint center">Todavía no hay eventos. Se registran solo de quienes aceptan compartir estadísticas.</p>';return}
    const byDay={},byEv={},bySc={},byPl={};let tot=0;
    data.forEach(r=>{tot+=+r.n;byDay[r.day]=byDay[r.day]||{n:0,d:0};byDay[r.day].n+=+r.n;byDay[r.day].d=Math.max(byDay[r.day].d,+r.devices);byEv[r.event]=(byEv[r.event]||0)+(+r.n);if(r.event==='pantalla'&&r.screen)bySc[r.screen]=(bySc[r.screen]||0)+(+r.n);if(r.platform)byPl[r.platform]=(byPl[r.platform]||0)+(+r.n)});
    const days=Object.keys(byDay).sort(),mx=Math.max(...days.map(d=>byDay[d].n));
    const tbl=(o,h)=>`<table class="adm-t"><thead><tr><th>${h}</th><th class="num">Veces</th></tr></thead><tbody>${Object.entries(o).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${esc(k)}</td><td class="num">${v.toLocaleString('es-DO')}</td></tr>`).join('')}</tbody></table>`;
    $('#admBody').innerHTML=`<div class="adm-kpi num"><div><small>Eventos · 30 días</small><b>${tot.toLocaleString('es-DO')}</b></div><div><small>Días con uso</small><b>${days.length}</b></div><div><small>Dispositivos en el mejor día</small><b>${Math.max(...days.map(d=>byDay[d].d))}</b></div></div>
      <h4 class="menu-g">Eventos por día</h4><div class="adm-bars" role="img" aria-label="Eventos por día en los últimos 30 días">${days.map(d=>`<span title="${d}: ${byDay[d].n}" style="--h:${(byDay[d].n/mx*100).toFixed(1)}%"></span>`).join('')}</div><div class="adm-bx num"><span>${esc(days[0])}</span><span>${esc(days[days.length-1])}</span></div>
      <h4 class="menu-g">Pantallas más vistas</h4>${tbl(bySc,'Pantalla')}
      <h4 class="menu-g">Acciones</h4>${tbl(byEv,'Evento')}
      <h4 class="menu-g">Plataforma</h4>${tbl(byPl,'Dónde')}
      <p class="hint">Solo cuenta a quienes aceptaron compartir estadísticas. No incluye montos, nombres ni datos de cuentas.</p>`;
  }catch(x){$('#admBody').innerHTML='<p class="err">No se pudo cargar el resumen. Revisa tu conexión.</p>'}
}
