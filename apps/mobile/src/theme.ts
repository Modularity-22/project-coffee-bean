// Colours taken from the Project Coffee Bean logo.
export const colors = {
  background: '#FBF7F2',
  surface: '#FFFFFF',
  border: '#E8DCCF',
  text: '#3B1A10',
  textMuted: '#7A5C4E',
  primary: '#5A2A18', // the one accent: primary action, selection, links
  accent: '#5A2A18', // kept as an alias of primary; there is no second accent
  chip: '#F1EAE1', // raised neutral for tags and the active tab, not a colour
  onPrimary: '#FFFFFF',
  note: '#D49A1E', // tasting notes on the flavour profile
  attribute: '#5C9AA8', // sweetness, acidity, body, bitterness
  ring: '#D7E5E3',
  ok: '#3F7A4E',
  warn: '#9A6A12',
  warnBg: '#FBF0D6',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
// By size: tags 6, controls 10, cards 12, panels 16. Nothing is a full pill.
export const radius = { xs: 6, sm: 8, control: 10, md: 12, lg: 16, pill: 999 };

export const fonts = {
  // Hierarchy from size and colour; weights 400 and 500, 600 only for rare emphasis.
  display: { fontSize: 28, lineHeight: 32, fontWeight: '500' as const, color: colors.text },
  title: { fontSize: 22, fontWeight: '500' as const, color: colors.text },
  heading: { fontSize: 16, fontWeight: '500' as const, color: colors.text },
  label: { fontSize: 14, fontWeight: '500' as const, color: colors.textMuted },
  body: { fontSize: 15, color: colors.text, lineHeight: 21 },
  muted: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
};

/**
 * The nine categories of the coffee taster's flavour wheel, in the wheel's own
 * clockwise order, so related families sit next to each other on every chart.
 * `short` is the axis label; the full name is the wheel's.
 */
export const FAMILIES = [
  { id: 'floral', name: 'Floral', short: 'Floral', color: '#BE5C9C' },
  { id: 'fruity', name: 'Fruity', short: 'Fruity', color: '#C8413F' },
  { id: 'sour-fermented', name: 'Sour / fermented', short: 'Fermented', color: '#C9A227' },
  { id: 'green-vegetative', name: 'Green / vegetative', short: 'Green', color: '#5E8C4A' },
  { id: 'other', name: 'Other (earthy, woody)', short: 'Earthy', color: '#7C8A96' },
  { id: 'roasted', name: 'Roasted', short: 'Roasted', color: '#7A4B33' },
  { id: 'spices', name: 'Spices', short: 'Spices', color: '#A8452C' },
  { id: 'nutty-cocoa', name: 'Nutty / cocoa', short: 'Nutty / cocoa', color: '#8A5A36' },
  { id: 'sweet', name: 'Sweet', short: 'Sweet', color: '#D98A2B' },
] as const;
const FAMILY_COLORS: Record<string, string> = Object.fromEntries(
  FAMILIES.map((f) => [f.id, f.color]),
);

export const ATTRIBUTES = [
  { id: 'sweetness', name: 'Sweetness' },
  { id: 'acidity', name: 'Acidity' },
  { id: 'body', name: 'Body' },
  { id: 'bitterness', name: 'Bitterness' },
] as const;
export const SCALE = ['Low', 'Medium', 'Medium-high', 'High'] as const;

export const familyColor = (familyId: string | null | undefined): string =>
  (familyId && FAMILY_COLORS[familyId]) || colors.textMuted;
