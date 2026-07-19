import { expect, test } from "@playwright/test";
import {
  createSellerMapMarkers,
  DISCOVERY_CATEGORIES,
  classifyDiscoveryOutcome,
  discoverListings,
  type DiscoveryListing,
  type ProjectedSellerMarker,
  type SellerMarkerGroupDefinition,
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

test("discovery outcomes keep failures and empty results semantically distinct", () => {
  expect(
    classifyDiscoveryOutcome({
      location: "denied",
      discoverySucceeded: false,
      category: "All",
      resultCount: 0,
    }),
  ).toEqual({ kind: "location-denied" });
  expect(
    classifyDiscoveryOutcome({
      location: "unavailable",
      discoverySucceeded: false,
      category: "All",
      resultCount: 0,
    }),
  ).toEqual({ kind: "location-unavailable" });
  expect(
    classifyDiscoveryOutcome({
      location: "stale",
      discoverySucceeded: true,
      category: "All",
      resultCount: 4,
    }),
  ).toEqual({ kind: "stale-location" });
  expect(
    classifyDiscoveryOutcome({
      location: "valid",
      discoverySucceeded: false,
      category: "All",
      resultCount: 0,
    }),
  ).toEqual({ kind: "discovery-failure" });
  expect(
    classifyDiscoveryOutcome({
      location: "valid",
      discoverySucceeded: true,
      category: "Books",
      resultCount: 0,
    }),
  ).toEqual({ kind: "category-empty", category: "Books" });
  expect(
    classifyDiscoveryOutcome({
      location: "valid",
      discoverySucceeded: true,
      category: "All",
      resultCount: 0,
    }),
  ).toEqual({ kind: "nearby-empty" });
  expect(
    classifyDiscoveryOutcome({
      location: "valid",
      discoverySucceeded: true,
      category: "All",
      resultCount: 3,
    }),
  ).toEqual({ kind: "results", resultCount: 3 });
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

test("one Seller marker is stable, anchor-dependent, and cannot alter discovery", async () => {
  const { createSellerDiscoveryMarker } = await import("../src/discovery");
  const results = discoverListings({
    viewer: eligibleViewer,
    listings: [
      activeListing({ id: "seller-one-a" }),
      activeListing({ id: "seller-one-b", distanceKm: 1.2 }),
      activeListing({ id: "other-seller", sellerId: "seller-2" }),
    ],
  });
  const originalResults = structuredClone(results);

  const first = createSellerDiscoveryMarker({
    sellerId: "seller-1",
    homeAnchorVersion: "fictional-anchor-v1",
    sellerListingIds: ["seller-one-a", "seller-one-b"],
    discoveryResults: results,
  });
  const repeat = createSellerDiscoveryMarker({
    sellerId: "seller-1",
    homeAnchorVersion: "fictional-anchor-v1",
    sellerListingIds: ["seller-one-a", "seller-one-b"],
    discoveryResults: results,
  });
  const movedAnchor = createSellerDiscoveryMarker({
    sellerId: "seller-1",
    homeAnchorVersion: "fictional-anchor-v2",
    sellerListingIds: ["seller-one-a", "seller-one-b"],
    discoveryResults: results,
  });

  expect(first).toEqual(repeat);
  expect(first).toMatchObject({ sellerId: "seller-1", listingCount: 2 });
  expect(movedAnchor).not.toEqual(first);
  expect(Math.hypot(first!.offsetXKm, first!.offsetYKm)).toBeLessThanOrEqual(1);
  expect(results).toEqual(originalResults);
});

test("a Seller without filtered Discoverable Listings has no marker", async () => {
  const { createSellerDiscoveryMarker } = await import("../src/discovery");

  expect(
    createSellerDiscoveryMarker({
      sellerId: "seller-absent",
      homeAnchorVersion: "fictional-anchor-v1",
      sellerListingIds: [],
      discoveryResults: discoverListings({
        viewer: eligibleViewer,
        listings: [activeListing()],
      }),
    }),
  ).toBeNull();
});

test("marker projection keeps one stable point while framing each buyer snapshot", async () => {
  const { createSellerDiscoveryMarker, projectSellerDiscoveryMarker } = await import(
    "../src/discovery"
  );
  const marker = createSellerDiscoveryMarker({
    sellerId: "seller-1",
    homeAnchorVersion: "fictional-anchor-v1",
    sellerListingIds: ["seller-one"],
    discoveryResults: discoverListings({
      viewer: eligibleViewer,
      listings: [activeListing({ id: "seller-one" })],
    }),
  });

  expect(marker).not.toBeNull();
  const nearby = projectSellerDiscoveryMarker(marker!, 0.85);
  const edge = projectSellerDiscoveryMarker(marker!, 2);

  expect(nearby.stableMarkerKey).toBe(edge.stableMarkerKey);
  expect(nearby).not.toMatchObject({ offsetXKm: edge.offsetXKm, offsetYKm: edge.offsetYKm });
  expect(nearby.frameKm).toBe(2);
  expect(edge.frameKm).toBe(3);
});

test("Seller marker initials support mononymous and verified-last-initial identities", async () => {
  const { getSellerMarkerInitials } = await import("../src/discovery");

  expect(getSellerMarkerInitials("Sukarno")).toBe("S");
  expect(getSellerMarkerInitials("Dimas P.")).toBe("DP");
});

test("Seller groups preserve coarse positions and separate only eligible groups", () => {
  const markers: ProjectedSellerMarker[] = [
    {
      marker: {
        sellerId: "seller-a",
        listingCount: 2,
        stableMarkerKey: "seller-a:anchor",
        offsetXKm: 0.2,
        offsetYKm: 0.3,
      },
      projection: {
        stableMarkerKey: "seller-a:anchor",
        offsetXKm: 0.6,
        offsetYKm: 0.7,
        frameKm: 2,
      },
    },
    {
      marker: {
        sellerId: "seller-b",
        listingCount: 1,
        stableMarkerKey: "seller-b:anchor",
        offsetXKm: 0.4,
        offsetYKm: 0.5,
      },
      projection: {
        stableMarkerKey: "seller-b:anchor",
        offsetXKm: 0.8,
        offsetYKm: 0.9,
        frameKm: 2,
      },
    },
  ];
  const groups: SellerMarkerGroupDefinition[] = [{
    id: "shared-coarse-area",
    separation: "separable",
    sellerIds: ["seller-a", "seller-b"],
  }];

  const grouped = createSellerMapMarkers({
    markers,
    groups,
    expandedGroupId: null,
  });
  expect(grouped).toEqual([{
    kind: "group",
    groupId: "shared-coarse-area",
    separation: "separable",
    sellerIds: ["seller-a", "seller-b"],
    sellerCount: 2,
    projection: {
      stableMarkerKey: "shared-coarse-area:seller-a:seller-b",
      offsetXKm: 0.7,
      offsetYKm: 0.8,
      frameKm: 2,
    },
  }]);

  const expanded = createSellerMapMarkers({
    markers,
    groups,
    expandedGroupId: "shared-coarse-area",
  });
  expect(expanded).toEqual([
    { kind: "individual", ...markers[0] },
    { kind: "individual", ...markers[1] },
  ]);
});

test("filtering a Seller group to one member returns the original individual marker", () => {
  const onlyVisibleMarker: ProjectedSellerMarker = {
    marker: {
      sellerId: "seller-a",
      listingCount: 1,
      stableMarkerKey: "seller-a:anchor",
      offsetXKm: 0.2,
      offsetYKm: 0.3,
    },
    projection: {
      stableMarkerKey: "seller-a:anchor",
      offsetXKm: 0.6,
      offsetYKm: 0.7,
      frameKm: 2,
    },
  };

  expect(createSellerMapMarkers({
    markers: [onlyVisibleMarker],
    groups: [{
      id: "shared-coarse-area",
      separation: "inseparable",
      sellerIds: ["seller-a", "seller-b"],
    }],
    expandedGroupId: null,
  })).toEqual([{ kind: "individual", ...onlyVisibleMarker }]);
});
