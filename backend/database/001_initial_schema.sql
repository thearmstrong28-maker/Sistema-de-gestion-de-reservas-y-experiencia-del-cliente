CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  CREATE TYPE "role" AS ENUM ('admin', 'host', 'manager', 'customer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE reservation_status AS ENUM (
    'PENDING',
    'CONFIRMED',
    'SEATED',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'reservation_status'
      AND e.enumlabel = 'pending'
  ) THEN
    ALTER TYPE reservation_status RENAME VALUE 'pending' TO 'PENDING';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'reservation_status'
      AND e.enumlabel = 'confirmed'
  ) THEN
    ALTER TYPE reservation_status RENAME VALUE 'confirmed' TO 'CONFIRMED';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'reservation_status'
      AND e.enumlabel = 'seated'
  ) THEN
    ALTER TYPE reservation_status RENAME VALUE 'seated' TO 'SEATED';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'reservation_status'
      AND e.enumlabel = 'completed'
  ) THEN
    ALTER TYPE reservation_status RENAME VALUE 'completed' TO 'COMPLETED';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'reservation_status'
      AND e.enumlabel = 'cancelled'
  ) THEN
    ALTER TYPE reservation_status RENAME VALUE 'cancelled' TO 'CANCELLED';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'reservation_status'
      AND e.enumlabel = 'no_show'
  ) THEN
    ALTER TYPE reservation_status RENAME VALUE 'no_show' TO 'NO_SHOW';
  END IF;
END $$;

DO $$
BEGIN
  CREATE TYPE waitlist_status AS ENUM (
    'waiting',
    'notified',
    'accepted',
    'expired',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION is_active_reservation_status(reservation_status)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT $1 IN ('PENDING', 'CONFIRMED', 'SEATED');
$$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Hard delete is not allowed on %', TG_TABLE_NAME USING ERRCODE = '55000';
END;
$$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role "role" NOT NULL DEFAULT 'customer',
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  full_name text NOT NULL,
  email text UNIQUE,
  phone text,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  visit_count integer NOT NULL DEFAULT 0 CHECK (visit_count >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number integer NOT NULL UNIQUE CHECK (table_number > 0),
  capacity integer NOT NULL CHECK (capacity > 0),
  area text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_name text NOT NULL UNIQUE,
  shift_date date NOT NULL,
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT shifts_time_order CHECK (starts_at < ends_at)
);

CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  table_id uuid REFERENCES restaurant_tables(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  shift_id uuid NOT NULL REFERENCES shifts(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  reservation_date date NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  party_size integer NOT NULL CHECK (party_size > 0),
  status reservation_status NOT NULL DEFAULT 'PENDING',
  special_requests text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT reservation_time_order CHECK (ends_at > starts_at)
);

ALTER TABLE IF EXISTS reservations
  ALTER COLUMN status SET DEFAULT 'PENDING';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reservation_table_no_overlap'
  ) THEN
    ALTER TABLE reservations
      ADD CONSTRAINT reservation_table_no_overlap
      EXCLUDE USING gist (
        table_id WITH =,
        tstzrange(starts_at, ends_at, '[)') WITH &&
      )
      WHERE (
        table_id IS NOT NULL
        AND is_active_reservation_status(status)
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  requested_shift_id uuid REFERENCES shifts(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  requested_date date NOT NULL,
  party_size integer NOT NULL CHECK (party_size > 0),
  status waitlist_status NOT NULL DEFAULT 'waiting',
  position integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  actor_user_id uuid REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION check_reservation_capacity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  table_capacity integer;
BEGIN
  IF NEW.table_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT capacity
    INTO table_capacity
  FROM restaurant_tables
  WHERE id = NEW.table_id;

  IF table_capacity IS NULL THEN
    RAISE EXCEPTION 'Assigned table does not exist';
  END IF;

  IF NEW.party_size > table_capacity THEN
    RAISE EXCEPTION 'Party size % exceeds table capacity %', NEW.party_size, table_capacity;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION sync_reservation_date()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.reservation_date = NEW.starts_at::date;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION log_row_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO audit_log (table_name, record_id, action, old_data, new_data)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_tables_updated_at ON restaurant_tables;
CREATE TRIGGER trg_tables_updated_at
BEFORE UPDATE ON restaurant_tables
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_shifts_updated_at ON shifts;
CREATE TRIGGER trg_shifts_updated_at
BEFORE UPDATE ON shifts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_reservations_updated_at ON reservations;
CREATE TRIGGER trg_reservations_updated_at
BEFORE UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_waitlist_updated_at ON waitlist_entries;
CREATE TRIGGER trg_waitlist_updated_at
BEFORE UPDATE ON waitlist_entries
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_reservations_sync_date ON reservations;
CREATE TRIGGER trg_reservations_sync_date
BEFORE INSERT OR UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION sync_reservation_date();

DROP TRIGGER IF EXISTS trg_reservations_capacity ON reservations;
CREATE TRIGGER trg_reservations_capacity
BEFORE INSERT OR UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION check_reservation_capacity();

DROP TRIGGER IF EXISTS trg_users_delete_block ON users;
CREATE TRIGGER trg_users_delete_block
BEFORE DELETE ON users
FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

DROP TRIGGER IF EXISTS trg_tables_delete_block ON restaurant_tables;
CREATE TRIGGER trg_tables_delete_block
BEFORE DELETE ON restaurant_tables
FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

DROP TRIGGER IF EXISTS trg_shifts_delete_block ON shifts;
CREATE TRIGGER trg_shifts_delete_block
BEFORE DELETE ON shifts
FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

DROP TRIGGER IF EXISTS trg_reservations_delete_block ON reservations;
CREATE TRIGGER trg_reservations_delete_block
BEFORE DELETE ON reservations
FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

DROP TRIGGER IF EXISTS trg_waitlist_delete_block ON waitlist_entries;
CREATE TRIGGER trg_waitlist_delete_block
BEFORE DELETE ON waitlist_entries
FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

DROP TRIGGER IF EXISTS trg_users_audit ON users;
CREATE TRIGGER trg_users_audit
AFTER INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION log_row_change();

DROP TRIGGER IF EXISTS trg_customers_audit ON customers;
CREATE TRIGGER trg_customers_audit
AFTER INSERT OR UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION log_row_change();

DROP TRIGGER IF EXISTS trg_tables_audit ON restaurant_tables;
CREATE TRIGGER trg_tables_audit
AFTER INSERT OR UPDATE ON restaurant_tables
FOR EACH ROW EXECUTE FUNCTION log_row_change();

DROP TRIGGER IF EXISTS trg_shifts_audit ON shifts;
CREATE TRIGGER trg_shifts_audit
AFTER INSERT OR UPDATE ON shifts
FOR EACH ROW EXECUTE FUNCTION log_row_change();

DROP TRIGGER IF EXISTS trg_reservations_audit ON reservations;
CREATE TRIGGER trg_reservations_audit
AFTER INSERT OR UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION log_row_change();

DROP TRIGGER IF EXISTS trg_waitlist_audit ON waitlist_entries;
CREATE TRIGGER trg_waitlist_audit
AFTER INSERT OR UPDATE ON waitlist_entries
FOR EACH ROW EXECUTE FUNCTION log_row_change();

CREATE UNIQUE INDEX IF NOT EXISTS ux_reservations_active_customer_shift
  ON reservations (customer_id, reservation_date, shift_id)
  WHERE is_active_reservation_status(status);

CREATE INDEX IF NOT EXISTS ix_reservations_date_shift_status
  ON reservations (reservation_date, shift_id, status);

CREATE INDEX IF NOT EXISTS ix_reservations_table_status
  ON reservations (table_id, status, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS ix_reservations_customer_status
  ON reservations (customer_id, status, reservation_date DESC);

CREATE INDEX IF NOT EXISTS ix_customers_email
  ON customers (email);

CREATE INDEX IF NOT EXISTS ix_customers_visit_count
  ON customers (visit_count DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS ix_shifts_date_active
  ON shifts (shift_date, is_active, starts_at);

CREATE INDEX IF NOT EXISTS ix_tables_capacity_active
  ON restaurant_tables (is_active, capacity, table_number);

CREATE INDEX IF NOT EXISTS ix_waitlist_date_shift_status
  ON waitlist_entries (requested_date, requested_shift_id, status);

CREATE INDEX IF NOT EXISTS ix_audit_log_table_created_at
  ON audit_log (table_name, created_at DESC);

CREATE OR REPLACE VIEW daily_shift_occupancy AS
SELECT
  s.id AS shift_id,
  s.shift_date,
  s.shift_name,
  (
    SELECT COUNT(*)
    FROM restaurant_tables
    WHERE is_active
  ) AS total_tables,
  COUNT(DISTINCT r.table_id) FILTER (WHERE is_active_reservation_status(r.status) AND r.table_id IS NOT NULL) AS occupied_tables,
  COALESCE(SUM(r.party_size) FILTER (WHERE is_active_reservation_status(r.status)), 0) AS reserved_guests,
  (
    SELECT COALESCE(SUM(capacity), 0)
    FROM restaurant_tables
    WHERE is_active
  ) AS total_capacity,
  ROUND(
    CASE
      WHEN (
        SELECT COUNT(*)
        FROM restaurant_tables
        WHERE is_active
      ) = 0 THEN 0
      ELSE (
        COUNT(DISTINCT r.table_id) FILTER (WHERE is_active_reservation_status(r.status) AND r.table_id IS NOT NULL)::numeric
        / (
          SELECT COUNT(*)::numeric
          FROM restaurant_tables
          WHERE is_active
        )
      ) * 100
    END,
    2
  ) AS occupancy_percent
FROM shifts s
LEFT JOIN reservations r
  ON r.shift_id = s.id
 AND r.reservation_date = s.shift_date
GROUP BY s.id, s.shift_date, s.shift_name;

CREATE OR REPLACE VIEW frequent_customers AS
SELECT
  c.id AS customer_id,
  c.full_name,
  c.email,
  c.phone,
  COUNT(r.id) FILTER (WHERE r.status IN ('SEATED', 'COMPLETED')) AS visit_count,
  COUNT(r.id) FILTER (WHERE r.status = 'NO_SHOW') AS no_show_count,
  MAX(r.starts_at) FILTER (WHERE r.status IN ('SEATED', 'COMPLETED')) AS last_visit_at
FROM customers c
LEFT JOIN reservations r ON r.customer_id = c.id
GROUP BY c.id, c.full_name, c.email, c.phone
HAVING COUNT(r.id) FILTER (WHERE r.status IN ('SEATED', 'COMPLETED')) >= 1
ORDER BY visit_count DESC, last_visit_at DESC NULLS LAST, c.full_name ASC;

INSERT INTO users (id, email, password_hash, full_name, role, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@local.test',
  '{{BCRYPT_HASH_PLACEHOLDER}}',
  'System Admin',
  'admin',
  true
)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

INSERT INTO shifts (id, shift_name, shift_date, starts_at, ends_at, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'breakfast', CURRENT_DATE, '08:00', '11:00', true),
  ('00000000-0000-0000-0000-000000000102', 'lunch', CURRENT_DATE, '12:00', '15:00', true),
  ('00000000-0000-0000-0000-000000000103', 'dinner', CURRENT_DATE, '19:00', '23:00', true)
ON CONFLICT (shift_name) DO UPDATE
SET shift_date = EXCLUDED.shift_date,
    starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    is_active = EXCLUDED.is_active;

INSERT INTO restaurant_tables (id, table_number, capacity, area, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000201', 1, 2, 'main', true),
  ('00000000-0000-0000-0000-000000000202', 2, 4, 'main', true),
  ('00000000-0000-0000-0000-000000000203', 3, 4, 'terrace', true),
  ('00000000-0000-0000-0000-000000000204', 4, 6, 'private', true)
ON CONFLICT (table_number) DO UPDATE
SET capacity = EXCLUDED.capacity,
    area = EXCLUDED.area,
    is_active = EXCLUDED.is_active;
