# Agent Athens - Project Cleanup Plan

## Files to KEEP (Essential)

### Core Configuration
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript config
- `netlify.toml` - Deployment config
- `.gitignore` - Git ignore rules
- `.env` - Environment variables (not in git)
- `.env.example` - Example env vars

### Documentation (Keep Main Ones)
- `README.md` - Main project docs
- `ELEVATOR_PITCH.md` - Project pitch
- `PROJECT_DESCRIPTION.md` - Project overview

### Active Scripts (Daily Automation)
- `scripts/scrape-all-sites.py` - Main scraper (ACTIVE)
- `scripts/fetch-prices.py` - Price fetcher (ACTIVE)
- `scripts/import-scraped-events.ts` - Import pipeline
- `scripts/enrich-november-greek.ts` - Greek enrichment (CURRENT WORK)
- `scripts/generate-site.ts` - Site builder

### Data
- `data/events.db` - Main database
- `data/enriched/` - All enriched descriptions (KEEP ALL)
- `config/scrape-list.json` - Scraper targets

### Source Code
- `src/` - All TypeScript source files
- `tests/` - Test suites

## Files to ARCHIVE (Move to archive/)

### Session Notes & Progress Docs
- All `SESSION-*.md` files
- All `BATCH-*.md` files  
- All `PHASE-*.md` in docs/
- `CONTINUE-HERE.md`
- `VIVA-FIX-SUMMARY.md`
- `HTML-PARSING-COMPLETE-REPORT.md`
- `CODING_PATTERNS.md`
- `ENRICHMENT_README.md`
- `ENRICHMENT-PLAN.md`
- `ENRICHMENT-SESSION-PROGRESS.md`
- `ENRICHMENT-STATUS.md`
- `GREEK-ENRICHMENT-STATUS-2025-11-12.md`
- `AFTER-PRICE-FETCH.md`
- `AUTOMATION.md`
- `IMPLEMENTATION_PLAN.md`
- `PARSING-SUMMARY.md`
- `PROJECT-STATUS-*.md`

### Old/Deprecated Scripts
- `scripts/analyze-price-page.py` - One-time debugging
- `scripts/auto-enrich-batch.py` - Deprecated (using manual workflow)
- `scripts/auto-enrich-november.ts` - Deprecated
- `scripts/batch-enrich-all.ts` - Deprecated
- `scripts/batch-enrich-events.py` - Deprecated
- `scripts/enrich-5-events.ts` - Old test script
- `scripts/enrich-10-bilingual.ts` - Old test script
- `scripts/batch-parse-html.ts` - One-time task (complete)
- `scripts/debug-viva-price.py` - Debugging script
- `scripts/consolidate-events.js` - One-time migration
- `scripts/continue-batch-1.md` - Session notes
- `test-price-load.ts` - One-time test
- `parse_viva_events.py` - One-time parser

### Old Logs (Keep last 7 days only)
- Logs older than Nov 6, 2025

## Files to DELETE

### System Files
- `.DS_Store`
- Any other Mac/OS cruft

### Lock Files (Regeneratable)
- `bun.lock` (committed but regeneratable)
- `package-lock.json` (if using bun primarily)

## Actions

1. Create `archive/` directory
2. Move session docs to `archive/session-notes/`
3. Move old scripts to `archive/deprecated-scripts/`
4. Move old logs (>7 days) to `archive/logs-archive/`
5. Delete `.DS_Store` files
6. Update README with current status
7. Create simple CONTRIBUTING.md for future work

## Final Structure

```
agent-athens/
├── README.md
├── package.json
├── tsconfig.json
├── netlify.toml
├── .gitignore
├── .env.example
├── ELEVATOR_PITCH.md
├── PROJECT_DESCRIPTION.md
├── src/                    # TypeScript source
├── scripts/                # Active automation scripts only
├── tests/                  # Test suites
├── data/
│   ├── events.db
│   └── enriched/           # All Greek descriptions
├── config/
│   └── scrape-list.json
├── logs/                   # Last 7 days only
├── dist/                   # Generated site (committed)
└── archive/                # Historical docs & deprecated code
    ├── session-notes/
    ├── deprecated-scripts/
    └── logs-archive/
```
