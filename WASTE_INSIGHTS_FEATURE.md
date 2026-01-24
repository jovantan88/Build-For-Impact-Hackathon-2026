# Fridge-to-Market Feedback Loop Feature

## Overview

This feature implements a **systems thinking approach to food waste reduction** by closing the loop between consumption patterns and purchasing decisions. After tracking ingredients for a few weeks, the app analyzes waste patterns and provides personalized shopping recommendations.

## How It Works

### 1. **Automatic Waste Tracking**
- When ingredients with expiry dates are deleted from the database, they're automatically logged as waste events
- Tracks: ingredient name, quantity, expiry date, and whether it expired or was discarded

### 2. **Pattern Analysis** 
- After accumulating data over ~3-4 weeks, the system analyzes:
  - Which ingredients get wasted most frequently
  - Waste rate per ingredient (e.g., "3 out of 4 times")
  - Total potential savings

### 3. **AI-Powered Recommendations**
The app generates culturally-aware, actionable suggestions:
- **"Buy half bundle"** - Reduce portion sizes
- **"Skip this week"** - Take a break from frequently wasted items
- **"Try frozen spinach"** - Suggest longer-lasting alternatives
- **"Freeze portions"** - Extend shelf life of fresh ingredients

### 4. **Smart Recommendations**
- Focuses on SEA (Southeast Asian) cooking patterns and substitutions
- Considers local ingredients and preservation methods
- Provides estimated monthly savings
- Non-judgmental, encouraging tone

## Implementation Components

### Database Schema
**Location:** `supabase/waste-tracking-migration.sql`

Three new tables:
1. **waste_events** - Logs each expired/discarded ingredient
2. **purchase_recommendations** - Stores AI-generated shopping advice
3. **shopping_insights** - Aggregated user stats and savings potential

### AI Functions
**Location:** `src/lib/ai/waste-insights.ts`

- `generatePurchaseRecommendations()` - Uses GPT-4o-mini to analyze patterns and create personalized advice
- `generateInsightSummary()` - Creates encouraging, actionable summary text

### API Endpoint
**Location:** `src/app/api/insights/route.ts`

- `GET /api/insights` - Analyzes patterns and returns recommendations
- `POST /api/insights` - Dismiss or accept recommendations

### UI Component  
**Location:** `src/app/(main)/insights/page.tsx`

New "Insights" tab showing:
- Waste pattern summary with total events and savings potential
- Most wasted items ranked by frequency
- Personalized shopping recommendations with actions
- Beautiful, intuitive cards with color-coded recommendation types

## Setup Instructions

### 1. Run Database Migration
```sql
-- In Supabase SQL Editor, run:
-- Copy contents of supabase/waste-tracking-migration.sql
```

### 2. No Code Changes Needed
All features are automatically integrated:
- Waste tracking triggers when ingredients are deleted
- New "Insights" tab appears in bottom navigation
- Recommendations generate on-demand

### 3. Test the Feature

#### Option A: Manual Testing (Quick)
```sql
-- Insert test waste data directly in Supabase
INSERT INTO waste_events (user_id, ingredient_name, event_type, quantity, unit, waste_date)
VALUES 
  (your_user_id, 'spinach', 'expired', 1, 'bundle', NOW() - INTERVAL '1 day'),
  (your_user_id, 'spinach', 'expired', 1, 'bundle', NOW() - INTERVAL '8 days'),
  (your_user_id, 'spinach', 'expired', 1, 'bundle', NOW() - INTERVAL '15 days'),
  (your_user_id, 'milk', 'expired', 1, 'liter', NOW() - INTERVAL '3 days'),
  (your_user_id, 'milk', 'expired', 1, 'liter', NOW() - INTERVAL '10 days');
```

#### Option B: Natural Usage
1. Add ingredients with expiry dates to your fridge
2. Let them expire and delete them
3. After 3-4 occurrences of the same ingredient, insights will appear

### 4. View Insights
- Navigate to the "Insights" tab in bottom navigation
- Click "Refresh" or reload page to regenerate recommendations

## Example Output

### Scenario: User wastes spinach 3 out of 4 times

**Insight Summary:**
> "You've wasted spinach 3 out of 4 weeks. Making small changes could save you about $12/month. Let's optimize your shopping!"

**Recommendation:**
```
🌿 Spinach
Wasted 3 out of 4 times (75%)

💡 Try frozen spinach instead - lasts months and works 
   great in curries and stir-fries

🔄 Try instead: frozen spinach
💰 Potential savings: $5.50/month
```

## Why This Is Big

### 1. **Systems Thinking**
Goes beyond recipes to address root cause - overconsumption patterns

### 2. **Personal Data → Sustainability Insight**
Turns individual behavior into actionable environmental impact

### 3. **Closed Loop System**
- Purchase → Track → Use → Waste → Analyze → Adjust Purchase
- Creates a self-optimizing system

### 4. **Cultural Awareness**
- Understands SEA cooking patterns (batch cooking, fresh ingredients)
- Suggests culturally-appropriate substitutions
- Respects local food availability and preferences

### 5. **Behavioral Change**
- Non-judgmental, encouraging approach
- Specific, achievable actions
- Quantified impact (savings in dollars)
- Immediate feedback loop

## Future Enhancements

### Phase 2
- [ ] Shopping list generation based on recommendations
- [ ] Integration with grocery delivery APIs
- [ ] Household size and cooking frequency customization
- [ ] Seasonal pattern analysis

### Phase 3
- [ ] Community benchmarking ("You waste 20% less than average")
- [ ] Gamification (waste reduction streaks, achievements)
- [ ] Carbon footprint calculation
- [ ] Donation/composting tracking for unusable items

## Technical Notes

- Uses OpenAI GPT-4o-mini for recommendation generation ($0.15/$0.60 per 1M tokens)
- Fallback logic if AI fails (rule-based recommendations)
- Privacy-first: All data stays in user's Supabase instance
- Optimized queries with proper indexing
- Real-time updates with efficient caching

## Support

For issues or questions:
1. Check database migration ran successfully
2. Verify OpenAI API key is configured
3. Check browser console for errors
4. Review Supabase logs for RPC function errors
