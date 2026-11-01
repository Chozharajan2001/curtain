# Curtain — 3-minute video beats

No narration asset needed. Read these lines over the matching shot.
Still fallback: pause on any shot, it carries the number.

## Shot 1 — the problem (0:00–0:30)

Show a fake support ticket, unmasked. Names, email, order number visible.

> "Screenshots leak. Every support ticket, every clinic letter carries names,
> numbers, faces. Curtain is a gate: mask it all, then prove nothing survived."

## Shot 2 — locate (0:30–1:00)

Run: `node scripts/score-locate.mjs runs/locate-2026-10-30-run3.json`

> "First the finder: Muse Spark grounds every secret to a box. Recall 0.909 —
> twenty of twenty-two. The two misses are named, not hidden: ticket order
> number, ticket card. Every number on screen has a command behind it."

## Shot 3 — mask (1:00–1:30)

Show `preview/index.html`: original left, masked right. Black boxes.

> "Then the curtain: solid fill, margin sixteen, metadata stripped. Three of
> five images fully flat. The two survivors are locate gaps, proven: all
> twenty-two model boxes are fully black. Pixel survival is not a leak —
> next shot proves it."

## Shot 4 — attack + refusal (1:30–2:30)

Show attacker reply panel. Then show the blur-probe refusal.

Run: `node scripts/score-attack.mjs runs/attack-2026-10-31.json`

> "Now the attacker: Muse Spark Open reads only the masked image. Zero of
> twenty-two recovered — fragments only. And the inverted proof: the same
> attacker refuses lightly-blurred PII outright. It CAN see secrets when
> present. Our masks revealed nothing to trigger it. That refusal is the demo."

## Shot 5 — clean pass (2:30–3:00)

Show verdict badges: 5 RELEASED. Show LIMITATIONS.md open.

> "Five released, zero leaked, every failure named in LIMITATIONS with its
> number. A judge reproduces all of it with zero API calls — pinned runs,
> one command each. Curtain does not claim perfect. It claims proven."

## Commands used (in order)

```
node scripts/score-locate.mjs runs/locate-2026-10-30-run3.json
npm run mask:check
node scripts/score-attack.mjs runs/attack-2026-10-31.json
npm run blur-probe
npm run verify:corpus
```
