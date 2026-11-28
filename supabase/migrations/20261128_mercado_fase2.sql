-- Caoba Mercado · Fase 2: esquema de datos del portal de mercado
-- Tablas en el esquema privado «mercado». La app solo lee vistas públicas (public.mkt_*).
-- Escribe únicamente el proceso autorizado (clave de servicio, que no pasa por RLS) o un administrador.
-- Nada se sobrescribe: una corrección es una versión nueva que apunta a la anterior.

create schema if not exists mercado;
revoke all on schema mercado from public;
grant usage on schema mercado to anon, authenticated, service_role;

-- Fuentes y su estado (memoria para no reprocesar)
create table if not exists mercado.fuentes (
  codigo text primary key check (codigo ~ '^[a-z0-9_]{2,40}$'),
  nombre text not null,
  tipo text not null check (tipo in ('oficial','privada','manual')),
  url text check (url is null or url ~ '^https?://'),
  frecuencia text,
  activa boolean not null default true,
  terminos_revisados boolean not null default false,
  notas text
);
create table if not exists mercado.estado_fuente (
  fuente text primary key references mercado.fuentes(codigo),
  ultima_consulta timestamptz,
  ultima_publicacion date,
  ultima_observacion date,
  ultimo_sha256 text,
  etag text,
  fallos_seguidos int not null default 0,
  estado text not null default 'sin_datos' check (estado in ('al_dia','sin_datos','pendiente','error','pausada'))
);

-- Instituciones, nombres anteriores y metodologías
create table if not exists mercado.instituciones (
  codigo text primary key check (codigo ~ '^[a-z0-9_]{2,60}$'),
  nombre text not null,
  tipo text not null check (tipo in ('banco_central','banco','asociacion','afp','afi','emisor','puesto_bolsa','casa_cambio','gobierno','otro')),
  regulador text
);
create table if not exists mercado.alias (
  id bigint generated always as identity primary key,
  entidad_tipo text not null check (entidad_tipo in ('institucion','fondo')),
  entidad text not null,
  nombre_visto text not null,
  fuente text references mercado.fuentes(codigo),
  desde date, hasta date,
  confirmado boolean not null default false,
  unique (entidad_tipo, nombre_visto, fuente)
);
create table if not exists mercado.metodologias (
  id bigint generated always as identity primary key,
  fuente text references mercado.fuentes(codigo),
  serie text,
  vigente_desde date not null,
  descripcion text not null,
  comparable_con_anterior boolean
);

-- Documentos originales (huella para detectar cambios; enlace a Drive cuando se conecte)
create table if not exists mercado.documentos (
  id bigint generated always as identity primary key,
  fuente text not null references mercado.fuentes(codigo),
  variable text not null,
  nombre text not null,
  url_origen text,
  fecha_publicacion date,
  fecha_captura timestamptz not null default now(),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  bytes bigint,
  drive_id text,
  drive_ruta text,
  version int not null default 1,
  reemplaza_a bigint references mercado.documentos(id),
  unique (fuente, sha256)
);

-- Series y observaciones (tres fechas separadas, versión y estado)
create table if not exists mercado.series (
  codigo text primary key check (codigo ~ '^[a-z0-9_.]{3,120}$'),
  nombre text not null,
  categoria text not null check (categoria in ('tipo_cambio','tasa_politica','inflacion','nota_bcrd','fondo_cerrado','fondo_abierto','fondo_pension','certificado','bono','estructurado','otra')),
  variable text not null,
  institucion text references mercado.instituciones(codigo),
  moneda text,
  unidad text not null,
  tipo_tasa text,
  plazo_dias int,
  frecuencia text not null check (frecuencia in ('diaria','semanal','mensual','trimestral','anual','por_evento')),
  agregacion text check (agregacion in ('dato','promedio','fin_de_periodo')),
  fuente text not null references mercado.fuentes(codigo),
  url text,
  notas text
);
create table if not exists mercado.observaciones (
  id bigint generated always as identity primary key,
  serie text not null references mercado.series(codigo),
  fecha_ref date not null,
  fecha_publicacion date,
  fecha_captura timestamptz not null default now(),
  valor numeric not null,
  valor_texto text,
  estado text not null default 'oficial' check (estado in ('oficial','privado','calculado','estimado','pendiente')),
  documento bigint references mercado.documentos(id),
  version int not null default 1,
  reemplaza_a bigint references mercado.observaciones(id),
  revisar text,
  unique (serie, fecha_ref, version)
);
create index if not exists obs_serie_fecha on mercado.observaciones (serie, fecha_ref desc);

-- Notas del BCRD y sus subastas
create table if not exists mercado.notas_bcrd (
  isin text primary key check (isin ~ '^DO[0-9A-Z]{10}$'),
  cupon numeric not null,
  vencimiento date not null,
  plazo_anios_original numeric,
  primera_subasta date,
  estado text not null default 'vigente' check (estado in ('vigente','vencida','cancelada'))
);
create table if not exists mercado.subastas_notas (
  id bigint generated always as identity primary key,
  isin text references mercado.notas_bcrd(isin),
  fila_original int not null,
  plazo_anios numeric,
  cupon numeric,
  fecha_subasta date not null,
  fecha_liquidacion date,
  fecha_vencimiento date,
  dias_al_vencimiento int,
  recibido_vn numeric,
  recibido_precio_prom numeric,
  adjudicado_vn numeric,
  precio_corte numeric,
  adjudicado_precio_prom numeric,
  rendimiento_prom numeric,
  rechazado_precio_prom numeric,
  estado text not null check (estado in ('adjudicada','desierta','sin_adjudicacion')),
  revisar text,
  documento bigint references mercado.documentos(id),
  fecha_captura timestamptz not null default now(),
  unique (fila_original, documento)
);
create index if not exists sub_isin_fecha on mercado.subastas_notas (isin, fecha_subasta);

-- Fondos
create table if not exists mercado.fondos (
  codigo text primary key check (codigo ~ '^[a-z0-9_]{3,80}$'),
  nombre text not null,
  administradora text,
  tipo text not null check (tipo in ('abierto','cerrado','fideicomiso','afp')),
  moneda text not null,
  serie text references mercado.series(codigo),
  activo boolean not null default true,
  notas text
);

-- Ejecuciones y registros pendientes de revisión
create table if not exists mercado.ejecuciones (
  id bigint generated always as identity primary key,
  fuente text not null references mercado.fuentes(codigo),
  inicio timestamptz not null default now(),
  fin timestamptz,
  estado text not null check (estado in ('exito','parcial','fallo','sin_novedad','en_curso')),
  nuevos int not null default 0,
  modificados int not null default 0,
  rechazados int not null default 0,
  origen text not null default 'programada' check (origen in ('programada','manual','carga_inicial')),
  mensaje text
);
create table if not exists mercado.pendientes (
  id bigint generated always as identity primary key,
  fuente text not null references mercado.fuentes(codigo),
  documento bigint references mercado.documentos(id),
  referencia text not null,
  regla text not null,
  detalle text not null,
  propuesta text,
  decision text check (decision in ('aceptado','corregido','descartado')),
  decidido_en timestamptz,
  creado timestamptz not null default now()
);

-- Seguridad: RLS en todo. Lectura pública solo de datos de mercado publicados; ejecuciones y pendientes solo administradores.
do $$ declare t text; begin
  foreach t in array array['fuentes','estado_fuente','instituciones','alias','metodologias','documentos','series','observaciones','notas_bcrd','subastas_notas','fondos','ejecuciones','pendientes'] loop
    execute format('alter table mercado.%I enable row level security', t);
    execute format('revoke all on mercado.%I from anon, authenticated', t);
  end loop;
  foreach t in array array['fuentes','estado_fuente','instituciones','metodologias','series','observaciones','notas_bcrd','subastas_notas','fondos'] loop
    execute format('grant select on mercado.%I to anon, authenticated', t);
    execute format('drop policy if exists "lectura publica" on mercado.%I', t);
    execute format('create policy "lectura publica" on mercado.%I for select to anon, authenticated using (true)', t);
  end loop;
  foreach t in array array['documentos','ejecuciones','pendientes','alias'] loop
    execute format('grant select on mercado.%I to authenticated', t);
    execute format('drop policy if exists "admin lee" on mercado.%I', t);
    execute format('create policy "admin lee" on mercado.%I for select to authenticated using (public.is_admin())', t);
  end loop;
end $$;
grant all on all tables in schema mercado to service_role;
grant usage, select on all sequences in schema mercado to service_role;

-- Vistas públicas que consume Caoba (security_invoker: respetan RLS de las tablas)
create or replace view public.mkt_series with (security_invoker = on) as
  select s.codigo, s.nombre, s.categoria, s.variable, s.institucion, s.moneda, s.unidad, s.tipo_tasa, s.plazo_dias,
         s.frecuencia, s.agregacion, s.fuente, f.nombre as fuente_nombre, coalesce(s.url, f.url) as url,
         (select max(o.fecha_ref) from mercado.observaciones o where o.serie = s.codigo) as ultima_fecha
  from mercado.series s join mercado.fuentes f on f.codigo = s.fuente;

-- Última versión de cada observación (las versiones anteriores quedan guardadas, no se muestran)
create or replace view public.mkt_obs with (security_invoker = on) as
  select o.serie, o.fecha_ref, o.valor, o.estado, o.fecha_publicacion, o.fecha_captura
  from mercado.observaciones o
  where not exists (select 1 from mercado.observaciones n where n.reemplaza_a = o.id);

create or replace view public.mkt_notas with (security_invoker = on) as
  select n.isin, n.cupon, n.vencimiento, n.plazo_anios_original, n.primera_subasta,
         case when n.vencimiento < (now() at time zone 'America/Santo_Domingo')::date then 'vencida' else n.estado end as estado,
         u.fecha_subasta as ultima_subasta, u.estado as ultima_estado,
         a.fecha_subasta as ultima_adjudicacion, a.precio_corte as ultimo_precio_corte, a.adjudicado_precio_prom as ultimo_precio_prom,
         a.rendimiento_prom as ultimo_rendimiento, a.adjudicado_vn as ultimo_adjudicado, a.recibido_vn as ultimo_recibido,
         (a.revisar is not null) as ultimo_en_revision,
         (select count(*) from mercado.subastas_notas c where c.isin = n.isin) as subastas
  from mercado.notas_bcrd n
  left join lateral (select * from mercado.subastas_notas s where s.isin = n.isin order by s.fecha_subasta desc, s.id desc limit 1) u on true
  left join lateral (select * from mercado.subastas_notas s where s.isin = n.isin and s.estado = 'adjudicada' order by s.fecha_subasta desc, s.id desc limit 1) a on true;

create or replace view public.mkt_subastas with (security_invoker = on) as
  select isin, fecha_subasta, fecha_liquidacion, fecha_vencimiento, cupon, plazo_anios, recibido_vn, adjudicado_vn,
         precio_corte, adjudicado_precio_prom, rendimiento_prom, estado, (revisar is not null) as en_revision
  from mercado.subastas_notas;

create or replace view public.mkt_fondos with (security_invoker = on) as
  select f.codigo, f.nombre, f.administradora, f.tipo, f.moneda, f.activo, f.serie,
         (select o.fecha_ref from mercado.observaciones o where o.serie = f.serie order by o.fecha_ref desc limit 1) as ultima_fecha,
         (select count(*) from mercado.observaciones o where o.serie = f.serie) as observaciones
  from mercado.fondos f;

create or replace view public.mkt_estado with (security_invoker = on) as
  select f.codigo, f.nombre, f.tipo, f.url, e.ultima_consulta, e.ultima_publicacion, e.ultima_observacion, e.estado
  from mercado.fuentes f left join mercado.estado_fuente e on e.fuente = f.codigo;

grant select on public.mkt_series, public.mkt_obs, public.mkt_notas, public.mkt_subastas, public.mkt_fondos, public.mkt_estado to anon, authenticated;

-- Panel de administrador: ejecuciones y pendientes
create or replace function public.mkt_admin_resumen() returns jsonb
language sql stable security definer set search_path = public, mercado as $$
  select case when public.is_admin() then jsonb_build_object(
    'ejecuciones', (select coalesce(jsonb_agg(e order by e.inicio desc), '[]') from (select * from mercado.ejecuciones order by inicio desc limit 50) e),
    'pendientes', (select coalesce(jsonb_agg(p order by p.id), '[]') from mercado.pendientes p where p.decision is null),
    'documentos', (select coalesce(jsonb_agg(d order by d.id desc), '[]') from (select id, fuente, variable, nombre, url_origen, fecha_captura, sha256, bytes, drive_id, version from mercado.documentos order by id desc limit 50) d)
  ) else null end $$;
revoke all on function public.mkt_admin_resumen() from public;
grant execute on function public.mkt_admin_resumen() to authenticated;
