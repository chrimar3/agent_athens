# Viva.gr Integration - Complete Workflow

## Overview

Viva.gr is a Tier-1 event aggregator providing **1,000+ events** across music, theater, and sports categories. This document describes the complete scraping → parsing → import workflow.

## Data Summary

**Source**: Viva.gr tickets platform (viva.gr/tickets/)
**Coverage**: 1,041 events (as of Oct 30, 2025)
- Music: 435 events
- Theater: 584 events
- Sports: 22 events

**Quality**: ⭐⭐⭐⭐⭐ (Perfect Schema.org structured data)

## Complete Workflow

### Step 1: Scrape HTML with Playwright

**Script**: `scripts/scrape-all-sites.py`

```bash
cd /Users/chrism/Project\ with\ Claude/AgentAthens/agent-athens
python3 scripts/scrape-all-sites.py --site viva
```

**Output**: HTML files saved to `data/html-to-parse/`:
- `2025-10-30-viva-www-viva-gr-tickets-music-.html` (1.2 MB, 435 events)
- `2025-10-30-viva-www-viva-gr-tickets-theater-.html` (3.8 MB, 584 events)
- `2025-10-30-viva-www-viva-gr-tickets-sports-.html` (174 KB, 22 events)

### Step 2: Parse HTML to JSON

**Script**: `parse_viva_events.py` (universal parser for all categories)

```bash
# Parse music events
python3 parse_viva_events.py data/html-to-parse/2025-10-30-viva-www-viva-gr-tickets-music-.html

# Parse theater events
python3 parse_viva_events.py data/html-to-parse/2025-10-30-viva-www-viva-gr-tickets-theater-.html

# Parse sports events
python3 parse_viva_events.py data/html-to-parse/2025-10-30-viva-www-viva-gr-tickets-sports-.html
```

**Output**: JSON files in `data/parsed/`:
- `viva-music-events.json` (435 events)
- `viva-theater-events.json` (584 events)
- `viva-sports-events.json` (22 events)

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
  "url": "https://www.viva.gr/gr-el/tickets/music/...",
  "description": "RELEASE ATHENS X SNF NOSTOS 2026",
  "source": "viva.gr",
  "location": "Athens, Greece"
}
```

### Step 3: Import to Database

**Script**: `scripts/import-viva-events.ts`

```bash
bun run scripts/import-viva-events.ts
```

**What it does**:
1. Loads all `viva-*.json` files from `data/parsed/`
2. Normalizes events to Schema.org format
3. Upserts to database (INSERT new, UPDATE existing)
4. Filters out non-Athens events (Thessaloniki, Patras, etc.)
5. Tracks NEW / UPDATED / SKIPPED events

**Sample Output**:
```
📥 Importing viva.gr parsed events into database...

📂 Found 3 viva.gr parsed files:
   - viva-music-events.json
   - viva-theater-events.json
   - viva-sports-events.json

📊 Processing: viva-music-events.json (435 events)
✅ Normalized 435 events

  ✅ NEW: RELEASE ATHENS 2026 X SNF NOSTOS (concert)
  🔄 UPDATED: Κώστας Τουρνάς - Διονύσης Τσακνής (concert)
  ⏭️  SKIPPED: CATS - Thessaloniki (non-Athens)

📊 TOTAL VIVA.GR IMPORT RESULTS:
  ✅ 216 new events inserted
  🔄 764 events updated (price/description changes)
  ⏭️  61 events skipped (non-Athens or already current)
  Total processed: 980 events
```

### Step 4: Deduplication & Filtering

```bash
# Filter Athens-only (redundant, already done in import)
bun run scripts/filter-athens-only.ts

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

- Universal parser for music/theater/sports
- Extracts from Schema.org microdata
- Supports command-line arguments for any HTML file
- Automatically sets event type based on category
- Outputs RawEvent format compatible with normalizer

**Key Functions**:
- `VivaEventParser`: HTML parser class
- `classify_event_type()`: Infer type from title/description
- `parse_greek_date_display()`: Greek month names → YYYY-MM-DD

### Database Schema

Events are normalized to this structure before database insert:

```typescript
interface Event {
  "@context": "https://schema.org",
  "@type": "MusicEvent" | "TheaterEvent" | ...,
  id: string,              // Hash: title+date
  title: string,
  description: string,
  startDate: string,       // ISO 8601 with Athens timezone
  type: EventType,         // concert|theater|performance|...
  genres: string[],
  tags: string[],
  venue: {
    name: string,
    address: string,
    neighborhood?: string,
    coordinates?: { lat, lon }
  },
  price: {
    type: "free" | "paid",
    amount?: number,
    currency?: "EUR",
    range?: string
  },
  url: string,
  source: "viva.gr",
  createdAt: string,
  updatedAt: string,
  language: "en"
}
```

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

## Automation

### Cron Schedule (Future)

```bash
# Daily at 8 AM Athens time
0 8 * * * cd /path/to/agent-athens && ./scripts/daily-viva-import.sh
```

### Daily Import Script (To Create)

```bash
#!/bin/bash
# scripts/daily-viva-import.sh

set -e

echo "🌐 Starting daily viva.gr import..."

# Step 1: Scrape
python3 scripts/scrape-all-sites.py --site viva

# Step 2: Parse all categories
python3 parse_viva_events.py data/html-to-parse/$(ls -1t data/html-to-parse/ | grep viva.*music | head -1)
python3 parse_viva_events.py data/html-to-parse/$(ls -1t data/html-to-parse/ | grep viva.*theater | head -1)
python3 parse_viva_events.py data/html-to-parse/$(ls -1t data/html-to-parse/ | grep viva.*sports | head -1)

# Step 3: Import
bun run scripts/import-viva-events.ts

# Step 4: Dedup
bun run scripts/remove-duplicates.ts --dry-run | tee logs/dedup-preview.txt
read -p "Apply deduplication? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  bun run scripts/remove-duplicates.ts
fi

# Step 5: Rebuild
bun run build

# Step 6: Deploy
git add data/events.db dist/
git commit -m "chore: Daily viva.gr import $(date +%Y-%m-%d)"
git push origin main

echo "✅ Daily import complete!"
```

---

## Troubleshooting

### Parser Issues

**Problem**: No events found
- **Check**: Verify HTML contains `<article itemtype="http://schema.org/Event">`
- **Fix**: Re-scrape with Playwright (ensure JavaScript rendered)

**Problem**: Missing venue/date/time
- **Check**: Inspect HTML for meta tags with `itemprop="url|description|startDate"`
- **Fix**: Update parser to handle new viva.gr HTML structure

### Import Issues

**Problem**: `NOT NULL constraint failed: events.source`
- **Fix**: Ensure parser adds `"source": "viva.gr"` to all events

**Problem**: Events marked as non-Athens but are in Athens
- **Fix**: Update `isAthensEvent()` filter in `src/db/database.ts`

**Problem**: Too many duplicates after import
- **Fix**: Run `bun run scripts/remove-duplicates.ts`

---

## Statistics (Oct 30, 2025)

**Viva.gr Coverage**:
- Total events scraped: 1,041
- Imported to database: 980 (94%)
- Skipped (non-Athens): 61 (6%)

**Database Stats After Import**:
- Total events: 1,380
- Concerts: 951
- Theater: 254
- Performances: 142
- Others: 33

**Source Breakdown**:
- viva.gr: 980 events
- more.com: ~400 events (previously imported)

---

## Next Steps

1. **Automate daily imports**: Create cron job
2. **Add more.com parser**: Similar workflow for more.com HTML
3. **Add athinorama.gr**: Requires JavaScript rendering enhancement
4. **AI Enrichment**: Run `bun run scripts/enrich-events.ts` on new viva.gr events
5. **Monitor quality**: Track parse success rate, Athens filter accuracy

---

**Last Updated**: October 30, 2025
**Maintainer**: Agent Athens Team
