# Pre-Enrichment Pipeline - Architecture Design

**Date**: November 4, 2025
**Purpose**: Solve sparse scraped data problem by enriching events before AI description generation
**Goal**: Achieve 67%+ pass rate for word count validation on scraped events

---

## Problem Statement

**Current State**: Scraped events have minimal descriptions (1-2 sentences)
- Example: "5 Νοεμβριου YIANNIS VAGIANOS QUARTET 'Second Take' Half Note Jazz Club"

**Issue**: Task agent generates proportionally to input richness
- Sparse input → 300-383 words (target: 415-430)
- Rich input → 396-468 words ✅

**Solution**: Add enrichment layer that gathers contextual data before AI generation

---

## Architecture Overview

```
┌─────────────────┐
│  Raw Event      │
│  (sparse data)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  PRE-ENRICHMENT PIPELINE            │
│                                     │
│  1. Venue Context Lookup            │
│  2. Artist/Performer Search         │
│  3. Genre Keywords Mapping          │
│  4. Event Type Context              │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Enriched Event │
│  (rich context) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AI Description │
│  Generation     │
│  (420 words)    │
└─────────────────┘
```

---

## Component 1: Venue Context Lookup

### Purpose
Provide rich venue descriptions to add Athens neighborhood context, venue atmosphere, and historical background.

### Data Sources (Priority Order)

**1. Database Cache (Fastest)**
```sql
CREATE TABLE venue_context (
  venue_name TEXT PRIMARY KEY,
  neighborhood TEXT,
  description TEXT,
  venue_type TEXT,
  capacity INTEGER,
  established_year INTEGER,
  last_updated TIMESTAMP
);
```

**2. Web Search Fallback**
- If not in cache, search: `"{venue_name}" Athens venue`
- Extract: neighborhood, type, capacity, establishment year
- Cache result for future use

**3. Generic Context (Last Resort)**
- Based on venue type (club, theater, gallery, etc.)
- Athens neighborhood if available
- Generic but accurate descriptions

### Implementation

```typescript
interface VenueContext {
  venue_name: string;
  neighborhood?: string;
  description?: string;
  venue_type?: string;
  capacity?: number;
  established_year?: number;
}

async function getVenueContext(venueName: string): Promise<VenueContext> {
  // 1. Check database cache
  const cached = db.prepare(
    'SELECT * FROM venue_context WHERE venue_name = ?'
  ).get(venueName);

  if (cached && isRecent(cached.last_updated)) {
    return cached;
  }

  // 2. Web search (using Task tool to avoid API costs)
  const searchResult = await searchVenueInfo(venueName);

  // 3. Cache and return
  if (searchResult) {
    cacheVenueContext(searchResult);
    return searchResult;
  }

  // 4. Return generic context
  return getGenericVenueContext(venueName);
}
```

### Example Output

**Input**: "Half Note Jazz Club"

**Output**:
```json
{
  "venue_name": "Half Note Jazz Club",
  "neighborhood": "Mets",
  "description": "Athens' premier jazz venue since the 1990s, located at the foot of Pangrati hill. Intimate 130-seat club with acoustics designed for small ensemble jazz. Known for booking serious jazz musicians who prioritize artistic integrity.",
  "venue_type": "jazz_club",
  "capacity": 130,
  "established_year": 1994
}
```

---

## Component 2: Artist/Performer Lookup

### Purpose
Provide artist background, genre, notable works, and credibility signals.

### Data Sources

**1. Web Search (Primary)**
- Search: `"{artist_name}" Athens {event_type}`
- Extract: bio, genre, notable works, awards
- Use Task tool for FREE web search + extraction

**2. Genre/Type Inference (Fallback)**
- If artist unknown, use event type + genre for generic context
- Example: "jazz quintet" → typical jazz quintet description

### Implementation

```typescript
interface ArtistInfo {
  name: string;
  bio?: string;
  genre?: string;
  notable_works?: string[];
  career_highlights?: string;
  active_since?: number;
}

async function lookupArtist(
  eventTitle: string,
  eventType: EventType
): Promise<ArtistInfo | null> {
  // Extract artist name from title
  const artistName = extractArtistName(eventTitle, eventType);

  if (!artistName) return null;

  // Use Task tool for web search + extraction (FREE)
  const prompt = `Search the web for "${artistName}" ${eventType} Athens.
  Extract:
  - Artist biography (2-3 sentences)
  - Genre/musical style
  - Notable works or albums
  - Career highlights

  Return as JSON. If artist not found, return null.
  CRITICAL: Do not fabricate information.`;

  const result = await callTaskAgent(prompt);
  return parseArtistInfo(result);
}

function extractArtistName(title: string, type: EventType): string | null {
  // Remove common patterns
  const cleaned = title
    .replace(/presents?/i, '')
    .replace(/live/i, '')
    .replace(/concert/i, '')
    .replace(/exhibition/i, '')
    .split(':')[0]
    .trim();

  return cleaned.length > 3 ? cleaned : null;
}
```

### Example Output

**Input**: "YIANNIS VAGIANOS QUARTET 'Second Take'"

**Output**:
```json
{
  "name": "Yiannis Vagianos",
  "bio": "Greek jazz composer and multi-instrumentalist known for blending Mediterranean musical traditions with contemporary jazz. Based in Athens, Vagianos leads various ensemble projects exploring the intersection of Greek folk elements and modern jazz improvisation.",
  "genre": "Contemporary Jazz, Mediterranean Jazz",
  "notable_works": ["Second Take", "Dream Modes"],
  "career_highlights": "Regular performer at Half Note Jazz Club, known for quintet and quartet configurations"
}
```

---

## Component 3: Genre Keywords Mapping

### Purpose
Provide semantic keyword clusters for SEO/GEO optimization.

### Implementation

```typescript
const GENRE_KEYWORDS: Record<string, string[]> = {
  jazz: [
    'improvisation', 'ensemble', 'bebop', 'swing',
    'acoustic', 'quintet', 'quartet', 'saxophone',
    'piano', 'bass', 'drums', 'composition'
  ],
  'contemporary-art': [
    'installation', 'gallery', 'curator', 'conceptual',
    'visual art', 'exhibition space', 'contemporary practice',
    'art criticism', 'cultural institution'
  ],
  theater: [
    'performance', 'stage', 'acting', 'playwright',
    'drama', 'theatrical production', 'ensemble cast',
    'direction', 'script', 'theatrical tradition'
  ],
  'stand-up-comedy': [
    'observational humor', 'social commentary', 'wit',
    'comedic timing', 'audience engagement', 'storytelling',
    'satire', 'improvisation', 'sketch'
  ],
  workshop: [
    'hands-on', 'creative practice', 'skill development',
    'participatory', 'experiential learning', 'facilitation',
    'artistic technique', 'creative expression'
  ]
  // ... more genres
};

function getGenreKeywords(genre: string, type: EventType): string[] {
  const genreKeys = GENRE_KEYWORDS[genre] || [];
  const typeKeys = GENRE_KEYWORDS[type] || [];
  return [...new Set([...genreKeys, ...typeKeys])];
}
```

---

## Component 4: Event Type Context

### Purpose
Provide general context about what attendees can expect at this type of event.

### Implementation

```typescript
const EVENT_TYPE_CONTEXT: Record<EventType, string> = {
  concert: "A live musical performance where audiences experience musicians performing in real-time. Concert-goers can expect the energy and spontaneity of live music, often with opportunities to hear new interpretations of known works or premiere performances.",

  exhibition: "A curated display of visual art, typically in a gallery or museum setting. Exhibitions allow viewers to engage with artworks in person, observing details, scale, and spatial relationships that reproductions cannot convey.",

  workshop: "A participatory educational experience where attendees learn through hands-on practice. Workshops emphasize skill development and creative exploration in a supportive group environment.",

  theater: "A live theatrical performance featuring actors, staging, and dramatic narrative. Theater offers the immediacy of live storytelling, where performers and audiences share the same space and moment.",

  performance: "A live artistic presentation that may combine elements of theater, dance, music, or multimedia. Performances often explore experimental or interdisciplinary approaches to live art.",

  cinema: "A film screening, often featuring independent, international, or classic films in a dedicated cinema environment. Cinema screenings provide communal viewing experiences with professional projection and sound."
};
```

---

## Enriched Event Data Structure

```typescript
interface EnrichedEvent extends Event {
  enrichment: {
    venue_context?: VenueContext;
    artist_info?: ArtistInfo;
    genre_keywords: string[];
    event_type_context: string;
    enrichment_timestamp: string;
    enrichment_version: string;
  }
}
```

---

## Modified AI Prompt Template

**Before Enrichment** (sparse data prompt):
```typescript
const prompt = `Generate a description for this Athens event.

Event Details:
- Title: ${event.title}
- Venue: ${event.venue_name}
- Date: ${event.start_date}
...
`;
```

**After Enrichment** (rich data prompt):
```typescript
const prompt = `Generate a compelling 420-word description for this cultural event in Athens.

Event Details:
- Title: ${event.title}
- Type: ${event.type}
- Venue: ${event.venue_name}
- Date: ${event.start_date}
- Price: ${event.price_type === 'open' ? 'Free admission' : `€${event.price_amount}`}

${event.enrichment.artist_info ? `
Artist Background:
${event.enrichment.artist_info.bio}
Genre: ${event.enrichment.artist_info.genre}
Notable Works: ${event.enrichment.artist_info.notable_works?.join(', ')}
` : ''}

${event.enrichment.venue_context ? `
Venue Context:
${event.enrichment.venue_context.description}
Neighborhood: ${event.enrichment.venue_context.neighborhood}
Capacity: ${event.enrichment.venue_context.capacity} seats
` : ''}

Genre Keywords (use naturally): ${event.enrichment.genre_keywords.join(', ')}

What to Expect:
${event.enrichment.event_type_context}

Requirements:
1. Write exactly 420 words (±10 words acceptable)
2. Include artist background if provided
3. Describe venue atmosphere and Athens neighborhood context
4. Use genre keywords naturally (DO NOT list them)
5. Explain what attendees can expect at this type of event
6. Write in authentic journalism tone (not marketing)

CRITICAL: Only use the information provided above. Do not fabricate details.
`;
```

---

## Implementation Plan

### Phase 1: Venue Context (Day 1 Morning)
1. Create `venue_context` table in database
2. Implement `getVenueContext()` function
3. Add web search fallback using Task tool
4. Test with 3 venues (Half Note, Los Angeles Comedy Club, CHNOPS)

### Phase 2: Artist Lookup (Day 1 Afternoon)
1. Implement `extractArtistName()` function
2. Create `lookupArtist()` with Task tool web search
3. Test with 3 artists from scraped events

### Phase 3: Genre Keywords (Day 1 Evening)
1. Create genre keyword mapping
2. Implement `getGenreKeywords()` function
3. Add event type context mapping

### Phase 4: Integration & Testing (Day 2 Morning)
1. Create `enrichEvent()` orchestrator function
2. Update AI prompt template
3. Re-test 3 scraped events
4. Validate word counts (target: 4/6 pass)

### Phase 5: Optimization (Day 2 Afternoon)
1. Add caching for repeated venues/artists
2. Optimize web search queries
3. Handle edge cases (missing data, errors)
4. Document usage

---

## Success Criteria

**Metrics**:
- Word count pass rate: 67%+ (4/6 or better)
- Average word count: 415+ (EN), 420+ (GR)
- GEO quality maintained (entity recognition, semantic clusters)
- Zero fabrications
- Processing time: <5 seconds per event (including web searches)

**Validation**:
- Re-test same 3 scraped events
- Compare to newsletter events baseline
- Verify no quality degradation

---

## Risk Mitigation

**Risk 1: Web Search Rate Limits**
- Mitigation: Cache all venue/artist lookups
- Fallback: Generic context if search unavailable

**Risk 2: Artist Name Extraction Fails**
- Mitigation: Proceed with venue + genre context only
- Still better than current sparse data

**Risk 3: Enrichment Takes Too Long**
- Mitigation: Parallel lookups (venue + artist simultaneously)
- Cache common venues to reduce searches

**Risk 4: Task Tool Searches Return Poor Results**
- Mitigation: Structured prompts with examples
- Fallback to generic context

---

## Future Enhancements (Post-MVP)

1. **Knowledge Base**: Build Athens venues/artists database
2. **Crowdsourcing**: Allow users to contribute venue/artist info
3. **ML Classification**: Auto-categorize event types from titles
4. **Historical Data**: Use past event descriptions to enrich new events
5. **Multilingual Search**: Search Greek sources for Greek artists

---

**Document Version**: 1.0
**Last Updated**: November 4, 2025
**Status**: APPROVED - Ready for implementation
**Estimated Completion**: 2 days (Nov 4-5)
