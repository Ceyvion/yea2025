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
})();
