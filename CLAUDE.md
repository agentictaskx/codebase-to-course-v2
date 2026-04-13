# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Claude Code skill that turns any codebase into an interactive single-page HTML course. v2 uses a schema-driven pipeline: the LLM generates structured JSON, a build script assembles the final HTML from templates. Saves ~75% output tokens vs v1.

Original v1 by [Zara Zhang](https://x.com/zarazhangrui). v2 optimization by Neal Zhang.

## Build Command

```bash
# Compile course content JSON into HTML
node build/compile.js <course-content.json> --output ./output --mode single

# Modes: single (one HTML file), dev (multi-file), both
```

No package.json — `compile.js` uses only Node.js built-ins (fs, path).

## Architecture

```
LLM generates JSON → Schema validates → compile.js assembles JSON + templates → HTML output
```

**The key insight:** CSS (1,391 lines) and JS (715 lines) never change — only the content does. The LLM generates **only JSON**, never HTML/CSS/JS.

### File Roles

| File | Purpose | Who edits |
|------|---------|-----------|
| `SKILL.md` | AI instructions (tells Claude how to use this skill) | Human |
| `schemas/course-content.schema.json` | Defines the JSON shape the LLM must produce | Human |
| `schemas/codebase-profile.schema.json` | Defines codebase analysis shape | Human |
| `build/compile.js` (627 lines) | Assembler — reads JSON + templates, outputs HTML | Human |
| `templates/base.html` | Page skeleton with placeholders | Human |
| `templates/styles.css` | All visual styling | Human |
| `templates/scripts.js` | All interactivity (scroll nav, quizzes, animations) | Human |

### 15 Element Types

The schema defines 15 element types: `prose`, `translation`, `chat`, `flow`, `callout`, `step_cards`, `pattern_cards`, `icon_rows`, `file_tree`, `architecture`, `badge_list`, `layer_toggle`, `spot_the_bug`, `diff_view`, `custom_html`.

## Usage as a Skill

Install to `~/.claude/skills/codebase-to-course-v2/`, then say "turn this into a course v2" in any project. The skill analyzes the codebase → generates JSON per module → runs `compile.js` → opens HTML.
