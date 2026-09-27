CREATE TABLE IF NOT EXISTS alert_acknowledgements (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  health_record_id BIGINT NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
  alert_type VARCHAR(40) NOT NULL,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, health_record_id, alert_type)
);

CREATE INDEX IF NOT EXISTS alert_acknowledgements_user_idx
  ON alert_acknowledgements (user_id, acknowledged_at DESC);

CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(80) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_settings (key, value) VALUES
  ('farm_name', 'MSU-GenSan Animal Science Farm'),
  ('farm_timezone', 'Asia/Manila'),
  ('report_page_size', '25')
ON CONFLICT (key) DO NOTHING;