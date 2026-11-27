-- Caoba v3 · mensajes de soporte. Cualquiera puede escribir; solo el administrador lee y cambia el estado.
create table if not exists public.support_tickets (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('error','sugerencia','consulta','cuenta')),
  subject text check (char_length(subject) <= 120),
  body text not null check (char_length(body) between 10 and 4000),
  contact text check (contact is null or (char_length(contact) <= 254 and contact ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  user_id uuid default auth.uid(),
  tech jsonb check (tech is null or (jsonb_typeof(tech) = 'object' and pg_column_size(tech) < 1500)),
  status text not null default 'nuevo' check (status in ('nuevo','en_revision','resuelto'))
);
create index if not exists support_tickets_created on public.support_tickets (created_at desc);
alter table public.support_tickets enable row level security;
drop policy if exists "escribir soporte" on public.support_tickets;
create policy "escribir soporte" on public.support_tickets for insert to anon, authenticated
  with check (status = 'nuevo' and (user_id is null or user_id = auth.uid()) and created_at > now() - interval '5 minutes');
drop policy if exists "admin lee soporte" on public.support_tickets;
create policy "admin lee soporte" on public.support_tickets for select to authenticated using (public.is_admin());
drop policy if exists "admin cambia estado" on public.support_tickets;
create policy "admin cambia estado" on public.support_tickets for update to authenticated using (public.is_admin()) with check (public.is_admin());
select count(*) as mensajes from public.support_tickets;
