-- Funil Waz Quiz — schema completo
-- Aplicado no projeto Supabase "waz-quiz" (yiccjupbhruomiymzyiw)

create table if not exists sessoes (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  lead_id text not null,
  utm jsonb,
  user_agent text,
  referrer text,
  pagina text,
  largura int,
  ip text,
  pais text
);

create table if not exists eventos (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  sessao_id uuid references sessoes(id) on delete set null,
  lead_id text,
  tipo text not null,          -- inicio | tela | resposta | dados | resultado | investimento | agendou | fim
  tela text,
  etapa int,
  pergunta text,
  resposta text,
  extra jsonb
);

create table if not exists leads (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  lead_id text not null unique,
  sessao_id uuid,
  nome text,
  email text,
  whatsapp text,
  respostas jsonb,
  utm jsonb,
  investimento text,           -- sim | nao
  agendou boolean not null default false,
  agendamento_em timestamptz,
  agendamento_quando text,
  pais text
);

create table if not exists admins (
  email text primary key
);

insert into admins (email) values ('yuri.moreira@innerai.com')
  on conflict do nothing;

-- indices para o dashboard
create index if not exists eventos_sessao_idx on eventos (sessao_id);
create index if not exists eventos_criado_idx on eventos (criado_em);
create index if not exists sessoes_criado_idx on sessoes (criado_em);
create index if not exists leads_criado_idx on leads (criado_em);

-- RLS: anon não lê nem escreve nada (a Edge Function usa service role);
-- admins autenticados por magic-link leem tudo.
alter table sessoes enable row level security;
alter table eventos enable row level security;
alter table leads   enable row level security;
alter table admins  enable row level security;

create policy "admin le sessoes" on sessoes for select to authenticated
  using (exists (select 1 from admins a where a.email = (auth.jwt() ->> 'email')));

create policy "admin le eventos" on eventos for select to authenticated
  using (exists (select 1 from admins a where a.email = (auth.jwt() ->> 'email')));

create policy "admin le leads" on leads for select to authenticated
  using (exists (select 1 from admins a where a.email = (auth.jwt() ->> 'email')));

create policy "admin le admins" on admins for select to authenticated
  using (email = (auth.jwt() ->> 'email'));
