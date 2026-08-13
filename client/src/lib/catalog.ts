// Usamabhanbhro design system: original editorial commerce data with tactile product names, calm neutrals, and no legacy source identity.
export type ProductVariant = { label: string; value: string; available: boolean };

export type Product = {
  id: string;
  slug: string;
  name: string;
  price: number;
  category: string;
  collection: string;
  description: string;
  details: string[];
  images: string[];
  variants: ProductVariant[];
  tags: string[];
  availability: "in-stock" | "low-stock";
};

const image = (id: string, width = 1100) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;

export const products: Product[] = [
  {
    id: "p-001", slug: "meridian-frame-tote", name: "Meridian Frame Tote", price: 48500, category: "Bags", collection: "Signature",
    description: "A structured carryall with a quiet architectural profile, made for the long way through the week.",
    details: ["Vegetable-tanned leather", "Folded gusset construction", "Interior zip pocket"],
    images: [image("994523"), image("1488463"), image("1536619")],
    variants: [{ label: "Colour", value: "Cedar", available: true }, { label: "Colour", value: "Ink", available: true }], tags: ["best-seller", "leather"], availability: "in-stock",
  },
  {
    id: "p-002", slug: "arc-mini-bag", name: "Arc Mini Bag", price: 32800, category: "Bags", collection: "New Arrivals",
    description: "A compact shoulder bag softened by a curved top line and a brushed metal clasp.",
    details: ["Italian nappa leather", "Adjustable shoulder strap", "Cotton twill lining"],
    images: [image("1488463"), image("1755428"), image("298864")],
    variants: [{ label: "Colour", value: "Black", available: true }, { label: "Colour", value: "Oat", available: true }], tags: ["new", "everyday"], availability: "in-stock",
  },
  {
    id: "p-003", slug: "noor-silk-scarf", name: "Noor Silk Scarf", price: 11900, category: "Accessories", collection: "Essentials",
    description: "Hand-rolled silk twill printed with an abstract botanical study in warm studio tones.",
    details: ["100% silk twill", "Hand-rolled edge", "90 × 90 cm"],
    images: [image("1536619"), image("1755428"), image("1043474")],
    variants: [{ label: "Print", value: "Ochre Bloom", available: true }], tags: ["silk", "gift"], availability: "in-stock",
  },
  {
    id: "p-004", slug: "linea-chain-bracelet", name: "Linea Chain Bracelet", price: 14600, category: "Jewellery", collection: "Signature",
    description: "A fine linked bracelet with a soft reflective finish designed to layer without noise.",
    details: ["Gold-tone recycled brass", "Lobster clasp", "Adjustable length"],
    images: [image("1755428"), image("298864"), image("994523")],
    variants: [{ label: "Finish", value: "Soft Gold", available: true }, { label: "Finish", value: "Silver", available: false }], tags: ["jewellery", "layering"], availability: "low-stock",
  },
  {
    id: "p-005", slug: "studio-card-holder", name: "Studio Card Holder", price: 8900, category: "Accessories", collection: "Essentials",
    description: "A slim leather card case with four considered slots and a softly contrasting edge.",
    details: ["Grained leather", "Four card slots", "Made for daily carry"],
    images: [image("1043474"), image("994523"), image("1488463")],
    variants: [{ label: "Colour", value: "Cocoa", available: true }, { label: "Colour", value: "Stone", available: true }], tags: ["leather", "small-goods"], availability: "in-stock",
  },
  {
    id: "p-006", slug: "column-hoop-earrings", name: "Column Hoop Earrings", price: 13200, category: "Jewellery", collection: "New Arrivals",
    description: "Rounded hoops with a sculptural weight that catches a low afternoon light.",
    details: ["Recycled sterling silver", "Polished finish", "Post fastening"],
    images: [image("298864"), image("1043474"), image("1536619")],
    variants: [{ label: "Finish", value: "Polished Silver", available: true }], tags: ["jewellery", "new"], availability: "in-stock",
  },
  {
    id: "p-007", slug: "field-canvas-weekender", name: "Field Canvas Weekender", price: 41900, category: "Bags", collection: "Essentials",
    description: "A generous canvas weekender finished with leather handles and a considered internal system.",
    details: ["Waxed cotton canvas", "Full-grain leather trim", "Two-way zip"],
    images: [image("3054976"), image("994523"), image("1488463")],
    variants: [{ label: "Colour", value: "Moss", available: true }, { label: "Colour", value: "Ink", available: true }], tags: ["travel", "canvas"], availability: "in-stock",
  },
  {
    id: "p-008", slug: "still-wool-wrap", name: "Still Wool Wrap", price: 17800, category: "Accessories", collection: "New Arrivals",
    description: "A generous wool wrap with a soft brushed hand and an understated tonal border.",
    details: ["Merino wool blend", "Brushed finish", "Fringed edge"],
    images: [image("428338"), image("1536619"), image("1755428")],
    variants: [{ label: "Colour", value: "Sand", available: true }], tags: ["new", "winter"], availability: "in-stock",
  },
];

export const collections = [
  { slug: "new-arrivals", name: "New Arrivals", eyebrow: "The new edit", description: "Quietly expressive pieces shaped for the pace of now.", image: image("1536619", 1500) },
  { slug: "signature", name: "Signature", eyebrow: "The house codes", description: "Form, material, and the details that stay with you.", image: image("994523", 1500) },
  { slug: "bags", name: "Bags", eyebrow: "Carry considered", description: "Sculptural silhouettes, useful interiors, and an easy point of view.", image: image("1488463", 1500) },
  { slug: "accessories", name: "Accessories", eyebrow: "The finishing touch", description: "Small gestures that bring a considered rhythm to every look.", image: image("1755428", 1500) },
  { slug: "jewellery", name: "Jewellery", eyebrow: "Reflective forms", description: "Polished forms designed for layering, gifting, and keeping.", image: image("298864", 1500) },
  { slug: "essentials", name: "Essentials", eyebrow: "Made for every day", description: "The reliable objects that make the rest of the wardrobe feel easy.", image: image("3054976", 1500) },
];

export const journals = [
  { slug: "the-shape-of-a-day", title: "The shape of a day", type: "Studio notes", date: "18 June 2025", excerpt: "A study in useful beauty, warm light, and the objects that move with us.", image: image("994523", 1400) },
  { slug: "material-in-motion", title: "Material in motion", type: "The journal", date: "04 June 2025", excerpt: "Why a good material changes the way a piece is worn, carried, and remembered.", image: image("1488463", 1400) },
  { slug: "a-quiet-kind-of-colour", title: "A quiet kind of colour", type: "Field notes", date: "22 May 2025", excerpt: "On ochre, cedar, moss, and the warmth they bring to a daily uniform.", image: image("1536619", 1400) },
];

export const money = (value: number) => new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(value);
export const findProduct = (slug?: string) => products.find((product) => product.slug === slug);
export const findCollection = (slug?: string) => collections.find((collection) => collection.slug === slug);
export const findJournal = (slug?: string) => journals.find((journal) => journal.slug === slug);
