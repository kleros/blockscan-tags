# Blockscan Tags

Checks Curate for contract tags and posts them to an endpoint. Works nicely with cron.

> Note: At the time of publication, there is no endpoint that lets us check if a given tag was already posted, so we keep a local DB to avoid posting the same tag again. Losing this database means the tool will submit everything again.

## Running

Duplicate `.env.example` and fill the env variables. You can use network specific files such as `.env.kovan` and then `yarn start:kovan`.

## Debugging

If using vscode, use the following to debug.

.vscode/launch.json:

```
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Typescript Server",
      "protocol": "inspector",
      "port": 9229,
      "restart": true,
      "localRoot": "${workspaceFolder}",
      "remoteRoot": "."
    }
  ]
}

```
