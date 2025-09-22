export const VOLLEYBALL_POSITIONS = [
  { value: 'setter', label: 'Setter' },
  { value: 'outside-hitter', label: 'Outside Hitter' },
  { value: 'opposite', label: 'Opposite/Right Side' },
  { value: 'middle-blocker', label: 'Middle Blocker' },
  { value: 'libero', label: 'Libero' },
  { value: 'defensive-specialist', label: 'Defensive Specialist' },
  { value: 'serving-specialist', label: 'Serving Specialist' },
  { value: 'utility', label: 'Utility / Any Position' }
] as const;

export type VolleyballPositionValue = (typeof VOLLEYBALL_POSITIONS)[number]['value'];

export const GENDER_OPTIONS = [
  { value: '', label: 'Prefer not to share' },
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'genderqueer', label: 'Genderqueer' },
  { value: 'genderfluid', label: 'Genderfluid' },
  { value: 'agender', label: 'Agender' },
  { value: 'two-spirit', label: 'Two-Spirit' },
  { value: 'transgender', label: 'Transgender' },
  { value: 'self-described', label: 'Another identity (self-described)' }
] as const;

export type GenderOptionValue = (typeof GENDER_OPTIONS)[number]['value'];

interface SportBranding {
  background: string;
  border: string;
  accent: string;
  text: string;
}

const SPORT_BRAND_COLORS: Record<string, SportBranding> = {
  volleyball: {
    background: 'bg-orange-50',
    border: 'border-orange-200',
    accent: 'text-orange-600',
    text: 'text-orange-900'
  },
  badminton: {
    background: 'bg-emerald-50',
    border: 'border-emerald-200',
    accent: 'text-emerald-600',
    text: 'text-emerald-900'
  },
  pickleball: {
    background: 'bg-yellow-50',
    border: 'border-yellow-200',
    accent: 'text-yellow-600',
    text: 'text-yellow-900'
  },
  basketball: {
    background: 'bg-amber-50',
    border: 'border-amber-200',
    accent: 'text-amber-600',
    text: 'text-amber-900'
  },
  soccer: {
    background: 'bg-lime-50',
    border: 'border-lime-200',
    accent: 'text-lime-600',
    text: 'text-lime-900'
  }
};

const DEFAULT_BRANDING: SportBranding = {
  background: 'bg-red-50',
  border: 'border-red-200',
  accent: 'text-red-600',
  text: 'text-red-900'
};

export const getSportBranding = (sportName?: string): SportBranding => {
  if (!sportName) return DEFAULT_BRANDING;
  const key = sportName.trim().toLowerCase();
  return SPORT_BRAND_COLORS[key] ?? DEFAULT_BRANDING;
};

export const formatVolleyballPositionLabel = (positions: string[] | null | undefined) => {
  if (!positions || positions.length === 0) return 'Any position';
  const labelLookup = VOLLEYBALL_POSITIONS.reduce<Record<string, string>>((acc, option) => {
    acc[option.value] = option.label;
    return acc;
  }, {});
  return positions
    .map((position) => labelLookup[position] ?? position)
    .join(', ');
};

const GENDER_LABEL_LOOKUP = GENDER_OPTIONS.filter((option) => option.value)
  .reduce<Record<string, string>>((acc, option) => {
    acc[option.value] = option.label;
    return acc;
  }, {});

export const formatGenderIdentityLabel = (
  value: string | null | undefined,
  other?: string | null
) => {
  if (!value) return 'Not shared';
  if (value === 'self-described') {
    return other?.trim() || 'Self-described';
  }
  if (value === 'prefer-not-to-say') {
    return 'Prefer not to say';
  }
  return GENDER_LABEL_LOOKUP[value] ?? value;
};
