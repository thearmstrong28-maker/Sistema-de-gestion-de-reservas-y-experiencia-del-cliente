ALTER TABLE IF EXISTS reservations
  ADD COLUMN IF NOT EXISTS cancellation_reason text;
