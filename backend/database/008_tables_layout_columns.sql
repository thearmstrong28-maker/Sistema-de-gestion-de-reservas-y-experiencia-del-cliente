ALTER TABLE restaurant_tables
  ADD COLUMN IF NOT EXISTS pos_x integer;

ALTER TABLE restaurant_tables
  ADD COLUMN IF NOT EXISTS pos_y integer;

ALTER TABLE restaurant_tables
  ADD COLUMN IF NOT EXISTS layout_label text;

UPDATE restaurant_tables
SET
  pos_x = COALESCE(pos_x, ((table_number - 1) % 6) * 120),
  pos_y = COALESCE(pos_y, FLOOR((table_number - 1) / 6.0)::integer * 120),
  layout_label = COALESCE(layout_label, 'Principal')
WHERE pos_x IS NULL OR pos_y IS NULL OR layout_label IS NULL;
