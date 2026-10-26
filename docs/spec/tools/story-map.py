#!/usr/bin/env python3
"""Builds docs/spec/STORY-MAP.md from the .feature files (they stay the source of truth).
Run from docs/spec:  python3 tools/story-map.py"""
import glob, os, re

EPIC = {"01": "Access & navigation", "02": "Pages", "03": "Page builder", "04": "Review workflow", "05": "Publishing",
        "06": "Content library", "07": "Translations", "08": "Governance", "09": "Delivery API"}
STORY = re.compile(r"\s*Rule: (US-(\d\d)\.(\d\d)\.(\d+)) · (.+)")

def stories_of(path):
    L = open(path).read().split("\n")
    feat = next(l.split("Feature:", 1)[1].strip() for l in L if l.startswith("Feature:"))
    bg, out = [], []
    starts = [i for i, l in enumerate(L) if STORY.match(l)]
    if "Background:" in "\n".join(L[: starts[0] if starts else len(L)]):
        i = next(i for i, l in enumerate(L) if l.strip() == "Background:") + 1
        while i < len(L) and L[i].strip() and not L[i].strip().startswith(("#", "@", "Rule:", "Scenario")):
            bg.append(L[i].strip()); i += 1
    for k, i in enumerate(starts):
        m = STORY.match(L[i]); tags = L[i - 1] if L[i - 1].strip().startswith("@") else ""
        ben_line = L[i - 2] if tags else L[i - 1]
        ben = ben_line.strip().replace("# Business benefit:", "").strip() if ben_line.strip().startswith("# Business benefit:") else ""
        stop = len(L)
        if k + 1 < len(starts):  # the next story begins at its benefit comment / tags
            stop = starts[k + 1]
            while stop > i and L[stop - 1].strip().startswith(("#", "@")): stop -= 1
        body = L[i + 1: stop]
        story = [b.strip() for b in body[:3]]
        first = next(j for j, b in enumerate(body) if b.strip().startswith(("Scenario", "Scenario Outline")))
        ac = [b[4:] if b.startswith("    ") else b for b in body[first:]]
        while ac and not ac[-1].strip(): ac.pop()
        out.append(dict(id=m.group(1), ep=m.group(2), fe=m.group(3), n=int(m.group(4)), title=m.group(5).strip(), ben=ben,
                        story=story, persona=re.sub(r"^As (an?|the) ", "", story[0]), ac="\n".join(ac),
                        deps=re.findall(r"@depends:(US-[\d.]+)", tags), admin="@admin" in tags, nxt="@status:next" in tags))
    return feat, bg, out

feats = []
for f in sorted(glob.glob("features/*/*.feature")):
    feat, bg, st = stories_of(f); feats.append((f, feat, bg, st))
allst = [s for *_, st in feats for s in st]; by = {s["id"]: s for s in allst}
memo = {}
def wave(i):
    if i not in memo: memo[i] = 1 + max([wave(d) for d in by[i]["deps"]] + [0])
    return memo[i]
waves = max(wave(s["id"]) for s in allst)

o = ["# Story map", "", open("tools/jira-notes.md").read().rstrip(), "",
     "## How to read a story", "",
     "Every story below is one Jira Story, shown the way it is filled in: **ID · name**, **persona**, **business benefit**, "
     "**user story**, then the **acceptance criteria**. `Depends on` = create as \"is blocked by\" links. "
     "**Wave** = earliest build wave across the whole product (wave 1 needs nothing; a story can start once everything it depends on is done). "
     "🛡 site-admin story · ⏭ planned, not built yet.", "",
     f"**{len(allst)} stories · {len(feats)} features · 9 epics · {waves} build waves.** "
     "Generated from the `.feature` files with `python3 tools/story-map.py` — edit the features, then regenerate.", "",
     "## Contents", ""]
for ep in EPIC:
    o.append(f"- [{ep} · {EPIC[ep]}](#{ep}--{EPIC[ep].lower().replace(' & ', '--').replace(' ', '-')})")
cur = None
for f, feat, bg, st in feats:
    if not st: continue
    if st[0]["ep"] != cur:
        cur = st[0]["ep"]; o += ["", "---", "", f"## {cur} · {EPIC[cur]}"]
    o += ["", f"### Feature: {feat}", f"Source: [`{os.path.basename(f)}`]({f})", "",
          "| # | Story | Persona | Depends on | Wave |", "|---|---|---|---|---|"]
    for s in st:
        mark = (" 🛡" if s["admin"] else "") + (" ⏭" if s["nxt"] else "")
        o.append(f"| {s['n']} | {s['id']} · {s['title']}{mark} | {s['persona']} | {', '.join(s['deps']) or '—'} | {wave(s['id'])} |")
    if bg:
        o += ["", "*Background — applies to every story of this feature (add it at the top of the acceptance criteria):*", "", "```gherkin", "Background:"] + ["  " + b for b in bg] + ["```"]
    for s in st:
        mark = (" 🛡" if s["admin"] else "") + (" ⏭" if s["nxt"] else "")
        o += ["", f"#### {s['id']} · {s['title']}{mark}", "",
              "| Field | Value |", "|---|---|",
              f"| Issue type | Story |", f"| Story type | Functional |", f"| Sprint | TBD |", f"| Team | WPB Digital Browser: Tools |",
              f"| Persona | {s['persona']} |", f"| Depends on | {', '.join(s['deps']) or '—'} |", f"| Build wave | {wave(s['id'])} |", "",
              "**Business benefit**", "", s["ben"], "",
              "**User story**", ""] + [f"> {line}  " for line in s["story"]] + ["",
              "**Acceptance criteria**", "", "```gherkin", s["ac"], "```"]
o += ["", "---", "", "## Build waves (whole product)", "", "Stories in the same wave can be built in parallel once the earlier waves are done.", ""]
for w in range(1, waves + 1):
    o += [f"**Wave {w}** — " + " · ".join(f"{s['id']} {s['title']}" for s in allst if wave(s["id"]) == w), ""]
open("STORY-MAP.md", "w").write("\n".join(o))
print(f"{len(allst)} stories, {waves} waves")
