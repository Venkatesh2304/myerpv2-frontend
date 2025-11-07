#!/usr/bin/env bash
set -euo pipefail
PROJECT_NAME="myerpv2" # For the service name
PORT=4000

git pull -ff
FRONTEND_DIR="$(cd "$(dirname "$0")" && pwd)"
pm2 delete $PROJECT_NAME-frontend || true
npm i
npm run build
pm2 start "cd $FRONTEND_DIR && npm run start" --name $PROJECT_NAME-frontend
pm2 save