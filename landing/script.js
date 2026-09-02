// ---- Countdown to next edition ----
// Publishing schedule: every Sunday at 09:00, visitor's local clock
// (the target Hebrew-speaking audience is assumed to be on Israel time).
const ISSUE_WEEKDAY = 0; // Sunday
const ISSUE_HOUR = 9;

function getNextIssueAt() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(ISSUE_HOUR, 0, 0, 0);
  target.setDate(now.getDate() + ((7 - now.getDay() + ISSUE_WEEKDAY) % 7));
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 7);
  }
  return target.getTime();
}

const els = {
  days: document.getElementById('cd-days'),
  hours: document.getElementById('cd-hours'),
  mins: document.getElementById('cd-mins'),
  secs: document.getElementById('cd-secs'),
};

function pad(n) {
  return String(Math.max(n, 0)).padStart(2, '0');
}

function updateCountdown() {
  const totalSeconds = Math.max(Math.floor((getNextIssueAt() - Date.now()) / 1000), 0);

  els.days.textContent = pad(Math.floor(totalSeconds / 86400));
  els.hours.textContent = pad(Math.floor((totalSeconds % 86400) / 3600));
  els.mins.textContent = pad(Math.floor((totalSeconds % 3600) / 60));
  els.secs.textContent = pad(totalSeconds % 60);
}

updateCountdown();
setInterval(updateCountdown, 1000);

// ---- Signup forms (hero + closing band share the same behaviour) ----
// Posts to /api/subscribe, which relays to the Google Sheet. The page only
// claims success when the server actually confirms it — a failure has to look
// like a failure, or we are back to telling people they subscribed when they
// did not.
document.querySelectorAll('.signup').forEach((form) => {
  const status = form.parentElement.querySelector('.form-status');
  const button = form.querySelector('button');

  const fail = (message) => {
    status.textContent = message;
    status.classList.remove('is-success');
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = form.email.value.trim();
    if (!/^[^s@]+@[^s@]+.[^s@]+$/.test(email)) {
      fail('זה לא נראה כמו אימייל תקין — נסו שוב.');
      return;
    }

    button.disabled = true;
    status.classList.remove('is-success');
    status.textContent = 'רגע…';

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, company: form.company ? form.company.value : '' }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        fail('משהו השתבש בהרשמה. נסו שוב עוד רגע.');
        button.disabled = false;
        return;
      }

      form.classList.add('is-done');
      status.textContent = 'תודה! מהדורה #01 תנחת אצלך ביום ראשון.';
      status.classList.add('is-success');
    } catch {
      fail('אין חיבור לשרת. בדקו את האינטרנט ונסו שוב.');
      button.disabled = false;
    }
  });
});

// ---- Falling brand marks in the hero (decorative) ----
// Grok has no official mark in the simple-icons set, so it rides as a wordmark
// in the same treatment. Swap in a real SVG symbol here if one becomes available.
const BRANDS = [
  { type: 'icon', id: 'i-openai' },                    // ChatGPT / OpenAI — mono mark, white on dark
  { type: 'icon', id: 'i-gemini' },                    // Gemini / Google — real gradient
  { type: 'icon', id: 'i-copilot' },                   // GitHub Copilot — official hex is #000, so white
  { type: 'icon', id: 'i-metaai' },                    // Meta AI — real gradient
  { type: 'icon', id: 'i-claude' },                    // Claude / Anthropic — #D97757
  { type: 'word', text: 'Grok', color: '#FFFFFF' },    // Grok / xAI — no mark in the set
];

function buildFallingIcons() {
  const layer = document.querySelector('.fall');
  const hero = document.querySelector('.hero');
  if (!layer || !hero) return;

  // Honour the visitor's motion preference — no icons at all rather than static clutter.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // 16 marks read as airy across a desktop hero; on a phone the same number
  // lands on top of the headline, so thin them out and fade them back.
  const narrow = window.innerWidth < 640;
  const COUNT = narrow ? 7 : 16;
  layer.textContent = '';

  for (let i = 0; i < COUNT; i += 1) {
    const brand = BRANDS[i % BRANDS.length];
    const item = document.createElement('span');
    item.className = 'fall__item';

    // Spread across the width, then jitter so the grid never reads as a grid.
    const lane = (i / COUNT) * 100;
    const x = Math.min(94, Math.max(1, lane + (Math.random() * 10 - 5)));
    const size = 24 + Math.random() * 24;

    item.style.setProperty('--x', x.toFixed(2) + '%');
    item.style.setProperty('--size', size.toFixed(0) + 'px');
    item.style.setProperty('--dur', (13 + Math.random() * 12).toFixed(1) + 's');
    item.style.setProperty('--delay', (-Math.random() * 22).toFixed(1) + 's');
    item.style.setProperty('--op', ((narrow ? 0.16 : 0.38) + Math.random() * (narrow ? 0.16 : 0.30)).toFixed(2));
    item.style.setProperty('--drift', (Math.random() * 60 - 30).toFixed(0) + 'px');
    item.style.setProperty('--rot', (Math.random() * 220 - 110).toFixed(0) + 'deg');

    if (brand.color) item.style.color = brand.color;

    if (brand.type === 'icon') {
      item.innerHTML = '<svg viewBox="0 0 24 24"><use href="#' + brand.id + '"></use></svg>';
    } else {
      item.innerHTML = '<span class="fall__word">' + brand.text + '</span>';
    }

    layer.appendChild(item);
  }

  // The fall distance has to clear the hero, whose height changes with the viewport.
  const setHeight = () => {
    layer.style.setProperty('--fall-h', (hero.offsetHeight + 120) + 'px');
  };
  setHeight();
  if ('ResizeObserver' in window) new ResizeObserver(setHeight).observe(hero);
  else window.addEventListener('resize', setHeight);
}

buildFallingIcons();

// ---- Mobile navigation ----
// Below 900px the link row collapses into a panel behind the burger.
const burger = document.querySelector('.nav__burger');
const navLinks = document.getElementById('nav-links');

if (burger && navLinks) {
  const setOpen = (open) => {
    navLinks.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
  };

  burger.addEventListener('click', () => {
    setOpen(burger.getAttribute('aria-expanded') !== 'true');
  });

  // Jumping to a section should not leave the panel covering it.
  navLinks.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.nav__inner')) setOpen(false);
  });

  // Leaving mobile width with the panel open would strand the class.
  window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => {
    if (e.matches) setOpen(false);
  });
}

// ---- Keyboard access for the carousels ----
// The article row holds links, so tabbing already reaches and scrolls it. The
// reasons row is plain text, which would leave a scrollable region no keyboard
// user could move. Make it focusable, but only while it actually scrolls, so
// desktop does not gain a stray tab stop.
function syncCarouselFocus() {
  document.querySelectorAll('.values').forEach((row) => {
    const scrolls = row.scrollWidth > row.clientWidth;
    if (scrolls) {
      row.setAttribute('tabindex', '0');
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', 'למה לקרוא — גללו לצדדים');
    } else {
      row.removeAttribute('tabindex');
      row.removeAttribute('role');
      row.removeAttribute('aria-label');
    }
  });
}

syncCarouselFocus();
window.addEventListener('resize', syncCarouselFocus);
