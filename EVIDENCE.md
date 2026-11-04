# Numbers and how to reproduce them

Every number in the README and LIMITATIONS has an id here (E1, E2, …).
Each row tells you what the number means, what it is, and the exact
command that prints it. All commands below run with zero API cost —
they re-score files already saved in `runs/`, so a stranger gets the
same numbers without spending anything.

How to read this file: find the id (say E7), read what it measures
in plain words, run its command, compare your output to the value.

## Main test set (5 fake documents, 22 hidden secrets)

| id | What it measures, in plain words | Value | Command to reproduce |
|---|---|---|---|
| E1 | How many secrets are hidden in the 5 test images | 22 | `npm run count:planted` |
| E2 | How many secrets the finder covers (best saved run). "Covers" means the found box overlaps at least half the secret | 0.909 — 20 of 22 | `node scripts/score-locate.mjs runs/locate-2026-10-30-run3.json` |
| E2b | Same run, stricter ruler: boxes must overlap closely, not just cover. Always lower — shown so nothing is hidden | 0.636 — 14 of 22 | Same command as E2 (second line) |
| E2c | Stability across the 2-run set (run2+run3): found in *every* run vs found in *at least one*. The 3-run every-run 16/22 is in the run table below | Every run 18/22, either run 21/22 | `node scripts/compare-runs.mjs` |
| E3 | How many images are fully black where secrets were. 2 images leak pixels (finder boxes too narrow) | 3 of 5 pass | `npm run mask-images && npm run mask:check` |
| E4 | Face test: did the object finder land on the face, and did it correctly say "nothing here" for text items | Face found, 4 correct refusals | `node scripts/score-sam.mjs runs/sam-2026-10-31.json` |
| E5 | How many secrets the attacker reads from the blacked-out images | 0 of 22 (fragments only) | `node scripts/score-attack.mjs runs/attack-2026-10-31.json` |
| E5b | Proof the attacker is capable: it *refuses* lightly-blurred PII, so it can see secrets when present | Refusal on file | Pinned reply in `runs/attack-blur2-refusal.json` |
| E6 | One-line summary of everything above | 22 secrets, 0.909 found, 0 leaked | `npm run verify:corpus` (exits 1 — the mask gap is honest, not hidden) |
| E7 | Same finder run 3 times: low / middle / high. Plus what fraction is found in *every* run | 0.773 / 0.864 / 0.909; every-run 0.727 | `npm run variance` |
| E9 | Total API money spent, tracked per call | $1.17 over 98 calls (product 97, probe 1, unpriced 9) | `npm run cost` |
| E10 | Safety gates: empty input must fail, edited answer key must refuse | Both proven by tests | `npm run verify` |

## Second test set: prettier documents (5 styled renders, 22 secrets)

Richer layouts — colors, tables, logos. Harder for the finder.

| id | What it measures, in plain words | Value | Command to reproduce |
|---|---|---|---|
| E11 | Finder recall on the pretty set | 0.773 — 17 of 22 | `node scripts/score-locate.mjs runs/locate-styled-2026-11-01.json corpus/key/v1-styled.json` |
| E12 | Mask check on the pretty set at normal margin. Includes a sweep: margin 16→0/5, 40→1/5, 64→4/5 | 0 of 5 pass | `npm run mask:sweep` |
| E13 | Attacker leaks on the pretty set | 0 of 22 (2 outright refusals) | `node scripts/score-attack.mjs runs/attack-styled-2026-11-01.json corpus/key/v1-styled.json` |

## Third test set: hard images (4 synthetics, 10 secrets)

Rotated, tiny, low-contrast, split numbers. Built to break the finder.

| id | What it measures, in plain words | Value | Command to reproduce |
|---|---|---|---|
| E14 | Finder recall on hard images | 0.200 — 2 of 10 | `node scripts/score-locate.mjs runs/locate-hard-2026-11-01.json corpus/key/v1-hard.json` |
| E15 | Mask + attacker on hard images | Mask 1/4 pass; attacker 0/10 leaks | Mask: `node scripts/mask-images.mjs runs/locate-hard-2026-11-01.json corpus/out/masked-hard` then `node scripts/mask-check.mjs runs/locate-hard-2026-11-01.json corpus/key/v1-hard.json corpus/out/masked-hard`. Attack: `node scripts/score-attack.mjs runs/attack-hard-2026-11-02.json corpus/key/v1-hard.json` |

## Live proofs (both doors)

| id | What it measures, in plain words | Value | Where |
|---|---|---|---|
| E18 | Both doors ran the full chain live with real keys. The attack service flaked (empty reply) twice — both doors refused anyway, 0 leaks | 2 transcripts, both refused | `runs/verify-live-mcp-2026-11-02.json`, `runs/verify-live-api-2026-11-02.json` |
| E19 | Every test passes, including the scan that proves no product file names the answer-key path | 74 checks, 0 fail, exit 0 | `npm run verify` |

## What the finder misses (named, not hidden)

Pinned best run. Re-scored with zero API calls.

| Image | Secret missed | Why |
|---|---|---|
| ticket | order `ORD-88412` | Found box sits low on 15px-tall text |
| ticket | card `4111 1111 1111 1234` | Never covered in any of the 3 runs |

Per image: ticket 0.60, clinic 1.00, bank 1.00, order 1.00, photo 1.00.

## Run-to-run wobble (3 saved runs, `npm run variance`)

| Run | Found | Strict |
|---|---|---|
| run2 | 0.864 | 0.500 |
| run3 | 0.909 | 0.636 |
| run4 | 0.773 | 0.545 |

Low 0.773, middle 0.864, high 0.909. Found in *every* run: 16/22.
Found in *at least one* run: 21/22. Never found: ticket card only.
The low run sits below the project's own 0.8 bar — stated here, not hidden.
