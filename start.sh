#!/bin/bash
set -e
trap "kill 0" EXIT

SOURCE=${BASH_SOURCE[0]}
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
  DIR=$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )
  SOURCE=$(readlink "$SOURCE")
  [[ $SOURCE != /* ]] && SOURCE=$DIR/$SOURCE # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
DIR=$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )

PORT=${WHISTLE_SWITCH_LISTENER_PORT:=6767}

echo "🚧 starting listener..."
VITE_WHISTLE_SWITCH_DEBUG=$WHISTLE_SWITCH_DEBUG\
  $DIR/node_modules/.bin/vite --port $PORT $DIR > /dev/null 2>&1 &

sleep 1

echo "🦾 starting controller!"
node "$DIR/src/controller.js"

