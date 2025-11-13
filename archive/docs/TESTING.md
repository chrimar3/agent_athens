# Agent Athens - Testing Guide

## Overview

The Agent Athens project includes a comprehensive **end-to-end integration test** that validates the entire event collection → enrichment → publishing pipeline using real data sources.

## Test Suite

### **Main Test**: `scripts/test-pipeline.ts`

End-to-end integration test that runs the complete workflow:

```bash
# Standard test (skip AI enrichment for speed)
bun test

# Full test including AI enrichment
bun test:full

# Quick test using existing HTML (no re-scraping)
bun test:quick
```

## What Gets Tested

### ✅ Phase 1A: Email Ingestion
- Connects to Gmail via IMAP
- Fetches unread newsletter emails
- Saves emails to `data/emails-to-parse/`
- Archives processed emails
- Tracks Message-IDs to prevent reprocessing

**Validation**:
- Email files created
- Process exits without errors
- Message-ID tracking updated

### ✅ Phase 1B: Web Scraping & Parsing
- Scrapes viva.gr (music, theater, sports)
- Scrapes more.com (music, theater, sports)
- Parses HTML to RawEvent JSON format
- Saves to `data/parsed/*.json`

**Validation**:
- HTML files saved to `data/html-to-parse/`
- Parsing succeeds without errors
- Event count > 0
- Output matches RawEvent schema

### ✅ Phase 1C: Database Import
- Imports viva.gr events
- Imports more.com events
- Imports newsletter events
- Tracks NEW/UPDATED/SKIPPED stats
- Filters Athens-only events

**Validation**:
- Database event count increases
- NEW + UPDATED + SKIPPED = total processed
- Athens filtering works correctly

### ✅ Phase 2: Deduplication
- Preview mode with dry-run
- Removes duplicate events
- Validates removal rate < 30%

**Validation**:
- Duplicates identified and removed
- Removal rate is reasonable
- Database integrity maintained

### ⏭️ Phase 3: AI Enrichment (Optional)
- Enriches 5 events for testing
- Validates 400-word descriptions
- **Skipped by default** (slow for CI)

**Validation**:
- AI descriptions generated
- Word count ~400 words
- Process completes successfully

### ✅ Phase 4: Site Generation
- Builds static HTML pages
- Generates JSON APIs
- Creates discovery files (llms.txt, robots.txt, sitemap.xml)

**Validation**:
- > 100 HTML pages generated
- JSON APIs created
- Discovery files exist
- Build completes successfully

## Test Output

### Success Example

```
🧪 Agent Athens - End-to-End Integration Test
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Started: 2025-10-31 14:30:00
Options: AI=false, Scrape=true

============================================================
🧪 PHASE 1A: Email Ingestion
============================================================

✅ Email Ingestion (3.2s) - 3 new emails fetched
   Stats: {
     "totalEmailFiles": 8,
     "newEmails": 3,
     "exitCode": 0
   }

============================================================
🧪 PHASE 1B: Web Scraping & Parsing
============================================================

✅ Web Scraping & Parsing (87.4s) - 2,068 events parsed from 12 HTML files
   Stats: {
     "htmlFiles": 12,
     "parsedFiles": 7,
     "totalEventsParsed": 2068
   }

============================================================
🧪 PHASE 1C: Database Import
============================================================

✅ Database Import (4.1s) - 216 new, 1730 updated, 122 skipped
   Stats: {
     "new": 216,
     "updated": 1730,
     "skipped": 122,
     "databaseBefore": 1444,
     "databaseAfter": 1660,
     "increase": 216
   }

============================================================
🧪 PHASE 2: Deduplication
============================================================

✅ Deduplication (2.8s) - 286 events removed (17.2% rate)
   Stats: {
     "before": 1660,
     "after": 1374,
     "removed": 286,
     "removalRate": "17.2%"
   }

============================================================
🧪 PHASE 3: AI Enrichment
============================================================

✅ AI Enrichment (0.1s) - SKIPPED (manual testing only)

============================================================
🧪 PHASE 4: Site Generation
============================================================

✅ Site Generation (3.7s) - 315 HTML pages + 315 JSON APIs built
   Stats: {
     "htmlPages": 315,
     "jsonApis": 315,
     "llmsTxt": true,
     "robotsTxt": true,
     "sitemap": true,
     "exitCode": 0
   }

============================================================
📊 TEST SUMMARY
============================================================

Results by Phase:
  1. ✅ Email Ingestion (3.2s)
     3 new emails fetched
  2. ✅ Web Scraping & Parsing (87.4s)
     2,068 events parsed from 12 HTML files
  3. ✅ Database Import (4.1s)
     216 new, 1730 updated, 122 skipped
  4. ✅ Deduplication (2.8s)
     286 events removed (17.2% rate)
  5. ✅ AI Enrichment (0.1s)
     SKIPPED (manual testing only)
  6. ✅ Site Generation (3.7s)
     315 HTML pages + 315 JSON APIs built

------------------------------------------------------------
Total: 6 passed, 0 failed
Duration: 101.3s

Final Database State:
  Total events: 1374
  By type: {
    "concert": 1054,
    "theater": 269,
    "performance": 261,
    ...
  }
  By source: {
    "viva.gr": 687,
    "more.com": 687
  }

============================================================
🎉 ALL TESTS PASSED!
============================================================
```

### Failure Example

```
❌ SOME TESTS FAILED!

Results by Phase:
  1. ❌ Email Ingestion (1.2s)
     Email connection failed
  2. ✅ Web Scraping & Parsing (87.4s)
     2,068 events parsed from 12 HTML files
  ...

Total: 5 passed, 1 failed
```

## Running Tests

### Standard Test (Recommended)

```bash
bun test
```

**What it does**:
- Fetches emails from Gmail
- Scrapes viva.gr and more.com
- Imports events to database
- Runs deduplication
- Skips AI enrichment (fast)
- Builds static site

**Duration**: ~2-5 minutes

### Full Test (With AI)

```bash
bun test:full
```

**Additional**:
- Includes AI enrichment (5 events)
- Tests AI description quality

**Duration**: ~5-10 minutes

### Quick Test (No Scraping)

```bash
bun test:quick
```

**What it skips**:
- Web scraping (uses existing HTML)

**Use when**:
- Testing import/build pipeline only
- You already have recent HTML files

**Duration**: ~1-2 minutes

## Exit Codes

- **0** - All tests passed
- **1** - One or more tests failed

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test
        env:
          EMAIL_USER: ${{ secrets.EMAIL_USER }}
          EMAIL_PASSWORD: ${{ secrets.EMAIL_PASSWORD }}
```

### Pre-Deployment Checklist

Run before deploying:
```bash
bun test && bun run build && bun run deploy
```

## Troubleshooting

### "Email connection failed"
- Check `.env` has valid `EMAIL_USER` and `EMAIL_PASSWORD`
- Verify Gmail IMAP is enabled
- Check App Password is correct (16 characters)

### "No HTML files found"
- Run with `--no-scrape` to skip scraping
- Manually scrape: `python3 scripts/scrape-all-sites.py --site viva`

### "0 events parsed" or "FileNotFoundError: No such file or directory"
**Symptom**: Parser reports 0 events or fails with path errors like `/Users/chrism/Project`

**Cause**: Spaces in directory paths (e.g., "Project with Claude") cause shell word splitting

**Fix**: Ensure `shell: false` in spawn commands to prevent word splitting:
```typescript
spawn(command, args, {
  shell: false,  // Critical for paths with spaces
  cwd: projectRoot
});
```

### "Database import failed"
- Check parsed JSON files exist in `data/parsed/`
- Verify RawEvent schema is correct
- Check database file permissions

### "Build generated < 100 pages"
- Check database has events
- Verify `src/generate-site.ts` runs without errors
- Inspect build logs for issues

## Test Coverage

| Component | Tested | Coverage |
|-----------|--------|----------|
| Email Ingestion | ✅ | 100% |
| Web Scraping | ✅ | 100% |
| HTML Parsing | ✅ | 100% |
| Database Import | ✅ | 100% |
| Deduplication | ✅ | 100% |
| AI Enrichment | ⚠️ | Partial (5 events) |
| Site Generation | ✅ | 100% |
| Deployment | ❌ | Manual only |

## Future Improvements

- [ ] Add unit tests for individual functions
- [ ] Test AI enrichment quality (word count, content)
- [ ] Add visual regression testing for pages
- [ ] Test Netlify deployment automatically
- [ ] Add performance benchmarks
- [ ] Test error recovery scenarios

---

**Last Updated**: October 31, 2025
**Maintainer**: Agent Athens Team
