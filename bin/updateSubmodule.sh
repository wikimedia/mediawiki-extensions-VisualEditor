#!/bin/bash -eu

# This script generates a commit that updates the lib/ve submodule
# ./bin/updateSubmodule.sh        updates to master
# ./bin/updateSubmodule.sh hash   updates to specified hash

# cd to the VisualEditor directory
cd $(cd $(dirname $0)/..; pwd)

# Check that both working directories are clean
if git status -uno --ignore-submodules | grep -i changes > /dev/null
then
	echo >&2 "Working directory must be clean"
	exit 1
fi
cd lib/ve
if git status -uno --ignore-submodules | grep -i changes > /dev/null
then
	echo >&2 "lib/ve working directory must be clean"
	exit 1
fi
cd ../..

# Use 'gerrit' if it exists, otherwise 'origin'
MW_REMOTE=$(git remote | grep -w gerrit || echo origin)

git fetch $MW_REMOTE
# Create sync-repos branch if needed and reset it to master
git checkout -B sync-repos $MW_REMOTE/master
git submodule update
cd lib/ve

CORE_REMOTE=$(git remote | grep -w gerrit || echo origin)

git fetch $CORE_REMOTE

# Figure out what to set the submodule to
if [ -n "${1:-}" ]
then
	TARGET="$1"
	TARGETDESC="$1"
else
	TARGET=$CORE_REMOTE/master
	TARGETDESC="master ($(git rev-parse --short $CORE_REMOTE/master))"
fi

# Generate commit summary
# TODO recurse
NEWCHANGES=$(git log ..$TARGET --oneline --no-merges --topo-order --reverse --color=never)
TASKS=$(git log ..$TARGET --no-merges --format=format:%B | grep "Bug: T" | sort | uniq)
NEWCHANGESDISPLAY=$(git log ..$TARGET --oneline --no-merges --reverse --color=always)
NEW_I18N_KEYS=$(git diff --color=never HEAD..$TARGET -- i18n/en.json | grep '^+' | grep -v '^+++' | sed -E 's/^\+\s*"([^"]+)":.*/\1/')
NEW_FILES=$(git diff --color=never HEAD..$TARGET --name-only --diff-filter=A)

COMMITMSG="Update VE core submodule to $TARGETDESC

New changes:
$NEWCHANGES"

if [ -n "$NEW_I18N_KEYS" ]; then
	COMMITMSG+="

New i18n keys:
$NEW_I18N_KEYS"
fi

if [ -n "$NEW_FILES" ]; then
	COMMITMSG+="

New files:
$NEW_FILES"
fi

COMMITMSG+="

$TASKS"

echo "$COMMITMSG"
exit 1
# Check out master of VE core
git checkout $TARGET

# Commit
cd ../..
git commit lib/ve -m "$COMMITMSG" > /dev/null
if [ "$?" == "1" ]
then
	echo >&2 "No changes"
else
	cat >&2 <<END


Created commit with changes:
$NEWCHANGESDISPLAY
END
fi
