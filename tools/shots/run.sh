#!/bin/bash
# Headless screenshot runner. usage: tools/shots/run.sh tools/shots/street_shots.cjs OUTDIR '{"name":[x,y,z,yaw,pitch,fov]}'
# Needs: npm i; npx playwright install chromium; a build in dist4 (see docs/HANDOVER.md).
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
pkill -f "http.server 4176" 2>/dev/null
(cd "$ROOT/dist4" && setsid nohup python3 -m http.server 4176 >/dev/null 2>&1 &)
for i in $(seq 1 20); do curl -s -o /dev/null localhost:4176/ && break; sleep 1; done
mkdir -p "$2"; cd "$ROOT" && timeout 590 node "$1" "$2" "$3"
