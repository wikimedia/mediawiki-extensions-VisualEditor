#!/bin/bash
cd $HOME/VisualEditor/editcheck/build/editcheck-watcher/
export $(cat .env | xargs)
node index.js
