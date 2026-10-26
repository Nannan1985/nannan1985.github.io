const dialog = document.querySelector('.image-dialog');
if (dialog && typeof dialog.showModal === 'function') {
  const image = dialog.querySelector('#dialog-image');
  const caption = dialog.querySelector('#image-dialog-title');
  const close = dialog.querySelector('.dialog-close');
  const zoom = dialog.querySelector('.dialog-zoom');
  zoom?.addEventListener('click', () => {
    const full = dialog.classList.toggle('is-zoomed');
    zoom.setAttribute('aria-pressed', String(full));
    zoom.textContent = full ? zoom.dataset.fitLabel : zoom.dataset.originalLabel;
  });
  let opener;
  let scrollPosition = 0;
  for (const trigger of document.querySelectorAll('.image-trigger')) {
    trigger.addEventListener('click', () => {
      opener = trigger;
      scrollPosition = window.scrollY;
      image.src = trigger.dataset.image;
      image.alt = trigger.dataset.alt;
      image.width = Number(trigger.dataset.width || 1920);
      image.height = Number(trigger.dataset.height || 1080);
      caption.textContent = trigger.dataset.caption;
      dialog.classList.remove('is-zoomed');
      zoom?.setAttribute('aria-pressed', 'false');
      if (zoom) zoom.textContent = zoom.dataset.originalLabel;
      dialog.showModal();
      document.documentElement.classList.add('modal-open');
      close.focus({ preventScroll: true });
    });
  }
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('modal-open');
    window.scrollTo({ top: scrollPosition, behavior: 'instant' });
    opener?.focus({ preventScroll: true });
  });
} else {
  // Text and navigation work without scripts; older browsers can open the full image.
  document.querySelectorAll('.image-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => { window.location.href = trigger.dataset.image; });
  });
}

// Progressive enhancement: natural document scrolling drives data-defined captures.
// No wheel/touch interception, automatic scrolling, timers, or animation framework.
const story = document.querySelector('[data-scroll-story]');
if (story) {
  const scenes = [...story.querySelectorAll('[data-scene]')];
  const triggers = scenes.map(scene => scene.querySelector('.image-trigger'));
  const panel = story.querySelector('.story-sticky');
  const toggle = story.querySelector('[data-motion-toggle]');
  const instruction = story.querySelector('[data-story-instruction]');
  const chapters = [...story.querySelectorAll('[data-story-jump]')];
  story.querySelector('.story-chapters').hidden = false;
  story.style.setProperty('--story-height', `${100 + (scenes.length - 1) * 85}svh`);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 900px) and (min-height: 650px)');
  let staticReading = false;
  let enhanced = false;
  let scheduled = false;
  let observer;
  let imagesDecoded = false;
  const clamp = value => Math.max(0, Math.min(1, value));

  function renderScroll() {
    scheduled = false;
    if (!enhanced || dialog?.open) return;
    const range = Math.max(1, story.offsetHeight - panel.offsetHeight);
    const progress = clamp((20 - story.getBoundingClientRect().top) / range);
    const position = progress * (scenes.length - 1);
    const left = Math.min(scenes.length - 2, Math.floor(position));
    const blend = clamp((position - left - .25) / .5);
    const smooth = blend * blend * (3 - 2 * blend);
    const mix = imagesDecoded ? smooth : 0;
    story.style.setProperty('--story-progress', String(progress));
    const activeIndex = imagesDecoded ? left + (mix >= .5 ? 1 : 0) : 0;
    scenes.forEach((scene, index) => {
      const active = index === activeIndex;
      scene.style.setProperty('--scene-opacity', String(imagesDecoded ? index === left ? 1 - mix : index === left + 1 ? mix : 0 : index === 0 ? 1 : 0));
      scene.classList.toggle('is-active', active);
      if (active) chapters[index].setAttribute('aria-current', 'step');
      else chapters[index].removeAttribute('aria-current');
      // Both text descriptions stay in reading order for assistive technology.
      // Only the currently visible image button participates in keyboard navigation.
      triggers[index].tabIndex = active ? 0 : -1;
      triggers[index].setAttribute('aria-hidden', String(!active));
    });
    const focusedIndex = triggers.indexOf(document.activeElement);
    if (focusedIndex >= 0 && focusedIndex !== activeIndex) triggers[activeIndex].focus({ preventScroll: true });
  }
  function schedule() {
    if (!enhanced || scheduled) return;
    scheduled = true;
    requestAnimationFrame(renderScroll);
  }
  function configure() {
    observer?.disconnect();
    enhanced = desktop.matches && !reduced.matches && !staticReading;
    story.classList.toggle('is-enhanced', enhanced);
    story.classList.toggle('is-static', !enhanced);
    story.style.removeProperty('--story-progress');
    for (const [index, scene] of scenes.entries()) {
      scene.style.removeProperty('--scene-opacity');
      scene.style.removeProperty('--scene-scale');
      scene.classList.remove('reveal-ready', 'is-revealed', 'is-active');
      triggers[index].removeAttribute('tabindex');
      triggers[index].removeAttribute('aria-hidden');
      chapters[index].removeAttribute('aria-current');
    }
    toggle.hidden = false;
    toggle.disabled = reduced.matches;
    toggle.setAttribute('aria-pressed', String(staticReading || reduced.matches));
    toggle.textContent = reduced.matches ? story.dataset.reducedLabel : staticReading ? story.dataset.motionLabel : story.dataset.staticLabel;
    instruction.textContent = enhanced ? story.dataset.scrollInstruction : story.dataset.staticInstruction;
    if (enhanced) {
      // Preload the next scene only as the visitor approaches this introduction.
      // Its HTML remains lazy for the normal/static and mobile reading modes.
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          Promise.all(scenes.map(scene => {
            const image = scene.querySelector('img');
            image.loading = 'eager';
            return image.decode();
          })).then(() => { imagesDecoded = true; schedule(); }).catch(() => {
            staticReading = true;
            configure();
          });
          observer.disconnect();
        }
      }, { rootMargin: '400px' });
      observer.observe(story);
      renderScroll();
    } else if (!reduced.matches && !staticReading && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      }, { threshold: 0.08 });
      scenes.forEach(scene => { scene.classList.add('reveal-ready'); observer.observe(scene); });
    }
  }
  toggle.addEventListener('click', () => {
    const viewportTop = toggle.getBoundingClientRect().top;
    staticReading = !staticReading;
    configure();
    // Keep this user-activated control in view when the long pinned section collapses.
    window.scrollBy({ top: toggle.getBoundingClientRect().top - viewportTop, behavior: 'instant' });
    toggle.focus({ preventScroll: true });
  });
  chapters.forEach((chapter, index) => chapter.addEventListener('click', () => {
    if (enhanced) {
      const top = story.getBoundingClientRect().top + scrollY - 20;
      window.scrollTo({top: top + (story.offsetHeight - panel.offsetHeight) * index / (scenes.length - 1), behavior:'instant'});
      renderScroll();
    } else {
      scenes[index].scrollIntoView({behavior:'instant', block:'start'});
      triggers[index].focus({preventScroll:true});
    }
  }));
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pageshow', schedule);
  reduced.addEventListener('change', configure);
  desktop.addEventListener('change', configure);
  dialog?.addEventListener('close', schedule);
  if ('IntersectionObserver' in window) configure();
}
