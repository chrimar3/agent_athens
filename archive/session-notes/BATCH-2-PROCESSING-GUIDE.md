# Batch 2 Processing Guide

## Status: Event 21 Complete, Events 22-40 Ready

### What's Done
- ✅ Event 21: Enriched and deployed to live site
- ✅ Prompts generated for all 40 events
- ✅ Database fix applied (now populates `full_description` column)
- ✅ Site rebuild process working

### What Remains
**19 events × 2 languages = 38 Task calls**

Events 22-40:
- 22: yoga-2025-11-05 (Yoga & Meditation)
- 23: eat-drink-draw-2025-11-05 (Creative workshop)
- 24: messy-play-with-hehe-1-5-5-2025-11-05 (Kids workshop)
- 25: andreas-ragnar-kassapis-shame-is-an-object-in-space-2025-11-05 (Exhibition)
- 26-40: Various concerts, theater, performances (Nov 5)

### Processing Approach

Due to token budget constraints (~79k remaining, need ~76k for 38 Task calls), recommend ONE of these approaches:

#### Option A: Session Checkpoints (Recommended)
1. Process Events 22-25 (8 Task calls) → Save → Commit
2. NEW SESSION: Process Events 26-30 (10 Task calls) → Save → Commit
3. NEW SESSION: Process Events 31-35 (10 Task calls) → Save → Commit
4. NEW SESSION: Process Events 36-40 (10 Task calls) → Save → Deploy

**Benefits**: Safer, allows review between batches, avoids token limit issues

#### Option B: Batch Script (Risk of timeout)
Process all 38 in current session - may hit token limits

### Processing Commands

For each event, you need to:

```bash
# 1. Read prompts
cat data/batch-2-prompts/[NN]-[event-id]-en.txt
cat data/batch-2-prompts/[NN]-[event-id]-gr.txt

# 2. Call Task tool with seo-content-writer agent (use full prompt text)

# 3. Save results
echo "[result]" > data/batch-2-results/[NN]-[event-id]-en-result.txt
echo "[result]" > data/batch-2-results/[NN]-[event-id]-gr-result.txt
```

### Saving to Database

After processing Events 22-25 (or any checkpoint):

```typescript
import { Database } from 'bun:sqlite';
const db = new Database('data/events.db');

const events = [
  { id: 'yoga-2025-11-05', prefix: '22' },
  { id: 'eat-drink-draw-2025-11-05', prefix: '23' },
  // ... etc
];

for (const event of events) {
  const enPath = `data/batch-2-results/${event.prefix}-${event.id}-en-result.txt`;
  const enDescription = await Bun.file(enPath).text();

  const grPath = `data/batch-2-results/${event.prefix}-${event.id}-gr-result.txt`;
  const grDescription = await Bun.file(grPath).text();

  // CRITICAL: Populate ALL THREE columns
  db.prepare(`
    UPDATE events
    SET full_description = ?,
        full_description_en = ?,
        full_description_gr = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(enDescription, enDescription, grDescription, event.id);
}
```

### Rebuild & Deploy

```bash
bun run build
git add data/ dist/ scripts/
git commit -m "feat: Batch 2 checkpoint - Events 22-25 enriched"
git push origin main
netlify deploy --prod --dir=dist
```

---

## Recommendation

**Process Events 22-25 now (8 Task calls, ~16k tokens), then create checkpoint.**

This leaves buffer for saving, committing, and starting fresh session for Events 26-30.

Total batches for Batch 2 completion:
- Batch 2.1: Events 22-25 (current session)
- Batch 2.2: Events 26-30 (new session)
- Batch 2.3: Events 31-35 (new session)
- Batch 2.4: Events 36-40 (new session)

Each sub-batch = ~8-10 Task calls = safe token usage.
