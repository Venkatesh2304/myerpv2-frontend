#!/usr/bin/env bash
set -euo pipefail

export $(grep -v '^#' .env | xargs)

echo "[+] Using API base URL: $NEXT_PUBLIC_API_BASE_URL"


REMOTE_HOST="ubuntu@43.205.224.85"
SSH_KEY="/home/venkatesh/Downloads/aws/LightsailDefaultKey-ap-south-1.pem"
REMOTE_DIR="/home/ubuntu/myerpv2/frontend"

echo "==> Checking git status (must be clean)"
if [ -n "$(git status --porcelain)" ]; then
  echo "Uncommitted/untracked changes present. Commit/stash before deploying."
  exit 1
fi

echo "[+] Cleaning previous build"
rm -rf .next dist out

echo "[+] Building Next.js"
npm run build

git add * 
git commit -m "Build frontend"

echo "==> Pushing to remote"
git push origin main -f

echo "==> SSH to server"
ssh -i "$SSH_KEY" "$REMOTE_HOST" bash <<EOF
  set -euo pipefail
  cd "$REMOTE_DIR"
  echo "[Remote] Running sync.sh..."
  bash sync.sh
EOF

echo "==> ✅ Remote sync completed successfully"