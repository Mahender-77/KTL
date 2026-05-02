import type { ImageSourcePropType } from "react-native";
import { normalizeCategoryKey } from "@/constants/catalog/categoriesCatalog";

/**
 * Local category thumbnails (JPGs in this folder). Match API slugs / names in
 * `resolveCategoryImage` — add keys here when you add new files.
 */
const categoryImages = {
  fruits: require("./fruits.jpg"),
  vegetables: require("./vegetables.jpg"),
  snacks: require("./snacks.jpg"),
  dairy: require("./dairy.jpg"),
  spices: require("./spices.jpg"),
  meat: require("./meat.jpg"),
  grains: require("./grains.jpg"),
  juice: require("./juice.jpg"),
  bread: require("./bread.jpg"),
  nuts: require("./nuts.jpg"),
  herbs: require("./herbs.jpg"),
  beverages: require("./beverages.jpg"),
  frozen: require("./frozen.jpg"),
  organic: require("./organic.jpg"),
  default: require("./default.jpg"),
} as const;

export type CategoryImageId = keyof typeof categoryImages;

/** Slug (normalized) → which bundled image to use */
const SLUG_TO_IMAGE: Record<string, CategoryImageId> = {
  fruits: "fruits",
  fruit: "fruits",
  "fresh-fruits": "fruits",
  "fresh-fruit": "fruits",
  berries: "fruits",
  citrus: "fruits",
  vegetables: "vegetables",
  vegetable: "vegetables",
  veg: "vegetables",
  salad: "vegetables",
  garlic: "vegetables",
  onion: "vegetables",
  potato: "vegetables",
  snacks: "snacks",
  "dry-fruits": "nuts",
  namkeen: "snacks",
  chips: "snacks",
  biscuits: "snacks",
  cookies: "snacks",
  dairy: "dairy",
  milk: "dairy",
  curd: "dairy",
  cheese: "dairy",
  butter: "dairy",
  ghee: "dairy",
  spices: "spices",
  spice: "spices",
  masala: "spices",
  ginger: "spices",
  meat: "meat",
  chicken: "meat",
  mutton: "meat",
  fish: "meat",
  seafood: "meat",
  egg: "meat",
  eggs: "meat",
  grains: "grains",
  rice: "grains",
  pulses: "grains",
  dal: "grains",
  atta: "grains",
  flour: "grains",
  juice: "juice",
  juices: "juice",
  beverages: "beverages",
  drinks: "beverages",
  drink: "beverages",
  water: "beverages",
  soda: "beverages",
  tea: "beverages",
  coffee: "beverages",
  bread: "bread",
  bakery: "bread",
  cake: "bread",
  nuts: "nuts",
  "nuts-seeds": "nuts",
  dryfruits: "nuts",
  herbs: "herbs",
  frozen: "frozen",
  "frozen-food": "frozen",
  icecream: "frozen",
  "ice-cream": "frozen",
  organic: "organic",
  gourmet: "organic",
};

const keywordRules: { test: (s: string, n: string) => boolean; id: CategoryImageId }[] = [
  { test: (s, n) => /fruit|mango|apple|banana|orange|grape|berry|papaya|melon|pomegranate/.test(n) || /fruit|berry|mango/.test(s), id: "fruits" },
  { test: (s, n) => /veg|green|leaf|tomato|onion|potato|carrot|beans|cabbage|cauliflower|brinjal|gourd|zucchini|broccoli/.test(n) || /veg|garlic|potato|salad|greens/.test(s), id: "vegetables" },
  { test: (s, n) => /snack|biscuit|chocolate|candy|namkeen|muri|waffer|waffle|munchy/.test(n) || /snack|chip|crisp|haldiram/.test(s), id: "snacks" },
  { test: (s, n) => /dairy|milk|curd|yogurt|cheese|butter|ghee|paneer|cream|lassi|buttermilk|dahi/.test(n) || /dairy|milk|curd|cheese|ghee|paneer/.test(s), id: "dairy" },
  { test: (s, n) => /spice|masala|herb|chilli|pepper|turmeric|cardamom|clove|cumin|garam|seasoning|hing/.test(n) || /spice|masala|chilli|ginger/.test(s), id: "spices" },
  { test: (s, n) => /meat|chicken|mutton|lamb|beef|pork|fish|prawn|seafood|crab|egg|non-veg|poultry|boneless|curry cut/.test(n) || /meat|chicken|mutton|fish|egg|protein|nonveg/.test(s), id: "meat" },
  { test: (s, n) => /rice|wheat|atta|maida|sooji|dal|pulse|lentil|millet|grain|cereal|oats|quinoa|flour|besan|urad|moong|toor|chana|rajma|masoor/.test(n) || /grain|rice|dal|pulses?|atta|flour|oats/.test(s), id: "grains" },
  { test: (s, n) => /juice|squash|sharbat|aamras/.test(n) || /juice|squash/.test(s), id: "juice" },
  { test: (s, n) => /bever|drink|soda|cola|water|nimbu|syrup|shake|soda|cooler|lassi(?!$)/.test(n) && !/dairy|milk/.test(n) || /bever|drink|soda|cola|water|tea(?!$)|chai|coffee(?!$)/.test(s), id: "beverages" },
  { test: (s, n) => /bread|bun|bun|croissant|loaf|bakery|cake|muffin|puff|pav/.test(n) || /bread|bakery|bun|pav|cake(?!$)/.test(s), id: "bread" },
  { test: (s, n) => /nut|almond|walnut|cashew|pista|pistachio|raisin|kishmish|fig|apricot|seed|dates?|dried?/.test(n) || /nut|dry.fruit|dates?|raisin|seed/.test(s), id: "nuts" },
  { test: (s, n) => /herb|basil|oregano|mint|coriander|green leaf|microgreen/.test(n) || /herb|microgreen|mint(?!$)/.test(s), id: "herbs" },
  { test: (s, n) => /frozen|ice.?cream|frozen|cold.?cut|nugget/.test(n) || /frozen|ice-?cream/.test(s), id: "frozen" },
  { test: (s, n) => /organic|gourmet|natural|health/.test(n) || /organic|gourmet|natural(?!$)/.test(s), id: "organic" },
];

function pickIdFromText(slug: string, name: string): CategoryImageId | null {
  const s = `${slug} ${normalizeCategoryKey({ slug, name: "" })}`.toLowerCase();
  const n = (name || "").toLowerCase();
  for (const { test, id } of keywordRules) {
    if (test(s, n)) return id;
  }
  return null;
}

/**
 * Picks a bundled image for a parent category from slug + name (API can vary).
 */
export function resolveCategoryImage(slug: string | undefined, name: string | undefined): ImageSourcePropType {
  const rawSlug = (slug || "").trim();
  const rawName = (name || "").trim();
  const key = normalizeCategoryKey({ slug: rawSlug, name: rawName });

  if (key && SLUG_TO_IMAGE[key]) {
    return categoryImages[SLUG_TO_IMAGE[key]];
  }

  const fromSlug = SLUG_TO_IMAGE[rawSlug.toLowerCase().replace(/\s+/g, "-")];
  if (fromSlug) return categoryImages[fromSlug];

  const fromKeywords = pickIdFromText(rawSlug, rawName);
  if (fromKeywords) return categoryImages[fromKeywords];

  return categoryImages.default;
}
