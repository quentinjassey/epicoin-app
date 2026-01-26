-- Add campus column to profiles
alter table public.profiles 
add column if not exists campus text default 'Paris' not null;

-- Create fraud_alerts table
create table if not exists public.fraud_alerts (
  id uuid default uuid_generate_v4() primary key,
  transaction_id uuid references public.transactions(id),
  risk_score integer not null,
  reason text not null,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for fraud_alerts
alter table public.fraud_alerts enable row level security;

create policy "Admins can view all fraud alerts"
  on fraud_alerts for select
  using ( auth.email() like '%@epitech.digital' );

create policy "Admins can update fraud alerts"
  on fraud_alerts for update
  using ( auth.email() like '%@epitech.digital' );

-- Add scope to transactions
alter table public.transactions
add column if not exists scope text check (scope in ('intra_campus', 'inter_campus')) default 'intra_campus';

-- Update transfer_epicoin function
create or replace function transfer_epicoin(
  receiver_email text,
  amount numeric
) returns json as $$
declare
  sender_id uuid;
  receiver_id uuid;
  sender_balance numeric;
  sender_campus text;
  receiver_campus text;
  tx_id uuid;
  tx_scope text;
  is_fraud boolean := false;
  fraud_reason text := '';
begin
  -- Get sender ID from auth context
  sender_id := auth.uid();
  
  -- Check if amount is positive
  if amount <= 0 then
    return json_build_object('success', false, 'message', 'Amount must be positive');
  end if;

  -- Get receiver ID and campus
  select id, campus into receiver_id, receiver_campus from profiles where email = receiver_email;
  
  if receiver_id is null then
    return json_build_object('success', false, 'message', 'User not found');
  end if;

  if receiver_id = sender_id then
    return json_build_object('success', false, 'message', 'Cannot send money to yourself');
  end if;

  -- Get sender balance and campus
  select balance, campus into sender_balance, sender_campus from profiles where id = sender_id;
  
  if sender_balance < amount then
    return json_build_object('success', false, 'message', 'Insufficient funds');
  end if;

  -- Determine scope
  if sender_campus = receiver_campus then
    tx_scope := 'intra_campus';
  else
    tx_scope := 'inter_campus';
  end if;

  -- Fraud Detection Rule 1: High Amount (> 1000)
  if amount > 1000 then
    is_fraud := true;
    fraud_reason := 'High amount transaction (> 1000 EPC)';
  end if;

  -- If fraud detected, create pending transaction and alert
  if is_fraud then
    -- Insert pending transaction
    insert into transactions (sender_id, receiver_id, amount, type, status, metadata, scope)
    values (sender_id, receiver_id, amount, 'transfer', 'pending', json_build_object('receiver_email', receiver_email, 'fraud_reason', fraud_reason), tx_scope)
    returning id into tx_id;

    -- Create fraud alert
    insert into fraud_alerts (transaction_id, risk_score, reason, status)
    values (tx_id, 80, fraud_reason, 'pending');

    return json_build_object('success', true, 'message', 'Transaction flagged for security review', 'status', 'pending_review');
  end if;

  -- Normal Transfer (Atomic)
  update profiles set balance = balance - amount where id = sender_id;
  update profiles set balance = balance + amount where id = receiver_id;

  -- Record transaction
  insert into transactions (sender_id, receiver_id, amount, type, status, metadata, scope)
  values (sender_id, receiver_id, amount, 'transfer', 'completed', json_build_object('receiver_email', receiver_email), tx_scope)
  returning id into tx_id;

  return json_build_object('success', true, 'message', 'Transfer successful', 'transaction_id', tx_id, 'scope', tx_scope);
exception when others then
  return json_build_object('success', false, 'message', SQLERRM);
end;
$$ language plpgsql security definer;
