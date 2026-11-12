// Central Wellness World palette (Design Bible V16 p.72). sRGB hex starting targets: verify the PERCEIVED colour in engine, not just the hex.
// Material families (STONE_CREAM, BRICK_WARM, ...) are the only way area code should pick a colour so all areas share one language.
export const PALETTE = {
  STONE_CREAM: { base: '#E8DDCF', alt: '#F2E8DB', rough: 0.72 },
  STONE_LIMESTONE: { base: '#D8CBB9', alt: '#D9C7B4', rough: 0.8 },
  STONE_PAVING: { base: '#B5ADA8', alt: '#C7BEB4', rough: 0.85 },
  BRICK_WARM: { base: '#8B5E50', alt: '#A97465', rough: 0.9 },
  WOOD_WALNUT: { base: '#38261F', alt: '#4A3128', rough: 0.42 },
  WOOD_OAK: { base: '#79533B', alt: '#9B6E4A', rough: 0.48 },
  METAL_BRASS: { base: '#B58A4D', alt: '#C5A06A', rough: 0.32, metal: 1 },
  METAL_BRONZE: { base: '#292725', alt: '#7D6244', rough: 0.4, metal: 1 },
  TEXTILE_OXBLOOD: { base: '#603345', alt: '#723E50', rough: 0.85 },
  CAFE_VIOLET: { base: '#4B2E5C', alt: '#8A5A8C', rough: 0.8 },
  FOLIAGE_DEEP: { base: '#3E5736', alt: '#354A35', rough: 0.8 },
  FOLIAGE_SAGE: { base: '#64765A', alt: '#536E4C', rough: 0.8 },
  FOLIAGE_LIGHT: { base: '#718451', alt: '#6A7641', rough: 0.8 },
  LAVENDER: { base: '#82749A', alt: '#8B7B9C', rough: 0.9 },
  SKY_BLUEHOUR: { base: '#858CAA', alt: '#A29AB6' },
  CEILING_CREAM: { base: '#E9D8C4', alt: '#F3DEBE', rough: 0.9 },
  IRONWORK: { base: '#25272A', alt: '#292725', rough: 0.5, metal: 0.6 },
}
export const LAMP_K = { warmLow: 2700, warmHigh: 3200 }
export const REJECT = ['global pink/purple/orange/green cast', 'oversaturation', 'washed-out', 'overbright emissive', 'crushed shadows', 'plastic reflections', 'mirror floors']
