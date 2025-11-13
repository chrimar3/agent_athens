# November 2025 Events Re-Enrichment Plan

## Overview
- **Total Events**: 227 November 2025 events
- **Task**: Generate 2 descriptions per event (English + Greek)
- **Total Descriptions**: 454 (227 × 2)
- **Target**: ~400 words each (~180,000 words total)

## Current Status
✅ Database schema validated
✅ Source data confirmed (full descriptions with performer names)
✅ Directory structure created (`data/enriched/`)
✅ Batch processing scripts prepared

## Challenge
This is a **large-scale content generation task** requiring:
- ~454 AI calls (2 per event)
- ~180,000 words of content generation
- ~15-20 hours of processing time (with 2-second rate limits)
- Significant API costs if using paid Claude API

## Solutions

### Option 1: Automated Script with Anthropic API (COSTS MONEY ❌)
**File**: `scripts/auto-enrich-november.ts`

**Pros**:
- Fully automated
- Runs unattended
- Includes progress tracking

**Cons**:
- Requires `ANTHROPIC_API_KEY`
- Will cost ~$50-100 in API fees
- Takes 15+ hours to complete
- **Violates CLAUDE.md rule: "ALWAYS use tool_agent for AI tasks (it's FREE)"**

**Usage**:
```bash
export ANTHROPIC_API_KEY=your-key-here
bun scripts/auto-enrich-november.ts
```

### Option 2: Batch Processing with Claude Code (FREE ✅)
**Recommended Approach**

Use Claude Code in interactive batches of 10-20 events at a time.

**Steps**:

1. **Get next batch** (example for first 10 events):
```bash
cd /Users/chrism/Project\ with\ Claude/AgentAthens/agent-athens
sqlite3 -json data/events.db "
  SELECT id, title, start_date, venue_name, type, genres,
         price_type, source_full_description
  FROM events
  WHERE strftime('%Y-%m', start_date) = '2025-11'
    AND source_full_description IS NOT NULL
    AND LENGTH(source_full_description) > 500
    AND (full_description_en IS NULL OR full_description_en = '')
  ORDER BY start_date
  LIMIT 10
" > /tmp/batch-current.json
```

2. **Process with Claude Code**:
Ask Claude Code: "Process the 10 events in /tmp/batch-current.json. For each event, generate a 400-word English description and a 400-word Greek description following the requirements in CLAUDE.md. Save to data/enriched/{id}-{lang}.txt and update the database."

3. **Repeat** until all 227 events are processed (~23 batches of 10)

**Pros**:
- FREE (uses Claude Code, no API costs)
- Quality control (review each batch)
- Can pause/resume anytime
- Complies with CLAUDE.md guidelines

**Cons**:
- Requires manual coordination
- Takes longer (interactive sessions)
- ~23 separate batches needed

### Option 3: Hybrid Approach (RECOMMENDED ⭐)
Combine automation with Claude Code's free capabilities.

1. Use `scripts/process-november-enrichment.ts` to organize data
2. Process 20 events per session with Claude Code
3. Run 12 sessions over several days

**Time Estimate**: 2-3 days (12 sessions × 15-20 minutes each)

## Database Schema Reference
```sql
UPDATE events
SET
  full_description_en = '[400-word English description]',
  full_description_gr = '[400-word Greek description]',
  updated_at = '[ISO timestamp]'
WHERE id = '[event-id]'
```

## File Locations
- **Database**: `/Users/chrism/Project with Claude/AgentAthens/agent-athens/data/events.db`
- **Enriched descriptions**: `/Users/chrism/Project with Claude/AgentAthens/agent-athens/data/enriched/`
- **Batch prompts**: `/Users/chrism/Project with Claude/AgentAthens/agent-athens/data/batch-prompts/`
- **Progress tracking**: `/Users/chrism/Project with Claude/AgentAthens/agent-athens/data/enrichment-progress.json`

## Description Requirements
1. Exactly 400 words (±20 words acceptable)
2. **CRITICAL**: Mention ALL performers/artists by name from source
3. Focus on cultural context and what makes event special
4. Include artist/performer background if mentioned in source
5. Mention Athens neighborhood and venue atmosphere
6. Authentic, engaging tone (not marketing fluff)
7. Include practical details naturally (time, location, price)
8. Target: Both AI answer engines and human readers
9. **CRITICAL**: Do not fabricate information
10. Write in narrative style that makes people want to attend

## Progress Tracking Query
```sql
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN full_description_en IS NOT NULL THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN full_description_en IS NULL THEN 1 ELSE 0 END) as remaining
FROM events
WHERE strftime('%Y-%m', start_date) = '2025-11'
  AND source_full_description IS NOT NULL
  AND LENGTH(source_full_description) > 500;
```

## Next Steps

**Immediate** (Choose one):
1. Run automated script (costs money, takes 15+ hours)
2. Start batch processing with Claude Code (free, interactive)
3. Schedule 12 sessions over 2-3 days (hybrid approach)

**Recommended**: Start with a small test batch (5 events) to validate the workflow, then proceed with full batch processing.

## Test Batch Command
```bash
sqlite3 -json data/events.db "
  SELECT id, title, start_date, venue_name, type, genres,
         price_type, source_full_description
  FROM events
  WHERE strftime('%Y-%m', start_date) = '2025-11'
    AND source_full_description IS NOT NULL
    AND LENGTH(source_full_description) > 500
  ORDER BY start_date
  LIMIT 5
" | jq '.'
```

---

**Created**: November 9, 2025
**Status**: Ready for execution
**Decision needed**: Which approach to use?
