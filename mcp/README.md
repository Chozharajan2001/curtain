# Curtain MCP server — the agent door

Three tools over stdio. The agent calls before its image request goes out.

## Install

```
cd PROJECT
npm install
```

## Env

```
META_API_KEY=...        # locate (inspect)
BASETEN_API_KEY=...     # attack (verify)
```

Optional: `META_BASE_URL`, `META_MODEL`, `BASETEN_BASE_URL`, `BASETEN_MODEL`.
Keys pass through env, never hardcoded, never logged.

## Claude Code config

```json
{
  "mcpServers": {
    "curtain": { "command": "node", "args": ["mcp/server.mjs"], "cwd": "D:/PROJECT_GIT/META_HACKATHON/PROJECT" }
  }
}
```

## Tools

- `inspect(imageBase64)` → `{w, h, boxes[], dropped, error}`. Boxes have
  `category` + `box:{x,y,w,h}` in pixels.
- `mask(imageBase64, boxes)` → `{maskedBase64, boxes}`. Solid black fill,
  margin 16, metadata stripped.
- `verify(imageBase64, boxes, secrets)` → `{verdict, leaks[], replyChars}`.
  Masks in memory, attacks the masked image with Muse Spark Open, matches
  your secrets list. `released` = nothing recovered. `refused` = leak named.
  Secrets arrive as your args — the server never reads an answer key.

## Example

```
inspect(ticket.png) → boxes:[{category:"email", box:{...}}, ...]
mask(ticket.png, boxes) → maskedBase64
verify(ticket.png, boxes, [{category:"email", value:"a@b.com"}])
→ {verdict:"released", leaks:[]}
```

Fail-closed: attacker error → refused. Unparseable output → refused.
No override.
