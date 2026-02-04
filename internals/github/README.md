# Github

This package provides a few functionalities including the following.

1. Use files in this directory to simulate Github's actions locally
2. Some utiliy scripts are used as steps as Github action.

## Prerequisite

- Act

```sh
curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

## Before running

Make sure you have the following hidden files in this directory.

- .env
- .input
- .secrets
- .event.json

For more information, check out https://github.com/nektos/act

## Run

Run at a repository root.

```sh
./internals/github/run_action.sh WORKFLOW_NAME
```

### Files (parameters)

.event.json

```json
{
  "action": "created",
  "issue": {
    "number": 1,
    "pull_request": {
      "url": "https://api.github.com",
      "html_url": "https://github.com"
    }
  },
  "comment": {
    "body": "/typecheck This is a test comment from act.",
    "user": {
      "login": "octocat",
      "id": 1
    }
  },
  "repository": {
    "name": "Hello-World",
    "owner": {
      "login": "octocat"
    }
  },
  "sender": {
    "login": "octocat",
    "id": 1
  }
}
```
