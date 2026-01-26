-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES TABLE (Linked to auth.users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text unique not null,
  full_name text,
  balance decimal(10, 2) default 0.00 not null,
  avatar_url text,
  updated_at timestamp with time zone,
  
  constraint username_length check (char_length(full_name) >= 3)
);

-- RLS for Profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- PRODUCTS TABLE
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  price_epicoin decimal(10, 2) not null,
  stock_quantity integer default 0 not null,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Products
alter table public.products enable row level security;

create policy "Products are viewable by everyone."
  on products for select
  using ( true );

create policy "Only admins can insert/update/delete products."
  on products for all
  using ( auth.email() like '%@epitech.digital' ); -- Simple admin check for now, ideally use roles

-- TRANSACTIONS TABLE
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references public.profiles(id),
  receiver_id uuid references public.profiles(id),
  amount decimal(10, 2) not null,
  type text check (type in ('topup', 'purchase', 'transfer')) not null,
  status text check (status in ('pending', 'completed', 'failed')) default 'pending' not null,
  metadata jsonb, -- Store Stripe ID, Product ID, etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Transactions
alter table public.transactions enable row level security;

create policy "Users can view their own transactions."
  on transactions for select
  using ( auth.uid() = sender_id or auth.uid() = receiver_id );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
