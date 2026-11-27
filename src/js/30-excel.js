/* ---------- Exportar a Excel (.xlsx) ----------
   Un archivo con una hoja por sección, encabezados fijos, filtros, fechas dd/mm/aaaa, monedas identificadas y totales.
   Se arma en el propio dispositivo (sin enviar datos a ningún servidor) y respeta el perfil financiero en uso. */
const XL_SHEETS=[['resumen','Resumen patrimonial'],['movimientos','Movimientos'],['ingresos','Ingresos'],['gastos','Gastos'],['presupuestos','Presupuestos'],['cuentas','Cuentas'],['tarjetas','Tarjetas de crédito'],['prestamos','Préstamos y deudas'],['inversiones','Ahorros e inversiones'],['bonos','Bonos'],['pagos','Historial de pagos y cupones']];
const xEsc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
const xCol=i=>{let s='';i++;while(i){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s};
const xDate=t=>{const d=new Date(t);return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/864e5+25569};
/* Estilos: 0 normal, 1 encabezado, 2 fecha, 3 monto, 4 porcentaje, 5 total monto, 6 texto en negrita, 7 título */
const XL_STYLES=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="0.00&quot; %&quot;"/></numFmts>
<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B2545"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8EDF3"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top style="thin"><color rgb="FF0B2545"/></top><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="4" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
/* Hoja: cols = [[encabezado, tipo('t'|'d'|'m'|'p'|'n'), ancho]], rows = arrays de valores; tot = índices de columnas a totalizar */
function xSheet(cols,rows,tot,note){
  const cell=(v,c,r,ty)=>{const ref=xCol(c)+r;if(v==null||v===''||(typeof v==='number'&&!isFinite(v)))return '';
    if(ty==='d')return `<c r="${ref}" s="2"><v>${xDate(v)}</v></c>`;if(ty==='m')return `<c r="${ref}" s="3"><v>${+(+v).toFixed(2)}</v></c>`;if(ty==='p')return `<c r="${ref}" s="4"><v>${+(+v).toFixed(4)}</v></c>`;if(ty==='n')return `<c r="${ref}"><v>${+v}</v></c>`;
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xEsc(v)}</t></is></c>`};
  let r=1,x=`<row r="1">${cols.map((c,i)=>`<c r="${xCol(i)}1" s="1" t="inlineStr"><is><t>${xEsc(c[0])}</t></is></c>`).join('')}</row>`;
  rows.forEach(row=>{r++;x+=`<row r="${r}">${row.map((v,i)=>cell(v,i,r,cols[i][1])).join('')}</row>`});
  const last=r;
  if(tot&&tot.length&&rows.length){r++;x+=`<row r="${r}"><c r="A${r}" s="6" t="inlineStr"><is><t>Total (filas visibles)</t></is></c>${cols.slice(1).map((c,j)=>{const i=j+1,ref=xCol(i)+r;if(!tot.includes(i))return `<c r="${ref}" s="6"/>`;const sum=rows.reduce((a,row)=>a+(+row[i]||0),0);return `<c r="${ref}" s="5"><f>SUBTOTAL(9,${xCol(i)}2:${xCol(i)}${last})</f><v>${+sum.toFixed(2)}</v></c>`}).join('')}</row>`}
  if(note){r+=2;x+=`<row r="${r}"><c r="A${r}" t="inlineStr"><is><t>${xEsc(note)}</t></is></c></row>`}
  const ref=`A1:${xCol(cols.length-1)}${Math.max(1,last)}`;
  return {xml:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols.map((c,i)=>`<col min="${i+1}" max="${i+1}" width="${c[2]||14}" customWidth="1"/>`).join('')}</cols><sheetData>${x}</sheetData>${rows.length?`<autoFilter ref="${ref}"/>`:''}</worksheet>`,filter:rows.length?ref:null};
}
/* ZIP sin compresión con CRC-32: suficiente para un .xlsx y sin librerías externas */
const CRC_T=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC_T[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0};
function zipStore(files){const enc=new TextEncoder(),parts=[],cen=[];let off=0;const d=new Date(),dt=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1)),dd=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate());
  const u16=v=>[v&255,(v>>8)&255],u32=v=>[v&255,(v>>8)&255,(v>>16)&255,(v>>>24)&255];
  files.forEach(([name,txt])=>{const n=enc.encode(name),data=enc.encode(txt),c=crc32(data);
    const h=new Uint8Array([0x50,0x4b,3,4,...u16(20),...u16(0x0800),...u16(0),...u16(dt),...u16(dd),...u32(c),...u32(data.length),...u32(data.length),...u16(n.length),...u16(0)]);
    parts.push(h,n,data);cen.push(new Uint8Array([0x50,0x4b,1,2,...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(dt),...u16(dd),...u32(c),...u32(data.length),...u32(data.length),...u16(n.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]),n);off+=h.length+n.length+data.length});
  const cs=cen.reduce((a,x)=>a+x.length,0),end=new Uint8Array([0x50,0x4b,5,6,...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(cs),...u32(off),...u16(0)]);
  const all=[...parts,...cen,end],out=new Uint8Array(all.reduce((a,x)=>a+x.length,0));let p=0;all.forEach(x=>{out.set(x,p);p+=x.length});return out}
function xlsxBuild(sheets){
  const wb=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${xEsc(s.name.slice(0,31))}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets><definedNames>${sheets.map((s,i)=>s.filter?`<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xEsc(s.name.slice(0,31))}'!$${s.filter.replace(':',':$').replace(/([A-Z]+)(\d+)/g,'$1$$$2')}</definedName>`:'').join('')}</definedNames></workbook>`;
  const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const ct=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`;
  return zipStore([['[Content_Types].xml',ct],['_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml',wb],['xl/_rels/workbook.xml.rels',rels],['xl/styles.xml',XL_STYLES],...sheets.map((s,i)=>[`xl/worksheets/sheet${i+1}.xml`,s.xml])]);
}
/* Contenido de cada hoja con los datos reales del perfil en uso */
function xlData(keys,R){
  const B=S.base,t=Date.now(),inR=x=>x.date>=R[0]&&x.date<=R[1],out=[],add=(k,name,cols,rows,tot,note)=>{if(keys.includes(k)){const s=xSheet(cols,rows,tot,note);out.push({name,xml:s.xml,filter:s.filter})}};
  const F=snapshot(t),prof=S.profiles&&activeProfile()?activeProfile().name:'Personal';
  add('resumen','Resumen patrimonial',[['Concepto','t',34],['Monto en '+B,'m',18],['Detalle','t',46]],[
    ['Patrimonio neto',F.assets-F.debt,'Lo que tienes menos lo que debes'],['Lo que tienes',F.assets,'Cuentas e inversiones activas, con intereses estimados'],['Lo que debes',F.debt,'Tarjetas y préstamos'],
    ['En cuentas',accts().reduce((a,s)=>a+conv(savValue(s,t),s.cur,B),0),accts().length+' cuentas'],['En inversiones',totalsOf(invList(),t).v,invList().length+' inversiones'],['Tarjetas de crédito',F.cards,S.cards.length+' tarjetas'],['Préstamos',F.loans,S.loans.length+' préstamos'],
    ['Perfil financiero',null,prof],['Fecha de exportación',null,dtFmt.format(new Date())],['Tasa del dólar usada',S.rates.USD,'RD$ por US$1'],['Período de los movimientos',null,R[0]<=0?'Todo el historial':dateFmt.format(new Date(R[0]))+' a '+dateFmt.format(new Date(Math.min(R[1],t)))]],null,'Datos de Caoba exportados por la persona titular. Los montos con intereses son estimados; los oficiales son los de cada entidad.');
  const inc=S.incomes.filter(inR).sort((a,b)=>a.date-b.date),exp=S.expenses.filter(inR).sort((a,b)=>a.date-b.date);
  const mov=[...inc.map(x=>['Ingreso',x]),...exp.map(x=>['Gasto',x]),...(S.transfers||[]).filter(inR).map(x=>['Transferencia',x])].sort((a,b)=>a[1].date-b[1].date);
  add('movimientos','Movimientos',[['Fecha','d',12],['Tipo','t',14],['Concepto','t',30],['Categoría o tipo','t',22],['Cuenta o medio','t',26],['Moneda','t',8],['Monto','m',14],['Monto en '+B,'m',16]],
    mov.map(([k,x])=>[x.date,k,x.desc,k==='Gasto'?(CATS[x.cat]||CATS.otros).n:k==='Ingreso'?(INC[x.src]||'Ingreso'):'Entre cuentas',k==='Transferencia'?viaName(x.from)+' → '+viaName(x.to):viaName(x.via),x.cur,k==='Gasto'?-x.amt:x.amt,k==='Transferencia'?0:conv(k==='Gasto'?-x.amt:x.amt,x.cur,B)]),[7]);
  add('ingresos','Ingresos',[['Fecha','d',12],['Concepto','t',30],['Tipo','t',22],['Naturaleza','t',16],['Cuenta','t',26],['Moneda','t',8],['Monto','m',14],['Monto en '+B,'m',16]],
    inc.map(x=>[x.date,x.desc,INC[x.src]||'Ingreso',NAT[x.nat]||'',viaName(x.via),x.cur,x.amt,conv(x.amt,x.cur,B)]),[7]);
  add('gastos','Gastos',[['Fecha','d',12],['Concepto','t',30],['Categoría','t',18],['Medio de pago','t',26],['Moneda','t',8],['Monto','m',14],['Monto en '+B,'m',16]],
    exp.map(x=>[x.date,x.desc,(CATS[x.cat]||CATS.otros).n,viaName(x.via),x.cur,x.amt,conv(x.amt,x.cur,B)]),[6]);
  const n=new Date(),mo=x=>{const d=new Date(x.date);return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()};
  add('presupuestos','Presupuestos',[['Categoría','t',22],['Presupuesto mensual en '+B,'m',22],['Gastado este mes','m',18],['Disponible','m',16]],
    Object.entries(S.catBudget||{}).filter(([,v])=>v>0).map(([k,v])=>{const g=S.expenses.filter(x=>x.cat===k&&mo(x)).reduce((a,x)=>a+conv(x.amt,x.cur,B),0);return [(CATS[k]||{n:k}).n,v,g,v-g]}),[1,2,3]);
  add('cuentas','Cuentas',[['Entidad','t',22],['Nombre','t',26],['Tipo','t',16],['Últimos 4','t',10],['Moneda','t',8],['Saldo registrado','m',16],['Intereses estimados','m',16],['Saldo con intereses','m',18],['Tasa anual','p',11],['Tipo de tasa','t',12],['Capitalización','t',16],['Desde','d',12]],
    accts().map(s=>[s.entity,s.name,s.type,s.last4||'',s.cur,s.principal,acctAccrued(s,t),savValue(s,t),s.rate||null,s.rate?(s.rateKind==='efectiva'?'Efectiva':'Nominal'):'',s.rate?(CAPS.find(c=>c[0]===(s.cap||12))||[0,''])[1]:'',s.start]));
  add('tarjetas','Tarjetas de crédito',[['Entidad','t',22],['Nombre','t',24],['Últimos 4','t',10],['Moneda','t',8],['Límite','m',14],['Usado','m',14],['Disponible','m',14],['Tasa anual','p',11],['Día de corte','n',12],['Día de pago','n',12]],
    S.cards.map(c=>[c.entity,c.name,c.last4||'',c.cur,c.limit,c.balance,Math.max(0,c.limit-c.balance),c.rate,c.cutDay||null,c.payDay]));
  add('prestamos','Préstamos y deudas',[['Entidad','t',22],['Nombre','t',24],['Tipo','t',14],['Moneda','t',8],['Monto original','m',16],['Tasa anual','p',11],['Plazo (meses)','n',12],['Cuota','m',14],['Saldo pendiente','m',16],['Cuotas pagadas','n',14],['Próximo pago','d',13]],
    S.loans.map(l=>{const st=loanState(l);return [l.entity,l.name,l.type||'',l.cur,l.principal,l.rate,l.months,st.left?st.cuota:0,st.left,st.n,st.left?st.next:null]}));
  add('inversiones','Ahorros e inversiones',[['Entidad','t',22],['Nombre','t',28],['Instrumento','t',18],['Emisor','t',18],['Moneda','t',8],['Monto invertido','m',16],['Valor estimado hoy','m',18],['Ganancia estimada','m',16],['Tasa','p',10],['Tipo de tasa','t',12],['Fecha de inversión','d',14],['Registrada en Caoba','d',14],['Datos desde','d',12],['Vencimiento','d',13],['Estado','t',12]],
    S.savings.filter(s=>!isAcct(s)&&!s.bond).map(s=>{const v=s.status==='liquidada'?0:savValue(s,t);return [s.entity,s.name,s.type,s.issuer||'',s.cur,s.principal,v,s.status==='liquidada'?null:v-s.principal,s.rate||null,s.rate?(s.vr?'Variable':s.rateKind==='efectiva'?'Efectiva':'Nominal'):'',s.start,s.createdAt||null,s.histFrom||null,s.open?null:nextMat(s,s.start),(ST_N[invStatus(s,t)]||'')]}),[]);
  const BR=S.savings.filter(s=>s.bond);
  add('bonos','Bonos',[['Nombre','t',26],['Emisor','t',22],['ISIN','t',14],['Tipo de emisor','t',13],['Moneda','t',8],['Nominal por bono','m',16],['Cantidad','n',10],['Nominal total','m',16],['Precio de compra','p',13],['Costo','m',15],['Tasa cupón','p',11],['Frecuencia','t',13],['Base de días','t',11],['Fecha de compra','d',13],['Emisión','d',12],['Vencimiento','d',12],['YTM','p',9],['YTM es','t',12],['Intereses devengados','m',16],['Valor en patrimonio','m',18],['Cupones cobrados','m',16]],
    BR.map(s=>{const b=s.bond,y=b.ytm!==''&&b.ytm!=null?+b.ytm:bondYTM(s);return [s.name,s.issuer||'',b.isin||'',{gobierno:'Gobierno',empresa:'Empresa',otro:'Otro'}[b.itype]||'',s.cur,+b.face,+b.qty,bN(b),+b.price||null,s.principal,b.cpn===''?null:+b.cpn,(FREQS.find(f=>String(f[0])===String(b.freq))||[0,''])[1],(BASIS.find(x=>x[0]===b.basis)||[0,''])[1],s.start,b.issue||null,s.due||null,y!=null&&isFinite(y)?y:null,b.ytm!==''&&b.ytm!=null?'Registrado':y!=null?'Estimado':'',bondAccrued(s,t),bondValue(s,t),(b.pays||[]).reduce((a,p)=>a+p.amt,0)]}),[]);
  const P=[];BR.forEach(s=>bondSchedule(s).forEach(c=>{if(c.d>=R[0]&&c.d<=R[1])P.push(['Cupón de bono',s.name,c.d,s.cur,c.exp,c.pay?c.pay.amt:null,c.st])}));
  S.loans.forEach(l=>(l.pays||[]).filter(inR).forEach(p=>P.push([p.k==='abono'?'Abono a capital':'Cuota de préstamo',l.name,p.date,l.cur,null,p.amt,'Pagado'])));
  (S.savings||[]).forEach(s=>(s.credits||[]).forEach(c=>{if(c.date>=R[0]&&c.date<=R[1])P.push(['Intereses acreditados',s.name,c.date,s.cur,c.est,c.amt,'Recibido'])}));
  P.sort((a,b)=>a[2]-b[2]);
  add('pagos','Historial de pagos y cupones',[['Tipo','t',22],['Producto','t',28],['Fecha','d',12],['Moneda','t',8],['Esperado o estimado','m',18],['Pagado o recibido','m',18],['Estado','t',16]],P,[4,5]);
  return out;
}
function openExport(pre){
  const sel=pre||XL_SHEETS.map(s=>s[0]);
  sheet(`<h3>Exportar a Excel</h3><form class="form" id="f" novalidate><p class="lead-s">Un archivo con tus datos reales del perfil <b>${esc(activeProfile().name)}</b>, una hoja por sección, con filtros y totales.</p>
    <fieldset class="field"><legend>Qué incluir</legend><div class="xl-pick">${XL_SHEETS.map(([k,l])=>`<label class="check"><input type="checkbox" name="xlS" value="${k}" ${sel.includes(k)?'checked':''}><span>${l}</span></label>`).join('')}</div>
      <div class="xl-all"><button type="button" class="link-btn" id="xlAll">Todo</button><button type="button" class="link-btn" id="xlNone">Nada</button></div></fieldset>
    <div class="field"><label for="xlP">Período de movimientos y pagos</label><select id="xlP"><option value="all">Todo el historial</option><option value="m">Este mes</option><option value="y">Este año</option><option value="12">Últimos 12 meses</option><option value="r">Elegir fechas</option></select></div>
    <div class="two" id="xlR" hidden><div class="field"><label for="xlA">Desde</label><input type="date" id="xlA"></div><div class="field"><label for="xlB">Hasta</label><input type="date" id="xlB" value="${today()}"></div></div>
    <p class="hint">El archivo contiene información financiera tuya: guárdalo en un lugar seguro.</p>
    <p class="err" id="err" role="alert"></p><button class="btn" type="submit">Crear el Excel</button></form>`,'var(--brand)');
  $('#xlP').onchange=()=>{$('#xlR').hidden=$('#xlP').value!=='r'};
  $('#xlAll').onclick=()=>document.querySelectorAll('[name=xlS]').forEach(c=>c.checked=true);$('#xlNone').onclick=()=>document.querySelectorAll('[name=xlS]').forEach(c=>c.checked=false);
  $('#f').onsubmit=async e=>{e.preventDefault();if(S.example)return $('#err').textContent='Estás viendo datos de ejemplo: el Excel se crea con tus propios datos.';
    const keys=[...document.querySelectorAll('[name=xlS]:checked')].map(c=>c.value);if(!keys.length)return $('#err').textContent='Elige al menos una sección.';
    const n=new Date(),p=$('#xlP').value;let R=[0,Infinity];
    if(p==='m')R=[+new Date(n.getFullYear(),n.getMonth(),1),Infinity];else if(p==='y')R=[+new Date(n.getFullYear(),0,1),Infinity];else if(p==='12')R=[+new Date(n.getFullYear(),n.getMonth()-11,1),Infinity];
    else if(p==='r'){if(!$('#xlA').value)return $('#err').textContent='Elige la fecha de inicio.';R=[parseDate($('#xlA').value)-DAY/2,parseDate($('#xlB').value||today())+DAY/2];if(R[1]<R[0])return $('#err').textContent='La fecha final debe ser posterior a la inicial.'}
    const bytes=xlsxBuild(xlData(keys,R)),name='caoba-'+(activeProfile().name||'perfil').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+isoLocal(n)+'.xlsx';
    track('excel_exportado',{hojas:keys.length});
    if(isNative()){let bin='';for(let i=0;i<bytes.length;i+=8192)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+8192));
      try{await cwPlugin().shareFile({base64:btoa(bin),name,mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});close()}catch(x){$('#err').textContent='No se pudo crear el archivo.'}return}
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800);close();toast('Excel descargado: '+name)};
}
