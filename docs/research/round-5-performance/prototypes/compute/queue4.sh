#!/bin/bash
# Prioritised, load-aware queue. Relative comparisons: short waits. Headline (MT scaling, Chromium kernels): long waits for low load.
cd "$(dirname "$0")"; unset BUN_OPTIONS
W=./waitload.sh
cd js
../waitload.sh 120 1.5 bun gc-run-node.mjs > ../results/q4-gc-bun.log 2>&1
BUN_OPTIONS=--smol ../waitload.sh 60 1.5 bun gc-run-node.mjs tag=-smol > ../results/q4-gc-bun-smol.log 2>&1
../waitload.sh 120 1.5 node algo-run-node.mjs > ../results/q4-algo-node.log 2>&1
../waitload.sh 120 1.5 bun algo-run-node.mjs > ../results/q4-algo-bun.log 2>&1
touch ../results/q1.done
cd ..
$W 60 1.5 node browser/run-chromium.mjs probe > results/q4-probe.log 2>&1
$W 60 1.5 node browser/run-chromium.mjs probe webgpu > results/q4-probe-webgpu.log 2>&1
$W 600 1.5 node browser/run-chromium.mjs kernels > results/q4-kernels-chromium.log 2>&1
$W 120 1.5 node browser/run-chromium.mjs gc trace-gc > results/q4-gc-chromium.log 2>&1
$W 120 1.5 node browser/run-chromium.mjs algo > results/q4-algo-chromium.log 2>&1
$W 600 1.5 node browser/run-speedometer.mjs 3 > results/q4-speedometer.log 2>&1
cd js
../waitload.sh 900 1.2 timeout 600 node mtw-run-node.mjs > ../results/q4-mtw-node.log 2>&1
../waitload.sh 900 1.2 timeout 900 node mt-run-node.mjs > ../results/q4-mt-node-rerun.log 2>&1
../waitload.sh 600 1.2 timeout 600 bun mtw-run-node.mjs > ../results/q4-mtw-bun.log 2>&1
cd ..
$W 900 1.2 timeout 1200 node browser/run-chromium.mjs mt > results/q4-mt-chromium.log 2>&1
echo done > results/q4.done
