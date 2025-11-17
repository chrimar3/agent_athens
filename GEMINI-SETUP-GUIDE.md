# Google Gemini API Setup - Quick Test

**Goal:** Test Gemini's Greek language quality before committing to full automation

---

## Step 1: Get Free Gemini API Key

1. **Go to:** https://makersuite.google.com/app/apikey
2. **Click:** "Create API Key"
3. **Select:** Create new project (or use existing)
4. **Copy:** Your API key (starts with `AIza...`)

**No credit card required!** ✅

---

## Step 2: Add to .env File

```bash
# In your project root
echo "GEMINI_API_KEY=YOUR_KEY_HERE" >> .env
```

Or manually edit `.env` and add:
```
GEMINI_API_KEY=AIzaSy...your_actual_key
```

---

## Step 3: Test with 3 Events

Run the test script:
```bash
cd /Users/chrism/Project\ with\ Claude/AgentAthens/agent-athens
bun run scripts/enrich-with-gemini.ts
```

This will:
- Process 3 unenriched events
- Generate Greek descriptions
- Save to database
- Show word counts and validation results

---

## Step 4: Compare Quality

I (Claude Code) will compare:
- **Claude-generated** (5 events already done)
- **Gemini-generated** (3 new events)

We'll check:
- ✅ Natural Greek language
- ✅ Artist information included
- ✅ No fabricated details
- ✅ Word count (300-450)
- ✅ Engaging narrative style

---

## Step 5: Decision

**If Gemini quality is good:**
→ Proceed with launchd automation (fully automated, runs daily)

**If Gemini quality is poor:**
→ Continue with Claude Code manual batches (you ask, I process)

---

## Free Tier Limits

- **15 requests/minute**
- **1,500 requests/day**
- **250,000 tokens/minute**

**For our 693 events:**
- Could process all in one day if needed
- Or 15/day for 46 days (recommended pace)

---

**Next:** Get your API key and paste it into `.env`, then let me know!
