/* ---------- Ficha de una cuenta: saldo, intereses estimados frente a acreditados, historial de tasas y evolución ---------- */
const capName=m=>(CAPS.find(c=>c[0]===(m||12))||[0,'Cada mes'])[1].toLowerCase();
/* Saldo al cierre de cada uno de los últimos meses, reconstruido hacia atrás con los movimientos registrados de esa cuenta */
function acctHistory(s,months=6){
  const via='a:'+s.id,ev=[];
  S.incomes.forEach(x=>{if(x.via===via)ev.push([x.date,conv(x.amt,x.cur,s.cur)])});
  S.expenses.forEach(x=>{if(x.via===via)ev.push([x.date,-conv(x.amt,x.cur,s.cur)])});
  (S.transfers||[]).forEach(x=>{if(x.to===via)ev.push([x.date,conv(x.amt,x.cur,s.cur)]);if(x.from===via)ev.push([x.date,-conv(x.amt,x.cur,s.cur)])});
  (s.credits||[]).forEach(c=>ev.push([c.date,c.amt]));
  const now=new Date(),out=[];let bal=s.principal;
  for(let k=0;k<months;k++){const end=+new Date(now.getFullYear(),now.getMonth()-k+1,0,23,59);
    if(k>0){const nextEnd=+new Date(now.getFullYear(),now.getMonth()-k+2,0,23,59);ev.forEach(([d,a])=>{if(d>end&&d<=nextEnd)bal-=a})}
    out.unshift({m:new Date(now.getFullYear(),now.getMonth()-k,1),bal:Math.max(0,k===0?s.principal:bal),known:end>=s.start});}
  return out;
}
function openAcctDetail(id){
  const s=S.savings.find(x=>x.id===id);if(!s)return;if(!ACCT_TYPES.includes(s.type))return s.bond?openBondDetail(id):openSaving({id});
  const t=Date.now(),est=acctAccrued(s,t),cr=s.credits||[],crSum=cr.reduce((a,c)=>a+c.amt,0),pays=s.rate>0;
  const tea=pays?(s.rateKind==='efectiva'?s.rate:(Math.pow(1+s.rate/100/(s.cap||12),s.cap||12)-1)*100):0;
  const H=acctHistory(s),mx=Math.max(...H.map(h=>h.bal),1);
  sheet(`<h3>${esc(s.name)}</h3><p class="lead-s">${esc(s.entity)} · ${esc(s.type)}${s.last4?' · •••• '+esc(s.last4):''} · ${esc(s.cur)}</p>
  <dl class="bd-kv num">
    <div><dt>Saldo registrado</dt><dd>${esc(fmt(s.principal,s.cur,2))}<small>Lo que anotaste o confirmaste</small></dd></div>
    ${pays?`<div><dt>Intereses estimados</dt><dd>+${esc(fmt(est,s.cur,2))}<small>Desde el ${dateFmt.format(new Date(s.accrFrom||s.start))} · estimación de Caoba</small></dd></div>
    <div><dt>Intereses acreditados</dt><dd>${esc(fmt(crSum,s.cur,2))}<small>${cr.length?cr.length+' abonos registrados':'Ninguno registrado'}</small></dd></div>
    <div><dt>Tasa actual</dt><dd>${s.rate.toFixed(2)} %<small>${s.rateKind==='efectiva'?'Efectiva':'Nominal'} · se suman ${capName(s.cap)}</small></dd></div>
    <div><dt>Rendimiento anual estimado</dt><dd>${tea.toFixed(2)} %<small>Tasa efectiva${s.isr?' antes de ISR':''}</small></dd></div>
    <div><dt>Al año, con el saldo actual</dt><dd>≈ ${esc(fmt(s.principal*tea/100*(s.isr?.9:1),s.cur,0))}<small>Estimado${s.isr?', neto de ISR':''}</small></dd></div>`
    :`<div><dt>Intereses</dt><dd>No paga<small>Puedes activarlo al editar la cuenta</small></dd></div>`}
  </dl>
  <h4 class="menu-g">Evolución del saldo</h4>
  <div class="evo" role="img" aria-label="Saldo al cierre de los últimos 6 meses">${H.map(h=>`<div class="evo-c"><span class="evo-v num">${h.known?esc(fmtFit(h.bal,s.cur)):''}</span><span class="evo-b${h.known?'':' unk'}" style="--h:${h.known?(h.bal/mx*100).toFixed(1):4}%"></span><span class="evo-m">${MESES[h.m.getMonth()].slice(0,3)}</span></div>`).join('')}</div>
  <p class="hint">Calculado con los movimientos que registraste en esta cuenta. Si no anotaste todo, puede no coincidir con tu estado de cuenta.</p>
  ${pays&&(s.rateHist||[]).length?`<h4 class="menu-g">Historial de tasas</h4><div class="scroll"><table class="bd-t"><thead><tr><th>Desde</th><th>Hasta</th><th class="num">Tasa</th></tr></thead><tbody>${s.rateHist.map(h=>`<tr><td>${dateFmt.format(new Date(h.from))}</td><td>${dateFmt.format(new Date(h.to))}</td><td class="num">${(+h.rate).toFixed(2)} % ${h.kind==='efectiva'?'ef.':'nom.'}</td></tr>`).join('')}<tr><td>${dateFmt.format(new Date(s.rateFrom||s.start))}</td><td>Hoy</td><td class="num">${s.rate.toFixed(2)} %</td></tr></tbody></table></div>`:''}
  ${cr.length?`<h4 class="menu-g">Intereses acreditados por la entidad</h4><div class="scroll"><table class="bd-t"><thead><tr><th>Fecha</th><th class="num">Acreditado</th><th class="num">Estimado</th></tr></thead><tbody>${cr.slice().reverse().map(c=>`<tr><td>${dateFmt.format(new Date(c.date))}</td><td class="num">${esc(fmt(c.amt,s.cur,2))}</td><td class="num">${c.est!=null?esc(fmt(c.est,s.cur,2)):'—'}</td></tr>`).join('')}</tbody></table></div>`:''}
  <div class="form">${pays?'<button class="btn" type="button" id="adCr">Registrar intereses acreditados</button>':''}<button class="btn ghost" type="button" id="adEd">Editar cuenta${pays?' o cambiar la tasa':''}</button></div>`,'var(--brand)');
  $('#adEd').onclick=()=>openSaving({id});const c=$('#adCr');if(c)c.onclick=()=>openCredit(id);
}
/* El banco depositó intereses: se suman al saldo y la estimación empieza de nuevo desde esa fecha */
function openCredit(id){
  const s=S.savings.find(x=>x.id===id);
  sheet(`<h3>Intereses acreditados</h3><form class="form" id="f" novalidate><p class="lead-s">Escribe lo que aparece en tu estado de cuenta. Caoba lo compara con su estimación.</p>
    <div class="two"><div class="field"><label for="crA">Monto acreditado</label><input id="crA" data-money="crC" inputmode="decimal"><input type="hidden" id="crC" value="${s.cur}"></div><div class="field"><label for="crD">Fecha</label><input type="date" id="crD" value="${today()}"></div></div>
    <p class="calc num" id="crE"></p><p class="err" id="err" role="alert"></p><button class="btn" type="submit">Guardar</button></form>`,'var(--brand)');
  const est=()=>{const d=$('#crD').value?parseDate($('#crD').value):Date.now();return acctAccrued(s,d)};
  const show=()=>{$('#crE').textContent='Estimado por Caoba para esa fecha: '+fmt(est(),s.cur,2)};$('#crD').onchange=show;show();
  $('#f').onsubmit=e=>{e.preventDefault();const a=money($('#crA').value),d=$('#crD').value?parseDate($('#crD').value):Date.now();
    if(!(a>0))return $('#err').textContent='Escribe el monto acreditado.';if(d<(s.accrFrom||s.start))return $('#err').textContent='La fecha debe ser posterior al último abono registrado.';if(d>Date.now()+DAY)return $('#err').textContent='La fecha no puede estar en el futuro.';
    s.credits=(s.credits||[]).concat({date:d,amt:a,est:+est().toFixed(2)});s.principal+=a;s.accrFrom=d;save();track('intereses_acreditados');openAcctDetail(id);render();toast('Intereses registrados')};
}
