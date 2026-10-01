#!/usr/bin/env bash
set -euo pipefail

# This script is intentionally release-directory based: the PM2 process never serves
# from the build directory that npm is currently populating.
DEPLOY_ROOT="${WAO_DEPLOY_ROOT:-/home/wao/htdocs/www.wao.co.il}"
RELEASES_DIR="${WAO_RELEASES_DIR:-$DEPLOY_ROOT/releases}"
CURRENT_RELEASE="$RELEASES_DIR/current"
RUNTIME_DATA_DIR="${WAO_RUNTIME_DATA_DIR:-/home/wao/wao-runtime-data}"
TARGET="${1:-hermes-migration}"
BUILD_MAX_OLD_SPACE_MB="${WAO_BUILD_MAX_OLD_SPACE_MB:-1536}"

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

validate_build_memory_limit() {
  [[ "$BUILD_MAX_OLD_SPACE_MB" =~ ^[1-9][0-9]{2,3}$ ]] \
    && (( 10#$BUILD_MAX_OLD_SPACE_MB >= 512 && 10#$BUILD_MAX_OLD_SPACE_MB <= 3072 )) \
    || fail 'WAO_BUILD_MAX_OLD_SPACE_MB must be an integer from 512 through 3072.'
  [[ ! "${NODE_OPTIONS:-}" =~ (^|[[:space:]])--max-old-space-size(=|[[:space:]]|$) ]] \
    || fail 'NODE_OPTIONS must not set --max-old-space-size; use WAO_BUILD_MAX_OLD_SPACE_MB.'
}

validate_candidate() {
  local candidate="$1"
  local dist="$candidate/.next"
  local standalone="$dist/standalone"

  [[ -s "$dist/BUILD_ID" ]] || fail 'candidate BUILD_ID is missing or empty.'
  [[ -s "$standalone/server.js" ]] || fail 'candidate standalone entrypoint is missing or empty.'
  [[ -d "$dist/static" ]] || fail 'candidate static tree is missing.'
  [[ -s "$standalone/public/eitan-yariv.avif" ]] || fail 'candidate standalone public assets are missing or nested.'
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

replace_wao_process() {
  local release="$1"
  local standalone="$release/.next/standalone"

  [[ -d "$standalone" && -s "$standalone/server.js" ]] || return 1
  pm2 delete wao >/dev/null 2>&1 || true
  # Do not reintroduce `pm2 stop wao`: deletion is required to remove duplicates.
  pm2 start "$standalone/server.js" --name wao --update-env --cwd "$standalone"
}

verify_active_release() {
  local release="$1"

  pm2 jlist | node -e '
const fs = require("node:fs");
const path = require("node:path");
const release = fs.realpathSync(process.argv[1]);
const standalone = path.join(release, ".next", "standalone");
const expectedEntry = path.join(standalone, "server.js");
const processes = JSON.parse(fs.readFileSync(0, "utf8")).filter((process) => process.name === "wao");
if (processes.length !== 1 || processes[0].pm2_env?.status !== "online") process.exit(1);
const processInfo = processes[0].pm2_env ?? {};
if (fs.realpathSync(processInfo.pm_exec_path) !== expectedEntry || fs.realpathSync(processInfo.pm_cwd) !== standalone) process.exit(1);
' "$release"
}

verify_homepage_assets() {
  local homepage asset expected
  homepage="$(curl --fail --silent --show-error --max-time 15 http://127.0.0.1:3000/)" || return 1

  while IFS=$'\t' read -r asset expected; do
    [[ -n "$asset" && "$asset" == /_next/* ]] || return 1
    curl --fail --silent --show-error --max-time 15 -D - "http://127.0.0.1:3000$asset" | node -e '
      const fs = require("node:fs");
      const expected = process.argv[1];
      const response = fs.readFileSync(0);
      const separator = response.indexOf(Buffer.from("\r\n\r\n"));
      const fallback = response.indexOf(Buffer.from("\n\n"));
      const boundary = separator >= 0 ? separator + 4 : fallback >= 0 ? fallback + 2 : -1;
      if (boundary < 0) process.exit(1);
      const headers = response.subarray(0, boundary).toString("latin1");
      const body = response.subarray(boundary);
      const contentType = (headers.match(/^content-type:\s*([^;\r\n]+)/im) || [])[1] || "";
      if (body.length === 0 || /^\s*</.test(body.toString("utf8")) || (expected === "css" ? !/^text\/css$/i.test(contentType) : !/^(?:application|text)\/(?:javascript|ecmascript)$/i.test(contentType))) process.exit(1);
    ' "$expected" || return 1
  done < <(printf '%s' "$homepage" | node -e '
    const fs = require("node:fs");
    const html = fs.readFileSync(0, "utf8");
    const references = [];
    for (const match of html.matchAll(/<link\b[^>]*\brel=["\x27]stylesheet["\x27][^>]*\bhref=["\x27]([^"\x27]+)["\x27][^>]*>/gi)) if (match[1].startsWith("/_next/")) references.push([match[1], "css"]);
    for (const match of html.matchAll(/<script\b[^>]*\bsrc=["\x27]([^"\x27]+)["\x27][^>]*>/gi)) if (match[1].startsWith("/_next/")) references.push([match[1], "js"]);
    if (!references.some(([, expected]) => expected === "css")) process.exit(1);
    for (const reference of references) process.stdout.write(`${reference.join("\t")}\n`);
  ')
}

restore_previous_release() {
  local previous="$1"
  [[ -n "$previous" && -d "$previous" && -s "$previous/.next/standalone/server.js" ]] || return 1
  pm2 delete wao >/dev/null 2>&1 || true
  ln -sfn "$previous" "$CURRENT_RELEASE"
  replace_wao_process "$previous" \
    && verify_active_release "$previous" \
    && curl --fail --silent --show-error --max-time 15 --output /dev/null http://127.0.0.1:3000/client/login \
    && verify_homepage_assets
}

cd "$DEPLOY_ROOT"
[[ -f .env.production ]] || fail 'missing server-local .env.production.'
set -a
source .env.production
set +a

[[ -n "${CLIENT_PORTAL_SECRET:-}" ]] || fail 'CLIENT_PORTAL_SECRET must be set.'
[[ -n "${NEXT_SERVER_ACTIONS_ENCRYPTION_KEY:-}" ]] || fail 'NEXT_SERVER_ACTIONS_ENCRYPTION_KEY must be set.'
validate_server_actions_key
validate_build_memory_limit
BUILD_NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=$BUILD_MAX_OLD_SPACE_MB"

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
TSCONFIG_BACKUP="$(mktemp "$DEPLOY_ROOT/.tsconfig-deploy-XXXXXX")"
cp -p tsconfig.json "$TSCONFIG_BACKUP"
cleanup_candidate() {
  [[ -d "$CANDIDATE" && "$(dirname "$CANDIDATE")" == "$RELEASES_DIR" && "$(basename "$CANDIDATE")" == .candidate-* ]] && rm -rf -- "$CANDIDATE"
  if [[ -f "$TSCONFIG_BACKUP" ]]; then
    cmp -s "$TSCONFIG_BACKUP" tsconfig.json || cp -p "$TSCONFIG_BACKUP" tsconfig.json
    rm -f -- "$TSCONFIG_BACKUP"
  fi
}
trap cleanup_candidate EXIT

npm ci
printf 'Building with Webpack and Node old-space limit %s MiB\n' "$BUILD_MAX_OLD_SPACE_MB"
WAO_DEPLOY_DIST_DIR="$DEPLOY_DIST_DIR" NODE_OPTIONS="$BUILD_NODE_OPTIONS" npm run build -- --webpack
mkdir -p "$CANDIDATE/.next/standalone/.next"
mkdir -p "$CANDIDATE/.next/standalone/public"
cp -a public/. "$CANDIDATE/.next/standalone/public/"
cp -a "$CANDIDATE/.next/static" "$CANDIDATE/.next/standalone/.next/static"
# The application package is ESM, while Next's generated standalone server is
# CommonJS. Keep the release-local runtime boundary explicit.
printf '{"type":"commonjs"}\n' > "$CANDIDATE/.next/standalone/package.json"
rm -rf -- "$CANDIDATE/.next/standalone/data"
ln -s "$RUNTIME_DATA_DIR" "$CANDIDATE/.next/standalone/data"
validate_candidate "$CANDIDATE"

RELEASE="$RELEASES_DIR/release-${COMMIT:0:12}-$(date +%s)"
mv "$CANDIDATE" "$RELEASE"
CANDIDATE=""

ln -sfn "$RELEASE" "$CURRENT_RELEASE"
if ! replace_wao_process "$RELEASE" \
  || ! verify_active_release "$RELEASE" \
  || ! curl --fail --silent --show-error --max-time 15 --output /dev/null http://127.0.0.1:3000/client/login \
  || ! verify_homepage_assets \
  || ! node scripts/verify-google-ads-sandbox.mjs; then
  printf 'Activation failed; restoring the previous release.\n' >&2
  restore_previous_release "$PREVIOUS_RELEASE" || fail 'activation failed and rollback verification failed.'
  exit 1
fi

printf 'Activated deployment %s from commit %s\n' "$DEPLOYMENT_ID" "$COMMIT"