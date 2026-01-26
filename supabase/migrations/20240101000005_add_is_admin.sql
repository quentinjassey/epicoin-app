-- Add is_admin column to profiles
alter table public.profiles
add column if not exists is_admin boolean default false not null;
-- Add created_at column to profiles (if not exists)
alter table public.profiles
add column if not exists created_at timestamp with time zone default timezone('utc'::text, now());
-- Update handle_new_user function to include campus
create or replace function public.handle_new_user() returns trigger as $$ begin
insert into public.profiles (
        id,
        email,
        full_name,
        campus,
        is_admin,
        created_at
    )
values (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        coalesce(new.raw_user_meta_data->>'campus', 'Paris'),
        false,
        now()
    );
return new;
end;
$$ language plpgsql security definer;
-- Allow admins to view all transactions
drop policy if exists "Users can view their own transactions." on transactions;
create policy "Users can view their own transactions." on transactions for
select using (
        auth.uid() = sender_id
        or auth.uid() = receiver_id
        or exists (
            select 1
            from profiles
            where id = auth.uid()
                and is_admin = true
        )
    );
-- Update transactions type check to include 'top_up'
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions
add constraint transactions_type_check check (
        type in (
            'topup',
            'top_up',
            'purchase',
            'payment',
            'transfer'
        )
    );
-- Update transactions status check to include 'pending_review'
alter table public.transactions drop constraint if exists transactions_status_check;
alter table public.transactions
add constraint transactions_status_check check (
        status in (
            'pending',
            'pending_review',
            'completed',
            'failed'
        )
    );
