#!/bin/sh
trap "kill 0" EXIT

DIR=$(pwd)

echo "🚧 starting vite..."
$DIR/node_modules/.bin/vite --port 6767 > /dev/null 2>&1 &

sleep 1

echo "🦾 starting puppeteer!"
node "$DIR/src/controller.js"

