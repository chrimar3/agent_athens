# Web Scraping Automation Challenge

**Last Priority**: Automate standalone web scraping with timestamp tracking and Agent SDK integration

**Status**: Works manually ✅ | Needs automation ❌

**Date**: November 1, 2025

---

## Table of Contents

1. [Current State](#current-state)
2. [Goals](#goals)
3. [Technical Challenges](#technical-challenges)
4. [Architecture Considerations](#architecture-considerations)
5. [Implementation Plan](#implementation-plan)
6. [Edge Cases & Risks](#edge-cases--risks)
7. [Success Criteria](#success-criteria)
8. [Testing Strategy](#testing-strategy)
9. [References](#references)

---

## Current State

### ✅ What Works (Manual Execution)

**Python Scraper** (`scripts/scrape-all-sites.py`):
```bash
# Works perfectly for individual sites
python3 scripts/scrape-all-sites.py --site viva
python3 scripts/scrape-all-sites.py --site more
python3 scripts/scrape-all-sites.py --site gazarte
python3 scripts/scrape-all-sites.py --site athinorama
```

**Output**: Saves HTML to `data/html-to-parse/YYYY-MM-DD-{site}-{url}.html`

**Parsers** (Python):
```bash
# Universal parser for Schema.org markup sites (viva.gr, more.com)
python3 parse_viva_events.py data/html-to-parse/2025-10-30-viva-www-viva-gr-tickets-music-.html
python3 parse_viva_events.py data/html-to-parse/2025-10-22-more-www-more-com-gr-el-tickets-theater-.html
```

**Output**: Saves to `data/parsed/{site}-{category}-events.json` as `RawEvent[]`

**Import Scripts** (TypeScript/Bun):
```bash
bun run scripts/import-viva-events.ts    # Imports viva.gr events
bun run scripts/import-more-events.ts    # Imports more.com events
```

**What's Missing**:
- ❌ Automated scheduling (no cron, no timestamp tracking)
- ❌ Centralized configuration (`config/scrape-list.json` doesn't exist)
- ❌ Last-crawled timestamp tracking per site
- ❌ Agent SDK integration (can't trigger from Claude Code)
- ❌ Error recovery and retry logic
- ❌ Scraping frequency control (daily? weekly? per-source?)

---

## Goals

### Primary Goals

1. **Automated Execution**
   - Run scraping jobs automatically without manual intervention
   - Schedule per source based on update frequency

2. **Configuration Management**
   - Centralized `config/scrape-list.json` for all sources
   - Per-source configuration (URL, frequency, parser type)

3. **Timestamp Tracking**
   - Track `last_scraped` timestamp per source
   - Skip sources that were recently scraped
   - Persist state in `data/scrape-state.json`

4. **Agent SDK Integration**
   - Trigger scraping via Claude Code tool call
   - Run as background task
   - Report progress and results

5. **Resilience**
   - Graceful error handling per source
   - Continue scraping other sources if one fails
   - Retry logic with exponential backoff

### Secondary Goals

- Rate limiting per domain (avoid bans)
- Scraping health monitoring (success/failure rates)
- Alert on parsing failures
- Diff detection (only import if data changed)

---

## Technical Challenges

### 1. **Python ↔ TypeScript Interop** 🔴 HIGH COMPLEXITY

**Problem**: Current scrapers are Python, current codebase is Bun/TypeScript

**Challenges**:
- Can't directly call Python from Bun (different runtimes)
- Need subprocess execution: `Bun.spawn(['python3', 'script.py'])`
- Error handling across process boundaries
- Progress reporting from Python to TypeScript
- Environment variables must be passed to Python subprocess

**Options**:

**Option A: Keep Python scrapers, orchestrate from TypeScript**
```typescript
// Pro: Use existing Python scrapers
// Con: Subprocess management complexity

import { spawn } from 'bun';

const result = await spawn(['python3', 'scripts/scrape-all-sites.py', '--site', 'viva']);
const output = await new Response(result.stdout).text();
```

**Option B: Rewrite scrapers in TypeScript**
```typescript
// Pro: Single runtime, easier error handling
// Con: 500+ lines of Python to rewrite, library differences

import { chromium } from 'playwright'; // or puppeteer
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://www.viva.gr/tickets/music');
const html = await page.content();
```

**Option C: Hybrid approach**
- Keep Python for scraping (headless Chrome, requests)
- TypeScript orchestrator calls Python
- Python outputs JSON, TypeScript imports

**Recommendation**: **Option C (Hybrid)** - Leverage existing Python scrapers, build TypeScript orchestrator

---

### 2. **Configuration Schema Design** 🟡 MEDIUM COMPLEXITY

**Problem**: Need flexible config for different source types

**Challenge**: Different sources have different characteristics:

| Source | Update Freq | Pages to Scrape | Parser Type |
|--------|-------------|-----------------|-------------|
| viva.gr | Daily | /music, /theater, /sports | Schema.org |
| more.com | Daily | /music, /theater, /sports | Schema.org |
| gazarte.gr | Weekly | /program | Custom HTML |
| athinorama.gr | Daily | Multiple categories | Custom HTML |
| Newsletter | Daily (IMAP) | N/A | Email parser |

**Proposed Schema** (`config/scrape-list.json`):
```json
{
  "sources": [
    {
      "id": "viva.gr",
      "name": "Viva.gr",
      "enabled": true,
      "frequency": "daily",
      "scraper": "python",
      "scraper_command": ["python3", "scripts/scrape-all-sites.py", "--site", "viva"],
      "parser": "parse_viva_events.py",
      "parser_args": {
        "categories": ["music", "theater", "sports"]
      },
      "importer": "scripts/import-viva-events.ts",
      "rate_limit_ms": 2000,
      "timeout_ms": 30000,
      "retry_count": 3,
      "priority": 1
    },
    {
      "id": "gazarte.gr",
      "name": "Gazarte",
      "enabled": true,
      "frequency": "weekly",
      "scraper": "python",
      "scraper_command": ["python3", "scripts/scrape-all-sites.py", "--site", "gazarte"],
      "parser": "parse_gazarte_events.py",
      "importer": "scripts/import-gazarte-events.ts",
      "rate_limit_ms": 5000,
      "timeout_ms": 60000,
      "retry_count": 2,
      "priority": 3
    }
  ]
}
```

**Challenges**:
- How to handle sources with multiple pages (music, theater, sports)?
- How to track `last_scraped` per category or per source?
- How to handle custom parser arguments?

---

### 3. **Timestamp Tracking & State Management** 🟡 MEDIUM COMPLEXITY

**Problem**: Need to persist `last_scraped` timestamp per source to avoid re-scraping

**State Schema** (`data/scrape-state.json`):
```json
{
  "sources": {
    "viva.gr": {
      "last_scraped": "2025-11-01T08:00:00Z",
      "last_success": "2025-11-01T08:00:00Z",
      "last_failure": null,
      "scrape_count": 47,
      "failure_count": 0,
      "events_imported": 1041
    },
    "more.com": {
      "last_scraped": "2025-11-01T08:05:00Z",
      "last_success": "2025-11-01T08:05:00Z",
      "last_failure": null,
      "scrape_count": 45,
      "failure_count": 0,
      "events_imported": 1027
    },
    "gazarte.gr": {
      "last_scraped": "2025-10-28T10:00:00Z",
      "last_success": "2025-10-28T10:00:00Z",
      "last_failure": null,
      "scrape_count": 12,
      "failure_count": 0,
      "events_imported": 22
    }
  }
}
```

**Challenges**:
- **Race conditions**: What if two processes try to scrape simultaneously?
  - Solution: File locking or atomic writes
- **Corruption**: What if process crashes mid-write?
  - Solution: Write to temp file, then rename (atomic operation)
- **Frequency calculation**: How to decide if source should be scraped?
  ```typescript
  function shouldScrape(source: Source, state: SourceState): boolean {
    const now = Date.now();
    const lastScraped = new Date(state.last_scraped).getTime();
    const hoursSinceLastScrape = (now - lastScraped) / (1000 * 60 * 60);

    if (source.frequency === 'daily') return hoursSinceLastScrape >= 24;
    if (source.frequency === 'weekly') return hoursSinceLastScrape >= 168;
    return true;
  }
  ```

---

### 4. **Error Handling & Resilience** 🔴 HIGH COMPLEXITY

**Problem**: Scraping is inherently fragile (network issues, HTML changes, rate limits)

**Failure Scenarios**:

1. **Network failures**
   - DNS resolution failure
   - Connection timeout
   - SSL/TLS errors
   - HTTP 500, 502, 503 errors

2. **Anti-bot measures**
   - HTTP 403 Forbidden
   - Cloudflare challenges
   - Rate limiting (HTTP 429)
   - IP bans

3. **HTML structure changes**
   - Parser breaks because selectors changed
   - Schema.org markup removed
   - Page structure redesigned

4. **Data quality issues**
   - Malformed dates/times
   - Missing required fields
   - Encoding issues (Greek characters)

5. **File system issues**
   - Disk full
   - Permission denied
   - Concurrent writes

**Error Handling Strategy**:
```typescript
async function scrapeSource(source: Source): Promise<ScrapeResult> {
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < source.retry_count) {
    try {
      attempt++;

      // Step 1: Scrape HTML
      const htmlPath = await runScraper(source);

      // Step 2: Parse events
      const eventsPath = await runParser(source, htmlPath);

      // Step 3: Import to database
      const importResult = await runImporter(source, eventsPath);

      return {
        success: true,
        events_imported: importResult.count,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      lastError = error;
      console.error(`❌ Attempt ${attempt}/${source.retry_count} failed:`, error.message);

      // Exponential backoff
      const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      await sleep(backoffMs);
    }
  }

  return {
    success: false,
    error: lastError?.message,
    timestamp: new Date().toISOString()
  };
}
```

**Challenges**:
- How to distinguish between transient errors (retry) vs permanent errors (skip)?
- How to alert developers when parsers break?
- How to handle partial failures (some categories succeed, some fail)?

---

### 5. **Agent SDK Integration** 🟡 MEDIUM COMPLEXITY

**Problem**: Need to trigger scraping from Claude Code tool call

**Requirements**:
- Expose as Bun script: `bun run scripts/scrape-all-sources.ts`
- Accept parameters: `--force` (ignore timestamp), `--source=viva.gr` (single source)
- Run in background (don't block Claude Code)
- Report progress in real-time
- Save detailed logs

**Usage from Claude Code**:
```typescript
// User asks: "Scrape all event sources"
await Bun.spawn(['bun', 'run', 'scripts/scrape-all-sources.ts']);

// User asks: "Force scrape viva.gr"
await Bun.spawn(['bun', 'run', 'scripts/scrape-all-sources.ts', '--force', '--source=viva.gr']);
```

**Challenges**:
- How to report progress to Claude Code? (stdout parsing)
- How to handle long-running tasks (30+ minutes for all sources)?
- How to prevent multiple concurrent runs?
  - Solution: PID file or lock file

---

### 6. **Rate Limiting & Politeness** 🟢 LOW COMPLEXITY

**Problem**: Avoid overwhelming source websites

**Best Practices**:
- Minimum 2-5 seconds between requests to same domain
- Respect `robots.txt` (though event sites usually allow)
- User-Agent string: `agent-athens/1.0 (+https://agent-athens.netlify.app)`
- Timeout if request takes >30 seconds

**Implementation**:
```typescript
async function scrapeWithRateLimit(source: Source): Promise<void> {
  const lastScrape = domainLastScrape.get(source.domain) || 0;
  const now = Date.now();
  const timeSinceLastScrape = now - lastScrape;

  if (timeSinceLastScrape < source.rate_limit_ms) {
    const waitTime = source.rate_limit_ms - timeSinceLastScrape;
    console.log(`⏳ Rate limiting: waiting ${waitTime}ms before scraping ${source.name}`);
    await sleep(waitTime);
  }

  domainLastScrape.set(source.domain, Date.now());
  await scrape(source);
}
```

---

### 7. **Diff Detection (Optional Optimization)** 🟢 LOW COMPLEXITY

**Problem**: Re-scraping same data daily wastes resources

**Solution**: Hash HTML content, skip import if unchanged

```typescript
import { createHash } from 'crypto';

function hashFile(filepath: string): string {
  const content = readFileSync(filepath, 'utf-8');
  return createHash('sha256').update(content).digest('hex');
}

async function shouldImport(source: Source, htmlPath: string): Promise<boolean> {
  const currentHash = hashFile(htmlPath);
  const lastHash = state.sources[source.id].last_hash;

  if (currentHash === lastHash) {
    console.log(`⏭️  Skipping ${source.name} - no changes detected`);
    return false;
  }

  state.sources[source.id].last_hash = currentHash;
  return true;
}
```

**Trade-offs**:
- Pro: Saves database writes, faster execution
- Con: Miss updates if HTML changes but events don't (CSS/JS changes)
- Recommendation: Implement if scraping becomes expensive

---

## Architecture Considerations

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code / User                        │
│   "Scrape all sources" or "Scrape viva.gr only"             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│          scripts/scrape-all-sources.ts (Orchestrator)        │
│  - Load config/scrape-list.json                              │
│  - Load data/scrape-state.json                               │
│  - Determine which sources to scrape (based on timestamp)    │
│  - For each source:                                          │
│    1. Check shouldScrape() (frequency + last_scraped)        │
│    2. Run Python scraper (subprocess)                        │
│    3. Run Python parser (subprocess)                         │
│    4. Run TypeScript importer                                │
│    5. Update scrape-state.json                               │
│  - Save final report                                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   viva.gr    │ │   more.com   │ │  gazarte.gr  │
│              │ │              │ │              │
│ Scraper (Py) │ │ Scraper (Py) │ │ Scraper (Py) │
│      ↓       │ │      ↓       │ │      ↓       │
│ Parser (Py)  │ │ Parser (Py)  │ │ Parser (Py)  │
│      ↓       │ │      ↓       │ │      ↓       │
│ Import (TS)  │ │ Import (TS)  │ │ Import (TS)  │
└──────────────┘ └──────────────┘ └──────────────┘
        │             │             │
        └─────────────┼─────────────┘
                      ▼
        ┌─────────────────────────────┐
        │     data/events.db          │
        │  (SQLite - Tier-1 events)   │
        └─────────────────────────────┘
```

### File Structure
```
agent-athens/
├── config/
│   └── scrape-list.json           # Source configuration (NEW)
├── data/
│   ├── scrape-state.json          # Timestamp tracking (NEW)
│   ├── scrape-logs/               # Detailed logs per run (NEW)
│   │   └── 2025-11-01-08-00.log
│   ├── html-to-parse/             # Scraped HTML (existing)
│   ├── parsed/                    # Parsed JSON (existing)
│   └── events.db                  # Final database (existing)
├── scripts/
│   ├── scrape-all-sources.ts      # Main orchestrator (NEW)
│   ├── scrape-all-sites.py        # Python scraper (existing)
│   ├── parse_viva_events.py       # Python parser (existing)
│   └── import-viva-events.ts      # TypeScript importer (existing)
└── src/
    └── scraping/                  # Helper modules (NEW)
        ├── orchestrator.ts        # Core orchestration logic
        ├── state-manager.ts       # scrape-state.json handling
        ├── subprocess-runner.ts   # Python subprocess execution
        └── types.ts               # TypeScript interfaces
```

---

## Implementation Plan

### Phase 1: Configuration & State Management (1-2 days)

**Files to Create**:
1. `config/scrape-list.json` - Source definitions
2. `data/scrape-state.json` - Timestamp tracking
3. `src/scraping/types.ts` - TypeScript interfaces

**Tasks**:
- [ ] Define `Source` interface
- [ ] Define `ScrapeState` interface
- [ ] Create initial `scrape-list.json` with viva.gr, more.com, gazarte.gr
- [ ] Create `state-manager.ts` with `loadState()`, `saveState()`, `updateSourceState()`
- [ ] Test state loading/saving with atomic writes

---

### Phase 2: Subprocess Orchestration (2-3 days)

**Files to Create**:
1. `src/scraping/subprocess-runner.ts` - Run Python scripts
2. `src/scraping/orchestrator.ts` - Main orchestration logic

**Tasks**:
- [ ] Implement `runPythonScript(command, args, timeout)` using `Bun.spawn()`
- [ ] Handle stdout/stderr capture
- [ ] Handle exit codes and errors
- [ ] Implement retry logic with exponential backoff
- [ ] Test with existing Python scrapers

**Example**:
```typescript
async function runPythonScript(
  command: string[],
  timeout: number
): Promise<{ success: boolean; output: string; error?: string }> {
  const proc = Bun.spawn(command, {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeout)
  );

  try {
    await Promise.race([proc.exited, timeoutPromise]);
    const output = await new Response(proc.stdout).text();
    return { success: proc.exitCode === 0, output };
  } catch (error) {
    proc.kill();
    return { success: false, output: '', error: error.message };
  }
}
```

---

### Phase 3: Main Orchestrator Script (2-3 days)

**Files to Create**:
1. `scripts/scrape-all-sources.ts` - CLI entry point

**Tasks**:
- [ ] Parse CLI arguments (`--force`, `--source=X`)
- [ ] Load config and state
- [ ] Determine which sources to scrape
- [ ] For each source:
  - [ ] Check `shouldScrape(source, state)`
  - [ ] Run scraper → parser → importer pipeline
  - [ ] Update state on success/failure
  - [ ] Log detailed results
- [ ] Save final state
- [ ] Generate summary report

**CLI Interface**:
```bash
# Scrape all sources (respects timestamps)
bun run scripts/scrape-all-sources.ts

# Force scrape all (ignore timestamps)
bun run scripts/scrape-all-sources.ts --force

# Scrape specific source
bun run scripts/scrape-all-sources.ts --source=viva.gr

# Dry run (show what would be scraped)
bun run scripts/scrape-all-sources.ts --dry-run
```

---

### Phase 4: Error Handling & Resilience (1-2 days)

**Tasks**:
- [ ] Implement retry logic per source
- [ ] Handle partial failures (one source fails, others continue)
- [ ] Add detailed error logging
- [ ] Implement lock file to prevent concurrent runs
- [ ] Test error scenarios (network failures, parser errors, etc.)

---

### Phase 5: Testing & Integration (1-2 days)

**Tasks**:
- [ ] Test end-to-end with viva.gr (known good source)
- [ ] Test with gazarte.gr (custom parser)
- [ ] Test error scenarios:
  - [ ] Network failure (disconnect WiFi mid-scrape)
  - [ ] Invalid HTML (corrupt parser input)
  - [ ] Disk full
  - [ ] Concurrent execution (two processes running)
- [ ] Test CLI arguments
- [ ] Test from Claude Code tool call
- [ ] Document usage in CLAUDE.md

---

## Edge Cases & Risks

### Edge Cases

1. **Source goes offline permanently**
   - **Detection**: 3+ consecutive failures
   - **Handling**: Mark as `disabled` in config, alert developer

2. **HTML structure changes**
   - **Detection**: Parser returns 0 events (was >100 before)
   - **Handling**: Alert developer, fallback to previous version

3. **Partial HTML (incomplete download)**
   - **Detection**: File size < 10KB or missing closing tags
   - **Handling**: Retry immediately

4. **Rate limiting / IP ban**
   - **Detection**: HTTP 429 or 403
   - **Handling**: Exponential backoff (1hr, 4hr, 24hr)

5. **Timezone confusion**
   - **Issue**: Events might have mixed timezones (UTC, Athens time)
   - **Handling**: Always normalize to `Europe/Athens` in parser

6. **Duplicate events across sources**
   - **Issue**: viva.gr and more.com have overlapping events
   - **Handling**: Existing deduplication script (`remove-duplicates.ts`)

7. **Multi-day events**
   - **Issue**: Festivals with multiple days might be scraped multiple times
   - **Handling**: Parser should create single event with date range

8. **Cancelled events**
   - **Issue**: Source might update page to mark event as cancelled
   - **Handling**: Parser should detect "CANCELLED" keyword, set `is_cancelled=1`

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Python subprocess crashes | Medium | High | Retry logic + timeout |
| Parser breaks due to HTML changes | High | High | Version parsers, alert on 0 events |
| Rate limiting / IP ban | Low | High | Respect rate limits, use delays |
| Disk fills up | Low | Medium | Check disk space before scraping |
| Concurrent execution | Medium | Low | Lock file or PID file |
| State file corruption | Low | Medium | Atomic writes + backup |

---

## Success Criteria

### Functional Requirements

- ✅ Can scrape all sources with single command: `bun run scripts/scrape-all-sources.ts`
- ✅ Respects timestamps (skips recently scraped sources)
- ✅ Updates `scrape-state.json` after each run
- ✅ Continues scraping other sources if one fails
- ✅ Retries failed sources with exponential backoff
- ✅ Runs from Claude Code tool call
- ✅ Generates detailed logs per run

### Performance Requirements

- ✅ Completes viva.gr scraping in <2 minutes
- ✅ Completes all sources in <15 minutes
- ✅ Uses <100MB memory
- ✅ Handles 4+ sources in parallel (if needed)

### Reliability Requirements

- ✅ 95% success rate across all sources
- ✅ Graceful degradation (partial success is acceptable)
- ✅ No data loss on crashes (atomic state updates)
- ✅ No duplicate scraping within same day

---

## Testing Strategy

### Unit Tests

**File**: `tests/scraping/orchestrator.test.ts`
```typescript
describe('shouldScrape', () => {
  test('should return true if never scraped', () => {
    const source = { frequency: 'daily' };
    const state = { last_scraped: null };
    expect(shouldScrape(source, state)).toBe(true);
  });

  test('should return false if scraped <24 hours ago (daily)', () => {
    const source = { frequency: 'daily' };
    const state = { last_scraped: new Date().toISOString() };
    expect(shouldScrape(source, state)).toBe(false);
  });

  test('should return true if scraped >24 hours ago (daily)', () => {
    const source = { frequency: 'daily' };
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const state = { last_scraped: yesterday.toISOString() };
    expect(shouldScrape(source, state)).toBe(true);
  });
});

describe('runPythonScript', () => {
  test('should execute Python script successfully', async () => {
    const result = await runPythonScript(['python3', '-c', 'print("hello")'], 5000);
    expect(result.success).toBe(true);
    expect(result.output).toContain('hello');
  });

  test('should timeout on long-running script', async () => {
    const result = await runPythonScript(['python3', '-c', 'import time; time.sleep(10)'], 1000);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Timeout');
  });
});
```

### Integration Tests

**File**: `tests/scraping/integration.test.ts`
```typescript
describe('scrape-all-sources', () => {
  test('should scrape viva.gr end-to-end', async () => {
    // Run full pipeline
    const result = await Bun.spawn(['bun', 'run', 'scripts/scrape-all-sources.ts', '--source=viva.gr']);

    // Verify HTML was saved
    const htmlFiles = glob.sync('data/html-to-parse/*viva*.html');
    expect(htmlFiles.length).toBeGreaterThan(0);

    // Verify JSON was generated
    const jsonFiles = glob.sync('data/parsed/viva-*.json');
    expect(jsonFiles.length).toBeGreaterThan(0);

    // Verify events were imported
    const db = getDatabase();
    const events = db.prepare("SELECT COUNT(*) as count FROM events WHERE source = 'viva.gr'").get();
    expect(events.count).toBeGreaterThan(100);
  });

  test('should update scrape-state.json', async () => {
    const stateBefore = JSON.parse(readFileSync('data/scrape-state.json', 'utf-8'));

    await Bun.spawn(['bun', 'run', 'scripts/scrape-all-sources.ts', '--source=viva.gr']);

    const stateAfter = JSON.parse(readFileSync('data/scrape-state.json', 'utf-8'));
    expect(stateAfter.sources['viva.gr'].last_scraped).not.toBe(stateBefore.sources['viva.gr'].last_scraped);
  });
});
```

### Manual Testing Checklist

- [ ] Run `bun run scripts/scrape-all-sources.ts` - verify all sources scraped
- [ ] Run again immediately - verify sources skipped (timestamp check)
- [ ] Run with `--force` - verify all sources scraped (ignores timestamp)
- [ ] Run with `--source=viva.gr` - verify only viva.gr scraped
- [ ] Disconnect WiFi mid-scrape - verify retry logic works
- [ ] Delete `data/scrape-state.json` - verify it's recreated
- [ ] Run from Claude Code - verify it works as tool call

---

## References

### Existing Code

1. **Python Scrapers**:
   - `scripts/scrape-all-sites.py` - Main scraper
   - `parse_viva_events.py` - Universal Schema.org parser
   - `parse_gazarte_events.py` - Custom parser

2. **TypeScript Importers**:
   - `scripts/import-viva-events.ts`
   - `scripts/import-more-events.ts`
   - `scripts/import-gazarte-events.ts`

3. **Database Functions**:
   - `src/db/database.ts` - `upsertEvent()`, `getAllEvents()`

4. **Testing**:
   - `tests/database/` - Database tests
   - `tests/unit/` - Unit tests
   - `scripts/test-pipeline.ts` - E2E test

### Documentation

- `docs/VIVA-GR-INTEGRATION.md` - viva.gr parser documentation
- `docs/DEDUPLICATION-GUIDE.md` - Deduplication strategy
- `.claude/CLAUDE.md` - Project overview

### External Dependencies

- **Bun**: Runtime for TypeScript
- **Python 3**: Scraping runtime
- **requests** (Python): HTTP library
- **beautifulsoup4** (Python): HTML parsing
- **selenium** (Python): Headless Chrome (if needed)

---

## Open Questions

1. **Scheduling**: Should we implement cron-like scheduling, or rely on manual triggers?
   - Option A: Implement internal scheduler (run every 24 hours)
   - Option B: Use OS cron job to trigger script
   - Option C: Manual trigger only (current state)

2. **Parallelization**: Should we scrape sources in parallel or sequentially?
   - Parallel: Faster, but higher memory usage
   - Sequential: Slower, but easier to debug

3. **Logging**: How verbose should logs be?
   - Minimal: Only errors and summary
   - Detailed: Every step logged
   - Configurable: Log level in config

4. **Alerting**: How to notify developers on failures?
   - Email alerts
   - Slack webhook
   - Log file only (manual check)

5. **Diff Detection**: Should we implement HTML hash comparison to skip unchanged sources?
   - Pros: Faster, less database writes
   - Cons: Might miss subtle changes

---

## Next Steps

1. **Review this document** with team/stakeholder
2. **Prioritize features** (MVP vs nice-to-have)
3. **Create implementation tasks** in project tracker
4. **Assign Phase 1** (Configuration & State Management)
5. **Set deadline** for MVP completion

---

**Document Version**: 1.0
**Last Updated**: November 1, 2025
**Author**: Claude Code
**Status**: Planning Phase
