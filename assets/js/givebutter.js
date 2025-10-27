(() => {
  const body = document.body;
  const slug = body?.dataset.givebutterSlug?.trim();
  const defaultEmbedId = body?.dataset.givebutterEmbedId?.trim();
  if (!slug) {
    return;
  }

  const popupTriggers = Array.from(document.querySelectorAll('[data-givebutter-popup]'));
  const inlineContainer = document.querySelector('[data-givebutter-embed]');
  const inlinePlaceholder = inlineContainer?.querySelector('[data-givebutter-placeholder]') || null;
  const fallbackButton = document.querySelector('[data-givebutter-fallback]');
  const widgetScriptUrl = 'https://js.givebutter.com/v2/widget.js';

  const fallbackUrl = new URL(`https://givebutter.com/${slug}`);
  const utmParams = {};
  const searchParams = new URLSearchParams(window.location.search);
  searchParams.forEach((value, key) => {
    if (key.toLowerCase().startsWith('utm_')) {
      utmParams[key] = value;
      fallbackUrl.searchParams.set(key, value);
    }
  });

  const openFallback = () => {
    window.open(fallbackUrl.toString(), '_blank', 'noopener');
  };

  if (fallbackButton) {
    fallbackButton.addEventListener('click', (event) => {
      event.preventDefault();
      openFallback();
    });
  }

  if (!inlineContainer && popupTriggers.length === 0) {
    return;
  }

  const markInlineReady = () => {
    if (!inlineContainer) {
      return;
    }
    inlineContainer.classList.remove('givebutter-inline--loading');
    inlineContainer.classList.add('givebutter-inline--ready');
  };

  if (inlineContainer) {
    inlineContainer.classList.add('givebutter-inline--loading');

    if ('MutationObserver' in window) {
      const observer = new MutationObserver((mutations) => {
        const hasElement = mutations.some((mutation) =>
          Array.from(mutation.addedNodes).some((node) => node.nodeType === Node.ELEMENT_NODE)
        );
        if (hasElement) {
          markInlineReady();
          observer.disconnect();
          inlinePlaceholder?.remove();
        }
      });
      observer.observe(inlineContainer, { childList: true });
    } else {
      inlineContainer.classList.remove('givebutter-inline--loading');
    }
  }

  const loadGivebutter = () => new Promise((resolve) => {
    if (window.Givebutter && (window.Givebutter.widgets || window.Givebutter.Widget)) {
      resolve(window.Givebutter);
      return;
    }

    const existing = document.querySelector(`script[src="${widgetScriptUrl}"]`);
    if (existing) {
      const interval = window.setInterval(() => {
        if (window.Givebutter && (window.Givebutter.widgets || window.Givebutter.Widget)) {
          window.clearInterval(interval);
          resolve(window.Givebutter);
        }
      }, 200);
      window.setTimeout(() => {
        window.clearInterval(interval);
        resolve(null);
      }, 5000);
      return;
    }

    const script = document.createElement('script');
    script.src = widgetScriptUrl;
    script.async = true;
    script.onload = () => resolve(window.Givebutter || null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  loadGivebutter().then((givebutter) => {
    if (!givebutter) {
      if (inlineContainer) {
        inlineContainer.classList.remove('givebutter-inline--loading');
      }
      return;
    }

    const widgetsApi = givebutter.widgets || givebutter.Widget || null;
    if (!widgetsApi) {
      return;
    }

    const widgetConfig = {
      slug,
      tracking: { utm: utmParams },
    };

    const initializeInline = () => {
      if (!inlineContainer) {
        return;
      }

      const embedId = inlineContainer.getAttribute('data-givebutter-embed-id')?.trim() || defaultEmbedId;
      if (!embedId) {
        inlineContainer.classList.remove('givebutter-inline--loading');
        if (inlinePlaceholder) {
          inlinePlaceholder.innerHTML = `
            <p>Our donation form is loading in a new tab.</p>
            <button type="button" class="btn btn--dark">Give online</button>
          `;
          const btn = inlinePlaceholder.querySelector('button');
          btn?.addEventListener('click', (event) => {
            event.preventDefault();
            openFallback();
          });
        }
        return;
      }

      try {
        if (widgetsApi.create) {
          widgetsApi.create('inline', {
            ...widgetConfig,
            id: embedId,
            element: inlineContainer,
            theme: inlineContainer.getAttribute('data-givebutter-theme') || 'light',
          });
        } else if (widgetsApi.mount) {
          widgetsApi.mount(inlineContainer, {
            ...widgetConfig,
            id: embedId,
            type: 'inline',
            theme: inlineContainer.getAttribute('data-givebutter-theme') || 'light',
          });
        } else if (typeof widgetsApi === 'function') {
          widgetsApi({
            ...widgetConfig,
            id: embedId,
            type: 'inline',
            container: inlineContainer,
            theme: inlineContainer.getAttribute('data-givebutter-theme') || 'light',
          });
        }
      } catch (error) {
        console.warn('Givebutter inline widget failed to initialize.', error);
      }
    };

    const initializePopup = () => {
      if (popupTriggers.length === 0) {
        return;
      }

      popupTriggers.forEach((trigger) => {
        const theme = trigger.getAttribute('data-givebutter-theme') || 'light';
        const triggerEmbedId = trigger.getAttribute('data-givebutter-popup-id')?.trim() || defaultEmbedId;
        let popupWidgetInstance = null;

        if (widgetsApi.create) {
          try {
            popupWidgetInstance = widgetsApi.create('popup', {
              ...widgetConfig,
              id: triggerEmbedId,
              trigger,
              theme,
            });
          } catch (error) {
            console.warn('Givebutter popup widget failed to mount.', error);
          }
        }

        const openViaApi = (event) => {
          event.preventDefault();
          try {
            if (popupWidgetInstance?.open) {
              popupWidgetInstance.open();
            } else if (widgetsApi.open) {
              widgetsApi.open({
                ...widgetConfig,
                id: triggerEmbedId,
                theme,
                type: 'popup',
                element: trigger,
              });
            } else if (typeof widgetsApi === 'function') {
              widgetsApi({
                ...widgetConfig,
                id: triggerEmbedId,
                type: 'popup',
                element: trigger,
                theme,
              });
            } else {
              openFallback();
            }
          } catch (error) {
            console.warn('Givebutter popup widget failed to open.', error);
            openFallback();
          }
        };

        trigger.dataset.gbWidgetReady = 'true';
        trigger.addEventListener('click', openViaApi);
      });
    };

    initializeInline();
    initializePopup();
  });
})();
