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
    if (res && !document.getElementById("resetAttempt")) {
      const btn = document.createElement("button");
      btn.id = "resetAttempt";
      btn.type = "button";
      btn.className = "btn btn-outline";
      btn.textContent = "Сбросить попытку";
      btn.onclick = window.resetQuiz;
      res.insertAdjacentElement("afterend", btn);
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

