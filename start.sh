#!/bin/sh
trap "kill 0" EXIT

DIR=$(dirname "$0")

PORT=${WHISTLE_SWITCH_LISTENER_PORT:=6767}

echo "🚧 starting listener..."
$DIR/node_modules/.bin/vite --port $PORT $DIR > /dev/null 2>&1 &

sleep 1

echo "🦾 starting controller!"
node "$DIR/src/controller.js"

