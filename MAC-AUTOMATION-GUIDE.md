# Mac Automation for Agent Athens Enrichment

## 🍎 What's Automated

Your Mac now automatically:
1. **Checks daily at 9 AM** for unenriched events
2. **Creates a report** on your Desktop with event counts and samples
3. **Sends a notification** if ≥10 events need enrichment
4. **Reminds you** to open Claude Code and enrich events

## 🔄 The Workflow

### Automated Part (Mac):
- ✅ Daily check at 9:00 AM via launchd
- ✅ Count unenriched events
- ✅ Generate report with event samples
- ✅ Notify you via macOS notification

### Manual Part (You + Claude Code):
- 👤 You see notification/report
- 👤 You open Claude Code in this project
- 👤 You say: **"Enrich 10 events"**
- 🤖 Claude Code uses Task tool → seo-content-writer agent
- 🤖 Generates high-quality 400-word Greek descriptions
- ✅ Done in ~5 minutes!

## 📋 Quick Commands

### Check status now:
```bash
./scripts/daily-enrichment-check.sh
```

### View automation logs:
```bash
tail -f logs/enrichment-check.log
```

### Verify launchd is running:
```bash
launchctl list | grep agentoathens
```

### Disable automation:
```bash
launchctl unload ~/Library/LaunchAgents/com.agentoathens.enrichment-check.plist
```

### Re-enable automation:
```bash
launchctl load ~/Library/LaunchAgents/com.agentoathens.enrichment-check.plist
```

## 🎯 How to Use

### Daily Routine:
1. **9 AM**: Your Mac checks for unenriched events
2. **You get notified**: macOS notification + Desktop report
3. **Open Claude Code**: When you have 5 minutes
4. **Say**: "Enrich 10 events using seo-content-writer agent"
5. **Wait**: ~5 minutes for high-quality descriptions
6. **Done!**: Events are enriched and ready

### Example Request to Claude Code:
```
Enrich 10 events using seo-content-writer agent
```

Claude will:
- Query database for 10 unenriched future events
- For each event, call Task tool with seo-content-writer agent
- Generate 400-word Greek descriptions with cultural context
- Update database with enriched descriptions
- Report success/failures

## 📊 Current Status

Check the Desktop report for:
- Total unenriched events
- Sample events needing work
- Estimated batches remaining
- Time estimate (~5 min per batch of 10)

## 🔧 Files Created

- `scripts/daily-enrichment-check.sh` - The check script
- `scripts/setup-mac-automation.sh` - Setup script
- `~/Library/LaunchAgents/com.agentoathens.enrichment-check.plist` - launchd config
- `logs/enrichment-check.log` - Automation logs
- `~/Desktop/enrichment-report-YYYYMMDD.txt` - Daily reports

## 💡 Why This Approach?

**Can't automate**: Task tool (only works in active Claude Code sessions)
**Can automate**: Everything else (checks, reports, notifications)

**Result**: You get reminded daily, then spend 5 minutes with Claude Code to enrich 10 high-quality events. Much better than fully automated low-quality descriptions!

## 📈 Progress Tracking

At 10 events/day:
- **690 events** remaining
- **69 days** to complete
- **~10 weeks** total

At 10 events twice/week:
- **~35 weeks** to complete
- **~8 months** total

Both paces are fine because:
- New events arrive constantly (newsletters + scraping)
- Quality > Speed for SEO
- Manual review ensures no fabrication

## ✅ Benefits

- ✅ **FREE** - No API costs
- ✅ **High Quality** - Cultural context, artist info, engaging narrative
- ✅ **Reliable** - No 503 errors, no rate limits
- ✅ **Flexible** - You control the pace
- ✅ **Automated reminders** - Never forget to enrich
- ✅ **SEO optimized** - 400-600 word descriptions (better than 300)

---

**Next time Claude Code asks what to work on, just say:**
> "Enrich 10 events"

That's it! 🎉
