#!/bin/bash
set -e
trap "kill 0" EXIT

# finds out where the script actually lives
pushd . > /dev/null
SCRIPT_PATH="${BASH_SOURCE[0]}"
if ([ -h "${SCRIPT_PATH}" ]); then
  while([ -h "${SCRIPT_PATH}" ]); do cd "$(dirname "$SCRIPT_PATH")";
  SCRIPT_PATH=$(readlink "${SCRIPT_PATH}"); done
fi
cd "$(dirname ${SCRIPT_PATH})" > /dev/null
SCRIPT_PATH=$(pwd);
popd  > /dev/null

PORT=${WHISTLE_SWITCH_LISTENER_PORT:=6767}

echo "🚧 starting listener..."
$SCRIPT_PATH/node_modules/.bin/vite --port $PORT $SCRIPT_PATH > /dev/null 2>&1 &

sleep 1

echo "🦾 starting controller!"
node "$SCRIPT_PATH/src/controller.js"

