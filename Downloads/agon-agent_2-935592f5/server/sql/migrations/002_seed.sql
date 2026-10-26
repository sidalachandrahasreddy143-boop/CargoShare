-- ════════════════════════════════════════════════════════════════
-- CargoShare — seed data (development only) | migration 002_seed
-- Passwords are bcrypt hashes:  Admin@123 / Trader@123 / Lsp@12345
-- Hash generated with bcrypt(10). Regenerate with: npm run hash -- 'yourpassword'
-- ════════════════════════════════════════════════════════════════

-- Users
INSERT INTO users (id, role, name, company, email, phone, password_hash, gstin, business_type, address, phone_verified, email_verified, kyc_status)
VALUES
  ('11111111-0000-0000-0000-000000000001', 'admin',  'CargoShare Admin', 'CargoShare Labs', 'admin@cargoshare.io',   '+919000000001', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, NULL, 'Bengaluru, IN', TRUE, TRUE, 'verified'),
  ('11111111-0000-0000-0000-000000000002', 'trader', 'Ananya Sharma',    'Sharma Exports',  'ananya@sharmaexports.in','+919812345678', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '27AABFS4426P1Z5', 'Exporter', 'Surat, Gujarat', TRUE, TRUE, 'verified'),
  ('11111111-0000-0000-0000-000000000003', 'trader', 'Rohit Mehta',      'Mehta Agro Foods','rohit@mehthaagro.in',   '+919876543210', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '24AAECM2230Q1Z2', 'Manufacturer', 'Nashik, Maharashtra', TRUE, TRUE, 'verified'),
  ('11111111-0000-0000-0000-000000000004', 'trader', 'Priya Nair',       'Malabar Spices',  'priya@malabarspices.in','+919845671234', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '32AABFM1901F1Z8', 'Exporter', 'Kochi, Kerala', TRUE, TRUE, 'pending'),
  ('11111111-0000-0000-0000-000000000005', 'lsp',    'Karthik LSP Owner','Deccan Rail Freight','karthik@deccanrail.in','+919900001111', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, NULL, 'Secunderabad, Telangana', TRUE, TRUE, 'verified'),
  ('11111111-0000-0000-0000-000000000006', 'lsp',    'Vikram Singh',     'Singh Roadways',   'vikram@singhroadways.in','+919900002222', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, NULL, 'Delhi NCR', TRUE, TRUE, 'verified'),
  ('11111111-0000-0000-0000-000000000007', 'lsp',    'Lakshmi Iyer',     'Coastal Shipping Co','lakshmi@coastalship.in','+919900003333', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, NULL, 'Chennai, Tamil Nadu', TRUE, TRUE, 'verified'),
  ('11111111-0000-0000-0000-000000000008', 'lsp',    'Arun Menon',       'SouthWind Cargo Air','arun@southwindair.in', '+919900004444', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NULL, NULL, 'Bengaluru, Karnataka', TRUE, FALSE, 'unverified')
ON CONFLICT (email) DO NOTHING;

-- LSP profiles (one approved, one under review, one pending)
INSERT INTO lsp_profiles (id, user_id, company_name, license_number, mode, approval_status, data_quality_score, fleet_details, hub_locations, bank_details, inspection_notes, reviewed_by, reviewed_at)
VALUES
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000005', 'Deccan Rail Freight', 'RLDA-2019-4412', 'rail', 'approved', 92,
   '{"wagons": 64, "locomotives": 6, "max_payload_mt": 1400}'::jsonb,
   '[{"city":"Secunderabad","code":"SC","lat":17.43,"lng":78.50},{"city":"Gandhidham","code":"GIM","lat":23.08,"lng":70.13},{"city":"Ludhiana","code":"LDH","lat":30.90,"lng":75.86}]'::jsonb,
   '{"bank":"HDFC Bank","account":"XXXXXXXX2211","ifsc":"HDFC0001234","upi":"deccanrail@hdfcbank"}'::jsonb,
   'Fleet audited Mar 2026 — 62/64 wagons GPS-tracked, docs complete. Excellent on-time record (Q3: 96%).', '11111111-0000-0000-0000-000000000001', now() - interval '60 days'),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000006', 'Singh Roadways', 'MORTH/2021/0098', 'road', 'approved', 85,
   '{"trucks": 120, "reefers": 14, "max_payload_mt": 25}'::jsonb,
   '[{"city":"Delhi","code":"DEL","lat":28.61,"lng":77.20},{"city":"Mumbai","code":"BOM","lat":19.07,"lng":72.87},{"city":"Ahmedabad","code":"AMD","lat":23.02,"lng":72.57}]'::jsonb,
   '{"bank":"ICICI Bank","account":"XXXXXXXX8834","ifsc":"ICIC0004455","upi":"singhroadways@icici"}'::jsonb,
   'Strong north-west corridor coverage. Two reefer units serviced Aug 2026. Capacity data quality improving.', '11111111-0000-0000-0000-000000000001', now() - interval '45 days'),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000007', 'Coastal Shipping Co', 'DGS-SHIP-2008-77341', 'ship', 'approved', 88,
   '{"vessels": 3, "teu_capacity": 1800, "max_payload_mt": 22000}'::jsonb,
   '[{"city":"Chennai","code":"INMAA","lat":13.08,"lng":80.29},{"city":"Mundra","code":"INMUN","lat":22.74,"lng":69.71},{"city":"Colombo","code":"LKCMB","lat":6.93,"lng":79.84}]'::jsonb,
   '{"bank":"State Bank of India","account":"XXXXXXXX7712","ifsc":"SBIN0007788","upi":"coastalship@sbi"}'::jsonb,
   'Verified AIS tracking feeds. Colombo transshipment slot reliable. License renewed Jan 2026.', '11111111-0000-0000-0000-000000000001', now() - interval '30 days'),
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000008', 'SouthWind Cargo Air', 'BCAA-FSC-2024-112', 'air', 'under_review', NULL,
   '{"aircraft": 2, "uld_positions": 48, "max_payload_mt": 42}'::jsonb,
   '[{"city":"Bengaluru","code":"BLR","lat":13.19,"lng":77.70},{"city":"Delhi","code":"DEL","lat":28.55,"lng":77.10}]'::jsonb,
   '{"bank":"Axis Bank","account":"XXXXXXXX3301","ifsc":"UTIB0002299"}'::jsonb,
   NULL, NULL, NULL)
ON CONFLICT (user_id) DO NOTHING;

-- Containers with spare space (dates relative to now so demo never goes stale)
INSERT INTO containers (lsp_id, mode, container_ref, origin, origin_code, destination, destination_code, origin_lat, origin_lng, destination_lat, destination_lng, departure_datetime, arrival_datetime, total_capacity, booked_capacity, unit, rate_per_unit, min_booking_qty, cutoff_datetime, cargo_types, status)
VALUES
  ('22222222-0000-0000-0000-000000000001', 'rail', 'DRF-WGN-1042', 'Gandhidham (ICD)', 'IN-GIM', 'Ludhiana (ICD)', 'IN-LDH', 23.08, 70.13, 30.90, 75.86,
   now() + interval '3 days', now() + interval '4 days 14 hours', 1200, 780, 'MT', 1450, 10, now() + interval '2 days',
   ARRAY['Agri','FMCG','Auto Parts'], 'active'),
  ('22222222-0000-0000-0000-000000000001', 'rail', 'DRF-WGN-2210', 'Secunderabad', 'IN-SC', 'Gandhidham (ICD)', 'IN-GIM', 17.43, 78.50, 23.08, 70.13,
   now() + interval '5 days', now() + interval '6 days 20 hours', 900, 150, 'MT', 1320, 5, now() + interval '4 days',
   ARRAY['FMCG','Pharma','Agri'], 'active'),
  ('22222222-0000-0000-0000-000000000002', 'road', 'SR-TRI-4477', 'Delhi NCR', 'IN-DEL', 'Mumbai', 'IN-BOM', 28.61, 77.20, 19.07, 72.87,
   now() + interval '2 days', now() + interval '3 days 6 hours', 25, 9, 'MT', 8900, 1, now() + interval '1 days 12 hours',
   ARRAY['FMCG','Pharma','Electronics'], 'active'),
  ('22222222-0000-0000-0000-000000000002', 'road', 'SR-TRI-4488', 'Ahmedabad', 'IN-AMD', 'Delhi NCR', 'IN-DEL', 23.02, 72.57, 28.61, 77.20,
   now() + interval '4 days', now() + interval '5 days 8 hours', 22, 4, 'MT', 8600, 1, now() + interval '3 days 6 hours',
   ARRAY['Agri','FMCG','Textiles'], 'active'),
  ('22222222-0000-0000-0000-000000000003', 'ship', 'CSC-VSL-MTH-07', 'Chennai (INMAA)', 'INMAA', 'Colombo (LKCMB)', 'LKCMB', 13.08, 80.29, 6.93, 79.84,
   now() + interval '6 days', now() + interval '9 days', 600, 210, 'TEU', 62000, 1, now() + interval '4 days',
   ARRAY['FMCG','Auto Parts','Chemicals'], 'active'),
  ('22222222-0000-0000-0000-000000000003', 'ship', 'CSC-VSL-MUM-03', 'Mundra (INMUN)', 'INMUN', 'Colombo (LKCMB)', 'LKCMB', 22.74, 69.71, 6.93, 79.84,
   now() + interval '8 days', now() + interval '12 days', 850, 520, 'TEU', 58000, 2, now() + interval '6 days',
   ARRAY['Agri','FMCG','Textiles'], 'active'),
  ('22222222-0000-0000-0000-000000000001', 'rail', 'DRF-WGN-3301', 'Ludhiana (ICD)', 'IN-LDH', 'Secunderabad', 'IN-SC', 30.90, 75.86, 17.43, 78.50,
   now() + interval '7 days', now() + interval '9 days', 1100, 110, 'MT', 1500, 10, now() + interval '6 days',
   ARRAY['Textiles','Agri'], 'active'),
  ('22222222-0000-0000-0000-000000000002', 'road', 'SR-RFR-1102', 'Mumbai', 'IN-BOM', 'Ahmedabad', 'IN-AMD', 19.07, 72.87, 23.02, 72.57,
   now() + interval '1 days 6 hours', now() + interval '2 days', 18, 2, 'MT', 9200, 1, now() + interval '1 day',
   ARRAY['Pharma','FMCG'], 'active')
ON CONFLICT DO NOTHING;

-- A couple of confirmed bookings + reviews so dashboards aren't empty
INSERT INTO bookings (container_id, trader_id, lsp_id, cargo_details, qty_booked, unit, rate_per_unit, total_price, platform_fee, booking_status, payment_status)
SELECT c.id, '11111111-0000-0000-0000-000000000002', c.lsp_id,
       '{"commodity":"Basmati Rice","packages":320,"notes":"Palletised, moisture-proof"}'::jsonb,
       40, 'MT', c.rate_per_unit, 40 * c.rate_per_unit, 40 * c.rate_per_unit * 0.025, 'confirmed', 'captured'
FROM containers c WHERE c.container_ref = 'DRF-WGN-1042'
LIMIT 1;

INSERT INTO reviews (booking_id, trader_id, lsp_id, rating, comment)
SELECT b.id, b.trader_id, b.lsp_id, 5, 'Booked 40 MT in under 10 minutes. Live capacity updates were spot on.'
FROM bookings b WHERE b.booking_status = 'confirmed' LIMIT 1;
