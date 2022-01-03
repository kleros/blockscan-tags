# Blockscan Tags

Checks Curate for contract tags and posts them to an endpoint. Works nicely with cron.

> Note: At the time of publication, there is no endpoint that lets us check if a given tag was already posted, so we keep a local DB to avoid posting the same tag again. Losing this database means the tool will submit everything again.

## Volta

This project uses `volta.sh` for node version management. See `package.json` for the version.

## Running

Duplicate `.env.example` and fill the env variables. You can use network specific files such as `.env.kovan` and then `yarn start:kovan`.

## Cron Job

This script plays well with cron. Here is a suggetsion on how to use it with `volta.sh`.

1- In the project folder, `vim script-mainnet.sh` paste the following and save.
2- Paste the following:

```
#!/bin/bash

cd /home/ubuntu/blockscan-tags

PATH=/home/ubuntu/.volta/bin:$PATH

echo "Using volta version $(volta --version)"
echo "Using node version $(node --version)"
yarn start:mainnet
```

3- Give script execution rights `chmod +x script-mainnet.sh`.
4- Setup the cron job: `crontab -e` and add `6 17 * * * cd ~/blockscan-tags && ./script-mainnet.sh >> output-mainnet.log 2>&1`

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
