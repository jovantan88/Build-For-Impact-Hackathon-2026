-- Quick Helper: Get Your User ID
-- Run this first to find your user ID, then use it in the test data script

-- Option 1: If you know your email
SELECT id, email 
FROM auth.users 
WHERE email = 'your-email@example.com';  -- Replace with your actual email

-- Option 2: Get all users (if you only have one)
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;

-- Copy the 'id' value and use it in test-waste-data.sql
