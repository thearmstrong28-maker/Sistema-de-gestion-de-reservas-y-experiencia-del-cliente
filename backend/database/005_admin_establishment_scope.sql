UPDATE users
SET restaurant_name = COALESCE(restaurant_name, 'Restaurante principal')
WHERE role = 'admin'
  AND email = 'admin@local.test'
  AND (restaurant_name IS NULL OR restaurant_name = '');
