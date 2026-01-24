-- Migration: Add waste tracking and purchase recommendations
-- Run this in the Supabase SQL Editor after the initial schema

-- Waste events table - tracks when ingredients expire or get wasted
create table if not exists waste_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  ingredient_name text not null,
  quantity real,
  unit text,
  event_type text not null check (event_type in ('expired', 'discarded', 'used')),
  original_purchase_date timestamp with time zone,
  waste_date timestamp with time zone default timezone('utc'::text, now()) not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Purchase recommendations table - stores AI-generated shopping advice
create table if not exists purchase_recommendations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  ingredient_name text not null,
  recommendation_type text not null check (recommendation_type in ('reduce', 'skip', 'substitute', 'freeze', 'buy_less')),
  waste_frequency real, -- e.g., 0.75 = wasted 3 out of 4 times
  total_occurrences int default 0,
  wasted_occurrences int default 0,
  suggestion text not null,
  substitute_with text,
  is_active boolean default true,
  is_dismissed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- User shopping insights - aggregated stats
create table if not exists shopping_insights (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  total_waste_events int default 0,
  most_wasted_items jsonb default '[]'::jsonb, -- [{ name, count, frequency }]
  total_savings_potential real default 0, -- estimated money saved by following recommendations
  insight_summary text,
  last_analyzed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table waste_events enable row level security;
alter table purchase_recommendations enable row level security;
alter table shopping_insights enable row level security;

-- Policies for waste_events
create policy "Users can view their own waste events"
  on waste_events for select
  using (auth.uid() = user_id);

create policy "Users can insert their own waste events"
  on waste_events for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own waste events"
  on waste_events for update
  using (auth.uid() = user_id);

create policy "Users can delete their own waste events"
  on waste_events for delete
  using (auth.uid() = user_id);

-- Policies for purchase_recommendations
create policy "Users can view their own recommendations"
  on purchase_recommendations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own recommendations"
  on purchase_recommendations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own recommendations"
  on purchase_recommendations for update
  using (auth.uid() = user_id);

create policy "Users can delete their own recommendations"
  on purchase_recommendations for delete
  using (auth.uid() = user_id);

-- Policies for shopping_insights
create policy "Users can view their own insights"
  on shopping_insights for select
  using (auth.uid() = user_id);

create policy "Users can insert their own insights"
  on shopping_insights for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own insights"
  on shopping_insights for update
  using (auth.uid() = user_id);

-- Create indexes for better performance
create index if not exists idx_waste_events_user_id on waste_events(user_id);
create index if not exists idx_waste_events_ingredient on waste_events(ingredient_name);
create index if not exists idx_waste_events_date on waste_events(waste_date);
create index if not exists idx_recommendations_user_id on purchase_recommendations(user_id);
create index if not exists idx_recommendations_active on purchase_recommendations(user_id, is_active) where is_active = true;
create index if not exists idx_shopping_insights_user_id on shopping_insights(user_id);

-- Function to automatically create waste events when ingredients are deleted past expiry
create or replace function track_ingredient_deletion()
returns trigger as $$
begin
  -- Only track as waste if ingredient had expired or was close to expiring
  if old.expiry_date is not null and old.expiry_date < timezone('utc'::text, now()) then
    insert into waste_events (user_id, ingredient_name, quantity, unit, event_type, original_purchase_date, waste_date)
    values (old.user_id, old.name, old.quantity, old.unit, 'expired', old.created_at, timezone('utc'::text, now()));
  end if;
  return old;
end;
$$ language plpgsql security definer;

-- Trigger to track waste when ingredients are deleted
create or replace trigger on_ingredient_deleted
  before delete on ingredients
  for each row execute function track_ingredient_deletion();

-- Function to analyze waste patterns and generate recommendations
create or replace function analyze_waste_patterns(target_user_id uuid)
returns table (
  ingredient_name text,
  waste_count bigint,
  total_count bigint,
  waste_frequency numeric
) as $$
begin
  return query
  select 
    we.ingredient_name,
    count(*) filter (where we.event_type in ('expired', 'discarded')) as waste_count,
    count(*) as total_count,
    round(
      count(*) filter (where we.event_type in ('expired', 'discarded'))::numeric / 
      count(*)::numeric, 
      2
    ) as waste_frequency
  from waste_events we
  where we.user_id = target_user_id
    and we.waste_date >= now() - interval '30 days'
  group by we.ingredient_name
  having count(*) >= 3
    and count(*) filter (where we.event_type in ('expired', 'discarded'))::numeric / count(*)::numeric >= 0.5
  order by waste_frequency desc, waste_count desc;
end;
$$ language plpgsql security definer;
