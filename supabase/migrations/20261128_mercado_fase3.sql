-- Caoba Mercado · Fase 3: actualización automática sin claves.
-- GitHub Actions descarga las fuentes y publica lotes JSON en el repositorio (mercado/lotes/).
-- Cada hora, Supabase lee el índice, comprueba la huella de cada lote y lo aplica.
-- La base es quien decide: nada se duplica, nada se sobrescribe (un valor distinto entra como
-- versión nueva marcada para revisar) y todo queda registrado en ejecuciones.
-- Requiere las extensiones http, pgcrypto y pg_cron (incluidas en Supabase).

create extension if not exists http with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron;

-- Nuevas categorías y fuentes
alter table mercado.series drop constraint if exists series_categoria_check;
alter table mercado.series add constraint series_categoria_check check (categoria in
  ('tipo_cambio','tasa_politica','tasa_mercado','inflacion','nota_bcrd','fondo_cerrado','fondo_abierto','fondo_pension','certificado','bono','estructurado','otra'));

insert into mercado.fuentes (codigo, nombre, tipo, url, frecuencia, activa) values
  ('bcrd_tasas_bm', 'Banco Central de la República Dominicana · tasas de interés de los bancos múltiples', 'oficial',
   'https://www.bancentral.gov.do/a/d/2536-sector-monetario-y-financiero', 'diaria', true)
on conflict (codigo) do nothing;
update mercado.fuentes set activa = true, url = 'https://www.bancentral.gov.do/a/d/2536-sector-monetario-y-financiero'
  where codigo = 'bcrd_tpm';
update mercado.fuentes set activa = true where codigo = 'bcrd_ipc';
update mercado.fuentes set notas = 'El servidor de la SIMV bloquea descargas automáticas (verificación anti-bots). Carga manual mensual.'
  where codigo = 'simv_fondos_cerrados';

-- Registro de lotes y corridas ya aplicados
create table if not exists mercado.lotes_aplicados (
  id text primary key,
  tipo text not null check (tipo in ('lote','corrida')),
  fuente text references mercado.fuentes(codigo),
  sha256 text,
  intentos int not null default 1,
  aplicado timestamptz,
  resultado jsonb
);
alter table mercado.lotes_aplicados enable row level security;
revoke all on mercado.lotes_aplicados from anon, authenticated;
grant select on mercado.lotes_aplicados to authenticated;
drop policy if exists "admin lee" on mercado.lotes_aplicados;
create policy "admin lee" on mercado.lotes_aplicados for select to authenticated using (public.is_admin());
grant all on mercado.lotes_aplicados to service_role;

-- Aplica un lote. Devuelve lo que realmente entró.
create or replace function mercado.aplicar_lote(p jsonb) returns jsonb
language plpgsql security definer set search_path = mercado, public set client_min_messages = warning as $$
declare
  v_fuente text := p->>'fuente';
  d jsonb := p->'documento';
  v_cap timestamptz := (d->>'fecha_captura')::timestamptz;
  v_doc bigint;
  n_nuevas int := 0; n_versiones int := 0; n_notas int := 0; n_sub int := 0; n_sub_dif int := 0; n_pend int := 0;
  r record;
begin
  if p->>'formato' is distinct from '1' then raise exception 'Formato de lote desconocido: %', p->>'formato'; end if;
  insert into documentos (fuente, variable, nombre, url_origen, fecha_publicacion, fecha_captura, sha256, bytes)
  values (v_fuente, d->>'variable', d->>'nombre', d->>'url_origen', (d->>'fecha_publicacion')::date, v_cap, d->>'sha256', (d->>'bytes')::bigint)
  on conflict (fuente, sha256) do nothing;
  select id into v_doc from documentos where fuente = v_fuente and sha256 = d->>'sha256';

  insert into series (codigo, nombre, categoria, variable, institucion, moneda, unidad, tipo_tasa, plazo_dias, frecuencia, agregacion, fuente, url, notas)
  select s.codigo, s.nombre, s.categoria, s.variable, s.institucion, s.moneda, s.unidad, s.tipo_tasa, s.plazo_dias, s.frecuencia, s.agregacion, s.fuente, s.url, s.notas
  from jsonb_to_recordset(coalesce(p->'series', '[]')) as s(codigo text, nombre text, categoria text, variable text, institucion text, moneda text, unidad text,
       tipo_tasa text, plazo_dias int, frecuencia text, agregacion text, fuente text, url text, notas text)
  on conflict (codigo) do nothing;

  -- Observaciones: [serie, fecha, valor, texto, estado, revisar]
  drop table if exists _lote_obs;
  create temp table _lote_obs as
    select x->>0 as serie, (x->>1)::date as f, (x->>2)::numeric as v, x->>3 as txt, coalesce(x->>4, 'oficial') as est, x->>5 as rev
    from jsonb_array_elements(coalesce(p->'obs', '[]')) x;
  drop table if exists _lote_ult;
  create temp table _lote_ult as
    select distinct on (o.serie, o.fecha_ref) o.id, o.serie, o.fecha_ref, o.version, o.valor
    from observaciones o join _lote_obs l on l.serie = o.serie and l.f = o.fecha_ref
    order by o.serie, o.fecha_ref, o.version desc;

  -- Valores que cambiaron en la fuente: versión nueva, marcada para revisar
  insert into observaciones (serie, fecha_ref, fecha_captura, valor, valor_texto, estado, documento, version, reemplaza_a, revisar)
  select l.serie, l.f, v_cap, l.v, l.txt, l.est, v_doc, u.version + 1, u.id,
         concat_ws('; ', l.rev, 'la fuente cambió el valor (antes ' || u.valor || ')')
  from _lote_obs l join _lote_ult u on u.serie = l.serie and u.fecha_ref = l.f
  where u.valor <> l.v;
  get diagnostics n_versiones = row_count;
  for r in select l.serie, count(*) n, min(l.f) desde, max(l.f) hasta from _lote_obs l join _lote_ult u on u.serie = l.serie and u.fecha_ref = l.f
           where u.valor <> l.v group by l.serie loop
    insert into pendientes (fuente, documento, referencia, regla, detalle, propuesta)
    values (v_fuente, v_doc, r.serie || ' ' || r.desde || '…' || r.hasta, 'valor_cambiado_en_fuente',
            r.n || ' valores de ' || r.serie || ' cambiaron en la fuente entre ' || r.desde || ' y ' || r.hasta || '. Se guardó la versión nueva y se conserva la anterior.',
            'Confirmar la revisión con la fuente; la app muestra la versión nueva.');
    n_pend := n_pend + 1;
  end loop;

  insert into observaciones (serie, fecha_ref, fecha_captura, valor, valor_texto, estado, documento, revisar)
  select l.serie, l.f, v_cap, l.v, l.txt, l.est, v_doc, l.rev
  from _lote_obs l where not exists (select 1 from _lote_ult u where u.serie = l.serie and u.fecha_ref = l.f);
  get diagnostics n_nuevas = row_count;

  -- Notas y subastas del BCRD
  insert into notas_bcrd (isin, cupon, vencimiento, plazo_anios_original, primera_subasta, estado)
  select n.isin, n.cupon, n.vencimiento, n.plazo_anios_original, n.primera_subasta, n.estado
  from jsonb_to_recordset(coalesce(p->'notas', '[]')) as n(isin text, cupon numeric, vencimiento date, plazo_anios_original numeric, primera_subasta date, estado text)
  on conflict (isin) do update set estado = excluded.estado;
  get diagnostics n_notas = row_count;

  drop table if exists _lote_sub;
  create temp table _lote_sub as
    select * from jsonb_to_recordset(coalesce(p->'subastas', '[]')) as s(isin text, fila_original int, plazo_anios numeric, cupon numeric, fecha_subasta date,
      fecha_liquidacion date, fecha_vencimiento date, dias_al_vencimiento int, recibido_vn numeric, recibido_precio_prom numeric, adjudicado_vn numeric,
      precio_corte numeric, adjudicado_precio_prom numeric, rendimiento_prom numeric, rechazado_precio_prom numeric, estado text, revisar text);
  -- Una subasta ya guardada que llega distinta no se toca: queda como pendiente
  for r in select s.* from _lote_sub s join subastas_notas x on x.isin is not distinct from s.isin and x.fecha_subasta = s.fecha_subasta
             and x.plazo_anios is not distinct from s.plazo_anios
           where (x.adjudicado_vn, x.precio_corte, x.rendimiento_prom, x.estado) is distinct from (s.adjudicado_vn, s.precio_corte, s.rendimiento_prom, s.estado) loop
    insert into pendientes (fuente, documento, referencia, regla, detalle, propuesta)
    select v_fuente, v_doc, coalesce(r.isin, 'sin ISIN') || ' · subasta ' || r.fecha_subasta, 'subasta_cambiada_en_fuente',
           'El archivo nuevo trae datos distintos para esta subasta.', 'Comparar con el resultado publicado y corregir a mano si procede.'
    where not exists (select 1 from pendientes x where x.fuente = v_fuente and x.referencia = coalesce(r.isin, 'sin ISIN') || ' · subasta ' || r.fecha_subasta
                      and x.regla = 'subasta_cambiada_en_fuente' and x.decision is null);
    n_sub_dif := n_sub_dif + 1;
  end loop;
  insert into subastas_notas (isin, fila_original, plazo_anios, cupon, fecha_subasta, fecha_liquidacion, fecha_vencimiento, dias_al_vencimiento, recibido_vn,
         recibido_precio_prom, adjudicado_vn, precio_corte, adjudicado_precio_prom, rendimiento_prom, rechazado_precio_prom, estado, revisar, documento, fecha_captura)
  select s.isin, s.fila_original, s.plazo_anios, s.cupon, s.fecha_subasta, s.fecha_liquidacion, s.fecha_vencimiento, s.dias_al_vencimiento, s.recibido_vn,
         s.recibido_precio_prom, s.adjudicado_vn, s.precio_corte, s.adjudicado_precio_prom, s.rendimiento_prom, s.rechazado_precio_prom, s.estado, s.revisar, v_doc, v_cap
  from _lote_sub s
  where not exists (select 1 from subastas_notas x where x.isin is not distinct from s.isin and x.fecha_subasta = s.fecha_subasta and x.plazo_anios is not distinct from s.plazo_anios);
  get diagnostics n_sub = row_count;

  -- Pendientes del conector (sin repetir los que siguen abiertos o ya se decidieron)
  for r in select * from jsonb_to_recordset(coalesce(p->'pendientes', '[]')) as x(referencia text, regla text, detalle text, propuesta text) loop
    insert into pendientes (fuente, documento, referencia, regla, detalle, propuesta)
    select v_fuente, v_doc, r.referencia, r.regla, r.detalle, r.propuesta
    where not exists (select 1 from pendientes x where x.fuente = v_fuente and x.referencia = r.referencia and x.regla = r.regla);
    if found then n_pend := n_pend + 1; end if;
  end loop;

  insert into estado_fuente (fuente, ultima_consulta, ultima_publicacion, ultima_observacion, ultimo_sha256, estado)
  values (v_fuente, v_cap, (d->>'fecha_publicacion')::date, (p->'resumen'->>'ultima_observacion')::date, d->>'sha256', 'al_dia')
  on conflict (fuente) do update set
    ultima_consulta = greatest(estado_fuente.ultima_consulta, excluded.ultima_consulta),
    ultima_publicacion = greatest(estado_fuente.ultima_publicacion, excluded.ultima_publicacion),
    ultima_observacion = greatest(estado_fuente.ultima_observacion, excluded.ultima_observacion),
    ultimo_sha256 = excluded.ultimo_sha256, estado = 'al_dia', fallos_seguidos = 0;

  drop table if exists _lote_obs; drop table if exists _lote_ult; drop table if exists _lote_sub;
  return jsonb_build_object('documento', v_doc, 'nuevas', n_nuevas, 'versiones', n_versiones, 'notas', n_notas, 'subastas', n_sub,
                            'subastas_distintas', n_sub_dif, 'pendientes', n_pend);
end $$;

-- Registra las corridas del índice (una fila de ejecuciones por documento) y el estado de cada fuente.
create or replace function mercado.registrar_corridas(idx jsonb) returns int
language plpgsql security definer set search_path = mercado, public as $$
declare c jsonb; x jsonb; n int := 0; res jsonb;
begin
  for c in select * from jsonb_array_elements(coalesce(idx->'corridas', '[]')) loop
    continue when exists (select 1 from lotes_aplicados where id = 'corrida:' || (c->>'id'));
    for x in select * from jsonb_array_elements(c->'resultados') loop
      continue when not exists (select 1 from fuentes where codigo = x->>'fuente');
      select resultado into res from lotes_aplicados where id = x->>'lote';
      insert into ejecuciones (fuente, inicio, fin, estado, nuevos, modificados, rechazados, origen, mensaje)
      values (x->>'fuente', (x->>'inicio')::timestamptz, (x->>'fin')::timestamptz,
              case x->>'estado' when 'exito' then 'exito' when 'sin_novedad' then 'sin_novedad' else 'fallo' end,
              coalesce((res->>'nuevas')::int + (res->>'subastas')::int, 0), coalesce((res->>'versiones')::int, 0), 0, 'programada',
              '[' || (x->>'documento') || '] ' || coalesce(x->>'mensaje', ''));
      n := n + 1;
    end loop;
    insert into lotes_aplicados (id, tipo, aplicado, resultado) values ('corrida:' || (c->>'id'), 'corrida', now(), jsonb_build_object('filas', jsonb_array_length(c->'resultados')));
  end loop;
  -- Estado por fuente: la peor situación de sus documentos
  update estado_fuente e set
    ultima_consulta = greatest(e.ultima_consulta, s.consulta),
    fallos_seguidos = s.fallos,
    estado = case when s.fallos > 0 then 'error' else 'al_dia' end
  from (select v->>'fuente' as fuente, max((v->>'ultima_consulta')::timestamptz) as consulta, max(coalesce((v->>'fallos_seguidos')::int, 0)) as fallos
        from jsonb_each(coalesce(idx->'estado', '{}')) t(k, v) group by 1) s
  where e.fuente = s.fuente;
  insert into estado_fuente (fuente, ultima_consulta, fallos_seguidos, estado)
  select v->>'fuente', max((v->>'ultima_consulta')::timestamptz), max(coalesce((v->>'fallos_seguidos')::int, 0)), 'error'
  from jsonb_each(coalesce(idx->'estado', '{}')) t(k, v)
  where exists (select 1 from fuentes f where f.codigo = v->>'fuente') and not exists (select 1 from estado_fuente e where e.fuente = v->>'fuente')
  group by 1 having max(coalesce((v->>'fallos_seguidos')::int, 0)) > 0;
  return n;
end $$;

-- Lee el índice publicado en GitHub y aplica lo que falte. Lo ejecuta pg_cron cada hora.
create or replace function mercado.sincronizar() returns jsonb
language plpgsql security definer set search_path = mercado, public, extensions as $$
declare
  base constant text := 'https://raw.githubusercontent.com/DylanVargas02/invierterd/main/mercado/lotes/';
  resp extensions.http_response;
  idx jsonb; l jsonb; txt text; res jsonb; aplicados int := 0; errores int := 0; corridas int;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '120');
  resp := extensions.http_get(base || 'indice.json');
  if resp.status <> 200 then raise exception 'Índice no disponible (HTTP %)', resp.status; end if;
  idx := resp.content::jsonb;
  for l in select * from jsonb_array_elements(coalesce(idx->'lotes', '[]')) loop
    continue when exists (select 1 from lotes_aplicados a where a.id = l->>'id' and (a.aplicado is not null or a.intentos >= 3));
    begin
      resp := extensions.http_get(base || (l->>'archivo'));
      if resp.status <> 200 then raise exception 'Lote no disponible (HTTP %)', resp.status; end if;
      txt := resp.content;
      if encode(extensions.digest(convert_to(txt, 'UTF8'), 'sha256'), 'hex') <> l->>'sha256' then
        raise exception 'La huella del lote no coincide con el índice';
      end if;
      res := mercado.aplicar_lote(txt::jsonb);
      insert into lotes_aplicados (id, tipo, fuente, sha256, aplicado, resultado) values (l->>'id', 'lote', l->>'fuente', l->>'sha256', now(), res)
      on conflict (id) do update set aplicado = now(), resultado = excluded.resultado, intentos = lotes_aplicados.intentos + 1;
      aplicados := aplicados + 1;
    exception when others then
      insert into lotes_aplicados (id, tipo, fuente, sha256, resultado) values (l->>'id', 'lote', l->>'fuente', l->>'sha256', jsonb_build_object('error', sqlerrm))
      on conflict (id) do update set intentos = lotes_aplicados.intentos + 1, resultado = excluded.resultado;
      insert into ejecuciones (fuente, inicio, fin, estado, origen, mensaje)
      values (coalesce(l->>'fuente', 'manual'), now(), now(), 'fallo', 'programada', 'No se pudo aplicar el lote ' || (l->>'id') || ': ' || sqlerrm);
      errores := errores + 1;
    end;
  end loop;
  corridas := mercado.registrar_corridas(idx);
  return jsonb_build_object('lotes_aplicados', aplicados, 'errores', errores, 'ejecuciones', corridas, 'indice', idx->>'actualizado');
end $$;

revoke all on function mercado.aplicar_lote(jsonb), mercado.registrar_corridas(jsonb), mercado.sincronizar() from public, anon, authenticated;

-- Cada hora, al minuto 40 (las corridas de GitHub empiezan al minuto 15)
select cron.unschedule(jobid) from cron.job where jobname = 'caoba-mercado-sincronizar';
select cron.schedule('caoba-mercado-sincronizar', '40 * * * *', $$select mercado.sincronizar()$$);
