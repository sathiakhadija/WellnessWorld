import React from 'react'
import { createRoot } from 'react-dom/client'
const studio = new URLSearchParams(window.location.search).get('studio')
async function boot() {
  const root = createRoot(document.getElementById('root'))
  if (studio) { const { default: Studio } = await import('./studio/Studio.jsx'); root.render(<Studio />) }
  else { const { default: PenthouseScene } = await import('./PenthouseScene.jsx'); root.render(<PenthouseScene />) }
}
boot()
