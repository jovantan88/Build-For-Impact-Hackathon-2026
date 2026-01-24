-- Test Data Script for Waste Insights Feature
-- This creates sample waste events so you can see the insights feature in action
-- Replace 'f4692be7-b7bc-4d3f-86b9-1a33e35434f0' with your actual user ID from auth.users table

-- First, get your user ID by running this query:
-- SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- Then replace f4692be7-b7bc-4d3f-86b9-1a33e35434f0 below with the actual UUID

-- Insert test waste events for common ingredients
-- Simulating 4 weeks of data

-- Spinach: wasted 3 out of 4 times (75% waste rate)
INSERT INTO waste_events (user_id, ingredient_name, event_type, quantity, unit, waste_date, original_purchase_date)
VALUES 
  ('f4692be7-b7bc-4d3f-86b9-1a33e35434f0', 'spinach', 'expired', 1, 'bundle', NOW() - INTERVAL '2 days', NOW() - INTERVAL '9 days'),
  ('f4692be7-b7bc-4d3f-86b9-1a33e35434f0', 'spinach', 'expired', 1, 'bundle', NOW() - INTERVAL '9 days', NOW() - INTERVAL '16 days'),
  ('f4692be7-b7bc-4d3f-86b9-1a33e35434f0', 'spinach', 'expired', 1, 'bundle', NOW() - INTERVAL '16 days', NOW() - INTERVAL '23 days'),
  ('f4692be7-b7bc-4d3f-86b9-1a33e35434f0', 'spinach', 'used', 1, 'bundle', NOW() - INTERVAL '23 days', NOW() - INTERVAL '30 days');

-- Milk: wasted 2 out of 4 times (50% waste rate)
INSERT INTO waste_events (user_id, ingredient_name, event_type, quantity, unit, waste_date, original_purchase_date)
VALUES 
  ('f4692be7-b7bc-4d3f-86b9-1a33e35434f0', 'milk', 'expired', 1, 'liter', NOW() - INTERVAL '3 days', NOW() - INTERVAL '10 days'),
  ('f4692be7-b7bc-4d3f-86b9-1a33e35434f0', 'milk', 'used', 1, 'liter', NOW() - INTERVAL '10 days', NOW() - INTERVAL '17 days'),
  ('f4692be7-b7bc-4d3f-86b9-1a33e35434f0', 'milk', 'expired', 1, 'liter', NOW() - INTERVAL '17 days', NOW() - INTERVAL '24 days'),
  ('f4692be7-b7bc-4d3f-86b9-1a33e35434f0', 'milk', 'used', 1, 'liter', NOW() - INTERVAL '24 days', NOW() - INTERVAL '31 days');

-- Fresh herbs (cilantro): wasted 4 out of 4 times (100% waste rate)
INSERT INTO waste_events (user_id, ingredient_name, event_type, quantity, unit, waste_date, original_purchase_date)
VALUES 
  ('f4692be7-b7bc-4d3f-86b9-1a33e35434f0', 'cilantro', 'expired', 1, 'bunch', NOW() - INTERVAL '1 day', NOW() - INTERVAL '5 days'),
  ('f4692be7-b7bc-4d3f-86b9-1a33e35434f0', 'cilantro', 'expired', 1, 'bunch', NOW() - INTERVAL '8 days', NOW() - INTERVAL '12 days'),
  ('f4692be7-b7bc-4d3f-86b9-1a33e35434f0', 'cilantro', 'expired', 1, 'bunch', NOW() - INTERVAL '15 days', NOW() - INTERVAL '19 days'),
  ('f4692be7-b7bc-4d3f-86b9-1a33e35434f0', 'cilantro', 'discarded', 1, 'bunch', NOW() - INTERVAL '22 days', NOW() - INTERVAL '26 days');

-- Lettuce: wasted 2 out of 3 times (67% waste rate)
INSERT INTO waste_events (user_id, ingredient_name, event_type, quantity, unit, waste_date, original_purchase_date)
VALUES 
  ('f4692be7-b7bc-4d3f-86b9-1a33e35434f0', 'lettuce', 'expired', 1, 'head', NOW() - INTERVAL '4 days', NOW() - INTERVAL '11 days'),
  ('f4692be7-b7bc-4d3f-86b9-1a33e35434f0', 'lettuce', 'expired', 1, 'head', NOW() - INTERVAL '11 days', NOW() - INTERVAL '18 days'),
  ('f4692be7-b7bc-4d3f-86b9-1a33e35434f0', 'lettuce', 'used', 1, 'head', NOW() - INTERVAL '18 days', NOW() - INTERVAL '25 days');

-- Chicken: wasted 1 out of 4 times (25% waste rate - should not trigger recommendations)
INSERT INTO waste_events (user_id, ingredient_name, event_type, quantity, unit, waste_date, original_purchase_date)
VALUES 
  ('f4692be7-b7bc-4d3f-86b9-1a33e35434f0', 'chicken breast', 'used', 500, 'g', NOW() - INTERVAL '2 days', NOW() - INTERVAL '4 days'),
  ('f4692be7-b7bc-4d3f-86b9-1a33e35434f0', 'chicken breast', 'used', 500, 'g', NOW() - INTERVAL '9 days', NOW() - INTERVAL '11 days'),
  ('f4692be7-b7bc-4d3f-86b9-1a33e35434f0', 'chicken breast', 'used', 500, 'g', NOW() - INTERVAL '16 days', NOW() - INTERVAL '18 days'),
  ('f4692be7-b7bc-4d3f-86b9-1a33e35434f0', 'chicken breast', 'expired', 500, 'g', NOW() - INTERVAL '23 days', NOW() - INTERVAL '25 days');

-- After inserting, verify the data:
-- SELECT * FROM waste_events WHERE user_id = 'f4692be7-b7bc-4d3f-86b9-1a33e35434f0' ORDER BY waste_date DESC;

-- Then test the analysis function:
-- SELECT * FROM analyze_waste_patterns('f4692be7-b7bc-4d3f-86b9-1a33e35434f0');
