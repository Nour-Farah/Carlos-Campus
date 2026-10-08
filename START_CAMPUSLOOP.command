#!/bin/sh
set -eu
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
 echo "Install Node.js 22 LTS or newer from https://nodejs.org, then rerun this script."
 exit 1
fi
if [ ! -d node_modules ]; then npm install; fi
npm run setup
npm start
