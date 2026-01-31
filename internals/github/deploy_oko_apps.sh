#!/bin/bash

# This should be run at the repository root level
YARN_LOCK="./yarn.lock"

if [ -f "$FILE_PATH" ]; then
    echo "File '$FILE_PATH' exists and is a regular file."
else
    echo "File '$FILE_PATH' does not exist or is not a regular file."
fi

act --workflows ".github/workflows/deploy_oko_apps.yml" \
    --input tag=develop/v0.0.1 \
    --secret-file "./internals/github/.secrets" \
    --var-file "./internals/github/.vars" \
    --input-file "./internals/github/.input" \
    --env-file "./internals/github/.env" \
    -s ACTIONS_STEP_DEBUG=true \
    --container-architecture linux/amd64
