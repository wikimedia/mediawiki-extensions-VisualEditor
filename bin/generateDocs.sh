#!/usr/bin/env bash
set -e
cd $(dirname $0)/..
jsduck
ln -s ../lib docs/lib
