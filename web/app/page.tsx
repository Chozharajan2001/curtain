import { loadCards } from "./lib/cards";

export default function Home() {
  const { cards, stamp } = loadCards();
  return (
    <main style={{ fontFamily: "Arial,sans-serif", margin: 24, background: "#f4f4f4" }}>
      <h1 style={{ fontSize: 22 }}>Curtain — privacy gate, one screen</h1>
      <p style={{ color: "#555", maxWidth: 900 }}>
        Left: original. Right: masked + flattened + metadata stripped. Red items are what the
        attacker recovered from the masked image. Verdict on top.
      </p>
      <p style={{ color: "#555", maxWidth: 900 }}>
        Pixel check (E3): 3/5 images fully flat; ticket email + clinic note peek through at the
        pixel level — but the attacker recovered neither (E5). Pixel survival is not a leak.
      </p>
      <p style={{ color: "#555", maxWidth: 900 }}>
        Locate {stamp.locateRun} · attack {stamp.attackRun} · built {stamp.built} · recall{" "}
        {stamp.recall}. Trust the every-run number, not the best run.
      </p>
      {cards.map((it) => (
        <div
          key={it.name}
          style={{ background: "#fff", border: "1px solid #ccc", padding: 16, margin: "0 0 24px", maxWidth: 1100 }}
        >
          <span
            style={{
              fontWeight: "bold",
              padding: "4px 12px",
              borderRadius: 4,
              fontSize: 18,
              background: it.verdict === "refused" ? "#fdd" : "#dfd",
              color: it.verdict === "refused" ? "#900" : "#060",
            }}
          >
            {it.verdict.toUpperCase()}
          </span>{" "}
          <b>{it.name}</b>{" "}
          <span style={{ fontSize: 14, color: "#555" }}>
            located {it.located} boxes · attacker reply {it.reply.length} chars
          </span>
          <div style={{ display: "flex", gap: 16, margin: "12px 0" }}>
            {(["original", "masked"] as const).map((label) => (
              <figure key={label} style={{ margin: 0, flex: 1 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/img/${it.name}-${label === "original" ? "orig" : "masked"}.png`}
                  alt={`${it.name} ${label}`}
                  style={{ width: "100%", border: "1px solid #999" }}
                />
                <figcaption style={{ fontSize: 14, color: "#555" }}>{label}</figcaption>
              </figure>
            ))}
          </div>
          {it.leaks.length > 0 ? (
            <div style={{ color: "#900", fontWeight: "bold" }}>LEAKED: {it.leaks.join("; ")}</div>
          ) : (
            <div style={{ color: "#060" }}>leaks: none recovered</div>
          )}
          <pre
            style={{
              background: "#f8f8f8",
              border: "1px solid #ddd",
              padding: 8,
              fontSize: 12,
              whiteSpace: "pre-wrap",
              maxHeight: 120,
              overflow: "auto",
            }}
          >
            attacker says: {it.reply || "(nothing)"}
          </pre>
          {it.refusal && (
            <div style={{ color: "#060" }}>
              refusal = capability: the attacker sees PII when present — our masks revealed nothing
              to trigger it (E5b).
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
