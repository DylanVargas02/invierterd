/* ---------- Privacidad, términos de uso y soporte ----------
   Los textos describen lo que la app hace de verdad. No se inventan correos, teléfonos ni plazos de respuesta.
   Los mensajes de soporte se guardan en la tabla support_tickets de Supabase: cualquiera puede escribir,
   solo el administrador puede leerlos. */
const LEGAL_FECHA='27 de noviembre de 2026';
function legalSheet(title,sections,extra){
  sheet(`<h3>${title}</h3><p class="hint">Vigente desde el ${LEGAL_FECHA}. Caoba está en fase de prueba (beta).</p>
    <nav class="lg-toc" aria-label="Secciones">${sections.map((s,i)=>`<a href="#lg${i}" data-lg="${i}">${esc(s[0])}</a>`).join('')}</nav>
    <div class="lg">${sections.map((s,i)=>`<section id="lg${i}"><h4>${esc(s[0])}</h4>${s[1]}</section>`).join('')}</div>${extra||''}`,'var(--brand)');
  document.querySelectorAll('[data-lg]').forEach(a=>a.onclick=e=>{e.preventDefault();const t=document.getElementById('lg'+a.dataset.lg);if(t)t.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'})});
}
function openPrivacy(){
  legalSheet('Política de privacidad',[
    ['Qué información recopila Caoba',`<ul><li><b>Lo que registras:</b> cuentas, tarjetas (solo los últimos 4 dígitos, si los escribes), préstamos, inversiones, ingresos, gastos, presupuestos, recordatorios y ajustes.</li>
      <li><b>Tu perfil:</b> nombre, y si decides darlos, edad, provincia, ocupación y sexo.</li>
      <li><b>Si creas una cuenta:</b> tu correo electrónico. La contraseña la guarda cifrada el servicio de cuentas; Caoba no puede verla.</li>
      <li><b>Estadísticas de uso, solo si las aceptas:</b> qué pantallas y acciones se usan, con un identificador aleatorio del dispositivo. Nunca montos, nombres ni datos de tus cuentas.</li>
      <li><b>Mensajes de soporte:</b> lo que escribas y, si lo permites, datos técnicos (versión de la app, plataforma y tamaño de pantalla).</li></ul>
      <p><b>Caoba nunca pide ni guarda</b> números completos de tarjetas o cuentas, códigos de seguridad (CVV), claves bancarias ni tu cédula.</p>`],
    ['Para qué se utiliza',`<p>Para mostrarte tus finanzas, calcular saldos, intereses y vencimientos, y sincronizar tus datos entre tus dispositivos. Las estadísticas anónimas sirven solo para mejorar la app. No se usa tu información para publicidad personalizada ni se vende.</p>`],
    ['Cómo se almacena',`<ul><li><b>Sin cuenta:</b> todo queda en el almacenamiento de este teléfono o navegador.</li>
      <li><b>Con cuenta:</b> además se guarda una copia en Supabase, el servicio de base de datos que usa Caoba, para que la veas en otros dispositivos.</li>
      <li><b>App Android:</b> el resumen que muestran los widgets se guarda cifrado con una clave del propio teléfono, y la app no participa en las copias de seguridad automáticas de Google.</li></ul>`],
    ['Cómo se protege',`<p>La conexión con los servidores es cifrada (HTTPS). Las reglas de la base de datos impiden que una cuenta lea o cambie los datos de otra. La app solo contiene la clave pública del servicio, que no permite saltarse esas reglas. Ningún sistema es infalible: protege tu teléfono con bloqueo de pantalla y usa una contraseña que no repitas en otros servicios.</p>`],
    ['Qué se comparte con terceros',`<p>Caoba no vende ni cede tus datos. Para funcionar usa estos proveedores, que procesan información solo para prestar su servicio:</p>
      <ul><li><b>Supabase:</b> cuentas de acceso, copia de tus datos, tasas del mercado, estadísticas y mensajes de soporte.</li>
      <li><b>Google (Gmail):</b> envío de los correos con códigos de acceso y de recuperación.</li>
      <li><b>GitHub Pages:</b> aloja la versión web; como todo servidor web, puede registrar la dirección IP de quien la visita.</li></ul>`],
    ['Cómo pedir que se eliminen tus datos',`<ul><li><b>Desde la app:</b> Ajustes → Borrar todos mis datos (este teléfono), o Tu cuenta → Eliminar mi cuenta y todos mis datos (también la copia en la nube). Se borran de inmediato.</li>
      <li><b>Por escrito:</b> desde Ayuda y soporte, tipo «Problema con mi cuenta».</li></ul>
      <p>Puedes ver y corregir tus datos en la app en cualquier momento. Estos derechos se basan en la Ley 172-13 de protección de datos personales de la República Dominicana.</p>`],
    ['Cookies y analítica',`<p>Caoba no usa cookies de publicidad ni herramientas de analítica de terceros. Guarda tus preferencias y tus datos en el almacenamiento local del navegador o del teléfono. Las estadísticas propias solo se envían si aceptas compartirlas, y puedes desactivarlas en Ajustes → Privacidad y seguridad.</p>`],
    ['Cambios a esta política',`<p>Si esta política cambia, la app lo indicará en el aviso de novedades de la versión correspondiente.</p>`]]);
}
function openTerms(){
  legalSheet('Términos y condiciones de uso',[
    ['Qué es Caoba',`<p>Caoba es una herramienta para organizar tus finanzas personales y comparar información del mercado financiero dominicano. Está en fase de prueba (beta): puede tener errores y sus funciones pueden cambiar.</p>`],
    ['Tu cuenta',`<p>Eres responsable de mantener segura tu contraseña y el acceso a tu correo. Cada cuenta es personal. No intentes acceder a datos de otras personas ni alterar el funcionamiento del servicio.</p>`],
    ['La información financiera',`<ul><li><b>No es asesoría.</b> Caoba muestra cálculos y datos para ayudarte a decidir, pero no es una asesoría financiera, legal ni fiscal. Antes de invertir, confirma las condiciones con la entidad.</li>
      <li><b>Tus registros:</b> los saldos, tasas e intereses se calculan con los datos que escribes. Los intereses y rendimientos que dicen «estimado» son aproximaciones; los valores oficiales son los de tu estado de cuenta.</li>
      <li><b>Mercado:</b> muestra solo datos publicados por fuentes oficiales (Banco Central y Superintendencia del Mercado de Valores), cada uno con su fuente y su fecha. Los cálculos de Caoba, como las variaciones, se indican como tales. No es asesoría de inversión.</li>
      <li><b>Sin conexión bancaria:</b> Caoba no se conecta a tus bancos ni mueve dinero.</li></ul>`],
    ['Limitaciones del servicio',`<p>El servicio se ofrece tal como está, sin garantía de disponibilidad continua. Caoba no se hace responsable de decisiones tomadas a partir de la información mostrada, ni de pérdidas de datos causadas por borrar la app o el navegador sin cuenta ni respaldo. Te recomendamos crear una cuenta o guardar respaldos.</p>`],
    ['Propiedad',`<p>Tus datos son tuyos y puedes exportarlos a Excel o a un archivo de respaldo cuando quieras. La marca, el diseño y el código de Caoba pertenecen a sus autores.</p>`],
    ['Cambios y contacto',`<p>Estos términos pueden actualizarse; los cambios se anunciarán en el aviso de novedades. Para consultas, usa Ayuda y soporte dentro de la app.</p>`]]);
}
/* ---------- Ayuda y soporte ---------- */
const FAQ=[
  ['¿Caoba se conecta a mi banco?','No. En República Dominicana los bancos aún no ofrecen una conexión autorizada para apps como Caoba. Tus cuentas se registran a mano, y Caoba nunca te pedirá claves bancarias.'],
  ['¿Dónde están mis datos?','Sin cuenta, solo en este teléfono. Con cuenta, también en tu copia en la nube, que solo tú puedes leer.'],
  ['¿Cuál es la diferencia entre un perfil y otra cuenta de correo?','Un perfil separa tus finanzas dentro de tu misma cuenta (por ejemplo, Personal y Negocio). Otro correo es otra cuenta, de otra persona o con acceso separado: sus datos no se mezclan.'],
  ['¿Por qué los intereses dicen «estimado»?','Caoba calcula los intereses con la tasa y la capitalización que registraste. Lo que la entidad acredita puede variar un poco; regístralo desde la ficha de la cuenta para que el saldo sea exacto.'],
  ['¿Qué diferencia hay entre la tasa cupón y el rendimiento al vencimiento?','La tasa cupón define los intereses periódicos sobre el valor nominal. El rendimiento al vencimiento considera además el precio que pagaste y el tiempo hasta el vencimiento.'],
  ['¿Cómo paso mis datos de la web a la app Android?','Inicia sesión con la misma cuenta, o guarda un respaldo en Ajustes y restáuralo en la app.'],
  ['No me llega el código por correo','Revisa la carpeta de spam y espera un minuto antes de pedir otro. El código vence a los 60 minutos.']];
const SUP_KINDS=[['error','Reportar un error'],['sugerencia','Enviar una sugerencia'],['consulta','Hacer una consulta'],['cuenta','Problema con mi cuenta']];
function openSupport(kind){
  sheet(`<h3>Ayuda y soporte</h3>
    <h4 class="menu-g">Preguntas frecuentes</h4><div class="faq">${FAQ.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
    <h4 class="menu-g">Escríbenos</h4><form class="form" id="f" novalidate>
      <fieldset class="field"><legend>¿Qué necesitas?</legend><div class="choice two-c">${SUP_KINDS.map(([k,l])=>pill('supK',k,l,(kind||'error')===k)).join('')}</div></fieldset>
      <div class="field"><label for="supS">Asunto <span class="opt">opcional</span></label><input id="supS" maxlength="120"></div>
      <div class="field"><label for="supB">Descripción</label><textarea id="supB" rows="5" maxlength="2000" placeholder="Cuéntanos qué pasó, en qué pantalla y qué esperabas que ocurriera."></textarea><small class="hint" id="supN">Mínimo 15 caracteres. No escribas contraseñas ni números de tarjetas o cuentas.</small></div>
      <div class="field"><label for="supC">Correo para responderte <span class="opt">opcional</span></label><input id="supC" type="email" inputmode="email" autocomplete="email" value="${esc(sbUser&&sbUser.email||'')}"></div>
      <label class="check"><input type="checkbox" id="supT" checked><span>Incluir datos técnicos: versión de la app, plataforma y tamaño de pantalla</span></label>
      <p class="err" id="err" role="alert"></p><button class="btn" type="submit">Enviar</button></form>
    <p class="hint">Tu mensaje lo lee el equipo de Caoba. Caoba está en fase de prueba y no tiene todavía un plazo de respuesta garantizado.</p>`,'var(--brand)');
  $('#f').onsubmit=async e=>{e.preventDefault();const err=m=>{$('#err').textContent=m},body=$('#supB').value.trim(),c=$('#supC').value.trim();
    if(body.length<15)return err('Escribe al menos 15 caracteres para que podamos entenderte.');
    if(/\b(?:\d[ -]?){13,19}\b/.test(body))return err('Parece que escribiste un número de tarjeta o de cuenta. Bórralo antes de enviar.');
    if(c&&!okMail(c))return err('Revisa el correo o déjalo vacío.');
    const row={kind:(document.querySelector('[name=supK]:checked')||{}).value||'consulta',subject:$('#supS').value.trim()||null,body,contact:c||null,
      tech:$('#supT').checked?{v:String(APP_VER),p:anPlatform(),w:innerWidth,h:innerHeight,skin:S.skin||'azul',vista:view}:null};
    const b=e.target.querySelector('[type=submit]');b.disabled=true;b.textContent='Enviando…';
    try{const headers={apikey:SUPABASE_KEY,'Content-Type':'application/json',Prefer:'return=minimal',Authorization:'Bearer '+SUPABASE_KEY};
      if(sbUser){try{const s=await (await sbClient()).auth.getSession();if(s&&s.data&&s.data.session)headers.Authorization='Bearer '+s.data.session.access_token}catch(x){}}
      const r=await fetch(SUPABASE_URL+'/rest/v1/support_tickets',{method:'POST',headers,body:JSON.stringify(row)});if(!r.ok)throw new Error('HTTP '+r.status);
      track('soporte_enviado',{kind:row.kind});
      sheet(`<h3>Mensaje enviado</h3><div class="form"><p class="lead-s">Gracias. Recibimos tu mensaje${c?' y, si hace falta, te escribiremos a '+esc(c):''}.</p><button class="btn" type="button" id="supOk">Listo</button></div>`,'var(--brand)');$('#supOk').onclick=close}
    catch(x){b.disabled=false;b.textContent='Enviar';err('No se pudo enviar. Revisa tu conexión; tu texto sigue aquí para intentarlo de nuevo.')}};
}
/* Panel del administrador: mensajes de soporte */
async function admSupport(){
  $('#admBody').innerHTML='<p class="hint center">Cargando…</p>';
  try{const c=await sbClient();const {data,error}=await c.from('support_tickets').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw error;
    const K=Object.fromEntries(SUP_KINDS),ST={nuevo:'Nuevo',en_revision:'En revisión',resuelto:'Resuelto'};
    $('#admBody').innerHTML=data.length?`<div class="tickets">${data.map(t=>`<article class="tk st-${t.status}"><div class="tk-h"><b>${esc(K[t.kind]||t.kind)}</b><span class="num">${esc(dtFmt.format(new Date(t.created_at)))}</span></div>
      ${t.subject?`<p class="tk-s">${esc(t.subject)}</p>`:''}<p class="tk-b">${esc(t.body)}</p><p class="hint">${t.contact?'Responder a: '+esc(t.contact):'Sin correo de contacto'}${t.tech?' · '+esc(Object.entries(t.tech).map(([k,v])=>k+': '+v).join(', ')):''}</p>
      <label class="tk-st"><span>Estado</span><select data-tk="${t.id}">${Object.entries(ST).map(([k,l])=>`<option value="${k}" ${t.status===k?'selected':''}>${l}</option>`).join('')}</select></label></article>`).join('')}</div>`:'<p class="hint center">No hay mensajes.</p>';
    document.querySelectorAll('[data-tk]').forEach(s=>s.onchange=async()=>{const {error}=await c.from('support_tickets').update({status:s.value}).eq('id',+s.dataset.tk);toast(error?'No se pudo cambiar el estado':'Estado actualizado')});
  }catch(x){$('#admBody').innerHTML='<p class="err">No se pudieron cargar los mensajes. Revisa tu conexión.</p>'}
}
