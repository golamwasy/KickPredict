// Map 3-letter team codes to emoji flags
const CODE_MAP = {
  // Americas
  USA: 'US', CAN: 'CA', MEX: 'MX', BRA: 'BR', ARG: 'AR',
  URU: 'UY', COL: 'CO', ECU: 'EC', CHI: 'CL', PER: 'PE',
  PAR: 'PY', HON: 'HN', CRC: 'CR', PAN: 'PA', JAM: 'JM',
  HAI: 'HT', CUW: 'CW',

  // Europe
  FRA: 'FR', GER: 'DE', ENG: 'GB', ESP: 'ES', POR: 'PT',
  ITA: 'IT', NED: 'NL', BEL: 'BE', CRO: 'HR', SRB: 'RS',
  SUI: 'CH', DEN: 'DK', POL: 'PL', AUT: 'AT', HUN: 'HU',
  CZE: 'CZ', SVK: 'SK', GRE: 'GR', TUR: 'TR', UKR: 'UA',
  SWE: 'SE', NOR: 'NO', FIN: 'FI', ROM: 'RO', SLO: 'SI',
  BIH: 'BA', ISL: 'IS', IRL: 'IE', SCO: 'GB', WAL: 'GB',

  // Africa
  ALG: 'DZ', MAR: 'MA', SEN: 'SN', NGA: 'NG', GHA: 'GH',
  CMR: 'CM', TUN: 'TN', EGY: 'EG', CIV: 'CI', MLI: 'ML',
  ANG: 'AO', ZAM: 'ZM', ZIM: 'ZW', KEN: 'KE', GUI: 'GN',
  COD: 'CD', CGO: 'CG', CPV: 'CV', RSA: 'ZA',

  // Asia
  JPN: 'JP', KOR: 'KR', AUS: 'AU', IRN: 'IR', SAU: 'SA',
  QAT: 'QA', JOR: 'JO', UAE: 'AE', IRQ: 'IQ', CHN: 'CN',
  KSA: 'SA', OMA: 'OM', UZB: 'UZ', VIE: 'VN', THA: 'TH',
  IND: 'IN',

  // Oceania
  NZL: 'NZ', FIJ: 'FJ',
};

export function getFlag(code: string): string {
  const iso2 = CODE_MAP[code?.toUpperCase() as keyof typeof CODE_MAP];
  if (!iso2) return '🏳️';
  return iso2
    .toUpperCase()
    .split('')
    .map((c: string) => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    .join('');
}

export function getFlagImgUrl(code: string): string | null {
  const iso2 = CODE_MAP[code?.toUpperCase() as keyof typeof CODE_MAP];
  if (!iso2) return null;
  return `https://flagcdn.com/w80/${iso2.toLowerCase()}.png`;
}

