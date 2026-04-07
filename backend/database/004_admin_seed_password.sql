DO $$
DECLARE
  current_hash text;
BEGIN
  SELECT password_hash
    INTO current_hash
  FROM users
  WHERE email = 'admin@local.test'
  LIMIT 1;

  IF current_hash IS NULL THEN
    INSERT INTO users (id, email, password_hash, full_name, role, is_active)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'admin@local.test',
      crypt('Admin123!', gen_salt('bf')),
      'System Admin',
      'admin',
      true
    )
    ON CONFLICT (email) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active;
  ELSIF current_hash = '{{BCRYPT_HASH_PLACEHOLDER}}' OR current_hash !~ '^\$2[aby]\$' THEN
    UPDATE users
    SET password_hash = crypt('Admin123!', gen_salt('bf')),
        full_name = 'System Admin',
        role = 'admin',
        is_active = true
    WHERE email = 'admin@local.test';
  END IF;
END $$;
