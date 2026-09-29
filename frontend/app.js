const list = document.getElementById('tasks');
const form = document.getElementById('task-form');
const input = document.getElementById('title');
const errorEl = document.getElementById('error');

function showError(msg) {
  errorEl.textContent = msg || '';
  errorEl.hidden = !msg;
}

async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

async function load() {
  try {
    const tasks = await api('/tasks');
    list.innerHTML = '';
    tasks.forEach(render);
    showError('');
  } catch (e) { showError(e.message); }
}

function render(t) {
  const li = document.createElement('li');
  if (t.done) li.className = 'done';

  const span = document.createElement('span');
  span.textContent = t.title;
  span.onclick = () => safe(() => api(`/tasks/${t.id}`, { method: 'PATCH' }));

  const del = document.createElement('button');
  del.className = 'del';
  del.textContent = '✕';
  del.onclick = () => safe(() => api(`/tasks/${t.id}`, { method: 'DELETE' }));

  li.append(span, del);
  list.appendChild(li);
}

async function safe(fn) {
  try { await fn(); await load(); } catch (e) { showError(e.message); }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  await safe(() => api('/tasks', { method: 'POST', body: JSON.stringify({ title }) }));
  input.value = '';
});

load();
