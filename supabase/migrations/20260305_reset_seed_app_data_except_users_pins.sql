-- Reset and re-seed app data while preserving users + PIN auth
-- SAFE GUARANTEE:
--   - keeps auth.users untouched
--   - keeps public.profiles untouched
--   - keeps public.user_pins untouched
--
-- Run in Supabase SQL Editor when you want a clean operational database
-- (orders/menu/tables/inventory/accounting/etc reset to baseline defaults).

begin;

truncate table
  public.payments,
  public.orders,
  public.accounting_journal_lines,
  public.accounting_journal_entries,
  public.accounting_accounts,
  public.shifts,
  public.customers,
  public.discounts,
  public.recipes,
  public.vendor_bills,
  public.goods_receipts,
  public.purchase_orders,
  public.purchase_requisitions,
  public.vendors,
  public.inventory_movements,
  public.inventory_stock_levels,
  public.inventory_items,
  public.waitlist,
  public.reservations,
  public.restaurant_tables,
  public.sections,
  public.menu_items,
  public.menu_categories,
  public.zones,
  public.outlets,
  public.hotels,
  public.app_state
restart identity cascade;

-- ---------------------------------------------------------------------------
-- Core org structure
-- ---------------------------------------------------------------------------
insert into public.hotels (id, name, timezone)
values ('restaurant-1', 'Hestia Restaurant', 'Africa/Nairobi');

insert into public.outlets (id, hotel_id, name, outlet_type, pricing_rules)
values ('outlet-1', 'restaurant-1', 'Main Outlet', 'restaurant', '[]'::jsonb);

insert into public.zones (id, outlet_id, name, zone_type)
values
  ('zone-main-hall', 'outlet-1', 'Main Hall', 'dine-in'),
  ('zone-patio', 'outlet-1', 'Patio', 'dine-in'),
  ('zone-vip', 'outlet-1', 'VIP Lounge', 'vip'),
  ('zone-bar', 'outlet-1', 'Bar Counter', 'bar'),
  ('zone-private', 'outlet-1', 'Private Dining', 'private');

-- ---------------------------------------------------------------------------
-- Menu baseline
-- ---------------------------------------------------------------------------
insert into public.menu_categories (id, name, description, icon, color, display_order, active)
values
  ('cat-1', 'Signatures', 'Chef''s specialty dishes', '⭐', '#D97706', 1, true),
  ('cat-2', 'Vegetarian', 'Fasting & plant-based plates', '🌿', '#16A34A', 2, true),
  ('cat-3', 'Bar Drinks', 'Beer, wine, cocktails, mocktails & spirits', '🍺', '#2563EB', 3, true),
  ('cat-4', 'Coffee & Tea', 'Ethiopian coffee ceremony & hot beverages', '☕', '#78350F', 4, true),
  ('cat-5', 'Breakfast', 'Morning favorites and egg dishes', '🍳', '#F59E0B', 5, true),
  ('cat-6', 'Soups & Starters', 'Warm soups and light starters', '🥣', '#F97316', 6, true),
  ('cat-7', 'Desserts', 'Cakes, ice cream and sweets', '🍰', '#EC4899', 7, true),
  ('cat-8', 'Sega Bet', 'Raw and grilled beef specialities', '🥩', '#B91C1C', 8, true);

insert into public.menu_items (
  id, category_id, name, sku, description, price, tax_category, prep_time,
  stations, allergens, modifiers, image_url, video_url, available, archived,
  sold_by_weight, uom, price_per_kilo
)
values
  (
    '1', 'cat-1', 'Doro Wat', 'SIG-001',
    'Spiced chicken stew with berbere, served with injera',
    220, 'vat', 25,
    '["Stove"]'::jsonb, '["eggs"]'::jsonb, '[]'::jsonb,
    'https://images.pexels.com/photos/675951/pexels-photo-675951.jpeg', '',
    true, false, false, 'unit', null
  ),
  (
    '2', 'cat-1', 'Tibs', 'SIG-002',
    'Sautéed beef or lamb with rosemary, peppers, and onions',
    280, 'vat', 20,
    '["Stove"]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    'https://images.pexels.com/photos/1438672/pexels-photo-1438672.jpeg', '',
    true, false, false, 'unit', null
  ),
  (
    '4', 'cat-2', 'Shiro', 'VEG-001',
    'Chickpea or broad bean powder stew with berbere',
    95, 'none', 15,
    '["Stove"]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    'https://images.pexels.com/photos/1640770/pexels-photo-1640770.jpeg', '',
    true, false, false, 'unit', null
  ),
  (
    '5', 'cat-2', 'Beyainatu', 'VEG-002',
    'Fasting platter with lentils, cabbage, collard greens, and more',
    150, 'none', 12,
    '["Stove"]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    'https://images.pexels.com/photos/3298183/pexels-photo-3298183.jpeg', '',
    true, false, false, 'unit', null
  ),
  (
    '7', 'cat-3', 'Tej', 'BEV-001',
    'Ethiopian honey wine, fermented gesho',
    90, 'to', 2,
    '["Bar"]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    'https://images.pexels.com/photos/5531526/pexels-photo-5531526.jpeg', '',
    true, false, false, 'unit', null
  ),
  (
    '8', 'cat-4', 'Ethiopian Coffee', 'COF-001',
    'Traditional buna, roasted and brewed in jebena',
    65, 'none', 8,
    '["Bar"]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    'https://images.pexels.com/photos/1362534/pexels-photo-1362534.jpeg', '',
    true, false, false, 'unit', null
  ),
  (
    '11', 'cat-5', 'Egg Firfir', 'BRK-001',
    'Shredded injera with scrambled eggs and berbere butter',
    140, 'none', 12,
    '["Stove"]'::jsonb, '["eggs", "gluten"]'::jsonb, '[]'::jsonb,
    '', '',
    true, false, false, 'unit', null
  ),
  (
    '12', 'cat-5', 'Chechebsa', 'BRK-002',
    'Pan-fried flatbread pieces with niter kibbeh and berbere',
    130, 'none', 15,
    '["Stove"]'::jsonb, '["gluten", "dairy"]'::jsonb, '[]'::jsonb,
    '', '',
    true, false, false, 'unit', null
  ),
  (
    '13', 'cat-6', 'Yater Kik Alicha', 'SUP-001',
    'Mild split pea soup with turmeric and ginger',
    95, 'none', 14,
    '["Stove"]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '', '',
    true, false, false, 'unit', null
  ),
  (
    '14', 'cat-6', 'Sambusa Trio', 'SUP-002',
    'Crispy sambusa filled with lentils, beef and spinach',
    120, 'vat', 10,
    '["Stove"]'::jsonb, '["gluten"]'::jsonb, '[]'::jsonb,
    '', '',
    true, false, false, 'unit', null
  ),
  (
    '15', 'cat-7', 'Baklava Bites', 'DES-001',
    'Honey layered pastry with crushed nuts',
    90, 'vat', 6,
    '["Bakery / Pastry"]'::jsonb, '["gluten", "nuts"]'::jsonb, '[]'::jsonb,
    '', '',
    true, false, false, 'unit', null
  ),
  (
    '16', 'cat-7', 'Vanilla Ice Cream', 'DES-002',
    'Two scoops vanilla ice cream with chocolate drizzle',
    85, 'vat', 3,
    '["Cold / Salad"]'::jsonb, '["dairy"]'::jsonb, '[]'::jsonb,
    '', '',
    true, false, false, 'unit', null
  ),
  (
    '17', 'cat-3', 'St. George Beer', 'BAR-001',
    'Classic Ethiopian lager served chilled (330ml)',
    85, 'to', 2,
    '["Bar"]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '', '',
    true, false, false, 'unit', null
  ),
  (
    '18', 'cat-3', 'Red House Wine', 'BAR-002',
    'Dry red house wine by glass',
    140, 'to', 2,
    '["Bar"]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '', '',
    true, false, false, 'unit', null
  ),
  (
    '19', 'cat-3', 'Mojito', 'BAR-003',
    'Lime, mint, soda and white rum',
    190, 'to', 4,
    '["Bar"]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '', '',
    true, false, false, 'unit', null
  ),
  (
    '20', 'cat-3', 'Virgin Passion Cooler', 'BAR-004',
    'Passion fruit, lemon, mint and soda (non-alcoholic)',
    120, 'none', 3,
    '["Bar"]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '', '',
    true, false, false, 'unit', null
  ),
  (
    '21', 'cat-3', 'Single Malt Whiskey', 'BAR-005',
    'Premium single malt (30ml shot)',
    260, 'to', 1,
    '["Bar"]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '', '',
    true, false, false, 'unit', null
  ),
  (
    '22', 'cat-3', 'Espresso Martini', 'BAR-006',
    'Vodka, coffee liqueur and fresh espresso',
    220, 'to', 5,
    '["Bar"]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '', '',
    true, false, false, 'unit', null
  ),
  (
    '23', 'cat-8', 'Tere Siga', 'SEGA-001',
    'Traditional raw beef slices with mitmita and awaze',
    0, 'vat', 6,
    '["Grill"]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '', '',
    true, false, true, 'kg', 950
  ),
  (
    '24', 'cat-8', 'Shekla Tibs', 'SEGA-002',
    'Sizzling beef tibs served in traditional clay pot',
    320, 'vat', 18,
    '["Stove", "Grill"]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '', '',
    true, false, false, 'unit', null
  );

-- ---------------------------------------------------------------------------
-- Sections + tables baseline
-- ---------------------------------------------------------------------------
insert into public.sections (id, name, display_order, active)
values
  ('sec-1', 'Main Hall', 1, true),
  ('sec-2', 'Patio', 2, true),
  ('sec-3', 'VIP Lounge', 3, true),
  ('sec-4', 'Bar Counter', 4, true),
  ('sec-5', 'Private Dining', 5, true);

insert into public.restaurant_tables (
  id, name, zone, section_id, status, seats, shape, table_type, x, y, w, h, active
)
values
  ('A01', 'A01', 'Main Hall', 'sec-1', 'available', 2, 'square', 'standard', 60, 60, 70, 70, true),
  ('A02', 'A02', 'Main Hall', 'sec-1', 'available', 2, 'square', 'standard', 160, 60, 70, 70, true),
  ('A12', 'A12', 'Main Hall', 'sec-1', 'available', 8, 'rectangle', 'standard', 370, 175, 130, 70, true),
  ('P01', 'P01', 'Patio', 'sec-2', 'available', 2, 'round', 'outdoor', 60, 60, 70, 70, true),
  ('V01', 'V01', 'VIP Lounge', 'sec-3', 'available', 4, 'rectangle', 'vip', 60, 60, 100, 80, true),
  ('B01', 'B01', 'Bar Counter', 'sec-4', 'available', 1, 'bar', 'bar', 40, 70, 50, 50, true),
  ('PD1', 'PD1', 'Private Dining', 'sec-5', 'available', 12, 'rectangle', 'private', 60, 60, 180, 90, true);

-- Optional starter promos
insert into public.discounts (
  id, code, name, discount_type, value, scope, min_order_value, active
)
values
  ('disc-1', 'WELCOME10', 'Welcome 10%', 'percent', 10, 'order', 200, true),
  ('disc-2', 'COFFEE20', 'Coffee Time', 'percent', 20, 'category', 0, true);

commit;

-- Verification quick checks (run separately):
-- select count(*) from auth.users;
-- select count(*) from public.profiles;
-- select count(*) from public.user_pins;
-- select count(*) from public.menu_categories;
-- select count(*) from public.menu_items;
-- select count(*) from public.orders;