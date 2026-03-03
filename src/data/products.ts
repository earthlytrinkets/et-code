export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  shortDescription: string;
  category: "jewellery" | "paperweights" | "home-decor" | "custom-pieces";
  categoryLabel: string;
  images: string[];
  materials: string[];
  careInstructions: string[];
  rating: number;
  reviewCount: number;
  inStock: boolean;
  featured: boolean;
  isNew: boolean;
}

export const categories = [
  { id: "jewellery", label: "Jewellery", description: "Handcrafted resin pieces you can wear" },
  { id: "paperweights", label: "Paperweights", description: "Nature preserved on your desk" },
  { id: "home-decor", label: "Home Decor", description: "Bring nature indoors" },
  { id: "custom-pieces", label: "Custom Pieces", description: "Your memories, preserved forever" },
] as const;

export const products: Product[] = [
  {
    id: "1",
    name: "Lavender Dream Pendant",
    price: 1299,
    originalPrice: 1599,
    description: "A delicate pendant featuring real dried lavender flowers preserved in crystal-clear epoxy resin. Each piece captures the gentle beauty of nature, making it a unique wearable work of art. The silver-plated chain complements the organic beauty of the preserved botanicals.",
    shortDescription: "Real lavender preserved in crystal-clear resin",
    category: "jewellery",
    categoryLabel: "Jewellery",
    images: ["/product-1"],
    materials: ["Epoxy resin", "Dried lavender", "Silver-plated chain", "Hypoallergenic findings"],
    careInstructions: ["Avoid prolonged sun exposure", "Keep away from harsh chemicals", "Store in a cool, dry place", "Clean gently with a soft cloth"],
    rating: 4.8,
    reviewCount: 24,
    inStock: true,
    featured: true,
    isNew: false,
  },
  {
    id: "2",
    name: "Fern & Bloom Earrings",
    price: 999,
    description: "Teardrop-shaped earrings featuring tiny fern fronds and baby's breath flowers. Lightweight and comfortable for all-day wear, these earrings bring a touch of the forest to your everyday style.",
    shortDescription: "Fern fronds & baby's breath in teardrop resin",
    category: "jewellery",
    categoryLabel: "Jewellery",
    images: ["/product-2"],
    materials: ["Epoxy resin", "Dried fern", "Baby's breath", "Sterling silver hooks"],
    careInstructions: ["Avoid prolonged sun exposure", "Remove before swimming", "Store flat to prevent bending"],
    rating: 4.9,
    reviewCount: 31,
    inStock: true,
    featured: true,
    isNew: true,
  },
  {
    id: "3",
    name: "Dandelion Wish Paperweight",
    price: 1899,
    description: "A complete dandelion seed head frozen in time within a crystal-clear resin dome. This stunning paperweight captures the magical moment before a wish is made, bringing wonder to your workspace.",
    shortDescription: "Real dandelion preserved in a crystal dome",
    category: "paperweights",
    categoryLabel: "Paperweights",
    images: ["/product-3"],
    materials: ["Epoxy resin", "Real dandelion seed head", "Polished base"],
    careInstructions: ["Keep out of direct sunlight", "Dust with a soft cloth", "Avoid dropping on hard surfaces"],
    rating: 4.7,
    reviewCount: 18,
    inStock: true,
    featured: true,
    isNew: false,
  },
  {
    id: "4",
    name: "Rose Petal Ring",
    price: 899,
    description: "An elegant ring featuring real pressed rose petals suspended in crystal-clear resin. Each ring is one-of-a-kind, with the natural variations in the petals ensuring no two pieces are alike.",
    shortDescription: "Real rose petals in a minimal resin ring",
    category: "jewellery",
    categoryLabel: "Jewellery",
    images: ["/product-4"],
    materials: ["Epoxy resin", "Pressed rose petals", "Adjustable band"],
    careInstructions: ["Remove before washing hands", "Avoid perfumes and lotions", "Store in provided pouch"],
    rating: 4.6,
    reviewCount: 15,
    inStock: true,
    featured: false,
    isNew: true,
  },
  {
    id: "5",
    name: "Botanical Coaster Set",
    price: 2499,
    description: "A set of four handcrafted coasters, each featuring a unique arrangement of dried flowers and gold leaf flakes preserved in resin. Functional art for your home.",
    shortDescription: "Set of 4 floral resin coasters with gold leaf",
    category: "home-decor",
    categoryLabel: "Home Decor",
    images: ["/product-5"],
    materials: ["Epoxy resin", "Dried flowers", "Gold leaf flakes", "Cork backing"],
    careInstructions: ["Wipe clean with damp cloth", "Avoid extreme heat", "Use on flat surfaces"],
    rating: 4.9,
    reviewCount: 42,
    inStock: true,
    featured: true,
    isNew: false,
  },
  {
    id: "6",
    name: "Wildflower Charm Bracelet",
    price: 1499,
    description: "A delicate silver chain bracelet adorned with multiple resin charms, each containing tiny dried wildflowers. A garden for your wrist.",
    shortDescription: "Silver chain with wildflower resin charms",
    category: "jewellery",
    categoryLabel: "Jewellery",
    images: ["/product-6"],
    materials: ["Epoxy resin", "Dried wildflowers", "Sterling silver chain", "Lobster clasp"],
    careInstructions: ["Remove before showering", "Store in jewelry box", "Avoid contact with perfume"],
    rating: 4.8,
    reviewCount: 27,
    inStock: true,
    featured: false,
    isNew: false,
  },
];
