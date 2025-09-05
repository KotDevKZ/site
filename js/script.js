(function () {
  const STORE_KEY = "results";

  function getResults() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch { return {}; }
  }
  function setResults(obj) {
    localStorage.setItem(STORE_KEY, JSON.stringify(obj));
  }

  // Подсчёт теста на страницах уроков
  function checkQuizGeneric({ answers, lessonKey, passPercent }) {
    const form = document.getElementById("quizForm");
    if (!form) return;

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
    if (nextBtn && percent >= passPercent) nextBtn.style.display = "inline-block";
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

  document.addEventListener("DOMContentLoaded", renderIndex);

  // Сделать функции доступными из HTML
  window.getResults = getResults;
  window.checkQuizGeneric = checkQuizGeneric;
})();
