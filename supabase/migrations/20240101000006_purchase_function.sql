-- Add category column to products
alter table public.products
add column if not exists category text default 'Autres';
-- Create purchase_product function
create or replace function purchase_product(product_id uuid, qty integer default 1) returns json as $$
declare buyer_id uuid;
buyer_balance numeric;
product_price numeric;
product_stock integer;
product_name text;
total_price numeric;
tx_id uuid;
begin -- Get buyer ID from auth context
buyer_id := auth.uid();
if buyer_id is null then return json_build_object(
    'success',
    false,
    'message',
    'Utilisateur non authentifié'
);
end if;
-- Validate quantity
if qty <= 0 then return json_build_object(
    'success',
    false,
    'message',
    'La quantité doit être positive'
);
end if;
-- Get product info
select price_epicoin,
    stock_quantity,
    name into product_price,
    product_stock,
    product_name
from products
where id = product_id;
if product_price is null then return json_build_object(
    'success',
    false,
    'message',
    'Produit introuvable'
);
end if;
-- Check stock
if product_stock < qty then return json_build_object('success', false, 'message', 'Stock insuffisant');
end if;
-- Calculate total
total_price := product_price * qty;
-- Get buyer balance
select balance into buyer_balance
from profiles
where id = buyer_id;
if buyer_balance < total_price then return json_build_object('success', false, 'message', 'Solde insuffisant');
end if;
-- Perform purchase (atomic)
-- 1. Deduct balance
update profiles
set balance = balance - total_price
where id = buyer_id;
-- 2. Decrease stock
update products
set stock_quantity = stock_quantity - qty
where id = product_id;
-- 3. Record transaction
insert into transactions (
        sender_id,
        receiver_id,
        amount,
        type,
        status,
        metadata
    )
values (
        buyer_id,
        null,
        -- No receiver for purchases
        total_price,
        'payment',
        'completed',
        json_build_object(
            'product_id',
            product_id,
            'product_name',
            product_name,
            'quantity',
            qty,
            'unit_price',
            product_price
        )
    )
returning id into tx_id;
return json_build_object(
    'success',
    true,
    'message',
    'Achat réussi',
    'transaction_id',
    tx_id,
    'product_name',
    product_name,
    'quantity',
    qty,
    'total_price',
    total_price
);
exception
when others then return json_build_object('success', false, 'message', SQLERRM);
end;
$$ language plpgsql security definer;
-- Grant execute permission to authenticated users
grant execute on function purchase_product(uuid, integer) to authenticated;
-- Insert some sample products (optional - for testing)
-- INSERT INTO products (name, description, price_epicoin, stock_quantity, category) VALUES
-- ('Café', 'Café chaud fraîchement préparé', 1.50, 100, 'Boissons'),
-- ('Croissant', 'Croissant au beurre', 2.00, 50, 'Snacks'),
-- ('Sandwich Jambon', 'Sandwich jambon-beurre', 4.50, 30, 'Repas'),
-- ('Coca-Cola', 'Canette 33cl', 2.00, 80, 'Boissons'),
-- ('Stylo', 'Stylo bille bleu', 1.00, 200, 'Fournitures');
