// --- KENDİ SUPABASE BİLGİLERİNİ BURAYA YAZ ---
const SUPABASE_URL = 'https://fexhvolqvvttcylbvyod.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NsrHHvkMhNlkkzKXd1_lig_aiaK-smL';
const APP_VERSION = '1.0.2';

// ---------------------------------------------


const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authStatus = document.getElementById('auth-status');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');

const datePicker = document.getElementById('date-picker');
const todayBtn = document.getElementById('today-btn');
const goalInput = document.getElementById('goal');
const mealText = document.getElementById('meal-text');
const mealType = document.getElementById('meal-type');
const mealList = document.getElementById('meal-list');
const addButton = document.getElementById('add-meal');
const formStatus = document.getElementById('form-status');

const numberFormat = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });
let currentDate = getTodayStr();
let session = JSON.parse(localStorage.getItem('sb_session') || 'null');

function getTodayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function setStatus(element, message, kind) {
  if (!element) return;
  element.textContent = message || '';
  element.className = kind ? `status ${kind}` : 'status';
  if (kind === 'error') element.style.color = '#f87171';
  else if (kind === 'ok') element.style.color = '#34d399';
  else element.style.color = '#94a3b8';
}

function formatKcal(value) {
  return `${numberFormat.format(Math.round(value))} kcal`;
}

function getGoal() {
  return Number(localStorage.getItem('daily_goal')) || 2000;
}

function authHeaders(extra = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    ...extra
  };
  if (session?.access_token) {
    headers['Authorization'] = 'Bearer ' + session.access_token;
  }
  return headers;
}

async function fetchAndRender(targetDate = currentDate) {
  if (!session || !session.access_token || !session.user) {
    authScreen.hidden = false;
    appScreen.hidden = true;
    return;
  }

  authScreen.hidden = true;
  appScreen.hidden = false;
  currentDate = targetDate;
  datePicker.value = currentDate;

  const email = session.user.email || '';
  document.getElementById('user-email-label').textContent = email;
  document.getElementById('user-avatar').textContent = (email || '?').charAt(0).toUpperCase();

  try {
    const mealsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/meals?date=eq.${currentDate}&order=created_at.desc`,
      { headers: authHeaders() }
    );
    if (mealsRes.status === 401) {
      session = null;
      localStorage.removeItem('sb_session');
      return fetchAndRender(currentDate);
    }
    const meals = mealsRes.ok ? await mealsRes.json() : [];

    const waterRes = await fetch(
      `${SUPABASE_URL}/rest/v1/water_logs?date=eq.${currentDate}&select=amount_ml`,
      { headers: authHeaders() }
    );
    const waterRows = waterRes.ok ? await waterRes.json() : [];
    const waterMl = waterRows.length ? Number(waterRows[0].amount_ml) : 0;

    renderDashboard(meals, waterMl);
  } catch (err) {
    setStatus(formStatus, 'Bağlantı hatası: ' + err.message, 'error');
  }
}

function renderDashboard(meals, waterMl) {
  const goal = getGoal();
  const isToday = currentDate === getTodayStr();
  todayBtn.hidden = isToday;

  const consumed = meals.reduce((sum, m) => sum + Number(m.calories || 0), 0);
  const protein = meals.reduce((sum, m) => sum + Number(m.protein || 0), 0);
  const carbs = meals.reduce((sum, m) => sum + Number(m.carbs || 0), 0);
  const fat = meals.reduce((sum, m) => sum + Number(m.fat || 0), 0);
  const remaining = goal - consumed;
  const ratio = goal > 0 ? Math.min(100, (consumed / goal) * 100) : 0;
  const over = remaining < 0;

  const displayDate = new Date(`${currentDate}T12:00:00`);
  document.getElementById('today-label').textContent = displayDate.toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }) + (isToday ? ' (Bugün)' : '');

  document.getElementById('consumed').textContent = formatKcal(consumed);
  const remainingEl = document.getElementById('remaining');
  remainingEl.textContent = formatKcal(remaining);
  remainingEl.className = over ? 'stat over' : 'stat';
  document.getElementById('protein').textContent = `${numberFormat.format(protein)} g`;
  document.getElementById('carbs').textContent = `${numberFormat.format(carbs)} g`;
  document.getElementById('fat').textContent = `${numberFormat.format(fat)} g`;
  document.getElementById('progress-label').textContent = `${formatKcal(consumed)} / ${formatKcal(goal)}`;

  const fill = document.getElementById('progress-fill');
  fill.style.width = `${ratio}%`;
  fill.className = over ? 'fill over' : 'fill';

  const glasses = Math.floor(waterMl / 250);
  document.getElementById('water-label').textContent = `${waterMl} / 2500 ml (${glasses} Bardak)`;
  document.getElementById('water-fill').style.width = `${Math.min(100, (waterMl / 2500) * 100)}%`;

  if (document.activeElement !== goalInput) goalInput.value = String(goal);

  mealList.replaceChildren();
  if (!meals.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = isToday ? 'Bugün henüz bir öğün eklenmedi.' : 'Seçilen tarihte kayıt yok.';
    mealList.appendChild(empty);
    return;
  }

  meals.forEach((meal) => {
    const article = document.createElement('article');
    article.className = 'meal';

    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.textContent = meal.meal_type;

    const body = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = meal.title || 'Öğün';
    const text = document.createElement('p');
    text.textContent = meal.food_text;
    body.append(title, text);

    const side = document.createElement('div');
    side.className = 'meal-side';
    const kcal = document.createElement('span');
    kcal.className = 'kcal';
    kcal.textContent = formatKcal(meal.calories);
    const macros = document.createElement('div');
    macros.className = 'macros-inline';
    macros.textContent = `P ${numberFormat.format(meal.protein)} · K ${numberFormat.format(meal.carbs)} · Y ${numberFormat.format(meal.fat)} g`;
    const remove = document.createElement('button');
    remove.className = 'delete';
    remove.type = 'button';
    remove.textContent = 'Sil';
    remove.addEventListener('click', async () => {
      await fetch(`${SUPABASE_URL}/rest/v1/meals?id=eq.${meal.id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      fetchAndRender(currentDate);
    });
    side.append(kcal, macros, remove);

    article.append(pill, body, side);
    mealList.appendChild(article);
  });
}

async function handleAuth(action) {
  const email = authEmail.value.trim();
  const password = authPassword.value;
  if (!email || !password) return setStatus(authStatus, 'E-posta ve şifre girin.', 'error');

  loginBtn.disabled = true;
  registerBtn.disabled = true;
  setStatus(authStatus, 'Sunucuya bağlanılıyor...');

  try {
    const endpoint = action === 'login'
      ? `${SUPABASE_URL}/auth/v1/token?grant_type=password`
      : `${SUPABASE_URL}/auth/v1/signup`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error_description || data.msg || data.message || 'Giriş başarısız.');
    }

    if (!data.access_token) {
      setStatus(authStatus, 'Kayıt tamamlandı! Şimdi Giriş Yap butonuna basın.', 'ok');
      return;
    }

    session = data;
    localStorage.setItem('sb_session', JSON.stringify(session));
    setStatus(authStatus, '');
    authPassword.value = '';
    await fetchAndRender(currentDate);
  } catch (err) {
    setStatus(authStatus, 'Hata: ' + err.message, 'error');
  } finally {
    loginBtn.disabled = false;
    registerBtn.disabled = false;
  }
}

loginBtn.addEventListener('click', () => handleAuth('login'));
registerBtn.addEventListener('click', () => handleAuth('register'));
logoutBtn.addEventListener('click', () => {
  session = null;
  localStorage.removeItem('sb_session');
  currentDate = getTodayStr();
  fetchAndRender(currentDate);
});

datePicker.addEventListener('change', () => {
  if (datePicker.value) fetchAndRender(datePicker.value);
});
todayBtn.addEventListener('click', () => fetchAndRender(getTodayStr()));
goalInput.addEventListener('change', () => {
  localStorage.setItem('daily_goal', String(Number(goalInput.value) || 2000));
  fetchAndRender(currentDate);
});

async function changeWater(deltaMl) {
  const waterRes = await fetch(
    `${SUPABASE_URL}/rest/v1/water_logs?date=eq.${currentDate}&select=amount_ml`,
    { headers: authHeaders() }
  );
  const rows = waterRes.ok ? await waterRes.json() : [];
  const currentMl = rows.length ? Number(rows[0].amount_ml) : 0;
  const nextMl = Math.max(0, Math.min(20000, currentMl + deltaMl));

  await fetch(`${SUPABASE_URL}/rest/v1/water_logs?on_conflict=user_id,date`, {
    method: 'POST',
    headers: authHeaders({ 'Prefer': 'resolution=merge-duplicates' }),
    body: JSON.stringify({
      user_id: session.user.id,
      date: currentDate,
      amount_ml: nextMl,
      updated_at: new Date().toISOString()
    })
  });
  fetchAndRender(currentDate);
}

document.getElementById('add-water').addEventListener('click', () => changeWater(250));
document.getElementById('sub-water').addEventListener('click', () => changeWater(-250));

addButton.addEventListener('click', async () => {
  const text = mealText.value.trim();
  if (!text) return setStatus(formStatus, 'Önce ne yediğini yaz.', 'error');
  addButton.disabled = true;
  setStatus(formStatus, 'Yapay zeka hesaplıyor...');
  try {
    const fnRes = await fetch(SUPABASE_URL + '/functions/v1/hesapla', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ mealType: mealType.value, text })
    });
    const data = await fnRes.json();
    if (!fnRes.ok || data?.error) throw new Error(data?.error || 'Hesaplama başarısız.');

    const insRes = await fetch(SUPABASE_URL + '/rest/v1/meals', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        user_id: session.user.id,
        date: currentDate,
        meal_type: mealType.value,
        food_text: text,
        title: data.title || 'Öğün',
        calories: Number(data.calories) || 0,
        protein: Number(data.protein) || 0,
        carbs: Number(data.carbs) || 0,
        fat: Number(data.fat) || 0
      })
    });
    if (!insRes.ok) throw new Error('Buluta kaydedilemedi.');

    mealText.value = '';
    setStatus(formStatus, 'Öğün eklendi.', 'ok');
    await fetchAndRender(currentDate);
  } catch (err) {
    setStatus(formStatus, err.message, 'error');
  } finally {
    addButton.disabled = false;
  }
});

document.getElementById('analyze-btn').addEventListener('click', async () => {
  const btn = document.getElementById('analyze-btn');
  const out = document.getElementById('coach-output');
  btn.disabled = true;
  out.textContent = 'Koçun gününü inceliyor...';
  try {
    const mealsRes = await fetch(SUPABASE_URL + '/rest/v1/meals?date=eq.' + currentDate, { headers: authHeaders() });
    const list = mealsRes.ok ? await mealsRes.json() : [];
    const totalCal = list.reduce((s, m) => s + Number(m.calories || 0), 0);
    const mealNames = list.map((m) => m.title || '').join(', ');
    const summaryText = 'Tarih: ' + currentDate + ', Hedef: ' + getGoal() + ' kcal, Alınan: ' + totalCal + ' kcal, Öğünler: ' + mealNames;

    const fnRes = await fetch(SUPABASE_URL + '/functions/v1/hesapla', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ mode: 'analyze', summaryText })
    });
    const data = await fnRes.json();
    if (!fnRes.ok || (data && data.error)) throw new Error((data && data.error) || 'Analiz alınamadı.');
    out.textContent = (data && data.advice) || 'Gayet iyi gidiyorsun!';
  } catch (err) {
    out.textContent = 'Uyarı: ' + err.message;
  } finally {
    btn.disabled = false;
  }
});

fetchAndRender(currentDate);
async function checkMobileUpdate() {
  try {
    const url = 'https://githubusercontent.com' + Date.now();
    const res = await fetch(url);
    if (!res.ok) return;
    const info = await res.json();
    if (info && info.version && info.version !== APP_VERSION) {
      const banner = document.getElementById('update-banner');
      const textEl = document.getElementById('update-text');
      const btnEl = document.getElementById('update-btn');
      if (banner && textEl && btnEl) {
        textEl.textContent = 'Yeni sürüm (v' + info.version + ') hazır!';
        btnEl.onclick = function () {
          window.open(info.apkUrl, '_system');
        };
        banner.style.display = 'flex';
      }
    }
  } catch (e) {}
}

checkMobileUpdate();
