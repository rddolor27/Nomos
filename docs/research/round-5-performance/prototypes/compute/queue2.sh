#!/bin/bash
# Chromium runs (after queue1). Each gated on 1-min load < 1.5 (max wait 10 min, then runs anyway and records load).
cd "$(dirname "$0")"
while [ ! -f results/q1.done ]; do sleep 20; done
W=./waitload.sh
$W 600 1.5 node browser/run-chromium.mjs probe > results/q2-probe.log 2>&1
$W 120 1.5 node browser/run-chromium.mjs probe webgpu > results/q2-probe-webgpu.log 2>&1
$W 600 1.5 node browser/run-chromium.mjs kernels > results/q2-kernels-chromium.log 2>&1
$W 600 1.5 timeout 1200 node browser/run-chromium.mjs mt > results/q2-mt-chromium.log 2>&1
$W 600 1.5 node browser/run-chromium.mjs gc trace-gc > results/q2-gc-chromium.log 2>&1
$W 600 1.5 node browser/run-chromium.mjs algo > results/q2-algo-chromium.log 2>&1
$W 600 1.5 node browser/run-speedometer.mjs 3 > results/q2-speedometer.log 2>&1
echo done > results/q2.done
