# Batch Processing Guide: 10-Event Sample

**Purpose**: Process 10 events to validate bilingual enrichment at small scale before full corpus

**Status**: 3 events completed (Phase 2 validation), 7 remaining

---

## Quick Start

### Option A: Manual Processing (Recommended for Learning)

Process events one-by-one using the Task tool:

```bash
# 1. Select next event
sqlite3 data/events.db "SELECT id, title, description FROM events WHERE full_description_en IS NULL LIMIT 1;"

# 2. Run enrichment test for that event ID
bun run scripts/test-bilingual-sample.ts

# 3. Review generated prompts in data/test-prompts/

# 4. Call Task tool for each prompt (as we did with Events 1-3)

# 5. Save results to database
sqlite3 data/events.db << EOF
UPDATE events
SET full_description_en = 'YOUR_ENGLISH_DESCRIPTION',
    full_description_gr = 'YOUR_GREEK_DESCRIPTION',
    updated_at = datetime('now')
WHERE id = 'EVENT_ID';
EOF
```

### Option B: Automated Workflow (After Validation)

Once comfortable with the process, use the batch script:

```bash
# Process next 7 events
bun run scripts/enrich-bilingual-batch.ts --limit=7 --skip-existing
```

**Note**: The batch script has placeholders for Task tool calls. You'll need to manually call the Task tool for each event as prompted by the script.

---

## 10-Event Sample List

| # | Event ID | Title | Type | Status |
|---|----------|-------|------|--------|
| 1 | c1058bb73683463a | TYPHUS - BIO-CANCER - Eternal | concert | ✅ COMPLETE |
| 2 | b22003ca37f28b38 | Η Παναγία των Παρισίων | concert | ⏳ PENDING |
| 3 | 9a498120957c0146 | ΔΗΜΗΤΡΗΣ ΣΑΜΟΛΗΣ LIVE | concert | ⏳ PENDING |
| 4 | 1859f1ae6c91776e | Π Α Ρ Α Μ Υ Θ Ο Τ Ε Χ Ν Ι Τ Ε Σ | performance | ⏳ PENDING |
| 5 | 65-2025-11-04 | Θέατρο για όλους 65+ | concert | ⏳ PENDING |
| 6 | f40d6a18771b35bb | ΛΑΙΔΗ ΜΑΚΒΕΘ | theater | ⏳ PENDING |
| 7 | c0fc8107048e9a2f | ΕΙΚΟΣΙΕΞΙ | theater | ⏳ PENDING |
| 8 | ba808b0193343be6 | ΛΑΣΠΟΚΤΗΜΑ | performance | ⏳ PENDING |
| 9 | songs-in-revolution-2025-11-04 | SONGS IN REVOLUTION | concert | ⏳ PENDING |
| 10 | 5c500613cf9d83cf | Sound of Color #2 | concert | ⏳ PENDING |

---

## Processing Workflow

### Step 1: Enrich Event

```typescript
import { enrichEvent, generateEnrichedPrompt } from './src/enrichment/enrichment-engine';

const enrichedEvent = await enrichEvent({
  id: event.id,
  title: event.title,
  // ... other fields
});
```

### Step 2: Generate Prompts

```typescript
const promptEN = generateEnrichedPrompt(enrichedEvent, 'en', 420);
const promptGR = generateEnrichedPrompt(enrichedEvent, 'gr', 430);
```

### Step 3: Call Task Tool

```typescript
// In Claude Code session
const descriptionEN = await Task({
  description: "Generate English description",
  subagent_type: "seo-content-writer",
  prompt: promptEN
});

const descriptionGR = await Task({
  description: "Generate Greek description",
  subagent_type: "seo-content-writer",
  prompt: promptGR
});
```

### Step 4: Validate & Save

```typescript
// Validate word counts
const wordsEN = descriptionEN.split(/\s+/).length;
const wordsGR = descriptionGR.split(/\s+/).length;

console.log(`EN: ${wordsEN} words (target: 400-440)`);
console.log(`GR: ${wordsGR} words (target: 350-450)`);

// Save to database
db.prepare(`
  UPDATE events
  SET full_description_en = ?,
      full_description_gr = ?,
      updated_at = datetime('now')
  WHERE id = ?
`).run(descriptionEN, descriptionGR, event.id);
```

---

## Time Estimates

**Per Event**:
- Enrichment: <5ms
- EN generation: 30-45s (Task tool)
- Rate limit: 2s
- GR generation: 30-45s (Task tool)
- Rate limit: 2s
- DB save: <1ms
- **Total**: ~70-95 seconds per event

**10 Events**:
- Total time: ~12-16 minutes
- With breaks: ~20-30 minutes

**1,038 Events** (full corpus):
- Total time: 20-27 hours
- Recommended: Process in batches of 100-200
- Run overnight sessions

---

## Quality Checklist

For each event, verify:

- [ ] English: 400-440 words
- [ ] Greek: 350-450 words (acceptable)
- [ ] No fabricated information
- [ ] Natural keyword integration
- [ ] Authentic Greek tone (not translated)
- [ ] Practical details included (time, price, venue)
- [ ] Journalism tone (not marketing)

---

## Troubleshooting

### Greek Descriptions Too Short

**Symptom**: Greek consistently <350 words

**Solutions**:
1. Check input data quality (sparse vs. rich)
2. Verify Greek target set to 430 words
3. Review enriched prompt length (should be 280-400 words)
4. Acceptable if quality is excellent and >350 words

### English Descriptions Off-Target

**Symptom**: English not in 400-440 range

**Solutions**:
1. Verify target set to 420 words
2. Check pre-enrichment pipeline ran correctly
3. Review enriched prompt (should be 200-280 words)

### Task Tool Rate Limiting

**Symptom**: Too many requests errors

**Solutions**:
1. Add 2-second delays between calls
2. Process in smaller batches (5 events at a time)
3. Resume using --skip-existing flag

---

## Progress Tracking

### Check Current Status

```sql
SELECT
  COUNT(*) as total,
  COUNT(full_description_en) as has_en,
  COUNT(full_description_gr) as has_gr,
  COUNT(CASE WHEN full_description_en IS NOT NULL
             AND full_description_gr IS NOT NULL THEN 1 END) as has_both
FROM events;
```

### View Recent Enrichments

```sql
SELECT id, title,
       length(full_description_en) as en_chars,
       length(full_description_gr) as gr_chars,
       updated_at
FROM events
WHERE full_description_en IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;
```

---

## Next Steps After 10-Event Sample

1. **Review Results**
   - Check word count distribution
   - Validate quality across different event types
   - Identify any patterns or issues

2. **Adjust if Needed**
   - Fine-tune Greek target if consistently short
   - Update venue descriptions if needed
   - Refine prompts based on results

3. **Scale to Full Corpus**
   - Process remaining 1,028 events
   - Run in batches overnight
   - Monitor progress regularly
   - Resume if interrupted

---

## Expected Outcomes

After processing 10 events, you should have:

- ✅ 10 events with bilingual descriptions
- ✅ English: ~410-430 words average
- ✅ Greek: ~370-400 words average
- ✅ Quality: Journalism-grade
- ✅ Confidence: Ready for full batch processing

---

**Document Version**: 1.0
**Created**: November 5, 2025
**Status**: Ready for 10-event sample processing
