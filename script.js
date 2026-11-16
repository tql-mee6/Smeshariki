/* «Притяжение Земли» — интерактивный фан-сайт. Без сборщика и зависимостей. */
(() => {
  'use strict';
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Мобильное меню
  const menuToggle = $('#menuToggle');
  const nav = $('#nav');
  menuToggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.firstChild.textContent = open ? '✕ ' : '☰ ';
  });
  $$('#nav a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }));

  // Плавное появление секций при прокрутке
  if ('IntersectionObserver' in window && !reducedMotion) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.11, rootMargin: '0px 0px -35px 0px' });
    $$('[data-reveal]').forEach((el, i) => {
      el.style.transitionDelay = `${Math.min((i % 4) * 85, 255)}ms`;
      revealObserver.observe(el);
    });
  } else {
    $$('[data-reveal]').forEach(el => el.classList.add('is-visible'));
  }

  // Прогресс чтения + активный пункт меню
  const progress = $('#progress');
  const sectionLinks = $$('#nav a');
  const sections = sectionLinks.map(link => $(link.getAttribute('href'))).filter(Boolean);
  let ticking = false;
  function updateScroll() {
    const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    progress.style.width = `${Math.min(100, (window.scrollY / max) * 100)}%`;
    const y = window.scrollY + window.innerHeight * 0.3;
    let activeId = '';
    sections.forEach(section => { if (section.offsetTop <= y) activeId = section.id; });
    sectionLinks.forEach(link => link.classList.toggle('active', link.hash === `#${activeId}`));
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { window.requestAnimationFrame(updateScroll); ticking = true; }
  }, { passive: true });
  updateScroll();

  // Декоративные звёзды (без внешних библиотек)
  const stars = $('#heroStars');
  if (stars && !reducedMotion) {
    for (let i = 0; i < 38; i++) {
      const star = document.createElement('i');
      const x = (i * 37.17 + 9.1) % 100;
      const y = (i * 23.73 + 17.5) % 100;
      star.style.left = `${x}%`;
      star.style.top = `${y}%`;
      star.style.animationDelay = `${(i % 9) * 0.37}s`;
      star.style.width = star.style.height = `${i % 5 === 0 ? 5 : 2}px`;
      stars.append(star);
    }
  }

  // Курсорное свечение — только на устройствах с мышью
  const glow = $('#cursorGlow');
  if (glow && matchMedia('(pointer:fine)').matches && !reducedMotion) {
    let gx = -400, gy = -400, tx = -400, ty = -400;
    window.addEventListener('pointermove', event => {
      tx = event.clientX; ty = event.clientY; glow.style.opacity = '1';
    }, { passive: true });
    const animate = () => {
      gx += (tx - gx) * 0.13; gy += (ty - gy) * 0.13;
      glow.style.left = `${gx}px`; glow.style.top = `${gy}px`;
      requestAnimationFrame(animate);
    };
    animate();
  }

  // Лёгкий параллакс главной иллюстрации
  const parallaxElement = $('[data-parallax]');
  if (parallaxElement && !reducedMotion && matchMedia('(min-width:761px)').matches) {
    window.addEventListener('scroll', () => {
      if (window.scrollY < 1100) {
        const offset = Math.min(window.scrollY * 0.13, 75);
        parallaxElement.style.translate = `0 ${offset}px`;
      }
    }, { passive: true });
  }

  // Мини-викторина
  const quizResult = $('#quizResult');
  $$('.quiz-option').forEach(button => button.addEventListener('click', () => {
    $$('.quiz-option').forEach(item => {
      item.classList.remove('selected');
      item.setAttribute('aria-pressed', 'false');
    });
    button.classList.add('selected');
    button.setAttribute('aria-pressed', 'true');
    quizResult.textContent = button.dataset.message || 'Отличный выбор!';
  }));

  // Челлендж на 20 секунд
  const timerText = $('#timer');
  const timerButton = $('#timerButton');
  const timerReset = $('#timerReset');
  let seconds = 20;
  let timerId = null;
  const format = s => `00:${String(s).padStart(2, '0')}`;
  function renderTimer() { timerText.textContent = format(seconds); }
  function stopTimer() { if (timerId !== null) { clearInterval(timerId); timerId = null; } }
  timerButton?.addEventListener('click', () => {
    if (timerId !== null) {
      stopTimer();
      timerButton.textContent = '▶ Продолжить';
      return;
    }
    timerButton.textContent = 'Ⅱ Пауза';
    timerReset.hidden = false;
    timerId = setInterval(() => {
      seconds = Math.max(0, seconds - 1);
      renderTimer();
      if (seconds === 0) {
        stopTimer();
        timerButton.textContent = '🎉 Ура, ты молодец!';
        timerButton.disabled = true;
        timerText.textContent = 'ГОТОВО!';
      }
    }, 1000);
  });
  timerReset?.addEventListener('click', () => {
    stopTimer(); seconds = 20; renderTimer();
    timerButton.disabled = false;
    timerButton.textContent = '▶ Начать челлендж';
    timerReset.hidden = true;
  });

  // Блокнот: записки появляются на сайте и сохраняются в localStorage.
  // Важно: без сервера эти записи видны только в браузере автора.
  const STORAGE_KEY = 'smeshariki-gravity-notes-v1';
  const noteForm = $('#noteForm');
  const noteName = $('#noteName');
  const noteText = $('#noteText');
  const notesList = $('#notesList');
  const noteCount = $('#noteCount');
  const counter = $('#counter');
  const defaultNotes = [
    { id: 'demo-1', name: 'Ёжик', text: 'Иногда маленький шаг важнее большого обещания. 💜', date: 'Пример', demo: true },
    { id: 'demo-2', name: 'Нюша', text: 'А я бы точно тренировалась вместе с друзьями!', date: 'Пример', demo: true },
    { id: 'demo-3', name: 'Крош', text: 'Самое главное — не забывать веселиться! ✨', date: 'Пример', demo: true }
  ];
  function loadNotes() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter(n => n && typeof n.text === 'string').slice(0, 100) : [];
    } catch { return []; }
  }
  let notes = loadNotes();
  function saveNotes() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); }
    catch { alert('Браузер не разрешил сохранить записку. Проверь свободное место и настройки приватности.'); }
  }
  function createNote(note) {
    const article = document.createElement('article');
    article.className = 'note-card';
    const heading = document.createElement('h4');
    heading.textContent = note.name || 'Анонимный Смешарик';
    const text = document.createElement('p');
    text.textContent = note.text;
    const date = document.createElement('small');
    date.textContent = note.date || '';
    article.append(heading, text, date);
    if (!note.demo) {
      const remove = document.createElement('button');
      remove.className = 'note-delete';
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Удалить записку от ${note.name || 'анонима'}`);
      remove.addEventListener('click', () => {
        if (!confirm('Удалить эту записку?')) return;
        notes = notes.filter(item => item.id !== note.id);
        saveNotes(); renderNotes();
      });
      article.append(remove);
    }
    return article;
  }
  function renderNotes() {
    if (!notesList) return;
    notesList.replaceChildren();
    const display = [...notes, ...defaultNotes];
    display.forEach(note => notesList.append(createNote(note)));
    noteCount.textContent = `${notes.length} ${plural(notes.length, ['записка', 'записки', 'записок'])} от тебя`;
  }
  function plural(n, forms) {
    const v = Math.abs(n) % 100, n1 = v % 10;
    if (v > 10 && v < 20) return forms[2];
    if (n1 > 1 && n1 < 5) return forms[1];
    return n1 === 1 ? forms[0] : forms[2];
  }
  noteText?.addEventListener('input', () => {
    counter.textContent = `${noteText.value.length} / 320`;
  });
  noteForm?.addEventListener('submit', event => {
    event.preventDefault();
    const message = noteText.value.trim();
    if (message.length < 3) {
      noteText.setCustomValidity('Напиши хотя бы три символа.');
      noteText.reportValidity();
      noteText.setCustomValidity('');
      return;
    }
    const name = noteName.value.trim().slice(0, 28) || 'Гость';
    const id = window.crypto?.randomUUID?.() || `note-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    notes.unshift({ id, name, text: message.slice(0, 320), date: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()) });
    notes = notes.slice(0, 100);
    saveNotes(); renderNotes();
    noteText.value = ''; counter.textContent = '0 / 320';
    const wall = $('.notes-wall');
    wall?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
  });
  renderNotes();
})();
