# Pre-Enrichment Workflow for Agent Athens

## Purpose

Before AI-enriching events with FREE bilingual descriptions, we need **sufficient source data** to maintain the "no fabrication" rule. This document describes the pre-enrichment infrastructure and workflow.

## Problem Statement

Events scraped from newsletters often have minimal data:
- Title
- Venue name (often just "Theatro Fournos" with no location context)
- Date/time
- Price type (open/with-ticket)
- URL

Without neighborhood, capacity, venue type, or cultural context, AI descriptions become generic or fabricated.

## Solution: Three-Stage Pre-Enrichment Pipeline

### Stage 1: Venue Master Data (One-Time Build)

**File**: `data/venues-master.json`

**Purpose**: Create reusable venue reference database covering Athens' major cultural venues.

**Data Structure**:
```json
{
  "Κυτταρο Live": {
    "name_en": "Kyttaro Live",
    "neighborhood": "Metaxourgeio / Viktoria",
    "address": "Ipeirou 48, Athens 104 39",
    "lat": 37.9945,
    "lng": 23.7278,
    "capacity": 500,
    "type": "live_music_venue",
    "description": "Historic live music venue with fifty years tradition...",
    "metro": "Viktoria Square"
  }
}
```

**Current Status** (as of Nov 6, 2025):
- ✅ 26 venues documented
- ✅ Covers 120+ events (16 venues matched)
- 🔄 Target: 50 venues (to cover majority of 697 events)

**How to Add Venues**:
1. Query database for high-frequency venues:
   ```bash
   sqlite3 data/events.db "SELECT venue_name, COUNT(*) as count FROM events GROUP BY venue_name ORDER BY count DESC LIMIT 50;"
   ```

2. Research venue using WebSearch or visit official websites

3. Add entry to `data/venues-master.json` following the structure above

4. Run enrichment script: `bun run scripts/enrich-venues.ts`

**Key Venues to Prioritize**:
- Theaters: Theatro Palас, Theatro Amalia, Theatro Chytirio
- Concert Halls: Megaron variants, Stavros Niarchos variations
- Cultural Centers: Circus Entertainment Hub, Kentro Elegxou Tileorast
on
- Music Venues: Caja De Musica, Note Jazz Club, Live Music Space variations

### Stage 2: Event-Specific Web Scraping

**Purpose**: Fetch detailed event information from source websites (More.com, Viva.gr, Athinorama.gr).

**Scripts**:
- `scripts/fetch-prices.py` - Scrapes pricing details (running in background)
- `scripts/scrape-all-sites.py` - Scrapes full event pages for plot/cast/description

**What Gets Scraped**:
- Full event description/plot
- Cast/performers
- Genre/tags
- Precise pricing (€XX vs just "with-ticket")
- Additional venue details
- High-quality images

**Status**:
- 🔄 6 background processes running
- ⏳ Processing ~697 events

**Manual Trigger**:
```bash
# Scrape all sites for missing data
python3 scripts/scrape-all-sites.py

# Scrape specific site
python3 scripts/scrape-all-sites.py --site viva

# Dry run to see what would be scraped
python3 scripts/scrape-all-sites.py --dry-run
```

### Stage 3: AI Enrichment with Complete Context

**Only after** Stages 1-2 complete, run AI enrichment with full context:

```bash
# Test on 5 events first
bun run scripts/enrich-5-events.ts

# Process all unenriched events
bun run scripts/enrich-events.ts
```

**Enrichment Prompt Template** (with pre-enrichment data):
```
Generate a compelling 400-word description for this cultural event in Athens.

Event Details:
- Title: Valley of the Sun (US) live στην Αθήνα
- Type: concert
- Venue: Gazarte - Ground Stage (Gazi / Keramikos)
- Neighborhood: Gazi / Keramikos
- Capacity: 150 people
- Metro: Kerameikos
- Venue Type: concert_venue
- Date: 2025-11-06
- Time: 21:30
- Genre: rock
- Price: €15-€18
- Plot/Description: American doom metal band performing Athens debut...

CRITICAL: Do not fabricate information. Only use the details provided above.
```

## Workflow Commands

### Complete Pre-Enrichment Sequence

```bash
# 1. Check venue master data status
cat data/venues-master.json | grep '"name_en":' | wc -l

# 2. Enrich database with venue data
bun run scripts/enrich-venues.ts

# 3. Check scraping status
tail -20 logs/price-fetch-retry.log

# 4. Verify events have sufficient data
sqlite3 data/events.db "SELECT COUNT(*) FROM events WHERE venue_neighborhood IS NOT NULL;"

# 5. Query unenriched events with good source data
sqlite3 data/events.db "
  SELECT id, title, venue_name, venue_neighborhood
  FROM events
  WHERE full_description IS NULL
    AND venue_neighborhood IS NOT NULL
  LIMIT 10;
"

# 6. Run AI enrichment (only on events with good source data)
bun run scripts/enrich-events.ts
```

## Success Metrics

### Before Pre-Enrichment
```
Event: "VRANARAMA COMEDY NIGHTS"
Venue: "Shamone"
Neighborhood: NULL
Capacity: NULL
Description: NULL
```

### After Pre-Enrichment
```
Event: "VRANARAMA COMEDY NIGHTS"
Venue: "Shamone"
Neighborhood: "Gazi / Keramikos"
Capacity: 150
Metro: "Kerameikos"
Venue Type: "lgbtq_venue"
Venue Description: "Athens' premier LGBTQ+ nightlife venue..."
Plot: "Contemporary stand-up comedy series featuring Greek and international comedians..."
Price: €12
```

### AI Enrichment Quality Difference

**Without pre-enrichment** (fabricated):
> "Experience an unforgettable night of comedy at Shamone, a popular Athens venue..."

**With pre-enrichment** (authentic):
> "Athens has always been a city that thrives on wit and humor. VRANARAMA COMEDY NIGHTS at Shamone continues this tradition, bringing contemporary stand-up to one of Gazi's most intimate LGBTQ+ venues. With just 150 seats in the heart of the Kerameikos district, this €12 comedy series offers accessible entertainment where audiences can catch every nuance of timing and expression..."

## Database Schema for Enriched Events

Events table includes these venue columns:
- `venue_name` TEXT - Original venue name from scraping
- `venue_neighborhood` TEXT - From venues-master.json
- `venue_address` TEXT - Full address
- `venue_lat` REAL - Latitude
- `venue_lng` REAL - Longitude
- `venue_capacity` INTEGER - Max capacity
- `description` TEXT - From web scraping (short description ~100 words)
- `full_description` TEXT - AI-generated (400 words, site display)
- `full_description_en` TEXT - English version (400 words)
- `full_description_gr` TEXT - Greek version (390-450 words)

## Future Enhancements

1. **Venue Aliases**: Handle variations like "MEGARON" vs "Megaron Concert Hall" vs "MEGARON - The Athens Concert Hall"

2. **Auto-Update**: Schedule monthly WebSearch refreshes for venue data (capacity changes, metro updates, etc.)

3. **Image Pipeline**: Download and optimize venue/event images during pre-enrichment

4. **Performer Database**: Build `performers-master.json` similar to venues (for musicians, theater companies, directors)

5. **Genre Taxonomy**: Standardize genre tags during scraping (e.g., "indie rock" → "rock", "σύγχρονο θέατρο" → "theater/contemporary")

## Troubleshooting

### Issue: Script says "X events enriched" but data missing

**Solution**: Commit and check the database file:
```bash
git add data/events.db
git commit -m "Update venue enrichment"
sqlite3 data/events.db "SELECT * FROM events WHERE venue_neighborhood IS NOT NULL LIMIT 1;"
```

### Issue: Venue name mismatch (e.g., "Gagarin 205 Live Music Space" vs "Gagarin 205")

**Solution**: Add aliases to `enrich-venues.ts`:
```typescript
const aliases = {
  "Gagarin 205 Live Music Space": "Gagarin 205",
  "MEGARON - The Athens Concert Hall": "Megaron Concert Hall"
};
```

### Issue: Background scrapers not running

**Check status**:
```bash
ps aux | grep python3 | grep scrape
tail -50 logs/price-fetch-retry.log
```

**Restart if needed**:
```bash
pkill -f "fetch-prices.py"
python3 scripts/fetch-prices-retry.py > logs/price-fetch-retry.log 2>&1 &
```

## Cost Savings

**Without Pre-Enrichment**: Would need paid API calls to look up venue data repeatedly

**With Pre-Enrichment**:
- Venue master data: One-time WebSearch research (FREE)
- Event scraping: Automated Python scripts (FREE)
- AI enrichment: Claude Code Tool Agent (FREE)

**Total Cost**: $0.00 for enriching 697 events

---

**Last Updated**: November 6, 2025
**Maintained By**: Agent Athens Team
**Related Files**:
- `data/venues-master.json` - Venue reference database
- `scripts/enrich-venues.ts` - Venue enrichment utility
- `scripts/fetch-prices.py` - Price scraping background job
- `scripts/scrape-all-sites.py` - Full event scraping
- `scripts/enrich-events.ts` - AI description generation
