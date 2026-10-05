#!/bin/bash
# after Chromium queue: WASM multi-worker (Node, Bun) and low-load re-runs of headline numbers
cd "$(dirname "$0")"
while [ ! -f results/q2.done ]; do sleep 20; done
W=./waitload.sh
cd js; unset BUN_OPTIONS
../waitload.sh 600 1.5 timeout 600 node mtw-run-node.mjs > ../results/q3-mtw-node.log 2>&1
../waitload.sh 600 1.5 timeout 600 bun mtw-run-node.mjs > ../results/q3-mtw-bun.log 2>&1
echo done > ../results/q3.done
