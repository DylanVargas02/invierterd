/* ---------- Respaldo: exportar e importar tus datos en un archivo ----------
   Sirve para pasar los datos de la web a la app Android sin crear cuenta, y como copia de seguridad.
   El archivo contiene tus finanzas: guárdalo en un lugar seguro. */
function backupJSON(){const d=JSON.parse(JSON.stringify(S));delete d.onbDraft;delete d._owner;delete d._synced;return JSON.stringify({app:'caoba',formato:1,exportado:new Date().toISOString(),datos:d},null,1)}
async function exportBackup(){
  if(S.example){toast('Estás viendo datos de ejemplo: no hay nada que respaldar');return}
  const name='caoba-respaldo-'+isoLocal(new Date())+'.json',txt=backupJSON();
  if(isNative()){try{await cwPlugin().shareFile({text:txt,name});track('respaldo_exportado')}catch(e){toast('No se pudo crear el respaldo')}return}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);toast('Respaldo descargado: '+name);track('respaldo_exportado');
}
function importBackup(){
  const inp=document.createElement('input');inp.type='file';inp.accept='application/json,.json';
  inp.onchange=()=>{const f=inp.files&&inp.files[0];if(!f)return;if(f.size>5e6){toast('Ese archivo es demasiado grande para ser un respaldo de Caoba');return}
    const r=new FileReader();r.onload=()=>{let o;try{o=JSON.parse(r.result)}catch(e){toast('Ese archivo no es un respaldo de Caoba');return}
      const d=o&&o.app==='caoba'&&o.datos;
      if(!d||!Array.isArray(d.savings)||!Array.isArray(d.expenses)||!Array.isArray(d.incomes)){toast('Ese archivo no es un respaldo de Caoba');return}
      const n=d.savings.length+d.cards.length+(d.loans||[]).length,m=d.expenses.length+d.incomes.length;
      sheet(`<div class="confirm"><h3>¿Restaurar este respaldo?</h3><p class="lead-s">Creado el ${esc(dtFmt.format(new Date(o.exportado)))}: ${n} cuentas, tarjetas, préstamos e inversiones, y ${m} movimientos.</p>
        <p class="lead-s">Reemplaza los datos de este teléfono. ${S.example?'':'Podrás deshacerlo justo después.'}</p>
        <div class="form"><button class="btn" type="button" id="bkYes">Sí, restaurar</button><button class="btn ghost" type="button" id="bkNo">Cancelar</button></div></div>`,'var(--brand)');
      $('#bkNo').onclick=close;
      $('#bkYes').onclick=()=>{const prev=S.example?null:JSON.stringify(S),keep={theme:S.theme};S=Object.assign({},d,{example:false,theme:d.theme!==undefined?d.theme:keep.theme,onbDismissed:true});
        normalizeS();S._upd=Date.now();save();close();closeOnbLayer();setView('resumen');render();track('respaldo_importado');
        if(prev){const t=document.createElement('div');t.className='toast';t.innerHTML='Respaldo restaurado <button type="button" class="link-btn" id="bkUndo">Deshacer</button>';document.body.appendChild(t);
          $('#bkUndo').onclick=()=>{S=JSON.parse(prev);normalizeS();save();render();t.remove();toast('Se recuperaron tus datos anteriores')};setTimeout(()=>t.remove(),9000)}
        else toast('Respaldo restaurado')}};
    r.readAsText(f)};
  inp.click();
}
