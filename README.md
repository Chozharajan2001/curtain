# Curtain — privacy gate that proves itself

Mask personal data in images, then have a second model try to read it.
Every number below has an id like E7. Each id is defined in `EVIDENCE.md`
(same folder): what it measures, in plain words, plus the exact command
that prints it. Run the command, compare your output to the value.

## The pipeline

```
corpus/img/*.png ──locate──▶ corpus/out/locate.json
runs/*.json (pinned) ──mask──▶ corpus/out/masked/*.png
masked ──attack (Baseten)──▶ corpus/out/attack.json
attack ──score──▶ leaks + verdict (released|refused)
```

Product code never reads `corpus/key/` (enforced by test). Only scorers do,
and they refuse to run on a tampered key (exit 2) or an empty run (exit 1).

## System map

Top to bottom: image in, verdict out.

```mermaid
flowchart TD
  subgraph CORPUS["1. CORPUS - test images + answer key"]
    HTML["HTML fakes<br/>scripts/build-corpus.mjs"]
    PLAY["Playwright screenshot<br/>crop to content"]
    IMG["corpus/img/*.png<br/>ticket clinic bank order photo"]
    KEY["corpus/key/v1.json<br/>22 secrets + true boxes"]
    MAN["manifest.json<br/>SHA256 hash of key"]
    HTML --> PLAY --> IMG
    KEY --- MAN
  end
  subgraph LOCATE["2. LOCATE - find secrets"]
    SET["runs/locate-set-v1.json"]
    RUNLOC["scripts/locate.mjs<br/>resize + EXIF strip"]
    SRCLOC["src/locate.mjs<br/>prompt + parseBoxes"]
    HTTP1["src/http.mjs<br/>retry + timeout"]
    META1["Meta API<br/>muse-spark-1.3"]
    OUTLOC["corpus/out/locate.json"]
    PINLOC["runs/locate-*.json<br/>frozen pins"]
    SET --> RUNLOC --> SRCLOC --> HTTP1 --> META1
    META1 --> OUTLOC --> PINLOC
  end
  subgraph SAM["3. SAM - tighten objects"]
    SRCSAM["src/sam.mjs<br/>parseSamBox + envelope proof"]
    META2["Meta API<br/>SAM 3.1"]
    PINSAM["runs/sam-2026-10-31.json<br/>face 1/1 + 4 refusals"]
    SRCSAM --> META2 --> PINSAM
  end
  subgraph MASK["4. MASK - cover with black"]
    RUNMASK["scripts/mask-images.mjs<br/>merge locate + SAM"]
    SRCMASK["src/mask.mjs<br/>expandBox + maskImage"]
    OUTMASK["corpus/out/masked/*.png"]
    CHECK["scripts/mask-check.mjs<br/>variance = 0 ? pass"]
    RUNMASK --> SRCMASK --> OUTMASK --> CHECK
  end
  subgraph ATTACK["5. ATTACK - second model reads"]
    SRCATK["src/attack.mjs"]
    BASE["Baseten<br/>muse-spark-open-1026"]
    OUTATK["corpus/out/attack.json"]
    PINATK["runs/attack-*.json<br/>frozen pins"]
    SRCATK --> BASE --> OUTATK --> PINATK
  end
  subgraph DECIDE["6. DECIDE - release or refuse"]
    LEAKS["src/leaks.mjs<br/>findLeaks"]
    DEC["src/decide.mjs<br/>empty = released"]
    SCOREATK["scripts/score-attack.mjs<br/>exit 1 on leak"]
    LEAKS --> DEC --> SCOREATK
  end
  subgraph DOORS["7. DOORS - how the world uses it"]
    MCP["mcp/server.mjs<br/>inspect / mask / verify"]
    WEB["web/app<br/>/ cards + /verify upload"]
    PREV["preview/index.html<br/>5 cards, file:// clean"]
  end
  IMG --> RUNLOC
  IMG --> RUNMASK
  PINLOC --> RUNMASK
  PINSAM --> RUNMASK
  OUTMASK --> SRCATK
  PINATK --> SCOREATK
  KEY --> SCOREATK
```

## Zero-spend commands (judge path, no API keys)

| Command | Prints | Evidence |
|---|---|---|
| `npm run verify` | 70 checks, exit 0 | test suite |
| `npm run count:planted` | 22 items, 5 images | E1 |
| `npm run score` | recall 0.909 (20/22) | E2 |
| `npm run variance` | 3 runs: 0.864/0.909/0.773, every-run 0.727 | E7 |
| `node scripts/score-sam.mjs runs/sam-2026-10-31.json` | placement 1/1, refusal 4/4 | E4 |
| `node scripts/score-attack.mjs runs/attack-2026-10-31.json` | 0/22 leaks | E5 |
| `npm run cost` | $1.17 over 98 calls | E9 |
| `npm run verify:corpus` | one-line summary, exits 1 (mask 3/5 honest) | E6 |

Styled set (second synthetic corpus, 22 items):

| Command | Prints | Evidence |
|---|---|---|
| `node scripts/score-locate.mjs runs/locate-styled-2026-11-01.json corpus/key/v1-styled.json` | recall 0.773 (17/22) | E11 |
| `node scripts/score-attack.mjs runs/attack-styled-2026-11-01.json corpus/key/v1-styled.json` | 0/22 leaks | E13 |
| `npm run mask:sweep` | 16→0/5, 40→1/5, 64→4/5 | E12 |

Hard set (4 images, 10 items):

| Command | Prints | Evidence |
|---|---|---|
| `node scripts/score-locate.mjs runs/locate-hard-2026-11-01.json corpus/key/v1-hard.json` | recall 0.200 (2/10) | E14 |

## Doors onto the engine

Pick your path. No keys: run the zero-spend commands above — every number
reproduces from pinned files. Human trying it live: open the Next.js screen.
Agent calling it in a pipeline: use the MCP server.

- **MCP server** (`mcp/`, stdio): `inspect` / `mask` / `verify` tools for any
  agent. See `mcp/README.md`. Run: `npm run mcp` (needs env keys).
- **Next.js screen** (`web/`): `/` shows the 5 pinned cards, `/verify` runs a
  live attack→decide demo on your upload (mask-noop; full mask→attack→decide
  via MCP `verify` or API with boxes). Run: `cd web && npm install && npm run dev`.
- **Static fallback** (`preview/index.html`): frozen, works from `file://`.

## Live commands (spend credit, need `.env`)

Copy `.env.example` to `.env`, add keys. Then:

- `npm run locate` — ground boxes on the 5 v1 images
- `npm run mask-images` — apply pinned boxes to images
- `npm run attack` — Baseten attacker reads masked images
- `npm run locate:styled` — ground boxes on the styled set
- `npm run build-corpus` — rebuild synthetic images from HTML

## Pinned vs live

`runs/*.json` are committed. Scorers default to pinned files so a judge
reproduces every number with zero API calls. `corpus/out/` is gitignored —
live output lands there, never committed. If a re-run wobbles (temp 0 still
wobbles, see LIMITATIONS 7), the pinned file is the number.

## Re-pinning a manifest

The key is content-hashed. If `corpus/key/*.json` changes legitimately:

```
node -e "import('./src/manifest.mjs').then(m=>console.log(m.writeManifest('corpus/key/v1.json','corpus/key/manifest.json')))"
```

Key JSON files are never edited by hand. If a key legitimately changes,
its checksum file is regenerated with the command above, once, with a
commit message saying why. The key contents themselves are never touched.

## Limits

See `LIMITATIONS.md`. Headline: locate recall 0.773–0.909 (every-run 0.727),
mask 3/5, attacker 0/22, SAM finds objects not text, styled and hard sets
are worse than minimal, temp 0 is not deterministic.
