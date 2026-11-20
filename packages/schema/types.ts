// Shapes of the YAML files under data/. Kept in step with company.schema.json.

export interface SourceRef {
  url: string;
  retrieved: string;
  note?: string;
}

export interface BeanOrigin {
  country: string;
  region?: string;
  producer?: string;
  percent?: number;
}

export interface BeanEntry {
  id: string;
  name: string;
  forms: Array<'whole_bean' | 'ground'>;
  roast_level?: string;
  process?: string;
  blend?: boolean;
  decaf?: boolean;
  origins?: BeanOrigin[];
  varieties?: string[];
  altitude_m?: { min?: number; max?: number };
  /** Ids from data/taxonomy/flavor-wheel.yaml. */
  flavor_notes?: string[];
  roaster_notes?: string;
  profile?: SensoryProfile;
  serve?: 'black' | 'milk' | 'either';
  /** Drink type ids the roaster recommends. */
  brew_methods?: string[];
  url: string;
  availability?: 'current' | 'seasonal' | 'discontinued';
  retrieved: string;
}

export interface CafeEntry {
  id: string;
  name: string;
  city: string;
  country: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  url?: string;
}

export interface MenuEntry {
  id: string;
  drink: string;
  name: string;
  cafe?: string;
  notes?: string;
  flavor_notes?: string[];
  profile?: SensoryProfile;
  beans?: string[];
  source: string;
  retrieved: string;
}

export interface CompanyFile {
  id: string;
  name: string;
  country: string;
  city?: string;
  founded?: number;
  website: string;
  description?: string;
  /** Leave out when it is not known whether the company runs cafes. */
  has_cafes?: boolean;
  cafe_count_approx?: number;
  status?: 'active' | 'closed';
  verified?: boolean;
  sources: SourceRef[];
  beans: BeanEntry[];
  cafes?: CafeEntry[];
  menu?: MenuEntry[];
}

/** 1 low, 2 medium, 3 medium-high, 4 high; only as published. */
export interface SensoryProfile {
  sweetness?: number;
  acidity?: number;
  body?: number;
  bitterness?: number;
}

export interface WheelNode {
  id: string;
  name: string;
  children?: WheelNode[];
}

export interface SensoryScale {
  attributes: Array<{ id: string; name: string; description: string }>;
  scale: Array<{ value: number; name: string }>;
  scale_words: Record<string, number>;
}

export interface Taxonomy {
  flavorWheel: WheelNode[];
  /** Roaster word -> wheel id, or null for words that are not flavours. */
  flavorAliases: Record<string, string | null>;
  sensory: SensoryScale;
  drinkTypes: Array<{ id: string; name: string; category: string; description?: string }>;
  processes: Array<{ id: string; name: string; description?: string }>;
  roastLevels: Array<{ id: string; name: string; sort_order: number }>;
  varieties: Array<{ id: string; name: string; species: string }>;
}

export interface Dataset {
  taxonomy: Taxonomy;
  companies: Array<{ file: string; data: CompanyFile }>;
}
