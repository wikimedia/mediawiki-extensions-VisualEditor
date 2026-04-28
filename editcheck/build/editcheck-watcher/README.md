# EditCheck Config Watcher

A Node.js service that monitors Wikimedia EventStreams for edits to `MediaWiki:Editcheck-config.json` pages across all Wikimedia wikis and sends alerts to the Editing Team Slack workspace.

The watcher listens continuously to the Wikimedia RecentChange EventStream
and filters for `:Editcheck-config.json`. When a matching edit is detected, the service posts a Slack alert.

This service runs as a _Toolforge continuous Kubernetes job_. Toolforge should automatically keep the process alive and restart it if it exits.

## Initial setup

SSH into Toolforge:

```bash
ssh <username>@login.toolforge.org
become editcheck-watcher
```

Clone VE:

```bash
git clone https://gerrit.wikimedia.org/r/mediawiki/extensions/VisualEditor
```

Install in a Node runtime shell:

```bash
toolforge webservice node20 shell
cd VisualEditor/editcheck/build/editcheck-watcher/
npm install --omit=dev
exit
```

Access the Slack app at https://api.slack.com/apps.

Configure Slack webhook secret:

```bash
echo "SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXXX/XXXX/XXXX" > $HOME/VisualEditor/editcheck/build/editcheck-watcher/.env
```

Restrict permissions:

```bash
chmod 600 $HOME/VisualEditor/editcheck/build/editcheck-watcher/.env
```

## Starting the service

```bash
toolforge jobs run editcheckwatcher \
--command "$HOME/VisualEditor/editcheck/build/editcheck-watcher/run.sh" \
--image node20 \
--continuous
```

### Check running jobs

```bash
toolforge jobs list
```

### View logs

```bash
toolforge jobs logs editcheckwatcher -f
```

### Stop service

```bash
toolforge jobs delete editcheckwatcher
```

## Updating

Typical update workflow:

```bash
ssh <username>@login.toolforge.org
become editcheck-watcher
cd $HOME/VisualEditor
git pull
toolforge jobs restart editcheckwatcher
```

If dependencies changed:

```bash
toolforge webservice node20 shell
cd $HOME/VisualEditor/editcheck/build/editcheck-watcher/
npm install --omit=dev
exit
```
