/* ==========================================================================
   Codebase-to-Course v2 — Interactive Scripts
   All JavaScript for interactive elements. This file is STATIC.
   ========================================================================== */

(function() {
  'use strict';

  // ==========================================================================
  // THEME MANAGEMENT
  // ==========================================================================
  const ThemeManager = {
    init() {
      const saved = localStorage.getItem('course-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = saved || (prefersDark ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);

      document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.addEventListener('click', () => this.toggle());
        this.updateLabel(btn, theme);
      });
    },
    toggle() {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('course-theme', next);
      document.querySelectorAll('.theme-toggle').forEach(btn => this.updateLabel(btn, next));
    },
    updateLabel(btn, theme) {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
  };

  // ==========================================================================
  // SCROLL & NAVIGATION
  // ==========================================================================
  const Navigation = {
    modules: [],
    currentModule: 0,

    init() {
      this.modules = Array.from(document.querySelectorAll('.module'));
      const progressBar = document.querySelector('.progress-bar');
      const navDots = document.querySelectorAll('.nav-dot');

      // Progress bar
      window.addEventListener('scroll', () => {
        requestAnimationFrame(() => {
          const scrollTop = window.scrollY;
          const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
          const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
          if (progressBar) progressBar.style.width = progress + '%';

          // Update current module
          this.updateCurrentModule();
        });
      }, { passive: true });

      // Nav dot clicks
      navDots.forEach((dot, i) => {
        dot.addEventListener('click', () => {
          if (this.modules[i]) {
            this.modules[i].scrollIntoView({ behavior: 'smooth' });
          }
        });
      });

      // Keyboard navigation
      document.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { this.nextModule(); e.preventDefault(); }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { this.prevModule(); e.preventDefault(); }
      });

      // Deep linking
      this.handleHashNavigation();
      window.addEventListener('hashchange', () => this.handleHashNavigation());
    },

    updateCurrentModule() {
      const scrollPos = window.scrollY + window.innerHeight / 3;
      let current = 0;
      this.modules.forEach((mod, i) => {
        if (mod.offsetTop <= scrollPos) current = i;
      });

      if (current !== this.currentModule) {
        this.currentModule = current;
        // Update nav dots
        document.querySelectorAll('.nav-dot').forEach((dot, i) => {
          dot.classList.toggle('current', i === current);
          if (i < current) dot.classList.add('visited');
        });
        // Update sidebar
        document.querySelectorAll('.sidebar-module').forEach((sm, i) => {
          sm.classList.toggle('expanded', i === current);
          sm.querySelector('.sidebar-module-title')?.classList.toggle('active', i === current);
        });
        // Update URL hash (without scrolling)
        const moduleId = this.modules[current]?.id;
        if (moduleId && history.replaceState) {
          history.replaceState(null, null, '#' + moduleId);
        }
      }
    },

    nextModule() {
      if (this.currentModule < this.modules.length - 1) {
        this.modules[this.currentModule + 1].scrollIntoView({ behavior: 'smooth' });
      }
    },

    prevModule() {
      if (this.currentModule > 0) {
        this.modules[this.currentModule - 1].scrollIntoView({ behavior: 'smooth' });
      }
    },

    handleHashNavigation() {
      const hash = window.location.hash.slice(1);
      if (hash) {
        const target = document.getElementById(hash);
        if (target) {
          setTimeout(() => target.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      }
    }
  };

  // ==========================================================================
  // SIDEBAR
  // ==========================================================================
  const Sidebar = {
    init() {
      const sidebar = document.querySelector('.sidebar');
      const toggle = document.querySelector('.sidebar-toggle');
      if (!sidebar || !toggle) return;

      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        toggle.setAttribute('aria-expanded', sidebar.classList.contains('open'));
      });

      // Module title clicks expand/collapse screens
      sidebar.querySelectorAll('.sidebar-module-title').forEach(title => {
        title.addEventListener('click', () => {
          const mod = title.closest('.sidebar-module');
          mod.classList.toggle('expanded');
        });
      });

      // Screen link clicks
      sidebar.querySelectorAll('.sidebar-screen-link').forEach(link => {
        link.addEventListener('click', () => {
          const targetId = link.dataset.target;
          const target = document.getElementById(targetId);
          if (target) target.scrollIntoView({ behavior: 'smooth' });
          // Close sidebar on mobile
          if (window.innerWidth <= 768) sidebar.classList.remove('open');
        });
      });
    }
  };

  // ==========================================================================
  // SCROLL ANIMATIONS (IntersectionObserver)
  // ==========================================================================
  const ScrollAnimations = {
    init() {
      // Set stagger indices
      document.querySelectorAll('.stagger-children').forEach(parent => {
        Array.from(parent.children).forEach((child, i) => {
          child.style.setProperty('--stagger-index', i);
        });
      });

      // Intersection Observer
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

      document.querySelectorAll('.animate-in').forEach(el => observer.observe(el));
    }
  };

  // ==========================================================================
  // QUIZZES
  // ==========================================================================
  const Quizzes = {
    init() {
      // Bind all quiz option clicks
      document.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', () => this.selectOption(btn));
      });
      // Bind check/reset buttons
      document.querySelectorAll('.quiz-check-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const container = btn.closest('.quiz-container');
          this.checkQuiz(container);
        });
      });
      document.querySelectorAll('.quiz-reset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const container = btn.closest('.quiz-container');
          this.resetQuiz(container);
        });
      });
    },

    selectOption(btn) {
      const block = btn.closest('.quiz-question-block');
      if (btn.disabled) return;
      block.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
      btn.classList.add('selected');
    },

    checkQuiz(container) {
      const questions = container.querySelectorAll('.quiz-question-block');
      let correct = 0;
      let total = questions.length;

      questions.forEach(q => {
        const selected = q.querySelector('.quiz-option.selected');
        const feedback = q.querySelector('.quiz-feedback');
        const correctValue = q.dataset.correct;

        if (!selected) {
          feedback.textContent = 'Pick an answer first!';
          feedback.className = 'quiz-feedback show warning';
          return;
        }

        const explanations = JSON.parse(q.dataset.explanations || '{}');

        if (selected.dataset.value === correctValue) {
          correct++;
          selected.classList.add('correct');
          feedback.innerHTML = '<strong>Exactly!</strong> ' + (explanations.correct || '');
          feedback.className = 'quiz-feedback show success';
        } else {
          selected.classList.add('incorrect');
          q.querySelector(`[data-value="${correctValue}"]`)?.classList.add('correct');
          const wrongExplanation = explanations[selected.dataset.value] || '';
          feedback.innerHTML = '<strong>Not quite.</strong> ' + wrongExplanation;
          feedback.className = 'quiz-feedback show error';
        }

        // Disable further interaction
        q.querySelectorAll('.quiz-option').forEach(o => o.disabled = true);
      });
    },

    resetQuiz(container) {
      container.querySelectorAll('.quiz-option').forEach(o => {
        o.classList.remove('selected', 'correct', 'incorrect');
        o.disabled = false;
      });
      container.querySelectorAll('.quiz-feedback').forEach(f => {
        f.className = 'quiz-feedback';
        f.innerHTML = '';
      });
    }
  };

  // ==========================================================================
  // GROUP CHAT ANIMATION
  // ==========================================================================
  const ChatAnimations = {
    chats: new Map(),

    init() {
      document.querySelectorAll('.chat-window').forEach(chatWindow => {
        const chatId = chatWindow.id || 'chat-' + Math.random().toString(36).slice(2);
        chatWindow.id = chatId;
        const messages = chatWindow.querySelectorAll('.chat-message');
        const actorsData = JSON.parse(chatWindow.dataset.actors || '{}');

        this.chats.set(chatId, {
          index: 0,
          messages: messages,
          actors: actorsData,
          window: chatWindow
        });

        // Hide all messages initially
        messages.forEach(msg => msg.style.display = 'none');

        // Bind controls
        const controls = chatWindow.querySelector('.chat-controls');
        if (controls) {
          controls.querySelector('.chat-next-btn')?.addEventListener('click', () => this.playNext(chatId));
          controls.querySelector('.chat-play-btn')?.addEventListener('click', () => this.playAll(chatId));
          controls.querySelector('.chat-reset-btn')?.addEventListener('click', () => this.reset(chatId));
        }
      });
    },

    playNext(chatId) {
      const chat = this.chats.get(chatId);
      if (!chat || chat.index >= chat.messages.length) return;

      const msg = chat.messages[chat.index];
      const sender = msg.dataset.sender;
      const typing = chat.window.querySelector('.chat-typing');
      const typingAvatar = chat.window.querySelector('.chat-typing .chat-avatar');

      // Show typing indicator
      if (typing && typingAvatar && chat.actors[sender]) {
        typingAvatar.textContent = chat.actors[sender].initials || sender[0].toUpperCase();
        typingAvatar.style.background = chat.actors[sender].color || 'var(--color-actor-1)';
        typing.style.display = 'flex';
      }

      setTimeout(() => {
        if (typing) typing.style.display = 'none';
        msg.style.display = 'flex';
        msg.style.animation = 'fadeSlideUp 0.3s var(--ease-out)';
        chat.index++;
        this.updateProgress(chatId);

        // Auto-scroll to bottom
        const container = chat.window.querySelector('.chat-messages');
        if (container) container.scrollTop = container.scrollHeight;
      }, 800);
    },

    playAll(chatId) {
      const chat = this.chats.get(chatId);
      if (!chat) return;
      const interval = setInterval(() => {
        if (chat.index >= chat.messages.length) { clearInterval(interval); return; }
        this.playNext(chatId);
      }, 1200);
    },

    reset(chatId) {
      const chat = this.chats.get(chatId);
      if (!chat) return;
      chat.index = 0;
      chat.messages.forEach(msg => {
        msg.style.display = 'none';
        msg.style.animation = '';
      });
      this.updateProgress(chatId);
    },

    updateProgress(chatId) {
      const chat = this.chats.get(chatId);
      if (!chat) return;
      const progress = chat.window.querySelector('.chat-progress');
      if (progress) {
        progress.textContent = `${chat.index} / ${chat.messages.length} messages`;
      }
    }
  };

  // ==========================================================================
  // DATA FLOW ANIMATION
  // ==========================================================================
  const FlowAnimations = {
    flows: new Map(),

    init() {
      document.querySelectorAll('.flow-animation').forEach(flowEl => {
        const flowId = flowEl.id || 'flow-' + Math.random().toString(36).slice(2);
        flowEl.id = flowId;
        const stepsData = JSON.parse(flowEl.dataset.steps || '[]');

        this.flows.set(flowId, {
          step: 0,
          steps: stepsData,
          element: flowEl
        });

        // Bind controls
        const controls = flowEl.querySelector('.flow-controls');
        if (controls) {
          controls.querySelector('.flow-next-btn')?.addEventListener('click', () => this.next(flowId));
          controls.querySelector('.flow-reset-btn')?.addEventListener('click', () => this.reset(flowId));
        }
      });
    },

    next(flowId) {
      const flow = this.flows.get(flowId);
      if (!flow || flow.step >= flow.steps.length) return;

      const step = flow.steps[flow.step];

      // Remove previous highlights
      flow.element.querySelectorAll('.flow-actor').forEach(a => a.classList.remove('active'));

      // Highlight current actor
      if (step.highlight) {
        const actor = flow.element.querySelector(`#${flowId}-${step.highlight}`);
        if (actor) actor.classList.add('active');
      }

      // Update label
      const label = flow.element.querySelector('.flow-step-label');
      if (label) label.textContent = step.label;

      flow.step++;
      this.updateProgress(flowId);
    },

    reset(flowId) {
      const flow = this.flows.get(flowId);
      if (!flow) return;
      flow.step = 0;
      flow.element.querySelectorAll('.flow-actor').forEach(a => a.classList.remove('active'));
      const label = flow.element.querySelector('.flow-step-label');
      if (label) label.textContent = 'Click "Next Step" to begin';
      this.updateProgress(flowId);
    },

    updateProgress(flowId) {
      const flow = this.flows.get(flowId);
      if (!flow) return;
      const progress = flow.element.querySelector('.flow-progress');
      if (progress) {
        progress.textContent = `Step ${flow.step} / ${flow.steps.length}`;
      }
    }
  };

  // ==========================================================================
  // ARCHITECTURE DIAGRAM
  // ==========================================================================
  const ArchDiagram = {
    init() {
      document.querySelectorAll('.arch-component').forEach(comp => {
        comp.addEventListener('click', () => {
          const diagram = comp.closest('.arch-diagram');
          diagram.querySelectorAll('.arch-component').forEach(c => c.classList.remove('active'));
          comp.classList.add('active');
          const desc = diagram.querySelector('.arch-description');
          if (desc) desc.textContent = comp.dataset.desc || 'Click any component to learn what it does';
        });
      });
    }
  };

  // ==========================================================================
  // LAYER TOGGLE
  // ==========================================================================
  const LayerToggle = {
    init() {
      document.querySelectorAll('.layer-demo').forEach(demo => {
        demo.querySelectorAll('.layer-tab').forEach(tab => {
          tab.addEventListener('click', () => {
            const layerId = tab.dataset.layer;
            // Update tabs
            demo.querySelectorAll('.layer-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            // Update layers
            demo.querySelectorAll('.layer').forEach(l => l.classList.remove('active'));
            const layer = demo.querySelector(`#${layerId}`);
            if (layer) layer.classList.add('active');
            // Update description
            const desc = demo.querySelector('.layer-description');
            if (desc && tab.dataset.desc) desc.textContent = tab.dataset.desc;
          });
        });
      });
    }
  };

  // ==========================================================================
  // SPOT THE BUG
  // ==========================================================================
  const SpotTheBug = {
    init() {
      document.querySelectorAll('.bug-line').forEach(line => {
        line.addEventListener('click', () => {
          const challenge = line.closest('.bug-challenge');
          const feedback = challenge.querySelector('.bug-feedback');
          const isBug = line.dataset.bug === 'true';

          if (isBug) {
            line.classList.add('correct');
            feedback.innerHTML = '<strong>Found it!</strong> ' + (challenge.dataset.explanation || '');
            feedback.className = 'bug-feedback show success';
            // Disable further clicks
            challenge.querySelectorAll('.bug-line').forEach(l => l.style.pointerEvents = 'none');
          } else {
            line.classList.add('incorrect');
            feedback.innerHTML = line.dataset.hint || 'Not this line — look more carefully...';
            feedback.className = 'bug-feedback show error';
            setTimeout(() => {
              line.classList.remove('incorrect');
              feedback.className = 'bug-feedback';
            }, 2000);
          }
        });
      });
    }
  };

  // ==========================================================================
  // GLOSSARY TOOLTIPS
  // ==========================================================================
  const Tooltips = {
    activeTooltip: null,

    init() {
      document.querySelectorAll('.term').forEach(term => {
        const tip = document.createElement('span');
        tip.className = 'term-tooltip';
        tip.textContent = term.dataset.definition;

        // Desktop hover
        term.addEventListener('mouseenter', () => this.show(term, tip));
        term.addEventListener('mouseleave', () => this.hide(tip));

        // Mobile tap
        term.addEventListener('click', (e) => {
          e.stopPropagation();
          if (tip.classList.contains('visible')) {
            this.hide(tip);
          } else {
            this.show(term, tip);
          }
        });
      });

      // Close on click elsewhere
      document.addEventListener('click', () => {
        if (this.activeTooltip) {
          this.hide(this.activeTooltip);
        }
      });
    },

    show(term, tip) {
      if (this.activeTooltip && this.activeTooltip !== tip) {
        this.activeTooltip.classList.remove('visible');
        this.activeTooltip.remove();
      }
      this.position(term, tip);
      requestAnimationFrame(() => tip.classList.add('visible'));
      this.activeTooltip = tip;
    },

    hide(tip) {
      tip.classList.remove('visible');
      setTimeout(() => {
        if (!tip.classList.contains('visible')) tip.remove();
      }, 150);
      if (this.activeTooltip === tip) this.activeTooltip = null;
    },

    position(term, tip) {
      const rect = term.getBoundingClientRect();
      const tipWidth = 300;
      let left = rect.left + rect.width / 2 - tipWidth / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - tipWidth - 8));

      document.body.appendChild(tip);
      const tipHeight = tip.offsetHeight;

      tip.style.left = left + 'px';
      tip.style.width = tipWidth + 'px';

      if (rect.top - tipHeight - 8 < 0) {
        // Flip below
        tip.style.top = (rect.bottom + 8) + 'px';
        tip.classList.add('flip');
      } else {
        tip.style.top = (rect.top - tipHeight - 8) + 'px';
        tip.classList.remove('flip');
      }
    }
  };

  // ==========================================================================
  // DRAG AND DROP (Quizzes)
  // ==========================================================================
  const DragAndDrop = {
    init() {
      document.querySelectorAll('.dnd-container').forEach(container => {
        const chips = container.querySelectorAll('.dnd-chip');
        const zones = container.querySelectorAll('.dnd-zone');

        // Mouse: HTML5 Drag API
        chips.forEach(chip => {
          chip.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', chip.dataset.answer);
            chip.classList.add('dragging');
          });
          chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
        });

        zones.forEach(zone => {
          const target = zone.querySelector('.dnd-zone-target');
          if (!target) return;
          target.addEventListener('dragover', (e) => { e.preventDefault(); target.classList.add('drag-over'); });
          target.addEventListener('dragleave', () => target.classList.remove('drag-over'));
          target.addEventListener('drop', (e) => {
            e.preventDefault();
            target.classList.remove('drag-over');
            const answer = e.dataTransfer.getData('text/plain');
            const chip = container.querySelector(`[data-answer="${answer}"]`);
            if (chip) {
              target.textContent = chip.textContent;
              target.dataset.placed = answer;
              chip.classList.add('placed');
            }
          });
        });

        // Touch: Custom implementation
        chips.forEach(chip => {
          chip.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const clone = chip.cloneNode(true);
            clone.classList.add('touch-ghost');
            clone.style.cssText = `position:fixed;z-index:1000;pointer-events:none;left:${touch.clientX-40}px;top:${touch.clientY-20}px;`;
            document.body.appendChild(clone);
            chip._ghost = clone;
            chip._answer = chip.dataset.answer;
          }, { passive: false });

          chip.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            if (chip._ghost) {
              chip._ghost.style.left = (touch.clientX - 40) + 'px';
              chip._ghost.style.top = (touch.clientY - 20) + 'px';
            }
            zones.forEach(z => {
              const t = z.querySelector('.dnd-zone-target');
              if (t) t.classList.remove('drag-over');
            });
            const el = document.elementFromPoint(touch.clientX, touch.clientY);
            if (el && el.closest('.dnd-zone-target')) {
              el.closest('.dnd-zone-target').classList.add('drag-over');
            }
          }, { passive: false });

          chip.addEventListener('touchend', (e) => {
            if (chip._ghost) { chip._ghost.remove(); chip._ghost = null; }
            const touch = e.changedTouches[0];
            const el = document.elementFromPoint(touch.clientX, touch.clientY);
            if (el && el.closest('.dnd-zone-target')) {
              const target = el.closest('.dnd-zone-target');
              target.textContent = chip.textContent;
              target.dataset.placed = chip._answer;
              chip.classList.add('placed');
            }
          });
        });

        // Check / Reset buttons
        container.querySelector('.dnd-check-btn')?.addEventListener('click', () => this.check(container));
        container.querySelector('.dnd-reset-btn')?.addEventListener('click', () => this.reset(container));
      });
    },

    check(container) {
      container.querySelectorAll('.dnd-zone').forEach(zone => {
        const target = zone.querySelector('.dnd-zone-target');
        if (!target || !target.dataset.placed) return;
        if (target.dataset.placed === zone.dataset.correct) {
          target.classList.add('correct');
        } else {
          target.classList.add('incorrect');
        }
      });
    },

    reset(container) {
      container.querySelectorAll('.dnd-zone-target').forEach(t => {
        t.classList.remove('correct', 'incorrect');
        t.textContent = 'Drop here';
        delete t.dataset.placed;
      });
      container.querySelectorAll('.dnd-chip').forEach(c => c.classList.remove('placed'));
    }
  };

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  function init() {
    ThemeManager.init();
    Navigation.init();
    Sidebar.init();
    ScrollAnimations.init();
    Quizzes.init();
    ChatAnimations.init();
    FlowAnimations.init();
    ArchDiagram.init();
    LayerToggle.init();
    SpotTheBug.init();
    Tooltips.init();
    DragAndDrop.init();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
