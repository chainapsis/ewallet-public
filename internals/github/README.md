# Github

This package provides a few functionalities including the following.

1. Use files in this directory to simulate Github's actions locally
2. Some utiliy scripts are used as steps as Github action.

## Before running,

Make sure you have the following hidden files in this directory.

- .env
- .input
- .secrets

For more information, check out https://github.com/nektos/act

## Run

Run at a repository root.

```sh
./internals/github/run_action.sh WORKFLOW_NAME
```
