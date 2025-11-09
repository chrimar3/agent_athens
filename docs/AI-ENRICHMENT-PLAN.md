# AI Enrichment Plan - Agent Athens

**Date**: November 3, 2025
**Priority**: 🔴 CRITICAL (Blocks SEO/GEO optimization)
**Current Status**: 1/1,038 events enriched (0.1%)
**Target**: 100% of upcoming events enriched with 400-word descriptions

---

## Problem Statement

Agent Athens needs **400-word AI-generated descriptions** for every event to optimize for AI answer engines (ChatGPT, Perplexity, Claude). Currently, only 1 event has a full description.

**Why 400 words?**
- Long enough for rich context and SEO keywords
- Short enough to remain readable
- Optimal length for AI citation in answer engines
- Provides cultural context that scraped descriptions lack

---

## Current Database State

### Statistics (as of Nov 3, 2025)
```
Total events: 1,038
Upcoming events: 732
Events with full_description: 1 (0.1%)
Events needing enrichment: 731 (99.9%)
```

### Database Schema
```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,                -- Short description from scraping (~100 words)
  full_description TEXT,           -- AI-generated 400-word description (TARGET)

  start_date TEXT NOT NULL,
  end_date TEXT,

  type TEXT NOT NULL,              -- concert|exhibition|cinema|theater|performance|workshop|other
  genres TEXT,                     -- JSON array

  venue_name TEXT NOT NULL,
  venue_address TEXT,
  venue_neighborhood TEXT,

  price_type TEXT NOT NULL,        -- free|paid|donation
  price_amount REAL,
  price_currency TEXT,

  url TEXT,
  source TEXT NOT NULL
);
```

---

## AI Enrichment Requirements

### Input Data (Per Event)
```json
{
  "title": "Jazz Night at Six D.O.G.S",
  "description": "Live jazz performance featuring local musicians",
  "type": "concert",
  "genres": ["jazz", "live-music"],
  "venue_name": "Six D.O.G.S",
  "venue_neighborhood": "Monastiraki",
  "start_date": "2025-11-15",
  "time": "21:00",
  "price_type": "paid",
  "price_amount": 15.00,
  "url": "https://example.com/event"
}
```

### Output Required
```json
{
  "full_description": "A 400-word narrative description..."
}
```

**Word Count**: 380-420 words (strict requirement)

---

## AI Prompt Template

Use this exact prompt for each event:

```
Generate a compelling 400-word description for this cultural event in Athens, Greece.

Event Details:
- Title: {title}
- Type: {type}
- Venue: {venue_name}
- Neighborhood: {venue_neighborhood}
- Date: {start_date}
- Time: {time}
- Genre: {genres}
- Price: {price_type} ({price_amount} EUR if paid)
- Short Description: {description}

Requirements:
1. Write exactly 400 words (±20 words acceptable)
2. Focus on cultural context and what makes this event special
3. Include artist/performer background if relevant
4. Mention the Athens neighborhood and venue atmosphere
5. Write in an authentic, engaging tone (not marketing fluff)
6. Include practical details naturally (time, location, price)
7. Target audience: Both AI answer engines and human readers

CRITICAL: Do not fabricate information. Only use the details provided above.
If information is unavailable, omit that detail.

Write in a narrative style that would make someone want to attend.
```

---

## Implementation Options

### Option 1: Manual Processing (FREE - Use `tool_agent`)
**Location**: Claude Code (current environment)
**Method**: Use `tool_agent` in batches

**Pros**:
- ✅ FREE (no API costs)
- ✅ Already integrated
- ✅ Can process in background

**Cons**:
- ❌ Rate limited (minimum 2 seconds between calls)
- ❌ Takes ~24 minutes for 731 events
- ❌ Requires monitoring

**Commands**:
```bash
# Check events needing enrichment
echo "SELECT COUNT(*) FROM events WHERE full_description IS NULL OR full_description = '' AND date(start_date) >= date('now');" | sqlite3 data/events.db

# Run enrichment (in batches)
bun run scripts/enrich-events.ts --limit 50
```

---

### Option 2: Claude API (PAID - Faster)
**Location**: External script with Anthropic API
**Method**: Batch API calls with rate limiting

**Pros**:
- ✅ Faster processing
- ✅ Better control over batching
- ✅ Can run in background

**Cons**:
- ❌ Costs money (~$0.03 per event × 731 = ~$22)
- ❌ Requires API key setup
- ❌ Needs payment method

**Estimated Cost**:
```
Input tokens: ~200 per event
Output tokens: ~400 per event
Cost per event: ~$0.03
Total: 731 events × $0.03 = ~$22
```

---

## Existing Scripts

### 1. `scripts/enrich-events.ts` (Bun/TypeScript)
**Status**: ✅ Exists, uses `tool_agent`
**Location**: `scripts/enrich-events.ts`

**How it works**:
1. Queries database for events with `full_description IS NULL`
2. Calls `tool_agent` with enrichment prompt
3. Validates word count (380-420 words)
4. Updates database with AI-generated description
5. Rate limits: 2-second delay between events

**Usage**:
```bash
# Enrich all events
bun run scripts/enrich-events.ts

# Enrich 5 events (testing)
bun run scripts/enrich-5-events.ts

# Enrich with limit
bun run scripts/enrich-events.ts --limit 100
```

---

### 2. `scripts/enrich-5-events.ts` (Testing Script)
**Status**: ✅ Exists
**Purpose**: Test enrichment on 5 events

**Usage**:
```bash
bun run scripts/enrich-5-events.ts
```

**Output**:
- Enriches 5 upcoming events
- Shows word counts
- Displays success/failure summary

---

## Database Queries

### Check Enrichment Status
```sql
-- Count events needing enrichment
SELECT COUNT(*) as need_enrichment
FROM events
WHERE (full_description IS NULL OR full_description = '')
  AND date(start_date) >= date('now');

-- Events by source (identify priorities)
SELECT source, COUNT(*) as count
FROM events
WHERE (full_description IS NULL OR full_description = '')
  AND date(start_date) >= date('now')
GROUP BY source
ORDER BY count DESC;

-- Sample events to enrich
SELECT id, title, type, venue_name, start_date
FROM events
WHERE (full_description IS NULL OR full_description = '')
  AND date(start_date) >= date('now')
ORDER BY start_date ASC
LIMIT 10;
```

### Verify Enrichment Quality
```sql
-- Check word counts of enriched events
SELECT
  title,
  LENGTH(full_description) - LENGTH(REPLACE(full_description, ' ', '')) + 1 as word_count
FROM events
WHERE full_description IS NOT NULL
  AND full_description != ''
ORDER BY word_count DESC;

-- Find events with too short/long descriptions
SELECT title,
  LENGTH(full_description) - LENGTH(REPLACE(full_description, ' ', '')) + 1 as word_count
FROM events
WHERE full_description IS NOT NULL
  AND (
    (LENGTH(full_description) - LENGTH(REPLACE(full_description, ' ', '')) + 1) < 380
    OR (LENGTH(full_description) - LENGTH(REPLACE(full_description, ' ', '')) + 1) > 420
  );
```

---

## Enrichment Workflow

### Phase 1: Testing (5-10 events)
1. Run test script: `bun run scripts/enrich-5-events.ts`
2. Verify word counts (380-420)
3. Check quality manually (read 2-3 descriptions)
4. Validate database updates

### Phase 2: Batch Processing (731 events)
**Option A: Using `tool_agent` (FREE)**
```bash
# Process in batches of 50 (safer for monitoring)
bun run scripts/enrich-events.ts --limit 50

# Check progress
echo "SELECT COUNT(*) FROM events WHERE full_description IS NOT NULL;" | sqlite3 data/events.db

# Continue until complete
bun run scripts/enrich-events.ts --limit 50  # Repeat
```

**Option B: Using Claude API (PAID)**
```bash
# Set up API key
export ANTHROPIC_API_KEY="your-key-here"

# Run full enrichment
bun run scripts/enrich-events-api.ts  # (need to create this)
```

### Phase 3: Quality Check
1. Count enriched events: `./scripts/check-stats.sh`
2. Check word count distribution
3. Manually review 5-10 random descriptions
4. Verify no fabricated information

### Phase 4: Rebuild Site
```bash
# Generate static site with enriched descriptions
bun run build

# Deploy to Netlify
git add dist/ data/events.db
git commit -m "feat: AI-enriched event descriptions (731 events)"
git push origin main
```

---

## Expected Timeline

### Using `tool_agent` (FREE)
```
Events to enrich: 731
Rate limit: 2 seconds per event
Total time: 731 × 2s = 1,462 seconds = 24.4 minutes
```

**Batching Strategy** (recommended):
- Batch 1: 100 events (~3 minutes)
- Batch 2: 100 events (~3 minutes)
- Batch 3: 100 events (~3 minutes)
- Batch 4: 100 events (~3 minutes)
- Batch 5: 100 events (~3 minutes)
- Batch 6: 100 events (~3 minutes)
- Batch 7: 131 events (~4 minutes)
- **Total**: ~22 minutes (with monitoring breaks)

### Using Claude API (PAID)
```
Events to enrich: 731
Rate limit: 50 requests/minute (API limit)
Batches: 15 batches of 50 events
Total time: ~15 minutes
Cost: ~$22
```

---

## Quality Validation Rules

### Automatic Checks (in script)
✅ Word count: 380-420 words
✅ No empty strings
✅ No null values
✅ Length > 1,000 characters

### Manual Checks (sample 5-10)
✅ No fabricated information
✅ Culturally appropriate tone
✅ Includes venue/neighborhood context
✅ Natural mention of practical details
✅ Engaging narrative style

---

## Example Input/Output

### Input Event
```json
{
  "title": "Stacey Kent Trio",
  "type": "concert",
  "genres": ["jazz", "vocal", "bossa-nova"],
  "venue_name": "MEGARON - The Athens Concert Hall",
  "venue_neighborhood": "Kolonaki",
  "start_date": "2025-11-13",
  "time": "21:00",
  "price_type": "paid",
  "price_amount": 40.00,
  "description": "Award-winning singer Stacey Kent returns with her unique voice and multilingual repertoire."
}
```

### Expected Output (400 words)
```
Award-winning jazz vocalist Stacey Kent brings her enchanting voice back to Athens for an intimate evening at the Megaron Concert Hall on November 13, 2025. The Grammy-nominated singer, accompanied by her exceptional trio featuring Art Hirahara on piano and her husband Jim Tomlinson on saxophone, will perform songs from her critically acclaimed albums "A Time for Love" and "Songs From Other Places."

Kent's unique ability to seamlessly blend jazz standards with chanson française and bossa nova has made her one of the most distinctive voices in contemporary jazz. Her multilingual repertoire—effortlessly moving between English, French, and Portuguese—reflects a deep appreciation for the romantic and poetic traditions of each culture. This Athens performance promises an evening of sophisticated elegance, where Kent's crystal-clear vocals and subtle phrasing create an atmosphere of intimacy even in the grand setting of Megaron.

The concert takes place in Athens' cultural heart, Kolonaki, where the Megaron Concert Hall stands as a beacon of world-class performance. The venue's exceptional acoustics will perfectly showcase the delicate interplay between Kent's voice and the trio's instrumental work. Known for her thoughtful song selection and literary influences, Kent often collaborates with Nobel Prize-winning author Kazuo Ishiguro, who has penned lyrics specifically for her albums.

Expect to hear reimagined classics alongside contemporary compositions, all delivered with the refined taste that has earned Kent a devoted international following. Her interpretations breathe new life into familiar melodies while her original material demonstrates why she's considered one of jazz's most compelling contemporary artists. The trio format allows for spontaneous moments of musical conversation, with Hirahara's melodic piano work and Tomlinson's lyrical saxophone providing the perfect complement to Kent's vocal artistry.

This performance represents a rare opportunity to experience one of jazz's most elegant voices in the intimate setting that her music deserves. The 21:00 start time sets the perfect mood for an evening of sophisticated entertainment. Tickets are priced at €40, offering excellent value for a world-class performance in one of Athens' premier venues.

For jazz enthusiasts and lovers of refined vocal music, this concert promises an unforgettable evening where timeless melodies meet contemporary interpretation, all delivered with the grace and sophistication that defines Stacey Kent's artistry.
```

**Word count**: 398 words ✅

---

## Files to Reference

### Scripts
- `scripts/enrich-events.ts` - Main enrichment script (uses `tool_agent`)
- `scripts/enrich-5-events.ts` - Test script (5 events)
- `scripts/check-stats.sh` - Database statistics

### Database
- `data/events.db` - SQLite database
- `data/events.sql` - Schema definition

### Documentation
- `docs/CLAUDE.md` - Project instructions (includes enrichment rules)
- `README.md` - Project overview

---

## Success Criteria

✅ **731 events enriched** (100% of upcoming events)
✅ **All descriptions 380-420 words**
✅ **No fabricated information**
✅ **Quality spot-check passes** (sample 10 events)
✅ **Site rebuilt and deployed**
✅ **SEO-optimized pages live**

---

## Next Steps (Copy to Claude UI)

1. **Review this document** - Understand the requirements
2. **Choose approach**: Free (`tool_agent`) vs Paid (API)
3. **Run test**: `bun run scripts/enrich-5-events.ts`
4. **Verify quality**: Check word counts and read samples
5. **Batch process**: Run enrichment in 100-event batches
6. **Quality check**: Verify final results
7. **Rebuild site**: `bun run build`
8. **Deploy**: Git commit + push

---

## Critical Reminders

⚠️ **DO NOT fabricate information** - Only use provided event data
⚠️ **Validate word counts** - 380-420 words (strict)
⚠️ **Rate limit**: 2 seconds between `tool_agent` calls
⚠️ **Save progress**: Database commits after each event
⚠️ **Monitor quality**: Spot-check every 100 events

---

## Support & Troubleshooting

### Issue: Word count off
**Fix**: Adjust prompt to emphasize exact word count

### Issue: Fabricated info
**Fix**: Review prompt, add "CRITICAL: Do not fabricate" warning

### Issue: Rate limit errors
**Fix**: Increase delay between calls (3-4 seconds)

### Issue: Database errors
**Fix**: Check schema, verify event ID exists

---

**Document Version**: 1.0
**Last Updated**: November 3, 2025
**Status**: 🔴 READY FOR IMPLEMENTATION
