#!/usr/bin/env bash
set -euo pipefail

# This script is intentionally release-directory based: the PM2 process never serves
# from the build directory that npm is currently populating.
DEPLOY_ROOT="${WAO_DEPLOY_ROOT:-/home/wao/htdocs/www.wao.co.il}"
RELEASES_DIR="${WAO_RELEASES_DIR:-$DEPLOY_ROOT/releases}"
CURRENT_RELEASE="$RELEASES_DIR/current"
RUNTIME_DATA_DIR="${WAO_RUNTIME_DATA_DIR:-/home/wao/wao-runtime-data}"
TARGET="${1:-hermes-migration}"

fail() {
  printf 'Deployment aborted: %s\n' "$1" >&2
  exit 1
}

validate_server_actions_key() {
  node -e '
    const value = process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY;
    if (typeof value !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) process.exit(1);
    const decoded = Buffer.from(value, "base64");
    if (![16, 24, 32].includes(decoded.length)) process.exit(1);
  ' || fail 'NEXT_SERVER_ACTIONS_ENCRYPTION_KEY must be base64 for a 16, 24, or 32 byte AES key.'
}

validate_candidate() {
  local candidate="$1"
  local dist="$candidate/.next"
  local standalone="$dist/standalone"

  [[ -s "$dist/BUILD_ID" ]] || fail 'candidate BUILD_ID is missing or empty.'
  [[ -s "$standalone/server.js" ]] || fail 'candidate standalone entrypoint is missing or empty.'
  [[ -d "$dist/static" ]] || fail 'candidate static tree is missing.'
  [[ -L "$standalone/data" && "$(readlink "$standalone/data")" == "$RUNTIME_DATA_DIR" ]] || fail 'candidate runtime-data link is invalid.'

  node - "$dist" <<'NODE' || fail 'candidate manifest references a missing or invalid chunk.'
const fs = require('node:fs');
const path = require('node:path');
const dist = process.argv[2];
const manifests = ['build-manifest.json', 'app-build-manifest.json', 'server/app-paths-manifest.json', 'server/server-reference-manifest.json'];
const files = new Set();
function collect(value) {
  if (typeof value === 'string' && /\.(?:js|mjs)$/.test(value)) files.add(value);
  else if (Array.isArray(value)) value.forEach(collect);
  else if (value && typeof value === 'object') Object.values(value).forEach(collect);
}
for (const manifest of manifests) {
  const file = path.join(dist, manifest);
  if (!fs.existsSync(file)) {
    if (manifest === 'build-manifest.json' || manifest === 'server/app-paths-manifest.json') process.exit(1);
    continue;
  }
  collect(JSON.parse(fs.readFileSync(file, 'utf8')));
}
for (const reference of files) {
  const relative = reference.replace(/^\/_next\//, '').replace(/^_next\//, '');
  const candidates = [path.join(dist, relative), path.join(dist, 'server', relative)];
  const chunk = candidates.find((candidate) => fs.existsSync(candidate));
  if (!chunk || fs.statSync(chunk).size === 0 || /^\s*</.test(fs.readFileSync(chunk, 'utf8'))) process.exit(1);
}
NODE
}

restore_previous_release() {
  local previous="$1"
  [[ -n "$previous" && -d "$previous" && -s "$previous/.next/standalone/server.js" ]] || return 1
  ln -sfn "$previous" "$CURRENT_RELEASE"
  pm2 start "$previous/.next/standalone/server.js" --name wao --update-env
}

cd "$DEPLOY_ROOT"
[[ -f .env.production ]] || fail 'missing server-local .env.production.'
set -a
source .env.production
set +a

[[ -n "${CLIENT_PORTAL_SECRET:-}" ]] || fail 'CLIENT_PORTAL_SECRET must be set.'
[[ -n "${NEXT_SERVER_ACTIONS_ENCRYPTION_KEY:-}" ]] || fail 'NEXT_SERVER_ACTIONS_ENCRYPTION_KEY must be set.'
validate_server_actions_key

# Do not resolve or switch a target from a dirty checkout: an immutable release must map
# to a single exact source commit.
[[ -z "$(git status --porcelain)" ]] || fail 'checkout is dirty.'
git fetch --all --tags
if git rev-parse --verify --quiet "origin/$TARGET^{commit}" >/dev/null; then
  RESOLVED_TARGET="origin/$TARGET^{commit}"
elif git rev-parse --verify --quiet "$TARGET^{commit}" >/dev/null; then
  RESOLVED_TARGET="$TARGET^{commit}"
else
  fail 'deploy target does not resolve to a commit.'
fi
git checkout --detach "$RESOLVED_TARGET"
COMMIT="$(git rev-parse HEAD)"
[[ "$COMMIT" =~ ^[0-9a-f]{40}$ ]] || fail 'resolved commit is invalid.'
[[ -z "$(git status --porcelain)" ]] || fail 'checkout became dirty after target resolution.'
DEPLOYMENT_ID="git-${COMMIT}"
export NEXT_DEPLOYMENT_ID="$DEPLOYMENT_ID"
printf 'Preparing deployment %s from commit %s\n' "$DEPLOYMENT_ID" "$COMMIT"

mkdir -p "$RELEASES_DIR" "$RUNTIME_DATA_DIR"
[[ -L "$CURRENT_RELEASE" ]] || fail 'current release link is required for recoverable activation.'
PREVIOUS_RELEASE="$(readlink -f "$CURRENT_RELEASE")"
[[ "$PREVIOUS_RELEASE" == "$RELEASES_DIR"/* && -d "$PREVIOUS_RELEASE" ]] || fail 'current release is outside the release directory.'
[[ -s "$PREVIOUS_RELEASE/.next/standalone/server.js" ]] || fail 'current release is not rollback-capable.'

CANDIDATE="$(mktemp -d "$RELEASES_DIR/.candidate-${COMMIT:0:12}-XXXXXX")"
[[ "$CANDIDATE" == "$DEPLOY_ROOT/"* ]] || fail 'release directory must remain under the deployment root.'
DEPLOY_DIST_DIR="${CANDIDATE#"$DEPLOY_ROOT"/}/.next"
cleanup_candidate() {
  [[ -d "$CANDIDATE" && "$(dirname "$CANDIDATE")" == "$RELEASES_DIR" && "$(basename "$CANDIDATE")" == .candidate-* ]] && rm -rf -- "$CANDIDATE"
}
trap cleanup_candidate EXIT

npm ci
WAO_DEPLOY_DIST_DIR="$DEPLOY_DIST_DIR" npm run build
mkdir -p "$CANDIDATE/.next/standalone/.next"
cp -a public "$CANDIDATE/.next/standalone/public"
cp -a "$CANDIDATE/.next/static" "$CANDIDATE/.next/standalone/.next/static"
# The application package is ESM, while Next's generated standalone server is
# CommonJS. Keep the release-local runtime boundary explicit.
printf '{"type":"commonjs"}\n' > "$CANDIDATE/.next/standalone/package.json"
ln -s "$RUNTIME_DATA_DIR" "$CANDIDATE/.next/standalone/data"
validate_candidate "$CANDIDATE"

RELEASE="$RELEASES_DIR/release-${COMMIT:0:12}-$(date +%s)"
mv "$CANDIDATE" "$RELEASE"
CANDIDATE=""
trap - EXIT

pm2 stop wao
ln -sfn "$RELEASE" "$CURRENT_RELEASE"
if ! pm2 start "$RELEASE/.next/standalone/server.js" --name wao --update-env \
  || ! curl --fail --silent --show-error --max-time 15 --output /dev/null http://127.0.0.1:3000/client/login \
  || ! node scripts/verify-google-ads-sandbox.mjs; then
  printf 'Activation failed; restoring the previous release.\n' >&2
  restore_previous_release "$PREVIOUS_RELEASE" || fail 'activation failed and rollback could not restart the previous release.'
  exit 1
fi

printf 'Activated deployment %s from commit %s\n' "$DEPLOYMENT_ID" "$COMMIT"