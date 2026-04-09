CREATE TABLE IF NOT EXISTS report_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_name text NOT NULL,
  report_date date NOT NULL,
  reservations_count integer NOT NULL DEFAULT 0,
  attended_count integer NOT NULL DEFAULT 0,
  customer_count integer NOT NULL DEFAULT 0,
  no_show_count integer NOT NULL DEFAULT 0,
  attendance_percent numeric(5,2) NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'auto_query_backfill',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_report_snapshots_restaurant_date UNIQUE (restaurant_name, report_date)
);

CREATE INDEX IF NOT EXISTS ix_report_snapshots_restaurant_date
  ON report_snapshots (restaurant_name, report_date DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'set_updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS trg_report_snapshots_updated_at ON report_snapshots;
    CREATE TRIGGER trg_report_snapshots_updated_at
    BEFORE UPDATE ON report_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
