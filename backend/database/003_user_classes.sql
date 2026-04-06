CREATE TABLE IF NOT EXISTS user_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text NOT NULL,
  access_level text NOT NULL CHECK (access_level IN ('ALTO', 'MEDIO', 'BAJO')),
  role "role" NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_user_classes_updated_at ON user_classes;
CREATE TRIGGER trg_user_classes_updated_at
BEFORE UPDATE ON user_classes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS ix_user_classes_role
  ON user_classes (role);

CREATE INDEX IF NOT EXISTS ix_user_classes_is_active
  ON user_classes (is_active);

INSERT INTO user_classes (id, code, display_name, description, access_level, role, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000301', 'ADMIN', 'Administrador', 'Administrador', 'ALTO', 'admin', true),
  ('00000000-0000-0000-0000-000000000302', 'HOST', 'Host', 'Recepcionista', 'MEDIO', 'host', true),
  ('00000000-0000-0000-0000-000000000303', 'MANAGER', 'Gerente', 'Gerente', 'MEDIO', 'manager', true),
  ('00000000-0000-0000-0000-000000000304', 'CUSTOMER_GUEST', 'Cliente', 'Invitado', 'BAJO', 'customer', true)
ON CONFLICT (code) DO UPDATE
SET display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    access_level = EXCLUDED.access_level,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;
