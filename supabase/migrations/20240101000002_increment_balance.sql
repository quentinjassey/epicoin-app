create or replace function increment_balance(
  user_id uuid,
  amount_to_add numeric
) returns void as $$
begin
  update profiles
  set balance = balance + amount_to_add
  where id = user_id;
end;
$$ language plpgsql security definer;
