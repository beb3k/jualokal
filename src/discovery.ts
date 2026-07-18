export const APPROVED_DISCOVERY_CATEGORIES = [
  "Clothing",
  "Accessories",
  "Small electronics",
  "Books",
  "Toys",
  "Hobby equipment",
  "Portable household goods",
] as const;

export const DISCOVERY_CATEGORIES = [
  "All",
  ...APPROVED_DISCOVERY_CATEGORIES,
] as const;

export type ApprovedDiscoveryCategory =
  (typeof APPROVED_DISCOVERY_CATEGORIES)[number];
export type DiscoveryCategory = (typeof DISCOVERY_CATEGORIES)[number];
export type DistanceBand = "Under 1 km" | "1-2 km";

export type DiscoveryViewer = {
  id: string;
  verified: boolean;
  locationAvailable: boolean;
};

export type DiscoveryListing = {
  id: string;
  sellerId: string;
  category: string;
  distanceKm: number;
  originalPublicationTimeMs: number;
  status: string;
  sellerAvailable: boolean;
};

export type DiscoveryResult = {
  listingId: string;
  category: ApprovedDiscoveryCategory;
  distanceBand: DistanceBand;
};

export type SellerDiscoveryMarker = {
  sellerId: string;
  listingCount: number;
  stableMarkerKey: string;
  offsetXKm: number;
  offsetYKm: number;
};

export type SellerMarkerProjection = {
  stableMarkerKey: string;
  offsetXKm: number;
  offsetYKm: number;
  frameKm: 2 | 3;
};

type CreateSellerDiscoveryMarkerInput = {
  sellerId: string;
  homeAnchorVersion: string;
  sellerListingIds: readonly string[];
  discoveryResults: readonly DiscoveryResult[];
};

function stableFraction(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

export function getSellerMarkerInitials(publicName: string) {
  return publicName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.replace(/[^\p{L}\p{N}]/gu, "").charAt(0))
    .join("")
    .toUpperCase();
}

export function createSellerDiscoveryMarker({
  sellerId,
  homeAnchorVersion,
  sellerListingIds,
  discoveryResults,
}: CreateSellerDiscoveryMarkerInput): SellerDiscoveryMarker | null {
  const sellerListingIdSet = new Set(sellerListingIds);
  const listingCount = discoveryResults.filter((result) =>
    sellerListingIdSet.has(result.listingId),
  ).length;
  if (listingCount === 0) return null;

  const seed = `${sellerId}:${homeAnchorVersion}`;
  const angle = stableFraction(`${seed}:angle`) * Math.PI * 2;
  const radiusKm = 0.35 + stableFraction(`${seed}:radius`) * 0.55;

  return {
    sellerId,
    listingCount,
    stableMarkerKey: seed,
    offsetXKm: Math.cos(angle) * radiusKm,
    offsetYKm: Math.sin(angle) * radiusKm,
  };
}

export function projectSellerDiscoveryMarker(
  marker: SellerDiscoveryMarker,
  homeDistanceKm: number,
): SellerMarkerProjection {
  const anchorOffsetKm = Math.hypot(marker.offsetXKm, marker.offsetYKm);
  const directionX = marker.offsetXKm / anchorOffsetKm;
  const directionY = marker.offsetYKm / anchorOffsetKm;
  const markerDistanceKm = Math.max(0, Math.min(2, homeDistanceKm)) + anchorOffsetKm;

  return {
    stableMarkerKey: marker.stableMarkerKey,
    offsetXKm: directionX * markerDistanceKm,
    offsetYKm: directionY * markerDistanceKm,
    frameKm: markerDistanceKm > 2 ? 3 : 2,
  };
}

type DiscoverListingsInput = {
  viewer: DiscoveryViewer;
  listings: readonly DiscoveryListing[];
  category?: DiscoveryCategory;
};

const isApprovedCategory = (
  category: string,
): category is ApprovedDiscoveryCategory =>
  APPROVED_DISCOVERY_CATEGORIES.some((approved) => approved === category);

export function discoverListings({
  viewer,
  listings,
  category = "All",
}: DiscoverListingsInput): DiscoveryResult[] {
  if (!viewer.verified || !viewer.locationAvailable) return [];

  return listings
    .filter(
      (listing) =>
        listing.status === "active" &&
        listing.sellerAvailable &&
        listing.sellerId !== viewer.id &&
        listing.distanceKm >= 0 &&
        listing.distanceKm <= 2 &&
        isApprovedCategory(listing.category) &&
        (category === "All" || listing.category === category),
    )
    .map((listing) => ({
      listing,
      distanceBand: (listing.distanceKm < 1 ? "Under 1 km" : "1-2 km") as DistanceBand,
    }))
    .sort((left, right) => {
      if (left.distanceBand !== right.distanceBand) {
        return left.distanceBand === "Under 1 km" ? -1 : 1;
      }

      const publicationOrder =
        right.listing.originalPublicationTimeMs - left.listing.originalPublicationTimeMs;
      if (publicationOrder !== 0) return publicationOrder;

      if (left.listing.id === right.listing.id) return 0;
      return left.listing.id < right.listing.id ? -1 : 1;
    })
    .map(({ listing, distanceBand }) => ({
      listingId: listing.id,
      category: listing.category as ApprovedDiscoveryCategory,
      distanceBand,
    }));
}
