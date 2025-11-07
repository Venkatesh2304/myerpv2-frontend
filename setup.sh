#!/usr/bin/env bash
set -euo pipefail
PROJECT_NAME="myerpv2" # For the service name
PORT=4000

git pull -ff
FRONTEND_DIR="$(cd "$(dirname "$0")" && pwd)"
pm2 delete $PROJECT_NAME-frontend || true
pm2 start "serve -s $FRONTEND_DIR/dist -l $PORT" --name $PROJECT_NAME-frontend
pm2 save