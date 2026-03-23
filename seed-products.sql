-- Seed products for EpiPay shop
-- Run this in Supabase Dashboard > SQL Editor

INSERT INTO products (name, description, price_epicoin, stock_quantity, category) VALUES
-- Boissons
('Cafe Expresso', 'Expresso court intense', 2.50, 100, 'Boissons'),
('Cafe Latte', 'Cafe au lait onctueux', 3.50, 100, 'Boissons'),
('The / Infusion', 'The vert, noir ou infusion', 2.00, 100, 'Boissons'),
('Coca-Cola', 'Canette 33cl', 2.50, 80, 'Boissons'),
('Red Bull', 'Canette energisante 25cl', 4.00, 60, 'Boissons'),
('Jus d''Orange', 'Jus frais 25cl', 3.00, 50, 'Boissons'),
('Bouteille d''Eau', 'Eau minerale 50cl', 1.00, 200, 'Boissons'),
-- Snacks
('Croissant', 'Croissant pur beurre', 2.00, 40, 'Snacks'),
('Pain au Chocolat', 'Viennoiserie classique', 2.50, 40, 'Snacks'),
('Cookie', 'Cookie aux pepites de chocolat', 2.00, 50, 'Snacks'),
('Barre de Cereales', 'Barre energetique', 1.50, 80, 'Snacks'),
('Chips', 'Sachet individuel', 1.50, 60, 'Snacks'),
('Sandwich Jambon-Beurre', 'Pain frais, jambon, beurre', 5.00, 30, 'Snacks'),
('Wrap Poulet', 'Wrap poulet crudites sauce', 6.00, 25, 'Snacks'),
-- Repas
('Pizza Margherita', 'Pizza tomate mozzarella basilic', 8.00, 20, 'Repas'),
('Salade Cesar', 'Salade poulet parmesan croutons', 7.00, 20, 'Repas'),
('Pates Bolognaise', 'Pates sauce bolognaise maison', 7.50, 25, 'Repas'),
('Burger Classic', 'Steak, salade, tomate, oignon', 9.00, 20, 'Repas'),
('Bowl Poke', 'Riz, saumon, avocat, edamame', 10.00, 15, 'Repas'),
-- Fournitures
('Stickers Epitech', 'Pack de 5 stickers', 3.00, 100, 'Fournitures'),
('Cable USB-C', 'Cable charge et data 1m', 8.00, 30, 'Fournitures'),
('Adaptateur HDMI', 'USB-C vers HDMI', 15.00, 20, 'Fournitures'),
('Souris Filaire', 'Souris USB basique', 10.00, 15, 'Fournitures'),
('Carnet de Notes', 'Carnet A5 pages blanches', 4.00, 50, 'Fournitures'),
-- Goodies
('T-shirt Epitech', 'T-shirt officiel noir', 25.00, 40, 'Goodies'),
('Hoodie Epitech', 'Sweat a capuche officiel', 50.00, 25, 'Goodies'),
('Mug EpiPay', 'Mug ceramique logo EpiPay', 12.00, 30, 'Goodies'),
('Tote Bag Epitech', 'Sac en toile reutilisable', 8.00, 50, 'Goodies'),
('Place Soiree BDE', 'Entree pour la prochaine soiree', 30.00, 100, 'Goodies');
