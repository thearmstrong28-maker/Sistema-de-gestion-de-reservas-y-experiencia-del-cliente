WITH restaurant_candidates AS (
  SELECT
    LOWER(BTRIM(u.restaurant_name)) AS restaurant_key,
    u.id,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(BTRIM(u.restaurant_name))
      ORDER BY u.created_at ASC, u.id ASC
    ) AS rn
  FROM users u
  WHERE u.is_active = true
    AND u.restaurant_name IS NOT NULL
    AND BTRIM(u.restaurant_name) <> ''
),
restaurants_without_admin AS (
  SELECT restaurant_key
  FROM (
    SELECT DISTINCT LOWER(BTRIM(restaurant_name)) AS restaurant_key
    FROM users
    WHERE is_active = true
      AND restaurant_name IS NOT NULL
      AND BTRIM(restaurant_name) <> ''
  ) restaurants
  WHERE NOT EXISTS (
    SELECT 1
    FROM users admin_user
    WHERE admin_user.is_active = true
      AND admin_user.role = 'admin'
      AND admin_user.restaurant_name IS NOT NULL
      AND LOWER(BTRIM(admin_user.restaurant_name)) = restaurants.restaurant_key
  )
)
UPDATE users target
SET role = 'admin'
FROM restaurant_candidates candidate,
     restaurants_without_admin missing
WHERE target.id = candidate.id
  AND candidate.rn = 1
  AND candidate.restaurant_key = missing.restaurant_key
  AND target.role <> 'admin';
