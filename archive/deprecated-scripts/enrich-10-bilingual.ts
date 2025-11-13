#!/usr/bin/env bun
/**
 * Enrich 10 specific events with bilingual descriptions
 * Run with: bun scripts/enrich-10-bilingual.ts
 */

import Database from 'bun:sqlite';

const EVENT_IDS = [
  "1-2025-12-06",
  "1001b508e44a8b9b", 
  "103c8d0b56746e95",
  "108e679dd4d13bb0",
  "10a904ea223fd822",
  "11-2025-11-15",
  "1119ed311e7c4ff6",
  "115eb14c6305e6c8",
  "116b209ee4a12fcd",
  "11b02d983b341d5e"
];

const db = new Database('data/events.db');

// Get events
const placeholders = EVENT_IDS.map(() => '?').join(',');
const events = db.prepare(`
  SELECT id, title, start_date, venue_name, type, genres, price_type, 
         venue_address, description, full_description_en, full_description_gr
  FROM events  
  WHERE id IN (${placeholders})
  ORDER BY id
`).all(...EVENT_IDS);

console.log(`📊 Found ${events.length} events to enrich\n`);

// Display events for AI processing
for (let i = 0; i < events.length; i++) {
  const event = events[i];
  console.log(`\n=== Event ${i + 1}: ${event.id} ===`);
  console.log(`Title: ${event.title}`);
  console.log(`Date: ${event.start_date}`);
  console.log(`Venue: ${event.venue_name}`);
  console.log(`Type: ${event.type}`);
  console.log(`Description: ${event.description || 'N/A'}`);
  console.log(`Already enriched: ${event.full_description_en ? 'YES' : 'NO'}`);
}

db.close();

console.log(`\n✅ Ready for AI enrichment via Claude Code`);
console.log(`\nNext: Claude Code will generate bilingual descriptions for these events`);
