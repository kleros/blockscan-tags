#!/bin/bash

cd /home/ubuntu/blockscan-tags

PATH=/home/ubuntu/.volta/bin:$PATH

echo "Using volta version $(volta --version)"
echo "Using node version $(node --version)"
yarn start:kovan