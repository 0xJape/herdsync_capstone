INSERT INTO system_settings (key, value) VALUES
  ('mature_cattle_price_per_kg', '130'),
  ('calf_fixed_price', '10000')
ON CONFLICT (key) DO NOTHING;