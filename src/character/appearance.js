// Appearance config for the player character (presentation data only: no gameplay code reads this).
// Swapping the look = changing this object; swapping the whole body = providing another model that satisfies the rig contract.
export const PLAYER_APPEARANCE = {
  id: 'player-v1',
  height: 1.57,                         // metres (157 cm), set by the rig proportions
  skin: '#a67550',                      // warm medium South Asian / Bengali
  skinLight: '#b2815c',
  blush: '#b46e5a',
  lips: '#9a4b45',
  eyeIris: '#2b170d',                   // dark brown
  hair: '#0a090c',                      // jet black
  top: '#0d0d10',                       // fitted black crop top
  denim: '#a8bdd3',                     // light-wash baggy jeans
  denimDark: '#7f97b3',
  shoe: '#f1efea',                      // white-ish trainers
  sole: '#d2d0cc',
  gold: '#d9a441',
  hairLength: 'mid-back',
}
