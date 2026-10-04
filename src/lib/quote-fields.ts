// Shared between the form markup and the server so options never drift.
export const provinces = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
  'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
  'Quebec', 'Saskatchewan', 'Yukon',
] as const;

export const installOptions = [
  { value: 'griffin', label: 'Yes, install with Griffin Ag (recommended)' },
  { value: 'own-crew', label: 'Supply only, my own crew will install' },
  { value: 'unsure', label: 'Not sure yet' },
] as const;

export const productInterests = [
  { value: 'bucket-elevator-tower', label: 'Bucket elevator tower' },
  { value: '2-post-tower', label: '2-post tower' },
  { value: 'stairs', label: 'Wrap-around stairs' },
  { value: 'catwalk', label: 'Catwalk' },
  { value: 'full-system', label: 'Full system' },
  { value: 'retailer', label: 'Becoming a retailer' },
] as const;
