#!/bin/bash
################################################################################
# Agent Athens - Complete Daily Workflow
################################################################################
#
# This script handles the complete daily data pipeline:
# 1. Fetch emails & scrape websites
# 2. Parse and import events
# 3. Extract missing times & prices
# 4. Clean database (remove past events, duplicates, bad data)
# 5. Rebuild site
# 6. Deploy to Netlify
#
# Usage:
#   ./scripts/daily-workflow.sh
#
# Can be automated with cron:
#   0 6 * * * cd /path/to/agent-athens && ./scripts/daily-workflow.sh
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
LOG_FILE="logs/daily-workflow-$(date +%Y%m%d-%H%M%S).log"
mkdir -p logs

log() {
    echo -e "${GREEN}✅${NC} $1" | tee -a "$LOG_FILE"
}

log_step() {
    echo "" | tee -a "$LOG_FILE"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}$1${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}⚠️${NC}  $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}❌${NC} $1" | tee -a "$LOG_FILE"
}

# Start
echo "" | tee -a "$LOG_FILE"
echo "🚀 Agent Athens - Complete Daily Workflow" | tee -a "$LOG_FILE"
echo "Started: $(date)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

################################################################################
# STEP 1: Data Collection
################################################################################
log_step "📥 STEP 1: Data Collection"

# 1a. Fetch emails from Gmail
echo "📧 Fetching emails from Gmail..." | tee -a "$LOG_FILE"
if bun run scripts/ingest-emails.ts >> "$LOG_FILE" 2>&1; then
    log "Emails fetched successfully"
else
    log_warn "Email fetch failed (continuing anyway)"
fi

# 1b. Scrape websites
echo "🕷️  Scraping websites..." | tee -a "$LOG_FILE"
if python3 scripts/scrape-all-sites.py >> "$LOG_FILE" 2>&1; then
    log "Websites scraped successfully"
else
    log_warn "Web scraping failed (continuing anyway)"
fi

################################################################################
# STEP 2: Parsing & Import
################################################################################
log_step "🔍 STEP 2: Parsing & Import"

# 2a. Parse HTML → JSON
echo "📄 Parsing HTML files..." | tee -a "$LOG_FILE"
if python3 scripts/parse_tier1_sites.py >> "$LOG_FILE" 2>&1; then
    log "HTML parsed successfully"
else
    log_warn "HTML parsing failed (continuing anyway)"
fi

# 2b. Parse full descriptions
echo "📝 Parsing full descriptions..." | tee -a "$LOG_FILE"
if python3 scripts/parse-full-descriptions.py >> "$LOG_FILE" 2>&1; then
    log "Full descriptions parsed"
else
    log_warn "Description parsing failed (continuing anyway)"
fi

# 2c. Parse emails
echo "📨 Parsing newsletter emails..." | tee -a "$LOG_FILE"
if bun run scripts/parse-newsletter-emails.ts >> "$LOG_FILE" 2>&1; then
    log "Emails parsed successfully"
else
    log_warn "Email parsing failed (continuing anyway)"
fi

# 2d. Import to database
echo "💾 Importing events to database..." | tee -a "$LOG_FILE"
bun run scripts/import-tier1-events.ts >> "$LOG_FILE" 2>&1
bun run scripts/import-newsletter-events.ts >> "$LOG_FILE" 2>&1
log "Events imported to database"

# Check import stats
TOTAL_EVENTS=$(sqlite3 data/events.db "SELECT COUNT(*) FROM events")
log "Total events in database: $TOTAL_EVENTS"

################################################################################
# STEP 3: Data Quality - Extract Missing Data
################################################################################
log_step "🔧 STEP 3: Extract Missing Times & Prices"

# 3a. Check what's missing
MISSING_TIMES=$(sqlite3 data/events.db "SELECT COUNT(*) FROM events WHERE start_date LIKE '%00:00:00%'")
MISSING_PRICES=$(sqlite3 data/events.db "SELECT COUNT(*) FROM events WHERE price_amount IS NULL OR price_amount = 0")

echo "Missing times: $MISSING_TIMES" | tee -a "$LOG_FILE"
echo "Missing prices: $MISSING_PRICES" | tee -a "$LOG_FILE"

# 3b. Fetch missing times (if any)
if [ "$MISSING_TIMES" -gt 0 ]; then
    echo "⏰ Fetching missing times..." | tee -a "$LOG_FILE"
    if python3 scripts/fetch-times.py --delay 1.0 >> "$LOG_FILE" 2>&1; then
        FIXED_TIMES=$(sqlite3 data/events.db "SELECT COUNT(*) FROM events WHERE start_date LIKE '%00:00:00%'")
        log "Times fetched. Missing times now: $FIXED_TIMES"
    else
        log_warn "Time fetching failed"
    fi
else
    log "No missing times - skipping"
fi

# 3c. Fetch missing prices (if any)
if [ "$MISSING_PRICES" -gt 0 ]; then
    echo "💰 Fetching missing prices..." | tee -a "$LOG_FILE"
    if python3 scripts/fetch-prices-aggressive.py --delay 1.0 >> "$LOG_FILE" 2>&1; then
        FIXED_PRICES=$(sqlite3 data/events.db "SELECT COUNT(*) FROM events WHERE price_amount IS NULL OR price_amount = 0")
        log "Prices fetched. Missing prices now: $FIXED_PRICES"
    else
        log_warn "Price fetching failed"
    fi
else
    log "No missing prices - skipping"
fi

################################################################################
# STEP 4: Database Cleanup
################################################################################
log_step "🧹 STEP 4: Database Cleanup"

echo "🗑️  Running comprehensive database cleanup..." | tee -a "$LOG_FILE"
bun run scripts/clean-database.ts >> "$LOG_FILE" 2>&1
log "Database cleaned"

# Get final stats
FINAL_EVENTS=$(sqlite3 data/events.db "SELECT COUNT(*) FROM events")
PAST_EVENTS=$(sqlite3 data/events.db "SELECT COUNT(*) FROM events WHERE date(start_date) < date('now')")
BAD_TIMES=$(sqlite3 data/events.db "SELECT COUNT(*) FROM events WHERE start_date LIKE '%00:00:00%'")

echo "" | tee -a "$LOG_FILE"
echo "📊 Database Quality Report:" | tee -a "$LOG_FILE"
echo "   Total events: $FINAL_EVENTS" | tee -a "$LOG_FILE"
echo "   Past events: $PAST_EVENTS (should be 0)" | tee -a "$LOG_FILE"
echo "   Bad times (00:00:00): $BAD_TIMES (should be 0)" | tee -a "$LOG_FILE"

if [ "$PAST_EVENTS" -gt 0 ] || [ "$BAD_TIMES" -gt 0 ]; then
    log_warn "Database still has quality issues!"
else
    log "Database is clean ✨"
fi

################################################################################
# STEP 5: Rebuild Site
################################################################################
log_step "🏗️  STEP 5: Rebuild Static Site"

echo "📄 Generating static pages..." | tee -a "$LOG_FILE"
bun run build >> "$LOG_FILE" 2>&1
log "Site rebuilt successfully"

# Count generated pages
PAGE_COUNT=$(find dist -name "*.html" | wc -l | tr -d ' ')
log "Generated $PAGE_COUNT HTML pages"

################################################################################
# STEP 6: Deploy to Netlify
################################################################################
log_step "🚀 STEP 6: Deploy to Netlify"

# Commit changes
echo "📝 Committing changes to git..." | tee -a "$LOG_FILE"
git add data/events.db dist/ >> "$LOG_FILE" 2>&1 || true

if git diff --cached --quiet; then
    log_warn "No changes to commit - skipping deployment"
else
    COMMIT_MSG="chore: Daily update $(date +%Y-%m-%d) - $FINAL_EVENTS events"
    git commit -m "$COMMIT_MSG" >> "$LOG_FILE" 2>&1
    log "Changes committed"

    # Push to GitHub
    echo "⬆️  Pushing to GitHub..." | tee -a "$LOG_FILE"
    git push origin main >> "$LOG_FILE" 2>&1
    log "Pushed to GitHub"

    # Force Netlify deployment
    echo "🌐 Deploying to Netlify..." | tee -a "$LOG_FILE"
    if netlify deploy --prod --dir=dist >> "$LOG_FILE" 2>&1; then
        log "Deployed to https://agentathens.netlify.app"
    else
        log_error "Netlify deployment failed"
    fi
fi

################################################################################
# STEP 7: Summary & Notification
################################################################################
log_step "📊 STEP 7: Summary"

echo "" | tee -a "$LOG_FILE"
echo "════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
echo "                    DAILY WORKFLOW COMPLETE               " | tee -a "$LOG_FILE"
echo "════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "📊 Final Statistics:" | tee -a "$LOG_FILE"
echo "   • Total events: $FINAL_EVENTS" | tee -a "$LOG_FILE"
echo "   • Pages generated: $PAGE_COUNT" | tee -a "$LOG_FILE"
echo "   • Log file: $LOG_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "🌐 Live site: https://agentathens.netlify.app" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Finished: $(date)" | tee -a "$LOG_FILE"
echo "════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"

# Send macOS notification
if command -v osascript &> /dev/null; then
    osascript -e "display notification \"$FINAL_EVENTS events • $PAGE_COUNT pages generated\" with title \"Agent Athens Daily Update Complete\" sound name \"Glass\"" 2>/dev/null || true
fi

log "✅ Daily workflow complete!"
