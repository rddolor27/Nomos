#!/bin/bash
cd "$(dirname "$0")/js"
unset BUN_OPTIONS
W=../waitload.sh
$W 600 1.5 node run-node.mjs tag=-lowload > ../results/q1-kernels-node.log 2>&1
$W 600 1.5 bun run-node.mjs tag=-lowload > ../results/q1-kernels-bun.log 2>&1
$W 600 1.5 timeout 900 node mt-run-node.mjs > ../results/q1-mt-node.log 2>&1
$W 600 1.5 timeout 900 bun mt-run-node.mjs > ../results/q1-mt-bun.log 2>&1
$W 600 1.5 node --expose-gc gc-run-node.mjs > ../results/q1-gc-node.log 2>&1
$W 300 1.5 node --expose-gc --min-semi-space-size=128 --max-semi-space-size=128 gc-run-node.mjs alloc tag=-bigsemi > ../results/q1-gc-node-alloc.log 2>&1
$W 600 1.5 bun gc-run-node.mjs > ../results/q1-gc-bun.log 2>&1
BUN_OPTIONS=--smol $W 300 1.5 bun gc-run-node.mjs tag=-smol > ../results/q1-gc-bun-smol.log 2>&1
$W 600 1.5 node algo-run-node.mjs > ../results/q1-algo-node.log 2>&1
$W 600 1.5 bun algo-run-node.mjs > ../results/q1-algo-bun.log 2>&1
echo QUEUE1_DONE > ../results/q1.done
