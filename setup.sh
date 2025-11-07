#!/usr/bin/env bash
set -euo pipefail
PROJECT_NAME="myerpv2" # For the service name
PORT=3000

git pull -ff
FRONTEND_DIR="$(cd "$(dirname "$0")" && pwd)"
pm2 start "serve -s $FRONTEND_DIR -l $PORT" --name $PROJECT_NAME-frontend
pm2 save