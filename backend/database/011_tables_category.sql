DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'table_category') THEN
    BEGIN
      ALTER TYPE table_category RENAME VALUE 'normal' TO 'Normal';
    EXCEPTION
      WHEN invalid_parameter_value THEN NULL;
      WHEN undefined_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE table_category RENAME VALUE 'premium' TO 'Premium';
    EXCEPTION
      WHEN invalid_parameter_value THEN NULL;
      WHEN undefined_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE table_category RENAME VALUE 'privada' TO 'Privada';
    EXCEPTION
      WHEN invalid_parameter_value THEN NULL;
      WHEN undefined_object THEN NULL;
    END;
  ELSE
    CREATE TYPE table_category AS ENUM ('Normal', 'Premium', 'Privada');
  END IF;
END $$;

ALTER TABLE restaurant_tables
  ADD COLUMN IF NOT EXISTS category table_category;

UPDATE restaurant_tables
SET category = COALESCE(category, 'Normal')
WHERE category IS NULL;

ALTER TABLE restaurant_tables
  ALTER COLUMN category SET DEFAULT 'Normal';

ALTER TABLE restaurant_tables
  ALTER COLUMN category SET NOT NULL;
