#!/usr/bin/env bash
set -e
git pull -ff
npm i
npm run build
pm2 restart myerpv2-frontend