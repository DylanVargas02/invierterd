/* ---------- Administración (etapas 4 y 6): solo para cuentas registradas en la tabla admins ----------
   La base de datos decide quién es administrador (función is_admin con seguridad por fila);
   esta pantalla solo se muestra si la base de datos lo confirma. */
let isAdm=false;
async function checkAdmin(){isAdm=false;if(!sbUser)return false;try{const c=await sbClient();const {data,error}=await c.rpc('is_admin');isAdm=!error&&data===true}catch(e){}return isAdm}
let admTab='cargar';
function openAdmin(){
  if(!isAdm){toast('Esta sección es solo para administradores');return}
  sheet(`<h3>Administración</h3><div class="seg seg-top" role="group" aria-label="Sección">${[['cargar','Cargar tasa'],['hist','Historial'],['uso','Uso'],['soporte','Soporte']].map(([k,l])=>`<button type="button" data-adm="${k}" aria-pressed="${admTab===k}">${l}</button>`).join('')}</div><div id="admBody"></div>`,'var(--brand)');
  document.querySelectorAll('[data-adm]').forEach(b=>b.onclick=()=>{admTab=b.dataset.adm;openAdmin()});
  ({cargar:admLoad,hist:admHist,uso:admUsage,soporte:admSupport})[admTab]();
}
function admLoad(pre){
  pre=pre||{};const opt=(o,v)=>Object.entries(o).map(([k,l])=>`<option value="${k}" ${k===v?'selected':''}>${l}</option>`).join('');
  $('#admBody').innerHTML=`<form class="form" id="admF" novalidate>
    ${pre.supersedes?`<p class="mk-note">Corrección del dato #${pre.supersedes}. El dato anterior no se borra: queda en el historial marcado como reemplazado.</p>`:'<p class="lead-s">Cada carga se guarda como un dato nuevo, con su fuente y su fecha. Nada se sobrescribe.</p>'}
    <div class="field"><label for="amI">Institución</label><input id="amI" list="amIL" value="${esc(pre.institution||'')}" maxlength="80"><datalist id="amIL">${ALL_ENTS.map(e=>`<option>${esc(e)}</option>`).join('')}</datalist></div>
    <div class="two"><div class="field"><label for="amIT">Tipo de institución</label><select id="amIT">${opt(MKR_ITYPE,pre.institution_type||'banco')}</select></div><div class="field"><label for="amP">Producto</label><select id="amP">${opt(MKR_PROD,pre.product||'certificado')}</select></div></div>
    <div class="field"><label for="amPN">Nombre del producto <span class="opt">opcional</span></label><input id="amPN" value="${esc(pre.product_name||'')}" maxlength="120" placeholder="Ej. Certificado financiero"></div>
    <div class="two"><div class="field"><label for="amC">Moneda</label><select id="amC">${CURS.map(c=>`<option ${c===(pre.currency||'DOP')?'selected':''}>${c}</option>`).join('')}</select></div><div class="field"><label for="amR">Tasa</label><input id="amR" inputmode="decimal" value="${pre.rate!=null?esc(pre.rate):''}" placeholder="% anual o RD$ por unidad"></div></div>
    <div class="two"><div class="field"><label for="amRT">Tipo de tasa</label><select id="amRT">${opt(MKR_RT,pre.rate_type||'nominal')}</select></div><div class="field"><label for="amT">Plazo en días <span class="opt">opcional</span></label><input id="amT" inputmode="numeric" value="${pre.term_days!=null?esc(pre.term_days):''}" placeholder="180"></div></div>
    <div class="field"><label for="amM">Monto mínimo <span class="opt">opcional</span></label><input id="amM" inputmode="decimal" value="${pre.min_amount!=null?esc(pre.min_amount):''}"></div>
    <div class="two"><div class="field"><label for="amVF">Vigente desde <span class="opt">opcional</span></label><input type="date" id="amVF" value="${esc(pre.valid_from||'')}"></div><div class="field"><label for="amVT">Vigente hasta <span class="opt">opcional</span></label><input type="date" id="amVT" value="${esc(pre.valid_to||'')}"></div></div>
    <div class="field"><label for="amO">Fecha del dato</label><input type="date" id="amO" value="${esc((pre.observed_at||new Date().toISOString()).slice(0,10))}"></div>
    <div class="field"><label for="amS">Fuente</label><input id="amS" value="${esc(pre.source_name||'')}" maxlength="120" placeholder="Ej. Banco Central · tasas por entidad"></div>
    <div class="field"><label for="amU">Enlace de la fuente <span class="opt">recomendado</span></label><input id="amU" type="url" value="${esc(pre.source_url||'')}" placeholder="https://…"></div>
    <fieldset class="field"><legend>Estado</legend><div class="choice three-c">${Object.entries(MKR_ST).map(([k,l])=>pill('amSt',k,l,(pre.status||'por_verificar')===k)).join('')}</div><small class="hint">«Dato real» solo si lo verificaste en la fuente. Si no, «Por verificar».</small></fieldset>
    <div class="field"><label for="amN">Notas <span class="opt">opcional</span></label><input id="amN" value="${esc(pre.notes||'')}" maxlength="400"></div>
    <p class="err" id="err" role="alert"></p><button class="btn" type="submit">Guardar dato</button></form>`;
  $('#admF').onsubmit=async e=>{e.preventDefault();const err=m=>{$('#err').textContent=m},v=id=>$(id).value.trim();
    const r=parseFloat(v('#amR').replace(',','.')),st=(document.querySelector('[name=amSt]:checked')||{}).value||'por_verificar';
    if(v('#amI').length<2)return err('Escribe la institución.');if(!(r>=0&&r<1000))return err('Revisa la tasa: solo números, con punto o coma decimal.');
    if(v('#amS').length<2)return err('Indica la fuente del dato.');if(v('#amU')&&!/^https?:\/\//.test(v('#amU')))return err('El enlace debe empezar con https://');
    if(st==='real'&&!v('#amU'))return err('Para marcarlo como dato real, agrega el enlace de la fuente.');
    const row={institution:v('#amI'),institution_type:v('#amIT'),product:v('#amP'),product_name:v('#amPN')||null,currency:v('#amC'),rate:r,rate_type:v('#amRT'),
      term_days:v('#amT')?parseInt(v('#amT'),10):null,min_amount:v('#amM')?money(v('#amM')):null,valid_from:v('#amVF')||null,valid_to:v('#amVT')||null,
      observed_at:new Date(v('#amO')+'T12:00:00').toISOString(),source_name:v('#amS'),source_url:v('#amU')||null,status:st,notes:v('#amN')||null,supersedes:pre.supersedes||null};
    const b=e.target.querySelector('[type=submit]');b.disabled=true;b.textContent='Guardando…';
    try{const c=await sbClient();const {error}=await c.from('market_observations').insert(row);if(error)throw error;toast('Dato guardado');track('admin_tasa_cargada');loadMarket(true);admTab='hist';openAdmin()}
    catch(x){err('No se pudo guardar: '+(x&&x.message||'revisa tu conexión'));b.disabled=false;b.textContent='Guardar dato'}};
}
async function admHist(){
  $('#admBody').innerHTML='<p class="hint center">Cargando…</p>';
  try{const c=await sbClient();const {data,error}=await c.from('market_observations').select('*').order('created_at',{ascending:false}).limit(60);if(error)throw error;
    const rep=new Set(data.filter(o=>o.supersedes).map(o=>o.supersedes));
    $('#admBody').innerHTML=data.length?`<div class="mkr-list">${data.map(o=>`<div class="adm-h${rep.has(o.id)?' old':''}">${mkrRow(o)}<div class="adm-a"><span class="num">#${o.id}${o.supersedes?' · corrige #'+o.supersedes:''}${rep.has(o.id)?' · reemplazado':''}</span>${rep.has(o.id)?'':`<button type="button" class="link-btn" data-fix="${o.id}">Corregir</button>`}</div></div>`).join('')}</div>`:'<p class="hint center">Aún no has cargado datos.</p>';
    document.querySelectorAll('[data-fix]').forEach(b=>b.onclick=()=>{const o=data.find(x=>x.id===+b.dataset.fix);admTab='cargar';openAdmin();admLoad(Object.assign({},o,{supersedes:o.id,observed_at:new Date().toISOString(),valid_from:o.valid_from,valid_to:o.valid_to}))});
  }catch(x){$('#admBody').innerHTML='<p class="err">No se pudo cargar el historial. Revisa tu conexión.</p>'}
}
