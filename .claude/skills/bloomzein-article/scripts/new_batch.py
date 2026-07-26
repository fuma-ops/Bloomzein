# -*- coding: utf-8 -*-
"""Bloomzein batch generator — template.

Copy this file per batch (e.g. to a scratchpad), fill in CATEGORY, CHUNK, and
the ARTS list, then run it. It:
  1. appends each body into src/content/reads/<CHUNK>.ts's `bodies` object, and
  2. prints ready-to-paste catalogue entries for src/lib/readsData.ts.

The content chunk must already exist and end with `export default bodies;`
(create it + register a loader in registry.ts for a brand-new category first —
see references/architecture.md). Bodies must not contain a literal backtick.
"""
import re, json, os

REPO = "/home/user/Bloomzein"
CATEGORY = "Mental Wellness"          # exact Category string
CHUNK = "mental-wellness"             # src/content/reads/<CHUNK>.ts

# Each: id, phase (or None), blooms, title, excerpt (dek), body (markdown).
ARTS = [
    {
        "id": "MW001", "phase": None, "blooms": "2.4k",
        "title": "Why Am I So Tired All the Time?",
        "excerpt": "You rest, you sleep, you do everything right — and the tiredness still follows you. When it won't lift, your body is usually pointing at something.",
        "body": r"""# Why Am I So Tired All the Time?

*Put the real article here.*

Opening hook paragraph.

## A Section

Body.

@tool cycle | Soft invitation that reads as help — open your Cycle Tracker

@read SP011 | Tease a related article →

## Bloom Reflection

...

## Bloom Tips

- ...

## Today's Bloom

...

## Bloom Reminder

...
""",
    },
    # ... four more
]


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")


def main() -> None:
    path = os.path.join(REPO, "src/content/reads", CHUNK + ".ts")
    src = open(path).read()
    assert src.rstrip().endswith("export default bodies;"), \
        f"{path} must end with 'export default bodies;'"
    inject = "".join(f"  {json.dumps(a['id'])}: `{esc(a['body'])}`,\n" for a in ARTS)
    idx = src.rindex("};")
    open(path, "w").write(src[:idx] + inject + src[idx:])
    print(f"appended to {CHUNK}.ts:", [a["id"] for a in ARTS])

    print("\n--- catalogue entries (paste into readsData.ts) ---")
    for a in ARTS:
        ph = f', phase: "{a["phase"]}"' if a["phase"] else ""
        words = len(re.findall(r"\w+", a["body"]))
        mins = max(3, round(words / 200))
        title = json.dumps(a["title"], ensure_ascii=False)
        excerpt = json.dumps(a["excerpt"], ensure_ascii=False)
        print(f'  {{ id: "{a["id"]}", title: {title}, category: "{CATEGORY}", '
              f'minutes: {mins}, blooms: "{a["blooms"]}", image: CAT_IMG["{CATEGORY}"]{ph}, '
              f'status: "review",\n    excerpt: {excerpt} }},')


if __name__ == "__main__":
    main()
