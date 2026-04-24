#!/usr/bin/env bash
set -euo pipefail

AVD_NAME="${AVD_NAME:-alarm-api35}"
DEVICE_ID="${DEVICE_ID:-emulator-5554}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export PATH="$HOME/develop/flutter/bin:$HOME/Android/Sdk/emulator:$HOME/Android/Sdk/platform-tools:$PATH"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd flutter
require_cmd emulator
require_cmd adb

cd "$PROJECT_DIR"

is_device_online() {
  adb devices | awk 'NR>1 {print $1,$2}' | grep -q "^${DEVICE_ID} device$"
}

if ! is_device_online; then
  echo "Starting emulator: ${AVD_NAME}"
  emulator -avd "$AVD_NAME" -no-snapshot-save -no-boot-anim >/tmp/alarm-emulator.log 2>&1 &
fi

echo "Waiting for ${DEVICE_ID}..."
adb -s "$DEVICE_ID" wait-for-device

boot_completed=""
until [[ "$boot_completed" == "1" ]]; do
  sleep 2
  boot_completed="$(adb -s "$DEVICE_ID" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
done

echo "Running Flutter integration tests on ${DEVICE_ID}..."
flutter test integration_test -d "$DEVICE_ID"
