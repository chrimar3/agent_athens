# Scraper Integration Guide

**Purpose**: How to integrate existing Python scrapers with the new orchestrator

**Date**: November 3, 2025

---

## Current Situation

### What We Built (Phases 1-3)

**Orchestration System**:
- ✅ Configuration management (`config/scrape-list.json`)
- ✅ State tracking (`data/scrape-state.json`)
- ✅ Subprocess runner with timeout & retry
- ✅ Main orchestrator (`scripts/scrape-all-sources.ts`)
- ✅ CLI arguments (`--force`, `--source=X`, `--dry-run`)

**Config Format** (Orchestrator expects):
```json
{
  "version": "1.0",
  "sources": [
    {
      "id": "viva.gr",
      "scraper": {
        "command": ["python3", "scripts/scrape-all-sites.py", "--site", "viva"]
      }
    }
  ]
}
```

### Existing Scrapers

**Python Scraper**: `scripts/scrape-all-sites.py`

**Expected Config** (Scraper expects):
```json
{
  "crawl_config": {
    "total_sites": 10,
    "expected_monthly_events": 5000,
    "user_agent": "...",
    "default_delay_seconds": 2
  }
}
```

**Problem**: Config format mismatch ❌

---

## Integration Options

### Option 1: Create Wrapper Scripts (RECOMMENDED)

Create simple Python wrapper scripts that adapt the orchestrator's command to the existing scraper's expected format.

**Example**: `scripts/scrape-viva-wrapper.py`
```python
#!/usr/bin/env python3
"""
Wrapper for scraping viva.gr
Called by orchestrator, delegates to scrape-all-sites.py with proper config
"""
import sys
import subprocess

# Run actual scraper with hardcoded config
result = subprocess.run([
    'python3', 'scripts/scrape-all-sites.py',
    '--site', 'viva',
    '--config', 'config/scraper-config.json'  # Point to separate config
], capture_output=True, text=True)

print(result.stdout)
sys.exit(result.returncode)
```

**Update config/scrape-list.json**:
```json
{
  "scraper": {
    "command": ["python3", "scripts/scrape-viva-wrapper.py"]
  }
}
```

**Pros**:
- ✅ No changes to existing scraper
- ✅ Clean separation of concerns
- ✅ Easy to test

**Cons**:
- ❌ Extra wrapper files needed

---

### Option 2: Modify Existing Scraper

Update `scrape-all-sites.py` to accept command-line args instead of config file.

**Example Modification**:
```python
# Before (reads from config file)
crawl_config = data['crawl_config']

# After (accepts command-line args or defaults)
import argparse
parser = argparse.ArgumentParser()
parser.add_argument('--site', required=True)
parser.add_argument('--user-agent', default='Mozilla/5.0...')
parser.add_argument('--delay', type=float, default=2.0)
args = parser.parse_args()
```

**Pros**:
- ✅ Cleaner long-term solution
- ✅ No wrapper files

**Cons**:
- ❌ Modifies working scraper code
- ❌ Risk of breaking existing functionality

---

### Option 3: Use Separate Config File

Keep the orchestrator config and scraper config separate.

**Orchestrator Config**: `config/scrape-list.json`
```json
{
  "sources": [{
    "id": "viva.gr",
    "scraper": {
      "command": ["python3", "scripts/scrape-all-sites.py", "--site", "viva", "--config", "config/scraper-config.json"]
    }
  }]
}
```

**Scraper Config**: `config/scraper-config.json`
```json
{
  "crawl_config": {
    "total_sites": 10,
    "user_agent": "...",
    "default_delay_seconds": 2
  }
}
```

**Pros**:
- ✅ No code changes needed
- ✅ Both configs maintained separately

**Cons**:
- ❌ Duplicate configuration
- ❌ Two files to maintain

---

## Recommended Approach

### Step 1: Create Scraper Config

Create `config/scraper-config.json` with the format the existing scraper expects:

```json
{
  "crawl_config": {
    "total_sites": 3,
    "expected_monthly_events": 5000,
    "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "default_delay_seconds": 2,
    "default_crawl_frequency": "daily",
    "default_timeout_ms": 30000,
    "max_retries": 2
  },
  "sites": {
    "viva": {
      "url": "https://www.viva.gr/events/",
      "name": "Viva.gr",
      "enabled": true
    },
    "more": {
      "url": "https://www.more.com/events/",
      "name": "More.com",
      "enabled": true
    },
    "gazarte": {
      "url": "https://gazarte.gr/program/",
      "name": "Gazarte",
      "enabled": true
    }
  }
}
```

### Step 2: Update scrape-list.json Commands

Update orchestrator config to pass the scraper config file:

```json
{
  "version": "1.0",
  "sources": [
    {
      "id": "viva.gr",
      "name": "Viva.gr",
      "enabled": true,
      "frequency": "daily",
      "scraper": {
        "type": "python",
        "command": [
          "python3",
          "scripts/scrape-all-sites.py",
          "--site", "viva",
          "--config", "config/scraper-config.json"
        ],
        "timeout_ms": 120000,
        "retry_count": 3
      },
      "parser": {
        "type": "python",
        "script": "parse_tier1_sites.py"
      },
      "importer": {
        "type": "bun",
        "script": "scripts/import-viva-events.ts"
      },
      "rate_limit_ms": 2000,
      "priority": 1
    }
  ]
}
```

### Step 3: Test Integration

```bash
# Test orchestrator with updated config
bun run scripts/scrape-all-sources.ts --source=viva.gr --dry-run

# If dry-run looks good, run for real
bun run scripts/scrape-all-sources.ts --source=viva.gr --force
```

---

## Testing Checklist

Before running in production:

### Config Validation
- [ ] `config/scraper-config.json` exists
- [ ] Scraper config has all required fields
- [ ] `config/scrape-list.json` updated with --config arg
- [ ] Paths to scripts are correct

### Dry Run Tests
- [ ] `--dry-run` shows expected sources
- [ ] `--source=viva.gr --dry-run` shows single source
- [ ] `--force --dry-run` shows all sources

### Single Source Test
- [ ] Run with `--source=viva.gr --force`
- [ ] Verify scraper completes successfully
- [ ] Check `data/scrape-state.json` updated
- [ ] Verify events imported to database
- [ ] Check database count before/after

### Full Pipeline Test
- [ ] Run without flags (frequency-based)
- [ ] Verify only due sources run
- [ ] Check rate limiting works (2-5s delays)
- [ ] Verify state file updated for all sources
- [ ] Check final summary shows correct counts

---

## Troubleshooting

### Error: "KeyError: 'crawl_config'"

**Problem**: Scraper can't find config file

**Solution**:
```bash
# Ensure config file exists
ls -la config/scraper-config.json

# Check command in scrape-list.json includes --config flag
cat config/scrape-list.json | grep "config"
```

### Error: "Module not found"

**Problem**: Python dependencies missing

**Solution**:
```bash
# Install required packages
pip3 install playwright aiohttp beautifulsoup4
```

### Error: "Timeout"

**Problem**: Scraper taking too long

**Solution**:
1. Increase timeout in `config/scrape-list.json`:
   ```json
   "timeout_ms": 300000  // 5 minutes
   ```
2. Or check network connection
3. Or scraper is hanging (check Python code)

### Parser/Importer Not Found

**Problem**: Script paths incorrect

**Solution**:
```bash
# Verify scripts exist
ls -la scripts/parse_tier1_sites.py
ls -la scripts/import-viva-events.ts

# Update paths in config if needed
```

---

## Next Steps

1. **Create `config/scraper-config.json`** with proper format
2. **Update `config/scrape-list.json`** to pass config file
3. **Test with single source** (`--source=viva.gr --force`)
4. **Verify state updates** and database imports
5. **Run full pipeline** with all sources
6. **Set up cron job** for daily automation

---

## Automation Setup

Once integration is working:

### Cron Job (Daily at 6 AM)
```bash
# Edit crontab
crontab -e

# Add line:
0 6 * * * cd /path/to/agent-athens && /usr/local/bin/bun run scripts/scrape-all-sources.ts >> logs/scrape-$(date +\%Y\%m\%d).log 2>&1
```

### Manual Commands

```bash
# Daily check (only runs sources that are due)
bun run scripts/scrape-all-sources.ts

# Force all sources
bun run scripts/scrape-all-sources.ts --force

# Test without executing
bun run scripts/scrape-all-sources.ts --dry-run

# Single source update
bun run scripts/scrape-all-sources.ts --source=viva.gr
```

---

## Summary

**Current Status**:
- ✅ Orchestrator built and tested
- ✅ State management working
- ✅ Subprocess execution working
- ⏸️ Scraper integration pending config alignment

**Required Action**:
- Create `config/scraper-config.json` with scraper's expected format
- Update `config/scrape-list.json` to pass config file to scraper
- Test end-to-end with single source
- Deploy to production when verified

**Estimated Time**: 30 minutes to integrate and test

---

**Document Version**: 1.0
**Last Updated**: November 3, 2025
**Status**: Ready for Integration
