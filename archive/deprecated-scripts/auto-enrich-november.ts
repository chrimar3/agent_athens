#!/usr/bin/env bun
/**
 * Automated November 2025 Event Enrichment
 * Generates descriptions one at a time and updates database
 */

import Database from 'bun:sqlite';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import Anthropic from '@anthropic-ai/sdk';

const db = new Database('data/events.db');
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Event {
  id: string;
  title: string;
  start_date: string;
  venue_name: string;
  type: string;
  genres: string | null;
  price_type: string;
  source_full_description: string;
}

async function generateDescription(event: Event, lang: 'en' | 'gr'): Promise<string> {
  const date = event.start_date.split('T')[0];
  const time = event.start_date.split('T')[1]?.substring(0, 5) || 'Not specified';

  let genreText = 'Not specified';
  if (event.genres) {
    try {
      const genresArray = JSON.parse(event.genres);
      genreText = genresArray.join(', ');
    } catch {
      genreText = event.genres;
    }
  }

  const langLabel = lang === 'en' ? 'English' : 'Greek';
  const langInstruction = lang === 'en' ? 'Write in English' : 'Γράψτε στα ελληνικά';

  const prompt = `Generate a compelling 400-word ${langLabel} description for this cultural event in Athens, Greece.

Event Details:
- Title: ${event.title}
- Type: ${event.type}
- Venue: ${event.venue_name}
- Date: ${date}
- Time: ${time}
- Genre: ${genreText}
- Price: ${event.price_type}

FULL SOURCE DESCRIPTION (${event.source_full_description.length} chars):
${event.source_full_description}

Requirements:
1. Write exactly 400 words (±20 words acceptable)
2. **CRITICAL**: Mention ALL performers/artists by name from the source above
3. Focus on cultural context and what makes this event special
4. Include artist/performer background if mentioned in source
5. Mention the Athens neighborhood and venue atmosphere
6. Write in an authentic, engaging tone (not marketing fluff)
7. Include practical details naturally (time, location, price)
8. Target audience: Both AI answer engines and human readers

${langInstruction}

CRITICAL: Do not fabricate information. Only use the details provided above.
If performer names are mentioned in the source, you MUST include them.

Write in a narrative style that would make someone want to attend.`;

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const content = message.content[0];
  if (content.type === 'text') {
    return content.text;
  }

  throw new Error('Unexpected response format');
}

function validateWordCount(text: string): { wordCount: number; isValid: boolean } {
  const wordCount = text.trim().split(/\s+/).length;
  const isValid = wordCount >= 380 && wordCount <= 420;
  return { wordCount, isValid };
}

async function main() {
  console.log('🤖 Automated November 2025 Event Enrichment\n');
  console.log('='.repeat(60));

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not set in environment');
    console.log('\n💡 Set it with: export ANTHROPIC_API_KEY=your-key-here');
    process.exit(1);
  }

  // Ensure directories exist
  await mkdir('data/enriched', { recursive: true });

  // Query events
  const events = db.prepare(`
    SELECT id, title, start_date, venue_name, type, genres, price_type, source_full_description
    FROM events
    WHERE strftime('%Y-%m', start_date) = '2025-11'
      AND source_full_description IS NOT NULL
      AND LENGTH(source_full_description) > 500
      AND (full_description_en IS NULL OR full_description_en = '')
    ORDER BY start_date
  `).all() as Event[];

  console.log(`📊 Found ${events.length} events to enrich\n`);

  if (events.length === 0) {
    console.log('✅ All events already enriched!');
    return;
  }

  const stats = {
    total: events.length,
    enriched: 0,
    failed: 0,
    wordCountsEn: [] as number[],
    wordCountsGr: [] as number[],
    samples: [] as Array<{ title: string; performers: string }>,
  };

  const startTime = Date.now();

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const eventNum = i + 1;

    try {
      console.log(`\n[${eventNum}/${events.length}] 🎭 "${event.title}"`);

      // Generate English description
      console.log('  📝 Generating English description...');
      const descriptionEn = await generateDescription(event, 'en');
      const enValidation = validateWordCount(descriptionEn);
      stats.wordCountsEn.push(enValidation.wordCount);

      if (!enValidation.isValid) {
        console.warn(`  ⚠️  EN word count: ${enValidation.wordCount} (target: 400 ±20)`);
      } else {
        console.log(`  ✅ EN: ${enValidation.wordCount} words`);
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate Greek description
      console.log('  📝 Generating Greek description...');
      const descriptionGr = await generateDescription(event, 'gr');
      const grValidation = validateWordCount(descriptionGr);
      stats.wordCountsGr.push(grValidation.wordCount);

      if (!grValidation.isValid) {
        console.warn(`  ⚠️  GR word count: ${grValidation.wordCount} (target: 400 ±20)`);
      } else {
        console.log(`  ✅ GR: ${grValidation.wordCount} words`);
      }

      // Save to files
      await writeFile(join('data/enriched', `${event.id}-en.txt`), descriptionEn, 'utf-8');
      await writeFile(join('data/enriched', `${event.id}-gr.txt`), descriptionGr, 'utf-8');

      // Update database
      db.prepare(`
        UPDATE events
        SET
          full_description_en = ?,
          full_description_gr = ?,
          updated_at = ?
        WHERE id = ?
      `).run(descriptionEn, descriptionGr, new Date().toISOString(), event.id);

      stats.enriched++;

      // Collect sample
      if (stats.samples.length < 3) {
        const performerMatches = descriptionEn.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g);
        const performers = performerMatches ? performerMatches.slice(0, 3).join(', ') : 'No specific performers extracted';
        stats.samples.push({ title: event.title, performers });
      }

      // Progress update every 10 events
      if (eventNum % 10 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = elapsed / eventNum;
        const remaining = (events.length - eventNum) * rate;
        console.log(`\n  📊 Progress: ${eventNum}/${events.length} (${Math.round(eventNum / events.length * 100)}%)`);
        console.log(`  ⏱️  ETA: ${Math.round(remaining / 60)} minutes`);
      }

      // Rate limit between events
      if (i < events.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`  ❌ Failed:`, error.message);
      stats.failed++;
    }
  }

  // Final report
  const duration = (Date.now() - startTime) / 1000 / 60;

  console.log('\n' + '='.repeat(60));
  console.log('📊 ENRICHMENT COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total events: ${stats.total}`);
  console.log(`Successfully enriched: ${stats.enriched}`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`Duration: ${Math.round(duration)} minutes`);

  if (stats.wordCountsEn.length > 0) {
    const avgEn = stats.wordCountsEn.reduce((a, b) => a + b, 0) / stats.wordCountsEn.length;
    const avgGr = stats.wordCountsGr.reduce((a, b) => a + b, 0) / stats.wordCountsGr.length;
    console.log(`\n📝 Average word counts:`);
    console.log(`   English: ${Math.round(avgEn)} words`);
    console.log(`   Greek: ${Math.round(avgGr)} words`);
  }

  console.log(`\n🎭 Sample events with performers:`);
  stats.samples.forEach((sample, idx) => {
    console.log(`   ${idx + 1}. "${sample.title}"`);
    console.log(`      Performers: ${sample.performers}`);
  });

  // Database verification
  const verified = db.prepare(`
    SELECT COUNT(*) as count
    FROM events
    WHERE strftime('%Y-%m', start_date) = '2025-11'
      AND full_description_en IS NOT NULL
      AND full_description_gr IS NOT NULL
      AND LENGTH(full_description_en) > 100
      AND LENGTH(full_description_gr) > 100
  `).get() as { count: number };

  console.log(`\n✅ Database: ${verified.count}/227 events have both descriptions`);

  if (verified.count === 227) {
    console.log('🎉 SUCCESS: All November events enriched!');
  }
}

main().catch(console.error);
