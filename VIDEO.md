# Curtain — 3-minute video beats

No narration asset needed. Read these lines over the matching shot.
Still fallback: pause on any shot, it carries the number.
Say this sentence out loud in Shot 4: "Three Meta models. Spark 1.3 finds.
SAM 3.1 tightens. Spark Open attacks."

## Shot 1 — the problem (0:00–0:30)

Show a fake support ticket, unmasked. Names, email, order number visible.

> "Screenshots leak. Every support ticket, every clinic letter carries names,
> numbers, faces. Curtain is a gate: mask it all, then prove nothing survived."

## Shot 2 — locate (0:30–1:00)

Run: `node scripts/score-locate.mjs runs/locate-2026-10-30-run3.json`

> "First the finder: Muse Spark grounds every secret to a box. Recall 0.909 —
> twenty of twenty-two. The two misses are named, not hidden: ticket order
> number, ticket card. Every number on screen has a command behind it."

## Shot 3 — mask (1:00–1:20)

Show the Next.js screen (`/`): original left, masked right. Black boxes.

> "Then the curtain: solid fill, margin sixteen, metadata stripped. Three of
> five images fully flat. The two survivors are locate gaps, proven: all
> twenty-two model boxes are fully black. Pixel survival is not a leak —
> next shot proves it."

## Shot 4 — attack + refusal (1:20–2:10)

Show attacker reply panel. Then show the blur-probe refusal.

Run: `node scripts/score-attack.mjs runs/attack-2026-10-31.json`

> "Now the attacker: Muse Spark Open reads only the masked image. Zero of
> twenty-two recovered — fragments only. And the inverted proof: the same
> attacker refuses lightly-blurred PII outright. It CAN see secrets when
> present. Our masks revealed nothing to trigger it. That refusal is the demo.
> Three Meta models. Spark 1.3 finds. SAM 3.1 tightens. Spark Open attacks."

## Shot 5 — hard truth (2:10–2:40)

Show the hard-set numbers: locate 0.200. Then the hard attack: 0/10 leaks.

> "Honesty slide: tiny text and split numbers beat the finder — two of ten.
> But the gate still held: zero of ten recovered. Weak finder, strong gate.
> That is the product: refuse, don't guess."

## Shot 6 — doors + close (2:40–3:00)

Show the MCP config, then `/verify` returning REFUSED on a live image.
Show LIMITATIONS.md open.

> "Two doors: an MCP server any agent can call, and a web page you can try
> now. Seventy-one checks green, ninety-eight calls, one dollar seventeen.
> Five released, zero leaked, every failure named with its number. Curtain
> does not claim perfect. It claims proven."

## Commands used (in order)

```
node scripts/score-locate.mjs runs/locate-2026-10-30-run3.json
npm run mask:check
node scripts/score-attack.mjs runs/attack-2026-10-31.json
node scripts/score-locate.mjs runs/locate-hard-2026-11-01.json corpus/key/v1-hard.json
node scripts/score-attack.mjs runs/attack-hard-2026-11-02.json corpus/key/v1-hard.json
npm run verify
```
