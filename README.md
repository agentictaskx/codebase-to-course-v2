# Codebase-to-Course v2

A schema-driven pipeline that turns any codebase into a beautiful, interactive single-page HTML course — using **75% fewer tokens** than v1.

> **Original v1 by [Zara Zhang](https://x.com/zarazhangrui).** v2 optimization by Neal Zhang.

## What It Does

Point this skill at any codebase. It generates an interactive course that teaches how the code works — with scroll-based navigation, animated visualizations, embedded quizzes, and code-with-plain-English side-by-side translations. All in a single self-contained HTML file.

## v1 vs v2

| Aspect | v1 (Zara Zhang) | v2 (This repo) |
|--------|-----------------|----------------|
| **Architecture** | LLM generates entire HTML | LLM generates JSON only; build script assembles |
| **Token usage** | ~25,000 tokens per course | ~6,000 tokens (**75% reduction**) |
| **Iteration** | Regenerate entire HTML | Regenerate only the changed module |
| **Quality control** | LLM must maintain CSS/JS consistency | Static templates guarantee consistency |
| **Output modes** | Single HTML file | Single HTML + dev multi-file mode |
| **Element types** | Varies per generation | 15 standardized types with schema validation |

## How It Works

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   LLM    │────▶│  Schema  │────▶│  Build   │────▶│  HTML    │
│ (Claude) │     │ Validate │     │ Script   │     │ Output   │
│          │     │          │     │          │     │          │
│ Generates│     │ Checks   │     │ Assembles│     │ Single   │
│ JSON     │     │ required │     │ JSON +   │     │ file,    │
│ content  │     │ fields   │     │ templates│     │ works    │
│          │     │          │     │          │     │ offline  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                       ▲
                                       │
                                  ┌──────────┐
                                  │ Templates│
                                  │ (static) │
                                  │          │
                                  │ HTML +   │
                                  │ CSS +    │
                                  │ JS       │
                                  └──────────┘
```

1. **Analyze** — AI reads the codebase and creates a structured profile
2. **Generate** — AI produces course content as JSON (one module at a time)
3. **Validate** — Schema checks all required fields before building
4. **Compile** — Build script assembles JSON + templates into final HTML

## Usage

### As a Claude Code Skill

1. Copy this folder to `~/.claude/skills/codebase-to-course-v2/`
2. Open any project in Claude Code
3. Say: *"Turn this codebase into a course v2"*

### Build Script

```bash
# Compile course content JSON into HTML
node build/compile.js course-content.json --output ./output --mode single

# Modes: single (one file), dev (multi-file), both
```

### Trigger Phrases

- "Turn this into a course v2"
- "Codebase to course v2"
- "Interactive course v2"
- "Teach this code v2"

## File Structure

```
codebase-to-course-v2/
├── SKILL.md                          # AI instructions
├── schemas/
│   ├── course-content.schema.json    # Course data shape (what AI must produce)
│   └── codebase-profile.schema.json  # Codebase analysis shape
├── templates/
│   ├── base.html                     # Page skeleton with placeholders
│   ├── styles.css                    # All visual styling (1,391 lines)
│   └── scripts.js                    # All interactivity (715 lines)
├── build/
│   ├── compile.js                    # The assembler (627 lines)
│   └── test-course.json              # Sample course for testing
├── components/                       # Reusable HTML snippets (extensible)
└── references/                       # Design reference docs
```

## 15 Element Types

| Type | Use When |
|------|----------|
| `prose` | Short text blocks (2-3 sentences max) |
| `translation` | Explaining real code (code ↔ plain English) |
| `chat` | Components "talking" to each other |
| `flow` | Data moving between components |
| `callout` | Aha-moment insight boxes |
| `step_cards` | Sequential processes |
| `pattern_cards` | Engineering pattern grids |
| `icon_rows` | Component/feature lists |
| `file_tree` | Annotated file structure |
| `architecture` | System architecture diagram |
| `badge_list` | Config/permission annotations |
| `layer_toggle` | Layer-by-layer HTML/CSS/JS demo |
| `spot_the_bug` | Bug-finding challenge |
| `diff_view` | Before/after code comparison |
| `custom_html` | Escape hatch for unique elements |

## The Key Insight

> Why have the AI regenerate 1,400 lines of CSS and 700 lines of JavaScript every single time? The styling and interactivity never change — only the content does.

v2 moves all presentation into static templates. The AI focuses entirely on the creative work: understanding the codebase and teaching it clearly.

## Credits

- **v1 (codebase-to-course)** — Created by [Zara Zhang](https://x.com/zarazhangrui) with Claude Code
- **v2 (this repo)** — Schema-driven optimization by Neal Zhang

## License

Original work copyright Zara Zhang. v2 modifications by Neal Zhang.
