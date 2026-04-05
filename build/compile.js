#!/usr/bin/env node
/**
 * Codebase-to-Course v2 — Build Script
 * Compiles course content JSON + templates → final HTML output
 *
 * Usage:
 *   node compile.js <course-content.json> [--output <dir>] [--mode single|dev|both]
 *
 * Modes:
 *   single — One self-contained HTML file (default, for distribution)
 *   dev    — Multi-file output (index.html + styles.css + scripts.js + modules/)
 *   both   — Generate both outputs
 */

const fs = require('fs');
const path = require('path');

// Resolve paths relative to the skill directory
const SKILL_DIR = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(SKILL_DIR, 'templates');
const COMPONENTS_DIR = path.join(SKILL_DIR, 'components');

// ==========================================================================
// CLI PARSING
// ==========================================================================
function parseArgs() {
  const args = process.argv.slice(2);
  const config = { inputFile: null, outputDir: './output', mode: 'single' };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) { config.outputDir = args[++i]; }
    else if (args[i] === '--mode' && args[i + 1]) { config.mode = args[++i]; }
    else if (!args[i].startsWith('--')) { config.inputFile = args[i]; }
  }

  if (!config.inputFile) {
    console.error('Usage: node compile.js <course-content.json> [--output <dir>] [--mode single|dev|both]');
    process.exit(1);
  }
  return config;
}

// ==========================================================================
// FILE LOADING
// ==========================================================================
function loadJSON(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function loadTemplate(name) {
  return fs.readFileSync(path.join(TEMPLATES_DIR, name), 'utf8');
}

function loadComponent(name) {
  const filePath = path.join(COMPONENTS_DIR, name);
  if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf8');
  return null;
}

// ==========================================================================
// VALIDATION
// ==========================================================================
function validate(course) {
  const errors = [];
  const warnings = [];

  if (!course.meta || !course.meta.title) errors.push('Missing course title');
  if (!course.modules || course.modules.length === 0) errors.push('No modules defined');
  if (!course.glossary) warnings.push('No glossary defined');

  const actorIds = (course.meta?.actors || []).map(a => a.id);

  (course.modules || []).forEach((mod, mi) => {
    const modLabel = `Module ${mi + 1} ("${mod.title || 'untitled'}")`;

    if (!mod.quiz) errors.push(`${modLabel}: Missing quiz`);
    if (!mod.screens || mod.screens.length === 0) errors.push(`${modLabel}: No screens`);
    if (mod.screens && mod.screens.length < 3) warnings.push(`${modLabel}: Fewer than 3 screens`);

    // Check for at least one translation
    let hasTranslation = false;
    let hasInteractive = false;

    (mod.screens || []).forEach(screen => {
      (screen.elements || []).forEach(el => {
        if (el.type === 'translation') hasTranslation = true;
        if (['chat', 'flow', 'architecture', 'spot_the_bug', 'layer_toggle'].includes(el.type)) hasInteractive = true;

        // Validate actor references in chat/flow
        if (el.type === 'chat') {
          (el.messages || []).forEach(msg => {
            if (!actorIds.includes(msg.sender) && msg.sender !== 'external') {
              errors.push(`${modLabel}: Chat references unknown actor "${msg.sender}"`);
            }
          });
        }
        if (el.type === 'flow') {
          (el.steps || []).forEach(step => {
            if (step.highlight && !actorIds.includes(step.highlight) && step.highlight !== 'external') {
              warnings.push(`${modLabel}: Flow references unknown actor "${step.highlight}"`);
            }
          });
        }
        // Validate translation has code
        if (el.type === 'translation') {
          if (!el.code_lines || el.code_lines.length === 0) {
            errors.push(`${modLabel}: Translation block has no code lines`);
          }
        }
      });
    });

    if (!hasTranslation) errors.push(`${modLabel}: Missing code translation block`);
    if (!hasInteractive) warnings.push(`${modLabel}: No interactive element (chat, flow, etc.)`);

    // Validate quiz
    if (mod.quiz) {
      (mod.quiz.questions || []).forEach((q, qi) => {
        if (!q.correct) errors.push(`${modLabel} Quiz Q${qi + 1}: Missing correct answer`);
        if (!q.explanations?.correct) warnings.push(`${modLabel} Quiz Q${qi + 1}: Missing correct explanation`);
      });
    }
  });

  return { errors, warnings };
}

// ==========================================================================
// GLOSSARY INJECTION
// ==========================================================================
function injectGlossary(html, glossary, moduleIndex) {
  if (!glossary || Object.keys(glossary).length === 0) return html;

  const used = new Set();
  // Sort terms by length (longest first) to avoid partial matches
  const terms = Object.keys(glossary).sort((a, b) => b.length - a.length);

  for (const term of terms) {
    if (used.has(term.toLowerCase())) continue;

    // Match whole word, case-insensitive, NOT inside HTML tags or existing .term spans
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![<\\w])\\b(${escapedTerm})\\b(?![^<]*>|[^<]*<\\/span)`, 'i');
    const match = html.match(regex);

    if (match) {
      const definition = glossary[term].replace(/"/g, '&quot;');
      const replacement = `<span class="term" data-definition="${definition}">${match[1]}</span>`;
      html = html.replace(regex, replacement);
      used.add(term.toLowerCase());
    }
  }

  return html;
}

// ==========================================================================
// ELEMENT RENDERERS
// ==========================================================================
const Renderers = {
  prose(el) {
    return `<div class="prose-block">${el.content}</div>`;
  },

  translation(el) {
    const codeLines = (el.code_lines || []).map(cl =>
      `<span class="code-line">${escapeHtml(cl.code)}</span>`
    ).join('\n');
    const englishLines = (el.code_lines || []).map(cl =>
      `<p class="tl">${cl.english}</p>`
    ).join('\n');
    const fileBadge = el.file ? `<div class="translation-file-badge">${escapeHtml(el.file)}${el.lines ? ' · lines ' + el.lines : ''}</div>` : '';

    return `<div class="translation-block animate-in">
  <div class="translation-code">
    <span class="translation-label">CODE</span>
    ${fileBadge}
    <pre><code>${codeLines}</code></pre>
  </div>
  <div class="translation-english">
    <span class="translation-label">PLAIN ENGLISH</span>
    <div class="translation-lines">${englishLines}</div>
  </div>
</div>`;
  },

  chat(el, moduleId, actors) {
    const actorsMap = {};
    (actors || []).forEach(a => {
      actorsMap[a.id] = { name: a.name, initials: a.initials, color: `var(--color-actor-${a.color_index})` };
    });
    const chatId = `${moduleId}-chat-${Math.random().toString(36).slice(2, 8)}`;
    const messages = (el.messages || []).map((msg, i) => {
      const actor = actorsMap[msg.sender] || { initials: msg.sender[0].toUpperCase(), color: 'var(--color-actor-1)' };
      return `<div class="chat-message" data-msg="${i}" data-sender="${msg.sender}" style="display:none">
      <div class="chat-avatar" style="background: ${actor.color}">${actor.initials}</div>
      <div class="chat-bubble">
        <span class="chat-sender" style="color: ${actor.color}">${actorsMap[msg.sender]?.name || msg.sender}</span>
        <p>${msg.text}</p>
      </div>
    </div>`;
    }).join('\n');

    return `<div class="chat-window animate-in" id="${chatId}" data-actors='${JSON.stringify(actorsMap)}'>
  <div class="chat-messages">${messages}</div>
  <div class="chat-typing" style="display:none">
    <div class="chat-avatar">?</div>
    <div class="chat-typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>
  </div>
  <div class="chat-controls">
    <button class="chat-next-btn">Next Message</button>
    <button class="chat-play-btn">Play All</button>
    <button class="chat-reset-btn">Replay</button>
    <span class="chat-progress">0 / ${el.messages.length} messages</span>
  </div>
</div>`;
  },

  flow(el, moduleId, actors) {
    const flowId = `${moduleId}-flow-${Math.random().toString(36).slice(2, 8)}`;
    const actorIds = [...new Set(el.steps.flatMap(s => [s.from, s.to, s.highlight].filter(Boolean)))];
    const actorEls = actorIds.filter(id => id !== 'external').map(id => {
      const actor = (actors || []).find(a => a.id === id);
      const color = actor ? `var(--color-actor-${actor.color_index})` : 'var(--color-actor-1)';
      const initials = actor ? actor.initials : id[0].toUpperCase();
      return `<div class="flow-actor" id="${flowId}-${id}">
      <div class="flow-actor-icon" style="background: ${color}">${initials}</div>
      <span>${actor ? actor.name : id}</span>
    </div>`;
    }).join('\n');

    return `<div class="flow-animation animate-in" id="${flowId}" data-steps='${JSON.stringify(el.steps)}'>
  <div class="flow-actors">${actorEls}</div>
  <div class="flow-step-label">Click "Next Step" to begin</div>
  <div class="flow-controls">
    <button class="flow-next-btn">Next Step</button>
    <button class="flow-reset-btn">Restart</button>
    <span class="flow-progress">Step 0 / ${el.steps.length}</span>
  </div>
</div>`;
  },

  callout(el) {
    const variant = el.variant || 'accent';
    const icon = el.icon || '💡';
    return `<div class="callout callout-${variant} animate-in">
  <div class="callout-icon">${icon}</div>
  <div class="callout-content">
    <strong class="callout-title">${el.title}</strong>
    <p>${el.content}</p>
  </div>
</div>`;
  },

  step_cards(el) {
    const cards = (el.steps || []).map((step, i) =>
      `<div class="step-card animate-in">
    <div class="step-num">${i + 1}</div>
    <div class="step-body">
      <strong>${step.title}</strong>
      <p>${step.description}</p>
    </div>
  </div>`
    ).join('\n');
    return `<div class="step-cards stagger-children">${cards}</div>`;
  },

  pattern_cards(el) {
    const cards = (el.cards || []).map(card => {
      const colorIdx = card.color_index || 1;
      return `<div class="pattern-card animate-in" style="border-top: 3px solid var(--color-actor-${colorIdx})">
    <div class="pattern-icon" style="background: var(--color-actor-${colorIdx})">${card.icon || '🔧'}</div>
    <h4 class="pattern-title">${card.title}</h4>
    <p class="pattern-desc">${card.description}</p>
  </div>`;
    }).join('\n');
    return `<div class="pattern-cards stagger-children">${cards}</div>`;
  },

  icon_rows(el) {
    const rows = (el.items || []).map(item => {
      const colorIdx = item.color_index || 1;
      return `<div class="icon-row animate-in">
    <div class="icon-circle" style="background: var(--color-actor-${colorIdx})">${item.icon || '📦'}</div>
    <div>
      <strong>${item.title}</strong>
      <p>${item.description}</p>
    </div>
  </div>`;
    }).join('\n');
    return `<div class="icon-rows stagger-children">${rows}</div>`;
  },

  file_tree(el) {
    function renderNode(node, isRoot) {
      const type = node.type || (node.children ? 'folder' : 'file');
      const cls = type === 'folder' ? 'ft-folder' : 'ft-file';
      const rootCls = isRoot ? ' ft-root' : '';
      const desc = node.description ? `<span class="ft-desc">${node.description}</span>` : '';
      let children = '';
      if (node.children && node.children.length > 0) {
        children = `<div class="ft-children">${node.children.map(c => renderNode(c, false)).join('\n')}</div>`;
      }
      return `<div class="${cls}${rootCls}"><span class="ft-name">${node.name}</span>${desc}${children}</div>`;
    }
    const nodes = (el.tree || []).map(n => renderNode(n, true)).join('\n');
    return `<div class="file-tree animate-in">${nodes}</div>`;
  },

  architecture(el) {
    const zones = (el.zones || []).map(zone => {
      const comps = (zone.components || []).map(comp =>
        `<div class="arch-component" data-desc="${escapeHtml(comp.description)}">
      <div class="arch-icon">${comp.icon || '📦'}</div>
      <span>${comp.name}</span>
    </div>`
      ).join('\n');
      return `<div class="arch-zone${zone.css_class ? ' ' + zone.css_class : ''}">
    <h4 class="arch-zone-label">${zone.label}</h4>
    <div class="arch-components">${comps}</div>
  </div>`;
    }).join('\n');
    return `<div class="arch-diagram animate-in">
  ${zones}
  <div class="arch-description">Click any component to learn what it does</div>
</div>`;
  },

  badge_list(el) {
    const badges = (el.badges || []).map(b =>
      `<div class="badge-item">
    <code class="badge-code">${escapeHtml(b.code)}</code>
    <span class="badge-desc">${b.description}</span>
  </div>`
    ).join('\n');
    return `<div class="badge-list animate-in">${badges}</div>`;
  },

  layer_toggle(el) {
    const id = 'layer-' + Math.random().toString(36).slice(2, 8);
    const tabs = Object.keys(el.layers || {}).map((key, i) => {
      const label = key === 'html' ? 'HTML' : key === 'css' ? '+ CSS' : '+ JS';
      const desc = el.descriptions?.[key] || '';
      return `<button class="layer-tab${i === 0 ? ' active' : ''}" data-layer="${id}-${key}" data-desc="${escapeHtml(desc)}">${label}</button>`;
    }).join('\n');
    const layers = Object.entries(el.layers || {}).map(([key, content], i) =>
      `<div class="layer${i === 0 ? ' active' : ''}" id="${id}-${key}">${content}</div>`
    ).join('\n');
    const firstDesc = el.descriptions?.[Object.keys(el.layers)[0]] || '';
    return `<div class="layer-demo animate-in">
  <div class="layer-tabs">${tabs}</div>
  <div class="layer-viewport">${layers}</div>
  <p class="layer-description">${firstDesc}</p>
</div>`;
  },

  spot_the_bug(el) {
    const lines = (el.lines || []).map((line, i) =>
      `<div class="bug-line" data-line="${i + 1}" data-bug="${line.is_bug}" data-hint="${escapeHtml(line.hint || 'Not this line — look more carefully...')}">
    <span class="line-num">${i + 1}</span>
    <code>${escapeHtml(line.code)}</code>
  </div>`
    ).join('\n');
    return `<div class="bug-challenge animate-in" data-explanation="${escapeHtml(el.bug_explanation || '')}">
  <h3>🐛 Find the bug in this code:</h3>
  <div class="bug-code">${lines}</div>
  <div class="bug-feedback"></div>
</div>`;
  },

  diff_view(el) {
    const beforeLabel = el.before?.file || 'Before';
    const afterLabel = el.after?.file || 'After';
    return `<div class="diff-view animate-in">
  <div class="diff-pane diff-before">
    <span class="diff-label">${escapeHtml(beforeLabel)} (before)</span>
    <pre><code>${escapeHtml(el.before?.code || '')}</code></pre>
  </div>
  <div class="diff-pane diff-after">
    <span class="diff-label">${escapeHtml(afterLabel)} (after)</span>
    <pre><code>${escapeHtml(el.after?.code || '')}</code></pre>
  </div>
  ${el.description ? `<div class="diff-description">${el.description}</div>` : ''}
</div>`;
  },

  custom_html(el) {
    return `<div class="custom-element animate-in">${el.html}</div>`;
  }
};

// ==========================================================================
// QUIZ RENDERER
// ==========================================================================
function renderQuiz(quiz, moduleId) {
  if (!quiz || !quiz.questions || quiz.questions.length === 0) return '';

  const questions = quiz.questions.map((q, qi) => {
    const qId = `${moduleId}-q${qi}`;
    const scenarioBlock = q.scenario_context
      ? `<div class="scenario-context"><span class="scenario-label">Scenario</span><p>${q.scenario_context}</p></div>`
      : '';
    const options = (q.options || []).map(opt =>
      `<button class="quiz-option" data-value="${opt.id}">
        <div class="quiz-option-radio"></div>
        <span>${opt.text}</span>
      </button>`
    ).join('\n');
    const explanationsJson = JSON.stringify(q.explanations || {}).replace(/"/g, '&quot;');
    return `<div class="quiz-question-block" data-question="${qId}" data-correct="${q.correct}" data-explanations="${explanationsJson}">
    ${scenarioBlock}
    <h3 class="quiz-question">${q.question}</h3>
    <div class="quiz-options">${options}</div>
    <div class="quiz-feedback"></div>
  </div>`;
  }).join('\n');

  return `<div class="quiz-container animate-in">
  <div class="quiz-header">🧠 Check Your Understanding</div>
  ${questions}
  <div class="quiz-actions">
    <button class="quiz-btn quiz-check-btn">Check Answers</button>
    <button class="quiz-btn quiz-reset-btn">Try Again</button>
  </div>
</div>`;
}

// ==========================================================================
// MODULE RENDERER
// ==========================================================================
function renderModule(mod, courseData) {
  const bgVar = mod.number % 2 === 0 ? 'var(--color-bg-warm)' : 'var(--color-bg)';
  const readingTime = mod.reading_time_minutes ? `<div class="module-reading-time">~${mod.reading_time_minutes} min</div>` : '';

  // Render screens
  const screens = (mod.screens || []).map((screen, si) => {
    const screenId = `${mod.id}-screen-${si}`;
    const elements = (screen.elements || []).map(el => {
      const renderer = Renderers[el.type];
      if (renderer) return renderer(el, mod.id, courseData.meta.actors);
      console.warn(`Unknown element type: ${el.type}`);
      return `<!-- Unknown element type: ${el.type} -->`;
    }).join('\n');

    return `<section class="screen animate-in" id="${screenId}">
  <h2 class="screen-heading">${screen.heading}</h2>
  ${elements}
</section>`;
  }).join('\n');

  // Render quiz
  const quizHtml = renderQuiz(mod.quiz, mod.id);

  // Inject glossary tooltips into all content
  let moduleHtml = `<section class="module" id="${mod.id}" style="background: ${bgVar}">
  <div class="module-content">
    <header class="module-header animate-in">
      <span class="module-number">${String(mod.number).padStart(2, '0')}</span>
      <h1 class="module-title">${mod.title}</h1>
      ${mod.subtitle ? `<p class="module-subtitle">${mod.subtitle}</p>` : ''}
      ${readingTime}
    </header>
    <div class="module-body">
      ${screens}
      ${quizHtml}
    </div>
  </div>
</section>`;

  // Auto-inject glossary tooltips
  moduleHtml = injectGlossary(moduleHtml, courseData.glossary, mod.number);

  return moduleHtml;
}

// ==========================================================================
// NAV & SIDEBAR GENERATORS
// ==========================================================================
function generateNavDots(modules) {
  return modules.map((mod, i) =>
    `<button class="nav-dot" data-target="${mod.id}" data-tooltip="${mod.title}" role="tab" aria-label="Module ${mod.number}: ${mod.title}"></button>`
  ).join('\n');
}

function generateSidebar(modules) {
  return modules.map(mod => {
    const screens = (mod.screens || []).map((screen, si) =>
      `<button class="sidebar-screen-link" data-target="${mod.id}-screen-${si}">${screen.heading}</button>`
    ).join('\n');
    const readingTime = mod.reading_time_minutes ? `<span class="sidebar-reading-time">~${mod.reading_time_minutes}m</span>` : '';
    return `<div class="sidebar-module">
  <div class="sidebar-module-title">
    <span class="sidebar-module-num">${String(mod.number).padStart(2, '0')}</span>
    <span>${mod.title}</span>
    ${readingTime}
  </div>
  <div class="sidebar-screens">${screens}</div>
</div>`;
  }).join('\n');
}

// ==========================================================================
// ASSEMBLY
// ==========================================================================
function assembleSingleFile(courseData) {
  const baseHtml = loadTemplate('base.html');
  const css = loadTemplate('styles.css');
  const js = loadTemplate('scripts.js');

  // Render all modules
  const modulesHtml = courseData.modules.map(mod => renderModule(mod, courseData)).join('\n');
  const navDots = generateNavDots(courseData.modules);
  const sidebarContent = generateSidebar(courseData.modules);
  const readingTime = courseData.meta.reading_time_minutes || courseData.modules.reduce((sum, m) => sum + (m.reading_time_minutes || 3), 0);

  let html = baseHtml;
  html = html.replace('{{title}}', courseData.meta.title || 'Course');
  html = html.replace('{{title}}', courseData.meta.title || 'Course'); // appears twice
  html = html.replace('{{accent_color}}', courseData.meta.accent_color || 'vermillion');
  html = html.replace('{{reading_time}}', String(readingTime));
  html = html.replace('{{nav_dots}}', navDots);
  html = html.replace('{{sidebar_content}}', sidebarContent);
  html = html.replace('{{modules_content}}', modulesHtml);
  html = html.replace('{{styles_placeholder}}', `<style>\n${css}\n</style>`);
  html = html.replace('{{scripts_placeholder}}', `<script>\n${js}\n</script>`);

  return html;
}

function assembleDevMode(courseData, outputDir) {
  const devDir = path.join(outputDir, 'dev');
  const modulesDir = path.join(devDir, 'modules');
  fs.mkdirSync(modulesDir, { recursive: true });

  // Copy static files
  fs.copyFileSync(path.join(TEMPLATES_DIR, 'styles.css'), path.join(devDir, 'styles.css'));
  fs.copyFileSync(path.join(TEMPLATES_DIR, 'scripts.js'), path.join(devDir, 'scripts.js'));

  // Write individual module files
  courseData.modules.forEach(mod => {
    const moduleHtml = renderModule(mod, courseData);
    fs.writeFileSync(path.join(modulesDir, `${mod.id}.html`), moduleHtml, 'utf8');
  });

  // Write index.html that links to external CSS/JS and loads modules
  const navDots = generateNavDots(courseData.modules);
  const sidebarContent = generateSidebar(courseData.modules);
  const readingTime = courseData.meta.reading_time_minutes || courseData.modules.reduce((sum, m) => sum + (m.reading_time_minutes || 3), 0);
  const modulesHtml = courseData.modules.map(mod => renderModule(mod, courseData)).join('\n');

  let baseHtml = loadTemplate('base.html');
  baseHtml = baseHtml.replace('{{title}}', courseData.meta.title || 'Course');
  baseHtml = baseHtml.replace('{{title}}', courseData.meta.title || 'Course');
  baseHtml = baseHtml.replace('{{accent_color}}', courseData.meta.accent_color || 'vermillion');
  baseHtml = baseHtml.replace('{{reading_time}}', String(readingTime));
  baseHtml = baseHtml.replace('{{nav_dots}}', navDots);
  baseHtml = baseHtml.replace('{{sidebar_content}}', sidebarContent);
  baseHtml = baseHtml.replace('{{modules_content}}', modulesHtml);
  baseHtml = baseHtml.replace('{{styles_placeholder}}', '<link rel="stylesheet" href="styles.css">');
  baseHtml = baseHtml.replace('{{scripts_placeholder}}', '<script src="scripts.js"></script>');

  fs.writeFileSync(path.join(devDir, 'index.html'), baseHtml, 'utf8');
  return devDir;
}

// ==========================================================================
// UTILITIES
// ==========================================================================
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ==========================================================================
// MAIN
// ==========================================================================
function main() {
  const config = parseArgs();
  console.log(`\n🔨 Codebase-to-Course v2 — Build\n`);

  // Load course content
  console.log(`📄 Loading: ${config.inputFile}`);
  const courseData = loadJSON(config.inputFile);

  // Validate
  console.log('🔍 Validating content...');
  const { errors, warnings } = validate(courseData);

  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${warnings.length}):`);
    warnings.forEach(w => console.log(`   • ${w}`));
  }

  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`);
    errors.forEach(e => console.log(`   • ${e}`));
    console.log('\nBuild aborted. Fix errors above and try again.\n');
    process.exit(1);
  }

  console.log('✅ Validation passed');

  // Create output directory
  fs.mkdirSync(config.outputDir, { recursive: true });

  // Build
  const mode = config.mode;
  if (mode === 'single' || mode === 'both') {
    console.log('\n📦 Building single-file output...');
    const html = assembleSingleFile(courseData);
    const outPath = path.join(config.outputDir, 'course.html');
    fs.writeFileSync(outPath, html, 'utf8');
    const sizeKB = Math.round(Buffer.byteLength(html, 'utf8') / 1024);
    console.log(`   ✅ ${outPath} (${sizeKB} KB)`);
  }

  if (mode === 'dev' || mode === 'both') {
    console.log('\n📁 Building dev-mode output...');
    const devDir = assembleDevMode(courseData, config.outputDir);
    console.log(`   ✅ ${devDir}/`);
  }

  console.log(`\n🎉 Build complete!\n`);
}

main();
