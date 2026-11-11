// Placeholder registry for what lies beyond the main entrance. V10 intentionally builds NO exterior environment (not approved yet):
// activating "Go Outside" shows the destination card below and Enter returns to the penthouse.
// To add the real lobby later: register a scene id here (e.g. 'lobby' -> <LobbyScene/>), have the transition state machine in Plan.jsx's <Entrance/>
// mount it when camStore.transition === 'overlay', and call world.returnHome() when the player comes back.
export const DESTINATIONS = {
  lobby: { title: 'Building lobby', sub: 'Coming soon — the building lobby and the world outside are not part of this release.' },
}
