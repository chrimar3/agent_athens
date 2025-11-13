# Web Scraping Orchestrator - Implementation Guide

**Approach**: Option C - Keep Python scrapers, build TypeScript orchestrator

**Status**: Ready to implement

**Last Updated**: November 1, 2025

---

## Quick Start

### Step 1: Create Configuration (15 minutes)

**File**: `config/scrape-list.json`
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
        "command": ["python3", "scripts/scrape-all-sites.py", "--site", "viva"],
        "timeout_ms": 120000,
        "retry_count": 3
      },
      "parser": {
        "type": "python",
        "categories": ["music", "theater", "sports"],
        "script": "parse_viva_events.py",
        "input_pattern": "data/html-to-parse/*viva*.html"
      },
      "importer": {
        "type": "bun",
        "script": "scripts/import-viva-events.ts"
      },
      "rate_limit_ms": 2000,
      "priority": 1
    },
    {
      "id": "more.com",
      "name": "More.com",
      "enabled": true,
      "frequency": "daily",
      "scraper": {
        "type": "python",
        "command": ["python3", "scripts/scrape-all-sites.py", "--site", "more"],
        "timeout_ms": 120000,
        "retry_count": 3
      },
      "parser": {
        "type": "python",
        "categories": ["music", "theater", "sports"],
        "script": "parse_viva_events.py",
        "input_pattern": "data/html-to-parse/*more*.html"
      },
      "importer": {
        "type": "bun",
        "script": "scripts/import-more-events.ts"
      },
      "rate_limit_ms": 2000,
      "priority": 1
    },
    {
      "id": "gazarte.gr",
      "name": "Gazarte",
      "enabled": true,
      "frequency": "weekly",
      "scraper": {
        "type": "python",
        "command": ["python3", "scripts/scrape-all-sites.py", "--site", "gazarte"],
        "timeout_ms": 60000,
        "retry_count": 2
      },
      "parser": {
        "type": "python",
        "categories": ["program"],
        "script": "parse_gazarte_events.py",
        "input_pattern": "data/html-to-parse/*gazarte*.html"
      },
      "importer": {
        "type": "bun",
        "script": "scripts/import-gazarte-events.ts"
      },
      "rate_limit_ms": 5000,
      "priority": 3
    }
  ]
}
```

**Validation**:
```bash
# Create config directory
mkdir -p config

# Create the file
cat > config/scrape-list.json << 'EOF'
{
  "version": "1.0",
  "sources": [...]
}
EOF

# Validate JSON
cat config/scrape-list.json | jq '.' > /dev/null && echo "✅ Valid JSON"
```

---

### Step 2: Initialize State File (5 minutes)

**File**: `data/scrape-state.json`
```json
{
  "version": "1.0",
  "last_updated": "2025-11-01T00:00:00Z",
  "sources": {}
}
```

**Create**:
```bash
# Initialize empty state
cat > data/scrape-state.json << 'EOF'
{
  "version": "1.0",
  "last_updated": "2025-11-01T00:00:00Z",
  "sources": {}
}
EOF

# Validate
cat data/scrape-state.json | jq '.' > /dev/null && echo "✅ State initialized"
```

---

### Step 3: Create TypeScript Types (30 minutes)

**File**: `src/scraping/types.ts`
```typescript
// Configuration types
export interface ScrapeConfig {
  version: string;
  sources: Source[];
}

export interface Source {
  id: string;
  name: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  scraper: ScraperConfig;
  parser: ParserConfig;
  importer: ImporterConfig;
  rate_limit_ms: number;
  priority: number;
}

export interface ScraperConfig {
  type: 'python' | 'node';
  command: string[];
  timeout_ms: number;
  retry_count: number;
}

export interface ParserConfig {
  type: 'python' | 'node';
  categories?: string[];
  script: string;
  input_pattern: string;
}

export interface ImporterConfig {
  type: 'bun' | 'node';
  script: string;
}

// State types
export interface ScrapeState {
  version: string;
  last_updated: string;
  sources: Record<string, SourceState>;
}

export interface SourceState {
  last_scraped: string | null;
  last_success: string | null;
  last_failure: string | null;
  scrape_count: number;
  failure_count: number;
  events_imported: number;
  last_error?: string;
}

// Result types
export interface ScrapeResult {
  source_id: string;
  success: boolean;
  timestamp: string;
  events_imported?: number;
  error?: string;
  duration_ms?: number;
}

export interface OrchestrationResult {
  total_sources: number;
  scraped_sources: number;
  skipped_sources: number;
  successful_sources: number;
  failed_sources: number;
  total_events_imported: number;
  duration_ms: number;
  results: ScrapeResult[];
}
```

**Create**:
```bash
mkdir -p src/scraping
# Copy the content above to src/scraping/types.ts
```

---

### Step 4: State Manager (45 minutes)

**File**: `src/scraping/state-manager.ts`
```typescript
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { ScrapeState, SourceState } from './types';

const STATE_FILE = join(import.meta.dir, '../../data/scrape-state.json');
const STATE_BACKUP = join(import.meta.dir, '../../data/scrape-state.backup.json');

/**
 * Load scrape state from disk
 */
export function loadState(): ScrapeState {
  if (!existsSync(STATE_FILE)) {
    return {
      version: '1.0',
      last_updated: new Date().toISOString(),
      sources: {}
    };
  }

  try {
    const data = readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Failed to load state file, trying backup...');

    if (existsSync(STATE_BACKUP)) {
      try {
        const backupData = readFileSync(STATE_BACKUP, 'utf-8');
        return JSON.parse(backupData);
      } catch (backupError) {
        console.error('❌ Backup also corrupted, starting fresh');
      }
    }

    return {
      version: '1.0',
      last_updated: new Date().toISOString(),
      sources: {}
    };
  }
}

/**
 * Save scrape state to disk (atomic write)
 */
export function saveState(state: ScrapeState): void {
  state.last_updated = new Date().toISOString();

  // Backup existing state
  if (existsSync(STATE_FILE)) {
    const existingData = readFileSync(STATE_FILE, 'utf-8');
    writeFileSync(STATE_BACKUP, existingData, 'utf-8');
  }

  // Write to temp file first (atomic operation)
  const tempFile = `${STATE_FILE}.tmp`;
  writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf-8');

  // Rename temp to actual (atomic on most filesystems)
  const fs = require('fs');
  fs.renameSync(tempFile, STATE_FILE);
}

/**
 * Get state for a specific source (creates if doesn't exist)
 */
export function getSourceState(state: ScrapeState, sourceId: string): SourceState {
  if (!state.sources[sourceId]) {
    state.sources[sourceId] = {
      last_scraped: null,
      last_success: null,
      last_failure: null,
      scrape_count: 0,
      failure_count: 0,
      events_imported: 0
    };
  }
  return state.sources[sourceId];
}

/**
 * Update source state after scrape attempt
 */
export function updateSourceState(
  state: ScrapeState,
  sourceId: string,
  success: boolean,
  eventsImported: number = 0,
  error?: string
): void {
  const sourceState = getSourceState(state, sourceId);
  const now = new Date().toISOString();

  sourceState.last_scraped = now;
  sourceState.scrape_count++;

  if (success) {
    sourceState.last_success = now;
    sourceState.events_imported += eventsImported;
    delete sourceState.last_error;
  } else {
    sourceState.last_failure = now;
    sourceState.failure_count++;
    if (error) {
      sourceState.last_error = error;
    }
  }
}

/**
 * Check if source should be scraped based on frequency and last_scraped
 */
export function shouldScrape(
  frequency: 'daily' | 'weekly' | 'monthly',
  lastScraped: string | null,
  force: boolean = false
): boolean {
  if (force) return true;
  if (!lastScraped) return true;

  const now = Date.now();
  const last = new Date(lastScraped).getTime();
  const hoursSinceLast = (now - last) / (1000 * 60 * 60);

  if (frequency === 'daily') return hoursSinceLast >= 24;
  if (frequency === 'weekly') return hoursSinceLast >= 168;
  if (frequency === 'monthly') return hoursSinceLast >= 720;

  return true;
}
```

**Test**:
```typescript
// Test in Bun REPL
import { loadState, saveState, shouldScrape } from './src/scraping/state-manager';

const state = loadState();
console.log('Loaded state:', state);

saveState(state);
console.log('✅ State saved');

console.log('Should scrape (never scraped):', shouldScrape('daily', null, false)); // true
console.log('Should scrape (1 hour ago):', shouldScrape('daily', new Date(Date.now() - 3600000).toISOString(), false)); // false
console.log('Should scrape (25 hours ago):', shouldScrape('daily', new Date(Date.now() - 25 * 3600000).toISOString(), false)); // true
```

---

### Step 5: Subprocess Runner (1 hour)

**File**: `src/scraping/subprocess-runner.ts`
```typescript
import { spawn } from 'bun';

export interface SubprocessResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
  error?: string;
}

/**
 * Run a subprocess with timeout and error handling
 */
export async function runSubprocess(
  command: string[],
  timeout_ms: number,
  cwd?: string
): Promise<SubprocessResult> {
  const startTime = Date.now();

  console.log(`🔄 Running: ${command.join(' ')}`);

  try {
    const proc = spawn(command, {
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: cwd || process.cwd(),
      env: { ...process.env } // Pass environment variables
    });

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        proc.kill();
        reject(new Error(`Timeout after ${timeout_ms}ms`));
      }, timeout_ms);
    });

    // Wait for process to exit or timeout
    const exitCode = await Promise.race([
      proc.exited,
      timeoutPromise
    ]);

    // Collect stdout/stderr
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    const duration_ms = Date.now() - startTime;
    const success = exitCode === 0;

    if (success) {
      console.log(`✅ Success (${duration_ms}ms)`);
    } else {
      console.error(`❌ Failed with exit code ${exitCode} (${duration_ms}ms)`);
      if (stderr) console.error('stderr:', stderr.substring(0, 500));
    }

    return {
      success,
      exitCode,
      stdout,
      stderr,
      duration_ms,
      error: success ? undefined : stderr || `Exit code: ${exitCode}`
    };

  } catch (error: any) {
    const duration_ms = Date.now() - startTime;
    console.error(`❌ Subprocess error (${duration_ms}ms):`, error.message);

    return {
      success: false,
      exitCode: -1,
      stdout: '',
      stderr: error.message,
      duration_ms,
      error: error.message
    };
  }
}

/**
 * Run subprocess with retry logic
 */
export async function runWithRetry(
  command: string[],
  timeout_ms: number,
  retry_count: number,
  cwd?: string
): Promise<SubprocessResult> {
  let lastResult: SubprocessResult | null = null;

  for (let attempt = 1; attempt <= retry_count; attempt++) {
    if (attempt > 1) {
      const backoff_ms = Math.pow(2, attempt - 1) * 1000; // 2s, 4s, 8s
      console.log(`⏳ Retry ${attempt}/${retry_count} after ${backoff_ms}ms`);
      await new Promise(resolve => setTimeout(resolve, backoff_ms));
    }

    lastResult = await runSubprocess(command, timeout_ms, cwd);

    if (lastResult.success) {
      return lastResult;
    }
  }

  return lastResult!;
}

/**
 * Run Python script
 */
export async function runPythonScript(
  script: string,
  args: string[],
  timeout_ms: number,
  retry_count: number = 1
): Promise<SubprocessResult> {
  const command = ['python3', script, ...args];
  return runWithRetry(command, timeout_ms, retry_count);
}

/**
 * Run Bun script
 */
export async function runBunScript(
  script: string,
  args: string[],
  timeout_ms: number,
  retry_count: number = 1
): Promise<SubprocessResult> {
  const command = ['bun', 'run', script, ...args];
  return runWithRetry(command, timeout_ms, retry_count);
}
```

**Test**:
```bash
# Test Python execution
bun -e "
import { runPythonScript } from './src/scraping/subprocess-runner.ts';
const result = await runPythonScript('-c', ['print(\"Hello from Python\")'], 5000);
console.log(result);
"

# Test timeout
bun -e "
import { runSubprocess } from './src/scraping/subprocess-runner.ts';
const result = await runSubprocess(['sleep', '10'], 2000);
console.log('Should timeout:', result);
"
```

---

### Step 6: Main Orchestrator (2 hours)

**File**: `scripts/scrape-all-sources.ts`
```typescript
#!/usr/bin/env bun
/**
 * Main orchestrator for scraping all event sources
 *
 * Usage:
 *   bun run scripts/scrape-all-sources.ts
 *   bun run scripts/scrape-all-sources.ts --force
 *   bun run scripts/scrape-all-sources.ts --source=viva.gr
 *   bun run scripts/scrape-all-sources.ts --dry-run
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';
import {
  loadState,
  saveState,
  getSourceState,
  updateSourceState,
  shouldScrape
} from '../src/scraping/state-manager';
import {
  runPythonScript,
  runBunScript
} from '../src/scraping/subprocess-runner';
import type {
  ScrapeConfig,
  Source,
  ScrapeResult,
  OrchestrationResult
} from '../src/scraping/types';

// Parse CLI arguments
const args = process.argv.slice(2);
const force = args.includes('--force');
const dryRun = args.includes('--dry-run');
const sourceFilter = args.find(arg => arg.startsWith('--source='))?.split('=')[1];

/**
 * Load configuration
 */
function loadConfig(): ScrapeConfig {
  const configPath = join(import.meta.dir, '../config/scrape-list.json');
  const data = readFileSync(configPath, 'utf-8');
  return JSON.parse(data);
}

/**
 * Scrape a single source (full pipeline)
 */
async function scrapeSource(source: Source, state: any): Promise<ScrapeResult> {
  const startTime = Date.now();
  const sourceState = getSourceState(state, source.id);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📡 Scraping: ${source.name} (${source.id})`);
  console.log(`${'='.repeat(60)}`);

  // Check if should scrape
  if (!shouldScrape(source.frequency, sourceState.last_scraped, force)) {
    const lastScraped = new Date(sourceState.last_scraped!).toLocaleString();
    console.log(`⏭️  Skipping (last scraped: ${lastScraped})`);
    console.log(`   Frequency: ${source.frequency}, Use --force to override`);
    return {
      source_id: source.id,
      success: true,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime
    };
  }

  try {
    // Step 1: Run scraper
    console.log('\n📥 Step 1: Running scraper...');
    const scraperResult = await runPythonScript(
      source.scraper.command[0],
      source.scraper.command.slice(1),
      source.scraper.timeout_ms,
      source.scraper.retry_count
    );

    if (!scraperResult.success) {
      throw new Error(`Scraper failed: ${scraperResult.error}`);
    }

    console.log(`✅ Scraper completed (${scraperResult.duration_ms}ms)`);

    // Step 2: Run parser for each category
    console.log('\n🔍 Step 2: Running parser...');

    const htmlFiles = glob.sync(source.parser.input_pattern);
    console.log(`   Found ${htmlFiles.length} HTML files to parse`);

    let totalEventsParsed = 0;

    for (const htmlFile of htmlFiles) {
      console.log(`   Parsing: ${htmlFile}`);

      const parserResult = await runPythonScript(
        source.parser.script,
        [htmlFile],
        60000, // 1 minute timeout for parsing
        1 // No retries for parsing
      );

      if (!parserResult.success) {
        console.warn(`⚠️  Parser failed for ${htmlFile}: ${parserResult.error}`);
        continue;
      }

      // Count events in parser output
      const eventsMatch = parserResult.stdout.match(/(\d+) events/i);
      if (eventsMatch) {
        totalEventsParsed += parseInt(eventsMatch[1]);
      }
    }

    console.log(`✅ Parser completed - ${totalEventsParsed} events extracted`);

    // Step 3: Run importer
    console.log('\n📊 Step 3: Running importer...');

    const importerResult = await runBunScript(
      source.importer.script,
      [],
      120000, // 2 minute timeout for import
      1
    );

    if (!importerResult.success) {
      throw new Error(`Importer failed: ${importerResult.error}`);
    }

    // Extract events imported count
    const importMatch = importerResult.stdout.match(/(\d+) inserted/i);
    const eventsImported = importMatch ? parseInt(importMatch[1]) : 0;

    console.log(`✅ Importer completed - ${eventsImported} events imported`);

    // Rate limiting before next source
    if (source.rate_limit_ms > 0) {
      console.log(`\n⏳ Rate limiting: waiting ${source.rate_limit_ms}ms`);
      await new Promise(resolve => setTimeout(resolve, source.rate_limit_ms));
    }

    const duration_ms = Date.now() - startTime;

    return {
      source_id: source.id,
      success: true,
      timestamp: new Date().toISOString(),
      events_imported: eventsImported,
      duration_ms
    };

  } catch (error: any) {
    console.error(`\n❌ Failed to scrape ${source.id}:`, error.message);

    return {
      source_id: source.id,
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message,
      duration_ms: Date.now() - startTime
    };
  }
}

/**
 * Main orchestration
 */
async function main(): Promise<void> {
  const overallStart = Date.now();

  console.log('🚀 Starting web scraping orchestrator\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No actual scraping will occur\n');
  }

  if (force) {
    console.log('⚠️  FORCE MODE - Ignoring timestamps, scraping all sources\n');
  }

  // Load configuration
  const config = loadConfig();
  console.log(`📋 Loaded ${config.sources.length} sources from config`);

  // Load state
  const state = loadState();
  console.log(`📊 Loaded scrape state (${Object.keys(state.sources).length} sources tracked)\n`);

  // Filter sources
  let sources = config.sources
    .filter(s => s.enabled)
    .filter(s => !sourceFilter || s.id === sourceFilter)
    .sort((a, b) => a.priority - b.priority);

  console.log(`🎯 ${sources.length} sources selected for scraping\n`);

  if (dryRun) {
    console.log('Sources to scrape:');
    for (const source of sources) {
      const sourceState = getSourceState(state, source.id);
      const should = shouldScrape(source.frequency, sourceState.last_scraped, force);
      const status = should ? '✅ WILL SCRAPE' : '⏭️  WILL SKIP';
      const lastScraped = sourceState.last_scraped
        ? new Date(sourceState.last_scraped).toLocaleString()
        : 'never';
      console.log(`  ${status} - ${source.name} (last: ${lastScraped})`);
    }
    console.log('\n✅ Dry run completed');
    return;
  }

  // Scrape each source
  const results: ScrapeResult[] = [];

  for (const source of sources) {
    const result = await scrapeSource(source, state);
    results.push(result);

    // Update state
    updateSourceState(
      state,
      source.id,
      result.success,
      result.events_imported || 0,
      result.error
    );

    // Save state after each source (in case of crash)
    saveState(state);
  }

  // Final summary
  const duration_ms = Date.now() - overallStart;
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalEvents = results.reduce((sum, r) => sum + (r.events_imported || 0), 0);

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 SCRAPING SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`Total sources: ${sources.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total events imported: ${totalEvents}`);
  console.log(`Duration: ${(duration_ms / 1000).toFixed(1)}s`);
  console.log(`${'='.repeat(60)}\n`);

  if (failed > 0) {
    console.log('❌ Failed sources:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.source_id}: ${r.error}`);
    });
  }

  console.log('\n✅ Orchestration completed');
}

// Run
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Orchestration failed:', error);
    process.exit(1);
  });
```

---

### Step 7: Testing (30 minutes)

**Test 1: Dry run**
```bash
bun run scripts/scrape-all-sources.ts --dry-run
```

**Expected output**:
```
🚀 Starting web scraping orchestrator

🔍 DRY RUN MODE - No actual scraping will occur

📋 Loaded 3 sources from config
📊 Loaded scrape state (0 sources tracked)

🎯 3 sources selected for scraping

Sources to scrape:
  ✅ WILL SCRAPE - Viva.gr (last: never)
  ✅ WILL SCRAPE - More.com (last: never)
  ✅ WILL SCRAPE - Gazarte (last: never)

✅ Dry run completed
```

**Test 2: Scrape single source**
```bash
bun run scripts/scrape-all-sources.ts --source=viva.gr
```

**Test 3: Force scrape all**
```bash
bun run scripts/scrape-all-sources.ts --force
```

**Test 4: Normal run (respects timestamps)**
```bash
bun run scripts/scrape-all-sources.ts
```

---

## Implementation Checklist

### Phase 1: Setup (Day 1)
- [ ] Create `config/scrape-list.json`
- [ ] Initialize `data/scrape-state.json`
- [ ] Create `src/scraping/types.ts`
- [ ] Create `src/scraping/state-manager.ts`
- [ ] Test state loading/saving

### Phase 2: Subprocess (Day 2)
- [ ] Create `src/scraping/subprocess-runner.ts`
- [ ] Test Python subprocess execution
- [ ] Test timeout handling
- [ ] Test retry logic

### Phase 3: Orchestrator (Day 3-4)
- [ ] Create `scripts/scrape-all-sources.ts`
- [ ] Implement dry-run mode
- [ ] Implement source filtering
- [ ] Implement timestamp checking
- [ ] Implement full pipeline (scraper → parser → importer)
- [ ] Test with viva.gr

### Phase 4: Production Testing (Day 5)
- [ ] Test all sources
- [ ] Test error scenarios (network failure, timeout)
- [ ] Test state persistence
- [ ] Test force mode
- [ ] Document usage

---

## Common Commands

```bash
# Dry run to see what would be scraped
bun run scripts/scrape-all-sources.ts --dry-run

# Scrape all (respects timestamps)
bun run scripts/scrape-all-sources.ts

# Force scrape all (ignore timestamps)
bun run scripts/scrape-all-sources.ts --force

# Scrape specific source
bun run scripts/scrape-all-sources.ts --source=viva.gr

# Check state
cat data/scrape-state.json | jq '.'

# Check last scrape times
cat data/scrape-state.json | jq '.sources | to_entries | map({source: .key, last_scraped: .value.last_scraped})'
```

---

## Troubleshooting

### Issue: "Module not found"
```bash
# Make sure you're running from project root
cd /Users/chrism/Project\ with\ Claude/AgentAthens/agent-athens
bun run scripts/scrape-all-sources.ts
```

### Issue: Python script fails
```bash
# Test Python directly first
python3 scripts/scrape-all-sites.py --site viva

# Check Python path
which python3
```

### Issue: State file corrupted
```bash
# Reset state
cp data/scrape-state.json data/scrape-state.corrupted.json
echo '{"version":"1.0","last_updated":"2025-11-01T00:00:00Z","sources":{}}' > data/scrape-state.json
```

### Issue: Rate limiting
```bash
# Increase rate_limit_ms in config
# Edit config/scrape-list.json
"rate_limit_ms": 5000  # 5 seconds instead of 2
```

---

## Next Steps

1. **Implement Phase 1** (Configuration & State)
2. **Test state management** thoroughly
3. **Implement Phase 2** (Subprocess runner)
4. **Test with single source** (viva.gr)
5. **Implement Phase 3** (Full orchestrator)
6. **Production testing** with all sources
7. **Document in CLAUDE.md**

---

**Ready to Start**: Yes ✅
**Estimated Time**: 5 days
**Risk Level**: Low (leveraging existing Python code)
