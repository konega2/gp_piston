ALTER TABLE pilots
ADD COLUMN IF NOT EXISTS login_code TEXT;

UPDATE pilots
SET login_code = CONCAT(
  'GP-',
  LPAD(COALESCE(number, 0)::TEXT, 3, '0'),
  '-',
  UPPER(SUBSTRING(md5(COALESCE(id, 'pilot')) FROM 1 FOR 4))
)
WHERE login_code IS NULL OR BTRIM(login_code) = '';

CREATE UNIQUE INDEX IF NOT EXISTS pilots_login_code_unique_idx
ON pilots ((UPPER(login_code)))
WHERE login_code IS NOT NULL;
