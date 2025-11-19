# Agent Athens - Daily Automation Guide

Complete guide to setting up and running the automated daily workflow for Agent Athens.

## Overview

The daily workflow automatically:

1. **Collects Data**
   - Fetches newsletter emails from Gmail
   - Scrapes event websites (Viva.gr, More.com, Gazarte.gr, etc.)

2. **Processes Data**
   - Parses HTML and emails to extract event information
   - Imports events to SQLite database
   - Filters to Athens-only events

3. **Ensures Data Quality**
   - Extracts missing event times from source pages
   - Extracts missing prices from source pages
   - Removes past events
   - Removes duplicate events (keeps most complete version)
   - Removes events with invalid data (00:00:00 times, missing critical fields)

4. **Publishes**
   - Rebuilds static site (~336 HTML pages)
   - Commits changes to git
   - Deploys to Netlify (https://agentathens.netlify.app)

## Quick Start

### Option 1: Set Up Automatic Daily Run (Recommended)

```bash
# Make scripts executable
chmod +x scripts/daily-workflow.sh
chmod +x scripts/setup-automation.sh

# Install cron job (runs daily at 6:00 AM)
./scripts/setup-automation.sh
```

**That's it!** The workflow will run automatically every day at 6:00 AM.

### Option 2: Run Manually

```bash
# Run the complete workflow once
./scripts/daily-workflow.sh
```

## What Gets Updated

After each run, you'll see:

```
📊 Final Statistics:
   • Total events: 419
   • Pages generated: 336
   • Log file: logs/daily-workflow-20251117-060000.log

🌐 Live site: https://agentathens.netlify.app
```

## Data Quality Guarantees

The workflow ensures:

- ✅ **No past events** - Events older than today are automatically removed
- ✅ **No duplicate events** - Same event on same date = kept once (most complete version)
- ✅ **No bad times** - Events with 00:00:00 timestamps are removed or fixed
- ✅ **Complete data** - Missing times and prices are extracted from source pages
- ✅ **Athens-only** - Events outside Athens are filtered out

## Scripts Breakdown

### Main Workflow
```
scripts/daily-workflow.sh
```
The master script that orchestrates everything. Runs all steps in sequence with error handling and logging.

### Individual Steps

You can also run individual steps if needed:

```bash
# 1. Fetch emails
bun run scripts/ingest-emails.ts

# 2. Scrape websites
python3 scripts/scrape-all-sites.py

# 3. Parse data
python3 scripts/parse_tier1_sites.py
python3 scripts/parse-full-descriptions.py
bun run scripts/parse-newsletter-emails.ts

# 4. Import to database
bun run scripts/import-tier1-events.ts
bun run scripts/import-newsletter-events.ts

# 5. Fix missing data
python3 scripts/fetch-times.py --delay 1.0
python3 scripts/fetch-prices-aggressive.py --delay 1.0

# 6. Clean database
bun run scripts/clean-database.ts

# 7. Rebuild site
bun run build

# 8. Deploy
git add data/events.db dist/
git commit -m "chore: Daily update $(date +%Y-%m-%d)"
git push origin main
netlify deploy --prod --dir=dist
```

## Monitoring

### Check Automation Status

```bash
# View cron jobs
crontab -l

# View recent logs
ls -lt logs/daily-workflow-*.log | head -5

# View most recent log
tail -100 logs/daily-workflow-*.log | tail -1
```

### Database Status

```bash
# Quick stats
./scripts/check-stats.sh

# Or manually
sqlite3 data/events.db "SELECT COUNT(*) FROM events"
sqlite3 data/events.db "SELECT COUNT(*) FROM events WHERE date(start_date) < date('now')"
```

### Live Site Verification

```bash
# Check what's deployed
curl -s "https://agentathens.netlify.app/today" | grep -o "2025-[0-9-]*T[0-9:+-]*" | head -5

# Count midnight times (should be 0)
curl -s "https://agentathens.netlify.app/today" | grep -c "00:00:00"
```

## Logs

All logs are saved to `logs/` directory:

- `logs/daily-workflow-YYYYMMDD-HHMMSS.log` - Full workflow logs (one per run)
- `logs/cron.log` - Output from cron jobs

**Logs include:**
- Step-by-step progress
- Success/failure status for each operation
- Database statistics
- Deployment URLs
- Error messages (if any)

## Troubleshooting

### Workflow Failed

Check the log file:
```bash
# Find most recent log
ls -t logs/daily-workflow-*.log | head -1

# View it
cat logs/daily-workflow-20251117-060000.log
```

Look for `❌` (error) or `⚠️` (warning) symbols.

### Database Has Quality Issues

Run cleanup manually:
```bash
bun run scripts/clean-database.ts
```

This will show what was removed:
```
📊 Database Cleanup Summary
============================================================
Past events removed:       2
Bad times removed:         0
Duplicates removed:        0
Invalid events removed:    0
Total removed:             2
---
Total events in database:  419
Upcoming events:           419
```

### Site Not Updating

Force a manual deployment:
```bash
bun run build
git add dist/ data/events.db
git commit -m "fix: Manual deployment $(date)"
git push origin main
netlify deploy --prod --dir=dist
```

### Email Fetch Failing

Check Gmail credentials:
```bash
grep EMAIL .env
```

Should show:
```
EMAIL_USER=your.email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
```

If missing, see main README for Gmail setup instructions.

## Customization

### Change Schedule

Edit the cron time:
```bash
crontab -e
```

Change `0 6 * * *` to your preferred time:
- `0 6 * * *` - 6:00 AM daily (current)
- `0 8 * * *` - 8:00 AM daily
- `0 6 * * 1` - 6:00 AM every Monday
- `0 6 1 * *` - 6:00 AM on 1st of month

### Skip Steps

Edit `scripts/daily-workflow.sh` and comment out steps you don't want:
```bash
# # 3b. Parse full descriptions
# echo "📝 Parsing full descriptions..." | tee -a "$LOG_FILE"
# python3 scripts/parse-full-descriptions.py >> "$LOG_FILE" 2>&1
```

## Performance

**Typical Runtime:** 10-30 minutes depending on:
- Number of new emails
- Number of websites to scrape
- Number of missing times/prices to fetch
- Network speed

**Resource Usage:**
- CPU: Low (mostly I/O bound)
- Memory: ~500MB peak
- Disk: Minimal (logs grow slowly)
- Network: Moderate (scraping + API calls)

## Best Practices

1. **Let it run automatically** - Don't interfere while it's running
2. **Check logs weekly** - Make sure everything is working
3. **Monitor live site** - Verify data quality
4. **Keep credentials secure** - Never commit `.env` to git
5. **Update dependencies** - Run `bun update` monthly

## Advanced: Manual Intervention

If you need to manually add/edit events:

```bash
# 1. Edit database directly
sqlite3 data/events.db

# 2. Or import from JSON
bun run scripts/import-custom-events.ts

# 3. Then rebuild and deploy
bun run build
git add dist/ data/events.db
git commit -m "feat: Manual event updates"
git push origin main
netlify deploy --prod --dir=dist
```

## Support

For issues:
1. Check logs in `logs/` directory
2. Run individual steps manually to isolate problem
3. Check GitHub Issues
4. Review `.claude/CLAUDE.md` for development guidelines

## Summary

The automated workflow ensures Agent Athens stays up-to-date with minimal manual intervention. Once set up, it runs daily, maintains data quality, and deploys automatically.

**Key Files:**
- `scripts/daily-workflow.sh` - Main automation script
- `scripts/setup-automation.sh` - Cron job installer
- `scripts/clean-database.ts` - Data quality cleanup
- `scripts/fetch-prices-aggressive.py` - Price extraction
- `scripts/fetch-times.py` - Time extraction

**Next Steps:**
1. Run `./scripts/setup-automation.sh` to enable daily automation
2. Or run `./scripts/daily-workflow.sh` manually to test it
3. Check https://agentathens.netlify.app after first run
