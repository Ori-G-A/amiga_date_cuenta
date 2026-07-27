-- Tabla mínima key-value que usa src/storage.js.
-- Sin auth de usuarios: cada persona que use el link comparte los mismos dos registros
-- (uno por STORAGE_KEY). Suficiente para uso personal de una sola persona.
create table if not exists kv (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table kv enable row level security;

-- ponytail: RLS abierta a anon porque no hay login; si esto pasa a multiusuario,
-- añadir columna user_id + policy por auth.uid().
create policy "anon read/write kv" on kv
  for all
  to anon
  using (true)
  with check (true);
