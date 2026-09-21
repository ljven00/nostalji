/* ==========================================================================
   Nostalji, Yvanie — behavior
   1. Title letters animate in one by one
   2. Each verse reveals line by line when it scrolls into view
   3. The sky's color (--hue) follows whichever verse is centered
   4. Fireflies drift upward on a canvas, and scatter away from the pointer
   5. Verse dots + arrow-key navigation
   6. A burst of gold sparks when the last line reaches "Paris"
   ========================================================================== */

(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const hero = document.getElementById('hero');
  const verses = Array.from(document.querySelectorAll('.verse'));
  const finale = document.getElementById('finale');
  const stops = [hero, ...verses, finale];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

  const scrollBehavior = reduceMotion ? 'auto' : 'smooth';

  /* ---------- 1. Split title into letters ---------- */

  let charIndex = 0;
  document.querySelectorAll('[data-split]').forEach((el) => {
    const text = el.textContent;
    el.textContent = '';

    // Screen readers get the real word; the animated letters are hidden from them
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    el.appendChild(sr);

    Array.from(text).forEach((char) => {
      const span = document.createElement('span');
      span.className = 'ch';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = char;
      span.style.setProperty('--d', charIndex++ * 90);
      el.appendChild(span);
    });
  });

  /* ---------- 2. Line-by-line reveal ---------- */

  verses.forEach((verse) => {
    verse.querySelectorAll('.line').forEach((line, i) => line.style.setProperty('--i', i));
  });

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      observer.unobserve(entry.target);

      if (entry.target.id === 'v12') {
        // Wait until the last line has faded in, then celebrate
        setTimeout(celebrate, reduceMotion ? 0 : 2000);
      }
    });
  }, { threshold: 0.25 });

  verses.forEach((verse) => revealObserver.observe(verse));

  /* ---------- 3. Sky color follows the verse ---------- */

  const dotsNav = document.getElementById('dots');
  verses.forEach((verse, i) => {
    const a = document.createElement('a');
    a.href = '#' + verse.id;
    a.title = 'Vèsè ' + ROMAN[i];
    a.setAttribute('aria-label', 'Ale nan vèsè ' + (i + 1));
    dotsNav.appendChild(a);
  });
  const dotEls = Array.from(dotsNav.children);

  let targetHue = 40;

  function setActive(el) {
    const hue = parseFloat(el.dataset.hue);
    if (Number.isNaN(hue)) return;
    targetHue = hue;
    root.style.setProperty('--hue', hue);

    const index = verses.indexOf(el);
    dotEls.forEach((dot, i) => dot.classList.toggle('active', i === index));
  }

  // Fires when a section crosses the vertical middle of the screen
  const activeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setActive(entry.target);
    });
  }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });

  stops.forEach((stop) => activeObserver.observe(stop));

  /* ---------- 4. Fireflies ---------- */

  const canvas = document.getElementById('sky');
  const ctx = canvas.getContext('2d');
  const TAU = Math.PI * 2;

  let width = 0;
  let height = 0;
  let hue = 40;
  let flies = [];
  let sparks = [];
  const pointer = { x: -9999, y: -9999 };

  const rand = (min, max) => min + Math.random() * (max - min);

  function makeFly(anywhere) {
    return {
      x: rand(0, width),
      y: anywhere ? rand(0, height) : height + 12,
      r: rand(0.7, 2.4),
      vy: rand(0.08, 0.34),
      sway: rand(0.4, 1.2),
      phase: rand(0, TAU),
      twinkle: rand(0.6, 1.6),
    };
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.round(Math.min(90, (width * height) / 16000));
    if (flies.length > count) flies.length = count;
    while (flies.length < count) flies.push(makeFly(true));
  }

  function glow(x, y, radius, h, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `hsla(${h}, 90%, 78%, ${alpha})`);
    g.addColorStop(0.35, `hsla(${h}, 85%, 65%, ${alpha * 0.35})`);
    g.addColorStop(1, `hsla(${h}, 85%, 60%, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
  }

  let last = performance.now();

  function frame(now) {
    const dt = Math.min(50, now - last) / 16.67;
    last = now;

    hue += (targetHue - hue) * 0.03 * dt;

    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';

    for (const f of flies) {
      f.x += Math.sin(now * 0.0006 * f.sway + f.phase) * 0.28 * dt;
      f.y -= f.vy * dt;

      // Scatter gently away from the pointer
      const dx = f.x - pointer.x;
      const dy = f.y - pointer.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 130 && dist > 0.1) {
        const push = (1 - dist / 130) * 1.6 * dt;
        f.x += (dx / dist) * push;
        f.y += (dy / dist) * push;
      }

      if (f.y < -12) Object.assign(f, makeFly(false));

      const flicker = 0.5 + 0.5 * Math.sin(now * 0.002 * f.twinkle + f.phase);
      glow(f.x, f.y, f.r * 7, hue, 0.2 + 0.7 * flicker);
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.vx *= 0.985;
      s.vy = s.vy * 0.985 + 0.02 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      glow(s.x, s.y, s.r * 6, 42, Math.min(1, s.life / s.max) * 0.9);
    }

    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(frame);
  }

  /* ---------- 6. Paris: a burst of gold sparks ---------- */

  function celebrate() {
    if (reduceMotion) return;
    const target = document.querySelector('.paris');
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    for (let i = 0; i < 80; i++) {
      const angle = rand(0, TAU);
      const speed = rand(0.8, 5);
      const life = rand(60, 140);
      sparks.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.6,
        r: rand(0.8, 2.2),
        life,
        max: life,
      });
    }
  }

  if (!reduceMotion) {
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    }, { passive: true });
    window.addEventListener('pointerleave', () => {
      pointer.x = pointer.y = -9999;
    });
    requestAnimationFrame(frame);
  } else {
    canvas.style.display = 'none';
  }

  /* ---------- 5. Keyboard navigation + replay ---------- */

  function nearestStop() {
    const mid = window.innerHeight / 2;
    let best = 0;
    let bestDist = Infinity;
    stops.forEach((stop, i) => {
      const r = stop.getBoundingClientRect();
      const dist = Math.abs(r.top + r.height / 2 - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  }

  function go(direction) {
    const next = Math.max(0, Math.min(stops.length - 1, nearestStop() + direction));
    stops[next].scrollIntoView({ behavior: scrollBehavior, block: 'center' });
  }

  const KEYS = {
    ArrowDown: 1, ArrowRight: 1, PageDown: 1,
    ArrowUp: -1, ArrowLeft: -1, PageUp: -1,
  };

  window.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (!(e.key in KEYS)) return;
    e.preventDefault();
    go(KEYS[e.key]);
  });

  document.getElementById('again').addEventListener('click', () => {
    hero.scrollIntoView({ behavior: scrollBehavior, block: 'center' });
  });
})();
