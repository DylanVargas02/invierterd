/* ---------- Arranque: siempre al final; cierra el bloque abierto en 00-estado.js ---------- */
normalizeS();
try{if(getCed())S.mail.keepCed=true}catch(e){}
render();
showSplash();
track('app_abierta');
setTimeout(maybeShowNews,reduce?800:2800);
if(!S.onboarded&&!S.onbDismissed)openWelcome();
if(isPublished()&&canCloud()){let has=false;try{has=!!localStorage.getItem(KEY+'.auth')}catch(e){}if(/access_token=|error_description=/.test(location.hash||''))sessionFromUrl();else if(has)sbClient().catch(()=>{})}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')pullIfNewer()});
window.addEventListener('online',()=>{if(sbUser&&(S._upd||0)>(S._synced||0))pushNow()});
})();
