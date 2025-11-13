# Batch Enrichment Guide - November 2025 Events

## Current Status
- **Events enriched**: 33/242 (14%)
- **Remaining**: 209 events
- **Method**: seo-content-writer agent (FREE via Claude Code)
- **Quality**: 100% performer mention rate when cast data available

## Batch Processing Strategy

### Batch 2 Queue (Events 11-30)
**Location**: `data/batch-enrichment-queue.json`
**Total**: 20 events
**With cast data**: 12 events ✅
**Without cast data**: 8 events ⚠️

### Priority Order
1. **High Priority**: Events with cast/crew data (12 events) - enrich first for maximum performer mentions
2. **Standard Priority**: Events without cast data (8 events) - focus on venue/concept/cultural context

## How to Continue (Manual Process)

For each event in the batch:

1. **Get Event Data**:
```bash
sqlite3 data/events.db "SELECT id, title, source_full_description FROM events WHERE id = '{EVENT_ID}';"
```

2. **Call seo-content-writer Agent** with this template:
```
Generate TWO SEO-optimized event descriptions (English + Greek).

CONSTRAINTS:
- STRICT 400-word limit (380-420 acceptable)
- Mention ALL performers from cast/crew section
- ZERO fabrication
- Cultural context + venue atmosphere
- For AI answer engines AND human readers

EVENT DATA:
[Paste event details]

DELIVERABLE:
Save to: data/enriched/{EVENT_ID}-en.txt (400 words)
Save to: data/enriched/{EVENT_ID}-gr.txt (400 words)
```

3. **Verify Output**:
```bash
ls -lh data/enriched/{EVENT_ID}*.txt
wc -w data/enriched/{EVENT_ID}-en.txt
```

## Automated Batch Script (Future Enhancement)

To fully automate this in future sessions, we could create:
```bash
scripts/auto-batch-enrich.py --batch-size 20 --start-offset 33
```

This would:
1. Query next 20 unenriched events
2. For each event, call seo-content-writer agent automatically
3. Verify word counts
4. Track progress
5. Report completion stats

## Progress Tracking

After each batch of 20:
```bash
echo "Events enriched: $(ls data/enriched/*-en.txt | wc -l)/242"
```

## Quality Checklist

For each enriched event, verify:
- [ ] EN file exists (380-420 words)
- [ ] GR file exists (380-420 words)
- [ ] Performer names mentioned (if cast data available)
- [ ] Venue and cultural context included
- [ ] No fabricated information

## Estimated Timeline

- **Current pace**: ~2 min/event (including agent call + verification)
- **Batch of 20**: ~40 minutes
- **Total remaining** (209 events): ~7 hours across multiple sessions
- **Batches needed**: 11 batches (20 events each, except last batch)

## Next Batches

- **Batch 2**: Events 11-30 (READY - queue created)
- **Batch 3**: Events 31-50
- **Batch 4**: Events 51-70
- ...
- **Batch 13**: Events 231-242 (final 12 events)

## Success Metrics

**Quality maintained:**
- ✅ 100% performer mention when cast data exists
- ✅ 380-420 word count range
- ✅ Zero fabrication
- ✅ Bilingual (EN + GR)
- ✅ Cultural context + venue atmosphere

**Last updated**: November 10, 2025 - Session after parser fix
**Status**: Data pipeline fixed, systematic enrichment in progress
