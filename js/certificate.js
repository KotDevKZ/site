document.addEventListener("DOMContentLoaded", () => {
  const name = localStorage.getItem("studentName") || "Иван Иванов";
  const r = (window.getResults ? window.getResults() : {});
  const keys = Object.keys(r);
  const avg = keys.length ? Math.round(keys.reduce((a, k) => a + (r[k].percent || 0), 0) / keys.length) : 0;

  const nameEl = document.getElementById("studentName");
  if (nameEl) nameEl.textContent = name;

  const avgEl = document.getElementById("avg");
  if (avgEl) avgEl.textContent = `${avg}%`;

  const dateEl = document.getElementById("date");
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString();
});
