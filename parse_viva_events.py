#!/usr/bin/env python3
"""
Parse Viva.gr music events from HTML file.
Extracts event data and saves as JSON.
"""

import json
import re
from html.parser import HTMLParser
from datetime import datetime
from typing import List, Dict, Optional


class VivaEventParser(HTMLParser):
    """Parser for Viva.gr and More.com event HTML (Schema.org microdata)."""

    def __init__(self, default_type='concert', source_name='viva.gr'):
        super().__init__()
        self.events = []
        self.current_event = {}
        self.in_article = False
        self.in_title = False
        self.in_venue = False
        self.in_time = False
        self.current_data = []
        self.default_type = default_type
        self.source_name = source_name

    def handle_starttag(self, tag: str, attrs: List[tuple]) -> None:
        """Handle opening tags."""
        attrs_dict = dict(attrs)

        # Start of event article
        if tag == 'article' and attrs_dict.get('itemtype') == 'http://schema.org/Event':
            self.in_article = True
            self.current_event = {
                'title': '',
                'date': '',
                'time': '',
                'venue': '',
                'type': self.default_type,
                'genre': '',
                'price': 'with-ticket',
                'url': '',
                'description': '',
                'source': self.source_name,  # Set from main() based on file
                'location': 'Athens, Greece'
            }

            # Extract date from data-date-time attribute (format: 2026/06/21 18:00:00)
            date_time_str = attrs_dict.get('data-date-time', '')
            if date_time_str:
                try:
                    parts = date_time_str.split()
                    if len(parts) >= 2:
                        date_part = parts[0].replace('/', '-')
                        time_part = parts[1][:5]  # Get HH:MM
                        self.current_event['date'] = date_part
                        self.current_event['time'] = time_part
                except Exception:
                    pass

            # Extract genre from class names
            classes = attrs_dict.get('class', '')
            if 'musicrock' in classes:
                self.current_event['genre'] = 'rock'
            elif 'musicindie' in classes:
                self.current_event['genre'] = 'indie'
            elif 'musicartmusic' in classes:
                self.current_event['genre'] = 'art music'
            elif 'musicother' in classes:
                self.current_event['genre'] = 'other'
            elif 'tagfest' in classes:
                self.current_event['genre'] = 'festival'

        # Meta tags with event data
        elif tag == 'meta' and self.in_article:
            itemprop = attrs_dict.get('itemprop', '')
            content = attrs_dict.get('content', '')

            if itemprop == 'url':
                # Make full URL based on source
                if content and content.startswith('/'):
                    base_url = f"https://www.{self.source_name.replace('.gr', '.com')}" if 'more' in self.source_name else f"https://www.{self.source_name}"
                    self.current_event['url'] = f"{base_url}{content}"
            elif itemprop == 'description':
                self.current_event['description'] = content[:200] if content else ''
            elif itemprop == 'startDate' and not self.current_event['date']:
                # Fallback date parsing from ISO format
                try:
                    dt = datetime.fromisoformat(content.replace('T', ' '))
                    self.current_event['date'] = dt.strftime('%Y-%m-%d')
                    self.current_event['time'] = dt.strftime('%H:%M')
                except Exception:
                    pass

        # Title element
        elif tag == 'h3' and self.in_article and attrs_dict.get('class') == 'playinfo__title':
            self.in_title = True
            self.current_data = []

        # Venue element
        elif tag == 'span' and self.in_article and attrs_dict.get('id') == 'PlayVenue':
            self.in_venue = True
            self.current_data = []

        # Time element
        elif tag == 'time' and self.in_article and 'playinfo__date' in attrs_dict.get('class', ''):
            self.in_time = True
            self.current_data = []

    def handle_endtag(self, tag: str) -> None:
        """Handle closing tags."""
        if tag == 'article' and self.in_article:
            # Save event if we have required data
            if self.current_event.get('title') and self.current_event.get('date'):
                self.events.append(self.current_event.copy())
            self.in_article = False
            self.current_event = {}

        elif tag == 'h3' and self.in_title:
            self.current_event['title'] = ''.join(self.current_data).strip()
            self.in_title = False
            self.current_data = []

        elif tag == 'span' and self.in_venue:
            self.current_event['venue'] = ''.join(self.current_data).strip()
            self.in_venue = False
            self.current_data = []

    def handle_data(self, data: str) -> None:
        """Handle text data."""
        if self.in_title or self.in_venue or self.in_time:
            self.current_data.append(data)


def classify_event_type(title: str, description: str, genre: str) -> str:
    """Classify event type based on title, description, and genre."""
    title_lower = title.lower()
    desc_lower = description.lower()

    # Check for specific patterns
    if 'festival' in genre or 'fest' in title_lower:
        return 'concert'
    elif 'theater' in title_lower or 'theatre' in title_lower:
        return 'theater'
    elif 'exhibition' in title_lower or 'έκθεση' in title_lower:
        return 'exhibition'
    elif 'cinema' in title_lower or 'film' in title_lower:
        return 'cinema'
    elif 'workshop' in title_lower or 'εργαστήριο' in title_lower:
        return 'workshop'
    else:
        # Default for music events
        return 'concert'


def parse_greek_date_display(date_text: str) -> Optional[str]:
    """Parse Greek date display format to YYYY-MM-DD."""
    # Greek month mapping
    greek_months = {
        'ιαν': '01', 'φεβ': '02', 'μαρ': '03', 'απρ': '04',
        'μαι': '05', 'ιουν': '06', 'ιουλ': '07', 'αυγ': '08',
        'σεπ': '09', 'οκτ': '10', 'νοε': '11', 'δεκ': '12'
    }

    # Try to extract month
    for greek, num in greek_months.items():
        if greek in date_text.lower():
            # Extract day number
            day_match = re.search(r'\d+', date_text)
            if day_match:
                day = day_match.group().zfill(2)
                # Determine year (2025 or 2026 based on month)
                year = '2025' if int(num) >= 10 else '2026'
                return f"{year}-{num}-{day}"

    return None


def main():
    """Main function to parse events and save JSON."""
    import sys

    # Check if file path provided as argument
    if len(sys.argv) > 1:
        html_file = sys.argv[1]

        # Detect source from filename
        if 'more' in html_file:
            source_name = 'more.com'
            source_prefix = 'more'
        elif 'viva' in html_file:
            source_name = 'viva.gr'
            source_prefix = 'viva'
        else:
            source_name = 'unknown'
            source_prefix = 'events'

        # Extract category from filename (music, theater, sports)
        if 'music' in html_file:
            category = 'music'
            default_type = 'concert'
        elif 'theater' in html_file:
            category = 'theater'
            default_type = 'theater'
        elif 'sports' in html_file:
            category = 'sports'
            default_type = 'performance'
        else:
            category = 'general'
            default_type = 'other'
        output_file = f'/Users/chrism/Project with Claude/AgentAthens/agent-athens/data/parsed/{source_prefix}-{category}-events.json'
    else:
        html_file = '/Users/chrism/Project with Claude/AgentAthens/agent-athens/data/html-to-parse/2025-10-22-viva-www-viva-gr-tickets-music-.html'
        output_file = '/Users/chrism/Project with Claude/AgentAthens/agent-athens/data/parsed/viva-music-events.json'
        default_type = 'concert'
        source_name = 'viva.gr'

    print(f"Reading HTML file: {html_file}")
    print(f"Source: {source_name}")

    # Read and parse HTML
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()

    parser = VivaEventParser(default_type=default_type, source_name=source_name)
    parser.feed(html_content)

    # Process events
    events = parser.events
    print(f"Found {len(events)} events")

    # Clean up and classify events
    for event in events:
        # Classify event type
        event['type'] = classify_event_type(
            event['title'],
            event['description'],
            event['genre']
        )

        # Clean up description (remove extra whitespace)
        if event['description']:
            event['description'] = ' '.join(event['description'].split())

        # Ensure all required fields exist
        if not event['url']:
            event['url'] = ''
        if not event['genre']:
            event['genre'] = ''

    # Save to JSON
    print(f"Saving {len(events)} events to: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(events, f, ensure_ascii=False, indent=2)

    print("Done!")

    # Print sample event
    if events:
        print("\nSample event:")
        print(json.dumps(events[0], ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
