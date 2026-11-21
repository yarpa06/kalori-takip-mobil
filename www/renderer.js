// --- KENDİ SUPABASE BİLGİLERİNİ BURAYA YAZ ---
import { createClient } from 'https://esm.sh';
const SUPABASE_URL = 'https://fexhvolqvvttcylbvyod.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NsrHHvkMhNlkkzKXd1_lig_aiaK-smL';
// ---------------------------------------------


const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
let currentUser = null;

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

async function fetchAndRender(targetDate = currentDate) {
  try {
    const { data: { session }, error: sessionErr } = await sb.auth.getSession();
    if (sessionErr) throw sessionErr;
    currentUser = session?.user || null;
  } catch (err) {
    setStatus(authStatus, 'Oturum kontrol hatası: ' + err.message, 'error');
    currentUser = null;
  }

  if (!currentUser) {
    authScreen.hidden = false;
    appScreen.hidden = true;
    return;
  }

  authScreen.hidden = true;
  appScreen.hidden = false;
  currentDate = targetDate;
  datePicker.value = currentDate;

  document.getElementById('user-email-label').textContent = currentUser.email;
  document.getElementById('user-avatar').textContent = (currentUser.email || '?').charAt(0).toUpperCase();

  const { data: mealsData, error } = await sb
    .from('meals')
    .select('*')
    .eq('date', currentDate)
    .order('created_at', { ascending: false });

  if (error) {
    setStatus(formStatus, error.message, 'error');
    return;
  }

  const { data: waterRow } = await sb
    .from('water_logs')
    .select('amount_ml')
    .eq('date', currentDate)
    .maybeSingle();

  const meals = mealsData || [];
  const waterMl = waterRow ? Number(waterRow.amount_ml) : 0;
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
      await sb.from('meals').delete().eq('id', meal.id);
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
    const { error } = action === 'login'
      ? await sb.auth.signInWithPassword({ email, password })
      : await sb.auth.signUp({ email, password });
    if (error) throw error;
    setStatus(authStatus, 'Giriş başarılı!', 'ok');
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
logoutBtn.addEventListener('click', async () => {
  await sb.auth.signOut();
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
  const { data: existing } = await sb.from('water_logs').select('amount_ml').eq('date', currentDate).maybeSingle();
  const currentMl = existing ? Number(existing.amount_ml) : 0;
  const nextMl = Math.max(0, Math.min(20000, currentMl + deltaMl));
  await sb.from('water_logs').upsert(
    { user_id: currentUser.id, date: currentDate, amount_ml: nextMl, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,date' }
  );
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
    const { data, error } = await sb.functions.invoke('hesapla', {
      body: { mealType: mealType.value, text }
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    await sb.from('meals').insert({
      user_id: currentUser.id,
      date: currentDate,
      meal_type: mealType.value,
      food_text: text,
      title: data.title || 'Öğün',
      calories: Number(data.calories) || 0,
      protein: Number(data.protein) || 0,
      carbs: Number(data.carbs) || 0,
      fat: Number(data.fat) || 0
    });
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
const { data: meals } = await sb.from('meals').select('*').eq('date', currentDate);
const { data: water } = await sb.from('water_logs').select('amount_ml').eq('date', currentDate).maybeSingle();
const list = meals || [];
const waterMl = water ? Number(water.amount_ml) : 0;
const summaryText = Tarih: ${currentDate}\nHedef: ${getGoal()} kcal\nAlınan: ${list.reduce((s, m) => s + Number(m.calories), 0)} kcal\nSu: ${waterMl} ml\nÖğünler: ${list.map(m => m.title).join(', ')};
const { data, error } = await sb.functions.invoke('hesapla', {
body: { mode: 'analyze', summaryText }
});
if (error) throw error;
out.textContent = data?.advice || 'Gayet iyi gidiyorsun!';
} catch (err) {
out.textContent = 'Uyarı: ' + err.message;
} finally {
btn.disabled = false;
}
});
fetchAndRender(currentDate);
