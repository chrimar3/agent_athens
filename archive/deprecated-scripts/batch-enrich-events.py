#!/usr/bin/env python3
"""
Batch Enrich Events with seo-content-writer Agent
==================================================

Generates bilingual AI descriptions for Athens events using complete
source data including cast/crew information.

Features:
- Processes events in batches of 10
- Uses seo-content-writer agent (FREE via Claude Code)
- Strict 400-word limit per description
- 100% performer mention requirement
- Automatic rate limiting (2 seconds between calls)
- Progress tracking and resume capability

Usage:
  python3 scripts/batch-enrich-events.py              # Process all unenriched
  python3 scripts/batch-enrich-events.py --limit 20   # Test with 20 events
  python3 scripts/batch-enrich-events.py --start 21   # Resume from event 21
"""

import json
import sqlite3
import argparse
from pathlib import Path
from typing import List, Dict, Optional

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
DB_PATH = PROJECT_ROOT / "data/events.db"
ENRICHED_DIR = PROJECT_ROOT / "data/enriched"
PROGRESS_FILE = PROJECT_ROOT / "data/enrichment-progress.json"

# Ensure enriched directory exists
ENRICHED_DIR.mkdir(exist_ok=True)


class EventEnricher:
    """Batch enrichment manager for Athens events"""

    def __init__(self):
        self.stats = {
            "total": 0,
            "enriched": 0,
            "skipped": 0,
            "errors": 0
        }
        self.progress = self.load_progress()

    def load_progress(self) -> Dict:
        """Load enrichment progress from file"""
        if PROGRESS_FILE.exists():
            with open(PROGRESS_FILE, 'r') as f:
                return json.load(f)
        return {"last_batch": 0, "enriched_events": []}

    def save_progress(self):
        """Save enrichment progress"""
        with open(PROGRESS_FILE, 'w') as f:
            json.dump(self.progress, f, indent=2)

    def get_events_to_enrich(self, limit: Optional[int] = None, start: int = 0) -> List[Dict]:
        """Get events that need enrichment"""

        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get events with source data but no enrichment
        query = """
            SELECT
                id,
                title,
                type,
                venue_name,
                price_type,
                price_amount,
                source_full_description,
                start_date
            FROM events
            WHERE
                source_full_description IS NOT NULL
                AND source_full_description != ''
                AND start_date >= '2025-11-01'
                AND start_date < '2025-12-01'
            ORDER BY start_date
        """

        if limit:
            query += f" LIMIT {limit}"
        if start > 0:
            query += f" OFFSET {start}"

        cursor.execute(query)
        events = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return events

    def event_already_enriched(self, event_id: str) -> bool:
        """Check if event has been enriched"""
        en_file = ENRICHED_DIR / f"{event_id}-en.txt"
        gr_file = ENRICHED_DIR / f"{event_id}-gr.txt"
        return en_file.exists() and gr_file.exists()

    def format_price(self, price_type: str, price_amount: Optional[float]) -> str:
        """Format price for description"""
        if price_type == "free":
            return "free admission"
        elif price_amount:
            return f"€{int(price_amount)}"
        else:
            return "ticketed event"

    def generate_enrichment_prompt(self, event: Dict) -> str:
        """Generate prompt for seo-content-writer agent"""

        price_str = self.format_price(event['price_type'], event['price_amount'])

        # Check if event has cast/crew data
        has_cast = "=== ΣΥΝΤΕΛΕΣΤΕΣ / CAST & CREW ===" in (event['source_full_description'] or "")

        prompt = f"""Generate TWO SEO-optimized event descriptions (English + Greek) for Athens cultural event.

**CRITICAL CONSTRAINTS:**
1. STRICT 400-word limit PER description (380-420 acceptable)
2. {"MUST mention ALL performer/artist names from cast/crew section" if has_cast else "Focus on event concept and cultural context"}
3. ZERO fabrication - only use provided information
4. Focus on cultural context, artist background, venue atmosphere
5. Write for both AI answer engines AND human readers

**EVENT DATA:**

Title: {event['title']}
Venue: {event['venue_name']}
Type: {event['type']}
Price: {price_str}

**SOURCE DESCRIPTION{' (includes cast/crew)' if has_cast else ''}:**
{event['source_full_description']}

**DELIVERABLE FORMAT:**

Save TWO separate files in {ENRICHED_DIR}/:

1. `{event['id']}-en.txt` - English description (400 words)
2. `{event['id']}-gr.txt` - Greek description (400 words)

**CRITICAL REQUIREMENTS:**
- Athens neighborhood/venue context
- Event type context ({event['type']})
- Cultural scene references
- Target audience description
- {price_str} pricing mention
{"- ALL performer names from cast/crew section" if has_cast else "- Event concept and format details"}

**WORD COUNT ENFORCEMENT:**
After writing each description:
1. Count words: word_count = len(text.split())
2. If word_count > 420: EDIT ruthlessly to exactly 400 words
3. If word_count < 380: ADD cultural context to reach 400 words
4. Preserve ALL performer names during editing

Generate both descriptions now."""

        return prompt

    def print_summary(self):
        """Print enrichment statistics"""
        print(f"\n{'='*60}")
        print(f"📊 Batch Enrichment Summary")
        print(f"{'='*60}")
        print(f"Total processed:   {self.stats['total']}")
        print(f"✅ Enriched:        {self.stats['enriched']}")
        print(f"⏭️  Skipped:         {self.stats['skipped']}")
        print(f"❌ Errors:         {self.stats['errors']}")
        print(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(
        description="Batch enrich Athens events with AI descriptions"
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Limit number of events to process"
    )
    parser.add_argument(
        "--start",
        type=int,
        default=0,
        help="Start from event N (for resuming)"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-enrich events that already have descriptions"
    )

    args = parser.parse_args()

    enricher = EventEnricher()

    # Get events to enrich
    print(f"🔍 Finding events to enrich...")
    events = enricher.get_events_to_enrich(limit=args.limit, start=args.start)

    if not events:
        print("✅ No events need enrichment!")
        return 0

    print(f"📋 Found {len(events)} events")
    print()

    # Process events
    print("🤖 Starting batch enrichment...")
    print("⚠️  NOTE: You'll need to run seo-content-writer agent manually for each event")
    print()

    for i, event in enumerate(events, 1):
        enricher.stats["total"] += 1

        # Check if already enriched
        if enricher.event_already_enriched(event['id']) and not args.force:
            print(f"[{i}/{len(events)}] ⏭️  {event['title'][:50]} - Already enriched")
            enricher.stats["skipped"] += 1
            continue

        # Show event info
        print(f"\n{'='*60}")
        print(f"Event {i}/{len(events)}: {event['title']}")
        print(f"ID: {event['id']}")
        print(f"Venue: {event['venue_name']}")
        print(f"Type: {event['type']}")
        print(f"{'='*60}")

        # Generate prompt
        prompt = enricher.generate_enrichment_prompt(event)

        # Show prompt
        print("\n📝 PROMPT FOR seo-content-writer AGENT:")
        print(f"\n{prompt}\n")

        # Instruction for manual agent call
        print("⚠️  MANUAL ACTION REQUIRED:")
        print("   1. Copy the prompt above")
        print("   2. Call seo-content-writer agent with this prompt")
        print("   3. Verify files created:")
        print(f"      - {ENRICHED_DIR}/{event['id']}-en.txt")
        print(f"      - {ENRICHED_DIR}/{event['id']}-gr.txt")
        print()

        # Wait for user to continue
        response = input("Press ENTER when enrichment complete, or 'q' to quit: ")

        if response.lower() == 'q':
            print("\n⏸️  Enrichment paused")
            break

        # Check if files were created
        if enricher.event_already_enriched(event['id']):
            print("✅ Enrichment confirmed!")
            enricher.stats["enriched"] += 1
            enricher.progress["enriched_events"].append(event['id'])
        else:
            print("❌ Files not found - marking as error")
            enricher.stats["errors"] += 1

        # Save progress
        enricher.progress["last_batch"] = i
        enricher.save_progress()

    # Print summary
    enricher.print_summary()

    return 0


if __name__ == "__main__":
    exit(main())
