export interface ConstellationDef {
  name: string;
  segments: [string, string][]; // pairs of star IDs from brightStarCatalog
}

export const CONSTELLATION_LINES: ConstellationDef[] = [
  {
    name: 'Orion',
    segments: [
      ['betelgeuse', 'meissa'],
      ['bellatrix', 'meissa'],
      ['betelgeuse', 'mintaka'],
      ['bellatrix', 'mintaka'],
      ['mintaka', 'alnilam'],
      ['alnilam', 'alnitak'],
      ['alnitak', 'rigel'],
      ['alnitak', 'saiph'],
    ],
  },
  {
    name: 'Ursa Major',
    segments: [
      ['dubhe', 'merak'],
      ['merak', 'phecda'],
      ['phecda', 'megrez'],
      ['megrez', 'dubhe'],
      ['megrez', 'alioth'],
      ['alioth', 'mizar'],
      ['mizar', 'alkaid'],
    ],
  },
  {
    name: 'Cassiopeia',
    segments: [
      ['caph', 'schedar'],
      ['schedar', 'gamma_cas'],
      ['gamma_cas', 'delta_cas'],
      ['delta_cas', 'segin'],
    ],
  },
  {
    name: 'Cygnus',
    segments: [
      ['deneb', 'sadr'],
      ['sadr', 'albireo'],
      ['delta_cyg', 'sadr'],
      ['sadr', 'gienah_cyg'],
    ],
  },
  {
    name: 'Leo',
    segments: [
      ['regulus', 'algieba'],
      ['algieba', 'denebola'],
    ],
  },
];
