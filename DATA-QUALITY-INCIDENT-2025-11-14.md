# Data Quality Incident Report - November 14, 2025

## Summary

**Incident**: Non-Athens events (Thessaloniki) were scraped, imported, and one was enriched before detection.

**Detection**: User noticed "Μονή Λαζαριστών" and "Νοησις" in Batch #9 query results.

**Impact**:
- 11 Thessaloniki events in database
- 1 Thessaloniki event enriched with Greek description
- Wasted AI enrichment resources on non-Athens content

## Root Cause

1. **No city validation** in scraping/import pipeline
2. **Database schema allows any venue** without geographic constraints
3. **Enrichment workflow assumes all events are Athens-based** without pre-validation

## Events Affected

### Deleted Events (11 total):

1. `5c1674ccc557ed65` - The Great Gig - A Tribute to Pink Floyd (Μεγαρο Μουσικης Κομοτηνης) - **ENRICHED** ❌
2. `2025-2026-2025-12-12` - Η αγάπη άργησε μια μέρα (Θεατρο Μονης Λαζαριστων)
3. `the-italian-tenors-a-touch-of-christmas-2025-12-14` - THE ITALIAN TENORS (Μεγαρο Μουσικης Κομοτηνης)
4. `h-5-2025-11-16` - H αποστολή των 5 (Νοησις)
5. `2026-2025-11-16` - ΟΙ ΔΙΨΑΣΜΕΝΕΝΟΙ 2026 (Θεατρο Μονης Λαζαριστων)
6. `2025-2026-2025-10-22` - Έγκλημα και Τιμωρία (Θεατρο Μονης Λαζαριστων)
7. `from-earth-to-the-universe-2025-10-25` - Από τη Γη στο Σύμπαν (Νοησις)
8. `3d-5-2025-10-25` - Δεινόσαυροι (Νοησις)
9. `touch-the-stars-2025-10-25` - Touch the stars (Νοησις)
10. `3d-2025-10-25` - Πόλεις του Μέλλοντος 3D (Νοησις)
11. `the-great-gig-a-tribute-to-pink-floyd-2025-11-15` - Duplicate of #1 (Μεγαρο Μουσικης Κομοτηνης)

### Known Non-Athens Venues:
- **Θεατρο Μονης Λαζαριστων** - Thessaloniki (KTHBE theater)
- **Νοησις** - Thessaloniki (Science Center & Technology Museum)
- **Μεγαρο Μουσικης Κομοτηνης** - Komotini (Concert Hall)

## Remediation

### Immediate Actions (Completed)

1. ✅ **Deleted all 11 Thessaloniki events** from database
   ```sql
   DELETE FROM events WHERE venue_name IN ('Θεατρο Μονης Λαζαριστων', 'Νοησις', 'Μεγαρο Μουσικης Κομοτηνης');
   ```

2. ✅ **Created venue validation utility** (`src/utils/venue-validation.ts`)
   - `isAthensVenue()` - Check if venue is Athens-based
   - `shouldProcessEvent()` - Validate before import/enrichment
   - `filterAthensEvents()` - Filter array of events
   - `cleanNonAthensEvents()` - Clean database

3. ✅ **Documented known non-Athens venues** for future detection

### Required Follow-up Actions

1. **Add validation to import scripts**:
   - [ ] `scripts/import-scraped-events.ts`
   - [ ] `scripts/import-tier1-events.ts`
   - [ ] `scripts/import-more-events.ts`
   - [ ] `scripts/import-viva-events.ts`
   - [ ] `scripts/import-newsletter-events.ts`

2. **Add validation to scraping scripts**:
   - [ ] `scripts/scrape-all-sites.py`
   - [ ] `scripts/playwright-scraper.py`

3. **Add pre-enrichment validation**:
   - [ ] Check venue before calling seo-content-writer agent
   - [ ] Add city field to database schema
   - [ ] Default to rejecting events without explicit Athens confirmation

4. **Create database constraint** (optional):
   - [ ] Add CHECK constraint on venue_name to reject known non-Athens venues
   - [ ] Add city column with default 'Athens' and validation

## Prevention

### New Workflow Rules

1. **All import scripts MUST call `shouldProcessEvent()`** before inserting
2. **Enrichment workflow MUST validate city** before Task tool call
3. **Regular audits** of `DISTINCT venue_name` to catch new non-Athens venues
4. **Newsletter processing** should parse city from event metadata

### Code Example for Import Scripts

```typescript
import { filterAthensEvents } from '../src/utils/venue-validation';

// Before inserting events
const eventsToImport = filterAthensEvents(scrapedEvents);

for (const event of eventsToImport) {
  // Insert event
  db.prepare(`INSERT INTO events ...`).run(...);
}
```

### Code Example for Enrichment

```typescript
import { isAthensVenue } from '../src/utils/venue-validation';

// Before enriching
for (const event of events) {
  if (!isAthensVenue(event.venue_name, event.venue_address)) {
    console.log(`🚫 Skipping non-Athens event: ${event.title}`);
    continue;
  }

  // Proceed with enrichment
  await enrichEvent(event);
}
```

## Metrics

**Before Cleanup**:
- Total enriched: 167
- Total unenriched future: 636
- Non-Athens events: 11 (1 enriched)

**After Cleanup**:
- Total enriched: 171 (166 from previous session + 5 from Batch #9a - 1 deleted Thessaloniki)
- Total unenriched future: 626
- Non-Athens events: 0

**Wasted Resources**:
- 1 enrichment call to seo-content-writer agent (400+ words generated for Thessaloniki event)
- Database storage for 11 non-relevant events

## Lessons Learned

1. **Validate geography early** - Catch non-Athens events at scraping/import time, not enrichment time
2. **Database constraints** - Consider schema-level city validation
3. **Agent Athens is Athens-only** - No exceptions for other Greek cities
4. **Venue knowledge base** - Maintain list of known non-Athens venues

## Timeline

- **Before 2025-11-14**: 11 non-Athens events imported from various sources
- **2025-11-14 ~10:00**: Batch #6 enriched Pink Floyd tribute at Komotini venue
- **2025-11-14 ~11:30**: Batch #9a submitted 5 events including 2 Thessaloniki venues
- **2025-11-14 11:32**: User detected issue ("Moni Lazariston is in Thessaloniki!")
- **2025-11-14 11:35**: Investigation revealed 11 non-Athens events
- **2025-11-14 11:37**: All 11 events deleted
- **2025-11-14 11:40**: Venue validation utility created
- **2025-11-14 11:45**: Incident report completed

## Status

✅ **Resolved** - All non-Athens events removed, validation utility created

⚠️ **Follow-up Required** - Integrate validation into all import/scraping scripts

---

**Report Created**: 2025-11-14 11:45 EET
**Created By**: Claude Code (automated quality control)
**Severity**: Medium (data contamination, wasted resources, but caught early)
