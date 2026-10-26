#!/usr/bin/env python3
"""Builds docs/spec/STORY-MAP.md from the .feature files (they stay the source of truth).
One .feature file = one Jira Epic; each Rule = one Jira Story.
Run from docs/spec:  python3 tools/story-map.py"""
import glob, html, os, re

STORY = re.compile(r"  Rule: (US-(\d\d)\.(\d\d)) · (.+)")


def scenarios_html(ac):
    """One block per scenario: "Scenario 1 · name" (numbered when there are several), then its steps on their own."""
    chunks, cur = [], None
    for line in ac.split("\n"):
        m = re.match(r"\s*Scenario( Outline)?: (.+)", line)
        if m:
            cur = [m.group(2).strip(), bool(m.group(1)), []]; chunks.append(cur)
        elif cur is not None:
            cur[2].append(line)
    out = []
    for i, (name, outline, body) in enumerate(chunks, 1):
        steps = "\n".join(b[2:] if b.startswith("  ") else b for b in body if b.strip())
        label = f"Scenario {i}" if len(chunks) > 1 else "Scenario"
        kind = " <i>(outline: one run per row of the table)</i>" if outline else ""
        out.append(f"<p><b>{label}</b> · {html.escape(name)}{kind}</p><pre lang=\"gherkin\">{html.escape(steps)}</pre>")
    return "".join(out)


def epic_of(path):
    L = open(path).read().rstrip("\n").split("\n")
    name = next(l.split("Feature:", 1)[1].strip() for l in L if l.startswith("Feature:"))
    eid, name = name.split(" · ", 1)
    eben = next((l.replace("# Business benefit:", "").strip() for l in L if l.startswith("# Business benefit:")), "")
    fi = next(i for i, l in enumerate(L) if l.startswith("Feature:"))
    desc = L[fi + 1].strip()
    starts = [i for i, l in enumerate(L) if STORY.match(l)]
    out = []
    for k, i in enumerate(starts):
        m = STORY.match(L[i]); tags = L[i - 1] if L[i - 1].strip().startswith("@") else ""
        ben_line = L[i - 2] if tags else L[i - 1]
        ben = ben_line.strip().replace("# Business benefit:", "").strip()
        stop = len(L)
        if k + 1 < len(starts):
            stop = starts[k + 1]
            while L[stop - 1].strip().startswith(("#", "@")): stop -= 1
        body = L[i + 1: stop]
        story = [b.strip() for b in body[:3]]
        notes = [b.strip() for b in body[3:] if b.strip().startswith("Note:")]
        bg = []
        if any(b.strip() == "Background:" for b in body):
            j = next(j for j, b in enumerate(body) if b.strip() == "Background:") + 1
            while j < len(body) and body[j].strip() and not body[j].strip().startswith("Scenario"):
                bg.append(body[j].strip()); j += 1
        first = next(j for j, b in enumerate(body) if b.strip().startswith("Scenario"))
        ac = "\n".join(b[4:] if b.startswith("    ") else b for b in body[first:]).rstrip()
        out.append(dict(id=m.group(1), ep=m.group(2), n=int(m.group(3)), title=m.group(4).strip(), ben=ben, story=story,
                        persona=re.sub(r"^As (an?|the) ", "", story[0]), ac=ac, bg=bg, notes=notes,
                        deps=re.findall(r"@depends:(US-[\d.]+)", tags), admin="@admin" in tags, nxt="@status:next" in tags,
                        mock="@mock" in tags))
    return (eid, name, eben), desc, out


epics = [(f, *epic_of(f)) for f in sorted(glob.glob("features/*.feature"))]
allst = [s for *_, st in epics for s in st]; by = {s["id"]: s for s in allst}
memo = {}
def wave(i):
    if i not in memo: memo[i] = 1 + max([wave(d) for d in by[i]["deps"]] + [0])
    return memo[i]
waves = max(wave(s["id"]) for s in allst)
anchor = lambda eid, name: "#" + re.sub(r"[^a-z0-9 -]", "", f"{eid} {name}".lower()).replace(" ", "-")

o = ["# Story map", "", open("tools/jira-notes.md").read().rstrip(), "",
     "## How to read it", "",
     "**Epic → Story**, exactly as in Jira. Each epic starts with its own card (name, business benefit, scope, a description ready to paste), then one table of its stories; every row is one Jira Story with its **ID · name**, "
     "**persona**, **business benefit** and **user story**. Right under each story, click **Acceptance criteria** to open its scenarios. "
     "`Depends on` = create as \"is blocked by\" links. **Wave** = earliest build wave across the whole product "
     "(wave 1 needs nothing; a story can start once everything it depends on is done). "
     "🛡 site-admin story · ⏭ planned, not built yet · 🧪 runs on a stand-in today (mock).", "",
     f"**{len(epics)} epics · {len(allst)} stories · {waves} build waves.** "
     "Generated from the `.feature` files with `python3 tools/story-map.py` — edit the features, then regenerate.", "",
     "| Epic | Stories | Source |", "|---|---|---|"]
for f, (eid, name, eben), desc, st in epics:
    o.append(f"| [{eid} · {name}]({anchor(eid, name)}) | {len(st)} | [`{os.path.basename(f)}`]({f}) |")
for f, (eid, name, eben), desc, st in epics:
    o += ["", "---", "", f"## {eid} · {name}", "",
          "| Epic field | Value |", "|---|---|", "| Issue type | Epic |", f"| Epic name / Summary | {eid} · {name} |",
          "| Team | WPB Digital Browser: Tools |", f"| Business benefit | {eben} |", f"| Scope | {desc} |",
          f"| Stories | {len(st)} · {st[0]['id']} to {st[-1]['id']} |", "",
          "<details><summary>Epic description to paste into Jira</summary>", "", "```text", "Business benefit", eben, "", "Scope", desc, "",
          "Stories", *[f"{x['id']} · {x['title']}" for x in st], "```", "", "</details>", "",
          f"Source: [`{os.path.basename(f)}`]({f})", "", "**Stories**", "",
          "<table>", "<tr><th>#</th><th>Story</th><th>Persona</th><th>Business benefit</th><th>User story</th><th>Depends on</th><th>Wave</th></tr>"]
    for s in st:
        mark = (" 🛡" if s["admin"] else "") + (" ⏭" if s["nxt"] else "") + (" 🧪" if s["mock"] else "")
        us = "<br>".join(html.escape(x) for x in s["story"] + s["notes"])
        n_sc = len(re.findall(r"^\s*Scenario", s["ac"], re.M))
        bg = ("<p><b>Background</b> · applies to every scenario below</p><pre lang=\"gherkin\">" + html.escape("\n".join(s["bg"])) + "</pre>") if s["bg"] else ""
        o += [f"<tr><td>{s['n']}</td><td><b>{s['id']}</b> · {html.escape(s['title'])}{mark}</td><td>{html.escape(s['persona'])}</td>"
              f"<td>{html.escape(s['ben'])}</td><td>{us}</td><td>{', '.join(s['deps']) or '—'}</td><td>{wave(s['id'])}</td></tr>",
              f"<tr><td></td><td colspan=\"6\"><details><summary>Acceptance criteria · {n_sc} scenario{'s' if n_sc != 1 else ''}</summary>"
              f"{bg}{scenarios_html(s['ac'])}</details></td></tr>"]
    o += ["</table>"]
o += ["", "---", "", "## Build waves (whole product)", "", "Stories in the same wave can be built in parallel once the earlier waves are done.", ""]
for w in range(1, waves + 1):
    o += [f"**Wave {w}** — " + " · ".join(f"{s['id']} {s['title']}" for s in allst if wave(s["id"]) == w), ""]
open("STORY-MAP.md", "w").write("\n".join(o))
print(f"{len(epics)} epics, {len(allst)} stories, {waves} waves")
