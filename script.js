const API = 'https://backend-2wm0.onrender.com';
Telegram.WebApp.ready();

const user = Telegram.WebApp.initDataUnsafe?.user || {};
const headers = {
  'X-Telegram-User-ID': user?.id || 999999,
  'X-Telegram-Username': user?.username || 'demo_user',
  'X-Telegram-Photo': user?.photo_url || ''
};

let circles = [], chart;

document.getElementById('deal-form').onsubmit = async e => {
  e.preventDefault();
  const type = e.target.type.value;
  const amount = parseFloat(e.target.amount.value);
  const currency = e.target.currency.value.trim();
  const price = parseFloat(e.target.price.value);
  const note = e.target.note.value;
  const buyPrice = parseFloat(e.target.buyPrice.value);

  if (type === 'buy') {
    if (!buyPrice) return alert('Укажите цену покупки!');
    await fetch(`${API}/circles`, {
      method:'POST', headers:{'Content-Type':'application/json', ...headers},
      body:JSON.stringify({ buyAmount:amount, buyPrice })
    });
  } else {
    const sel = document.getElementById('circleSelect');
    const circ = circles[sel.selectedIndex];
    if (!circ) return alert('Выберите круг');
    await fetch(`${API}/circles/${circ.id}/sells`, {
      method:'POST', headers:{'Content-Type':'application/json', ...headers},
      body:JSON.stringify({ amount, currency, price, note })
    });
  }

  e.target.reset();
  load();
};

async function load() {
  circles = await (await fetch(`${API}/circles`, { headers })).json();
  render(); chartDraw();
}

function render() {
  const wrap = document.getElementById('circles');
  const sel = document.getElementById('circleSelect');
  wrap.innerHTML = ''; sel.innerHTML = '';
  circles.forEach((c,i)=>{
    const bought = parseFloat(c.buy_amount);
    const buyCost = bought * parseFloat(c.buy_price);
    let soldQty=0, revenue=0;
    c.sells.forEach(s=>{
      const a=parseFloat(s.amount), p=parseFloat(s.price);
      soldQty+=a; revenue+=a*p;
    });
    const pnl = revenue - buyCost;
    const pct = bought ? Math.min(100, Math.round(soldQty / bought *1000)/10) : 0;

    const cur = c.sells[0]?.currency || '';
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `
      <b>Круг #${i+1}</b><br>
      Куплено: ${bought} ${cur} (вложено ${buyCost.toLocaleString()}₽)<br>
      Продано: ${soldQty} ${cur}<br>
      Выручка: ${revenue.toLocaleString()}₽<br>
      PnL: ${pnl.toLocaleString()}₽<br>
      Выполнено: ${pct}%<br>
      <ul>${c.sells.map(s=>`<li>${s.amount}×${s.price}₽ — ${s.note||''}</li>`).join('')}</ul>
      <button onclick="del(${c.id})">Удалить</button>`;
    wrap.appendChild(card);

    const o=document.createElement('option');
    o.textContent=`Круг #${i+1}`; sel.appendChild(o);
  });
}

async function del(id) {
  await fetch(`${API}/circles/${id}`, { method:'DELETE', headers });
  load();
}

function chartDraw(){
  const ctx = document.getElementById('mainChart').getContext('2d');
  if(chart) chart.destroy();
  const labels = circles.map((_,i)=>`#${i+1}`);
  const sold = circles.map(c=> c.sells.reduce((sum,s)=>sum+parseFloat(s.amount)*parseFloat(s.price),0));
  const bought = circles.map(c=>parseFloat(c.buy_amount)*parseFloat(c.buy_price));
  const pnl = sold.map((v,i)=>v - bought[i]);

  chart = new Chart(ctx,{
    type:'bar',
    data:{ labels, datasets:[
      { label:'Выручка ₽', data:sold, backgroundColor:'#4caf50' },
      { label:'Прибыль ₽', data:pnl, backgroundColor:'#2196f3' }
    ]},
    options:{ responsive:true, plugins:{legend:{position:'bottom'}} }
  });
}

document.querySelectorAll('.tab').forEach(t=>{
  t.addEventListener('click',()=> {
    document.querySelectorAll('.tab, .tab-content').forEach(el=>el.classList.remove('active'));
    t.classList.add('active');
    document.getElementById(t.dataset.tab).classList.add('active');
  });
});

load();
