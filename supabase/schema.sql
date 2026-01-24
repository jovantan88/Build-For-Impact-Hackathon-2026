-- Supabase Schema for E-Fridge App
-- Run this in the Supabase SQL Editor

-- Receipts table
create table if not exists receipts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  image_url text,
  raw_text text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ingredients table
create table if not exists ingredients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  receipt_id uuid references receipts(id) on delete set null,
  name text not null,
  quantity real,
  unit text,
  expiry_date timestamp with time zone,
  image_url text,
  image_status text default 'pending' check (image_status in ('pending', 'generating', 'ready')),
  is_pantry_staple boolean default false,
  is_excluded boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Pantry staples table
create table if not exists pantry_staples (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  is_enabled boolean default true
);

-- Enable Row Level Security
alter table receipts enable row level security;
alter table ingredients enable row level security;
alter table pantry_staples enable row level security;

-- Policies for receipts
create policy "Users can view their own receipts"
  on receipts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own receipts"
  on receipts for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own receipts"
  on receipts for delete
  using (auth.uid() = user_id);

-- Policies for ingredients
create policy "Users can view their own ingredients"
  on ingredients for select
  using (auth.uid() = user_id);

create policy "Users can insert their own ingredients"
  on ingredients for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own ingredients"
  on ingredients for update
  using (auth.uid() = user_id);

create policy "Users can delete their own ingredients"
  on ingredients for delete
  using (auth.uid() = user_id);

-- Policies for pantry_staples
create policy "Users can view their own pantry staples"
  on pantry_staples for select
  using (auth.uid() = user_id);

create policy "Users can insert their own pantry staples"
  on pantry_staples for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own pantry staples"
  on pantry_staples for update
  using (auth.uid() = user_id);

create policy "Users can delete their own pantry staples"
  on pantry_staples for delete
  using (auth.uid() = user_id);

-- Function to create default pantry staples for new users
create or replace function create_default_pantry_staples()
returns trigger as $$
begin
  insert into pantry_staples (user_id, name, is_enabled) values
    (new.id, 'Salt', true),
    (new.id, 'Pepper', true),
    (new.id, 'Sugar', true),
    (new.id, 'Rice', true),
    (new.id, 'Cooking oil', true),
    (new.id, 'Soy sauce', true),
    (new.id, 'Fish sauce', true),
    (new.id, 'Oyster sauce', true),
    (new.id, 'Sesame oil', true),
    (new.id, 'Garlic', true),
    (new.id, 'Onion', true),
    (new.id, 'Ginger', true),
    (new.id, 'Chili', true),
    (new.id, 'Vinegar', true),
    (new.id, 'Coconut milk', true),
    (new.id, 'Curry powder', true),
    (new.id, 'Turmeric', true),
    (new.id, 'Cumin', true),
    (new.id, 'Coriander', true),
    (new.id, 'Lemongrass', true);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create default pantry staples when a new user signs up
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function create_default_pantry_staples();

-- Create indexes for better performance
create index if not exists idx_ingredients_user_id on ingredients(user_id);
create index if not exists idx_ingredients_expiry on ingredients(expiry_date);
create index if not exists idx_pantry_staples_user_id on pantry_staples(user_id);
create index if not exists idx_receipts_user_id on receipts(user_id);
