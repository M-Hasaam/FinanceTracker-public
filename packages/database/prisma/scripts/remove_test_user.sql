-- Usage:
--  psql "$DATABASE_URL" -P pager=off -v user_id='dummy_user_001' -f packages/database/prisma/scripts/remove_test_user.sql

--
-- Notes:
-- - Deleting the user cascades to User -> Transaction and User -> Category
--   based on the Prisma schema.
-- - This script still reports counts for each table for visibility.

BEGIN;

WITH target_user AS (
  SELECT id
  FROM "User"
  WHERE id = NULLIF(:'user_id', '')
  LIMIT 1
),
deleted_transactions AS (
  DELETE FROM "Transaction"
  WHERE "userId" IN (SELECT id FROM target_user)
  RETURNING id
),
deleted_categories AS (
  DELETE FROM "Category"
  WHERE "userId" IN (SELECT id FROM target_user)
  RETURNING id
),
deleted_users AS (
  DELETE FROM "User"
  WHERE id IN (SELECT id FROM target_user)
  RETURNING id
)
SELECT
  (SELECT COUNT(*) FROM target_user) AS matched_users,
  (SELECT COUNT(*) FROM deleted_transactions) AS deleted_transactions,
  (SELECT COUNT(*) FROM deleted_categories) AS deleted_categories,
  (SELECT COUNT(*) FROM deleted_users) AS deleted_users;

COMMIT;
