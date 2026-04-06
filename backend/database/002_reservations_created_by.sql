ALTER TABLE IF EXISTS reservations
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_reservations_created_by_user_id'
  ) THEN
    ALTER TABLE reservations
      ADD CONSTRAINT fk_reservations_created_by_user_id
      FOREIGN KEY (created_by_user_id)
      REFERENCES users(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_reservations_created_by_user_id
  ON reservations (created_by_user_id);
