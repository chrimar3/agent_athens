// i18n utilities for Greek-first, English-secondary strategy
// Date created: November 12, 2025

import type { Event } from '../types';

/**
 * Format date in Greek
 * Example: "Τρίτη, 18 Νοεμβρίου 2025, 21:00"
 */
export function formatGreekDate(isoDate: string): string {
  const date = new Date(isoDate);

  const days = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
  const months = [
    'Ιανουαρίου', 'Φεβρουαρίου', 'Μαρτίου', 'Απριλίου', 'Μαΐου', 'Ιουνίου',
    'Ιουλίου', 'Αυγούστου', 'Σεπτεμβρίου', 'Οκτωβρίου', 'Νοεμβρίου', 'Δεκεμβρίου'
  ];

  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('el-GR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return `${dayName}, ${day} ${month} ${year}, ${time}`;
}

/**
 * Format price display in Greek
 */
export function formatPriceGreek(event: Event): string {
  if (event.price.type === 'free' || event.price.type === 'open') {
    return 'Δωρεάν είσοδος';
  }

  if (event.price.type === 'donation') {
    return 'Ελεύθερη συνεισφορά';
  }

  if (event.price.amount) {
    return `€${event.price.amount}`;
  }

  if (event.price.range) {
    return event.price.range;
  }

  return 'Επί πληρωμή';
}

/**
 * Generate Schema.org JSON-LD (always in English for AI parsing)
 * This is critical: Schema.org should ALWAYS be English regardless of content language
 */
export function toSchemaOrg(event: Event): string {
  // Map event type to Schema.org type
  const schemaType =
    event.type === 'concert' ? 'MusicEvent' :
    event.type === 'exhibition' ? 'ExhibitionEvent' :
    event.type === 'theater' ? 'TheaterEvent' :
    event.type === 'performance' ? 'PerformanceEvent' :
    'Event';

  const schema = {
    "@context": "https://schema.org",
    "@type": schemaType,
    "name": event.title,
    "description": `${event.type} event in Athens featuring ${event.title}`,
    "startDate": event.startDate,
    "endDate": event.endDate || event.startDate,
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "location": {
      "@type": "Place",
      "name": event.venue.name,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": event.venue.address || "",
        "addressLocality": "Athens",
        "addressRegion": "Attica",
        "postalCode": "",
        "addressCountry": "GR"
      }
    }
  };

  // Add pricing if available
  if (event.price.type === 'free' || event.price.type === 'open') {
    schema['offers'] = {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "EUR",
      "availability": "https://schema.org/InStock"
    };
  } else if (event.price.amount) {
    schema['offers'] = {
      "@type": "Offer",
      "url": event.url || "",
      "price": event.price.amount.toString(),
      "priceCurrency": "EUR",
      "availability": "https://schema.org/InStock"
    };
  }

  return JSON.stringify(schema, null, 2);
}

/**
 * Translate event type to Greek
 */
export function translateTypeToGreek(type: string): string {
  const translations: Record<string, string> = {
    'concert': 'Συναυλία',
    'exhibition': 'Έκθεση',
    'theater': 'Θέατρο',
    'cinema': 'Κινηματογράφος',
    'performance': 'Παράσταση',
    'workshop': 'Εργαστήριο',
    'other': 'Εκδήλωση'
  };

  return translations[type] || type;
}

/**
 * Generate bilingual keywords for meta tags
 */
export function generateKeywords(event: Event): string {
  const keywords: string[] = [];

  // Event title
  keywords.push(event.title);

  // Type (both Greek and English)
  keywords.push(translateTypeToGreek(event.type));
  keywords.push(event.type);

  // Genres
  if (event.genres && event.genres.length > 0) {
    keywords.push(...event.genres);
  }

  // Venue
  keywords.push(event.venue.name);

  // Neighborhood (Greek and transliteration)
  if (event.venue.neighborhood) {
    keywords.push(event.venue.neighborhood);
  }

  // Location
  keywords.push('Αθήνα');
  keywords.push('Athens');

  // Common terms
  keywords.push('εκδήλωση');
  keywords.push('event');

  return keywords.join(', ');
}
