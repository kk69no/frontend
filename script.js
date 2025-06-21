const API = 'https://backend-2wm0.onrender.com';
Telegram.WebApp.ready();

const user = Telegram.WebApp.initDataUnsafe?.user || {};
const userHeaders = {
  'X-Telegram-User-ID': user?.id || 999999,
  'X-Telegram-Username': user?.username || "demo_user",
  'X-Telegram-Photo': user?.photo_url || ""
};

let circles = [];
let chartInstance = null;

document.getElementById('deal-form').onsubmit = async (e) => {
  e.preventDefault();
  const type = document.getElementById("type").value;
  const amount = parseFloat(document.getElementById("amount").value);
  const currency = document.getElementById("currency").value;
  const price = parseFloat(document.getElementById("price").value);
  const note = document.getElementById("note").value;

  if (!amount || (type === "sell" && (!currency || !price))) {
    return alert("Заполните все поля");
  }

  try {
    if (type === "buy") {
      await fetch(`${API}/circles`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json', ...userHeaders },
        body: JSON.stringify({ buyAmount: amount })
      });
    } else {
      const sel = document.getElementById("circleSelect");
      const selected = sel.selectedIndex;
      const circle = circles[selected];
      if (!circle) return alert("Нет выбранного круга");

      await fetch(`${API}/circles/${circle.id}/sells`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json', ...userHeaders },
        body: JSON.stringify({ amount, currency, price, note })
      });
    }

    ['amount', 'currency', 'price', 'note'].forEach(id => document.getElementById(id).value = '');
    await loadCircles();
  } catch (e) {
    alert("Ошибка запроса: " + e.message);
  }
};

async function loadCircles() {
  const res = await fetch(`${API}/circles`, { headers: userHeaders });
  circles = await res.json();
  renderCircles();
  drawChart();
}

function renderCircles() {
  const wrap = document.getElementById("circles");
  const select = document.getElementById("circleSelect");
  wrap.innerHTML = '';
  select.innerHTML = '';

  circles.forEach((c, i) => {
    const sold = c.buyamount - c.remaining;
    const revenue = c.sells.reduce((s, d) => s + d.amount * d.price, 0);
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

    const opt = document.createElement("option");
    opt.textContent = `Круг #${i + 1}`;
    select.appendChild(opt);
  });
}

async function deleteCircle(id) {
  await fetch(`${API}/circles/${id}`, {
    method: "DELETE",
    headers: userHeaders
  });
  await loadCircles();
}

function drawChart() {
  const ctx = document.getElementById("mainChart").getContext("2d");
  if (chartInstance) chartInstance.destroy();

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

loadCircles();
