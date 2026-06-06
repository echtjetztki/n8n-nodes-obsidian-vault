# n8n-nodes-obsidian-vault

[![npm version](https://img.shields.io/npm/v/n8n-nodes-obsidian-vault.svg)](https://www.npmjs.com/package/n8n-nodes-obsidian-vault)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

n8n community node for a **self-hosted Obsidian Vault REST API**. Lets your workflows list, read, write, append, delete, and search Markdown notes in an Obsidian vault that lives on a server (no running Obsidian app required).

This node talks to the [obsidian-vault-api](https://github.com/echtjetztki/obsidian-vault-api) backend — a lightweight Node.js service that exposes a vault directory over HTTPS with API-key auth, IP-whitelist, and WebDAV.

## What it can do

| Resource | Operation | Description |
|---|---|---|
| Note | List | List files/folders under a path |
| Note | Get | Read a markdown file |
| Note | Create or Update | Write a file (creates folders) |
| Note | Append | Append to a file |
| Note | Delete | Delete a file or folder (recursive) |
| Search | Full Text | Substring search across `.md/.txt/.json/.canvas` |
| Health | Check | Liveness ping (no auth) |

## Install

In n8n: **Settings → Community Nodes → Install** → `n8n-nodes-obsidian-vault`.

Or manually:

```bash
cd ~/.n8n/nodes
npm install n8n-nodes-obsidian-vault
```

## Credentials

Create **Obsidian Vault API** credentials:

| Field | Value |
|---|---|
| Base URL | `https://your-vault.example.com` (no trailing slash) |
| API Key | The secret your backend expects in `X-API-Key` |

The credential test hits `/healthz`, so it works even before you grant any IP access.

## Backend

You need a vault-api server. The reference implementation is at [github.com/echtjetztki/obsidian-vault-api](https://github.com/echtjetztki/obsidian-vault-api). Quickstart:

```bash
git clone https://github.com/echtjetztki/obsidian-vault-api
cd obsidian-vault-api
npm install
VAULT_ROOT=/path/to/your/vault \
PORT=3025 BIND=127.0.0.1 \
API_KEY=<long-random> \
WEBDAV_USER=you WEBDAV_PASS=<random> \
node server.js
```

Put it behind nginx with TLS + an IP allowlist. See the repo for a production setup with CloudPanel, Let's Encrypt, and rclone bisync to keep a local vault in sync.

## Why not the existing nodes?

- `n8n-nodes-obsidian` (technovangelist) — needs direct filesystem access from the n8n host
- `n8n-nodes-obsidian-rest` (DuanPeng1314) — needs `coddingtonbear/obsidian-local-rest-api`, which only runs inside a live Obsidian app
- This node — talks to a headless backend that just needs a vault directory. Server-side, 24/7, no Obsidian process required.

## Example workflows

**Daily Note from a Cron trigger:**

```
Cron (08:00) → Obsidian Vault (Note → Append)
   path: 05 Daily Notes/{{ $now.toFormat('yyyy-LL-dd') }}.md
   content: |
     - {{ $now.toFormat('HH:mm') }} Morgendliche Routine
```

**Inbox from a webhook:**

```
Webhook → Obsidian Vault (Note → Create or Update)
   path: 01 Inbox/webhook-{{ $execution.id }}.md
   content: |
     # {{ $json.subject }}
     {{ $json.body }}
```

**Knowledge-base lookup before LLM call:**

```
Trigger → Obsidian Vault (Search → Full Text, query={{$json.question}}, max=10)
        → Code (concat hits[].excerpt)
        → OpenAI / Anthropic / Gemini
```

## Development

```bash
git clone https://github.com/echtjetztki/n8n-nodes-obsidian-vault
cd n8n-nodes-obsidian-vault
npm install
npm run build
npm link
# in your n8n install:
cd ~/.n8n/custom && npm link n8n-nodes-obsidian-vault
```

Then restart n8n. The node shows up under "Obsidian Vault".

Lint with `npm run lint` (uses `eslint-plugin-n8n-nodes-base` community ruleset, required for the [n8n community verifier](https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/)).

## Roadmap

- [ ] Trigger node: poll vault for new/changed files (webhook fallback)
- [ ] Streaming response for large notes
- [ ] Optional frontmatter parser (return YAML as JSON)
- [ ] Binary attachment support via WebDAV passthrough

## License

[MIT](LICENSE) © EchtJetztKI
