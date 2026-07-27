import katex from "npm:katex@0.16.11";
const eqs = JSON.parse(await Deno.readTextFile("equations.json"));
let ok = 0, bad = 0;
for (const e of eqs) {
  try {
    e.html = katex.renderToString(e.tex, { displayMode: e.display, throwOnError: true, output: "html" });
    ok++;
  } catch (err) {
    e.error = err.message; bad++;
    console.error(`FAIL ${e.file}:${e.line}  ${err.message}`);
  }
}
await Deno.writeTextFile("equations-rendered.json", JSON.stringify(eqs, null, 1));
console.log(`rendered ${ok}/${eqs.length}  failed ${bad}`);
