#!/bin/bash

/usr/local/bin/initialize.sh || exit 1

echo "starting nginx web server..."

set -e

if [[ "$1" == -* ]]; then
    set -- nginx -g daemon off; "$@"
fi

exec "$@"
