(() => {
  const navToggle = document.querySelector('.nav-toggle');
  const primaryMenu = document.getElementById('primary-menu');
  const newsletterForm = document.querySelector('.newsletter-form');
  const currentYear = document.getElementById('current-year');

  if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
  }

  if (navToggle && primaryMenu) {
    const setExpanded = (expanded) => {
      navToggle.setAttribute('aria-expanded', String(expanded));
      primaryMenu.setAttribute('aria-hidden', String(!expanded));
    };

    const mq = window.matchMedia('(max-width: 1024px)');
    setExpanded(!mq.matches);

    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      setExpanded(!expanded);
    });

    primaryMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.matchMedia('(max-width: 1024px)').matches) {
          setExpanded(false);
        }
      });
    });

    const handleBreakpoint = (event) => {
      setExpanded(!event.matches);
    };

    mq.addEventListener('change', handleBreakpoint);

    window.addEventListener('beforeunload', () => {
      mq.removeEventListener('change', handleBreakpoint);
    });
  }

  if (newsletterForm) {
    const note = newsletterForm.querySelector('.form-note');

    newsletterForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const emailInput = newsletterForm.querySelector('input[type="email"]');
      if (!emailInput?.value) {
        emailInput?.focus();
        return;
      }
      emailInput.value = '';
      if (note) {
        note.textContent = 'Thank you! Stories from Afropop Worldwide are on the way.';
      }
    });
  }

  const joyBand = document.querySelector('[data-joy-band]');
  if (joyBand && typeof window !== 'undefined') {
    const cards = Array.from(joyBand.querySelectorAll('[data-joy-tile]'));
    const animeAvailable = typeof window.anime === 'function';
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const tabletQuery = window.matchMedia('(max-width: 1024px)');
    const mobileQuery = window.matchMedia('(max-width: 720px)');

    if (!cards.length || !animeAvailable) {
      return;
    }

    const colorPalettes = [
      ['#0E5637', '#0B7D52', '#1AAF6F', '#8DD58F'],
      ['#2E1BFF', '#4C3CFF', '#A3A5FF', '#F1F2FF'],
      ['#FF7A4A', '#FF9F5A', '#FFD49C', '#F5F7F1'],
      ['#097567', '#16A6A6', '#66D9D1', '#F2FBFB'],
    ];

    let paletteIndex = 0;
    let slots = [];
    let assignments = [];
    let cycleTimer = null;
    let resizeRaf = null;

    const withOpacity = (hex, alpha) => {
      const normalized = hex.replace('#', '');
      const value = normalized.length === 3
        ? normalized
            .split('')
            .map((char) => char + char)
            .join('')
        : normalized;
      const intValue = parseInt(value, 16);
      const r = (intValue >> 16) & 255;
      const g = (intValue >> 8) & 255;
      const b = intValue & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const stopCycle = () => {
      if (cycleTimer) {
        window.clearTimeout(cycleTimer);
        cycleTimer = null;
      }
      window.anime.remove(cards);
    };

    const disableBand = () => {
      stopCycle();
      joyBand.classList.remove('joy-band--active');
      joyBand.style.removeProperty('--joy-gap');
      joyBand.style.removeProperty('--joy-cols');
      joyBand.style.removeProperty('--joy-rows');
      joyBand.style.removeProperty('--joy-gradient-a');
      joyBand.style.removeProperty('--joy-gradient-b');
      joyBand.style.removeProperty('height');
      joyBand.style.removeProperty('padding');
      joyBand.removeAttribute('tabindex');
      cards.forEach((card) => {
        card.style.removeProperty('width');
        card.style.removeProperty('height');
        card.style.removeProperty('transform');
        card.style.removeProperty('z-index');
        card.style.removeProperty('--joy-accent');
        card.style.removeProperty('backgroundColor');
      });
      slots = [];
      assignments = [];
    };

    const computeConfig = () => {
      if (reduceMotionQuery.matches || mobileQuery.matches) {
        return null;
      }
      if (tabletQuery.matches) {
        return {
          cols: 3,
          rows: Math.max(3, Math.ceil(cards.length / 3)),
          gap: 14,
          aspect: 1.55,
        };
      }
      return {
        cols: 4,
        rows: Math.max(2, Math.ceil(cards.length / 4)),
        gap: 18,
        aspect: 1.85,
      };
    };

    const computeSlots = (config, tileWidth, tileHeight, gap) => {
      const grid = [];
      for (let row = 0; row < config.rows; row += 1) {
        for (let col = 0; col < config.cols; col += 1) {
          grid.push({
            x: col * (tileWidth + gap),
            y: row * (tileHeight + gap),
          });
        }
      }

      const snakePath = [];
      for (let row = 0; row < config.rows; row += 1) {
        if (row % 2 === 0) {
          for (let col = 0; col < config.cols; col += 1) {
            snakePath.push(row * config.cols + col);
          }
        } else {
          for (let col = config.cols - 1; col >= 0; col -= 1) {
            snakePath.push(row * config.cols + col);
          }
        }
      }

      return snakePath.slice(0, cards.length).map((index) => grid[index]);
    };

    const applyPalette = (advance = true) => {
      const palette = colorPalettes[paletteIndex];
      cards.forEach((card, idx) => {
        const accent = palette[idx % palette.length];
        card.style.setProperty('--joy-accent', accent);
        card.dataset.joyImage = card.querySelector('img') ? 'true' : 'false';
      });
      joyBand.style.setProperty('--joy-gradient-a', withOpacity(palette[0], 0.3));
      joyBand.style.setProperty('--joy-gradient-b', withOpacity(palette[1] || palette[0], 0.2));
      if (advance) {
        paletteIndex = (paletteIndex + 1) % colorPalettes.length;
      }
    };

    const applyPositions = (instant = false) => {
      cards.forEach((card, idx) => {
        const slot = slots[assignments[idx]];
        if (!slot) return;
        const transformValue = `translate3d(${slot.x}px, ${slot.y}px, 0)`;
        if (instant) {
          card.style.transform = transformValue;
        } else {
          window.anime({
            targets: card,
            translateX: slot.x,
            translateY: slot.y,
            duration: 900,
            easing: 'easeOutQuad',
          });
        }
      });
    };

    const animateCycle = () => {
      if (!slots.length) {
        return;
      }

      assignments.unshift(assignments.pop());
      applyPalette();

      window.anime({
        targets: cards,
        translateX: (_, idx) => slots[assignments[idx]]?.x ?? 0,
        translateY: (_, idx) => slots[assignments[idx]]?.y ?? 0,
        scale: (_, idx) => 0.96 + 0.05 * Math.sin((idx + paletteIndex) * 0.9),
        rotate: (_, idx) => ((assignments[idx] ?? idx) % 2 === 0 ? -1.5 : 1.5),
        easing: 'easeInOutCubic',
        duration: 2600,
        delay: (_, idx) => idx * 110,
        begin: () => {
          cards.forEach((card, idx) => {
            card.style.zIndex = String(200 + idx);
          });
        },
        complete: () => {
          cycleTimer = window.setTimeout(animateCycle, 900);
        },
      });
    };

    const layoutBand = () => {
      const config = computeConfig();
      if (!config) {
        disableBand();
        return;
      }

      if (!joyBand.hasAttribute('tabindex')) {
        joyBand.setAttribute('tabindex', '0');
      }

      joyBand.classList.add('joy-band--active');
      joyBand.style.setProperty('--joy-cols', String(config.cols));
      joyBand.style.setProperty('--joy-rows', String(config.rows));
      joyBand.style.setProperty('--joy-gap', `${config.gap}px`);

      joyBand.style.padding = `${config.gap / 2}px`;
      const bandWidth = joyBand.clientWidth - config.gap;
      const tileWidth = (bandWidth - config.gap * (config.cols - 1)) / config.cols;
      const tileHeight = tileWidth * config.aspect;
      const boardHeight = tileHeight * config.rows + config.gap * (config.rows - 1);

      joyBand.style.height = `${boardHeight}px`;

      cards.forEach((card) => {
        card.style.width = `${tileWidth}px`;
        card.style.height = `${tileHeight}px`;
      });

      slots = computeSlots(config, tileWidth, tileHeight, config.gap);
      const previousAssignments = assignments;
      assignments = slots.map((_, idx) => (previousAssignments[idx] ?? idx) % slots.length);

      applyPalette(false);
      applyPositions(true);

      stopCycle();
      cycleTimer = window.setTimeout(animateCycle, 1200);
    };

    const handleResize = () => {
      if (resizeRaf) {
        window.cancelAnimationFrame(resizeRaf);
      }
      resizeRaf = window.requestAnimationFrame(layoutBand);
    };

    tabletQuery.addEventListener('change', layoutBand);
    mobileQuery.addEventListener('change', layoutBand);
    reduceMotionQuery.addEventListener('change', layoutBand);
    window.addEventListener('resize', handleResize);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopCycle();
      } else if (!mobileQuery.matches && !reduceMotionQuery.matches) {
        stopCycle();
        cycleTimer = window.setTimeout(animateCycle, 1200);
      }
    });

    layoutBand();

    const manualCycle = () => {
      if (!slots.length) {
        return;
      }
      stopCycle();
      animateCycle();
    };

    let pointerActive = false;
    let pointerMoved = false;
    const pointerThreshold = 26;
    const pointerState = { x: 0, y: 0 };

    joyBand.addEventListener('pointerdown', (event) => {
      if (mobileQuery.matches || reduceMotionQuery.matches) return;
      pointerActive = true;
      pointerMoved = false;
      pointerState.x = event.clientX;
      pointerState.y = event.clientY;
      try {
        joyBand.setPointerCapture(event.pointerId);
      } catch (error) {}
    });

    joyBand.addEventListener('pointermove', (event) => {
      if (!pointerActive || pointerMoved) return;
      const dx = event.clientX - pointerState.x;
      const dy = event.clientY - pointerState.y;
      if (Math.hypot(dx, dy) > pointerThreshold) {
        pointerMoved = true;
        manualCycle();
      }
    });

    const endPointer = (event) => {
      if (pointerActive && !pointerMoved) {
        manualCycle();
      }
      pointerActive = false;
      pointerMoved = false;
      if (event.pointerId) {
        try {
          joyBand.releasePointerCapture(event.pointerId);
        } catch (error) {}
      }
    };

    joyBand.addEventListener('pointerup', endPointer);
    joyBand.addEventListener('pointercancel', endPointer);
    joyBand.addEventListener('pointerleave', () => {
      pointerActive = false;
      pointerMoved = false;
    });

    joyBand.addEventListener('keydown', (event) => {
      if ((event.key === 'Enter' || event.key === ' ') && !mobileQuery.matches && !reduceMotionQuery.matches) {
        event.preventDefault();
        manualCycle();
      }
    });
  }
})();
