const API = 'https://backend-2wm0.onrender.com'; // Замени на свой backend, если нужно
Telegram.WebApp.ready();

const initData = Telegram.WebApp.initData;
console.log("📦 initData:", initData);

const initHeaders = { 'x-init-data': initData };
let circles = [];
let chartInstance = null;

// Вкладки
document.querySelectorAll('.tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.querySelector(`#tab-${tab.dataset.tab}`).classList.add('active');
  };
});

// AI-подсказка
document.getElementById('ai-note').onclick = () => {
  const currency = document.getElementById("currency").value;
  const price = document.getElementById("price").value;
  document.getElementById("note").value = `Продажа ${currency} по ${price}₽ — возможно выгодно`;
};

// Отправка формы
document.getElementById('deal-form').onsubmit = async (e) => {
  e.preventDefault();
  const type = document.getElementById("type").value;
  const amount = parseFloat(document.getElementById("amount").value);
  const currency = document.getElementById("currency").value;
  const price = parseFloat(document.getElementById("price").value);
  const note = document.getElementById("note").value;

  if (!amount || (type === "sell" && (!currency || !price))) {
    alert("Заполните все поля");
    return;
  }

  try {
    if (type === "buy") {
      const res = await fetch(`${API}/circles`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...initHeaders },
        body: JSON.stringify({ buyAmount: amount })
      });
      if (!res.ok) {
        const err = await res.text();
        alert("Ошибка при создании круга: " + err);
        return;
      }
    } else {
      const sel = document.getElementById("circleSelect");
      const selected = sel.selectedIndex;
      const circle = circles[selected];
      if (!circle) return alert("Нет выбранного круга");

      const res = await fetch(`${API}/circles/${circle.id}/sells`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...initHeaders },
        body: JSON.stringify({ amount, currency, price, note })
      });
      if (!res.ok) {
        const err = await res.text();
        alert("Ошибка при добавлении сделки: " + err);
        return;
      }
    }

    ['amount', 'currency', 'price', 'note'].forEach(id => document.getElementById(id).value = '');
    await loadCircles();
  } catch (error) {
    alert("Ошибка запроса: " + error.message);
  }
};

// Загрузка кругов
async function loadCircles() {
  const res = await fetch(`${API}/circles`, { headers: initHeaders });
  if (!res.ok) {
    const msg = await res.text();
    alert("Ошибка загрузки кругов: " + msg);
    return;
  }
  circles = await res.json();
  renderCircles();
  drawChart();
}

// Отрисовка кругов
function renderCircles() {
  const wrap = document.getElementById("circles");
  const select = document.getElementById("circleSelect");
  wrap.innerHTML = '';
  select.innerHTML = '';

  circles.forEach((c, i) => {
    const opt = document.createElement("option");
    opt.textContent = `Круг #${i + 1}`;
    select.appendChild(opt);

    const sold = c.buyamount - c.remaining;
    const revenue = c.sells.reduce((sum, s) => sum + s.amount * s.price, 0);
    const pnl = revenue - c.buyamount;
    const percent = ((sold / c.buyamount) * 100).toFixed(1);

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <b>Круг #${i + 1}</b><br>
      Куплено: ${c.buyamount}₽<br>
      Продано: ${sold.toFixed(2)}₽<br>
      Выручка: ${revenue.toFixed(2)}₽<br>
      PnL: ${pnl.toFixed(2)}₽<br>
      Выполнено: ${percent}%<br>
      <ul>${c.sells.map(s => `<li>${s.amount} ${s.currency} по ${s.price}₽ — ${s.note}</li>`).join("")}</ul>
      <button onclick="deleteCircle(${c.id})">Удалить</button>
    `;
    wrap.appendChild(card);
  });
}

// Удалить круг
async function deleteCircle(id) {
  const res = await fetch(`${API}/circles/${id}`, {
    method: "DELETE",
    headers: initHeaders
  });
  if (!res.ok) {
    const msg = await res.text();
    alert("Ошибка удаления: " + msg);
    return;
  }
  await loadCircles();
}

// Построение графика
function drawChart() {
  const ctx = document.getElementById("mainChart").getContext("2d");

  // Уничтожить предыдущий, если есть
  if (chartInstance) {
    chartInstance.destroy();
  }

  const labels = circles.map((_, i) => `Круг #${i + 1}`);
  const revenue = circles.map(c => c.sells.reduce((s, d) => s + d.amount * d.price, 0));
  const pnl = revenue.map((r, i) => r - circles[i].buyamount);

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Выручка", data: revenue, backgroundColor: "#4caf50" },
        { label: "Прибыль", data: pnl, backgroundColor: "#2196f3" }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } }
    }
  });
}

// Загрузка логов (заглушка)
async function loadLogs() {
  const res = await fetch(`${API}/logs`, { headers: initHeaders });
  const logs = await res.json();
  const ul = document.getElementById("logList");
  ul.innerHTML = logs.map(l => `<li>${l.action} — ${new Date(l.created_at).toLocaleString()}</li>`).join('');
}

// Фильтры — пока заглушка
document.getElementById("applyFilter").onclick = () => {
  alert("Фильтрация будет в будущей версии");
};

// Старт
loadCircles();
loadLogs();
