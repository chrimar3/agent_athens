#!/usr/bin/env bun
/**
 * Advanced Event Deduplication Script - Production Ready
 *
 * Multi-pass deduplication with recurring event protection:
 * Pass 0: Identify and protect recurring events (CRITICAL)
 *   - Theater/Performance runs (3+ shows over 7+ days)
 *   - Exhibition runs (5+ instances over 14+ days)
 *   - Weekly recurring events (4+ on same weekday)
 *   - Festival multi-day events (3+ with Festival/Φεστιβάλ in title)
 * Pass 1: URL-based (primary key - same URL = same event)
 * Pass 2: Exact match (title + venue + date + TIME)
 * Pass 3: Cross-source within 24 hours (STRICT)
 * Pass 4: Fuzzy title match (case-insensitive + trimmed)
 * Pass 5: Venue normalization (removes special chars)
 * Pass 6: Suspicious timestamp cleanup (CONSERVATIVE - only 00:00, 12:00)
 *
 * Keeps highest quality version based on:
 * - Source priority (more.com > viva.gr > gazarte.gr > email)
 * - Description length (longer = more detailed)
 * - Title completeness (longer = more descriptive)
 *
 * Usage: bun run scripts/remove-duplicates.ts [--dry-run]
 */

import Database from 'bun:sqlite';

const db = new Database('data/events.db');
const DRY_RUN = process.argv.includes('--dry-run');
const REMOVAL_THRESHOLD = 0.20; // Alert if >20% would be removed

if (DRY_RUN) {
  console.log('🔍 DRY RUN MODE - No changes will be made\n');
}

console.log('🧹 Advanced Event Deduplication - Production Ready\n');
console.log('='.repeat(60) + '\n');

// Track statistics
let totalRemoved = 0;
const removalsByPass: Record<string, number> = {};
let protectedCount = 0;

/**
 * PASS 0: Recurring Event Protection (CRITICAL - RUN FIRST)
 * Identifies and marks legitimate multi-date events
 */
console.log('🛡️  PASS 0: Recurring Event Protection');
console.log('-'.repeat(60));

// Add protection column if not exists
try {
  db.run(`
    ALTER TABLE events
    ADD COLUMN dedup_protected INTEGER DEFAULT 0
  `);
} catch (error) {
  // Column already exists, ignore
}

try {
  db.run(`
    ALTER TABLE events
    ADD COLUMN dedup_reason TEXT
  `);
} catch (error) {
  // Column already exists, ignore
}

// 1. Theater/Dance/Performance runs (3+ shows over 7+ days)
const theaterRuns = db.prepare(`
  SELECT title, venue_name, COUNT(*) as shows,
         MIN(date(start_date)) as first_show,
         MAX(date(start_date)) as last_show
  FROM events
  WHERE start_date >= date('now')
    AND type IN ('theater', 'performance', 'cinema')
  GROUP BY title, venue_name
  HAVING COUNT(*) >= 3
    AND (julianday(MAX(start_date)) - julianday(MIN(start_date))) >= 7
`).all() as Array<{ title: string; venue_name: string; shows: number }>;

if (theaterRuns.length > 0) {
  console.log(`Found ${theaterRuns.length} theater/performance runs`);

  const protectTheaterStmt = db.prepare(`
    UPDATE events
    SET dedup_protected = 1, dedup_reason = 'THEATER_RUN'
    WHERE title = ? AND venue_name = ?
  `);

  if (!DRY_RUN) {
    theaterRuns.forEach(run => {
      protectTheaterStmt.run(run.title, run.venue_name);
      protectedCount += run.shows;
    });
  } else {
    theaterRuns.forEach(run => protectedCount += run.shows);
  }
}

// 2. Exhibition runs (5+ instances over 14+ days)
const exhibitionRuns = db.prepare(`
  SELECT title, venue_name, COUNT(*) as instances
  FROM events
  WHERE start_date >= date('now')
    AND type = 'exhibition'
  GROUP BY title, venue_name
  HAVING COUNT(*) >= 5
    AND (julianday(MAX(start_date)) - julianday(MIN(start_date))) >= 14
`).all() as Array<{ title: string; venue_name: string; instances: number }>;

if (exhibitionRuns.length > 0) {
  console.log(`Found ${exhibitionRuns.length} exhibition runs`);

  const protectExhibitionStmt = db.prepare(`
    UPDATE events
    SET dedup_protected = 1, dedup_reason = 'EXHIBITION_RUN'
    WHERE title = ? AND venue_name = ?
  `);

  if (!DRY_RUN) {
    exhibitionRuns.forEach(run => {
      protectExhibitionStmt.run(run.title, run.venue_name);
      protectedCount += run.instances;
    });
  } else {
    exhibitionRuns.forEach(run => protectedCount += run.instances);
  }
}

// 3. Weekly recurring events (4+ instances on same weekday)
const weeklyEvents = db.prepare(`
  SELECT title, venue_name,
         COUNT(*) as occurrences,
         GROUP_CONCAT(DISTINCT strftime('%w', start_date)) as weekdays
  FROM events
  WHERE start_date >= date('now')
  GROUP BY title, venue_name
  HAVING COUNT(*) >= 4
    AND LENGTH(weekdays) <= 1
`).all() as Array<{ title: string; venue_name: string; occurrences: number }>;

if (weeklyEvents.length > 0) {
  console.log(`Found ${weeklyEvents.length} weekly recurring events`);

  const protectWeeklyStmt = db.prepare(`
    UPDATE events
    SET dedup_protected = 1, dedup_reason = 'WEEKLY_RECURRING'
    WHERE title = ? AND venue_name = ?
  `);

  if (!DRY_RUN) {
    weeklyEvents.forEach(event => {
      protectWeeklyStmt.run(event.title, event.venue_name);
      protectedCount += event.occurrences;
    });
  } else {
    weeklyEvents.forEach(event => protectedCount += event.occurrences);
  }
}

// 4. Festival multi-day events (3+ shows with "Festival" or "Φεστιβάλ" in title)
const festivalEvents = db.prepare(`
  SELECT title, venue_name, COUNT(*) as shows
  FROM events
  WHERE start_date >= date('now')
    AND (title LIKE '%Festival%' OR title LIKE '%Φεστιβάλ%')
  GROUP BY title, venue_name
  HAVING COUNT(*) >= 3
`).all() as Array<{ title: string; venue_name: string; shows: number }>;

if (festivalEvents.length > 0) {
  console.log(`Found ${festivalEvents.length} festival multi-day events`);

  const protectFestivalStmt = db.prepare(`
    UPDATE events
    SET dedup_protected = 1, dedup_reason = 'FESTIVAL'
    WHERE title = ? AND venue_name = ?
  `);

  if (!DRY_RUN) {
    festivalEvents.forEach(event => {
      protectFestivalStmt.run(event.title, event.venue_name);
      protectedCount += event.shows;
    });
  } else {
    festivalEvents.forEach(event => protectedCount += event.shows);
  }
}

console.log(`\n${DRY_RUN ? 'Would protect' : 'Protected'} ${protectedCount} recurring event instances\n`);

/**
 * PASS 1: URL-Based Deduplication (PRIMARY KEY)
 * Same URL = Same event, regardless of title variations
 */
console.log('📍 PASS 1: URL-Based Deduplication');
console.log('-'.repeat(60));

const urlDuplicates = db.prepare(`
  SELECT url, COUNT(*) as count, GROUP_CONCAT(id) as ids,
         GROUP_CONCAT(title, ' | ') as titles
  FROM events
  WHERE start_date >= date('now')
    AND url IS NOT NULL
    AND url != ''
    AND (dedup_protected = 0 OR dedup_protected IS NULL)
  GROUP BY url
  HAVING COUNT(*) > 1
  ORDER BY count DESC;
`).all() as Array<{ url: string; count: number; ids: string; titles: string }>;

if (urlDuplicates.length > 0) {
  console.log(`Found ${urlDuplicates.length} URL duplicate groups\n`);

  let urlRemovalCount = 0;

  const urlDeleteStmt = db.prepare(`
    DELETE FROM events WHERE id IN (
      SELECT id FROM (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY url
            ORDER BY
              CASE source
                WHEN 'more.com' THEN 1
                WHEN 'viva.gr' THEN 2
                WHEN 'gazarte.gr' THEN 3
                ELSE 4
              END,
              LENGTH(title) DESC,
              LENGTH(COALESCE(description, '')) DESC,
              id
          ) as rn
        FROM events
        WHERE start_date >= date('now')
          AND url IS NOT NULL
          AND url != ''
          AND (dedup_protected = 0 OR dedup_protected IS NULL)
      )
      WHERE rn > 1
    )
  `);

  if (!DRY_RUN) {
    const result = urlDeleteStmt.run();
    urlRemovalCount = result.changes;
    totalRemoved += urlRemovalCount;
    removalsByPass['URL-based'] = urlRemovalCount;
  } else {
    urlDuplicates.forEach(dup => {
      urlRemovalCount += (dup.count - 1);
    });
  }

  console.log(`${DRY_RUN ? 'Would remove' : 'Removed'} ${urlRemovalCount} URL duplicates\n`);
} else {
  console.log('✅ No URL duplicates found\n');
}

/**
 * PASS 2: Exact Match (Title + Venue + Date + TIME)
 * Includes time component to preserve different showtimes
 */
console.log('🎯 PASS 2: Exact Match (Title + Venue + Date + TIME)');
console.log('-'.repeat(60));

const exactDuplicates = db.prepare(`
  SELECT title, venue_name,
         date(start_date) as date,
         time(start_date) as time,
         COUNT(*) as count, GROUP_CONCAT(id) as ids
  FROM events
  WHERE start_date >= date('now')
    AND (dedup_protected = 0 OR dedup_protected IS NULL)
  GROUP BY title, venue_name, date(start_date), time(start_date)
  HAVING COUNT(*) > 1
  ORDER BY count DESC;
`).all() as Array<{ title: string; venue_name: string; date: string; time: string; count: number; ids: string }>;

if (exactDuplicates.length > 0) {
  console.log(`Found ${exactDuplicates.length} exact duplicate groups\n`);

  let exactRemovalCount = 0;

  const exactDeleteStmt = db.prepare(`
    DELETE FROM events WHERE id IN (
      SELECT id FROM (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY title, venue_name, date(start_date), time(start_date)
            ORDER BY
              CASE source
                WHEN 'more.com' THEN 1
                WHEN 'viva.gr' THEN 2
                WHEN 'gazarte.gr' THEN 3
                ELSE 4
              END,
              LENGTH(COALESCE(description, '')) DESC,
              id
          ) as rn
        FROM events
        WHERE start_date >= date('now')
          AND (dedup_protected = 0 OR dedup_protected IS NULL)
      )
      WHERE rn > 1
    )
  `);

  if (!DRY_RUN) {
    const result = exactDeleteStmt.run();
    exactRemovalCount = result.changes;
    totalRemoved += exactRemovalCount;
    removalsByPass['Exact match + time'] = exactRemovalCount;
  } else {
    exactDuplicates.forEach(dup => {
      exactRemovalCount += (dup.count - 1);
    });
  }

  console.log(`${DRY_RUN ? 'Would remove' : 'Removed'} ${exactRemovalCount} exact duplicates\n`);
} else {
  console.log('✅ No exact duplicates found\n');
}

/**
 * PASS 3: Cross-Source Within 24 Hours (STRICT)
 * Tightened from 3 days to 24 hours to reduce false positives
 */
console.log('🌐 PASS 3: Cross-Source Within 24 Hours (STRICT)');
console.log('-'.repeat(60));

const crossSourceDuplicates = db.prepare(`
  SELECT title, venue_name,
         COUNT(*) as count,
         MIN(date(start_date)) as earliest_date,
         MAX(date(start_date)) as latest_date,
         GROUP_CONCAT(DISTINCT source) as sources
  FROM events
  WHERE start_date >= date('now')
    AND (dedup_protected = 0 OR dedup_protected IS NULL)
  GROUP BY LOWER(TRIM(title)), venue_name,
    CAST(julianday(start_date) AS INTEGER)
  HAVING COUNT(*) > 1
    AND COUNT(DISTINCT source) > 1
    AND (julianday(MAX(start_date)) - julianday(MIN(start_date))) <= 1
  ORDER BY count DESC;
`).all() as Array<{
  title: string;
  venue_name: string;
  count: number;
  earliest_date: string;
  latest_date: string;
  sources: string;
}>;

if (crossSourceDuplicates.length > 0) {
  console.log(`Found ${crossSourceDuplicates.length} cross-source duplicates (within 24h)\n`);

  let crossSourceRemovalCount = 0;

  const crossSourceDeleteStmt = db.prepare(`
    DELETE FROM events WHERE id IN (
      SELECT id FROM (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY LOWER(TRIM(title)), venue_name,
              CAST(julianday(start_date) AS INTEGER)
            ORDER BY
              CASE source
                WHEN 'more.com' THEN 1
                WHEN 'viva.gr' THEN 2
                WHEN 'gazarte.gr' THEN 3
                ELSE 4
              END,
              LENGTH(COALESCE(description, '')) DESC,
              id
          ) as rn
        FROM events
        WHERE start_date >= date('now')
          AND (dedup_protected = 0 OR dedup_protected IS NULL)
      )
      WHERE rn > 1
    )
  `);

  if (!DRY_RUN) {
    const result = crossSourceDeleteStmt.run();
    crossSourceRemovalCount = result.changes;
    totalRemoved += crossSourceRemovalCount;
    removalsByPass['Cross-source 24h'] = crossSourceRemovalCount;
  } else {
    crossSourceDuplicates.forEach(dup => {
      crossSourceRemovalCount += (dup.count - 1);
    });
  }

  console.log(`${DRY_RUN ? 'Would remove' : 'Removed'} ${crossSourceRemovalCount} cross-source duplicates\n`);
} else {
  console.log('✅ No cross-source duplicates found\n');
}

/**
 * PASS 4: Fuzzy Title Match (Case-Insensitive + Trimmed)
 * Catches title variations with different capitalization/spacing
 */
console.log('🔤 PASS 4: Fuzzy Title Match (Case-Insensitive)');
console.log('-'.repeat(60));

const fuzzyDuplicates = db.prepare(`
  SELECT LOWER(TRIM(title)) as normalized_title,
         venue_name,
         date(start_date) as date,
         COUNT(*) as count,
         GROUP_CONCAT(title, ' | ') as original_titles
  FROM events
  WHERE start_date >= date('now')
    AND (dedup_protected = 0 OR dedup_protected IS NULL)
    AND LENGTH(title) >= 5
  GROUP BY LOWER(TRIM(title)), venue_name, date(start_date)
  HAVING COUNT(*) > 1
  ORDER BY count DESC;
`).all() as Array<{
  normalized_title: string;
  venue_name: string;
  date: string;
  count: number;
  original_titles: string;
}>;

if (fuzzyDuplicates.length > 0) {
  console.log(`Found ${fuzzyDuplicates.length} fuzzy title duplicate groups\n`);

  let fuzzyRemovalCount = 0;

  const fuzzyDeleteStmt = db.prepare(`
    DELETE FROM events WHERE id IN (
      SELECT id FROM (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY LOWER(TRIM(title)), venue_name, date(start_date)
            ORDER BY
              LENGTH(title) DESC,
              CASE source
                WHEN 'more.com' THEN 1
                WHEN 'viva.gr' THEN 2
                ELSE 3
              END,
              LENGTH(COALESCE(description, '')) DESC,
              id
          ) as rn
        FROM events
        WHERE start_date >= date('now')
          AND (dedup_protected = 0 OR dedup_protected IS NULL)
          AND LENGTH(title) >= 5
      )
      WHERE rn > 1
    )
  `);

  if (!DRY_RUN) {
    const result = fuzzyDeleteStmt.run();
    fuzzyRemovalCount = result.changes;
    totalRemoved += fuzzyRemovalCount;
    removalsByPass['Fuzzy title'] = fuzzyRemovalCount;
  } else {
    fuzzyDuplicates.forEach(dup => {
      fuzzyRemovalCount += (dup.count - 1);
    });
  }

  console.log(`${DRY_RUN ? 'Would remove' : 'Removed'} ${fuzzyRemovalCount} fuzzy duplicates\n`);
} else {
  console.log('✅ No fuzzy title duplicates found\n');
}

/**
 * PASS 5: Venue Normalization (Remove special characters)
 * Catches "Gazarte Main Stage" vs "Gazarte Main Stage!"
 */
console.log('🏛️  PASS 5: Venue Normalization');
console.log('-'.repeat(60));

const venueNormalizedDuplicates = db.prepare(`
  SELECT title,
         LOWER(REPLACE(REPLACE(REPLACE(venue_name, '!', ''), '-', ''), '.', '')) as normalized_venue,
         date(start_date) as date,
         COUNT(*) as count,
         GROUP_CONCAT(venue_name, ' | ') as original_venues
  FROM events
  WHERE start_date >= date('now')
    AND (dedup_protected = 0 OR dedup_protected IS NULL)
  GROUP BY title,
           LOWER(REPLACE(REPLACE(REPLACE(venue_name, '!', ''), '-', ''), '.', '')),
           date(start_date)
  HAVING COUNT(*) > 1
  ORDER BY count DESC;
`).all() as Array<{
  title: string;
  normalized_venue: string;
  date: string;
  count: number;
  original_venues: string;
}>;

if (venueNormalizedDuplicates.length > 0) {
  console.log(`Found ${venueNormalizedDuplicates.length} venue normalization duplicates\n`);

  let venueRemovalCount = 0;

  const venueDeleteStmt = db.prepare(`
    DELETE FROM events WHERE id IN (
      SELECT id FROM (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY title,
              LOWER(REPLACE(REPLACE(REPLACE(venue_name, '!', ''), '-', ''), '.', '')),
              date(start_date)
            ORDER BY
              LENGTH(venue_name) DESC,
              CASE source
                WHEN 'more.com' THEN 1
                WHEN 'viva.gr' THEN 2
                ELSE 3
              END,
              id
          ) as rn
        FROM events
        WHERE start_date >= date('now')
          AND (dedup_protected = 0 OR dedup_protected IS NULL)
      )
      WHERE rn > 1
    )
  `);

  if (!DRY_RUN) {
    const result = venueDeleteStmt.run();
    venueRemovalCount = result.changes;
    totalRemoved += venueRemovalCount;
    removalsByPass['Venue normalized'] = venueRemovalCount;
  } else {
    venueNormalizedDuplicates.forEach(dup => {
      venueRemovalCount += (dup.count - 1);
    });
  }

  console.log(`${DRY_RUN ? 'Would remove' : 'Removed'} ${venueRemovalCount} venue-normalized duplicates\n`);
} else {
  console.log('✅ No venue normalization duplicates found\n');
}

/**
 * PASS 6: Suspicious Timestamp Cleanup (CONSERVATIVE)
 * Only removes obvious scraper defaults (00:00, 12:00)
 */
console.log('⏰ PASS 6: Suspicious Timestamp Cleanup (CONSERVATIVE)');
console.log('-'.repeat(60));

const suspiciousTimestamps = db.prepare(`
  SELECT title, venue_name, date(start_date) as date,
         COUNT(*) as count,
         GROUP_CONCAT(time(start_date), ' | ') as times,
         GROUP_CONCAT(id, ',') as ids
  FROM events
  WHERE start_date >= date('now')
    AND (dedup_protected = 0 OR dedup_protected IS NULL)
  GROUP BY title, venue_name, date(start_date)
  HAVING COUNT(*) > 1
    AND MIN(time(start_date)) IN ('00:00:00', '12:00:00')
  ORDER BY count DESC;
`).all() as Array<{
  title: string;
  venue_name: string;
  date: string;
  count: number;
  times: string;
  ids: string;
}>;

if (suspiciousTimestamps.length > 0) {
  console.log(`Found ${suspiciousTimestamps.length} suspicious timestamp groups\n`);

  let timestampRemovalCount = 0;

  const timestampDeleteStmt = db.prepare(`
    DELETE FROM events WHERE id IN (
      SELECT id FROM (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY title, venue_name, date(start_date)
            ORDER BY
              CASE time(start_date)
                WHEN '00:00:00' THEN 2  -- Obvious default
                WHEN '12:00:00' THEN 2  -- Unlikely for evening events
                ELSE 1                   -- Realistic times
              END,
              CASE source
                WHEN 'more.com' THEN 1
                WHEN 'viva.gr' THEN 2
                ELSE 3
              END,
              LENGTH(COALESCE(description, '')) DESC,
              id
          ) as rn
        FROM events
        WHERE start_date >= date('now')
          AND (dedup_protected = 0 OR dedup_protected IS NULL)
      )
      WHERE rn > 1
    )
  `);

  if (!DRY_RUN) {
    const result = timestampDeleteStmt.run();
    timestampRemovalCount = result.changes;
    totalRemoved += timestampRemovalCount;
    removalsByPass['Timestamp cleanup'] = timestampRemovalCount;
  } else {
    suspiciousTimestamps.forEach(dup => {
      timestampRemovalCount += (dup.count - 1);
    });
  }

  console.log(`${DRY_RUN ? 'Would remove' : 'Removed'} ${timestampRemovalCount} suspicious timestamp duplicates\n`);
} else {
  console.log('✅ No suspicious timestamp duplicates found\n');
}

/**
 * Final Verification
 */
console.log('='.repeat(60));
console.log('📊 FINAL SUMMARY');
console.log('='.repeat(60) + '\n');

const finalStats = db.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN dedup_protected = 1 THEN 1 ELSE 0 END) as protected,
    COUNT(DISTINCT url) as unique_urls,
    COUNT(DISTINCT title || venue_name || date(start_date)) as unique_events
  FROM events
  WHERE start_date >= date('now');
`).get() as { total: number; protected: number; unique_urls: number; unique_events: number };

const initialCount = finalStats.total + totalRemoved;
const removalRate = totalRemoved / initialCount;

console.log(`Events before deduplication: ${initialCount}`);
console.log(`Protected (recurring): ${finalStats.protected}`);
console.log(`Events after deduplication: ${finalStats.total}`);
console.log(`Unique URLs: ${finalStats.unique_urls}`);
console.log(`Unique (title+venue+date): ${finalStats.unique_events}\n`);

if (!DRY_RUN) {
  console.log(`✅ Successfully removed ${totalRemoved} duplicates (${(removalRate * 100).toFixed(1)}%)\n`);

  if (Object.keys(removalsByPass).length > 0) {
    console.log('Breakdown by pass:');
    for (const [pass, count] of Object.entries(removalsByPass)) {
      console.log(`  ${pass}: ${count}`);
    }
    console.log('');
  }
} else {
  console.log(`💡 Would remove ${totalRemoved} duplicates (${(removalRate * 100).toFixed(1)}%)\n`);

  if (removalRate > REMOVAL_THRESHOLD) {
    console.log(`⚠️  WARNING: High removal rate (${(removalRate * 100).toFixed(1)}%)`);
    console.log(`   Threshold: ${REMOVAL_THRESHOLD * 100}%`);
    console.log(`   Review the report carefully before applying.`);
    console.log(`   Consider running with --dry-run first.\n`);
  }
}

if (finalStats.total !== finalStats.unique_events) {
  console.log(`⚠️  Warning: ${finalStats.total - finalStats.unique_events} potential duplicates remain`);
  console.log(`   Run script again or investigate manually\n`);
} else {
  console.log('✅ Database is fully deduplicated!\n');
}

db.close();
