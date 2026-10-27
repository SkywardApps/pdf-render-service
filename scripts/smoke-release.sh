#!/usr/bin/env bash
# Smoke-test a built pdf_release image before it is published.
#
#   scripts/smoke-release.sh <image> [host-port]
#
# Starts the container and checks: GET / is healthy, a sample render returns
# 200 application/pdf starting with %PDF-, a bad payload returns 400, the
# process is not root, Node is v24, and renders leave nothing new in the
# container's temp dir. Exits non-zero on the first failure.
set -euo pipefail

IMAGE=${1:?usage: smoke-release.sh <image> [host-port]}
PORT=${2:-9000}
BASE="http://127.0.0.1:${PORT}"
NAME="pdf-smoke-$$"
WORK=$(mktemp -d)

cleanup() {
  status=$?
  if [ "$status" -ne 0 ]; then
    echo "--- container logs ---"
    docker logs "$NAME" 2>&1 | tail -50 || true
  fi
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  rm -rf "$WORK"
  exit "$status"
}
trap cleanup EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "ok: $*"; }

docker run -d --name "$NAME" -p "127.0.0.1:${PORT}:9000" "$IMAGE" >/dev/null

# Health: wait up to 30 s for GET / to answer SUCCESS.
health=""
for _ in $(seq 1 60); do
  health=$(curl -sf --max-time 10 "$BASE/" || true)
  [ "$health" = "SUCCESS" ] && break
  sleep 0.5
done
[ "$health" = "SUCCESS" ] || fail "GET / did not return SUCCESS (got '$health')"
pass "GET / returned SUCCESS"

# Runtime: non-root user, Node 24.
uid=$(docker exec "$NAME" id -u)
user=$(docker exec "$NAME" id -un)
[ "$uid" != "0" ] || fail "container runs as root"
pass "runs as $user (uid $uid)"

node_version=$(docker exec "$NAME" node --version)
case "$node_version" in
  v24.*) pass "node $node_version" ;;
  *) fail "expected Node v24, got $node_version" ;;
esac

# Snapshot the temp dir before rendering so pre-existing image files don't count.
tmp_dir=$(docker exec "$NAME" node -p 'require("os").tmpdir()')
docker exec "$NAME" sh -c "ls -A '$tmp_dir'" | sort > "$WORK/tmp-before"

# Sample render (the getting-started example).
hello='{"title":"Hello World","size":"LETTER","orientation":"portrait","data":{"name":"World"},"pages":[{"type":"page","style":{"padding":36},"children":[{"type":"text","text":"Hello, {{data.name}}!","style":{"fontSize":24}}]}]}'
for i in 1 2 3; do
  meta=$(curl -s --max-time 10 -o "$WORK/hello.pdf" -w '%{http_code} %{content_type}' \
    -H 'Content-Type: application/json' -d "$hello" "$BASE/")
  code=${meta%% *}
  ctype=${meta#* }
  [ "$code" = "200" ] || fail "render $i returned HTTP $code"
  case "$ctype" in
    application/pdf*) ;;
    *) fail "render $i returned Content-Type '$ctype'" ;;
  esac
  magic=$(head -c 5 "$WORK/hello.pdf")
  [ "$magic" = "%PDF-" ] || fail "render $i body does not start with %PDF- (got '$magic')"
done
pass "3 renders returned 200 application/pdf with %PDF- ($(wc -c < "$WORK/hello.pdf") bytes)"

# Bad payload: a child with no type and no discriminator cannot be inferred.
bad='{"pages":[{"children":[{"type":"view","children":[{}]}]}]}'
code=$(curl -s --max-time 10 -o "$WORK/bad.txt" -w '%{http_code}' -H 'Content-Type: application/json' -d "$bad" "$BASE/")
[ "$code" = "400" ] || fail "bad payload returned HTTP $code, expected 400"
pass "bad payload returned 400"

# Temp dir: renders must not leave files behind.
docker exec "$NAME" sh -c "ls -A '$tmp_dir'" | sort > "$WORK/tmp-after"
new_entries=$(comm -13 "$WORK/tmp-before" "$WORK/tmp-after")
[ -z "$new_entries" ] || fail "renders left files in $tmp_dir: $new_entries"
pass "no new entries in $tmp_dir after renders"

echo "smoke test passed: $IMAGE"
