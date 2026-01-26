create or replace function decrement_balance(
  user_id uuid,
  amount_to_subtract numeric
) returns void as $$
begin
  update profiles
  set balance = balance - amount_to_subtract
  where id = user_id;
end;
$$ language plpgsql security definer;
