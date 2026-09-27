UPDATE users SET role = 'farm_aide' WHERE role = 'staff';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20);
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'veterinarian', 'farm_aide', 'faculty'));
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'farm_aide';
