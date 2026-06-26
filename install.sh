#!/bin/bash
# AI Cost Monitor — installer for UlanziDeck
# Usage: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/narlei/ulanzideck-ai-cost/main/install.sh)"
set -euo pipefail

PLUGIN_ID="com.narlei.aicost.ulanziPlugin"
GITHUB_REPO="narlei/ulanzideck-ai-cost"
PLUGINS_DIR="$HOME/Library/Application Support/Ulanzi/UlanziDeck/Plugins"
APP_NAME="Ulanzi Studio"
APP_PATH="/Applications/${APP_NAME}.app"

# ── colors ──────────────────────────────────────────────────────────────────
tty_bold=''
tty_blue=''
tty_green=''
tty_yellow=''
tty_red=''
tty_reset=''
if [[ -t 1 ]]; then
  tty_bold=$'\033[1m'
  tty_blue=$'\033[34m'
  tty_green=$'\033[32m'
  tty_yellow=$'\033[33m'
  tty_red=$'\033[31m'
  tty_reset=$'\033[0m'
fi

step()  { echo "${tty_blue}==>${tty_reset} ${tty_bold}$*${tty_reset}"; }
ok()    { echo "${tty_green}  ✓${tty_reset} $*"; }
warn()  { echo "${tty_yellow}  !${tty_reset} $*"; }
abort() { echo "${tty_red}Error:${tty_reset} $*" >&2; exit 1; }

# ── preflight ────────────────────────────────────────────────────────────────
[[ "$(uname)" == "Darwin" ]] || abort "AI Cost Monitor requires macOS."

[[ -d "$APP_PATH" ]] || abort \
  "Ulanzi Studio not found at $APP_PATH. Install it first: https://www.ulanzi.com/pages/download"

# ── resolve download URL ─────────────────────────────────────────────────────
step "Checking latest release..."
LATEST_URL="https://github.com/${GITHUB_REPO}/releases/latest/download/${PLUGIN_ID}.zip"
# Verify the URL resolves (redirect check only, no download yet)
HTTP_CODE=$(curl -fsSL -o /dev/null -w "%{http_code}" -L --max-redirs 5 "$LATEST_URL" 2>/dev/null) || true
[[ "$HTTP_CODE" == "200" ]] || abort "Could not reach $LATEST_URL (HTTP $HTTP_CODE). Is the release published?"

# ── download ─────────────────────────────────────────────────────────────────
step "Downloading AI Cost Monitor..."
TMP_ZIP=$(mktemp /tmp/aicost-XXXXXX.zip)
trap 'rm -f "$TMP_ZIP"; rm -rf "${TMP_DIR:-}"' EXIT

curl -fsSL --progress-bar -L "$LATEST_URL" -o "$TMP_ZIP"
ok "Downloaded $(du -h "$TMP_ZIP" | cut -f1)"

# ── install ──────────────────────────────────────────────────────────────────
step "Installing to UlanziDeck plugins..."
TMP_DIR=$(mktemp -d /tmp/aicost-XXXXXX)
unzip -q "$TMP_ZIP" -d "$TMP_DIR"

[[ -d "$TMP_DIR/$PLUGIN_ID" ]] || abort "Unexpected ZIP structure — expected $PLUGIN_ID/ at root."

mkdir -p "$PLUGINS_DIR"
rm -rf "${PLUGINS_DIR:?}/$PLUGIN_ID"
mv "$TMP_DIR/$PLUGIN_ID" "$PLUGINS_DIR/$PLUGIN_ID"
ok "Installed to $PLUGINS_DIR/$PLUGIN_ID"

# ── node version check (informational only) ───────────────────────────────────
NODE_OK=false
for candidate in /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node node; do
  if command -v "$candidate" &>/dev/null; then
    MAJOR=$("$candidate" --version 2>/dev/null | grep -oE '[0-9]+' | head -1)
    if [[ "${MAJOR:-0}" -ge 22 ]]; then
      NODE_OK=true
      break
    fi
  fi
done
if [[ "$NODE_OK" == "false" ]]; then
  warn "Node.js ≥ 22 not found in common paths."
  warn "The plugin needs it to calculate costs. Install via: brew install node"
fi

# ── restart UlanziDeck ────────────────────────────────────────────────────────
step "Restarting ${APP_NAME}..."
osascript -e "tell application \"${APP_NAME}\" to quit" >/dev/null 2>&1 || true
# wait for it to actually quit (up to 6s)
for _ in 1 2 3 4 5 6; do
  pgrep -f "${APP_PATH}/" >/dev/null 2>&1 || break
  sleep 1
done
pkill -f "${APP_PATH}/" >/dev/null 2>&1 || true
sleep 1
open -a "${APP_NAME}"
ok "${APP_NAME} restarted"

# ── done ─────────────────────────────────────────────────────────────────────
echo ""
echo "${tty_bold}${tty_green}AI Cost Monitor installed!${tty_reset}"
echo "Open UlanziDeck, find ${tty_bold}AI Cost${tty_reset} in the plugin drawer,"
echo "and drag a button to your deck to get started."
echo ""
echo "Docs & setup guide: https://github.com/${GITHUB_REPO}#setup"
