#!/usr/bin/env python3
"""
Fetch Missing Event Times from more.com Pages
==============================================

Finds events with midnight (00:00:00.000) timestamps and fetches their
actual event times from more.com event pages using Playwright.

Usage:
  python3 scripts/fetch-times.py              # Fetch all missing times
  python3 scripts/fetch-times.py --limit 10    # Test with 10 events
  python3 scripts/fetch-times.py --dry-run     # Preview without updating DB
"""

import asyncio
import sqlite3
import sys
import re
from pathlib import Path
from typing import List, Tuple, Optional
import argparse
from datetime import datetime

from playwright.async_api import async_playwright, Browser

# Setup paths
PROJECT_ROOT = Path(__file__).parent.parent
DB_PATH = PROJECT_ROOT / "data/events.db"


class TimeFetcher:
    """Fetches event times from more.com pages"""

    def __init__(self, delay_seconds: float = 1.0, dry_run: bool = False):
        self.delay_seconds = delay_seconds
        self.dry_run = dry_run
        self.browser: Optional[Browser] = None
        self.stats = {
            "total": 0,
            "success": 0,
            "no_time_found": 0,
            "failed": 0
        }

    async def initialize(self):
        """Start browser"""
        playwright = await async_playwright().start()

        # Use system Chrome for reliability
        self.browser = await playwright.chromium.launch(
            headless=True,
            channel="chrome",
        )

        print(f"🌐 Browser initialized")
        print(f"⏱️  Rate limit: {self.delay_seconds}s between requests")
        if self.dry_run:
            print(f"🔍 DRY RUN MODE - no database updates")

    def validate_time(self, time_str: str) -> Optional[str]:
        """Validate time format (HH:MM) and return normalized version"""
        if not time_str:
            return None

        try:
            # Split into hours and minutes
            parts = time_str.split(':')
            if len(parts) != 2:
                return None

            hours = int(parts[0])
            minutes = int(parts[1])

            # Validate ranges
            if hours < 0 or hours > 23:
                return None
            if minutes < 0 or minutes > 59:
                return None

            # Return normalized format
            return f"{hours:02d}:{minutes:02d}"

        except (ValueError, IndexError):
            return None

    async def extract_time_from_page(self, url: str) -> Optional[str]:
        """Extract event time from more.com page"""
        try:
            page = await self.browser.new_page(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
            )

            # Fetch page with longer timeout
            await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            await page.wait_for_timeout(1000)

            # Get page content
            html = await page.content()
            await page.close()

            # Try to extract time from HTML using multiple patterns
            patterns = [
                # Pattern 1: "Ώρα: 20:30" or "Ώρα 21:00"
                r'Ώρα[:\s]+(\d{1,2}:\d{2})',
                # Pattern 2: Time with AM/PM markers
                r'(\d{1,2}:\d{2})\s*(?:μ\.μ\.|μμ|π\.μ\.|πμ)',
                # Pattern 3: JSON-LD structured data
                r'"startDate"[:\s]+"[^"]*T(\d{2}:\d{2}):',
                # Pattern 4: Meta tags
                r'<meta[^>]*content="[^"]*T(\d{2}:\d{2}):',
                # Pattern 5: Event time in Greek
                r'(?:Ημέρα|Ημερομηνία)[^<]*?(\d{1,2}:\d{2})',
                # Pattern 6: Simple time pattern (with word boundaries)
                r'\b(\d{1,2}:\d{2})\b',
            ]

            # Collect all valid times and score them
            time_candidates = []

            for pattern in patterns:
                matches = re.finditer(pattern, html, re.IGNORECASE)
                for match in matches:
                    time_str = match.group(1)
                    validated_time = self.validate_time(time_str)
                    if validated_time:
                        hours = int(validated_time.split(':')[0])
                        minutes = int(validated_time.split(':')[1])

                        # Skip very early morning times (unlikely for events)
                        if hours < 8:
                            continue

                        # Score based on likelihood of being an event time
                        score = 0

                        # Prefer rounded times (19:00, 20:30 etc)
                        if minutes in [0, 15, 30, 45]:
                            score += 10

                        # Evening times more likely (18:00-23:00)
                        if 18 <= hours <= 23:
                            score += 5
                        # Afternoon times also common (14:00-17:59)
                        elif 14 <= hours <= 17:
                            score += 3
                        # Morning/midday times less likely but possible
                        elif 10 <= hours <= 13:
                            score += 1

                        time_candidates.append((validated_time, score))

            # Return the highest scoring time
            if time_candidates:
                time_candidates.sort(key=lambda x: x[1], reverse=True)
                return time_candidates[0][0]

            return None

        except Exception as e:
            print(f"   ❌ Error fetching page: {e}")
            return None

    async def fetch_and_update(self, events: List[Tuple[str, str, str, str]]):
        """Fetch times and update database"""
        self.stats["total"] = len(events)

        print(f"\n⏰ Fetching times for {len(events)} events...\n")

        updates = []

        for i, (event_id, title, current_date, url) in enumerate(events, 1):
            print(f"[{i}/{len(events)}] {title[:50]}...")
            print(f"   URL: {url}")

            time_str = await self.extract_time_from_page(url)

            if time_str:
                # Convert "20:30" to proper ISO timestamp
                # Extract date from current_date: "2025-11-15T00:00:00.000+02:00" -> "2025-11-15"
                date_part = current_date.split('T')[0]

                # Determine timezone offset (+02:00 or +03:00)
                # For now, use +02:00 (EET winter time)
                new_date = f"{date_part}T{time_str}:00+02:00"

                print(f"   ✅ Found time: {time_str} → {new_date}")

                updates.append((new_date, event_id))
                self.stats["success"] += 1
            else:
                print(f"   ⚠️  No time found")
                self.stats["no_time_found"] += 1

            # Rate limiting
            if i < len(events):
                await asyncio.sleep(self.delay_seconds)

        # Update database
        if not self.dry_run and updates:
            print(f"\n💾 Updating database with {len(updates)} times...")
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()

            for new_date, event_id in updates:
                cursor.execute(
                    "UPDATE events SET start_date = ?, updated_at = datetime('now') WHERE id = ?",
                    (new_date, event_id)
                )

            conn.commit()
            conn.close()
            print(f"✅ Database updated!")
        elif self.dry_run:
            print(f"\n🔍 DRY RUN: Would update {len(updates)} events")

    async def close(self):
        """Cleanup"""
        if self.browser:
            await self.browser.close()

    def print_summary(self):
        """Print final statistics"""
        print(f"\n{'='*60}")
        print(f"📊 Time Fetch Summary")
        print(f"{'='*60}")
        print(f"Total events:     {self.stats['total']}")
        print(f"✅ Times found:   {self.stats['success']}")
        print(f"⚠️  No time found: {self.stats['no_time_found']}")
        print(f"❌ Failed:        {self.stats['failed']}")
        print(f"{'='*60}")
        if self.stats['success'] > 0:
            success_rate = (self.stats['success'] / self.stats['total']) * 100
            print(f"📈 Success rate: {success_rate:.1f}%")
        print(f"{'='*60}")


def get_events_with_missing_times(limit: Optional[int] = None) -> List[Tuple[str, str, str, str]]:
    """Query events with midnight timestamps from database"""

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    query = """
        SELECT id, title, start_date, url
        FROM events
        WHERE date(start_date) >= date('now')
        AND start_date LIKE '%00:00:00.000%'
        AND url IS NOT NULL
        AND url LIKE '%more.com%'
        ORDER BY start_date
    """

    if limit:
        query += f" LIMIT {limit}"

    cursor.execute(query)
    events = cursor.fetchall()

    conn.close()

    return events


async def main():
    parser = argparse.ArgumentParser(description="Fetch missing event times from more.com")
    parser.add_argument("--limit", type=int, help="Limit number of events (for testing)")
    parser.add_argument("--delay", type=float, default=1.0, help="Delay between requests (default: 1.0s)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without updating database")

    args = parser.parse_args()

    print(f"🔍 Finding events with missing times (00:00:00.000)...")

    # Get events from database
    events = get_events_with_missing_times(limit=args.limit)

    if not events:
        print(f"✅ No events found with missing times!")
        sys.exit(0)

    print(f"📋 Found {len(events)} events with missing times")

    # Fetch times
    fetcher = TimeFetcher(delay_seconds=args.delay, dry_run=args.dry_run)

    try:
        await fetcher.initialize()
        await fetcher.fetch_and_update(events)
    finally:
        await fetcher.close()

    fetcher.print_summary()


if __name__ == "__main__":
    asyncio.run(main())
