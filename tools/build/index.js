// index.js — build out/index.html from the front matter of every article.
// Grouped by category, newest first within each, so the series read in order.
const files = [];
for await (const e of Deno.readDir("content/post")) if (e.name.endsWith(".md")) files.push(e.name);
const posts = [];
for (const f of files.sort()) {
  const src = await Deno.readTextFile(`content/post/${f}`);
  // BOTH front-matter dialects. 31 articles are TOML (+++), two are YAML (---)
  // and say `summary` where the rest say `description`. This parser was TOML-only
  // and silently dropped those two from the index — the same bug build.js had, in
  // a second place, found by check.sh comparing the index against the built tree.
  const m = src.match(/^\+\+\+\r?\n([\s\S]*?)\r?\n\+\+\+/) || src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) continue;
  const fm = {};
  const unq = v => v.trim().replace(/^["']|["']$/g,"");
  for (const line of m[1].split(/\r?\n/)) {
    const k = line.match(/^(\w[\w-]*)\s*[:=]\s*(.+)$/); if (!k) continue;
    let v = k[2].trim();
    if (v.startsWith("[")) v = v.slice(1,-1).split(",").map(unq).filter(Boolean);
    else v = unq(v);
    fm[k[1]] = v;
  }
  if (!fm.description && fm.summary) fm.description = fm.summary;
  if (String(fm.draft) === "true") continue;
  posts.push({ slug: f.replace(/\.md$/,""), title: fm.title||f, date: fm.date||"",
               desc: fm.description||"", cat: [].concat(fm.categories||["Uncategorised"])[0] });
}
const esc = s => String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const byCat = {};
for (const p of posts) (byCat[p.cat] ||= []).push(p);
for (const k in byCat) byCat[k].sort((a,b)=> b.date.localeCompare(a.date));
const order = Object.keys(byCat).sort((a,b)=>
  byCat[b][0].date.localeCompare(byCat[a][0].date));
const sections = order.map(c => `  <section>
    <h2>${esc(c)}</h2>
    <ul class="posts">
${byCat[c].map(p=>`      <li><a href="post/${p.slug}.html">${esc(p.title)}</a>`
  +`<time>${esc(p.date)}</time>`
  +(p.desc?`<span class="desc">${esc(p.desc)}</span>`:"")+`</li>`).join("\n")}
    </ul>
  </section>`).join("\n");
const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Glenn Fiedler — Articles</title>
<link rel="stylesheet" href="assets/article.css">
<style>
 .posts{list-style:none;padding:0;margin:0 0 1rem}
 .posts li{display:grid;grid-template-columns:1fr auto;gap:.2rem 1rem;
   padding:.55rem 0;border-bottom:1px solid var(--rule)}
 .posts a{font-weight:600;border-bottom:0}
 .posts time{color:var(--dim);font-size:.82rem;font-variant-numeric:tabular-nums}
 .desc{grid-column:1/-1;color:var(--dim);font-size:.88rem}
</style></head><body>
<article>
  <header><h1>Articles</h1>
  <p class="meta">${posts.length} articles &middot; Glenn Fiedler</p></header>
${sections}
</article></body></html>
`;
await Deno.mkdir("out",{recursive:true});
await Deno.writeTextFile("out/index.html", page);
console.log(`index: ${posts.length} articles, ${order.length} categories -> out/index.html`);
