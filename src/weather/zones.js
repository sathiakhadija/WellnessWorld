// Street-level covered interiors for rain/audio. (world metres)
export const STREET_INDOOR = [[-42.6, -33.1, 95.0, 107.1], [-40.4, -32.9, 74.0, 86.1], [-5.9, 8.3, 4.9, 13.7]]   // world x0,x1,z0,z1: café, bookshop, ground lobby (no rain, muffled audio)
export const inStreetInterior = (x, z) => STREET_INDOOR.some(([a, b, c, d]) => x > a && x < b && z > c && z < d)
