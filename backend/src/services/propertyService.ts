export const normalizeAddress = (address: string): string => {
  if (!address) return '';
  
  // Basic unaccent/normalize logic
  let normalized = address
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics

  // Common abbreviations (Street -> St, etc.)
  const abbreviations: Record<string, string> = {
    'street': 'st',
    'avenue': 'ave',
    'road': 'rd',
    'boulevard': 'blvd',
    'drive': 'dr',
    'lane': 'ln',
    'court': 'ct',
    'square': 'sq',
    'terrace': 'ter',
    'highway': 'hwy',
  };

  Object.keys(abbreviations).forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    normalized = normalized.replace(regex, abbreviations[word]);
  });

  return normalized.trim();
};

export const convertToSqft = (value: number, unit: string): number => {
  const normalizedUnit = unit.toLowerCase().trim();
  
  // sqft = ft2 = sq ft; sqm = m2 = sq m = square metres
  if (['sqm', 'm2', 'sq m', 'square metres'].includes(normalizedUnit)) {
    return value * 10.7639;
  }
  
  return value; // Assume sqft if not sqm
};
