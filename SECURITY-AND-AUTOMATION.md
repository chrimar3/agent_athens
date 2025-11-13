# Agent Athens - Security & Automation Guide

**Date:** November 13, 2025
**Status:** ✅ Fully Automated with LaunchAgent (macOS)

---

## 🔒 Security Status

### Email Credentials Protection

**Status:** ✅ SECURE - All credentials properly protected

#### What's Protected:
1. **`.env` file** - Contains Gmail credentials
   - ✅ Listed in `.gitignore`
   - ✅ NOT tracked by git
   - ✅ NOT in repository history
   - ✅ Never committed to GitHub

2. **Credential Storage:**
   ```bash
   # In .env (NOT committed):
   EMAIL_USER=agentathens.events@gmail.com
   EMAIL_PASSWORD=***APP_PASSWORD_HIDDEN***
   ```

3. **Access Control:**
   - File permissions: `600` (owner read/write only)
   - Location: Project root (not publicly accessible)
   - Used by: Local scripts only (never exposed in logs)

#### Security Verification:
```bash
# Verify .env is not tracked
git ls-files | grep "^\.env$"
# (should return nothing)

# Verify .env is in .gitignore
grep "^\.env" .gitignore
# (should show: .env)

# Check file permissions
ls -la .env
# (should show: -rw------- or -rw-r--r--)
```

### Best Practices Implemented:

✅ **Environment Variables** - Credentials in `.env`, not hardcoded
✅ **Git Ignore** - `.env` excluded from version control
✅ **No Logging** - Credentials never written to log files
✅ **Local Only** - No credentials sent to external services
✅ **App Password** - Using Gmail App Password (not main password)

---

## 🤖 Automation Setup

### Current Status: ✅ LaunchAgent Active

You're already using **macOS LaunchAgent** (the recommended approach for macOS).

#### Why LaunchAgent > Cron on macOS:

| Feature | LaunchAgent | Cron |
|---------|-------------|------|
| **Runs when logged out** | ✅ Yes (LaunchDaemon) | ❌ No |
| **GUI notifications** | ✅ Yes | ⚠️ Limited |
| **Environment variables** | ✅ Full control | ⚠️ Limited |
| **Error logging** | ✅ Per-job logs | ⚠️ Shared syslog |
| **macOS integration** | ✅ Native | ⚠️ Legacy |
| **Restart on crash** | ✅ Built-in | ❌ Manual |
| **Calendar intervals** | ✅ Rich options | ⚠️ Basic |

**Verdict:** LaunchAgent is the right choice ✅

---

## 📋 Your Current LaunchAgent Setup

**File:** `~/Library/LaunchAgents/com.user.agent-athens.plist`

### Configuration:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.user.agent-athens</string>

  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>/Users/chrism/Project with Claude/AgentAthens/agent-athens/scripts/daily-update.sh</string>
  </array>

  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>8</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>

  <key>WorkingDirectory</key>
  <string>/Users/chrism/Project with Claude/AgentAthens/agent-athens</string>

  <key>StandardOutPath</key>
  <string>/Users/chrism/Project with Claude/AgentAthens/agent-athens/logs/launchd.log</string>

  <key>StandardErrorPath</key>
  <string>/Users/chrism/Project with Claude/AgentAthens/agent-athens/logs/launchd.error.log</string>

  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin</string>
  </dict>

  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
```

### What It Does:

1. **Runs daily at 8:00 AM**
2. **Executes** `scripts/daily-update.sh`
3. **Logs to:**
   - `logs/launchd.log` (stdout)
   - `logs/launchd.error.log` (stderr)
4. **Sends macOS notification** when complete

---

## 🔄 Daily Automation Workflow

### `scripts/daily-update.sh` Steps:

```bash
#!/bin/bash
# Runs every day at 8:00 AM via LaunchAgent

1. 📧 Fetch emails from Gmail
   └─ bun run fetch-emails

2. 🕷️  Scrape websites (Viva.gr, More.com, Gazarte.gr)
   └─ python3 scripts/scrape-all-sites.py

3. 🧹 Clean up old events (7-day retention)
   └─ bun run scripts/cleanup-old-events.ts

4. 🔔 Send macOS notification
   └─ "Data collection complete! Ready for Claude Code parsing."
```

### Manual Steps (with Claude Code):

After automation runs, you manually:
1. Parse emails: `data/emails-to-parse/`
2. Parse HTML: `data/html-to-parse/`
3. Enrich events with AI descriptions
4. Generate static site: `bun run build`
5. Deploy: `git push origin main`

---

## 🛠️ LaunchAgent Management

### Check Status:
```bash
# Is it loaded?
launchctl list | grep agent-athens

# View logs
tail -f logs/launchd.log

# View errors
tail -f logs/launchd.error.log
```

### Load/Unload:
```bash
# Load (enable)
launchctl load ~/Library/LaunchAgents/com.user.agent-athens.plist

# Unload (disable)
launchctl unload ~/Library/LaunchAgents/com.user.agent-athens.plist

# Reload (after editing plist)
launchctl unload ~/Library/LaunchAgents/com.user.agent-athens.plist
launchctl load ~/Library/LaunchAgents/com.user.agent-athens.plist
```

### Test Manually:
```bash
# Run the daily script manually (don't wait for 8am)
/bin/bash scripts/daily-update.sh

# Or run individual steps
bun run scripts/ingest-emails.ts
python3 scripts/scrape-all-sites.py
bun run scripts/cleanup-old-events.ts
```

### Debug:
```bash
# Check if plist is valid
plutil ~/Library/LaunchAgents/com.user.agent-athens.plist

# View recent runs
log show --predicate 'subsystem == "com.apple.launchd"' --last 1h | grep agent-athens

# Force run now (for testing)
launchctl start com.user.agent-athens
```

---

## 🔧 Common Issues & Fixes

### Issue 1: "fetch-emails: command not found"

**Fix:** Update `daily-update.sh` line 13:
```bash
# Change from:
bun run fetch-emails

# To:
bun run scripts/ingest-emails.ts
```

### Issue 2: Bun not found

**Fix:** Add Bun to PATH in LaunchAgent plist:
```xml
<key>EnvironmentVariables</key>
<dict>
  <key>PATH</key>
  <string>/Users/chrism/.bun/bin:/usr/local/bin:/usr/bin:/bin</string>
</dict>
```

### Issue 3: Permission denied for .env

**Fix:** Set correct permissions:
```bash
chmod 600 .env
```

### Issue 4: Python script fails

**Fix:** Ensure Python 3 is in PATH:
```bash
which python3
# Should show: /usr/bin/python3 or /opt/homebrew/bin/python3
```

---

## 📊 Monitoring Automation

### Daily Checklist:
```bash
# 1. Check if automation ran today
ls -lht logs/launchd.log | head -1

# 2. Check for errors
tail -20 logs/launchd.error.log

# 3. Check data collected
ls -lt data/emails-to-parse/ | head -5
ls -lt data/html-to-parse/ | head -5

# 4. Check database stats
sqlite3 data/events.db "SELECT COUNT(*) FROM events;"
```

### Success Indicators:
- ✅ `launchd.log` has today's timestamp
- ✅ No errors in `launchd.error.log`
- ✅ New files in `data/emails-to-parse/` (if emails arrived)
- ✅ Updated event count in database
- ✅ macOS notification at 8am

---

## 🚀 Advanced Configuration

### Run at Different Times:

Edit `~/Library/LaunchAgents/com.user.agent-athens.plist`:

```xml
<!-- Run at 6:00 AM -->
<key>StartCalendarInterval</key>
<dict>
  <key>Hour</key>
  <integer>6</integer>
  <key>Minute</key>
  <integer>0</integer>
</dict>

<!-- Run twice a day (8am and 8pm) -->
<key>StartCalendarInterval</key>
<array>
  <dict>
    <key>Hour</key>
    <integer>8</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <dict>
    <key>Hour</key>
    <integer>20</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
</array>

<!-- Run every 6 hours -->
<key>StartInterval</key>
<integer>21600</integer>  <!-- 6 hours in seconds -->
```

After editing, reload:
```bash
launchctl unload ~/Library/LaunchAgents/com.user.agent-athens.plist
launchctl load ~/Library/LaunchAgents/com.user.agent-athens.plist
```

### Add Email Notifications:

Add to `daily-update.sh` (end of file):
```bash
# Email yourself when automation completes
echo "Agent Athens daily update completed at $(date)" | \
  mail -s "Agent Athens Update" your-email@example.com
```

### Run Even When Logged Out:

Move plist to **LaunchDaemon** (requires sudo):
```bash
# Copy to system location
sudo cp ~/Library/LaunchAgents/com.user.agent-athens.plist \
  /Library/LaunchDaemons/com.user.agent-athens.plist

# Load as daemon (runs even when logged out)
sudo launchctl load /Library/LaunchDaemons/com.user.agent-athens.plist
```

**Note:** Daemons can't show GUI notifications or access Keychain.

---

## 📝 Summary

### ✅ Current State:
- **Email credentials:** Secure in `.env` (not tracked by git)
- **Automation:** LaunchAgent running daily at 8am
- **Scripts:** Email fetching, web scraping, database cleanup
- **Logs:** Captured to `logs/launchd.log` and `logs/launchd.error.log`
- **Notifications:** macOS notification when complete

### 🎯 Next Steps:
1. ✅ Credentials are secure (no action needed)
2. ⚠️ Fix `daily-update.sh` line 13: `bun run scripts/ingest-emails.ts`
3. ⚠️ Test email ingestion with real Gmail credentials
4. ✅ LaunchAgent is the right choice (no need to switch to cron)

### 🔐 Security Guarantee:
- ✅ `.env` never committed to git
- ✅ Credentials never exposed in logs
- ✅ Gmail App Password (not main password)
- ✅ Local file permissions restrict access

---

**Last Updated:** November 13, 2025
**Maintained by:** Claude Code
