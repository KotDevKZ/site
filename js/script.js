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
            chosenLabel.classList.add("q-right");   // зелёный
          } else {
            chosenLabel.classList.add("q-wrong");   // красный
          }
        }
      }

      if (correctInput) {
        const correctLabel = correctInput.closest("label");
        if (correctLabel) {
          correctLabel.classList.add("right-answer"); // обводка правильного
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

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".lesson-thumb img").forEach(img => {
      img.loading = "lazy";
      img.decoding = "async";
    });
  });

  document.addEventListener("DOMContentLoaded", renderIndex);

  // Сделать функции доступными из HTML
  window.getResults = getResults;
  window.checkQuizGeneric = checkQuizGeneric;/**/
})();
