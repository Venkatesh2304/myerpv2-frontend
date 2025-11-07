#!/bin/bash
set -e
git pull -ff
pm2 restart myerpv2-frontend