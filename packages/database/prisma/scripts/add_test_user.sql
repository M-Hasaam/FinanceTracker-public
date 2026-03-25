-- Usage:
--- psql "$DATABASE_URL" -P pager=off -v user_id='dummy_user_001' -f Queries/add_test_user.sql
--- Undo changes:
---  psql "$DATABASE_URL" -c "DELETE FROM \"Transaction\" WHERE \"userId\"='dummy_user_001';"



INSERT INTO "User" (id, email, name, password, provider, "createdAt", "updatedAt")
VALUES (
    'dummy_user_001',
    'test@example.com',
    'Test User',
    '$2b$12$inMrHL7MZ1OxG4/J3ww3v.BQkJBJW9NqkDS4EvmoBjXF2N9GHxKNO',
    'EMAIL',
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;


-- Ensure all categories exist for the target user before inserting transactions.
WITH target_user AS (
  SELECT id
  FROM "User"
  WHERE id = :'user_id'
  LIMIT 1
)
INSERT INTO "Category" (id, name, "userId")
SELECT
  'cat_' || substr(md5((SELECT id FROM target_user) || ':' || c.name), 1, 20),
  c.name,
  (SELECT id FROM target_user)
FROM (VALUES
  ('Salary'),
  ('Freelance'),
  ('Investment'),
  ('Bonus'),
  ('Groceries'),
  ('Utilities'),
  ('Dining Out'),
  ('Transportation'),
  ('Entertainment'),
  ('Shopping'),
  ('Healthcare'),
  ('Education'),
  ('Travel'),
  ('Insurance'),
  ('Rent/Mortgage'),
  ('Subscriptions'),
  ('Miscellaneous')
) AS c(name)
WHERE EXISTS (SELECT 1 FROM target_user)
ON CONFLICT (name, "userId") DO NOTHING;

WITH target_user AS (
  SELECT id
  FROM "User"
  WHERE id = :'user_id'
  LIMIT 1
),
-- Generate all days from 2025-2027
days AS (
  SELECT d::date AS day
  FROM generate_series(
    '2025-01-01'::date,
    '2027-12-31'::date,
    interval '1 day'
  ) AS gs(d)
),
-- For each day, generate 3-6 transactions
daily_transactions AS (
  SELECT 
    day,
    -- Generate a series from 1 to a random number between 3 and 6
    -- Using a subquery to ensure random() is evaluated per day
    generate_series(1, (3 + (random() * 3)::int)) as txn_num,
    random() as type_rand,
    random() as amount_rand,
    random() as cat_rand,
    random() as desc_rand
  FROM days
  CROSS JOIN target_user
  WHERE EXISTS (SELECT 1 FROM target_user)
)
INSERT INTO "Transaction" (
  id, amount, type, date, description, "userId", "categoryId", "createdAt"
)
SELECT
  'txn_' || to_char(day, 'YYYYMMDD') || '_' || txn_num || '_' || substr(md5((SELECT id FROM target_user) || ':' || txn_num::text || ':' || random()::text), 1, 4),
  
  -- Amount based on transaction type with realistic ranges
  CASE 
    -- INCOME (about 20% of transactions)
    WHEN type_rand < 0.2 THEN
      CASE (extract(day from day)::int % 4)
        WHEN 0 THEN (4500 + (amount_rand * 1000)::int)::numeric(12,2)  -- Salary
        WHEN 1 THEN (500 + (amount_rand * 1500)::int)::numeric(12,2)   -- Freelance
        WHEN 2 THEN (200 + (amount_rand * 800)::int)::numeric(12,2)    -- Investment
        ELSE (100 + (amount_rand * 400)::int)::numeric(12,2)           -- Bonus/other
      END
    -- EXPENSE (about 80% of transactions)
    ELSE
      CASE (txn_num % 6)
        WHEN 0 THEN (15 + (amount_rand * 40)::int)::numeric(12,2)      -- Very small expenses
        WHEN 1 THEN (45 + (amount_rand * 60)::int)::numeric(12,2)      -- Small expenses
        WHEN 2 THEN (120 + (amount_rand * 150)::int)::numeric(12,2)    -- Medium expenses
        WHEN 3 THEN (250 + (amount_rand * 250)::int)::numeric(12,2)    -- Large expenses
        WHEN 4 THEN (400 + (amount_rand * 400)::int)::numeric(12,2)    -- Very large expenses
        ELSE (600 + (amount_rand * 900)::int)::numeric(12,2)           -- Major expenses
      END
  END as amount,
  
  -- Transaction type (20% income, 80% expense)
  CASE WHEN type_rand < 0.2 THEN 'INCOME' ELSE 'EXPENSE' END::"TransactionType" as type,
  
  -- Date with random time throughout the day
  (day + (time '08:00' + (txn_num * interval '1 hour') + (random() * interval '4 hours')))::timestamp as date,
  
  -- Description
  CASE 
    WHEN type_rand < 0.2 THEN
      CASE
        WHEN cat_rand < 0.45 THEN 'Monthly Salary - ' || to_char(day, 'YYYY-MM')
        WHEN cat_rand < 0.70 THEN 'Freelance Payment - Project ' || (txn_num::text)
        WHEN cat_rand < 0.90 THEN 'Investment Dividend'
        ELSE 'Bonus/Gift'
      END
    ELSE
      CASE
        -- Holiday season: more Shopping/Travel
        WHEN extract(month from day) IN (11, 12) THEN
          CASE
            WHEN cat_rand < 0.15 THEN 'Grocery Store - ' || to_char(day, 'Mon DD')
            WHEN cat_rand < 0.24 THEN 'Restaurant - ' || to_char(day, 'Mon DD')
            WHEN cat_rand < 0.30 THEN 'Gas Station'
            WHEN cat_rand < 0.54 THEN 'Amazon Purchase'
            WHEN cat_rand < 0.61 THEN 'Utility Bill - ' || to_char(day, 'YYYY-MM')
            WHEN cat_rand < 0.69 THEN 'Movie/Theater'
            WHEN cat_rand < 0.75 THEN 'Pharmacy/Healthcare'
            WHEN cat_rand < 0.93 THEN 'Travel Booking'
            WHEN cat_rand < 0.97 THEN 'Insurance Premium'
            ELSE 'Miscellaneous Shopping'
          END
        -- Summer: more Travel/Entertainment
        WHEN extract(month from day) IN (6, 7, 8) THEN
          CASE
            WHEN cat_rand < 0.14 THEN 'Grocery Store - ' || to_char(day, 'Mon DD')
            WHEN cat_rand < 0.24 THEN 'Restaurant - ' || to_char(day, 'Mon DD')
            WHEN cat_rand < 0.33 THEN 'Gas Station'
            WHEN cat_rand < 0.42 THEN 'Amazon Purchase'
            WHEN cat_rand < 0.50 THEN 'Utility Bill - ' || to_char(day, 'YYYY-MM')
            WHEN cat_rand < 0.63 THEN 'Movie/Theater'
            WHEN cat_rand < 0.70 THEN 'Pharmacy/Healthcare'
            WHEN cat_rand < 0.92 THEN 'Travel Booking'
            WHEN cat_rand < 0.96 THEN 'Insurance Premium'
            ELSE 'Miscellaneous Shopping'
          END
        -- Winter/early year: higher Utilities/Insurance
        WHEN extract(month from day) IN (1, 2, 3) THEN
          CASE
            WHEN cat_rand < 0.18 THEN 'Grocery Store - ' || to_char(day, 'Mon DD')
            WHEN cat_rand < 0.27 THEN 'Restaurant - ' || to_char(day, 'Mon DD')
            WHEN cat_rand < 0.35 THEN 'Gas Station'
            WHEN cat_rand < 0.43 THEN 'Amazon Purchase'
            WHEN cat_rand < 0.59 THEN 'Utility Bill - ' || to_char(day, 'YYYY-MM')
            WHEN cat_rand < 0.66 THEN 'Movie/Theater'
            WHEN cat_rand < 0.75 THEN 'Pharmacy/Healthcare'
            WHEN cat_rand < 0.89 THEN 'Travel Booking'
            WHEN cat_rand < 0.97 THEN 'Insurance Premium'
            ELSE 'Miscellaneous Shopping'
          END
        -- Weekends: more Dining/Entertainment
        WHEN extract(isodow from day) IN (6, 7) THEN
          CASE
            WHEN cat_rand < 0.12 THEN 'Grocery Store - ' || to_char(day, 'Mon DD')
            WHEN cat_rand < 0.32 THEN 'Restaurant - ' || to_char(day, 'Mon DD')
            WHEN cat_rand < 0.40 THEN 'Gas Station'
            WHEN cat_rand < 0.50 THEN 'Amazon Purchase'
            WHEN cat_rand < 0.58 THEN 'Utility Bill - ' || to_char(day, 'YYYY-MM')
            WHEN cat_rand < 0.74 THEN 'Movie/Theater'
            WHEN cat_rand < 0.81 THEN 'Pharmacy/Healthcare'
            WHEN cat_rand < 0.93 THEN 'Travel Booking'
            WHEN cat_rand < 0.97 THEN 'Insurance Premium'
            ELSE 'Miscellaneous Shopping'
          END
        ELSE
          CASE
            WHEN cat_rand < 0.18 THEN 'Grocery Store - ' || to_char(day, 'Mon DD')
            WHEN cat_rand < 0.30 THEN 'Restaurant - ' || to_char(day, 'Mon DD')
            WHEN cat_rand < 0.40 THEN 'Gas Station'
            WHEN cat_rand < 0.52 THEN 'Amazon Purchase'
            WHEN cat_rand < 0.62 THEN 'Utility Bill - ' || to_char(day, 'YYYY-MM')
            WHEN cat_rand < 0.72 THEN 'Movie/Theater'
            WHEN cat_rand < 0.80 THEN 'Pharmacy/Healthcare'
            WHEN cat_rand < 0.93 THEN 'Travel Booking'
            WHEN cat_rand < 0.97 THEN 'Insurance Premium'
            ELSE 'Miscellaneous Shopping'
          END
      END
  END as description,
  
  (SELECT id FROM target_user) as "userId",
  
  -- Category - with direct subquery and fallback to Miscellaneous
  COALESCE(
    (
      SELECT id FROM "Category"
      WHERE "userId" = (SELECT id FROM target_user)
        AND name =
          CASE
            WHEN type_rand < 0.2 THEN
              CASE
                WHEN cat_rand < 0.45 THEN 'Salary'
                WHEN cat_rand < 0.70 THEN 'Freelance'
                WHEN cat_rand < 0.90 THEN 'Investment'
                ELSE 'Bonus'
              END
            ELSE
              CASE
                WHEN extract(month from day) IN (11, 12) THEN
                  CASE
                    WHEN cat_rand < 0.15 THEN 'Groceries'
                    WHEN cat_rand < 0.24 THEN 'Dining Out'
                    WHEN cat_rand < 0.30 THEN 'Transportation'
                    WHEN cat_rand < 0.54 THEN 'Shopping'
                    WHEN cat_rand < 0.61 THEN 'Utilities'
                    WHEN cat_rand < 0.69 THEN 'Entertainment'
                    WHEN cat_rand < 0.75 THEN 'Healthcare'
                    WHEN cat_rand < 0.93 THEN 'Travel'
                    WHEN cat_rand < 0.97 THEN 'Insurance'
                    ELSE 'Miscellaneous'
                  END
                WHEN extract(month from day) IN (6, 7, 8) THEN
                  CASE
                    WHEN cat_rand < 0.14 THEN 'Groceries'
                    WHEN cat_rand < 0.24 THEN 'Dining Out'
                    WHEN cat_rand < 0.33 THEN 'Transportation'
                    WHEN cat_rand < 0.42 THEN 'Shopping'
                    WHEN cat_rand < 0.50 THEN 'Utilities'
                    WHEN cat_rand < 0.63 THEN 'Entertainment'
                    WHEN cat_rand < 0.70 THEN 'Healthcare'
                    WHEN cat_rand < 0.92 THEN 'Travel'
                    WHEN cat_rand < 0.96 THEN 'Insurance'
                    ELSE 'Miscellaneous'
                  END
                WHEN extract(month from day) IN (1, 2, 3) THEN
                  CASE
                    WHEN cat_rand < 0.18 THEN 'Groceries'
                    WHEN cat_rand < 0.27 THEN 'Dining Out'
                    WHEN cat_rand < 0.35 THEN 'Transportation'
                    WHEN cat_rand < 0.43 THEN 'Shopping'
                    WHEN cat_rand < 0.59 THEN 'Utilities'
                    WHEN cat_rand < 0.66 THEN 'Entertainment'
                    WHEN cat_rand < 0.75 THEN 'Healthcare'
                    WHEN cat_rand < 0.89 THEN 'Travel'
                    WHEN cat_rand < 0.97 THEN 'Insurance'
                    ELSE 'Miscellaneous'
                  END
                WHEN extract(isodow from day) IN (6, 7) THEN
                  CASE
                    WHEN cat_rand < 0.12 THEN 'Groceries'
                    WHEN cat_rand < 0.32 THEN 'Dining Out'
                    WHEN cat_rand < 0.40 THEN 'Transportation'
                    WHEN cat_rand < 0.50 THEN 'Shopping'
                    WHEN cat_rand < 0.58 THEN 'Utilities'
                    WHEN cat_rand < 0.74 THEN 'Entertainment'
                    WHEN cat_rand < 0.81 THEN 'Healthcare'
                    WHEN cat_rand < 0.93 THEN 'Travel'
                    WHEN cat_rand < 0.97 THEN 'Insurance'
                    ELSE 'Miscellaneous'
                  END
                ELSE
                  CASE
                    WHEN cat_rand < 0.18 THEN 'Groceries'
                    WHEN cat_rand < 0.30 THEN 'Dining Out'
                    WHEN cat_rand < 0.40 THEN 'Transportation'
                    WHEN cat_rand < 0.52 THEN 'Shopping'
                    WHEN cat_rand < 0.62 THEN 'Utilities'
                    WHEN cat_rand < 0.72 THEN 'Entertainment'
                    WHEN cat_rand < 0.80 THEN 'Healthcare'
                    WHEN cat_rand < 0.93 THEN 'Travel'
                    WHEN cat_rand < 0.97 THEN 'Insurance'
                    ELSE 'Miscellaneous'
                  END
              END
          END
      LIMIT 1
    ),
    (
      SELECT id FROM "Category"
      WHERE "userId" = (SELECT id FROM target_user) AND name = 'Miscellaneous'
      LIMIT 1
    ),
    (
      SELECT id FROM "Category"
      WHERE "userId" = (SELECT id FROM target_user)
      ORDER BY id
      LIMIT 1
    )
  ) as "categoryId",
  
  NOW() as "createdAt"
  
FROM daily_transactions
CROSS JOIN target_user
WHERE EXISTS (SELECT 1 FROM target_user)
ON CONFLICT (id) DO NOTHING;

-- Add recurring monthly bills for all months
WITH target_user AS (
  SELECT id FROM "User" WHERE id = :'user_id'
),
months AS (
  SELECT generate_series(
    '2025-01-01'::date,
    '2027-12-01'::date,
    interval '1 month'
  )::date as month_start
),
bills_data AS (
  SELECT
    month_start + (interval '1 day' * (5 + (random() * 20)::int)) as bill_date,
    bill_type,
    amount
  FROM months,
  LATERAL (VALUES 
    ('Rent/Mortgage', 1800 + (random() * 400)::int),
    ('Utilities', 150 + (random() * 100)::int),
    ('Insurance', 120 + (random() * 50)::int),
    ('Subscriptions', 45 + (random() * 30)::int),
    ('Education', 200 + (random() * 300)::int),
    ('Travel', 100 + (random() * 500)::int)
  ) AS bills(bill_type, amount)
)
INSERT INTO "Transaction" (
  id, amount, type, date, description, "userId", "categoryId", "createdAt"
)
SELECT
  'txn_recur_' || to_char(bill_date, 'YYYYMMDD') || '_' || substr(md5(bill_type || amount::text || random()::text), 1, 6),
  amount::numeric(12,2),
  'EXPENSE'::"TransactionType",
  (bill_date + time '09:00')::timestamp,
  'Monthly ' || bill_type || ' - ' || to_char(bill_date, 'YYYY-MM'),
  (SELECT id FROM target_user),
  COALESCE(
    (
      SELECT id FROM "Category"
      WHERE "userId" = (SELECT id FROM target_user) AND name = bill_type
      LIMIT 1
    ),
    (
      SELECT id FROM "Category"
      WHERE "userId" = (SELECT id FROM target_user) AND name = 'Miscellaneous'
      LIMIT 1
    ),
    (
      SELECT id FROM "Category"
      WHERE "userId" = (SELECT id FROM target_user)
      ORDER BY id
      LIMIT 1
    )
  ),
  NOW()
FROM bills_data
WHERE EXISTS (SELECT 1 FROM target_user)
ON CONFLICT (id) DO NOTHING;

-- Summary report
WITH target_user AS (
  SELECT id FROM "User" WHERE id = :'user_id'
),
stats AS (
  SELECT
    COUNT(*) as total_transactions,
    COUNT(*) FILTER (WHERE type = 'INCOME') as income_count,
    COUNT(*) FILTER (WHERE type = 'EXPENSE') as expense_count,
    SUM(amount) FILTER (WHERE type = 'INCOME') as total_income,
    SUM(amount) FILTER (WHERE type = 'EXPENSE') as total_expense,
    MIN(date) as earliest_txn,
    MAX(date) as latest_txn,
    EXTRACT(DAY FROM (MAX(date) - MIN(date))) + 1 as date_range_days
  FROM "Transaction"
  WHERE "userId" = (SELECT id FROM target_user)
    AND date >= '2025-01-01'
    AND date < '2028-01-01'
)
SELECT
  total_transactions,
  income_count,
  expense_count,
  ROUND(100.0 * expense_count / NULLIF(total_transactions, 0), 1) as expense_percent,
  total_income::numeric(12,2) as total_income,
  total_expense::numeric(12,2) as total_expense,
  (total_income - total_expense)::numeric(12,2) as net_savings,
  earliest_txn::date as earliest_date,
  latest_txn::date as latest_date,
  ROUND(total_transactions::numeric / NULLIF(date_range_days, 0), 2) as avg_daily_transactions,
  ROUND(total_expense::numeric / 3, 2) as avg_yearly_expense
FROM stats;

-- Show sample of transactions per day to verify
WITH target_user AS (
  SELECT id FROM "User" WHERE id = :'user_id'
)
SELECT 
  date::date as day,
  COUNT(*) as transactions_per_day,
  SUM(CASE WHEN type = 'INCOME' THEN 1 ELSE 0 END) as income_count,
  SUM(CASE WHEN type = 'EXPENSE' THEN 1 ELSE 0 END) as expense_count,
  SUM(amount)::numeric(12,2) as total_amount
FROM "Transaction"
WHERE "userId" = (SELECT id FROM target_user)
  AND date >= '2025-01-01'
  AND date < '2025-01-08'  -- First week inclusive (Jan 1 to Jan 7)
GROUP BY date::date
ORDER BY day;
