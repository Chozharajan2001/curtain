// Shared card computation — same logic as scripts/build-screen.mjs.
// Reads pinned runs + key, matches leaks, decides verdict per image.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { findLeaks } from "../../../src/leaks.mjs";
import { decide } from "../../../src/decide.mjs";

export interface Card {
  name: string;
  verdict: string;
  leaks: string[];
  located: number;
  reply: string;
  refusal: boolean;
}

export interface Stamp {
  locateRun: string;
  attackRun: string;
  built: string;
  recall: string;
}

const root = join(process.cwd(), "..");

function isRefusal(text: string): boolean {
  return /can't (transcribe|provide|share|disclose)|personal (information|data|financial)|privacy|not able to (transcribe|share|provide)/i.test(text ?? "");
}

export function loadCards(): { cards: Card[]; stamp: Stamp } {
  const key = JSON.parse(readFileSync(join(root, "corpus/key/v1.json"), "utf8"));
  const attack = JSON.parse(readFileSync(join(root, "runs/attack-2026-10-31.json"), "utf8"));
  const locate = JSON.parse(readFileSync(join(root, "runs/locate-2026-10-30-run3.json"), "utf8"));
  const locByName = new Map(locate.map((r: { name: string; boxes: unknown[] }) => [r.name, r.boxes.length]));
  const keyByName = new Map<string, { category: string; value: string; valueKind: string }[]>(
    key.images.map((im: { name: string; items: { category: string; value: string; valueKind: string }[] }) => [im.name, im.items])
  );

  const cards: Card[] = attack.map((a: { name: string; text: string; error?: string }) => {
    const leaks = findLeaks(a.text, keyByName.get(a.name) ?? []);
    const { verdict } = decide(a.error ? ["attacker-error"] : leaks);
    return {
      name: a.name,
      verdict,
      leaks,
      located: locByName.get(a.name) ?? 0,
      reply: a.text,
      refusal: isRefusal(a.text),
    };
  });

  return {
    cards,
    stamp: {
      locateRun: "runs/locate-2026-10-30-run3.json",
      attackRun: "runs/attack-2026-10-31.json",
      built: "2026-11-01",
      recall: "0.909 (20/22) run3 · every-run 0.727 (16/22) · median 0.864",
    },
  };
}
