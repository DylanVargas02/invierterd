/* ---------- Estabilidad: teclado y campos visibles ---------- */
/* Con el teclado abierto, los pies fijos dejan de flotar y el campo enfocado se centra en la parte visible. */
(function kb(){
  const vv=window.visualViewport;if(!vv)return;let base=innerHeight;
  const upd=()=>{if(!document.activeElement||!document.activeElement.matches('input,select,textarea')){base=Math.max(base,innerHeight)}
    const open=vv.height<Math.min(base,innerHeight)*0.78&&document.activeElement&&document.activeElement.matches('input:not([type=checkbox]):not([type=radio]),textarea');
    document.documentElement.classList.toggle('kb-open',!!open)};
  vv.addEventListener('resize',upd);addEventListener('orientationchange',()=>{base=0;setTimeout(()=>{base=innerHeight;upd()},400)});
  document.addEventListener('focusin',e=>{const el=e.target;if(!el.matches||!el.matches('input:not([type=checkbox]):not([type=radio]),textarea,select'))return;
    setTimeout(()=>{upd();if(el.closest('.sheet,.onb,.onb2'))el.scrollIntoView({block:'center',behavior:reduce?'auto':'smooth'})},320)});
  document.addEventListener('focusout',()=>setTimeout(upd,120));
})();
