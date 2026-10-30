// Fail-closed verdict. Nothing recovered -> released.
// Anything recovered, or anything unparseable -> refused. No override. (D9)
export function decide(leaks) {
  if (Array.isArray(leaks) && leaks.length === 0) {
    return { verdict: "released", leaks: [] };
  }
  if (!Array.isArray(leaks)) {
    return { verdict: "refused", leaks: ["unparseable-attack-output"] };
  }
  return { verdict: "refused", leaks };
}
