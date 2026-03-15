#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MICROSYNTH_DIR="$(dirname "$PROJECT_DIR")/microsynth"

echo "Building microsynth raw WASM..."
cd "$MICROSYNTH_DIR"
cargo build --target wasm32-unknown-unknown --release

echo "Copying WASM to public/wasm/"
cp target/wasm32-unknown-unknown/release/microsynth.wasm "$PROJECT_DIR/public/wasm/microsynth_raw.wasm"

echo "Done."
