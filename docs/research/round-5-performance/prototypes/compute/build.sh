#!/bin/bash
set -e
cd "$(dirname "$0")/rust-kernels"
cargo build --release --target wasm32-unknown-unknown 2>&1 | tail -2
cp target/wasm32-unknown-unknown/release/simkernels.wasm ../wasm/scalar.wasm
RUSTFLAGS="-C target-feature=+simd128" cargo build --release --target wasm32-unknown-unknown --target-dir target-simd 2>&1 | tail -2
cp target-simd/wasm32-unknown-unknown/release/simkernels.wasm ../wasm/simd.wasm
cd ../wasm && ls -l *.wasm
