import { Database } from 'bun:sqlite';
import {
  initializeEnrichment,
  enrichEvent,
  generateEnrichedPrompt,
} from '../src/enrichment/enrichment-engine';

const db = new Database('data/events.db');

// Configuration
const BATCH_SIZE = 50;  // Process 50 events at a time
const PROGRESS_FILE = 'data/batch-enrichment-progress.json';
const RATE_LIMIT_MS = 2000;  // 2 second delay between Task calls

interface Progress {
  totalEvents: number;
  processedEvents: number;
  currentBatch: number;
  lastProcessedId: string | null;
  startedAt: string;
  lastUpdatedAt: string;
  stats: {
    enPass: number;
    enFail: number;
    grPass: number;
    grFail: number;
  };
}

// Load or initialize progress
function loadProgress(): Progress {
  try {
    const file = Bun.file(PROGRESS_FILE);
    if (file.size > 0) {
      return JSON.parse(await file.text());
    }
  } catch (error) {
    // File doesn't exist or is empty
  }

  return {
    totalEvents: 0,
    processedEvents: 0,
    currentBatch: 0,
    lastProcessedId: null,
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    stats: { enPass: 0, enFail: 0, grPass: 0, grFail: 0 },
  };
}

// Save progress
async function saveProgress(progress: Progress) {
  progress.lastUpdatedAt = new Date().toISOString();
  await Bun.write(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// Main batch processing function
async function processBatch() {
  console.log('🚀 BILINGUAL BATCH ENRICHMENT - FULL SCALE');
  console.log('============================================\n');

  const progress = await loadProgress();

  // Get unenriched events
  const events = db.prepare(`
    SELECT id, title, start_date, venue_name, type, genres as genre,
           price_type, price_amount, description
    FROM events
    WHERE (full_description_en IS NULL OR full_description_en = '')
      AND (full_description_gr IS NULL OR full_description_gr = '')
    ORDER BY start_date ASC
    LIMIT ?
  `).all(BATCH_SIZE) as any[];

  if (events.length === 0) {
    console.log('✅ No events need enrichment. All done!');
    return;
  }

  progress.totalEvents = events.length;
  console.log(`📊 Found ${events.length} events to process`);
  console.log(`📦 Batch size: ${BATCH_SIZE} events`);
  console.log(`⏱️  Estimated time: ${Math.round((events.length * 2 * 40) / 60)} minutes\n`);

  initializeEnrichment();

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`\n[${i + 1}/${events.length}] Processing: ${event.title.substring(0, 50)}...`);

    try {
      // Enrich event data
      const enrichedEvent = await enrichEvent({
        id: event.id,
        title: event.title,
        start_date: event.start_date,
        venue_name: event.venue_name,
        type: event.type,
        genre: event.genre || 'general',
        price_type: event.price_type || 'with-ticket',
        price_amount: event.price_amount,
        description: event.description,
      });

      // Generate prompts
      const promptEN = generateEnrichedPrompt(enrichedEvent, 'en', 420);
      const promptGR = generateEnrichedPrompt(enrichedEvent, 'gr', 430);

      // Save prompts for manual processing via Task tool
      const promptDir = `data/batch-prompts/${String(i + 1).padStart(4, '0')}-${event.id}`;
      await Bun.write(`${promptDir}-en.txt`, promptEN);
      await Bun.write(`${promptDir}-gr.txt`, promptGR);

      console.log(`  ✅ Prompts generated and saved`);
      console.log(`  ℹ️  Manual Task tool calls needed for this event`);

      progress.processedEvents++;
      progress.lastProcessedId = event.id;
      await saveProgress(progress);

      // Rate limiting
      if (i < events.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\n================================================================================');
  console.log('📊 BATCH COMPLETE');
  console.log('================================================================================');
  console.log(`Processed: ${progress.processedEvents}/${progress.totalEvents}`);
  console.log(`\nℹ️  Next step: Use Claude Code to call Task tool for each generated prompt`);
  console.log(`📁 Prompts location: data/batch-prompts/`);
}

// Run
processBatch().catch(console.error);
