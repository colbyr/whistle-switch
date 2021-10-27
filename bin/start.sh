#!/bin/sh
trap "kill 0" EXIT

echo "🚧 starting vite..."
yarn dev --port 6767 > /dev/null 2>&1 &

sleep 1

echo "🦾 starting puppeteer!"
node whistlee-headless/index.js

