#!/usr/bin/env python3
"""
Aggressive Price Fetcher
========================

Enhanced version of price fetcher with more extraction patterns.
Tries multiple strategies to find prices on event pages.

Usage:
  python3 scripts/fetch-prices-aggressive.py              # Fetch all
  python3 scripts/fetch-prices-aggressive.py --limit 10   # Test with 10
  python3 scripts/fetch-prices-aggressive.py --dry-run    # Preview only
"""

import asyncio
import sqlite3
import sys
import re
from pathlib import Path
from typing import List, Tuple, Optional
import argparse

from playwright.async_api import async_playwright, Browser

# Setup paths
PROJECT_ROOT = Path(__file__).parent.parent
DB_PATH = PROJECT_ROOT / "data/events.db"


class AggressivePriceFetcher:
    """Fetches event prices with multiple extraction strategies"""

    def __init__(self, delay_seconds: float = 1.0, dry_run: bool = False):
        self.delay_seconds = delay_seconds
        self.dry_run = dry_run
        self.browser: Optional[Browser] = None
        self.stats = {
            "total": 0,
            "success": 0,
            "no_price_found": 0,
            "failed": 0
        }

    async def initialize(self):
        """Start browser"""
        playwright = await async_playwright().start()

        self.browser = await playwright.chromium.launch(
            headless=True,
            channel="chrome",
        )

        print(f"🌐 Browser initialized")
        print(f"⏱️  Rate limit: {self.delay_seconds}s between requests")
        if self.dry_run:
            print(f"🔍 DRY RUN MODE - no database updates")

    def extract_price(self, text: str) -> Optional[float]:
        """Extract price from text using multiple patterns"""

        # Patterns to try (in order of preference)
        patterns = [
            # Pattern 1: "€15", "15€", "EUR 15"
            r'(?:€|EUR)\s*(\d+(?:[.,]\d{2})?)',
            r'(\d+(?:[.,]\d{2})?)\s*(?:€|EUR)',

            # Pattern 2: Greek - "Τιμή: 15€", "Κόστος 20 ευρώ"
            r'(?:Τιμή|Κόστος|Εισιτήριο)[:\s]+(\d+(?:[.,]\d{2})?)\s*(?:€|ευρώ|EUR)',

            # Pattern 3: "από €10", "from €15"
            r'(?:από|from)\s+(?:€|EUR)?\s*(\d+(?:[.,]\d{2})?)',

            # Pattern 4: Price ranges "€10-€20", "10-20€"
            r'(?:€|EUR)?\s*(\d+)(?:[.,]\d{2})?\s*[-–]\s*(?:€|EUR)?\s*\d+',

            # Pattern 5: Numbers followed by euro symbol
            r'\b(\d+(?:[.,]\d{2})?)\s*€',

            # Pattern 6: Presale/door prices
            r'(?:προπώληση|presale)[:\s]+(?:€|EUR)?\s*(\d+(?:[.,]\d{2})?)',
            r'(?:ταμείο|door)[:\s]+(?:€|EUR)?\s*(\d+(?:[.,]\d{2})?)',
        ]

        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    price_str = match.group(1).replace(',', '.')
                    price = float(price_str)

                    # Sanity check: reasonable price range for events
                    if 0 < price < 1000:
                        return price
                except (ValueError, IndexError):
                    continue

        return None

    async def fetch_price_from_page(self, url: str) -> Optional[float]:
        """Extract price from event page"""
        try:
            page = await self.browser.new_page(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
            )

            # Fetch page
            await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            await page.wait_for_timeout(1500)

            # Get page content
            html = await page.content()
            await page.close()

            # Try to extract price from HTML
            price = self.extract_price(html)

            if price:
                return price

            # Try to find price in meta tags
            meta_patterns = [
                r'<meta[^>]*property="price"[^>]*content="([^"]*)"',
                r'<meta[^>]*name="price"[^>]*content="([^"]*)"',
                r'"price":\s*"?(\d+(?:\.\d{2})?)"?',
                r'"amount":\s*"?(\d+(?:\.\d{2})?)"?',
            ]

            for pattern in meta_patterns:
                match = re.search(pattern, html, re.IGNORECASE)
                if match:
                    try:
                        price = float(match.group(1))
                        if 0 < price < 1000:
                            return price
                    except ValueError:
                        continue

            return None

        except Exception as e:
            print(f"   ❌ Error: {str(e)[:50]}")
            return None

    async def fetch_and_update(self, events: List[Tuple[str, str, str]]):
        """Fetch prices and update database"""
        self.stats["total"] = len(events)

        print(f"\n💰 Aggressive price fetching for {len(events)} events...\n")

        updates = []

        for i, (event_id, title, url) in enumerate(events, 1):
            print(f"[{i}/{len(events)}] {title[:50]}...")
            print(f"   URL: {url}")

            price = await self.fetch_price_from_page(url)

            if price:
                print(f"   ✅ Found price: €{price:.2f}")
                updates.append((price, event_id))
                self.stats["success"] += 1
            else:
                print(f"   ⚠️  No price found")
                self.stats["no_price_found"] += 1

            # Rate limiting
            if i < len(events):
                await asyncio.sleep(self.delay_seconds)

        # Update database
        if not self.dry_run and updates:
            print(f"\n💾 Updating database with {len(updates)} prices...")
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()

            for price, event_id in updates:
                cursor.execute(
                    "UPDATE events SET price_amount = ?, updated_at = datetime('now') WHERE id = ?",
                    (price, event_id)
                )

            conn.commit()
            conn.close()
            print(f"✅ Database updated!")
        elif self.dry_run:
            print(f"\n🔍 DRY RUN: Would update {len(updates)} prices")

    async def close(self):
        """Cleanup"""
        if self.browser:
            await self.browser.close()

    def print_summary(self):
        """Print final statistics"""
        print(f"\n{'='*60}")
        print(f"📊 Aggressive Price Fetch Summary")
        print(f"{'='*60}")
        print(f"Total events:       {self.stats['total']}")
        print(f"✅ Prices found:    {self.stats['success']}")
        print(f"⚠️  No price found:  {self.stats['no_price_found']}")
        print(f"❌ Failed:          {self.stats['failed']}")
        print(f"{'='*60}")
        if self.stats['total'] > 0:
            success_rate = (self.stats['success'] / self.stats['total']) * 100
            print(f"📈 Success rate: {success_rate:.1f}%")
        print(f"{'='*60}")


def get_events_with_missing_prices(limit: Optional[int] = None) -> List[Tuple[str, str, str]]:
    """Query events without prices from database"""

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    query = """
        SELECT id, title, url
        FROM events
        WHERE date(start_date) >= date('now')
        AND price_type = 'paid'
        AND (price_amount IS NULL OR price_amount = 0)
        AND url IS NOT NULL
        ORDER BY start_date
    """

    if limit:
        query += f" LIMIT {limit}"

    cursor.execute(query)
    events = cursor.fetchall()

    conn.close()

    return events


async def main():
    parser = argparse.ArgumentParser(description="Aggressive price fetching")
    parser.add_argument("--limit", type=int, help="Limit number of events (for testing)")
    parser.add_argument("--delay", type=float, default=1.0, help="Delay between requests (default: 1.0s)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without updating database")

    args = parser.parse_args()

    print(f"🔍 Finding events with missing prices...")

    # Get events from database
    events = get_events_with_missing_prices(limit=args.limit)

    if not events:
        print(f"✅ No events found with missing prices!")
        sys.exit(0)

    print(f"📋 Found {len(events)} events with missing prices")

    # Fetch prices
    fetcher = AggressivePriceFetcher(delay_seconds=args.delay, dry_run=args.dry_run)

    try:
        await fetcher.initialize()
        await fetcher.fetch_and_update(events)
    finally:
        await fetcher.close()

    fetcher.print_summary()


if __name__ == "__main__":
    asyncio.run(main())
