#!/bin/bash

# This should be run at the repository root level

if [ -z "$1" ]; then
    echo "Usage: $0 <filename>"
    echo "Example: $0 deploy_oko_apps.yml"
    exit 1
fi

WORKFLOW_FILE=".github/workflows/$1"

if [ -f "$WORKFLOW_FILE" ]; then
    echo "Running workflow: $WORKFLOW_FILE"
else
    echo "File '$WORKFLOW_FILE' does not exist or is not a regular file."
    exit 1
fi

act --workflows "$WORKFLOW_FILE" \
    --secret-file "./internals/github/.secrets" \
    --var-file "./internals/github/.vars" \
    --input-file "./internals/github/.input" \
    --env-file "./internals/github/.env" \
    --eventpath "./internals/github/.event.json" \
    -s ACTIONS_STEP_DEBUG=true \
    --container-architecture linux/amd64
