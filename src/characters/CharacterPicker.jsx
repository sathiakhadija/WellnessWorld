// Small character selector shown inside the controls panel. Lists the available characters (builtins always; Momo only once public/models/momo.glb exists;
// the technical placeholder only with ?dev=1). Choice persists in localStorage and the page reloads to rebuild the player rig.
import { useEffect, useState } from 'react'
import { CHARACTERS, probeAvailability, listSelectable, requestedId, switchCharacter } from './registry.js'

export function CharacterPicker() {
  const [, bump] = useState(0)
  useEffect(() => { probeAvailability().then(() => bump((n) => n + 1)) }, [])
  const list = listSelectable(), cur = requestedId()
  const momo = CHARACTERS.find((c) => c.id === 'momo'), momoMissing = list.every((c) => c.id !== 'momo')
  return (
    <div className="ww-foot" style={{ marginTop: 6 }}>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>Character
        <select value={list.some((c) => c.id === cur) ? cur : 'rabbit'} onChange={(e) => switchCharacter(e.target.value)} style={{ background: '#2a2430', color: '#f3e7d8', border: '1px solid #5a4c60', borderRadius: 6, padding: '2px 6px' }}>
          {list.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </label>
      {momoMissing && momo ? <div style={{ opacity: 0.6, fontSize: 11 }}>Momo appears here once her model is added.</div> : null}
    </div>
  )
}
