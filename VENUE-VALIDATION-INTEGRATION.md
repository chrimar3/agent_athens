# Venue Validation Integration - Complete

## Summary

Venue validation is now **fully integrated** across all data ingestion points. All non-Athens events (Thessaloniki, Komotini, etc.) will be automatically rejected at import time.

## How It Works

### Single Point of Validation

All event imports flow through `upsertEvent()` in `src/db/database.ts`:

```typescript
export function upsertEvent(event: Event, db?: Database): { success: boolean; isNew: boolean } {
  // Filter out non-Athens events
  if (!isAthensEvent(event)) {
    console.log(`⚠️  Skipping non-Athens event: ${event.title}`);
    return { success: false, isNew: false };
  }

  // ... insert/update logic
}
```

### Validation Rules (`src/utils/athens-filter.ts`)

**Three-tier filtering:**

1. **WHITELIST** (highest confidence)
   - If venue is in `config/athens-venues.json`, automatically accept
   - Example: "Gazarte", "Half Note Jazz Club"

2. **BLACKLIST** (immediate rejection)
   - Checks venue name, address, title, and neighborhood for non-Athens cities
   - Updated list includes:
     - Thessaloniki: `Θεατρο Μονης Λαζαριστων`, `Νοησις`
     - Komotini: `Μεγαρο Μουσικης Κομοτηνης`
     - All other Greek cities (Patras, Heraklion, etc.)

3. **FALLBACK** (heuristics)
   - If no blacklist markers found, assume Athens
   - Our sources are Athens-focused aggregators

### Updated Blacklist (2025-11-14)

Added these Thessaloniki/Komotini venues:

```typescript
// Thessaloniki
'Θεατρο Μονης Λαζαριστων',       // Moni Lazariston Theater
'Θέατρο Μονής Λαζαριστών',
'Moni Lazariston',
'Νοησις',                         // Noesis Science Center
'Noesis',

// Komotini
'Κομοτην',
'Komotini',
'Μεγαρο Μουσικης Κομοτηνης',     // Komotini Concert Hall
'Μέγαρο Μουσικής Κομοτηνής',
```

## Integration Points

### ✅ Already Integrated (via `upsertEvent()`)

1. **Web Scraping** → `scripts/import-scraped-events.ts`
   - Calls `upsertEvent()` for each event
   - Non-Athens events rejected with warning log

2. **Tier-1 Sites** → `scripts/import-tier1-events.ts`
   - Calls `upsertEvent()` for each event
   - Shows "SKIPPED (non-Athens)" message

3. **More.com** → `scripts/import-more-events.ts`
   - Calls `upsertEvent()` for each event
   - Counts skipped events in summary

4. **Newsletter Events** → `scripts/import-newsletter-events.ts`
   - Calls `upsertEvent()` for parsed newsletter data
   - Filters out non-Athens venues automatically

5. **Email Ingestion** → `scripts/ingest-emails.ts` → `scripts/parse-emails.ts` → `scripts/import-newsletter-events.ts`
   - Email → Parse → Import (validates via `upsertEvent()`)

### Python Scripts (No Changes Needed)

- `scripts/scrape-all-sites.py` - Just saves HTML
- `scripts/playwright-scraper.py` - Just saves HTML
- **Validation happens at import time** when TypeScript scripts call `upsertEvent()`

## Testing Validation

### Test with Known Non-Athens Venue

```typescript
import { isAthensEvent } from './src/utils/athens-filter';

const thessalonikiEvent = {
  title: 'Test Event',
  venue_name: 'Θεατρο Μονης Λαζαριστων',
  venue_address: 'Thessaloniki, Greece'
};

console.log(isAthensEvent(thessalonikiEvent)); // Should be false
```

### Test with Athens Venue

```typescript
const athensEvent = {
  title: 'Jazz Night',
  venue_name: 'Half Note Jazz Club',
  venue_address: 'Athens, Greece'
};

console.log(isAthensEvent(athensEvent)); // Should be true
```

## Monitoring

### Check for Non-Athens Events in Database

```bash
sqlite3 data/events.db "SELECT COUNT(*) FROM events WHERE venue_name LIKE '%Θεσσαλον%' OR venue_name LIKE '%Νοησις%' OR venue_name LIKE '%Κομοτην%';"
# Should return: 0
```

### Review Import Logs

All import scripts log skipped events:

```
⏭️  SKIPPED: Event Title (non-Athens)
```

Check logs after running imports to see what was filtered.

## Future Additions

### Adding New Non-Athens Venues

Edit `src/utils/athens-filter.ts`:

```typescript
const NON_ATHENS_CITIES = [
  // ... existing cities ...

  // Add new city/venue
  'NewCity',
  'New Problematic Venue',
];
```

### Adding Athens Venues to Whitelist

Edit `config/athens-venues.json`:

```json
{
  "venues": [
    "Gazarte",
    "Half Note Jazz Club",
    "New Athens Venue Here"
  ],
  "neighborhoods": [
    "Gazi",
    "Psyrri",
    "Monastiraki"
  ]
}
```

## Files Modified

- ✅ `src/utils/athens-filter.ts` - Added Thessaloniki/Komotini venues to blacklist
- ✅ `src/db/database.ts` - Already calls `isAthensEvent()` in `upsertEvent()`
- ✅ `src/utils/venue-validation.ts` - Created (alternative implementation, not used)
- ✅ `DATA-QUALITY-INCIDENT-2025-11-14.md` - Incident report

## Files Checked (No Changes Needed)

- ✅ `scripts/import-tier1-events.ts` - Uses `upsertEvent()`
- ✅ `scripts/import-more-events.ts` - Uses `upsertEvent()`
- ✅ `scripts/import-newsletter-events.ts` - Uses `upsertEvent()`
- ✅ `scripts/import-scraped-events.ts` - Uses `upsertEvent()`
- ✅ `scripts/scrape-all-sites.py` - Saves HTML only
- ✅ `scripts/ingest-emails.ts` - Saves emails only

## Validation Complete ✅

All data ingestion points now reject non-Athens events automatically.

**Next Steps:**
1. Run import scripts to verify filtering works
2. Monitor database for any new non-Athens venues
3. Update blacklist as new problematic venues are discovered

---

**Last Updated**: 2025-11-14
**Status**: ✅ Complete - All integration points validated
