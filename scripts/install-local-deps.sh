#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
NVM_VERSION="${NVM_VERSION:-v0.40.3}"
NODE_VERSION=24

usage() {
  cat <<'EOF'
Install the user-level tools and npm packages needed to run Presentalia.

Usage:
  ./scripts/install-local-deps.sh

Installs nvm (if missing), Node.js 24, project npm dependencies, and the
Supabase CLI. Requires curl, git, and a running Docker Desktop/Engine because
the local Supabase stack runs in containers. Docker installation itself is
system-specific and may require administrator privileges.
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

OS="$(uname -s)"
if [[ "$OS" != "Linux" && "$OS" != "Darwin" ]]; then
  echo "This installer supports Linux and macOS (found: $OS)." >&2
  exit 1
fi

for command_name in curl git; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing prerequisite: $command_name. Install it with your OS package manager, then rerun this script." >&2
    exit 1
  fi
done

if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  echo "Installing nvm $NVM_VERSION into $NVM_DIR..."
  installer="$(mktemp)"
  trap 'rm -f "$installer"' EXIT
  curl -fsSL \
    "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" \
    -o "$installer"
  NVM_DIR="$NVM_DIR" bash "$installer"
fi

if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  echo "nvm installation did not create $NVM_DIR/nvm.sh." >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$NVM_DIR/nvm.sh"
nvm install "$NODE_VERSION"
nvm alias default "$NODE_VERSION" >/dev/null
nvm use "$NODE_VERSION"

cd "$ROOT_DIR"
npm ci
npx --no-install supabase --version

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker Desktop/Engine is required for local Supabase. Install it, then rerun this script." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "Docker is installed but its daemon is not accessible. Start Docker Desktop/Engine and rerun this script." >&2
  exit 1
fi

echo
echo "Local dependencies are installed."
echo "Next: run ./scripts/run-local.sh to start Supabase and Presentalia."
