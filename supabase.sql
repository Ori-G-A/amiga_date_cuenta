-- Tabla key-value que usa src/storage.js. Va en el MISMO proyecto Supabase del becario:
-- no interfiere con sus tablas ni con su login por PIN, que es un mecanismo aparte.
--
-- Si ya habías corrido la versión vieja de este archivo (kv con primary key en `key`
-- y policy abierta a anon), borrala antes:  drop table kv;

create table if not exists kv (
  user_id uuid not null references auth.users on delete cascade,
  key text not null,
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table kv enable row level security;

-- Cada usuario ve y escribe solo sus filas. Sin sesión iniciada no se lee ni se escribe nada:
-- la anon key viaja en el bundle público, así que la policy es la única defensa real.
create policy "kv propio" on kv
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
