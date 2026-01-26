create or replace function transfer_epicoin(
  receiver_email text,
  amount numeric
) returns json as $$
declare
  sender_id uuid;
  receiver_id uuid;
  sender_balance numeric;
  tx_id uuid;
begin
  -- Get sender ID from auth context
  sender_id := auth.uid();
  
  -- Check if amount is positive
  if amount <= 0 then
    return json_build_object('success', false, 'message', 'Amount must be positive');
  end if;

  -- Get receiver ID from email
  select id into receiver_id from profiles where email = receiver_email;
  
  if receiver_id is null then
    return json_build_object('success', false, 'message', 'User not found');
  end if;

  if receiver_id = sender_id then
    return json_build_object('success', false, 'message', 'Cannot send money to yourself');
  end if;

  -- Check sender balance
  select balance into sender_balance from profiles where id = sender_id;
  
  if sender_balance < amount then
    return json_build_object('success', false, 'message', 'Insufficient funds');
  end if;

  -- Perform transfer (atomic)
  update profiles set balance = balance - amount where id = sender_id;
  update profiles set balance = balance + amount where id = receiver_id;

  -- Record transaction
  insert into transactions (sender_id, receiver_id, amount, type, status, metadata)
  values (sender_id, receiver_id, amount, 'transfer', 'completed', json_build_object('receiver_email', receiver_email))
  returning id into tx_id;

  return json_build_object('success', true, 'message', 'Transfer successful', 'transaction_id', tx_id);
exception when others then
  return json_build_object('success', false, 'message', SQLERRM);
end;
$$ language plpgsql security definer;
