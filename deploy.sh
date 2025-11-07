#!/usr/bin/env bash
set -euo pipefail

export $(grep -v '^#' .env | xargs)

echo "[+] Using API base URL: $NEXT_PUBLIC_API_BASE_URL"

# echo "[+] Cleaning previous build"
# rm -rf .next dist out

# echo "[+] Building Next.js"
# npm run build


REMOTE_HOST="ubuntu@43.205.224.85"
REMOTE_PATH="~/myerpv2/frontend/dist"
SSH_KEY="/home/venkatesh/Downloads/aws/LightsailDefaultKey-ap-south-1.pem"

echo "[+] Deploying via scp to $REMOTE_HOST:$REMOTE_PATH"
ssh -i "$SSH_KEY" "$REMOTE_HOST" "mkdir -p $(dirname "$REMOTE_PATH")"
rsync -avz -e "ssh -i $SSH_KEY" dist/ "$REMOTE_HOST:$REMOTE_PATH/"
pm2 start serve --name myerpv2 -- /home/ubuntu/myerpv2/frontend/dist -s -l 3000
pm2

echo "[✓] Deployment complete"
