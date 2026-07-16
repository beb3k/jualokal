export const demoBuyers = [
  {
    id: "buyer-ayu",
    publicName: "Ayu R.",
    initials: "AR",
    tier: "Verified Buyer",
    activePurchaseLimit: 1,
    successfulHandovers: 0,
    differentPartners: 0,
    identityStatus: "Simulated as verified",
    history:
      "Fictional starting history: 0 successful handovers with 0 different Demo Sellers. This supports the simulated Verified Buyer tier.",
  },
  {
    id: "buyer-naufal",
    publicName: "Naufal S.",
    initials: "NS",
    tier: "Reliable Buyer",
    activePurchaseLimit: 3,
    successfulHandovers: 3,
    differentPartners: 3,
    identityStatus: "Simulated as verified",
    history:
      "Fictional history: 3 successful handovers with 3 different Demo Sellers and no simulated eligibility blockers. This supports the simulated Reliable Buyer tier.",
  },
  {
    id: "buyer-lestari",
    publicName: "Lestari W.",
    initials: "LW",
    tier: "Trusted Buyer",
    activePurchaseLimit: 5,
    successfulHandovers: 5,
    differentPartners: 5,
    identityStatus: "Simulated as verified",
    history:
      "Fictional history: 5 successful handovers with 5 different Demo Sellers and no simulated eligibility blockers. This supports the simulated Trusted Buyer tier.",
  },
] as const;

export const demoSellers = [
  {
    id: "seller-dimas",
    publicName: "Dimas P.",
    initials: "DP",
    handovers: "12 fictional handovers",
    identityStatus: "Simulated as verified",
    activationStatus: "Seller Activation complete - simulated",
  },
  {
    id: "seller-sari",
    publicName: "Sari N.",
    initials: "SN",
    handovers: "8 fictional handovers",
    identityStatus: "Simulated as verified",
    activationStatus: "Seller Activation complete - simulated",
  },
  {
    id: "seller-bima",
    publicName: "Bima A.",
    initials: "BA",
    handovers: "6 fictional handovers",
    identityStatus: "Simulated as verified",
    activationStatus: "Seller Activation complete - simulated",
  },
  {
    id: "seller-rani",
    publicName: "Rani K.",
    initials: "RK",
    handovers: "10 fictional handovers",
    identityStatus: "Simulated as verified",
    activationStatus: "Seller Activation complete - simulated",
  },
  {
    id: "seller-wawan",
    publicName: "Wawan H.",
    initials: "WH",
    handovers: "4 fictional handovers",
    identityStatus: "Simulated as verified",
    activationStatus: "Seller Activation complete - simulated",
  },
] as const;

export type DemoListingSeed = {
  id: string;
  sellerId: (typeof demoSellers)[number]["id"];
  title: string;
  category:
    | "Clothing"
    | "Accessories"
    | "Small electronics"
    | "Books"
    | "Toys"
    | "Hobby equipment"
    | "Portable household goods";
  condition: "Like New" | "Very Good" | "Good" | "Fair" | "Needs Repair";
  price: number;
  distanceKm: number;
  handoverTime: string;
  description: string;
  conditionDisclosure: string;
  specifications: string;
  imageLabel: string;
};

export const demoListings: DemoListingSeed[] = [
  {
    id: "listing-01", sellerId: "seller-dimas", title: "Handwoven rattan market basket",
    category: "Portable household goods", condition: "Good", price: 185000, distanceKm: 0.85,
    handoverTime: "17:30 WIB", description: "A lightweight secondhand Pasar Cihapit basket with a sturdy handle.",
    conditionDisclosure: "Light surface wear near the rim; the handle is secure.",
    specifications: "42 cm wide x 30 cm high; approximately 650 g.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-02", sellerId: "seller-dimas", title: "Batik cotton overshirt",
    category: "Clothing", condition: "Very Good", price: 145000, distanceKm: 0.55,
    handoverTime: "18:15 WIB", description: "A breathable batik overshirt made in Pekalongan.",
    conditionDisclosure: "Minor fading at the inner collar; no tears or missing buttons.",
    specifications: "Chest 108 cm; length 72 cm; 240 g.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-03", sellerId: "seller-dimas", title: "Mini angklung set",
    category: "Hobby equipment", condition: "Fair", price: 120000, distanceKm: 1.35,
    handoverTime: "16:45 WIB", description: "A five-note bamboo angklung set for home practice.",
    conditionDisclosure: "Two frames have cosmetic scratches; every tube sounds clearly.",
    specifications: "Five pieces; tallest frame 48 cm; 1.1 kg total.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-04", sellerId: "seller-dimas", title: "Ceramic sambal bowls",
    category: "Portable household goods", condition: "Like New", price: 90000, distanceKm: 1.8,
    handoverTime: "19:00 WIB", description: "Four small glazed bowls for sambal and side dishes.",
    conditionDisclosure: "No chips or cracks; used twice.",
    specifications: "Four bowls; 9 cm diameter each; 720 g total.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-05", sellerId: "seller-dimas", title: "Pocket guide to Bandung architecture",
    category: "Books", condition: "Needs Repair", price: 35000, distanceKm: 2.35,
    handoverTime: "15:30 WIB", description: "An illustrated walking guide to Bandung landmarks.",
    conditionDisclosure: "The cover is detached and two pages have taped edges; all pages remain readable.",
    specifications: "Indonesian language; 184 pages; 14 cm x 20 cm.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-06", sellerId: "seller-sari", title: "Woven pandan tote",
    category: "Accessories", condition: "Like New", price: 160000, distanceKm: 0.4,
    handoverTime: "10:30 WIB", description: "A structured pandan tote from Tasikmalaya.",
    conditionDisclosure: "No known defects; carried once.",
    specifications: "38 cm x 30 cm; handle drop 24 cm; 480 g.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-07", sellerId: "seller-sari", title: "Children's wayang puzzle",
    category: "Toys", condition: "Very Good", price: 75000, distanceKm: 0.95,
    handoverTime: "14:00 WIB", description: "A wooden 24-piece wayang character puzzle.",
    conditionDisclosure: "Small paint rub on one corner; all pieces included.",
    specifications: "24 pieces; board 30 cm x 22 cm; ages 4+.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-08", sellerId: "seller-sari", title: "USB desk fan",
    category: "Small electronics", condition: "Good", price: 110000, distanceKm: 1.45,
    handoverTime: "11:45 WIB", description: "A quiet compact fan for a study desk.",
    conditionDisclosure: "Light scuff on the base; both speed settings work.",
    specifications: "22 cm high; USB-A cable 1.2 m; 620 g.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-09", sellerId: "seller-sari", title: "Indonesian recipe notebook",
    category: "Books", condition: "Fair", price: 45000, distanceKm: 1.9,
    handoverTime: "13:15 WIB", description: "A printed notebook of everyday Nusantara recipes.",
    conditionDisclosure: "Several pages have pencil notes and the spine is creased.",
    specifications: "160 pages; 18 cm x 24 cm; Indonesian language.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-10", sellerId: "seller-sari", title: "Compact sewing kit",
    category: "Hobby equipment", condition: "Needs Repair", price: 50000, distanceKm: 2.55,
    handoverTime: "16:00 WIB", description: "A portable sewing kit with thread, needles, and scissors.",
    conditionDisclosure: "The case zipper sticks and two thread spools are partly used.",
    specifications: "Case 20 cm x 14 cm; 32 included pieces; 390 g.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-11", sellerId: "seller-bima", title: "Canvas futsal shoe bag",
    category: "Accessories", condition: "Good", price: 85000, distanceKm: 0.65,
    handoverTime: "20:00 WIB", description: "A ventilated canvas bag sized for futsal shoes.",
    conditionDisclosure: "Minor marks underneath; zipper and carry loop are secure.",
    specifications: "34 cm x 18 cm x 14 cm; 280 g.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-12", sellerId: "seller-bima", title: "Foldable badminton net",
    category: "Hobby equipment", condition: "Like New", price: 240000, distanceKm: 1.1,
    handoverTime: "08:30 WIB", description: "A portable net for a courtyard badminton game.",
    conditionDisclosure: "No known defects; assembled once indoors.",
    specifications: "Net 3 m x 1.5 m; packed length 68 cm; 1.8 kg.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-13", sellerId: "seller-bima", title: "Rechargeable bicycle light",
    category: "Small electronics", condition: "Very Good", price: 135000, distanceKm: 1.6,
    handoverTime: "18:45 WIB", description: "A front bicycle light with three brightness modes.",
    conditionDisclosure: "Rubber mount shows light wear; battery and charging work.",
    specifications: "USB-C charging; 110 g; mount fits 22-32 mm bars.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-14", sellerId: "seller-bima", title: "Persib supporter scarf",
    category: "Clothing", condition: "Fair", price: 70000, distanceKm: 1.95,
    handoverTime: "19:30 WIB", description: "A blue knitted football supporter scarf.",
    conditionDisclosure: "One tassel is missing and the lettering has light pilling.",
    specifications: "Length 145 cm; width 18 cm; 190 g.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-15", sellerId: "seller-bima", title: "Wooden congklak board",
    category: "Toys", condition: "Needs Repair", price: 95000, distanceKm: 2.25,
    handoverTime: "09:45 WIB", description: "A carved wooden congklak board with shells.",
    conditionDisclosure: "One end has a stable hairline crack; three shells are replacements.",
    specifications: "Board 48 cm x 15 cm; 98 shells included; 1.4 kg.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-16", sellerId: "seller-rani", title: "Lurik table runner",
    category: "Portable household goods", condition: "Very Good", price: 125000, distanceKm: 0.5,
    handoverTime: "12:30 WIB", description: "A handwoven lurik runner for a dining table.",
    conditionDisclosure: "One faint tea mark near an end; stitching is intact.",
    specifications: "160 cm x 35 cm; cotton; 320 g.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-17", sellerId: "seller-rani", title: "Silver-tone kebaya brooch",
    category: "Accessories", condition: "Good", price: 105000, distanceKm: 0.9,
    handoverTime: "15:00 WIB", description: "A floral brooch for a kebaya or scarf.",
    conditionDisclosure: "Light tarnish on the back; clasp closes securely.",
    specifications: "6 cm wide; 28 g; synthetic stones.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-18", sellerId: "seller-rani", title: "Illustrated Indonesian folktales",
    category: "Books", condition: "Like New", price: 80000, distanceKm: 1.3,
    handoverTime: "17:00 WIB", description: "A hardback collection of regional folktales.",
    conditionDisclosure: "No known defects; clean pages and firm binding.",
    specifications: "Indonesian language; 128 pages; 22 cm x 28 cm.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-19", sellerId: "seller-rani", title: "Rattan doll cradle",
    category: "Toys", condition: "Fair", price: 140000, distanceKm: 1.85,
    handoverTime: "10:00 WIB", description: "A small rattan cradle for dolls and soft toys.",
    conditionDisclosure: "Several fibres are frayed but the frame remains stable.",
    specifications: "52 cm x 28 cm x 24 cm; 1.2 kg.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-20", sellerId: "seller-rani", title: "Clip-on reading lamp",
    category: "Small electronics", condition: "Needs Repair", price: 60000, distanceKm: 2.7,
    handoverTime: "20:30 WIB", description: "A flexible rechargeable lamp for books or a desk.",
    conditionDisclosure: "The low setting flickers; medium and high settings work normally.",
    specifications: "USB-C charging; neck length 28 cm; 160 g.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-21", sellerId: "seller-wawan", title: "Denim chore jacket",
    category: "Clothing", condition: "Fair", price: 190000, distanceKm: 0.75,
    handoverTime: "18:00 WIB", description: "A sturdy indigo chore jacket for mild Bandung evenings.",
    conditionDisclosure: "Faded elbows and one repaired cuff; all buttons present.",
    specifications: "Chest 112 cm; length 70 cm; 780 g.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-22", sellerId: "seller-wawan", title: "Compact radio speaker",
    category: "Small electronics", condition: "Good", price: 155000, distanceKm: 1.0,
    handoverTime: "07:30 WIB", description: "A rechargeable FM radio and Bluetooth speaker.",
    conditionDisclosure: "Antenna has scratches; radio, speaker, and charging work.",
    specifications: "18 cm x 9 cm x 7 cm; USB-C; 540 g.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-23", sellerId: "seller-wawan", title: "Leather camera strap",
    category: "Accessories", condition: "Like New", price: 175000, distanceKm: 1.4,
    handoverTime: "09:00 WIB", description: "An adjustable brown leather strap for a compact camera.",
    conditionDisclosure: "No known defects; fitted once and stored.",
    specifications: "Adjusts 90-130 cm; strap width 2.5 cm; 120 g.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-24", sellerId: "seller-wawan", title: "Watercolour travel palette",
    category: "Hobby equipment", condition: "Very Good", price: 130000, distanceKm: 1.7,
    handoverTime: "16:30 WIB", description: "A pocket metal palette with twelve artist colours.",
    conditionDisclosure: "Three colour pans are partly used; tin closes firmly.",
    specifications: "12 half pans; tin 12 cm x 7 cm; 210 g.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
  {
    id: "listing-25", sellerId: "seller-wawan", title: "Bamboo laundry basket",
    category: "Portable household goods", condition: "Needs Repair", price: 115000, distanceKm: 2.4,
    handoverTime: "11:00 WIB", description: "A lightweight folding bamboo basket for laundry.",
    conditionDisclosure: "One hinge pin is loose and needs replacement; woven panels are intact.",
    specifications: "58 cm x 38 cm x 32 cm open; 1.9 kg.",
    imageLabel: "Synthetic fallback - simulated item image",
  },
];

export const demoBuyer = demoBuyers[0];
export const demoSeller = demoSellers[0];
export const demoListing = {
  ...demoListings[0],
  price: "Rp 185.000",
  distance: "850 m away",
} as const;
