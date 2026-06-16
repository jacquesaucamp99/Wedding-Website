(function () {
  const left = document.getElementById('leftPanel');
  const right = document.getElementById('rightScroll');
  if (!left || !right) return;

  // set default background from data attribute
  const defaultBg = left.dataset.defaultBg;
  if (defaultBg) {
    left.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.18), rgba(0,0,0,0.35)), url('${defaultBg}')`;
  }

  const leftOverlay = left.querySelector('.left-overlay');
  let io = null;

  function createObserver() {
    const sections = Array.from(right.querySelectorAll('section[data-bg]'));
    const options = { root: right, threshold: 0.55 };
    io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const bg = entry.target.dataset.bg;
          if (bg) {
            left.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.18), rgba(0,0,0,0.35)), url('${bg}')`;
          }
          if (entry.target.id === 'home') {
            leftOverlay && (leftOverlay.style.opacity = '1');
          } else {
            leftOverlay && (leftOverlay.style.opacity = '0');
          }
        }
      });
    }, options);
    sections.forEach(s => io.observe(s));
  }

  function destroyObserver() {
    if (io) {
      io.disconnect();
      io = null;
    }
  }

  // Mobile image injection
  function injectMobileImages() {
    const sections = Array.from(right.querySelectorAll('section[data-bg]'));
    sections.forEach(sec => {
      // if a mobile image is already inserted for this section, skip
      const prev = sec.previousElementSibling;
      if (prev && prev.classList && prev.classList.contains('mobile-image') && prev.dataset.for === sec.id) return;

      const bg = sec.dataset.bg;
      if (!bg) return;

      const img = document.createElement('div');
      img.className = 'mobile-image';
      const isHero = sec.id === 'home';
      if (isHero) img.classList.add('mobile-hero');
      img.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.18), rgba(0,0,0,0.12)), url('${bg}')`;
      img.dataset.injected = 'true';
      img.dataset.for = sec.id || '';

      // clone hero overlay into the mobile hero image so text is visible
      if (isHero && leftOverlay) {
        const clone = leftOverlay.cloneNode(true);
        clone.classList.add('mobile-overlay');
        // ensure clone is visible
        clone.style.opacity = '1';
        img.appendChild(clone);
      }

      // adjust sizing strategy based on natural image aspect ratio
      (function adjustByAspect(url, el, hero) {
        const probe = new Image();
        probe.src = url;
        probe.onload = function () {
          try {
            const w = probe.naturalWidth || probe.width;
            const h = probe.naturalHeight || probe.height;
            if (w && h) {
              // Use cover for all images so they fill the block width.
              el.style.backgroundSize = 'cover';
              el.style.backgroundRepeat = 'no-repeat';
              // For portrait images, shift focal point up slightly so subjects stay visible
              if (w / h < 1) {
                el.style.backgroundPosition = 'center 30%';
              } else {
                el.style.backgroundPosition = 'center center';
              }
            }
          } catch (e) {
            // fallback
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center center';
          }
        };
        // in case of cached image where onload may not fire
        probe.onerror = function () { el.style.backgroundSize = 'cover'; el.style.backgroundPosition = 'center center'; };
      })(bg, img, isHero);

      sec.parentNode.insertBefore(img, sec);
    });
  }

  function removeMobileImages() {
    const injected = Array.from(document.querySelectorAll('.mobile-image[data-injected="true"]'));
    injected.forEach(i => i.parentNode && i.parentNode.removeChild(i));
  }

  function onResizeOrLoad() {
    const mobile = window.matchMedia('(max-width: 1100px)').matches;
    if (mobile) {
      // remove desktop observer and left panel, inject stacked mobile images
      destroyObserver();
      left.style.display = 'none';
      injectMobileImages();
    } else {
      // restore desktop behaviour
      removeMobileImages();
      left.style.display = '';
      createObserver();
    }
  }

  // initial setup
  createObserver();
  onResizeOrLoad();

  // debounce resize
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResizeOrLoad, 150);
  });

  // Make hash links scroll the right panel instead of the viewport when appropriate
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      const id = href.slice(1);
      const target = document.getElementById(id);
      if (!target) return;

      const mobile = window.matchMedia('(max-width: 1100px)').matches;
      if (!mobile && right.contains(target)) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // on mobile, allow default (page) scrolling so the injected image is visible above the section
    });
  });
})();
