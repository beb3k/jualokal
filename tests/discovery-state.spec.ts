import { expect, test } from "@playwright/test";
import {
  DISCOVERY_CATEGORIES,
  discoverListings,
  type DiscoveryListing,
} from "../src/discovery";

const activeListing = (
  overrides: Partial<DiscoveryListing> = {},
): DiscoveryListing => ({
  id: "listing-1",
  sellerId: "seller-1",
  category: "Books",
  distanceKm: 0.5,
  originalPublicationTimeMs: 1_000,
  status: "active",
  sellerAvailable: true,
  ...overrides,
});

const eligibleViewer = {
  id: "buyer-1",
  verified: true,
  locationAvailable: true,
};

test("discovery offers All and the seven approved listing categories", () => {
  expect(DISCOVERY_CATEGORIES).toEqual([
    "All",
    "Clothing",
    "Accessories",
    "Small electronics",
    "Books",
    "Toys",
    "Hobby equipment",
    "Portable household goods",
  ]);
});

test("discovery requires both verified membership and an available browsing location", () => {
  const listings = [activeListing()];

  expect(
    discoverListings({
      viewer: { ...eligibleViewer, verified: false },
      listings,
    }),
  ).toEqual([]);
  expect(
    discoverListings({
      viewer: { ...eligibleViewer, locationAvailable: false },
      listings,
    }),
  ).toEqual([]);
});

test("discovery includes the 2 km boundary and exposes only privacy-safe distance bands", () => {
  const results = discoverListings({
    viewer: eligibleViewer,
    listings: [
      activeListing({ id: "under", distanceKm: 0.999 }),
      activeListing({ id: "one", distanceKm: 1 }),
      activeListing({ id: "boundary", distanceKm: 2 }),
      activeListing({ id: "outside", distanceKm: 2.001 }),
    ],
  });

  expect(results).toEqual([
    { listingId: "under", category: "Books", distanceBand: "Under 1 km" },
    { listingId: "boundary", category: "Books", distanceBand: "1-2 km" },
    { listingId: "one", category: "Books", distanceBand: "1-2 km" },
  ]);
  expect(JSON.stringify(results)).not.toContain("0.999");
  expect(JSON.stringify(results)).not.toContain("2.001");
});

test("discovery excludes the viewer's listings and every unavailable listing", () => {
  const results = discoverListings({
    viewer: eligibleViewer,
    listings: [
      activeListing({ id: "visible" }),
      activeListing({ id: "owned", sellerId: "buyer-1" }),
      activeListing({ id: "paused", status: "paused" }),
      activeListing({ id: "removed", status: "removed" }),
      activeListing({ id: "seller-away", sellerAvailable: false }),
    ],
  });

  expect(results).toEqual([
    { listingId: "visible", category: "Books", distanceBand: "Under 1 km" },
  ]);
});

test("one approved category can filter discovery while All keeps every category", () => {
  const listings = [
    activeListing({ id: "book", category: "Books" }),
    activeListing({ id: "toy", category: "Toys" }),
  ];

  expect(
    discoverListings({ viewer: eligibleViewer, listings, category: "Toys" }),
  ).toEqual([
    { listingId: "toy", category: "Toys", distanceBand: "Under 1 km" },
  ]);
  expect(
    discoverListings({ viewer: eligibleViewer, listings, category: "All" }),
  ).toHaveLength(2);
});

test("discovery orders by band, then original publication time, then listing id", () => {
  const results = discoverListings({
    viewer: eligibleViewer,
    listings: [
      activeListing({ id: "far-new", distanceKm: 1.2, originalPublicationTimeMs: 9_000 }),
      activeListing({ id: "near-old", distanceKm: 0.4, originalPublicationTimeMs: 1_000 }),
      activeListing({ id: "near-b", distanceKm: 0.8, originalPublicationTimeMs: 5_000 }),
      activeListing({ id: "near-a", distanceKm: 0.7, originalPublicationTimeMs: 5_000 }),
    ],
  });

  expect(results.map((result) => result.listingId)).toEqual([
    "near-a",
    "near-b",
    "near-old",
    "far-new",
  ]);
});
