# Defects register
- D-001 (open, partially tuned: wall and floor darkened, env 0.35) Lift lobby reads brighter/paler than Bible p.17 target (target has darker marble, visible floor reflection, dimmer cove). Lights reduced once; remaining wash comes from golden-hour environment light in the penthouse. Needs Blender/localhost same-angle comparison + tuning.
- D-002 (open) Lift lobby sign "Lift" is faint; floor marble reflection not visible.
- Verified: lobby renders (docs/bible/lobby/t1,t2); entrance door opens; lift call → ride down → street; street lift → return to penthouse, lift doors open then auto-close (fastAnim on; SwiftShader is too slow for real-time timing).
