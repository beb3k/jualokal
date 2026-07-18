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
