-- Caoba · etapas 4 y 6: administradores, observaciones de mercado (sin sobrescritura) y eventos de uso (sin datos financieros).
-- Se puede ejecutar más de una vez.

-- 1. Administradores: solo ellos cargan tasas y ven la analítica
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists "cada quien ve si es admin" on public.admins;
create policy "cada quien ve si es admin" on public.admins for select to authenticated using (user_id = auth.uid());

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admins where user_id = auth.uid())
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2. Observaciones de mercado: cada carga es una fila nueva; nada se edita ni se borra.
--    Para corregir un dato se agrega otra fila que indica a cuál reemplaza (supersedes).
create table if not exists public.market_observations (
  id bigint generated always as identity primary key,
  institution text not null check (char_length(institution) between 2 and 80),
  institution_type text not null default 'banco' check (institution_type in ('banco','asociacion','puesto_bolsa','afi','gobierno','casa_cambio','cooperativa','otro')),
  product text not null check (product in ('certificado','cuenta_ahorro','fondo','bono','sbb','mutuo','prestamo','tarjeta','tasa_cambio','referencia','otro')),
  product_name text check (char_length(product_name) <= 120),
  currency text not null check (currency in ('DOP','USD','EUR')),
  rate numeric not null check (rate >= 0 and rate < 1000),
  rate_type text not null check (rate_type in ('nominal','efectiva','rendimiento','compra','venta','referencia')),
  term_days int check (term_days is null or term_days between 0 and 36500),
  min_amount numeric check (min_amount is null or min_amount >= 0),
  valid_from date,
  valid_to date,
  observed_at timestamptz not null default now(),
  source_name text not null check (char_length(source_name) between 2 and 120),
  source_url text check (source_url is null or source_url ~ '^https?://'),
  status text not null default 'por_verificar' check (status in ('real','simulado','por_verificar')),
  notes text check (char_length(notes) <= 400),
  supersedes bigint references public.market_observations(id),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists market_obs_lookup on public.market_observations (product, currency, observed_at desc);
alter table public.market_observations enable row level security;
drop policy if exists "lectura publica" on public.market_observations;
create policy "lectura publica" on public.market_observations for select to anon, authenticated using (true);
drop policy if exists "solo admin agrega" on public.market_observations;
create policy "solo admin agrega" on public.market_observations for insert to authenticated with check (public.is_admin());
-- Sin políticas de UPDATE ni DELETE: el historial no se puede sobrescribir desde la app.

-- Último dato vigente de cada serie (las filas reemplazadas por una corrección quedan fuera)
create or replace view public.market_latest with (security_invoker = on) as
select distinct on (o.institution, o.product, coalesce(o.product_name,''), o.currency, o.rate_type, coalesce(o.term_days,-1)) o.*
from public.market_observations o
where not exists (select 1 from public.market_observations n where n.supersedes = o.id)
order by o.institution, o.product, coalesce(o.product_name,''), o.currency, o.rate_type, coalesce(o.term_days,-1), o.observed_at desc, o.id desc;
grant select on public.market_latest to anon, authenticated;

-- 3. Eventos de uso: anónimos, sin datos financieros ni personales
create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  anon_id text not null check (anon_id ~ '^[a-z0-9]{8,40}$'),
  session_id text check (session_id ~ '^[a-z0-9]{4,40}$'),
  event text not null check (event ~ '^[a-z0-9_]{2,40}$'),
  screen text check (screen ~ '^[a-z0-9_]{0,30}$'),
  platform text check (platform in ('web','pwa','android','ios')),
  app_version text check (char_length(app_version) <= 20),
  props jsonb check (props is null or (jsonb_typeof(props) = 'object' and pg_column_size(props) < 600))
);
create index if not exists usage_events_at on public.usage_events (at desc);
alter table public.usage_events enable row level security;
drop policy if exists "registrar eventos" on public.usage_events;
create policy "registrar eventos" on public.usage_events for insert to anon, authenticated with check (at > now() - interval '5 minutes' and at < now() + interval '5 minutes');
drop policy if exists "solo admin lee eventos" on public.usage_events;
create policy "solo admin lee eventos" on public.usage_events for select to authenticated using (public.is_admin());

create or replace function public.usage_summary(days int default 30)
returns table(day date, event text, screen text, platform text, n bigint, devices bigint)
language sql stable security invoker set search_path = public as $$
  select (date_trunc('day', at at time zone 'America/Santo_Domingo'))::date, event, coalesce(screen,''), coalesce(platform,''), count(*), count(distinct anon_id)
  from public.usage_events
  where at >= now() - make_interval(days => greatest(1, least(days, 365)))
  group by 1,2,3,4 order by 1 desc, 5 desc
$$;
grant execute on function public.usage_summary(int) to authenticated;
