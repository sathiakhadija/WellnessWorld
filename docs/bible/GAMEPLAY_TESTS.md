# Gameplay walk tests (headless, real ArrowUp key + physics; ~0.3-2 fps so speeds are not representative)
Date 2026-11-13. Player placed with teleport, held ArrowUp for N seconds; no page errors in completed runs. Ground y = -86.8 throughout (no falls).

| Route | Result |
|---|---|
| Lobby -> courtyard (x 1.2, z 10 -> +z) | PASS: advanced z 10 -> 14.4 through the door opening, on the ground |
| Lane eastward from x -60 (z 90.5) | PASS: advanced -60 -> -44.8, no stop, no fall |
| East Street -> garden square edge (x 40 -> west, z 90.5) | Stopped at x 33.6 = garden square boundary (ES0 33.2): fence/hedge line, expected |
| Courtyard from (1.2, 30) | Start point was inside the plane-tree trunk (tree at 1.2, 30.5), so it did not move: test setup issue, retested from x 6 (see below) |
| Shop doors | Closed until Enter is pressed: walking into the facade stops at the threshold (by design) |
| Lobby floor | Floor collider added (D-008); previously the rabbit fell through |
Retest batch (courtyard from x 6, promenade, wall collision, great lawn) is recorded below if it completed.
