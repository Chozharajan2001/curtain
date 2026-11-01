# LIMITATIONS.md — what Curtain cannot do, with numbers

Every claim carries its evidence id. No id, no number (repo rule).

## 1. Locate misses small text, and the miss rate moves run to run (E2, E2c, E7)

Muse Spark 1.3 in pixel mode places small text 2–13px off, ~33px off under graphics.

Three pinned runs, same prompt, temperature 0: **0.864, 0.909, 0.773** recall. Min 0.773, median 0.864, max 0.909. An item hit in **every** run: 16/22 (0.727). Hit in at least one run: 21/22 (0.955). Never found across all three: ticket card `4111 1111 1111 1234`.

**The minimum run is below the 0.8 stop rule.** Two runs cleared it, one did not. The number a judge should trust is the every-run 0.727, not the best run.

What this means: a 15px-tall secret can survive the mask margin when the box drifts. S5's margin (16px) covers drift ≤13px; items drifting further are lost. Re-running improves the odds, not the guarantee.

## 2. Mask covers 3/5 images fully (E3)

Bank, order, photo pass pixel-uniformity. Ticket email and clinic note survive as pixels: the model underestimates width on 190–350px text by 10–24px, and no margin covers a width error. Masked area 11.53%, ink area 2.57%.

What this means: the 2 survivors are locate gaps, not mask bugs — proven 22/22 model boxes fully black.

## 3. Attacker recovers 0/22 planted secrets (E5)

Fragments only ("Phon", "Orde"). The 2 pixel survivors (ticket email, clinic note) are NOT attacker-readable — pixel survival is not a leak.

What this means: the gate holds on today's corpus. The attacker also refuses verbatim PII through light blur (E5b), proving it can see PII when present.

## 4. SAM finds objects, not text (E4)

Placement 1/1 (face, IoU 0.979), refusal 4/4 (card/sig/logo return empty — correct, corpus has rendered text, not physical objects). Mask polygons not decoded (custom 85-char encoding, cut per D10).

What this means: SAM tightens the face mask only. Text-shaped items stay boxes.

## 5. Styled renders are worse than the minimal set (E11)

Five styled renders (realistic UI, colours, tables, logos) score locate recall 0.773 (17/22), strict 0.682. Bank statement 0/4: the model's boxes sit ~25px below every line on the table layout. Photo misses the planted placeholder face — the model boxed the six drawn people instead. Richer layout = more drift, not less.

## 5b. Synthetic data flatters recall (S12, open)

Crisp HTML text at fixed sizes is easier than real photos. The styled renders above already widen the gap. Real phone photos (pending) will widen it further — renders are not photographs (D28). Rotated/tiny/low-contrast/split synthetics are built and pending a scored run.

## 5c. Styled renders break the mask at product margin (E12)

Same masks, product margin 16: 0/5 styled images pass pixel-uniformity. The model's boxes clip text width by up to 48px on these renders (wide letter spacing), and a fixed margin cannot cover a width error. Margin sweep: 16 → 0/5, 40 → 1/5, 64 → 4/5 (bank address still leaks a 9px corner where two lines meet). Margins are per-corpus tuning, not a product claim.

## 5d. Attacker recovers 0/22 on styled masks, and refuses (E13)

Even with the weaker mask (margin 16), Muse Spark Open recovered 0 of 22 planted values. On bank and clinic it refused outright ("I can't provide a verbatim transcription of personal financial details... fragments appear at the edges of the redactions") — the same safety-as-capability signal as E5b.

## 6. Out of scope by design (SPEC)

PDF text layers, video, multi-user accounts, auth, database, local models, fine-tuning, throughput. Unplanted template text (e.g. clinic DOB read by the attacker) is outside the 11 SPEC categories — the key scores planted secrets only.

## 7. Temperature 0 does not mean deterministic (E7)

Three pinned runs, same prompt, same images:

```text
runs=3  0.864  0.909  0.773
min=0.773  median=0.864  max=0.909
hit in every run: 16/22 (0.727)
hit in any run:   21/22 (0.955)
never found: ticket card 4111 1111 1111 1234
```

Not one of 22 boxes was identical across runs. Small drift (1–3px) is common; individual boxes jumped 27–40px between runs.

What this means: one number is never enough. Every figure on this repo's front page is either a range or an every-run count, and `npm run variance` prints both from the pinned runs with zero API calls.
