#!/usr/bin/env bash
#
# DEPRECATED: Use 'npm run-script doc' instead.
#
# This is kept as-is for back-compat with Jenkins jobs.
# Don't forward to 'npm run-script' since Jenkins relies on it
# being a symlink.
#
set -e
cd $(dirname $0)/..
jsduck
ln -s ../lib docs/lib
