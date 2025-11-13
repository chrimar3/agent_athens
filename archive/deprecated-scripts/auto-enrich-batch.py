#!/usr/bin/env python3
"""
Auto-enrich a batch of events using Task tool
This script prepares prompts for batch enrichment
"""
import sqlite3
import json
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
DB_PATH = PROJECT_ROOT / "data/events.db"
ENRICHED_DIR = PROJECT_ROOT / "data/enriched"

def get_enriched_ids():
    """Get IDs of already enriched events"""
    enriched = set()
    for f in ENRICHED_DIR.glob("*-en.txt"):
        enriched.add(f.stem.replace("-en", ""))
    return enriched

def get_unenriched_batch(limit=20):
    """Get next batch of unenriched events"""
    enriched_ids = get_enriched_ids()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, title, venue_name, type, price_type, price_amount, source_full_description
        FROM events
        WHERE source_full_description IS NOT NULL
          AND source_full_description != ''
          AND strftime('%Y-%m', start_date) = '2025-11'
        ORDER BY
            CASE WHEN source_full_description LIKE '%=== ΣΥΝΤΕΛΕΣΤΕΣ%' THEN 0 ELSE 1 END,
            start_date
    """)

    batch = []
    for row in cursor.fetchall():
        if row['id'] not in enriched_ids:
            batch.append(dict(row))
            if len(batch) >= limit:
                break

    conn.close()
    return batch

def main():
    print("🔍 Finding unenriched events...")
    batch = get_unenriched_batch(limit=20)

    print(f"📋 Found {len(batch)} unenriched events")
    print("\n📝 Event IDs for batch enrichment:")
    for i, event in enumerate(batch, 1):
        has_cast = "✅" if "=== ΣΥΝΤΕΛΕΣΤΕΣ" in event['source_full_description'] else "❌"
        print(f"{i:2d}. {event['id'][:20]}... | {event['title'][:40]}... | Cast:{has_cast}")

    # Save batch for reference
    output_file = PROJECT_ROOT / "data/batch-20-ids.txt"
    with open(output_file, 'w') as f:
        for event in batch:
            f.write(f"{event['id']}\n")

    print(f"\n✅ Batch IDs saved to: {output_file}")
    print(f"\n📊 Progress: {len(get_enriched_ids())}/242 events enriched")
    print(f"📊 Remaining after this batch: {242 - len(get_enriched_ids()) - len(batch)} events")

if __name__ == "__main__":
    main()
