create extension if not exists pgcrypto;

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  birth_date date,
  contact_phone text,
  email text not null unique,
  completed_services text[] not null default '{}',
  important_notes text,
  seasonal_pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  password_salt text not null,
  role text not null check (role in ('client', 'owner')),
  client_id uuid references clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists client_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  title text,
  image_url text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists client_pinterest_selections (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  pin_url text not null,
  title text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists birthday_notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  notification_type text not null check (notification_type in ('daily', 'weekly')),
  notification_date date not null,
  sent_at timestamptz not null default now(),
  unique (client_id, notification_type, notification_date)
);

create index if not exists idx_app_users_client_id on app_users(client_id);
create index if not exists idx_client_photos_client_id on client_photos(client_id);
create index if not exists idx_pinterest_client_id on client_pinterest_selections(client_id);
create index if not exists idx_clients_birth_date on clients(birth_date);
create index if not exists idx_birthday_notifications_client_id on birthday_notifications(client_id);
