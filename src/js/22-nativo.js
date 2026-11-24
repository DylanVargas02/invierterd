/* ---------- App Android: botón atrás, abrir una sección desde un widget y copia de seguridad local ---------- */
/* Copia los datos también en el almacenamiento nativo (Preferences), para no depender solo del navegador interno. */
let nmT=null;
function nativeMirror(j){if(!isNative()||!window.capacitorPreferences||!j)return;clearTimeout(nmT);nmT=setTimeout(()=>{capacitorPreferences.Preferences.set({key:KEY,value:j}).catch(()=>{})},400)}
function openDeep(u){
  const m=/[?&]seccion=([a-z]+)/.exec(u||'');if(!m)return;
  const sec={resumen:'resumen',movimientos:'movimientos',inversion:'inversion',mercado:'mercado',cuentas:'cuentas'}[m[1]];if(!sec)return;
  close();if(!document.documentElement.classList.contains('onb-open'))goTo(sec);track('widget_abierto',{sec});
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
