# More.com Integration - Complete Workflow

## Overview

More.com is a Tier-1 event aggregator providing **1,000+ events** across music, theater, and sports categories. This document describes the complete scraping → parsing → import workflow using the same high-quality Schema.org parser as viva.gr.

## Data Summary

**Source**: More.com tickets platform (more.com/gr-el/tickets/)
**Coverage**: 1,027 events (as of Oct 31, 2025)
- Music: 435 events
- Theater: 573 events
- Sports: 19 events

**Quality**: ⭐⭐⭐⭐⭐ (Perfect Schema.org structured data - identical to viva.gr)

## Complete Workflow

### Step 1: Scrape HTML with Playwright

**Script**: `scripts/scrape-all-sites.py`

```bash
cd /Users/chrism/Project\ with\ Claude/AgentAthens/agent-athens
python3 scripts/scrape-all-sites.py --site more
```

**Output**: HTML files saved to `data/html-to-parse/`:
- `2025-10-22-more-www-more-com-gr-el-tickets-music-.html` (1.2 MB, 435 events)
- `2025-10-22-more-www-more-com-gr-el-tickets-theater-.html` (3.8 MB, 573 events)
- `2025-10-22-more-www-more-com-gr-el-tickets-sports-.html` (174 KB, 19 events)

### Step 2: Parse HTML to JSON

**Script**: `parse_viva_events.py` (universal parser supporting both viva.gr and more.com)

```bash
# Parse music events
python3 parse_viva_events.py data/html-to-parse/2025-10-22-more-www-more-com-gr-el-tickets-music-.html

# Parse theater events
python3 parse_viva_events.py data/html-to-parse/2025-10-22-more-www-more-com-gr-el-tickets-theater-.html

# Parse sports events
python3 parse_viva_events.py data/html-to-parse/2025-10-22-more-www-more-com-gr-el-tickets-sports-.html
```

**Output**: JSON files in `data/parsed/`:
- `more-music-events.json` (435 events)
- `more-theater-events.json` (573 events)
- `more-sports-events.json` (19 events)

**Sample Event Structure**:
```json
{
  "title": "RELEASE ATHENS 2026 X SNF NOSTOS",
  "date": "2026-06-21",
  "time": "18:00",
  "venue": "Πολλαπλοι χωροι",
  "type": "concert",
  "genre": "rock",
  "price": "with-ticket",
  "url": "https://www.more.com/gr-el/tickets/music/...",
  "description": "RELEASE ATHENS X SNF NOSTOS 2026",
  "source": "more.com",
  "location": "Athens, Greece"
}
```

### Step 3: Import to Database

**Script**: `scripts/import-more-events.ts`

```bash
bun run scripts/import-more-events.ts
```

**What it does**:
1. Loads all `more-*.json` files from `data/parsed/`
2. Normalizes events to Schema.org format
3. Upserts to database (INSERT new, UPDATE existing)
4. Filters out non-Athens events (Thessaloniki, Patras, etc.)
5. Tracks NEW / UPDATED / SKIPPED events

**Sample Output**:
```
📥 Importing more.com parsed events into database...

📂 Found 3 more.com parsed files:
   - more-music-events.json
   - more-theater-events.json
   - more-sports-events.json

📊 Processing: more-music-events.json (435 events)
✅ Normalized 435 events

  🔄 UPDATED: RELEASE ATHENS 2026 X SNF NOSTOS (concert)
  ⏭️  SKIPPED: CATS - Thessaloniki (non-Athens)

📊 TOTAL MORE.COM IMPORT RESULTS:
  ✅ 0 new events inserted
  🔄 966 events updated (price/description changes)
  ⏭️  61 events skipped (non-Athens or already current)
  Total processed: 966 events
```

### Step 4: Deduplication & Filtering

```bash
# Preview deduplication
bun run scripts/remove-duplicates.ts --dry-run

# Apply deduplication
bun run scripts/remove-duplicates.ts
```

### Step 5: Rebuild Site

```bash
bun run build
```

---

## Technical Details

### Parser Features

**File**: `parse_viva_events.py`

- Universal parser for both viva.gr and more.com
- Extracts from Schema.org microdata
- Auto-detects source from filename
- Supports command-line arguments for any HTML file
- Automatically sets event type based on category
- Outputs RawEvent format compatible with normalizer

**Key Auto-Detection**:
```python
# Detect source from filename
if 'more' in html_file:
    source_name = 'more.com'
    source_prefix = 'more'
elif 'viva' in html_file:
    source_name = 'viva.gr'
    source_prefix = 'viva'

parser = VivaEventParser(default_type=default_type, source_name=source_name)
```

### Database Schema

Events are normalized to Schema.org Event format before database insert (see `docs/VIVA-GR-INTEGRATION.md` for full schema).

### Upsert Logic

**File**: `src/db/database.ts` → `upsertEvent()`

```sql
INSERT INTO events (...) VALUES (...)
ON CONFLICT(id) DO UPDATE SET
  title = excluded.title,
  description = excluded.description,
  price = excluded.price,
  updated_at = excluded.updated_at
```

**Returns**: `{ success: boolean, isNew: boolean }`

### Athens-Only Filtering

**File**: `src/db/database.ts` → `isAthensEvent()`

Filters out events with these keywords in venue/address:
- Thessaloniki / Θεσσαλονίκη
- Patras / Πάτρα
- Larissa / Λάρισα
- And other Greek cities

---

## Comparison: More.com vs Viva.gr

Both platforms use **identical Schema.org markup**:

| Feature | More.com | Viva.gr |
|---------|----------|---------|
| Event count | 1,027 | 1,041 |
| Schema.org markup | ✅ Perfect | ✅ Perfect |
| Actual times | ✅ Yes | ✅ Yes |
| Full descriptions | ✅ Yes | ✅ Yes |
| Genre data | ✅ Yes | ✅ Yes |
| Parser quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**Key Finding**: More.com and viva.gr are **separate platforms** sharing the same backend technology, resulting in:
- ~2,000 combined events from Tier-1 sources
- High overlap in events (same event listed on both platforms)
- Deduplication required to avoid duplicates

---

## Import Results (Oct 31, 2025)

**More.com Import**:
- Total events parsed: 1,027
- Imported to database: 966 (94%)
- Skipped (non-Athens): 61 (6%)

**Database Stats After Import**:
- Total events: 1,660
- Concerts: 1,054
- Theater: 269
- Performances: 261
- Others: 76

**Source Breakdown**:
- viva.gr: ~980 events
- more.com: ~966 events
- **Overlap**: ~286 duplicate events (requires deduplication)

---

## Next Steps

1. **Run deduplication**: `bun run scripts/remove-duplicates.ts --dry-run` then apply
2. **Rebuild site**: `bun run build`
3. **AI Enrichment**: Run `bun run scripts/enrich-events.ts` on new more.com events
4. **Automate daily imports**: Create cron job for both viva.gr and more.com

---

**Last Updated**: October 31, 2025
**Maintainer**: Agent Athens Team
