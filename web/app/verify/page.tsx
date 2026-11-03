"use client";
import { useState } from "react";

export default function VerifyPage() {
  const [file, setFile] = useState<File | null>(null);
  const [secrets, setSecrets] = useState("email: a@b.com");
  const [result, setResult] = useState<string>("");

  async function run() {
    if (!file) {
      setResult("pick an image first");
      return;
    }
    const buf = await file.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    const list = secrets
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const i = l.indexOf(":");
        return { category: l.slice(0, i).trim() || "note", value: l.slice(i + 1).trim() };
      });
    setResult("running mask → attack → decide…");
    const r = await fetch("/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageBase64: b64, boxes: [], secrets: list }),
    });
    const j = await r.json();
    setResult(`${j.verdict?.toUpperCase() ?? "ERROR"} — leaks: ${(j.leaks ?? []).join("; ") || "none"}${j.reason ? ` (${j.reason})` : ""}`);
  }

  return (
    <main style={{ fontFamily: "Arial,sans-serif", margin: 24 }}>
      <h1 style={{ fontSize: 22 }}>Curtain — verify a live image</h1>
      <p style={{ color: "#555", maxWidth: 700 }}>
        Upload an image, list the secrets it contains (one per line, like{" "}
        <code>email: a@b.com</code>). The server masks nothing by default — add boxes later.
        Today this proves the attack→decide chain live: an unmasked image with listed secrets
        should come back REFUSED naming the leak.
      </p>
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <br />
      <textarea value={secrets} onChange={(e) => setSecrets(e.target.value)} rows={5} cols={50} style={{ marginTop: 12 }} />
      <br />
      <button onClick={run} style={{ marginTop: 12, padding: "8px 20px", fontSize: 16 }}>
        Verify
      </button>
      <pre style={{ background: "#f8f8f8", border: "1px solid #ddd", padding: 12, marginTop: 12, maxWidth: 700 }}>
        {result || "(result appears here)"}
      </pre>
    </main>
  );
}
