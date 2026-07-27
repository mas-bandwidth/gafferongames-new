# The math on gafferongames.com

## What is actually wrong

Two separate bugs, and the second one hides behind the first.

**1. The equations were never migrated from WordPress.** They are still written as
`[latex]…[/latex]` shortcodes. MathJax 2.7.4 *is* loaded on every page, in its
heaviest configuration, and it looks for `$$`, `\(` and `\[`. It has never seen a
`[latex]` tag in its life. So it loads, finds nothing to typeset, and the reader
is served the raw shortcode as literal text.

The author already knew. `content/post/rotation_and_inertia_tensors.md:66` reads:

> `_todo: yes, need to sort out the latex equations..._`

**2. Goldmark eats the matrix row separators.** In the source, the row breaks are
correct — `I_{xx} & I_{xy} & I_{xz} \\ I_{yx} & …`. In the *served HTML* they have
collapsed to a single `\`. Hugo's markdown renderer treats `\\` as an escaped
backslash before MathJax ever sees it.

This one matters because it is invisible until the first bug is fixed. Convert the
shortcodes and nothing else, and every matrix on the site renders as a single row —
and it will look like it worked.

**Scope:** the whole problem is 9 equations across 2 files.

| file | equations |
|---|---|
| `content/post/rotation_and_inertia_tensors.md` | 6 |
| `content/post/collision_response_and_coulomb_friction.md` | 3 |

## The approach

Pre-render the math **at build time** to static HTML. No MathJax, no runtime
JavaScript, no CDN request, nothing to execute in the reader's browser.

That choice follows from one fact: **the articles are finished.** Nothing new will
be authored here. A build chain earns its keep by serving ongoing authoring, and
there is none — meanwhile the build chain is exactly what broke the site. The
content did not change; Goldmark's handling of `\\` did. Freezing the output
removes that entire class of failure permanently.

It also answers the anti-aliasing question better than images do. KaTeX emits
HTML and CSS, so the result is real text: crisp at any zoom, selectable,
copy-pasteable, and it reflows. Pre-rendered images would be none of those.

KaTeX and all 20 of its `woff2` fonts are **vendored** into this directory. No
`cdn.jsdelivr.net`, no `cdnjs.cloudflare.com`. A CDN that disappears in 2031
cannot take the equations with it.

## Running it

```sh
deno run --allow-read --allow-write --allow-net --allow-env render-math.js
```

Reads `equations.json`, writes `equations-rendered.json` with a `.html` field per
equation. Any equation KaTeX cannot parse is reported by file and line and counted
as a failure rather than silently skipped.

Current state: **9 of 9 render, 0 failures.**

`nine-equations.html` is a self-contained before/after page — every font inlined as
a data URI, zero `<script>` tags — so it can be opened anywhere, offline, forever.

## A warning about verifying this

The first attempt at that preview used MathJax-style client-side rendering and was
checked by rendering the page with `qlmanage`. It produced a perfectly good PNG at
exit code 0 **with the entire fixed column blank**, because Quick Look rendered the
HTML and never executed the script.

`qlmanage` never fails. It exits 0 and writes a PNG for a truncated file, an
invalid colour, a malformed SVG path, and a file containing the words "this is not
svg at all". Do not trust its exit code for anything.

The current pipeline is immune to that specific trap for a structural reason rather
than a careful one: the output contains no JavaScript, so there is nothing that can
fail to run. Verification is just looking at the page.
