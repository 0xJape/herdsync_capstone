CREATE TABLE IF NOT EXISTS treatment_products (
  id BIGSERIAL PRIMARY KEY,
  treatment_type VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (treatment_type, name)
);

INSERT INTO treatment_products (treatment_type, name) VALUES
  ('vaccination', 'FMD vaccine'),
  ('vaccination', 'Hemorrhagic septicemia vaccine'),
  ('vaccination', 'Blackleg vaccine'),
  ('vaccination', 'Anthrax vaccine'),
  ('vitamins', 'Vitamin A, D & E'),
  ('vitamins', 'Vitamin B complex'),
  ('vitamins', 'Multivitamin'),
  ('antibiotics', 'Oxytetracycline'),
  ('antibiotics', 'Penicillin'),
  ('antibiotics', 'Amoxicillin'),
  ('anti_inflammatory', 'Flunixin meglumine'),
  ('anti_inflammatory', 'Meloxicam'),
  ('anti_inflammatory', 'Ketoprofen'),
  ('dewormer', 'Ivermectin'),
  ('dewormer', 'Albendazole'),
  ('dewormer', 'Fenbendazole')
ON CONFLICT (treatment_type, name) DO NOTHING;