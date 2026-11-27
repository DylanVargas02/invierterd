/* ---------- Novedades por versión ----------
   El aviso aparece una sola vez por versión (se recuerda en el teléfono y en la cuenta).
   Quien abre Caoba por primera vez no lo ve: para esa persona todo es nuevo. */
const CHANGELOG=[
  {v:'3.0',fecha:'27 de noviembre de 2026',titulo:'Más claro, más preciso y a tu gusto',
   nuevo:['Cinco identidades visuales para elegir en Ajustes. Azul financiero es la estándar.','Bonos con valor nominal, precio, cupones, calendario de pagos y rendimiento al vencimiento.','Cuentas de ahorro con intereses: estimados frente a acreditados por la entidad, historial de tasas y evolución del saldo.','Exportación a Excel por hojas, con filtros y totales.','Menú de perfil: cambia de perfil financiero o entra con otro correo desde tu inicial.','Ayuda y soporte, política de privacidad y términos de uso.'],
   mejoras:['Formularios por bloques: primero lo esencial, lo avanzado plegado y ayudas breves.','Tarjetas con vista previa del color antes de guardar.','Inversiones con fecha de compra distinta de la fecha de registro.','Widgets nuevos en Android: cuentas (con ⇄, + y − por cuenta) y movimientos rápidos que abren directo el formulario.','Widgets en modo claro y oscuro, con comparación frente al mes anterior y próximo cupón de tus bonos.'],
   arreglos:['El selector de color ya no se monta sobre los últimos 4 dígitos.','Los bonos ya no se calculan como certificados.']},
  {v:'2.0',fecha:'24 de noviembre de 2026',titulo:'Nueva identidad y app Android',
   nuevo:['Navegación de 5 pestañas: Resumen, Movimientos, Cuentas, Inversión y Mercado.','App Android con widgets en la pantalla de inicio.','Mercado con tasas verificadas, fuente y fecha.','Perfiles financieros y respaldo en archivo.'],
   mejoras:['Código de acceso de 8 dígitos con casillas.','Campos de 16 px y formularios que no quedan tapados por el teclado.'],arreglos:[]}];
const NOV_KEY=KEY+'.novedad';
const novSeen=()=>{let v=null;try{v=localStorage.getItem(NOV_KEY)}catch(e){}return v||S.seenVer||null};
function markNovSeen(){try{localStorage.setItem(NOV_KEY,CHANGELOG[0].v)}catch(e){}if(S.seenVer!==CHANGELOG[0].v&&!S.example){S.seenVer=CHANGELOG[0].v;save()}}
const NOV_FIRST=(()=>{try{return !localStorage.getItem(KEY)}catch(e){return true}})();
function changelogHTML(c){const L=(t,a)=>a&&a.length?`<h4 class="menu-g">${t}</h4><ul class="nov-l">${a.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
  return `<p class="nov-v num">Versión ${esc(c.v)} · ${esc(c.fecha)}</p>${L('Nuevo',c.nuevo)}${L('Mejoras',c.mejoras)}${L('Correcciones',c.arreglos)}`}
function openChangelog(all){
  const c=CHANGELOG[0];
  sheet(`<h3>${all?'Novedades de Caoba':esc(c.titulo)}</h3>${all?CHANGELOG.map(x=>`<section class="nov-s"><h4 class="nov-t">${esc(x.titulo)}</h4>${changelogHTML(x)}</section>`).join(''):changelogHTML(c)}
    <div class="form">${all?'':'<button class="btn" type="button" id="novOk">Entendido</button><button class="btn ghost" type="button" id="novAll">Ver el historial de versiones</button>'}</div>`,'var(--brand)');
  markNovSeen();const o=$('#novOk');if(o)o.onclick=close;const h=$('#novAll');if(h)h.onclick=()=>openChangelog(true);
}
function maybeShowNews(){
  if(NOV_FIRST||S.example&&!novSeen()){markNovSeen();return}
  if(novSeen()===CHANGELOG[0].v)return;
  if(document.documentElement.classList.contains('onb-open')||$('#layer').firstChild||$('#tour'))return setTimeout(maybeShowNews,4000);
  openChangelog(false);track('novedades_vistas',{v:CHANGELOG[0].v.replace('.','_')});
}
