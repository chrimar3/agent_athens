#!/usr/bin/env bun
/**
 * Comprehensive Database Cleanup
 * ===============================
 *
 * Fixes all data quality issues:
 * 1. Remove past events
 * 2. Remove duplicates (same title + date)
 * 3. Remove events with 00:00:00 times (likely bad data)
 * 4. Remove events with missing critical fields
 *
 * Usage:
 *   bun run scripts/clean-database.ts
 */

import Database from 'bun:sqlite';

const DB_PATH = 'data/events.db';

interface Event {
  id: string;
  title: string;
  start_date: string;
  description: string | null;
  full_description: string | null;
  full_description_gr: string | null;
  price_amount: number | null;
  updated_at: string;
}

function scoreEvent(event: Event): number {
  let score = 0;
  if (event.full_description_gr) score += 100;
  if (event.full_description) score += 50;
  if (event.description) score += 10;
  if (event.price_amount && event.price_amount > 0) score += 20;
  score += new Date(event.updated_at).getTime() / 1000000000;
  return score;
}

async function cleanDatabase() {
  const db = new Database(DB_PATH);

  console.log('🧹 Starting comprehensive database cleanup...\n');

  // Step 1: Remove past events
  console.log('📅 Step 1: Removing past events...');
  const pastEvents = db.query(`
    DELETE FROM events
    WHERE date(start_date) < date('now')
    RETURNING id
  `).all();
  console.log(`   ✅ Removed ${pastEvents.length} past events\n`);

  // Step 2: Remove events with 00:00:00 times (bad data)
  console.log('⏰ Step 2: Removing events with midnight times (00:00:00)...');
  const midnightEvents = db.query(`
    DELETE FROM events
    WHERE start_date LIKE '%00:00:00%'
    RETURNING id
  `).all();
  console.log(`   ✅ Removed ${midnightEvents.length} events with bad times\n`);

  // Step 3: Remove duplicates (same title + date)
  console.log('🔍 Step 3: Finding and removing duplicates...');

  const duplicateGroups = db.query<{ title: string; date: string; cnt: number }, []>(`
    SELECT title, date(start_date) as date, COUNT(*) as cnt
    FROM events
    GROUP BY title, date(start_date)
    HAVING cnt > 1
    ORDER BY cnt DESC
  `).all();

  let duplicatesRemoved = 0;

  for (const group of duplicateGroups) {
    const { title, date } = group;

    const events = db.query<Event, [string, string]>(`
      SELECT id, title, start_date, description, full_description, full_description_gr,
             price_amount, updated_at
      FROM events
      WHERE title = ? AND date(start_date) = ?
      ORDER BY start_date
    `).all(title, date);

    const scored = events.map(e => ({
      event: e,
      score: scoreEvent(e)
    })).sort((a, b) => b.score - a.score);

    // Keep best one, delete rest
    const toDelete = scored.slice(1).map(s => s.event.id);

    for (const id of toDelete) {
      db.query('DELETE FROM events WHERE id = ?').run(id);
      duplicatesRemoved++;
    }
  }

  console.log(`   ✅ Removed ${duplicatesRemoved} duplicate events\n`);

  // Step 4: Remove events with missing critical fields
  console.log('🔍 Step 4: Removing events with missing critical data...');
  const invalidEvents = db.query(`
    DELETE FROM events
    WHERE title IS NULL
       OR title = ''
       OR start_date IS NULL
       OR venue_name IS NULL
       OR venue_name = ''
    RETURNING id
  `).all();
  console.log(`   ✅ Removed ${invalidEvents.length} events with missing data\n`);

  // Step 5: Vacuum database to reclaim space
  console.log('🗜️  Step 5: Optimizing database...');
  db.query('VACUUM').run();
  console.log(`   ✅ Database optimized\n`);

  // Final summary
  const remaining = db.query<{ count: number }, []>('SELECT COUNT(*) as count FROM events').get();
  const upcoming = db.query<{ count: number }, []>(`
    SELECT COUNT(*) as count FROM events
    WHERE date(start_date) >= date('now')
  `).get();

  console.log(`${'='.repeat(60)}`);
  console.log(`📊 Database Cleanup Summary`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Past events removed:       ${pastEvents.length}`);
  console.log(`Bad times removed:         ${midnightEvents.length}`);
  console.log(`Duplicates removed:        ${duplicatesRemoved}`);
  console.log(`Invalid events removed:    ${invalidEvents.length}`);
  console.log(`Total removed:             ${pastEvents.length + midnightEvents.length + duplicatesRemoved + invalidEvents.length}`);
  console.log(`---`);
  console.log(`Total events in database:  ${remaining?.count || 0}`);
  console.log(`Upcoming events:           ${upcoming?.count || 0}`);
  console.log(`${'='.repeat(60)}\n`);

  db.close();
}

cleanDatabase().catch(console.error);
