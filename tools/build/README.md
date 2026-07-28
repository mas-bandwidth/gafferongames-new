# The static build

One article, converted end to end, so the result can be judged before anything
scales to the other 32.

```sh
deno run --allow-read --allow-write --allow-net --allow-env tools/build/build.js rotation_and_inertia_tensors
```

Output goes to `out/post/<slug>.html`, with `out/img` and `out/assets` beside it —
the site's own `/post/` shape, so the articles' many cross-links to each other keep
working instead of quietly 404ing.

## What it produces

Verified on `rotation_and_inertia_tensors`: 6 equations rendered, 0 failed, 36KB,
**zero `<script>` tags**, every image and stylesheet resolving, both inter-article
links pointing at real articles. Light and dark both handled from one stylesheet.

## The one trick that matters

Math is pulled out of the markdown **before** the markdown renderer runs, replaced
with opaque placeholders, rendered with KaTeX, and substituted back **after**.

Hand raw TeX to a markdown renderer and it eats the backslashes. That is the second
of the two bugs on the live site, and it is the one that stays invisible until the
first is fixed: convert the `[latex]` shortcodes and nothing else, and every matrix
silently renders as a single row while looking like a successful repair.

## Why not Hugo

The articles are finished. A build chain earns its keep by serving ongoing writing,
and there is none. Meanwhile the build chain is what broke the site — the content
never changed, Goldmark's handling of `\\` did. Freezing the output removes that
whole class of failure rather than carrying it forward on content nobody will touch
again.

## Known gaps

* No index or category pages yet, so `href="../index.html"` is currently dead.
* Only one article built. The remaining 32 need a sweep plus a check that no
  article uses markdown this converter doesn't handle.
* `out/` is gitignored — it is a build product, and copying `static/img` into it
  would otherwise duplicate a large tree.

## A real defect the checker found on its first run

`state_synchronization` linked to `/post/reliability_and_flow_control/`. That URL
**404s on the live site today** and has presumably done so for years; the article it
means is live and healthy at `/post/reliability_ordering_and_congestion_avoidance_over_udp/`.

Fixed here in the rebuild, and recorded here rather than changed silently — it is a
correction to published prose, small and obvious, but not mine to make invisibly.
The live site still has the broken link.

This is the argument for `check.sh` in one example: the build reported "0 failed"
and was telling the truth. The defect was in the artifact, not the process.

## The bug that mattered more than the dead link

The first parser handled only TOML front matter. Two of the 33 articles use YAML —
`---` delimiters, `summary:` where the rest say `description =`. For those two the
match simply failed, so the front matter fell through into the body and rendered as
page content, under an empty `<title>`.

The build printed `0 failed`. `check.sh` printed `clean`. Neither was lying; neither
was looking at this.

It surfaced because the index reported **31 articles** while the tree held **33**.
A stated count disagreeing with the list beneath it is worth chasing every time.

Both were then fixed, and the checker was taught the class: titleless pages, leaked
front-matter keys, and index-vs-tree coverage. That last check immediately earned
itself by catching that the parser had been fixed in `build.js` and left broken in
`index.js` — the same defect, in a second place.

The lesson is not "write a better parser." It is that a verifier only finds the
failures someone thought to look for, so every real defect should also buy a new
check.
