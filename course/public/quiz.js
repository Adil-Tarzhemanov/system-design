// Интерактивные задания внутри урока. Ноль зависимостей, ноль инлайн-скриптов в уроках.
// Разметка декларативная, вся логика здесь. Три типа:
//
//   <div class="quiz" data-quiz="choice" data-id="ключ">
//     <p class="qtext">вопрос</p>
//     <pre><code>необязательный код</code></pre>
//     <ul class="qopts">
//       <li data-ok data-why="почему верно">вариант</li>
//       <li data-why="почему нет">вариант</li>
//     </ul>
//     <div class="qafter">вывод, который видно только после ответа</div>
//   </div>
//
//   <div class="quiz" data-quiz="reveal" data-id="ключ">
//     <p class="qtext">сформулируй своими словами</p>
//     <div class="qanswer">эталон</div>
//   </div>
//
//   <div class="quiz" data-quiz="match" data-id="ключ">
//     <p class="qtext">соедини пары</p>
//     <ul class="qpairs"><li data-term="термин">определение</li>…</ul>
//   </div>
//
// Ответы держатся в localStorage, чтобы перезагрузка страницы не стирала прогресс
// чтения. Это удобство читателя, а не источник правды: оценки ставит преподаватель
// в чате, и живут они в SQLite.
(() => {
  const lesson = document.querySelector('.lesson');
  if (!lesson) return;

  const ns = `quiz:${location.pathname}:`;
  const load = (id) => { try { return localStorage.getItem(ns + id); } catch { return null; } };
  const save = (id, v) => { try { localStorage.setItem(ns + id, v); } catch { /* приватный режим */ } };
  const drop = (id) => { try { localStorage.removeItem(ns + id); } catch { /* приватный режим */ } };

  const results = new Map(); // id → true (верно с первой попытки) | false

  function refreshScore() {
    const total = lesson.querySelectorAll('.quiz[data-quiz="choice"], .quiz[data-quiz="match"]').length;
    let done = 0; let ok = 0;
    results.forEach((good) => { done += 1; if (good) ok += 1; });
    document.querySelectorAll('[data-quiz-score]').forEach((el) => {
      el.textContent = done
        ? `Пройдено ${done} из ${total} · с первой попытки верно ${ok}`
        : `Заданий в уроке: ${total}. Решай по ходу чтения — это и есть практика.`;
    });
  }

  const button = (cls, text) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = text;
    return b;
  };

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // ------------------------------------------------------------ выбор варианта

  function choice(box, id) {
    const list = box.querySelector('.qopts');
    if (!list) return;

    const opts = Array.from(list.children);
    opts.forEach((li) => { li.tabIndex = 0; li.setAttribute('role', 'button'); });

    const after = box.querySelector('.qafter');
    if (after) after.hidden = true;

    const verdict = document.createElement('div');
    verdict.className = 'qverdict';
    list.after(verdict);

    const reset = () => {
      box.classList.remove('answered');
      opts.forEach((o) => {
        o.classList.remove('ok', 'bad', 'picked');
        o.querySelectorAll('.qwhy').forEach((w) => w.remove());
      });
      verdict.className = 'qverdict';
      verdict.textContent = '';
      if (after) after.hidden = true;
      drop(id);
      results.delete(id);
      refreshScore();
    };

    const answer = (li, restored) => {
      if (box.classList.contains('answered')) return;
      box.classList.add('answered');

      const good = li.hasAttribute('data-ok');
      opts.forEach((o) => {
        if (o.hasAttribute('data-ok')) o.classList.add('ok');
        if (o === li) o.classList.add('picked', good ? 'ok' : 'bad');
        if ((o === li || o.hasAttribute('data-ok')) && o.dataset.why) {
          const why = document.createElement('div');
          why.className = 'qwhy';
          why.textContent = o.dataset.why;
          o.append(why);
        }
      });

      verdict.className = `qverdict ${good ? 'good' : 'bad'}`;
      verdict.append(good ? '✓ Верно' : '✗ Не совсем', button('qagain', 'ещё раз'));
      verdict.querySelector('.qagain').addEventListener('click', reset);
      if (after) after.hidden = false;

      if (!restored) {
        save(id, String(opts.indexOf(li)));
        results.set(id, good);
        refreshScore();
      }
    };

    opts.forEach((li) => {
      li.addEventListener('click', () => answer(li, false));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); answer(li, false); }
      });
    });

    const seen = load(id);
    if (seen !== null && opts[Number(seen)]) {
      const li = opts[Number(seen)];
      results.set(id, li.hasAttribute('data-ok'));
      answer(li, true);
    }
  }

  // ------------------------------------------------------------ вспомнить и сверить

  function reveal(box) {
    const ans = box.querySelector('.qanswer');
    if (!ans) return;
    ans.hidden = true;
    const show = button('qshow', 'Сформулировал — показать эталон');
    ans.before(show);
    show.addEventListener('click', () => { ans.hidden = false; show.remove(); });
  }

  // ------------------------------------------------------------ соединить пары

  function match(box, id) {
    const src = box.querySelector('.qpairs');
    if (!src) return;

    const pairs = Array.from(src.children).map((li) => ({ term: li.dataset.term, def: li.textContent.trim() }));
    src.remove();

    const grid = document.createElement('div');
    grid.className = 'mgrid';
    const left = document.createElement('div');
    const right = document.createElement('div');
    left.className = 'mcol';
    right.className = 'mcol';
    grid.append(left, right);

    const verdict = document.createElement('div');
    verdict.className = 'qverdict';
    box.append(grid, verdict);

    pairs.forEach((p) => {
      const b = button('mitem mterm', p.term);
      b.dataset.term = p.term;
      left.append(b);
    });
    shuffle(pairs).forEach((p) => {
      const b = button('mitem mdef', p.def);
      b.dataset.term = p.term;
      right.append(b);
    });

    let picked = null;
    let missed = false;
    let solved = 0;

    const finish = () => {
      verdict.className = `qverdict ${missed ? 'bad' : 'good'}`;
      verdict.textContent = missed
        ? '✗ Собрано, но с ошибками по дороге — пройди пары ещё раз глазами'
        : '✓ Все пары верны с первой попытки';
      save(id, missed ? 'fail' : 'ok');
      results.set(id, !missed);
      refreshScore();
    };

    const pick = (b) => {
      if (b.classList.contains('done')) return;
      if (b.classList.contains('mterm')) {
        left.querySelectorAll('.sel').forEach((x) => x.classList.remove('sel'));
        b.classList.add('sel');
        picked = b;
        return;
      }
      if (!picked) return;
      if (picked.dataset.term === b.dataset.term) {
        picked.classList.remove('sel');
        picked.classList.add('done');
        b.classList.add('done');
        picked = null;
        solved += 1;
        if (solved === pairs.length) finish();
      } else {
        missed = true;
        const wrong = [picked, b];
        wrong.forEach((x) => x.classList.add('shake'));
        setTimeout(() => wrong.forEach((x) => x.classList.remove('shake', 'sel')), 450);
        picked = null;
      }
    };

    grid.addEventListener('click', (e) => {
      const b = e.target.closest('.mitem');
      if (b) pick(b);
    });
    // Пары намеренно не восстанавливаются после перезагрузки: собрать их заново —
    // это ровно то повторение, ради которого задание и стоит в уроке.
  }

  // ------------------------------------------------------------ запуск

  lesson.querySelectorAll('.quiz').forEach((box, i) => {
    const id = box.dataset.id || `q${i}`;
    const kind = box.dataset.quiz;
    if (kind === 'choice') choice(box, id);
    else if (kind === 'reveal') reveal(box);
    else if (kind === 'match') match(box, id);
  });

  refreshScore();
})();
