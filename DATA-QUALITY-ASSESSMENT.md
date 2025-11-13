# Data Quality Assessment - Agent Athens

**Date:** November 13, 2025
**Assessment:** Current data collection and filtering capabilities

---

## Quick Answer to Your Questions

### 1. ✅ Athens-Only Filtering: **PARTIALLY IMPLEMENTED**

**Status:** Athens filter EXISTS and WORKS, but has gaps

**What's Implemented:**
- ✅ Dedicated Athens filter (`src/utils/athens-filter.ts`)
- ✅ Filters out 13 non-Athens cities (Thessaloniki, Patras, Volos, etc.)
- ✅ Checks title, venue_name, venue_address, location fields
- ✅ Automatically applied during database import (`upsertEvent`)

**Current Issues:**
- ⚠️ **12 Thessaloniki events still in database** (filter not 100% effective)
- ⚠️ Filter is **passive** - only triggers during import, not during scraping
- ⚠️ Some events slip through with ambiguous venue names

**Evidence from Database:**
```sql
-- Total events: 528
-- Thessaloniki events: 12 (should be 0)
--   Examples:
--   - Θεατρο Τεχνων Θεσσαλονικης (1 event)
--   - Μεγαρο Μουσικης Θεσσαλονικης (11 events)
```

### 2. 🟡 Full Description Extraction: **PARTIAL**

**Status:** Full descriptions ARE captured, but only for 35% of events

**Evidence:**
- ✅ `source_full_description` field exists in database
- ✅ 185/528 events (35%) have full descriptions > 100 chars
- ✅ Longest descriptions: 6,000-9,000 characters (excellent!)
- ⚠️ 343/528 events (65%) have NULL or empty descriptions

**Sample Full Descriptions:**
```
Event: "Οι κάλπηδες 3ος χρόνος"
Description length: 9,156 characters ✅

Event: "Guitar Experience 2025"
Description length: 7,320 characters ✅

Event: "ΤΟ ΚΟΡΙΤΣΑΚΙ ΜΕ ΤΑ ΣΠΙΡΤΑ"
Description length: 6,601 characters ✅
```

**Why Some Events Lack Descriptions:**
1. Source website doesn't provide detailed descriptions
2. Scraper captures listing page, not individual event pages
3. Email newsletters often have minimal text

---

## Deep Dive: Data Collection System

### 📧 Email Ingestion (`scripts/ingest-emails.ts`)

**What It Does:**
- ✅ Connects to Gmail via IMAP
- ✅ Fetches unread newsletter emails
- ✅ Saves raw emails to `data/emails-to-parse/`
- ✅ Tracks processed Message-IDs (prevents reprocessing)
- ✅ Archives emails after processing

**What It Doesn't Do:**
- ❌ Doesn't parse event data automatically
- ❌ Doesn't filter Athens-only during fetching
- ❌ Doesn't extract cast/contributor info

**Manual Step Required:**
After emails are fetched, YOU manually ask Claude Code to:
1. Parse emails from `data/emails-to-parse/`
2. Extract: title, date, time, venue, type, genre, price, address, url, description
3. Filter Athens-only events
4. Insert into database

**Athens Filtering:**
- ⚠️ **NOT automatic** during email fetch
- ✅ Applied during manual parsing (when you ask Claude Code)
- ✅ Applied during database upsert

### 🕷️ Web Scraping (`scripts/scrape-all-sites.py`)

**What It Does:**
- ✅ Scrapes 3 tier-1 websites (Viva.gr, More.com, Gazarte.gr)
- ✅ Uses Playwright browser automation
- ✅ Saves complete HTML to `data/html-to-parse/`
- ✅ Resource blocking (images, fonts) for performance
- ✅ Respects crawl frequency tracking
- ✅ Greek locale (Europe/Athens timezone)

**What It Doesn't Do:**
- ❌ Doesn't parse event data automatically
- ❌ Doesn't filter Athens-only during scraping
- ❌ Doesn't extract cast/contributor info
- ❌ Doesn't fetch individual event pages (only listing pages)

**Current Scraping:**
```python
# Saves HTML to:
data/html-to-parse/2025-11-13-viva-concerts.html
data/html-to-parse/2025-11-13-more-theater.html
data/html-to-parse/2025-11-13-gazarte-events.html

# With metadata:
{
  "site_id": "viva",
  "site_name": "Viva.gr",
  "url": "https://www.viva.gr/events/concerts/",
  "fetched_at": "2025-11-13T08:00:00Z",
  "html_length": 204555
}
```

**Manual Step Required:**
After HTML is fetched, YOU manually ask Claude Code to:
1. Parse HTML from `data/html-to-parse/`
2. Extract event data + full descriptions
3. Filter Athens-only events
4. Insert into database

**Athens Filtering:**
- ❌ **NOT automatic** during scraping
- ✅ Applied during manual parsing (when you ask Claude Code)
- ✅ Applied during database upsert

---

## The "Claude Code Dependency" Problem

### Current Workflow:

```
1. AUTOMATED (8am daily):
   ├─ Fetch emails from Gmail       ✅
   ├─ Scrape website HTML            ✅
   └─ Save to data/emails-to-parse/ ✅
          and data/html-to-parse/   ✅

2. MANUAL (requires Claude Code):
   ├─ YOU ask Claude Code to parse data    ❌ Manual
   ├─ Claude Code extracts events          ❌ Manual
   ├─ Claude Code filters Athens-only      ❌ Manual
   └─ Claude Code imports to database      ❌ Manual
```

### Why Manual?

The original design **intentionally** uses Claude Code as the parser because:
- ✅ **FREE** - Uses tool_agent (no API costs)
- ✅ **Smart parsing** - Claude understands Greek text, venue names, ambiguous dates
- ✅ **No hardcoded rules** - Adapts to different website layouts
- ✅ **Human oversight** - You review data before importing

### The Trade-off:

| Approach | Pros | Cons |
|----------|------|------|
| **Current (Manual with Claude)** | FREE, smart parsing, quality control | Requires daily manual action |
| **Automated (Python/TypeScript)** | No manual work needed | Costs API fees, brittle parsing, misses edge cases |

---

## Cast & Contributor Data

### ✅ IS Captured (When Available)

**Evidence:**
```sql
-- Sample event with full cast/crew info:
SELECT source_full_description FROM events WHERE id = 'c828e649e75dae28';

-- Returns (6,424 chars):
"Ερμηνεία: Νίκος Καμτσής, Πάνος Σκουρολιάκος, Δημήτρης Φραγκιόγλου.
Μαζί τους η performer Ναταλί Φλουρή.
Σκηνοθεσία-Σκηνικό: Νίκος Καμτσής
Κοστούμια: Μίκα Πανάγου
Φωτογραφίες-promo video: Topos arte"
```

**Full cast/contributor info IS included when:**
- ✅ Source website provides it
- ✅ Newsletter email includes it
- ✅ Individual event page has detailed credits

**Missing when:**
- ❌ Source only has event listings (no detail pages)
- ❌ Newsletter is minimal (just title + date + venue)
- ❌ Scraper only fetches listing page, not individual event page

---

## Data Quality Metrics

### Current Database (528 events):

| Metric | Count | % | Quality |
|--------|-------|---|---------|
| **Total Events** | 528 | 100% | - |
| **Athens Events** | 516 | 98% | 🟡 Good (12 Thessaloniki slipped through) |
| **Has Full Description** | 185 | 35% | 🟡 Partial (65% missing) |
| **Enriched (Greek 400-word)** | 90 | 17% | 🟡 In Progress |
| **Has Price Info** | 528 | 100% | ✅ Excellent |
| **Has Date/Time** | 528 | 100% | ✅ Excellent |
| **Has Venue** | 528 | 100% | ✅ Excellent |

### Description Length Distribution:

```
No description:        343 events (65%)
Short (1-500 chars):    15 events (3%)
Medium (500-2000):      85 events (16%)
Long (2000-5000):       60 events (11%)
Very Long (5000+):      25 events (5%) ✅ Best quality
```

---

## Recommendations

### Priority 1: Improve Athens Filtering

**Problem:** 12 Thessaloniki events in database

**Solutions:**

1. **Stricter Filter (Quick Fix):**
```typescript
// Add to athens-filter.ts:
const THESSALONIKI_PATTERNS = [
  'Θεσσαλ',
  'Thessal',
  'Σαλονικ',
  'Μεγαρο Μουσικης Θεσσαλονικης',
  'Θεατρο Τεχνων Θεσσαλονικης'
];
```

2. **Venue Whitelist (Best Approach):**
```typescript
// Create athens-venues.json:
{
  "known_athens_venues": [
    "Six D.O.G.S",
    "Stavros tou Notou",
    "Gagarin 205",
    "Θεατρο Τοπος Αλλου",
    // ... 200+ venues
  ],
  "known_thessaloniki_venues": [
    "Μεγαρο Μουσικης Θεσσαλονικης",
    "Θεατρο Τεχνων Θεσσαλονικης"
  ]
}

// Filter: Only allow known Athens venues
```

3. **Geocoding (Advanced):**
```typescript
// Use Google Maps API to verify venue location
const location = await geocode(venue.address);
if (location.city !== 'Athens') {
  reject();
}
```

### Priority 2: Fetch Individual Event Pages

**Problem:** Only 35% of events have full descriptions

**Solution:** Enhance scraper to:

```python
# Current (listing page only):
fetch('https://www.viva.gr/events/concerts/')

# Improved (listing + individual pages):
fetch('https://www.viva.gr/events/concerts/')
  → Extract event URLs
  → Fetch each event page
  → Extract full description + cast/crew
```

**Implementation:**
```python
# In scrape-all-sites.py:
async def scrape_event_details(event_url: str):
    """Fetch individual event page for full description"""
    page = await context.new_page()
    await page.goto(event_url)

    # Extract:
    # - Full description (2000+ chars)
    # - Cast & crew credits
    # - Full venue address
    # - Ticket link

    return event_details
```

**Trade-off:**
- ✅ 100% events would have full descriptions
- ✅ Cast/crew info for all events
- ❌ ~10x slower (fetch 500+ pages instead of 3)
- ❌ Higher risk of rate limiting

### Priority 3: Automatic Parsing (Optional)

**Problem:** Manual Claude Code step required daily

**Solution 1: Hybrid (Smart):**
```bash
# Automated for simple cases, manual for complex
if is_simple_format(html):
  auto_parse_and_import()
else:
  save_for_claude_code_review()
```

**Solution 2: Scheduled Claude Code (Advanced):**
```bash
# GitHub Actions workflow:
- schedule: '0 9 * * *'  # 9am daily
- run: claude-code parse data/emails-to-parse/
```

---

## Summary: Your Questions Answered

### Q1: Are emails/scraping able to filter only Athens events?

**A:** **PARTIAL** ⚠️

- ✅ Athens filter EXISTS and works (~98% accurate)
- ✅ Applied automatically during database import
- ⚠️ 12 Thessaloniki events slipped through (2% error rate)
- ❌ Not applied during email fetch or web scraping
- ✅ Applied during manual Claude Code parsing

**Recommendation:** Add stricter filter or venue whitelist to hit 100%.

### Q2: Do they take all necessary data (full descriptions, cast/contributor)?

**A:** **PARTIAL** 🟡

**Full Descriptions:**
- ✅ YES for 35% of events (185/528)
- ✅ Captures 6,000-9,000 char descriptions when available
- ❌ NO for 65% of events (source doesn't provide)
- **Fix:** Scrape individual event pages, not just listings

**Cast/Contributor Info:**
- ✅ YES when included in source description
- ✅ Captured in `source_full_description` field
- ❌ NO when source only has minimal info
- **Fix:** Same as above - fetch individual event pages

### Q3: Do they parse properly?

**A:** **YES with manual oversight** ✅

- ✅ Claude Code parsing is smart and accurate
- ✅ Handles Greek text, ambiguous dates, venue variations
- ✅ FREE (uses tool_agent, no API costs)
- ⚠️ Requires manual daily action (YOU ask Claude to parse)
- ⚠️ Not fully automated

**Recommendation:** Keep current approach (quality over automation) or invest in automated parsing with human review.

---

## Action Items for Mentor Meeting

1. **Athens Filtering:** Show mentor the 98% accuracy, discuss 100% goal
2. **Description Coverage:** Explain 35% vs 100% trade-off (speed vs depth)
3. **Manual vs Auto:** Defend FREE manual approach vs PAID automation
4. **Next Steps:** Decide on:
   - Stricter Athens filter? (easy fix)
   - Individual event page scraping? (slower, more complete)
   - Automated parsing? (costs money, less oversight)

---

**Bottom Line:**

Your system WORKS and captures quality data. The gaps are:
1. Athens filtering: 98% → need 100%
2. Description coverage: 35% → could be 100% with deeper scraping
3. Automation: Manual parsing works but requires daily action

All fixable, just need to decide priorities vs trade-offs.

---

**Last Updated:** November 13, 2025
**Assessment by:** Claude Code
