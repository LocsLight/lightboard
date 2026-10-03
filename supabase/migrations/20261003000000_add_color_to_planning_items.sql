alter table public.planning_items
add column if not exists color text not null default '#ffffff';
