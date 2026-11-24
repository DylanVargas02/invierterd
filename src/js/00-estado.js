(function(){
const DAY=864e5, YEAR=365.25*DAY, MONTH=YEAR/12;
const KEY='alcancia.v1';
const CURS=['DOP','USD','EUR'];
const CATS={
  comida:{n:'Comida',c:'#F2873A',a:'Co'}, transporte:{n:'Transporte',c:'#3C8DEB',a:'Tr'},
  vivienda:{n:'Vivienda',c:'#8B5CF0',a:'Vi'}, servicios:{n:'Servicios',c:'#12B3A0',a:'Se'},
  salud:{n:'Salud',c:'#EC4F7E',a:'Sa'}, ocio:{n:'Ocio',c:'#DDA700',a:'Oc'},
  educacion:{n:'Educación',c:'#22A35A',a:'Ed'}, otros:{n:'Otros',c:'#7E8C88',a:'Ot'}
};
const TABS=[
  {id:'resumen',n:'Resumen',c:'var(--brand)',s:'var(--brand-soft)',i:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'},
  {id:'movimientos',n:'Movimientos',c:'var(--spend)',s:'var(--spend-soft)',i:'<path d="M7 4v14M3.5 14.5L7 18l3.5-3.5"/><path d="M17 20V6M13.5 9.5L17 6l3.5 3.5"/>'},
  {id:'cuentas',n:'Cuentas',c:'var(--brand)',s:'var(--brand-soft)',i:'<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20M6 15h4"/>'},
  {id:'inversion',n:'Inversión',c:'var(--grow)',s:'var(--grow-soft)',i:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'},
  {id:'mercado',n:'Mercado',c:'var(--market)',s:'var(--market-soft)',i:'<path d="M7 3v18M17 3v18"/><rect x="5" y="7" width="4" height="8" rx="1"/><rect x="15" y="9" width="4" height="7" rx="1"/>'}
];

const PROVINCIAS=['Azua','Bahoruco','Barahona','Dajabón','Distrito Nacional','Duarte','El Seibo','Elías Piña','Espaillat','Hato Mayor','Hermanas Mirabal','Independencia','La Altagracia','La Romana','La Vega','María Trinidad Sánchez','Monseñor Nouel','Monte Cristi','Monte Plata','Pedernales','Peravia','Puerto Plata','Samaná','San Cristóbal','San José de Ocoa','San Juan','San Pedro de Macorís','Sánchez Ramírez','Santiago','Santiago Rodríguez','Santo Domingo','Valverde','Vivo fuera del país'];
const OCUPACIONES=['Empleado(a) del sector privado','Empleado(a) del sector público','Trabajo por cuenta propia','Dueño(a) de negocio','Estudiante','Jubilado(a) o pensionado(a)','Trabajo del hogar no remunerado','Buscando empleo','Otra'];
const ym=(t=new Date())=>t.getFullYear()+'-'+(t.getMonth()+1);
/* ---------- Datos de ejemplo ---------- */
function sample(){
  const now=Date.now(), d=new Date(), y=d.getFullYear(), m=d.getMonth(), td=d.getDate();
  const at=(dd,mo=m)=>mo===m?new Date(y,m,Math.min(dd,td),12).getTime():new Date(y,mo,Math.min(dd,new Date(y,mo+1,0).getDate()),12).getTime();
  const id=()=>Math.random().toString(36).slice(2,9);
  const cards=[
    {id:id(),name:'Tarjeta Platinum',entity:'Banco Popular',cur:'DOP',limit:150000,balance:42350,rate:60,payDay:15,last4:'4521'},
    {id:id(),name:'Tarjeta en dólares',entity:'Banco BHD',cur:'USD',limit:3000,balance:820,rate:42,payDay:22,last4:'8890'}
  ];
  const acc={pop:id(),bhd:id(),usd:id()};
  const savings=[
    {id:acc.pop,name:'Cuenta de ahorro Popular',entity:'Banco Popular',type:'Cuenta de ahorro',cur:'DOP',principal:86400,rate:0.5,start:now-220*DAY,months:1,open:true,isr:true,liquid:true},
    {id:acc.bhd,name:'Cuenta corriente BHD',entity:'Banco BHD',type:'Cuenta corriente',cur:'DOP',principal:31750,rate:0,start:now-400*DAY,months:1,open:true,isr:false,liquid:true},
    {id:acc.usd,name:'Ahorro en dólares',entity:'Banreservas',type:'Cuenta de ahorro',cur:'USD',principal:3200,rate:1.5,start:now-125*DAY,months:1,open:true,isr:true,liquid:true},
    {id:id(),name:'Certificado financiero',entity:'Banco Popular',type:'Certificado',cur:'DOP',principal:250000,rate:9.25,start:now-38*DAY,months:6,due:now-38*DAY+6*MONTH,isr:true,liquid:false},
    {id:id(),name:'Fondo abierto de liquidez',entity:'AFI Universal',type:'Fondo de inversión',cur:'DOP',principal:120000,rate:10.8,start:now-71*DAY,months:1,open:true,isr:true,liquid:true},
    {id:id(),name:'Bonos de Hacienda 2031',entity:'Inversiones Popular',type:'Bono',cur:'DOP',principal:300000,rate:10.15,start:now-90*DAY,months:52,due:new Date(2031,2,5).getTime(),isr:true,liquid:false},
    {id:id(),name:'SBB a 60 días',entity:'United Capital',type:'Sell Buy Back (SBB)',cur:'DOP',principal:200000,rate:9.75,start:now-48*DAY,months:2,due:now+12*DAY,isr:true,liquid:false},
    {id:id(),name:'Mutuo a 3 meses',entity:'Alpha Inversiones',type:'Mutuo',cur:'USD',principal:5000,rate:6.5,start:now-20*DAY,months:3,due:now+70*DAY,isr:true,liquid:false}
  ];
  const incomes=[];
  for(let k=0;k<6;k++){const mo=m-k;
    if(k||td>=1)incomes.push({id:id(),desc:'Salario',src:'salario',amt:72000,cur:'DOP',date:at(1,mo),via:'a:'+acc.pop});
    if(k%2===0)incomes.push({id:id(),desc:'Proyecto de consultoría',src:'independiente',amt:350+k*40,cur:'USD',date:at(6,mo),via:'a:'+acc.usd});
    if(k)incomes.push({id:id(),desc:'Alquiler del local',src:'renta',amt:15000,cur:'DOP',date:at(5,mo),via:'a:'+acc.bhd});
    if(k===1||k===4)incomes.push({id:id(),desc:'Remesa de mi hermano',src:'remesa',amt:200,cur:'USD',date:at(18,mo),via:''});
  }
  const c0='c:'+cards[0].id,c1='c:'+cards[1].id,ap='a:'+acc.pop,ab='a:'+acc.bhd;
  const tpl=[['Supermercado','comida',6850,'DOP',2,c0],['Gasolina','transporte',3200,'DOP',3,c0],['Alquiler','vivienda',18000,'DOP',1,ab],['Luz (Edesur)','servicios',2950,'DOP',4,ap],
    ['Internet + móvil','servicios',3100,'DOP',5,ap],['Almuerzo','comida',780,'DOP',6,''],['Suscripción streaming','ocio',12.99,'USD',6,c1],['Farmacia','salud',1240,'DOP',7,c0],
    ['Curso en línea','educacion',29,'USD',8,c1],['Uber','transporte',460,'DOP',9,ap],['Cena con amigos','ocio',2650,'DOP',10,c0],['Colmado','comida',920,'DOP',11,''],
    ['Supermercado','comida',7420,'DOP',20,c0],['Gasolina','transporte',3500,'DOP',22,c0]];
  const shared={'Alquiler':'yo','Supermercado':'otro','Luz (Edesur)':'otro','Cena con amigos':'yo'};
  const expenses=[];
  for(let k=0;k<6;k++){const mo=m-k;tpl.forEach(([desc,cat,amt,cur,dd,via],j)=>{
    if(k===0&&dd>td&&j>0)return;if(k&&(j+k)%5===0)return;
    const f=k?1+((j*7+k*3)%9-4)/25:1;const x={id:id(),desc,cat,amt:cur==='USD'?amt:Math.round(amt*f/10)*10,cur,date:at(dd,mo),via};
    if(k===0&&shared[desc]){x.shared=true;x.payer=shared[desc]}expenses.push(x)})}
  return {
    example:true, base:'DOP', rates:{DOP:1,USD:60.9,EUR:70.6}, budget:55000, theme:null,
    savings,
    loans:[
      {id:id(),name:'Préstamo de vehículo',entity:'Banco BHD',type:'Vehículo',cur:'DOP',principal:1200000,rate:12.5,months:60,start:now-14*30.4*DAY},
      {id:id(),name:'Préstamo personal',entity:'APAP',type:'Personal',cur:'DOP',principal:60000,rate:18,months:12,start:now-9*30.4*DAY}
    ],
    cards, incomes, expenses,
    catBudget:{comida:16000,transporte:8000,vivienda:18000,servicios:7500,salud:5000,ocio:3000,educacion:3000,otros:2500},
    recurring:[
      {id:id(),name:'Alquiler',cat:'vivienda',amt:18000,cur:'DOP',day:1,icon:'alquiler',lastPaid:ym()},
      {id:id(),name:'Luz (Edesur)',cat:'servicios',amt:2950,cur:'DOP',day:4,icon:'luz',lastPaid:td>=4?ym():null},
      {id:id(),name:'Internet + móvil',cat:'servicios',amt:3100,cur:'DOP',day:5,lastPaid:td>=5?ym():null},
      {id:id(),name:'Gimnasio',cat:'salud',amt:2200,cur:'DOP',day:10,lastPaid:null},
      {id:id(),name:'Seguro médico',cat:'salud',amt:2800,cur:'DOP',day:20,lastPaid:null},
      {id:id(),name:'Agua (CAASD)',cat:'servicios',amt:450,cur:'DOP',day:25,lastPaid:null}
    ],
    goals:[],
    pending:[],
    home:{on:false,partner:'Ana',adj:0}, emTarget:6, ver:4,
    pendingInv:[]
  };
}

function blank(){return {example:false,ver:4,mail:S.mail,pendingInv:[],onboarded:S.onboarded,name:S.name||'',profile:S.profile||{},base:S.base,rates:S.rates,theme:S.theme,savings:[],loans:[],cards:[],expenses:[],incomes:[],paydays:[],transfers:[],catBudget:{},recurring:[],goals:[],pending:[],reminders:[],home:{on:false,partner:'',adj:0},customCats:S.customCats,customEnts:S.customEnts,customTypes:S.customTypes,customLoanTypes:S.customLoanTypes,emTarget:S.emTarget||6}}
let S; try{const raw=localStorage.getItem(KEY); S=raw?JSON.parse(raw):sample()}catch(e){S=sample()}
if(S.example&&(S.ver||0)<4){const keep={base:S.base,rates:S.rates,theme:S.theme};S=Object.assign(sample(),keep)}
S.cards=S.cards||[];S.incomes=S.incomes||[];S.recurring=S.recurring||[];S.goals=S.goals||[];S.pending=S.pending||[];
if(!S.catBudget){S.catBudget={};if(S.budget>0)S.catBudget.otros=S.budget}
S.home=S.home||{on:false,partner:'',adj:0};
function save(){S._upd=Date.now();persistLocal();schedulePush()}
let view='resumen'; try{view=localStorage.getItem(KEY+'.view')||'resumen'}catch(e){}
let movSeg='gastos', cuSeg='cuentas';
/* Vistas anteriores a la navegación de 5 pestañas: se llevan a su nuevo lugar */
const VIEW_ALIAS={ingresos:['movimientos','ingresos'],gastos:['movimientos','gastos'],ahorros:['inversion'],prestamos:['cuentas','credito']};
if(VIEW_ALIAS[view]){const [v,sg]=VIEW_ALIAS[view];if(v==='movimientos')movSeg=sg;if(v==='cuentas')cuSeg=sg;view=v}
if(!TABS.find(t=>t.id===view))view='resumen';
let savSeg='inst', monthOffset=0, loanType='Hipotecario', mktSeg='acciones', prodFilter='Certificado', newsFilter='Todo';

