(function () {
  const STORE_KEY = "results";

  function getResults() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch { return {}; }
  }
  function setResults(obj) {
    localStorage.setItem(STORE_KEY, JSON.stringify(obj));
  }

  // Подсчёт теста на страницах уроков + проверка всех ответов + подсветка + конфетти
  function checkQuizGeneric({ answers, lessonKey, passPercent }) {
    const form = document.getElementById("quizForm");
    if (!form) return;

    // требуем, чтобы были ответы на все вопросы
    if (!requireAllAnswered(form, answers)) return;

    const total = Object.keys(answers).length;
    let correct = 0;

    for (const [q, right] of Object.entries(answers)) {
      const chosen = form.querySelector(`input[name="${q}"]:checked`);
      if (chosen && chosen.value === right) correct++;
    }

    const percent = Math.round((correct / total) * 100);

    const results = getResults();
    results[lessonKey] = { correct, total, percent, ts: Date.now() };
    setResults(results);

    const resEl = document.getElementById("result");
    if (resEl) {
      resEl.textContent = `Результат: ${correct}/${total} (${percent}%). Порог: ${passPercent}%`;
      resEl.style.fontWeight = "600";
    }

    const nextBtn = document.getElementById("nextLesson");
    if (nextBtn && percent >= passPercent) {
      nextBtn.style.display = "inline-block";
    }

    // ⭐ подсветка выбранных и правильных ответов
    markFeedback(form, answers);

    // 🎉 конфетти при успешном прохождении
    if (percent >= passPercent) {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js";
      s.onload = () => window.confetti && window.confetti({
        particleCount: 140,
        spread: 70,
        origin: { y: 0.6 }
      });
      document.head.appendChild(s);
    }
  }


  // Инициализация главной страницы (приветствие + сводка прогресса)
  function renderIndex() {
    const hello = document.getElementById("studentNameHello");
    const name = localStorage.getItem("studentName") || "";
    if (hello && name) hello.textContent = `, ${name}`;

    const summary = document.getElementById("progressSummary");
    if (summary) {
      const r = getResults();
      const keys = Object.keys(r);
      const passed = keys.length;
      const avg = passed ? Math.round(keys.reduce((a, k) => a + (r[k].percent || 0), 0) / passed) : 0;
      summary.textContent = passed ? `Пройдено: ${passed}/10 • Средний результат: ${avg}%` : "Пройдено: 0/10";
    }
  }

  // Подсветка правильного/неправильного по каждому вопросу
  function markFeedback(form, answers) {
    // снимаем прошлую подсветку
    form.querySelectorAll(".q-right,.q-wrong,.right-answer").forEach(el => {
      el.classList.remove("q-right", "q-wrong", "right-answer");
    });

    Object.entries(answers).forEach(([q, right]) => {
      const chosen = form.querySelector(`input[name="${q}"]:checked`);
      const correctInput = form.querySelector(`input[name="${q}"][value="${right}"]`);

      if (chosen) {
        const chosenLabel = chosen.closest("label");
        if (chosenLabel) {
          if (chosen.value === right) {
            // ✅ выбрал верный — подсвечиваем зелёным
            chosenLabel.classList.add("q-right");

            // дополнительно можем подчеркнуть, что это правильный ответ
            if (correctInput) {
              const correctLabel = correctInput.closest("label");
              if (correctLabel) {
                correctLabel.classList.add("right-answer");
              }
            }
          } else {
            // ❌ выбрал неверный — только красный, без подсказки правильного варианта
            chosenLabel.classList.add("q-wrong");
          }
        }
      }
    });
  }

  // требуем ответов на все вопросы
  function requireAllAnswered(form, answers) {
    const required = Object.keys(answers).length;
    const answered = new Set(
      [...form.querySelectorAll('input[type="radio"]:checked')].map(i => i.name)
    ).size;
    if (answered < required) {
      alert(`Ответьте на все вопросы (${required - answered} не отмечено).`);
      return false;
    }
    return true;
  }

  // перезапуск попытки (кнопку создадим автоматически)
  window.resetQuiz = function () {
    const form = document.getElementById("quizForm");
    if (!form) return;

    form.reset();

    const resEl  = document.getElementById("result");
    if (resEl) resEl.textContent = "";

    const nextBtn = document.getElementById("nextLesson");
    if (nextBtn) nextBtn.style.display = "none";

    form.querySelectorAll(".q-right,.q-wrong,.right-answer")
        .forEach(el => el.classList.remove("q-right","q-wrong","right-answer"));
  };

  // автоматически добавим кнопку «Сбросить попытку» под результатом (если её нет)
  document.addEventListener("DOMContentLoaded", () => {
    const res = document.getElementById("result");
    const anchor = res ?? document.body;

    // Сбросить попытку
    if (!document.getElementById("resetAttempt") && typeof window.resetQuiz === "function") {
      const resetBtn = document.createElement("button");
      resetBtn.id = "resetAttempt";
      resetBtn.type = "button";
      resetBtn.className = "btn btn-outline";
      resetBtn.textContent = "Сбросить попытку";
      resetBtn.addEventListener("click", window.resetQuiz);

      anchor.insertAdjacentElement(res ? "afterend" : "beforeend", resetBtn);
    }

    // Главная страница
    if (!document.getElementById("goHomeBtn")) {
      const homeBtn = document.createElement("button");
      homeBtn.id = "goHomeBtn";
      homeBtn.type = "button";
      homeBtn.className = "btn";
      homeBtn.textContent = "Главная страница";
      homeBtn.addEventListener("click", () => window.location.assign("/site"));

      anchor.insertAdjacentElement(res ? "afterend" : "beforeend", homeBtn);
    }
  });

  // бейджи прогресса на карточках уроков
  (function addLessonBadges(){
    const r = window.getResults?.() || {};
    document.querySelectorAll(".lesson-thumb").forEach(card => {
      const btn = card.querySelector("button[onclick*='lesson']");
      const m = btn?.getAttribute("onclick")?.match(/lesson(\d+)\.html/);
      if (!m) return;
      const key = `lesson${m[1]}`;
      const need = key === "lesson10" ? 90 : 60;
      const rec = r[key];
      const badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = rec ? (rec.percent >= need ? "✓ Пройден" : `${rec.percent}%`) : "";
      card.style.position = "relative";
      badge.style.cssText = "position:absolute;top:12px;right:12px;padding:4px 8px;border-radius:999px;font-size:12px;background:#000000b3;color:#fff";
      card.appendChild(badge);
    });
  })();

  // Тёмная тема
  (function themeInit(){
    const apply = (mode) => document.documentElement.classList.toggle("dark", mode === "dark");
    apply(localStorage.getItem("theme") || "light");
    document.getElementById("themeToggle")?.addEventListener("click", () => {
      const now = document.documentElement.classList.contains("dark") ? "light" : "dark";
      localStorage.setItem("theme", now);
      apply(now);
    });
  })();

  // === Задание "Распредели пароли по полям" (Урок 1) ===

  const PW_SORT_COOKIE = "lesson1_pw_sort_state";

  const STRONG_PASSWORDS = [
    "T!m3Z83#kL",
    "R!nb0w7_Vx2",
    "Zx7!nP4rVq",
    "Luna@27Kz!",
    "S3cure!Key#"
  ];

  const WEAK_PASSWORDS = [
    "ivan2008",
    "password",
    "admin",
    "qwerty",
    "123456"
  ];

  function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = name + "=" + encodeURIComponent(value) +
      ";expires=" + d.toUTCString() + ";path=/";
  }

  function getCookie(name) {
    const parts = document.cookie.split(";");
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.startsWith(name + "=")) {
        return decodeURIComponent(trimmed.substring(name.length + 1));
      }
    }
    return null;
  }

  function deleteCookie(name) {
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
  }

  function savePwSortState() {
    const container = document.getElementById("passwordSort");
    if (!container) return;

    const state = {};
    container.querySelectorAll(".pw-item").forEach(item => {
      const pw = item.dataset.pw;
      const parentId = item.parentElement.id;
      if (parentId === "pwStrong") state[pw] = "strong";
      else if (parentId === "pwWeak") state[pw] = "weak";
      else state[pw] = "pool";
    });

    setCookie(PW_SORT_COOKIE, JSON.stringify(state), 365);
  }

  function loadPwSortState() {
    const container = document.getElementById("passwordSort");
    if (!container) return;

    const pool = document.getElementById("pwPool");
    const strong = document.getElementById("pwStrong");
    const weak = document.getElementById("pwWeak");
    if (!pool || !strong || !weak) return;

    const raw = getCookie(PW_SORT_COOKIE);
    if (!raw) return;

    let state;
    try {
      state = JSON.parse(raw);
    } catch {
      return;
    }

    Object.entries(state).forEach(([pw, place]) => {
      const item = container.querySelector(`.pw-item[data-pw="${pw}"]`);
      if (!item) return;
      if (place === "strong") strong.appendChild(item);
      else if (place === "weak") weak.appendChild(item);
      else pool.appendChild(item);
    });
  }

  function initPasswordSort() {
    const container = document.getElementById("passwordSort");
    if (!container) return; // не на этой странице

    const pool = document.getElementById("pwPool");
    const strong = document.getElementById("pwStrong");
    const weak = document.getElementById("pwWeak");
    const msg = document.getElementById("pwMessage");
    const checkBtn = document.getElementById("pwCheckBtn");
    const resetBtn = document.getElementById("pwResetBtn");

    if (!pool || !strong || !weak || !checkBtn || !resetBtn) return;

    // dragstart / dragend для элементов
    container.querySelectorAll(".pw-item").forEach(item => {
      item.addEventListener("dragstart", e => {
        e.dataTransfer.setData("text/plain", item.dataset.pw);
      });
    });

    function makeDropZone(zone) {
      zone.addEventListener("dragover", e => {
        e.preventDefault();
      });
      zone.addEventListener("drop", e => {
        e.preventDefault();
        const pw = e.dataTransfer.getData("text/plain");
        if (!pw) return;
        const item = container.querySelector(`.pw-item[data-pw="${pw}"]`);
        if (!item) return;
        zone.appendChild(item);
        savePwSortState();
      });
    }

    makeDropZone(pool);
    makeDropZone(strong);
    makeDropZone(weak);

    // восстановим состояние из куки
    loadPwSortState();

    // Проверка
    checkBtn.addEventListener("click", () => {
      const allItems = Array.from(container.querySelectorAll(".pw-item"));
      const poolItems = allItems.filter(i => i.parentElement.id === "pwPool");

      msg.classList.remove("correct", "incorrect");

      if (poolItems.length > 0) {
        msg.textContent = "Распредели все пароли по полям.";
        msg.classList.add("incorrect");
        return;
      }

      let isCorrect = true;

      allItems.forEach(item => {
        const pw = item.dataset.pw;
        const parentId = item.parentElement.id;

        if (STRONG_PASSWORDS.includes(pw) && parentId !== "pwStrong") {
          isCorrect = false;
        }
        if (WEAK_PASSWORDS.includes(pw) && parentId !== "pwWeak") {
          isCorrect = false;
        }
      });

      if (isCorrect) {
        msg.textContent = "Правильно!";
        msg.classList.add("correct");
      } else {
        msg.textContent = "Неверно.";
        msg.classList.add("incorrect");
      }

      savePwSortState();
    });

    // Сброс только этого задания
    resetBtn.addEventListener("click", () => {
      container.querySelectorAll(".pw-item").forEach(item => {
        pool.appendChild(item);
      });
      msg.textContent = "";
      msg.classList.remove("correct", "incorrect");
      deleteCookie(PW_SORT_COOKIE);
    });
  }

  // Инициализация задания при загрузке Урока 1
  document.addEventListener("DOMContentLoaded", initPasswordSort);

  // === Задание 2 "Соотнеси пары" (Урок 1) ===

  const MATCH_COOKIE = "lesson1_pw_match_state";

  // правильные соответствия: пароль -> буква описания
  const MATCH_CORRECT = {
    "123456": "A",
    "Qw!7pZr#9L": "B",
    "password": "C",
    "Luna@27Kz!": "D",
    "ivan2008": "E"
  };

  function saveMatchState() {
    const wrap = document.getElementById("matchPasswords");
    if (!wrap) return;

    const pool = document.getElementById("matchPool");
    if (!pool) return;

    const state = {};
    wrap.querySelectorAll(".match-item").forEach(item => {
      const key = item.dataset.key;
      const parent = item.parentElement;

      if (parent.id === "matchPool") {
        state[key] = "pool";
      } else if (parent.classList.contains("match-drop")) {
        state[key] = parent.dataset.target || null;
      } else {
        state[key] = "pool";
      }
    });

    setCookie(MATCH_COOKIE, JSON.stringify(state), 365);
  }

  function loadMatchState() {
    const wrap = document.getElementById("matchPasswords");
    if (!wrap) return;

    const pool = document.getElementById("matchPool");
    if (!pool) return;

    const raw = getCookie(MATCH_COOKIE);
    if (!raw) return;

    let state;
    try {
      state = JSON.parse(raw);
    } catch {
      return;
    }

    Object.entries(state).forEach(([key, place]) => {
      const item = wrap.querySelector(`.match-item[data-key="${key}"]`);
      if (!item) return;

      if (place === "pool" || !place) {
        pool.appendChild(item);
      } else {
        const drop = wrap.querySelector(`.match-drop[data-target="${place}"]`);
        if (drop) drop.appendChild(item);
        else pool.appendChild(item);
      }
    });
  }

  function initMatchTask() {
    const wrap = document.getElementById("matchPasswords");
    if (!wrap) return; // не на этой странице

    const pool = document.getElementById("matchPool");
    const drops = wrap.querySelectorAll(".match-drop");
    const checkBtn = document.getElementById("matchCheckBtn");
    const resetBtn = document.getElementById("matchResetBtn");
    const msg = document.getElementById("matchMessage");

    if (!pool || !drops.length || !checkBtn || !resetBtn || !msg) return;

    // dragstart для описаний
    wrap.querySelectorAll(".match-item").forEach(item => {
      item.addEventListener("dragstart", e => {
        e.dataTransfer.setData("text/plain", item.dataset.key);
      });
    });

    function makeDropZone(zone) {
      zone.addEventListener("dragover", e => {
        e.preventDefault();
      });
      zone.addEventListener("drop", e => {
        e.preventDefault();
        const key = e.dataTransfer.getData("text/plain");
        if (!key) return;

        const item = wrap.querySelector(`.match-item[data-key="${key}"]`);
        if (!item) return;

        // если в ячейке уже есть элемент — отправим его обратно в пул
        if (zone !== pool) {
          const existing = zone.querySelector(".match-item");
          if (existing && existing !== item) {
            pool.appendChild(existing);
          }
        }

        zone.appendChild(item);
        saveMatchState();
      });
    }

    // пул и все ячейки — зоны сброса
    makeDropZone(pool);
    drops.forEach(makeDropZone);

    // восстановим из куки
    loadMatchState();

    // Проверка
    checkBtn.addEventListener("click", () => {
      msg.classList.remove("correct", "incorrect");

      const rows = wrap.querySelectorAll(".match-row");
      let allFilled = true;

      rows.forEach(row => {
        const drop = row.querySelector(".match-drop");
        const item = drop.querySelector(".match-item");
        if (!item) allFilled = false;
      });

      if (!allFilled) {
        msg.textContent = "Заполни все пары.";
        msg.classList.add("incorrect");
        return;
      }

      let ok = true;

      rows.forEach(row => {
        const pw = row.dataset.pw;
        const drop = row.querySelector(".match-drop");
        const item = drop.querySelector(".match-item");
        const key = item?.dataset.key;

        if (MATCH_CORRECT[pw] !== key) {
          ok = false;
        }
      });

      if (ok) {
        msg.textContent = "Правильно!";
        msg.classList.add("correct");
      } else {
        msg.textContent = "Неверно.";
        msg.classList.add("incorrect");
      }

      saveMatchState();
    });

    // Сброс именно этого задания
    resetBtn.addEventListener("click", () => {
      wrap.querySelectorAll(".match-item").forEach(item => {
        pool.appendChild(item);
      });
      msg.textContent = "";
      msg.classList.remove("correct", "incorrect");
      deleteCookie(MATCH_COOKIE);
    });
  }

  // === Задание 1 Урок 2: свободный ответ (1 попытка) ===
  const FREE2FA_COOKIE = "lesson2_free_answer";

  function saveFreeAnswer(txt) {
    setCookie(FREE2FA_COOKIE, txt, 365);
  }

  function loadFreeAnswer() {
    return getCookie(FREE2FA_COOKIE);
  }

  function initFreeAnswerTask() {
    const wrap = document.getElementById("freeAnswerTask");
    if (!wrap) return;

    const input = document.getElementById("freeAnswerInput");
    const btn = document.getElementById("freeAnswerSubmitBtn");
    const msg = document.getElementById("freeAnswerMsg");

    const saved = loadFreeAnswer();
    if (saved) {
      input.disabled = true;
      btn.disabled = true;
      msg.textContent = "Ответ уже сохранён 👍";
      msg.classList.add("correct");
      return;
    }

    btn.addEventListener("click", () => {
      const val = input.value.trim();
      if (!val) {
        msg.textContent = "Введите ответ!";
        msg.classList.add("incorrect");
        return;
      }

      saveFreeAnswer(val);
      input.disabled = true;
      btn.disabled = true;
      msg.textContent = "Ответ сохранён!";
      msg.classList.remove("incorrect");
      msg.classList.add("correct");
    });
  }

  document.addEventListener("DOMContentLoaded", initFreeAnswerTask);

  // === Задание 2 Урок 2: соотнеси пары ===
  const MATCH2FA_COOKIE = "lesson2_match_state";

  const MATCH2FA_CORRECT = {
    s1: "A",
    s2: "B",
    s3: "C",
    s4: "D",
    s5: "E"
  };

  function saveMatch2FAState() {
    const wrap = document.getElementById("match2FA");
    if (!wrap) return;

    const state = {};
    wrap.querySelectorAll(".match-row").forEach(row => {
      const sit = row.dataset.sit;
      const drop = row.querySelector(".match-drop");
      const item = drop.querySelector(".match-item");
      state[sit] = item ? item.dataset.key : "pool";
    });

    setCookie(MATCH2FA_COOKIE, JSON.stringify(state), 365);
  }

  function loadMatch2FAState() {
    const wrap = document.getElementById("match2FA");
    if (!wrap) return;

    const pool = document.getElementById("match2FAPool");
    const raw = getCookie(MATCH2FA_COOKIE);
    if (!raw) return;

    let state;
    try { state = JSON.parse(raw); } catch { return; }

    Object.entries(state).forEach(([sit, key]) => {
      const item = wrap.querySelector(`.match-item[data-key="${key}"]`);
      const drop = wrap.querySelector(`.match-row[data-sit="${sit}"] .match-drop`);

      if (!item || !drop) return;
      drop.appendChild(item);
    });
  }

  function initMatch2FA() {
    const wrap = document.getElementById("match2FA");
    if (!wrap) return;

    const pool = document.getElementById("match2FAPool");
    const check = document.getElementById("match2FACheckBtn");
    const reset = document.getElementById("match2FAResetBtn");
    const msg = document.getElementById("match2FAMsg");

    wrap.querySelectorAll(".match-item").forEach(item => {
      item.addEventListener("dragstart", e => {
        e.dataTransfer.setData("text/plain", item.dataset.key);
      });
    });

    function zone(z) {
      z.addEventListener("dragover", e => e.preventDefault());
      z.addEventListener("drop", e => {
        const key = e.dataTransfer.getData("text/plain");
        const item = wrap.querySelector(`.match-item[data-key="${key}"]`);
        if (!item) return;

        const exist = z.querySelector(".match-item");
        if (exist && exist !== item) pool.appendChild(exist);

        z.appendChild(item);
        saveMatch2FAState();
      });
    }

    zone(pool);
    wrap.querySelectorAll(".match-drop").forEach(zone);

    loadMatch2FAState();

    check.addEventListener("click", () => {
      msg.classList.remove("correct", "incorrect");

      let ok = true;
      wrap.querySelectorAll(".match-row").forEach(row => {
        const sit = row.dataset.sit;
        const item = row.querySelector(".match-item");
        if (!item || MATCH2FA_CORRECT[sit] !== item.dataset.key) ok = false;
      });

      msg.textContent = ok ? "Правильно!" : "Неверно.";
      msg.classList.add(ok ? "correct" : "incorrect");

      saveMatch2FAState();
    });

    reset.addEventListener("click", () => {
      wrap.querySelectorAll(".match-item").forEach(item => pool.appendChild(item));
      msg.textContent = "";
      msg.classList.remove("correct", "incorrect");
      deleteCookie(MATCH2FA_COOKIE);
    });
  }

  document.addEventListener("DOMContentLoaded", initMatch2FA);

  // === Урок 3. Задание 1 "Выбери признаки вредоносного ПО" ===

  const MALWARE_SIGNS_COOKIE = "lesson3_malware_signs";

  const MALWARE_CORRECT_SIGNS = [
    "install_hidden",
    "asks_personal",
    "slow_errors",
    "changes_settings"
  ];

  function saveMalwareSignsState(selectedKeys) {
    setCookie(MALWARE_SIGNS_COOKIE, JSON.stringify({ selected: selectedKeys }), 365);
  }

  function loadMalwareSignsState() {
    const raw = getCookie(MALWARE_SIGNS_COOKIE);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.selected) ? parsed.selected : [];
    } catch {
      return [];
    }
  }

  function initMalwareSignsTask() {
    const wrap = document.getElementById("malwareSigns");
    if (!wrap) return; // не на этой странице

    const chips = Array.from(wrap.querySelectorAll(".sign-chip"));
    const checkBtn = document.getElementById("malwareCheckBtn");
    const resetBtn = document.getElementById("malwareResetBtn");
    const msg = document.getElementById("malwareMessage");
    if (!chips.length || !checkBtn || !resetBtn || !msg) return;

    // восстановим выбранные из cookie
    const savedSelected = new Set(loadMalwareSignsState());
    chips.forEach(chip => {
      const key = chip.dataset.key;
      if (savedSelected.has(key)) {
        chip.classList.add("selected");
      }

      chip.addEventListener("click", () => {
        chip.classList.toggle("selected");
        // при любом изменении очищаем сообщение и подсветку
        chips.forEach(c => c.classList.remove("correct", "incorrect"));
        msg.textContent = "";
        msg.classList.remove("correct", "incorrect");

        const currentSelected = chips
          .filter(c => c.classList.contains("selected"))
          .map(c => c.dataset.key);
        saveMalwareSignsState(currentSelected);
      });
    });

    checkBtn.addEventListener("click", () => {
      const selected = chips.filter(c => c.classList.contains("selected"));
      msg.classList.remove("correct", "incorrect");

      if (!selected.length) {
        msg.textContent = "Сначала выбери хотя бы один вариант.";
        msg.classList.add("incorrect");
        return;
      }

      // сброс старой подсветки
      chips.forEach(c => c.classList.remove("correct", "incorrect"));

      let allRight = true;

      selected.forEach(chip => {
        const key = chip.dataset.key;
        if (MALWARE_CORRECT_SIGNS.includes(key)) {
          chip.classList.add("correct");
        } else {
          chip.classList.add("incorrect");
          allRight = false;
        }
      });

      // проверяем, не забыли ли какие-то верные варианты
      const selectedKeys = new Set(selected.map(c => c.dataset.key));
      MALWARE_CORRECT_SIGNS.forEach(k => {
        if (!selectedKeys.has(k)) allRight = false;
      });

      if (allRight) {
        msg.textContent = "Правильно! Ты выбрал(а) все верные признаки.";
        msg.classList.add("correct");
      } else {
        msg.textContent = "Есть ошибки: проверь ещё раз выделенные варианты.";
        msg.classList.add("incorrect");
      }

      const currentSelected = chips
        .filter(c => c.classList.contains("selected"))
        .map(c => c.dataset.key);
      saveMalwareSignsState(currentSelected);
    });

    resetBtn.addEventListener("click", () => {
      chips.forEach(chip => {
        chip.classList.remove("selected", "correct", "incorrect");
      });
      msg.textContent = "";
      msg.classList.remove("correct", "incorrect");
      deleteCookie(MALWARE_SIGNS_COOKIE);
    });
  }

  // === Урок 3. Задание 2 "Напиши определения" ===

  const MALWARE_DEFS_COOKIE = "lesson3_malware_defs";

  function initMalwareDefsTask() {
    const block = document.getElementById("malwareDefinitions");
    if (!block) return; // не на этой странице

    let stored = {};
    const raw = getCookie(MALWARE_DEFS_COOKIE);
    if (raw) {
      try { stored = JSON.parse(raw) || {}; } catch { stored = {}; }
    }

    function saveDefs() {
      setCookie(MALWARE_DEFS_COOKIE, JSON.stringify(stored), 365);
    }

    const keys = ["virus", "worm", "trojan"];

    keys.forEach(key => {
      const input = block.querySelector(`input[data-def="${key}"]`);
      const btn = block.querySelector(`button[data-def-submit="${key}"]`);
      const status = block.querySelector(`.malware-def-status[data-def-status="${key}"]`);
      if (!input || !btn || !status) return;

      function lock(value) {
        input.value = value;
        input.disabled = true;
        btn.disabled = true;
        status.textContent = "Ответ сохранён";
        status.classList.add("saved");
      }

      // если уже есть сохранённый ответ — сразу блокируем поле
      if (stored[key]) {
        lock(stored[key]);
      }

      btn.addEventListener("click", () => {
        if (input.disabled) return; // уже отправлено

        const value = input.value.trim();
        if (!value) {
          alert("Сначала введи определение.");
          return;
        }

        stored[key] = value;
        saveDefs();
        lock(value);
      });
    });
  }

  // инициализация заданий урока 3
  document.addEventListener("DOMContentLoaded", () => {
    initMalwareSignsTask();
    initMalwareDefsTask();
  });

  // === Урок 4. Задание 1 — Найди фишинговое письмо ===

  const PHISH_EMAIL_COOKIE = "lesson4_email_state";
  const PHISH_REPORT_COOKIE = "lesson4_report_state";

  function loadPhishEmailState() {
    const raw = getCookie(PHISH_EMAIL_COOKIE);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  function savePhishEmailState(state) {
    setCookie(PHISH_EMAIL_COOKIE, JSON.stringify(state), 365);
  }

  function applyPhishEmailUI(state, root, msgEl) {
    if (!root) return;
    const blocks = root.querySelectorAll(".phish-email");

    blocks.forEach(b => {
      b.classList.remove("selected", "correct", "incorrect");
      if (state?.selected === b.dataset.id) {
        b.classList.add("selected");
      }
    });

    if (!msgEl) return;

    msgEl.textContent = "";
    msgEl.classList.remove("correct", "incorrect");

    if (!state || !state.checked) return;

    const isCorrect = state.correct;
    const selectedBlock = state.selected
      ? root.querySelector(`.phish-email[data-id="${state.selected}"]`)
      : null;

    if (selectedBlock) {
      selectedBlock.classList.add(isCorrect ? "correct" : "incorrect");
    }

    if (isCorrect) {
      msgEl.textContent = "Верно: это фишинговое письмо.";
      msgEl.classList.add("correct");
    } else {
      msgEl.textContent = "Неверно. Попробуй ещё раз внимательно прочитать письма.";
      msgEl.classList.add("incorrect");
    }
  }

  function initPhishEmailTask() {
    const root = document.getElementById("phishEmails");
    if (!root) return;

    const msgEl = document.getElementById("phishEmailMessage");
    const checkBtn = document.getElementById("phishEmailCheckBtn");
    const resetBtn = document.getElementById("phishEmailResetBtn");
    const blocks = root.querySelectorAll(".phish-email");

    if (!blocks.length || !checkBtn || !resetBtn || !msgEl) return;

    // восстановление из куки
    let state = loadPhishEmailState() || { selected: null, checked: false, correct: false };
    applyPhishEmailUI(state, root, msgEl);

    // выбор письма
    blocks.forEach(block => {
      block.addEventListener("click", () => {
        state.selected = block.dataset.id;
        state.checked = false;
        applyPhishEmailUI(state, root, msgEl);
        savePhishEmailState(state);
      });
    });

    // проверка
    checkBtn.addEventListener("click", () => {
      msgEl.classList.remove("correct", "incorrect");

      if (!state.selected) {
        msgEl.textContent = "Сначала выбери письмо.";
        msgEl.classList.add("incorrect");
        return;
      }

      // правильное — первое письмо (id="1")
      const isCorrect = state.selected === "1";

      state.checked = true;
      state.correct = isCorrect;

      applyPhishEmailUI(state, root, msgEl);
      savePhishEmailState(state);
    });

    // сброс
    resetBtn.addEventListener("click", () => {
      state = { selected: null, checked: false, correct: false };
      deleteCookie(PHISH_EMAIL_COOKIE);
      applyPhishEmailUI(state, root, msgEl);
    });
  }

  // === Урок 4. Задание 2 — Куда сообщить о фишинге ===

  const PHISH_REPORT_CORRECT = ["police", "bank"]; // правильные варианты

  function loadPhishReportState() {
    const raw = getCookie(PHISH_REPORT_COOKIE);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  function savePhishReportState(state) {
    setCookie(PHISH_REPORT_COOKIE, JSON.stringify(state), 365);
  }

  function applyPhishReportUI(state, root, msgEl) {
    if (!root) return;
    const opts = root.querySelectorAll(".phish-choice__option");

    opts.forEach(btn => {
      const id = btn.dataset.id;
      btn.classList.remove("active", "correct", "incorrect");
      if (state?.selected?.includes(id)) {
        btn.classList.add("active");
      }
    });

    if (!msgEl) return;

    msgEl.textContent = "";
    msgEl.classList.remove("correct", "incorrect");

    if (!state || !state.checked) return;

    const selected = new Set(state.selected || []);

    opts.forEach(btn => {
      const id = btn.dataset.id;
      if (!selected.has(id)) return;
      if (PHISH_REPORT_CORRECT.includes(id)) {
        btn.classList.add("correct");
      } else {
        btn.classList.add("incorrect");
      }
    });

    if (state.correct) {
      msgEl.textContent = "Верно! Сообщать можно, например, в банк и/или в полицию.";
      msgEl.classList.add("correct");
    } else {
      msgEl.textContent = "Не совсем так. Подумай, кто реально может помочь в ситуации с фишингом.";
      msgEl.classList.add("incorrect");
    }
  }

  function initPhishReportTask() {
    const root = document.getElementById("phishReport");
    if (!root) return;

    const msgEl = document.getElementById("phishReportMessage");
    const checkBtn = document.getElementById("phishReportCheckBtn");
    const resetBtn = document.getElementById("phishReportResetBtn");
    const opts = root.querySelectorAll(".phish-choice__option");

    if (!opts.length || !checkBtn || !resetBtn || !msgEl) return;

    let state = loadPhishReportState() || { selected: [], checked: false, correct: false };
    applyPhishReportUI(state, root, msgEl);

    // выбор нескольких вариантов
    opts.forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const set = new Set(state.selected || []);
        if (set.has(id)) set.delete(id); else set.add(id);
        state.selected = Array.from(set);
        state.checked = false;
        applyPhishReportUI(state, root, msgEl);
        savePhishReportState(state);
      });
    });

    // проверка
    checkBtn.addEventListener("click", () => {
      msgEl.classList.remove("correct", "incorrect");

      if (!state.selected || !state.selected.length) {
        msgEl.textContent = "Выбери хотя бы один вариант.";
        msgEl.classList.add("incorrect");
        return;
      }

      const selectedSet = new Set(state.selected);
      let allGood = true;

      // все правильные должны быть выбраны
      PHISH_REPORT_CORRECT.forEach(id => {
        if (!selectedSet.has(id)) allGood = false;
      });

      // и не должно быть лишних
      state.selected.forEach(id => {
        if (!PHISH_REPORT_CORRECT.includes(id)) allGood = false;
      });

      state.checked = true;
      state.correct = allGood;

      applyPhishReportUI(state, root, msgEl);
      savePhishReportState(state);
    });

    // сброс
    resetBtn.addEventListener("click", () => {
      state = { selected: [], checked: false, correct: false };
      deleteCookie(PHISH_REPORT_COOKIE);
      applyPhishReportUI(state, root, msgEl);
    });
  }

  // инициализация заданий урока 4
  document.addEventListener("DOMContentLoaded", () => {
    initPhishEmailTask();
    initPhishReportTask();
  });

  // === Урок 5: свободный ответ про социальную инженерию ===

  const L5_SOCENG_COOKIE = "lesson5_soceng_answer";

  function initLesson5FreeAnswer() {
    const wrap    = document.getElementById("lesson5Task");
    if (!wrap) return; // не на этой странице

    const textarea = document.getElementById("lesson5Answer");
    const btn      = document.getElementById("lesson5SubmitBtn");
    const status   = document.getElementById("lesson5Status");

    if (!textarea || !btn || !status) return;

    // если уже есть сохранённый ответ — показываем и блокируем повторный ввод
    const saved = getCookie(L5_SOCENG_COOKIE);
    if (saved) {
      textarea.value = saved;
      textarea.disabled = true;
      btn.disabled = true;
      status.textContent = "Ответ сохранён.";
      status.classList.add("correct");
    }

    btn.addEventListener("click", () => {
      const value = textarea.value.trim();

      if (!value) {
        status.textContent = "Напиши хотя бы одно предложение.";
        status.classList.remove("correct");
        status.classList.add("incorrect");
        return;
      }

      setCookie(L5_SOCENG_COOKIE, value, 365);

      textarea.disabled = true;
      btn.disabled = true;
      status.textContent = "Ответ сохранён.";
      status.classList.remove("incorrect");
      status.classList.add("correct");
    });
  }

  document.addEventListener("DOMContentLoaded", initLesson5FreeAnswer);

  // === Урок 6: "Какие истории лишние (опасные)?" ===

const L6_STORIES_COOKIE = "lesson6_stories_state";
const L6_DANGER_ID = "2"; // опасная история: 2.png

function loadLesson6State() {
  const raw = getCookie(L6_STORIES_COOKIE);
  if (!raw) return { selected: null, checked: false, correct: false };
  try {
    const s = JSON.parse(raw);
    return {
      selected: s?.selected ?? null,
      checked: !!s?.checked,
      correct: !!s?.correct
    };
  } catch {
    return { selected: null, checked: false, correct: false };
  }
}

function saveLesson6State(state) {
  setCookie(L6_STORIES_COOKIE, JSON.stringify(state), 365);
}

function applyLesson6UI(state, root, msgEl) {
  if (!root) return;
  const cards = root.querySelectorAll(".story-card");

  cards.forEach(c => {
    c.classList.remove("active", "correct", "incorrect");
    if (state.selected && c.dataset.id === state.selected) {
      c.classList.add("active");
    }
  });

  if (!msgEl) return;
  msgEl.textContent = "";
  msgEl.classList.remove("correct", "incorrect");

  if (!state.checked || !state.selected) return;

  const selectedEl = root.querySelector(`.story-card[data-id="${state.selected}"]`);
  if (selectedEl) selectedEl.classList.add(state.correct ? "correct" : "incorrect");

  if (state.correct) {
    msgEl.textContent = "Да, верно: потому что указаны данные о местоположении и точном времени.";
    msgEl.classList.add("correct");
  } else {
    msgEl.textContent = "Нет, неверно. Подумай ещё: какая история выдаёт лишние данные?";
    msgEl.classList.add("incorrect");
  }
}

function initLesson6StoriesTask() {
  const root = document.getElementById("lesson6Stories");
  if (!root) return;

  const msgEl = document.getElementById("lesson6Msg");
  const resetBtn = document.getElementById("lesson6ResetBtn");
  const cards = root.querySelectorAll(".story-card");
  if (!cards.length || !msgEl || !resetBtn) return;

  let state = loadLesson6State();
  applyLesson6UI(state, root, msgEl);

  cards.forEach(card => {
    card.addEventListener("click", () => {
      state.selected = card.dataset.id;

      // сохраняем выбор даже если ещё не "проверено"
      state.checked = true;
      state.correct = (state.selected === L6_DANGER_ID);

      saveLesson6State(state);
      applyLesson6UI(state, root, msgEl);
    });
  });

  resetBtn.addEventListener("click", () => {
    state = { selected: null, checked: false, correct: false };
    deleteCookie(L6_STORIES_COOKIE);
    applyLesson6UI(state, root, msgEl);
  });
}

document.addEventListener("DOMContentLoaded", initLesson6StoriesTask);


// === Урок 7: свободный ответ про опасности бесплатного Wi-Fi ===

const L7_WIFI_COOKIE = "lesson7_wifi_answer";

function initLesson7FreeAnswer() {
  const wrap = document.getElementById("lesson7Task");
  if (!wrap) return; // не эта страница

  const textarea = document.getElementById("lesson7Answer");
  const btn = document.getElementById("lesson7SubmitBtn");
  const status = document.getElementById("lesson7Status");

  if (!textarea || !btn || !status) return;

  const saved = getCookie(L7_WIFI_COOKIE);

  // если ответ уже был — блокируем повторный ввод
  if (saved) {
    textarea.value = saved;
    textarea.disabled = true;
    btn.disabled = true;
    status.textContent = "Ответ сохранён.";
    status.classList.add("correct");
    return;
  }

  btn.addEventListener("click", () => {
    const value = textarea.value.trim();

    if (!value) {
      status.textContent = "Напиши хотя бы одно предложение.";
      status.classList.remove("correct");
      status.classList.add("incorrect");
      return;
    }

    setCookie(L7_WIFI_COOKIE, value, 365);

    textarea.disabled = true;
    btn.disabled = true;
    status.textContent = "Ответ сохранён.";
    status.classList.remove("incorrect");
    status.classList.add("correct");
  });
}

document.addEventListener("DOMContentLoaded", initLesson7FreeAnswer);

// === Урок 7. Задание 2: соотнеси пары (интернет ↔ описание) ===

const MATCH7_WIFI_COOKIE = "lesson7_match_wifi_state";

// правильные соответствия: строка (s1..s5) -> буква (A..E)
const MATCH7_WIFI_CORRECT = {
  s1: "A", // Оптоволокно -> высокая скорость, но не везде
  s2: "B", // Спутник -> работает даже в горах/степи
  s3: "C", // Wi-Fi -> удобно, но может быть небезопасно
  s4: "D", // Проводное -> стабильное, но ограничено кабелем
  s5: "E"  // Мобильный -> сотовая связь, удобно для телефона
};

function saveMatch7WifiState() {
  const wrap = document.getElementById("matchWifi7");
  if (!wrap) return;

  const state = {};
  wrap.querySelectorAll(".match-row").forEach(row => {
    const sit = row.dataset.sit;
    const drop = row.querySelector(".match-drop");
    const item = drop.querySelector(".match-item");
    state[sit] = item ? item.dataset.key : "pool";
  });

  setCookie(MATCH7_WIFI_COOKIE, JSON.stringify(state), 365);
}

function loadMatch7WifiState() {
  const wrap = document.getElementById("matchWifi7");
  if (!wrap) return;

  const pool = document.getElementById("matchWifi7Pool");
  const raw = getCookie(MATCH7_WIFI_COOKIE);
  if (!raw || !pool) return;

  let state;
  try { state = JSON.parse(raw); } catch { return; }

  // сначала всё в пул (на случай неполного состояния)
  wrap.querySelectorAll(".match-item").forEach(item => pool.appendChild(item));

  Object.entries(state).forEach(([sit, key]) => {
    const item = wrap.querySelector(`.match-item[data-key="${key}"]`);
    const drop = wrap.querySelector(`.match-row[data-sit="${sit}"] .match-drop`);
    if (!item || !drop || key === "pool") return;
    drop.appendChild(item);
  });
}

function initMatch7Wifi() {
  const wrap = document.getElementById("matchWifi7");
  if (!wrap) return;

  const pool = document.getElementById("matchWifi7Pool");
  const check = document.getElementById("matchWifi7CheckBtn");
  const reset = document.getElementById("matchWifi7ResetBtn");
  const msg = document.getElementById("matchWifi7Msg");

  if (!pool || !check || !reset || !msg) return;

  // dragstart
  wrap.querySelectorAll(".match-item").forEach(item => {
    item.addEventListener("dragstart", e => {
      e.dataTransfer.setData("text/plain", item.dataset.key);
    });
  });

  function zone(z) {
    z.addEventListener("dragover", e => e.preventDefault());
    z.addEventListener("drop", e => {
      e.preventDefault();

      const key = e.dataTransfer.getData("text/plain");
      const item = wrap.querySelector(`.match-item[data-key="${key}"]`);
      if (!item) return;

      // если это ячейка (не пул) и в ней уже есть элемент — возвращаем его в пул
      if (z !== pool) {
        const exist = z.querySelector(".match-item");
        if (exist && exist !== item) pool.appendChild(exist);
      }

      z.appendChild(item);

      // при любом действии — убрать сообщение
      msg.textContent = "";
      msg.classList.remove("correct", "incorrect");

      saveMatch7WifiState();
    });
  }

  zone(pool);
  wrap.querySelectorAll(".match-drop").forEach(zone);

  // восстановим состояние из cookie
  loadMatch7WifiState();

  check.addEventListener("click", () => {
    msg.classList.remove("correct", "incorrect");

    // проверим, что все заполнены
    let allFilled = true;
    wrap.querySelectorAll(".match-row").forEach(row => {
      const item = row.querySelector(".match-drop .match-item");
      if (!item) allFilled = false;
    });

    if (!allFilled) {
      msg.textContent = "Заполни все пары.";
      msg.classList.add("incorrect");
      return;
    }

    let ok = true;
    wrap.querySelectorAll(".match-row").forEach(row => {
      const sit = row.dataset.sit;
      const item = row.querySelector(".match-drop .match-item");
      if (!item || MATCH7_WIFI_CORRECT[sit] !== item.dataset.key) ok = false;
    });

    msg.textContent = ok ? "Правильно!" : "Неверно. Попробуй ещё раз.";
    msg.classList.add(ok ? "correct" : "incorrect");

    saveMatch7WifiState();
  });

  reset.addEventListener("click", () => {
    wrap.querySelectorAll(".match-item").forEach(item => pool.appendChild(item));
    msg.textContent = "";
    msg.classList.remove("correct", "incorrect");
    deleteCookie(MATCH7_WIFI_COOKIE);
  });
}

document.addEventListener("DOMContentLoaded", initMatch7Wifi);

// === Урок 8: распределение по столбикам (+ / -) ===
const L8_COL_COOKIE = "lesson8_columns_state";

const L8_PLUS_KEYS = ["plus_access","plus_team","plus_backup","plus_autosave","plus_memory"];
const L8_MINUS_KEYS = ["minus_hack","minus_leak","minus_inet"];

function saveL8ColumnsState(){
  const wrap = document.getElementById("lesson8Columns");
  if (!wrap) return;

  const state = {};
  wrap.querySelectorAll(".pw-item").forEach(item => {
    const key = item.dataset.key;
    const pid = item.parentElement.id;
    if (pid === "l8Plus") state[key] = "plus";
    else if (pid === "l8Minus") state[key] = "minus";
    else state[key] = "pool";
  });

  setCookie(L8_COL_COOKIE, JSON.stringify(state), 365);
}

function loadL8ColumnsState(){
  const wrap = document.getElementById("lesson8Columns");
  if (!wrap) return;

  const pool = document.getElementById("l8Pool");
  const plus = document.getElementById("l8Plus");
  const minus = document.getElementById("l8Minus");
  if (!pool || !plus || !minus) return;

  const raw = getCookie(L8_COL_COOKIE);
  if (!raw) return;

  let state;
  try { state = JSON.parse(raw); } catch { return; }

  Object.entries(state).forEach(([key, place]) => {
    const item = wrap.querySelector(`.pw-item[data-key="${key}"]`);
    if (!item) return;
    if (place === "plus") plus.appendChild(item);
    else if (place === "minus") minus.appendChild(item);
    else pool.appendChild(item);
  });
}

function initLesson8Columns(){
  const wrap = document.getElementById("lesson8Columns");
  if (!wrap) return;

  const pool = document.getElementById("l8Pool");
  const plus = document.getElementById("l8Plus");
  const minus = document.getElementById("l8Minus");
  const checkBtn = document.getElementById("l8CheckBtn");
  const resetBtn = document.getElementById("l8ResetBtn");
  const msg = document.getElementById("l8Msg");
  if (!pool || !plus || !minus || !checkBtn || !resetBtn || !msg) return;

  wrap.querySelectorAll(".pw-item").forEach(item => {
    item.addEventListener("dragstart", e => {
      e.dataTransfer.setData("text/plain", item.dataset.key);
    });
  });

  function makeZone(zone){
    zone.addEventListener("dragover", e => e.preventDefault());
    zone.addEventListener("drop", e => {
      e.preventDefault();
      const key = e.dataTransfer.getData("text/plain");
      const item = wrap.querySelector(`.pw-item[data-key="${key}"]`);
      if (!item) return;
      zone.appendChild(item);
      msg.textContent = "";
      msg.classList.remove("correct","incorrect");
      saveL8ColumnsState();
    });
  }

  makeZone(pool);
  makeZone(plus);
  makeZone(minus);

  loadL8ColumnsState();

  checkBtn.addEventListener("click", () => {
    msg.classList.remove("correct","incorrect");

    // требуем, чтобы пул был пустым
    const poolItems = pool.querySelectorAll(".pw-item").length;
    if (poolItems > 0){
      msg.textContent = "Распредели все карточки по столбикам.";
      msg.classList.add("incorrect");
      return;
    }

    let ok = true;

    plus.querySelectorAll(".pw-item").forEach(i => {
      if (!L8_PLUS_KEYS.includes(i.dataset.key)) ok = false;
    });
    minus.querySelectorAll(".pw-item").forEach(i => {
      if (!L8_MINUS_KEYS.includes(i.dataset.key)) ok = false;
    });

    msg.textContent = ok ? "Правильно!" : "Неверно.";
    msg.classList.add(ok ? "correct" : "incorrect");
    saveL8ColumnsState();
  });

  resetBtn.addEventListener("click", () => {
    wrap.querySelectorAll(".pw-item").forEach(i => pool.appendChild(i));
    msg.textContent = "";
    msg.classList.remove("correct","incorrect");
    deleteCookie(L8_COL_COOKIE);
  });
}
document.addEventListener("DOMContentLoaded", initLesson8Columns);


// === Урок 8: соотнеси пары (облако) ===
const L8_MATCH_COOKIE = "lesson8_match_state";
const L8_MATCH_CORRECT = { t1:"A", t2:"B", t3:"C", t4:"D", t5:"E" };

function saveL8MatchState(){
  const wrap = document.getElementById("lesson8Match");
  if (!wrap) return;

  const state = {};
  wrap.querySelectorAll(".match-row").forEach(row => {
    const sit = row.dataset.sit;
    const item = row.querySelector(".match-drop .match-item");
    state[sit] = item ? item.dataset.key : "pool";
  });
  setCookie(L8_MATCH_COOKIE, JSON.stringify(state), 365);
}

function loadL8MatchState(){
  const wrap = document.getElementById("lesson8Match");
  if (!wrap) return;

  const pool = document.getElementById("lesson8MatchPool");
  const raw = getCookie(L8_MATCH_COOKIE);
  if (!raw || !pool) return;

  let state;
  try { state = JSON.parse(raw); } catch { return; }

  // вернуть всё в пул
  wrap.querySelectorAll(".match-item").forEach(i => pool.appendChild(i));

  Object.entries(state).forEach(([sit, key]) => {
    const item = wrap.querySelector(`.match-item[data-key="${key}"]`);
    const drop = wrap.querySelector(`.match-row[data-sit="${sit}"] .match-drop`);
    if (!item || !drop) return;
    drop.appendChild(item);
  });
}

function initLesson8Match(){
  const wrap = document.getElementById("lesson8Match");
  if (!wrap) return;

  const pool  = document.getElementById("lesson8MatchPool");
  const check = document.getElementById("lesson8MatchCheckBtn");
  const reset = document.getElementById("lesson8MatchResetBtn");
  const msg   = document.getElementById("lesson8MatchMsg");
  if (!pool || !check || !reset || !msg) return;

  wrap.querySelectorAll(".match-item").forEach(item => {
    item.addEventListener("dragstart", e => {
      e.dataTransfer.setData("text/plain", item.dataset.key);
    });
  });

  function makeZone(z){
    z.addEventListener("dragover", e => e.preventDefault());
    z.addEventListener("drop", e => {
      e.preventDefault();
      const key = e.dataTransfer.getData("text/plain");
      const item = wrap.querySelector(`.match-item[data-key="${key}"]`);
      if (!item) return;

      const existing = z.querySelector(".match-item");
      if (existing && existing !== item) pool.appendChild(existing);

      z.appendChild(item);
      msg.textContent = "";
      msg.classList.remove("correct","incorrect");
      saveL8MatchState();
    });
  }

  makeZone(pool);
  wrap.querySelectorAll(".match-drop").forEach(makeZone);

  loadL8MatchState();

  check.addEventListener("click", () => {
    msg.classList.remove("correct","incorrect");

    let ok = true;
    wrap.querySelectorAll(".match-row").forEach(row => {
      const sit = row.dataset.sit;
      const item = row.querySelector(".match-drop .match-item");
      if (!item || item.dataset.key !== L8_MATCH_CORRECT[sit]) ok = false;
    });

    msg.textContent = ok ? "Правильно!" : "Неверно.";
    msg.classList.add(ok ? "correct" : "incorrect");
    saveL8MatchState();
  });

  reset.addEventListener("click", () => {
    wrap.querySelectorAll(".match-item").forEach(i => pool.appendChild(i));
    msg.textContent = "";
    msg.classList.remove("correct","incorrect");
    deleteCookie(L8_MATCH_COOKIE);
  });
}
document.addEventListener("DOMContentLoaded", initLesson8Match);

// === Урок 9: Задание 1 — несколько ответов (каждый 1 попытка) ===
const L9_ETHICS_COOKIE = "lesson9_ethics_answers";

function loadL9Ethics() {
  const raw = getCookie(L9_ETHICS_COOKIE);
  if (!raw) return {};
  try { return JSON.parse(raw) || {}; } catch { return {}; }
}

function saveL9Ethics(obj) {
  setCookie(L9_ETHICS_COOKIE, JSON.stringify(obj), 365);
}

function initLesson9EthicsTask() {
  const wrap = document.getElementById("lesson9Ethics");
  if (!wrap) return;

  const status = document.getElementById("l9EthicsStatus");
  const saved = loadL9Ethics();

  wrap.querySelectorAll("[data-q]").forEach(row => {
    const q = row.dataset.q;
    const input = row.querySelector("input");
    const btn = row.querySelector(`button[data-submit="${q}"]`);
    if (!input || !btn) return;

    // восстановление
    if (saved[q]) {
      input.value = saved[q];
      input.disabled = true;
      btn.disabled = true;
    }

    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      const val = input.value.trim();
      if (!val) {
        if (status) {
          status.textContent = "Заполни поле перед отправкой.";
          status.classList.remove("correct");
          status.classList.add("incorrect");
        }
        return;
      }

      saved[q] = val;
      saveL9Ethics(saved);

      input.disabled = true;
      btn.disabled = true;

      if (status) {
        status.textContent = "Ответ сохранён. Изменить нельзя.";
        status.classList.remove("incorrect");
        status.classList.add("correct");
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", initLesson9EthicsTask);


// === Урок 9: Задание 2 — соотнеси пары ===
const L9_MATCH_COOKIE = "lesson9_match_state";

// правильные соответствия: вариант (A..E) -> цель (1..5)
const L9_MATCH_CORRECT = {
  "A": "1",
  "B": "2",
  "C": "3",
  "D": "4",
  "E": "5"
};

function saveL9MatchState() {
  const wrap = document.getElementById("lesson9Match");
  if (!wrap) return;

  const state = {};
  wrap.querySelectorAll(".match-item").forEach(item => {
    const key = item.dataset.key;
    const parent = item.parentElement;

    if (parent.id === "l9MatchPool") state[key] = "pool";
    else if (parent.classList.contains("match-drop")) state[key] = parent.dataset.target || "pool";
    else state[key] = "pool";
  });

  setCookie(L9_MATCH_COOKIE, JSON.stringify(state), 365);
}

function loadL9MatchState() {
  const wrap = document.getElementById("lesson9Match");
  if (!wrap) return;

  const pool = document.getElementById("l9MatchPool");
  const raw = getCookie(L9_MATCH_COOKIE);
  if (!raw || !pool) return;

  let state;
  try { state = JSON.parse(raw); } catch { return; }

  Object.entries(state).forEach(([key, place]) => {
    const item = wrap.querySelector(`.match-item[data-key="${key}"]`);
    if (!item) return;

    if (place === "pool") {
      pool.appendChild(item);
    } else {
      const drop = wrap.querySelector(`.match-drop[data-target="${place}"]`);
      (drop || pool).appendChild(item);
    }
  });
}

function initLesson9Match() {
  const wrap = document.getElementById("lesson9Match");
  if (!wrap) return;

  const pool = document.getElementById("l9MatchPool");
  const check = document.getElementById("l9MatchCheckBtn");
  const reset = document.getElementById("l9MatchResetBtn");
  const msg = document.getElementById("l9MatchMsg");
  if (!pool || !check || !reset || !msg) return;

  // dragstart
  wrap.querySelectorAll(".match-item").forEach(item => {
    item.addEventListener("dragstart", e => {
      e.dataTransfer.setData("text/plain", item.dataset.key);
    });
  });

  function makeZone(zone) {
    zone.addEventListener("dragover", e => e.preventDefault());
    zone.addEventListener("drop", e => {
      e.preventDefault();
      const key = e.dataTransfer.getData("text/plain");
      const item = wrap.querySelector(`.match-item[data-key="${key}"]`);
      if (!item) return;

      // если дроп-ячейка занята — вернуть в пул
      if (zone !== pool) {
        const existing = zone.querySelector(".match-item");
        if (existing && existing !== item) pool.appendChild(existing);
      }

      zone.appendChild(item);
      msg.textContent = "";
      msg.classList.remove("correct", "incorrect");
      saveL9MatchState();
    });
  }

  makeZone(pool);
  wrap.querySelectorAll(".match-drop").forEach(makeZone);

  loadL9MatchState();

  check.addEventListener("click", () => {
    msg.classList.remove("correct", "incorrect");

    // все ячейки должны быть заполнены
    const drops = Array.from(wrap.querySelectorAll(".match-drop"));
    const allFilled = drops.every(d => d.querySelector(".match-item"));
    if (!allFilled) {
      msg.textContent = "Заполни все пары.";
      msg.classList.add("incorrect");
      return;
    }

    let ok = true;

    // проверяем: в каждой ячейке должен лежать правильный ключ
    drops.forEach(drop => {
      const target = drop.dataset.target;          // "1".."5"
      const item = drop.querySelector(".match-item");
      const key = item?.dataset.key;              // "A".."E"
      if (!key || L9_MATCH_CORRECT[key] !== target) ok = false;
    });

    msg.textContent = ok ? "Правильно!" : "Неверно.";
    msg.classList.add(ok ? "correct" : "incorrect");
    saveL9MatchState();
  });

  reset.addEventListener("click", () => {
    wrap.querySelectorAll(".match-item").forEach(i => pool.appendChild(i));
    msg.textContent = "";
    msg.classList.remove("correct", "incorrect");
    deleteCookie(L9_MATCH_COOKIE);
  });
}

document.addEventListener("DOMContentLoaded", initLesson9Match);

  // === Урок 10: свободный ответ (1 попытка) ===
  const L10_PLAN_COOKIE = "lesson10_security_plan";

  function initLesson10FreeAnswer() {
    const wrap = document.getElementById("lesson10Task");
    if (!wrap) return; // не на этой странице

    const textarea = document.getElementById("lesson10Answer");
    const btn      = document.getElementById("lesson10SubmitBtn");
    const status   = document.getElementById("lesson10Status");
    if (!textarea || !btn || !status) return;

    const saved = getCookie(L10_PLAN_COOKIE);
    if (saved) {
      textarea.value = saved;
      textarea.disabled = true;
      btn.disabled = true;
      status.textContent = "Ответ сохранён.";
      status.classList.add("correct");
      return;
    }

    btn.addEventListener("click", () => {
      const value = textarea.value.trim();

      if (!value) {
        status.textContent = "Напиши хотя бы одно предложение.";
        status.classList.remove("correct");
        status.classList.add("incorrect");
        return;
      }

      setCookie(L10_PLAN_COOKIE, value, 365);

      textarea.disabled = true;
      btn.disabled = true;
      status.textContent = "Ответ сохранён.";
      status.classList.remove("incorrect");
      status.classList.add("correct");
    });
  }

  document.addEventListener("DOMContentLoaded", initLesson10FreeAnswer);


  // инициализация задания 2
  document.addEventListener("DOMContentLoaded", initMatchTask);


  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".lesson-thumb img").forEach(img => {
      img.loading = "lazy";
      img.decoding = "async";
    });
  });

  document.addEventListener("DOMContentLoaded", renderIndex);

  // Сделать функции доступными из HTML
  window.getResults = getResults;
  window.checkQuizGeneric = checkQuizGeneric;
})();

