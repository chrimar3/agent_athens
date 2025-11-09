// Unit tests for event normalization logic
import { describe, test, expect } from "bun:test";
import { normalizeEvents } from "../../src/utils/normalize";
import {
  sampleRawConcert,
  sampleRawFreeExhibition,
  sampleRawTheater,
  sampleRawWorkshop,
  sampleRawGreek,
  sampleRawNoTime,
  sampleParserOutput
} from "../fixtures/raw-events";
import {
  assertValidEvent,
  assertValidISO8601,
  assertValidVenue,
  assertValidPrice
} from "../helpers/assertions";

describe("normalizeEvents", () => {
  test("should normalize single raw event", () => {
    const result = normalizeEvents({ events: [sampleRawConcert] });

    expect(result).toBeArrayOfSize(1);
    const event = result[0];

    assertValidEvent(event);
    expect(event.title).toBe(sampleRawConcert.title);
    expect(event.type).toBe("concert");
    expect(event.source).toBe("viva.gr");
  });

  test("should normalize multiple raw events", () => {
    const result = normalizeEvents(sampleParserOutput);

    expect(result.length).toBeGreaterThan(0);
    result.forEach(event => {
      assertValidEvent(event);
    });
  });

  test("should generate valid event ID from title and date", () => {
    const result = normalizeEvents({ events: [sampleRawConcert] });
    const event = result[0];

    // ID should be slug-date format
    expect(event.id).toMatch(/^[a-z0-9-]+-\d{4}-\d{2}-\d{2}$/);
    expect(event.id).toContain(sampleRawConcert.date);
  });

  test("should normalize event type correctly", () => {
    const concertResult = normalizeEvents({ events: [sampleRawConcert] });
    expect(concertResult[0].type).toBe("concert");
    expect(concertResult[0]["@type"]).toBe("MusicEvent");

    const exhibitionResult = normalizeEvents({ events: [sampleRawFreeExhibition] });
    expect(exhibitionResult[0].type).toBe("exhibition");
    expect(exhibitionResult[0]["@type"]).toBe("ExhibitionEvent");
  });

  test("should normalize venue information", () => {
    const result = normalizeEvents({ events: [sampleRawConcert] });
    const event = result[0];

    assertValidVenue(event.venue);
    expect(event.venue.name).toBe(sampleRawConcert.venue);
    expect(event.venue.address).toBe(sampleRawConcert.location);
  });

  test("should assign coordinates to known venues", () => {
    const result = normalizeEvents({ events: [sampleRawConcert] });
    const event = result[0];

    if (event.venue.coordinates) {
      expect(event.venue.coordinates.lat).toBeGreaterThan(37.8);
      expect(event.venue.coordinates.lat).toBeLessThan(38.1);
      expect(event.venue.coordinates.lon).toBeGreaterThan(23.6);
      expect(event.venue.coordinates.lon).toBeLessThan(23.8);
    }
  });

  test("should normalize free price correctly", () => {
    const result = normalizeEvents({ events: [sampleRawFreeExhibition] });
    const event = result[0];

    assertValidPrice(event.price);
    expect(event.price.type).toBe("free");
    expect(event.tags).toContain("free");
  });

  test("should normalize paid price correctly", () => {
    const result = normalizeEvents({ events: [sampleRawConcert] });
    const event = result[0];

    assertValidPrice(event.price);
    expect(event.price.type).toBe("paid");
    expect(event.price.currency).toBe("EUR");
  });

  test("should convert 'open' to 'free' price type", () => {
    const rawEvent = { ...sampleRawFreeExhibition, price: "open" };
    const result = normalizeEvents({ events: [rawEvent] });

    expect(result[0].price.type).toBe("free");
  });

  test("should convert 'with-ticket' to 'paid' price type", () => {
    const rawEvent = { ...sampleRawConcert, price: "with-ticket" };
    const result = normalizeEvents({ events: [rawEvent] });

    expect(result[0].price.type).toBe("paid");
  });

  test("should combine date and time into ISO 8601 format", () => {
    const result = normalizeEvents({ events: [sampleRawConcert] });
    const event = result[0];

    assertValidISO8601(event.startDate);
    expect(event.startDate).toContain(sampleRawConcert.date);
    expect(event.startDate).toContain(sampleRawConcert.time);
  });

  test("should use default time when no time specified", () => {
    const result = normalizeEvents({ events: [sampleRawNoTime] });
    const event = result[0];

    assertValidISO8601(event.startDate);
    expect(event.startDate).toContain("20:00"); // Default time
  });

  test("should include Athens timezone offset (+03:00)", () => {
    const result = normalizeEvents({ events: [sampleRawConcert] });
    const event = result[0];

    expect(event.startDate).toContain("+03:00");
  });

  test("should preserve genre information", () => {
    const result = normalizeEvents({ events: [sampleRawConcert] });
    const event = result[0];

    expect(event.genres).toContain(sampleRawConcert.genre);
  });

  test("should handle empty genre", () => {
    const result = normalizeEvents({ events: [sampleRawTheater] });
    const event = result[0];

    expect(event.genres).toBeArray();
    expect(event.genres.length).toBeGreaterThanOrEqual(0);
  });

  test("should preserve source information", () => {
    const result = normalizeEvents({ events: [sampleRawConcert] });
    const event = result[0];

    expect(event.source).toBe(sampleRawConcert.source);
  });

  test("should set language to 'en'", () => {
    const result = normalizeEvents({ events: [sampleRawConcert] });
    const event = result[0];

    expect(event.language).toBe("en");
  });

  test("should set createdAt and updatedAt timestamps", () => {
    const result = normalizeEvents({ events: [sampleRawConcert] });
    const event = result[0];

    expect(event.createdAt).toBeTruthy();
    expect(event.updatedAt).toBeTruthy();
    expect(new Date(event.createdAt).toString()).not.toBe("Invalid Date");
    expect(new Date(event.updatedAt).toString()).not.toBe("Invalid Date");
  });

  test("should handle Greek characters in title and venue", () => {
    const result = normalizeEvents({ events: [sampleRawGreek] });
    const event = result[0];

    assertValidEvent(event);
    expect(event.title).toContain("Ελληνική");
    expect(event.venue.name).toContain("Μουσικής");
  });

  test("should generate unique IDs for events with same title but different dates", () => {
    const event1 = { ...sampleRawConcert, date: "2025-11-15" };
    const event2 = { ...sampleRawConcert, date: "2025-11-16" };
    const result = normalizeEvents({ events: [event1, event2] });

    expect(result[0].id).not.toBe(result[1].id);
    expect(result[0].id).toContain("2025-11-15");
    expect(result[1].id).toContain("2025-11-16");
  });

  test("should include Schema.org context", () => {
    const result = normalizeEvents({ events: [sampleRawConcert] });
    const event = result[0];

    expect(event["@context"]).toBe("https://schema.org");
    expect(event["@type"]).toBeTruthy();
  });

  test("should map event types to correct Schema.org types", () => {
    const mappings = [
      { raw: sampleRawConcert, expectedType: "MusicEvent" },
      { raw: sampleRawFreeExhibition, expectedType: "ExhibitionEvent" },
      { raw: sampleRawWorkshop, expectedType: "EducationEvent" }
    ];

    mappings.forEach(({ raw, expectedType }) => {
      const result = normalizeEvents({ events: [raw] });
      expect(result[0]["@type"]).toBe(expectedType);
    });
  });

  test("should normalize batch of different event types", () => {
    const result = normalizeEvents({
      events: [
        sampleRawConcert,
        sampleRawFreeExhibition,
        sampleRawTheater,
        sampleRawWorkshop
      ]
    });

    expect(result).toBeArrayOfSize(4);
    result.forEach(event => {
      assertValidEvent(event);
      assertValidVenue(event.venue);
      assertValidPrice(event.price);
    });
  });
});
