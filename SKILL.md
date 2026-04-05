---
name: codebase-to-course-v2
description: "Turn any codebase into a beautiful, interactive single-page HTML course. v2 uses a schema-driven pipeline: the LLM generates structured JSON content, and a build script assembles the final HTML from templates. This saves ~75% of output tokens vs v1 while maintaining identical output quality. Trigger phrases: 'turn this into a course v2', 'codebase to course v2', 'interactive course v2', 'teach this code v2'."
---

# Codebase-to-Course v2

Generate structured course content as JSON. A build script handles all HTML/CSS/JS assembly.

**You do NOT generate HTML, CSS, or JavaScript.** You generate JSON that conforms to the course content schema. The build script (`build/compile.js`) assembles the final course from your JSON + static templates.

## Workflow

### Step 1: First-Run Welcome

When triggered without a specific codebase:

> **I can turn any codebase into an interactive course that teaches how it works — no coding knowledge required.**
>
> Just point me at a project:
> - **A local folder** — e.g., "turn ./my-project into a course v2"
> - **A GitHub link** — e.g., "make a course from https://github.com/user/repo"
> - **The current project** — if you're already in a codebase, just say "turn this into a course v2"

If given a GitHub link, clone first: `git clone <url> /tmp/<repo-name>`

### Step 2: Analyze Codebase → Codebase Profile

Read the codebase thoroughly. Extract:
- What the app does (figure this out yourself — don't ask the user)
- The main "actors" (components, services, modules) and their responsibilities
- The primary user journey (end-to-end)
- Key data flows and communication patterns
- Clever engineering patterns (caching, error handling, etc.)
- The tech stack and file structure

**Output:** Write a `codebase-profile.json` file to the output directory. Show a brief summary to the user:

> "This is [app name] — [description]. It has [N] main components: [list]. The primary user journey is [journey]. Ready to generate the course?"

Wait for user confirmation before proceeding.

### Step 3: Generate Course Content → JSON

Generate course content as JSON conforming to `schemas/course-content.schema.json`.

**Generate per-module** — write each module as a separate JSON object, then combine into the final course content file. This prevents quality degradation in later modules.

**Generation order:**
1. Course metadata (title, subtitle, accent color, actors, glossary)
2. Module 1 content
3. Module 2 content
4. ... (one at a time)

**Output:** Write `course-content.json` to the output directory.

### Step 4: Build → HTML

Run the build script to compile the course:

```bash
node ~/.claude/skills/codebase-to-course-v2/build/compile.js course-content.json --output ./output --mode both
```

This produces:
- `output/course.html` — single self-contained file (distributable)
- `output/dev/` — multi-file version (for iteration)

Open `output/course.html` in the browser for the user to review.

### Step 5: Iterate

If the user wants changes to a specific module:
1. Regenerate only that module's JSON
2. Update `course-content.json`
3. Re-run the build script

---

## Content Guidelines

### Target Audience
**Vibe coders** — people who build software by instructing AI, without a CS education. Assume zero technical background. Every term needs a glossary definition.

### Curriculum Design (5-8 modules)

| Position | Purpose | Why it matters for a vibe coder |
|---|---|---|
| 1 | What the app does + trace a user action | Grounds everything in concrete experience |
| 2 | Meet the actors (components) | Know which pieces exist to direct AI better |
| 3 | How the pieces communicate | Debug "it's not showing up" problems |
| 4 | External services (APIs, databases) | Evaluate costs, rate limits, failure modes |
| 5 | Clever patterns (caching, error handling) | Request these patterns from AI |
| 6 | When things break (debugging) | Escape AI bug loops |
| 7 | Big picture architecture | Make better decisions about what to build next |

Adapt the number of modules to the codebase's complexity. Not every codebase needs all 7.

### Content Rules

1. **Max 2-3 sentences per prose block.** If writing a 4th sentence, convert to a visual element instead.
2. **Every screen ≥50% visual** — diagrams, code blocks, cards, animations, anything non-paragraph.
3. **One concept per screen.** If you need more space, add another screen.
4. **Metaphors first, then code.** Each concept gets a unique metaphor. NEVER reuse metaphors. NEVER use "restaurant" more than once.
5. **Original code only.** Never modify code snippets. Choose naturally short (5-10 line) sections.
6. **Quizzes test application, not memory.** "You want to add favorites — which files change?" NOT "What does API stand for?"

### Required Elements Per Module
- At least 1 code ↔ English translation block
- At least 1 quiz (3-5 questions, placed at end)
- At least 3 screens

### Required Across Entire Course
- At least 1 group chat animation
- At least 1 data flow animation

### Glossary
Define every technical term. Be extremely aggressive — if there's even a 1% chance a non-technical person doesn't know a word, add it to the glossary. The build script auto-injects tooltips on first occurrence per module.

---

## JSON Schema Quick Reference

### Element Types

| Type | Key Fields | Use When |
|---|---|---|
| `prose` | `content` (HTML string) | Short text blocks (≤3 sentences) |
| `translation` | `file`, `code_lines[{code, english}]` | Explaining real code |
| `chat` | `messages[{sender, text}]` | Components "talking" to each other |
| `flow` | `steps[{from, to, label, highlight}]` | Data moving between components |
| `callout` | `variant`, `title`, `content` | Aha-moment insight boxes |
| `step_cards` | `steps[{title, description}]` | Sequential processes |
| `pattern_cards` | `cards[{icon, title, description}]` | Engineering pattern grids |
| `icon_rows` | `items[{icon, title, description}]` | Component/feature lists |
| `file_tree` | `tree` (nested nodes) | Annotated file structure |
| `architecture` | `zones[{label, components[]}]` | System architecture diagram |
| `badge_list` | `badges[{code, description}]` | Config/permission annotations |
| `layer_toggle` | `layers{html, css, js}` | Layer-by-layer HTML/CSS/JS demo |
| `spot_the_bug` | `lines[{code, is_bug}]`, `bug_explanation` | Bug-finding challenge |
| `diff_view` | `before{code}`, `after{code}`, `description` | Before/after code comparison |
| `custom_html` | `html` (raw HTML) | Escape hatch for unique elements |

### What You Do NOT Generate
- ❌ No CSS (static template handles all styling)
- ❌ No JavaScript (static script handles all interactivity)
- ❌ No HTML scaffolding (base template handles layout)
- ❌ No `<style>` or `<script>` tags
- ❌ No tooltip markup (build script auto-injects from glossary)

You ONLY output structured JSON. The build pipeline handles everything else.
