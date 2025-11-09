# Cron Automation Setup - Agent Athens

**Date**: November 3, 2025
**Status**: ✅ ACTIVE - Running daily at 8:00 AM

---

## Summary

Successfully set up automated daily data collection for Agent Athens using cron. The system runs every day at 8:00 AM Athens time, performing email ingestion and web scraping automatically.

---

## Cron Schedule

```bash
# Agent Athens - Daily data collection (8 AM)
0 8 * * * cd /Users/chrism/Project\ with\ Claude/AgentAthens/agent-athens && /Users/chrism/.bun/bin/bun run scripts/scrape-all-sources.ts >> logs/scrape-$(date +\%Y\%m\%d).log 2>&1
```

**Schedule**: Every day at 8:00 AM
**Command**: `bun run scripts/scrape-all-sources.ts`
**Logs**: `logs/scrape-YYYYMMDD.log` (daily log files)

---

## What Runs Automatically

### Daily 8:00 AM Workflow

**STEP 0: Email Ingestion** (Priority 0)
- Connects to Gmail (`agentathens.events@gmail.com`)
- Fetches unread newsletter emails
- Saves to `data/emails-to-parse/`
- Archives emails (INBOX → All Mail)
- Tracks processed emails (prevents duplicates)
- **Frequency**: Daily (runs every day)

**STEP 1: Web Scraping** (Priority 1-3)
- Scrapes viva.gr (daily)
- Scrapes more.com (daily)
- Scrapes gazarte.gr (weekly)
- **Frequency**: Frequency-based (only scrapes when due)

**Output**:
- Emails ready for parsing in `data/emails-to-parse/`
- Events imported to database
- State tracking updated in `data/scrape-state.json`
- Daily log file created: `logs/scrape-YYYYMMDD.log`

---

## Installed Crontab

View current crontab:
```bash
crontab -l
```

Expected output:
```
0 * * * * cd /Users/chrism/spitogatos_premium_analysis && /Users/chrism/spitogatos_premium_analysis/enhanced_hourly_commit.sh >> /Users/chrism/spitogatos_premium_analysis/commit_log.txt 2>&1

# Agent Athens - Daily data collection (8 AM)
0 8 * * * cd /Users/chrism/Project\ with\ Claude/AgentAthens/agent-athens && /Users/chrism/.bun/bin/bun run scripts/scrape-all-sources.ts >> logs/scrape-$(date +\%Y\%m\%d).log 2>&1
```

---

## Monitoring

### Check If Cron Ran Today

```bash
# Check today's log file
cd /Users/chrism/Project\ with\ Claude/AgentAthens/agent-athens
ls -lh logs/scrape-$(date +%Y%m%d).log

# View log content
tail -50 logs/scrape-$(date +%Y%m%d).log
```

### Check Latest State

```bash
# View orchestrator state
cat data/scrape-state.json | jq '.'

# Check last email ingestion
cat data/scrape-state.json | jq '.email_ingestion'

# Check web scraping sources
cat data/scrape-state.json | jq '.sources'
```

### Check Database Stats

```bash
# Quick stats
./scripts/check-stats.sh

# Or manually
echo "SELECT COUNT(*) FROM events;" | sqlite3 data/events.db
```

### Check Emails Waiting to Parse

```bash
# List emails
bun run scripts/parse-emails.ts

# Count emails
ls -1 data/emails-to-parse/*.json 2>/dev/null | wc -l
```

---

## Log Files

### Daily Log Location

Format: `logs/scrape-YYYYMMDD.log`

Examples:
- `logs/scrape-20251103.log` - Nov 3, 2025
- `logs/scrape-20251104.log` - Nov 4, 2025

### View Logs

```bash
# Today's log
tail -100 logs/scrape-$(date +%Y%m%d).log

# Yesterday's log
tail -100 logs/scrape-$(date -v-1d +%Y%m%d).log

# All logs
ls -lh logs/scrape-*.log

# Search for errors
grep -i "error\|failed\|❌" logs/scrape-*.log
```

### Clean Old Logs

```bash
# Delete logs older than 30 days
find logs -name "scrape-*.log" -mtime +30 -delete

# Archive logs older than 7 days
find logs -name "scrape-*.log" -mtime +7 -exec gzip {} \;
```

---

## Testing

### Test Cron Configuration

```bash
# Run test script
./scripts/test-cron.sh
```

Expected output:
```
✅ All checks passed! Cron job should work correctly.
```

### Manual Test Run

```bash
# Simulate cron job (uses exact same command)
cd /Users/chrism/Project\ with\ Claude/AgentAthens/agent-athens && /Users/chrism/.bun/bin/bun run scripts/scrape-all-sources.ts

# Dry-run (preview without executing)
/Users/chrism/.bun/bin/bun run scripts/scrape-all-sources.ts --dry-run

# Force all sources (ignore frequency)
/Users/chrism/.bun/bin/bun run scripts/scrape-all-sources.ts --force
```

---

## Troubleshooting

### Issue: Cron job didn't run

**Check 1**: Verify cron is installed
```bash
crontab -l | grep "agent-athens"
```

**Check 2**: Check system cron logs (macOS)
```bash
log show --predicate 'process == "cron"' --last 1d
```

**Check 3**: Test manually
```bash
./scripts/test-cron.sh
```

### Issue: No log file created

**Cause**: Permissions or path issue

**Fix**:
```bash
# Check logs directory exists and is writable
cd /Users/chrism/Project\ with\ Claude/AgentAthens/agent-athens
ls -la logs/
mkdir -p logs  # Create if missing
```

### Issue: Email ingestion failing

**Check 1**: Verify credentials
```bash
cat .env | grep EMAIL
```

**Check 2**: Test email ingestion manually
```bash
bun run scripts/ingest-emails.ts --dry-run
```

**Check 3**: Check Gmail IMAP
- Verify IMAP enabled in Gmail settings
- Verify App Password is correct (16 characters)

### Issue: Web scraping not running

**Check**: View state to see last run times
```bash
cat data/scrape-state.json | jq '.sources'
```

**Reason**: Frequency-based - sources only scrape when due
- viva.gr: daily
- more.com: daily
- gazarte.gr: weekly

**Fix**: Force run to override frequency
```bash
bun run scripts/scrape-all-sources.ts --force
```

---

## Configuration

### Change Run Time

Edit crontab:
```bash
crontab -e
```

Change the hour (currently `8`):
```
# 6 AM
0 6 * * * ...

# 10 AM
0 10 * * * ...

# Noon
0 12 * * * ...
```

### Disable Automation

**Option 1**: Remove cron job
```bash
crontab -e
# Delete or comment out the Agent Athens line
```

**Option 2**: Disable email ingestion only
Edit `config/orchestrator-config.json`:
```json
{
  "email_ingestion": {
    "enabled": false
  }
}
```

**Option 3**: Disable specific web sources
Edit `config/orchestrator-config.json`:
```json
{
  "sources": [
    {
      "id": "viva.gr",
      "enabled": false  // Disable this source
    }
  ]
}
```

---

## Email Parsing Workflow

**Note**: Email parsing is currently **manual** (not automated by cron).

### After Cron Runs

1. **Check for new emails**:
   ```bash
   bun run scripts/parse-emails.ts
   ```

2. **Parse with Claude Code**:
   ```
   Ask Claude Code:
   "Parse the emails in data/emails-to-parse/ and add events to the database"
   ```

3. **Verify events imported**:
   ```bash
   ./scripts/check-stats.sh
   ```

### Future: Agent SDK Automation

When Agent SDK integration is complete:
- Email parsing will be automated
- Full end-to-end automation: fetch → parse → import
- No manual intervention needed

---

## Backup & Recovery

### Backup State Files

```bash
# Backup before making changes
cp data/scrape-state.json data/scrape-state.json.backup
cp data/processed-emails.json data/processed-emails.json.backup
```

### Restore from Backup

```bash
# Restore state
cp data/scrape-state.json.backup data/scrape-state.json
```

### Reset State (Start Fresh)

```bash
# ⚠️  WARNING: This will cause all sources to run on next cron execution
rm data/scrape-state.json

# Reset email tracking (will re-fetch all emails)
rm data/processed-emails.json
```

---

## Performance & Resource Usage

### Expected Runtime

- **Email ingestion**: ~10-30 seconds
- **Web scraping** (per source): ~30-60 seconds
- **Total**: ~2-5 minutes for full run

### Disk Space

- **Logs**: ~10-50KB per day (~1.5MB per month)
- **Database**: ~5MB (721 events)
- **Emails**: ~500KB (5 emails)

### Clean Up

```bash
# Delete old logs (keep last 30 days)
find logs -name "scrape-*.log" -mtime +30 -delete

# Delete processed emails (keep last 7 days)
find data/emails-parsed -name "*.json" -mtime +7 -delete
```

---

## Success Metrics

**Automation Status**: ✅ ACTIVE

**Setup Completed**:
- ✅ Cron job installed (8 AM daily)
- ✅ Email ingestion configured
- ✅ Web scraping configured
- ✅ Logs directory created
- ✅ Test script created (`scripts/test-cron.sh`)
- ✅ Monitoring instructions documented

**Next Automated Run**: Tomorrow at 8:00 AM

**What Will Happen**:
1. Email ingestion fetches newsletters
2. Web scraping updates events (if sources are due)
3. State tracking updated
4. Log file created: `logs/scrape-20251104.log`
5. Emails ready for manual parsing

---

## Quick Reference

### Daily Checks (Optional)

```bash
# Morning check (after 8 AM)
cd /Users/chrism/Project\ with\ Claude/AgentAthens/agent-athens

# 1. Check if cron ran
tail -20 logs/scrape-$(date +%Y%m%d).log

# 2. Check for new emails to parse
bun run scripts/parse-emails.ts

# 3. Check database stats
./scripts/check-stats.sh
```

### Emergency Stop

```bash
# Disable cron job
crontab -e
# Comment out Agent Athens line with #
```

### Re-enable

```bash
# Uncomment in crontab
crontab -e
# Remove # from Agent Athens line
```

---

## Conclusion

The Agent Athens automation is now fully operational. The system will automatically collect data every day at 8:00 AM, fetching newsletter emails and scraping websites based on configured frequencies.

Email parsing remains manual (via Claude Code with free `tool_agent`), but all email fetching and web scraping is fully automated.

**Recommended**: Check logs once a week to ensure smooth operation.

---

**Document Version**: 1.0
**Last Updated**: November 3, 2025
**Status**: ✅ CRON AUTOMATION ACTIVE
