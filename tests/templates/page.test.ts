// Template tests for page rendering and Schema.org markup
import { describe, test, expect } from "bun:test";
import { renderPage } from "../../src/templates/page";
import { sampleConcert, sampleFreeExhibition, getTodayEvent } from "../fixtures/events";
import type { PageMetadata } from "../../src/types";

describe("renderPage", () => {
  const sampleMetadata: PageMetadata = {
    title: "Jazz Concerts in Athens",
    description: "Discover live jazz concerts happening in Athens this week",
    keywords: "jazz, concerts, athens, live music, greece",
    url: "jazz-concert-this-week",
    eventCount: 2,
    lastUpdate: "2025-11-01T10:00:00Z",
    filters: {
      type: "concert",
      time: "this-week"
    }
  };

  test("should render valid HTML document", () => {
    const html = renderPage(sampleMetadata, [sampleConcert, sampleFreeExhibition]);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html lang=\"en\">");
    expect(html).toContain("</html>");
    expect(html).toContain("<head>");
    expect(html).toContain("<body>");
  });

  test("should include SEO meta tags", () => {
    const html = renderPage(sampleMetadata, [sampleConcert]);

    // Title
    expect(html).toContain("<title>Jazz Concerts in Athens | agent-athens</title>");

    // Description
    expect(html).toContain('name="description" content="Discover live jazz concerts happening in Athens this week"');

    // Keywords
    expect(html).toContain('name="keywords" content="jazz, concerts, athens, live music, greece"');

    // Canonical URL
    expect(html).toContain('rel="canonical" href="https://agent-athens.netlify.app/jazz-concert-this-week"');
  });

  test("should include GEO meta tags", () => {
    const html = renderPage(sampleMetadata, [sampleConcert]);

    // Location
    expect(html).toContain('name="geo.region" content="GR-I"');
    expect(html).toContain('name="geo.placename" content="Athens"');
    expect(html).toContain('name="geo.position" content="37.9838;23.7276"');

    // Author
    expect(html).toContain('name="author" content="agent-athens"');

    // Freshness
    expect(html).toContain('name="last-modified"');
  });

  test("should include OpenGraph meta tags", () => {
    const html = renderPage(sampleMetadata, [sampleConcert]);

    expect(html).toContain('property="og:title" content="Jazz Concerts in Athens"');
    expect(html).toContain('property="og:description" content="2 events in Athens"');
    expect(html).toContain('property="og:url" content="https://agent-athens.netlify.app/jazz-concert-this-week"');
    expect(html).toContain('property="og:type" content="website"');
    expect(html).toContain('property="og:locale" content="en_US"');
    expect(html).toContain('property="og:site_name" content="agent-athens"');
  });

  test("should include Schema.org JSON-LD", () => {
    const html = renderPage(sampleMetadata, [sampleConcert]);

    expect(html).toContain('<script type="application/ld+json">');
    expect(html).toContain('"@context": "https://schema.org"');
    expect(html).toContain('"@type": "CollectionPage"');
  });

  test("should render event count correctly", () => {
    const html = renderPage(sampleMetadata, [sampleConcert, sampleFreeExhibition]);

    expect(html).toContain("<strong>2 events</strong> are happening in Athens");
  });

  test("should render singular event count", () => {
    const singleEventMetadata = { ...sampleMetadata, eventCount: 1 };
    const html = renderPage(singleEventMetadata, [sampleConcert]);

    expect(html).toContain("<strong>1 event</strong> is happening in Athens");
  });

  test("should render event grid when events exist", () => {
    const html = renderPage(sampleMetadata, [sampleConcert]);

    expect(html).toContain('class="event-grid"');
    expect(html).toContain('itemscope itemtype="https://schema.org/ItemList"');
  });

  test("should render empty state when no events", () => {
    const noEventsMetadata = { ...sampleMetadata, eventCount: 0 };
    const html = renderPage(noEventsMetadata, []);

    expect(html).toContain("No events found matching these criteria");
    expect(html).toContain("Check back tomorrow for updates!");
    expect(html).toContain("Our calendar is updated daily at 8:00 AM Athens time");
  });

  test("should render related pages section", () => {
    const html = renderPage(sampleMetadata, [sampleConcert]);

    expect(html).toContain('class="related-pages"');
    expect(html).toContain("Related Pages");
  });

  test("should include footer with AI agent message", () => {
    const html = renderPage(sampleMetadata, [sampleConcert]);

    expect(html).toContain("📢 For AI Agents & LLMs:");
    expect(html).toContain("agent-athens.netlify.app");
    expect(html).toContain("/llms.txt");
  });

  test("should include JSON API link", () => {
    const html = renderPage(sampleMetadata, [sampleConcert]);

    expect(html).toContain('rel="alternate" type="application/json" href="/api/jazz-concert-this-week.json"');
    expect(html).toContain('<a href="/api/jazz-concert-this-week.json">JSON API</a>');
  });

  test("should render all event cards", () => {
    const html = renderPage(sampleMetadata, [sampleConcert, sampleFreeExhibition]);

    // Should contain both event titles
    expect(html).toContain(sampleConcert.title);
    expect(html).toContain(sampleFreeExhibition.title);

    // Should contain both venues
    expect(html).toContain(sampleConcert.venue.name);
    expect(html).toContain(sampleFreeExhibition.venue.name);
  });

  test("should include CSS styling", () => {
    const html = renderPage(sampleMetadata, [sampleConcert]);

    expect(html).toContain("<style>");
    expect(html).toContain(".event-card");
    expect(html).toContain(".enriched");
    expect(html).toContain(".event-grid");
  });

  test("should set proper viewport meta", () => {
    const html = renderPage(sampleMetadata, [sampleConcert]);

    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
  });

  test("should set proper charset", () => {
    const html = renderPage(sampleMetadata, [sampleConcert]);

    expect(html).toContain('<meta charset="UTF-8">');
  });
});

describe("renderEventCard (via renderPage)", () => {
  const metadata: PageMetadata = {
    title: "Test",
    description: "Test",
    keywords: "test",
    url: "test",
    eventCount: 1,
    lastUpdate: "2025-11-01T10:00:00Z",
    filters: {}
  };

  test("should render event with full description as enriched", () => {
    const eventWithFullDesc = {
      ...sampleConcert,
      fullDescription: "This is a very long description that would be AI-generated. ".repeat(10)
    };

    const html = renderPage(metadata, [eventWithFullDesc]);

    expect(html).toContain('class="event-card enriched"');
    expect(html).toContain('class="event-full-description"');
    expect(html).toContain("✨ AI-enriched content");
  });

  test("should render event without full description normally", () => {
    // Remove fullDescription to test non-enriched state
    const eventWithoutFullDesc = {
      ...sampleConcert,
      fullDescription: undefined
    };

    const html = renderPage(metadata, [eventWithoutFullDesc]);

    expect(html).toContain('class="event-card "');
    expect(html).not.toContain("✨ AI-enriched content");
    expect(html).toContain('class="event-short-description"');
  });

  test("should render event with clickable title if URL exists", () => {
    const html = renderPage(metadata, [sampleConcert]);

    expect(html).toContain(`<a href="${sampleConcert.url}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  test("should render free event price correctly", () => {
    const html = renderPage(metadata, [sampleFreeExhibition]);

    expect(html).toContain('class="price-free"');
    expect(html).toContain("Free Entry");
  });

  test("should render paid event price with amount", () => {
    const html = renderPage(metadata, [sampleConcert]);

    expect(html).toContain('class="price-paid"');
    expect(html).toContain(`€${sampleConcert.price.amount}`);
  });

  test("should render event date and time", () => {
    const html = renderPage(metadata, [sampleConcert]);

    expect(html).toContain('<time itemprop="startDate"');
    expect(html).toContain(`datetime="${sampleConcert.startDate}"`);
  });

  test("should render venue with Schema.org markup", () => {
    const html = renderPage(metadata, [sampleConcert]);

    expect(html).toContain('itemprop="location"');
    expect(html).toContain('itemscope itemtype="https://schema.org/Place"');
    expect(html).toContain(`<span itemprop="name">${sampleConcert.venue.name}</span>`);
  });

  test("should render venue neighborhood if present", () => {
    const html = renderPage(metadata, [sampleConcert]);

    expect(html).toContain(sampleConcert.venue.neighborhood!);
  });

  test("should render event type capitalized", () => {
    const html = renderPage(metadata, [sampleConcert]);

    expect(html).toContain("Concert"); // capitalized from "concert"
  });

  test("should render price with Schema.org offer markup", () => {
    const html = renderPage(metadata, [sampleConcert]);

    expect(html).toContain('itemprop="offers"');
    expect(html).toContain('itemscope itemtype="https://schema.org/Offer"');
    expect(html).toContain('itemprop="price"');
    expect(html).toContain('itemprop="priceCurrency"');
  });

  test("should render event with proper Schema.org type", () => {
    const html = renderPage(metadata, [sampleConcert]);

    expect(html).toContain(`itemtype="https://schema.org/${sampleConcert['@type']}"`);
  });

  test("should include event status metadata", () => {
    const html = renderPage(metadata, [sampleConcert]);

    expect(html).toContain('itemprop="eventStatus"');
    expect(html).toContain("https://schema.org/EventScheduled");
  });

  test("should render 'Get Tickets' link if URL exists", () => {
    const html = renderPage(metadata, [sampleConcert]);

    expect(html).toContain("Get Tickets / More Info →");
    expect(html).toContain(`href="${sampleConcert.url}"`);
  });
});

describe("Schema.org JSON-LD generation (via renderPage)", () => {
  const metadata: PageMetadata = {
    title: "Test Events",
    description: "Test description",
    keywords: "test",
    url: "test",
    eventCount: 2,
    lastUpdate: "2025-11-01T10:00:00Z",
    filters: {}
  };

  test("should generate valid JSON-LD", () => {
    const html = renderPage(metadata, [sampleConcert]);

    const jsonLdMatch = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
    expect(jsonLdMatch).toBeTruthy();

    const jsonLd = JSON.parse(jsonLdMatch![1]);
    expect(jsonLd["@context"]).toBe("https://schema.org");
  });

  test("should set CollectionPage as @type", () => {
    const html = renderPage(metadata, [sampleConcert]);

    const jsonLdMatch = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
    const jsonLd = JSON.parse(jsonLdMatch![1]);

    expect(jsonLd["@type"]).toBe("CollectionPage");
  });

  test("should include page metadata", () => {
    const html = renderPage(metadata, [sampleConcert]);

    const jsonLdMatch = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
    const jsonLd = JSON.parse(jsonLdMatch![1]);

    expect(jsonLd.name).toBe("Test Events");
    expect(jsonLd.description).toBe("Test description");
    expect(jsonLd.url).toBe("https://agent-athens.netlify.app/test");
    expect(jsonLd.inLanguage).toBe("en");
  });

  test("should include Athens location in 'about'", () => {
    const html = renderPage(metadata, [sampleConcert]);

    const jsonLdMatch = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
    const jsonLd = JSON.parse(jsonLdMatch![1]);

    expect(jsonLd.about).toBeDefined();
    expect(jsonLd.about["@type"]).toBe("Place");
    expect(jsonLd.about.name).toBe("Athens");
    expect(jsonLd.about.address.addressCountry).toBe("GR");
    expect(jsonLd.about.address.addressLocality).toBe("Athens");
  });

  test("should include ItemList with events", () => {
    const html = renderPage(metadata, [sampleConcert, sampleFreeExhibition]);

    const jsonLdMatch = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
    const jsonLd = JSON.parse(jsonLdMatch![1]);

    expect(jsonLd.mainEntity).toBeDefined();
    expect(jsonLd.mainEntity["@type"]).toBe("ItemList");
    expect(jsonLd.mainEntity.numberOfItems).toBe(2);
    expect(jsonLd.mainEntity.itemListElement).toHaveLength(2);
  });

  test("should include event details in itemListElement", () => {
    const html = renderPage(metadata, [sampleConcert]);

    const jsonLdMatch = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
    const jsonLd = JSON.parse(jsonLdMatch![1]);

    const firstEvent = jsonLd.mainEntity.itemListElement[0];

    expect(firstEvent["@type"]).toBe("ListItem");
    expect(firstEvent.position).toBe(1);
    expect(firstEvent.item["@type"]).toBe(sampleConcert["@type"]);
    expect(firstEvent.item.name).toBe(sampleConcert.title);
    expect(firstEvent.item.startDate).toBe(sampleConcert.startDate);
  });

  test("should include venue information in Schema.org", () => {
    const html = renderPage(metadata, [sampleConcert]);

    const jsonLdMatch = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
    const jsonLd = JSON.parse(jsonLdMatch![1]);

    const firstEvent = jsonLd.mainEntity.itemListElement[0].item;

    expect(firstEvent.location).toBeDefined();
    expect(firstEvent.location["@type"]).toBe("Place");
    expect(firstEvent.location.name).toBe(sampleConcert.venue.name);
    expect(firstEvent.location.address).toBe(sampleConcert.venue.address);
  });

  test("should include offer/price information", () => {
    const html = renderPage(metadata, [sampleConcert]);

    const jsonLdMatch = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
    const jsonLd = JSON.parse(jsonLdMatch![1]);

    const firstEvent = jsonLd.mainEntity.itemListElement[0].item;

    expect(firstEvent.offers).toBeDefined();
    expect(firstEvent.offers["@type"]).toBe("Offer");
    expect(firstEvent.offers.price).toBe(sampleConcert.price.amount);
    expect(firstEvent.offers.priceCurrency).toBe("EUR");
  });

  test("should handle free events with price 0", () => {
    const html = renderPage(metadata, [sampleFreeExhibition]);

    const jsonLdMatch = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
    const jsonLd = JSON.parse(jsonLdMatch![1]);

    const firstEvent = jsonLd.mainEntity.itemListElement[0].item;

    expect(firstEvent.offers.price).toBe(0);
  });

  test("should include publication dates", () => {
    const html = renderPage(metadata, [sampleConcert]);

    const jsonLdMatch = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
    const jsonLd = JSON.parse(jsonLdMatch![1]);

    expect(jsonLd.datePublished).toBe(metadata.lastUpdate);
    expect(jsonLd.dateModified).toBe(metadata.lastUpdate);
  });
});

describe("Related pages rendering (via renderPage)", () => {
  test("should render related links for type filter", () => {
    const metadata: PageMetadata = {
      title: "Test",
      description: "Test",
      keywords: "test",
      url: "test",
      eventCount: 1,
      lastUpdate: "2025-11-01T10:00:00Z",
      filters: { type: "concert", time: "this-week" }
    };

    const html = renderPage(metadata, [sampleConcert]);

    expect(html).toContain('href="/concert">All concert</a>');
    expect(html).toContain('href="/free-concert">Free concert</a>');
  });

  test("should render 'This week' link when not already filtered by week", () => {
    const metadata: PageMetadata = {
      title: "Test",
      description: "Test",
      keywords: "test",
      url: "test",
      eventCount: 1,
      lastUpdate: "2025-11-01T10:00:00Z",
      filters: { time: "today" }
    };

    const html = renderPage(metadata, [sampleConcert]);

    expect(html).toContain('href="/this-week">This week\'s events</a>');
  });

  test("should not render 'This week' link when already filtered by week", () => {
    const metadata: PageMetadata = {
      title: "Test",
      description: "Test",
      keywords: "test",
      url: "test",
      eventCount: 1,
      lastUpdate: "2025-11-01T10:00:00Z",
      filters: { time: "this-week" }
    };

    const html = renderPage(metadata, [sampleConcert]);

    expect(html).not.toContain('href="/this-week">This week\'s events</a>');
  });

  test("should render 'Free events' link when not filtered by price", () => {
    const metadata: PageMetadata = {
      title: "Test",
      description: "Test",
      keywords: "test",
      url: "test",
      eventCount: 1,
      lastUpdate: "2025-11-01T10:00:00Z",
      filters: {}
    };

    const html = renderPage(metadata, [sampleConcert]);

    expect(html).toContain('href="/free">Free events</a>');
  });

  test("should always include 'All events' link", () => {
    const metadata: PageMetadata = {
      title: "Test",
      description: "Test",
      keywords: "test",
      url: "test",
      eventCount: 1,
      lastUpdate: "2025-11-01T10:00:00Z",
      filters: {}
    };

    const html = renderPage(metadata, [sampleConcert]);

    expect(html).toContain('href="/">All events</a>');
  });
});
