DO $$
BEGIN
  CREATE TYPE table_availability_status AS ENUM ('disponible', 'ocupada');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE restaurant_tables
  ADD COLUMN IF NOT EXISTS availability_status table_availability_status NOT NULL DEFAULT 'disponible';
