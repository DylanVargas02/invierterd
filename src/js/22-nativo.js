/* ---------- App Android: botón atrás, abrir una sección desde un widget y copia de seguridad local ---------- */
/* Copia los datos también en el almacenamiento nativo (Preferences), para no depender solo del navegador interno. */
let nmT=null;
function nativeMirror(j){if(!isNative()||!window.capacitorPreferences||!j)return;clearTimeout(nmT);nmT=setTimeout(()=>{capacitorPreferences.Preferences.set({key:KEY,value:j}).catch(()=>{})},400)}
/* Enlaces de los widgets: caoba://abrir?seccion=resumen  ·  caoba://abrir?accion=ingreso|gasto|transferencia[&cuenta=ID]
   Una acción abre directo el formulario correspondiente, con la cuenta ya elegida si viene en el enlace. */
function deepParams(u){const o={};String(u||'').replace(/[?&]([a-z]+)=([^&#]*)/gi,(_,k,v)=>{try{o[k.toLowerCase()]=decodeURIComponent(v)}catch(e){o[k.toLowerCase()]=v}});return o}
function openDeep(u){
  const q=deepParams(u);
  if(document.documentElement.classList.contains('onb-open'))return;
  const acc=q.cuenta&&accts().find(s=>String(s.id)===q.cuenta),via=acc?'a:'+acc.id:undefined;
  if(q.accion){
    const a={ingreso:'ingreso',gasto:'gasto',transferencia:'transferencia'}[q.accion];if(!a)return;
    close();
    if(a==='transferencia')openTransfer(null,acc&&acc.type!=='Efectivo'?{kind:'tr',from:via}:{kind:'tr'});
    else openExpense(a,via?{via}:{});
    track('widget_accion',{a,cuenta:!!acc});return;
  }
  if(!q.seccion)return;
  const sec={resumen:'resumen',movimientos:'movimientos',inversion:'inversion',mercado:'mercado',cuentas:'cuentas'}[q.seccion];if(!sec)return;
  close();goTo(sec);track('widget_abierto',{sec});
}
(function nativeBoot(){
  if(!isNative())return;
  document.documentElement.classList.add('native');
  setTimeout(()=>loadMarket(),1500);setInterval(()=>loadMarket(),30*60e3);
  const A=window.capacitorApp&&capacitorApp.App;
  if(A){
    A.addListener('appUrlOpen',e=>openDeep(e&&e.url));
    A.getLaunchUrl().then(r=>{if(r&&r.url)setTimeout(()=>openDeep(r.url),300)}).catch(()=>{});
    /* Atrás: cierra la ventana abierta; si no hay, vuelve al Resumen; desde el Resumen, sale de la app */
    A.addListener('backButton',()=>{
      if($('#tour')){endTour();return}
      if($('#layer').firstChild){close();return}
      if(document.documentElement.classList.contains('onb-open')){const l=$('#oLater')||$('#oBack');if(l)l.click();return}
      if(view!=='resumen'){goTo('resumen');return}
      A.exitApp();
    });
    A.addListener('appStateChange',s=>{if(s&&s.isActive){pullIfNewer();loadMarket()}else{anFlush();widgetSync()}});
  }
  /* Si el almacenamiento del navegador interno se borró pero la copia nativa existe, se recupera */
  try{if(!localStorage.getItem(KEY)&&window.capacitorPreferences)capacitorPreferences.Preferences.get({key:KEY}).then(r=>{if(r&&r.value&&!localStorage.getItem(KEY)){localStorage.setItem(KEY,r.value);location.reload()}}).catch(()=>{})}catch(e){}
})();
