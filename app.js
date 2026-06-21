(() => {
  const root = document.getElementById('root');
  const STORE = 'czechmn_progress_v2';
  const state = { course: null, screen: 'home', lessonIndex: 0, phase: 0, pos: 0, options: [], locked: false };
  const saved = JSON.parse(localStorage.getItem(STORE) || '{"completed":[],"resume":{}}');
  saved.completed ||= [];
  saved.resume ||= {};

  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
  const save = () => localStorage.setItem(STORE, JSON.stringify(saved));
  const tap = (el, fn) => el.addEventListener('click', () => fn(el));

  function lesson() { return state.course.lessons[state.lessonIndex]; }
  function words() { return lesson()[3].map(x => ({ cs:x[0], mn:x[1], pron:x[2] })); }
  function progressPercent() {
    const n = words().length;
    return Math.round(((state.phase * n + state.pos) / (3 * n)) * 100);
  }
  function buildOptions(all, answer) {
    return shuffle([answer, ...shuffle(all.filter(x => x !== answer)).slice(0, 4)]);
  }
  function persistResume() {
    saved.resume[lesson()[0]] = { phase: state.phase, pos: state.pos };
    save();
  }
  function openHome() { state.screen = 'home'; render(); }
  function startLesson(index) {
    state.lessonIndex = index;
    const key = state.course.lessons[index][0];
    const r = saved.resume[key] || { phase:0, pos:0 };
    state.phase = r.phase;
    state.pos = r.pos;
    state.options = [];
    state.locked = false;
    state.screen = 'lesson';
    render();
  }
  function next() {
    state.pos += 1;
    state.options = [];
    state.locked = false;
    if (state.pos >= words().length) { state.pos = 0; state.phase += 1; }
    persistResume();
    render();
  }
  function answer(button, index) {
    if (state.locked) return;
    state.locked = true;
    const w = words()[state.pos];
    const correctAnswer = state.phase === 1 ? w.mn : w.cs;
    const chosen = state.options[index];
    const correct = chosen === correctAnswer;
    button.classList.add(correct ? 'ok' : 'bad');
    if (!correct) {
      const right = [...document.querySelectorAll('.choice')].find(x => x.dataset.value === correctAnswer);
      if (right) right.classList.add('ok');
    }
    setTimeout(next, correct ? 450 : 900);
  }

  function homeHtml() {
    const total = state.course.lessons.length;
    const complete = saved.completed.length;
    return `<section class="hero"><span>ЧЕХ ХЭЛ</span><h1>Өдөр бүр бага багаар сур.</h1><p>Эхлээд үгийг заана. Дараа нь таних, санах дасгал хийнэ.</p><b>${complete}/${total} lesson дууссан</b></section><section class="lessons">${state.course.lessons.map((l, i) => {
      const done = saved.completed.includes(l[0]);
      const locked = i > 0 && !saved.completed.includes(state.course.lessons[i - 1][0]);
      const resumed = !!saved.resume[l[0]] && !done;
      return `<button class="lesson" data-i="${i}" ${locked ? 'disabled' : ''}><span class="emoji">${l[2]}</span><span class="info"><b>${esc(l[1])}</b><small>${l[3].length} үг</small></span><span class="state">${done ? '✓' : locked ? '🔒' : resumed ? 'Үргэлжлүүлэх' : '›'}</span></button>`;
    }).join('')}</section>`;
  }

  function lessonHtml() {
    const L = lesson();
    const W = words();
    if (state.phase >= 3) {
      if (!saved.completed.includes(L[0])) saved.completed.push(L[0]);
      delete saved.resume[L[0]];
      save();
      return `<section class="finish"><span>LESSON COMPLETE</span><h1>Сайн байна.</h1><p>${esc(L[1])} lesson дууслаа.</p><button class="primary" id="home">Хичээлүүд рүү буцах</button></section>`;
    }
    const w = W[state.pos];
    const header = `<header class="lesson-head"><button id="back">‹</button><div><b>${L[2]} ${esc(L[1])}</b><small>${state.pos + 1}/${W.length}</small></div></header><div class="bar"><i style="width:${progressPercent()}%"></i></div>`;
    if (state.phase === 0) {
      return header + `<section class="card"><span>ШИНЭ ҮГ</span><h1>${esc(w.cs)}</h1><div class="meaning">${esc(w.mn)}</div><p class="pron">Дуудлага: ${esc(w.pron)}</p><p class="hint">Энэ шатанд таахгүй. Эхлээд үгийг харж, утгыг нь авна.</p><button class="primary" id="next">Дараах үг</button></section>`;
    }
    const c2m = state.phase === 1;
    const prompt = c2m ? w.cs : w.mn;
    const correct = c2m ? w.mn : w.cs;
    if (!state.options.length) state.options = buildOptions(W.map(x => c2m ? x.mn : x.cs), correct);
    return header + `<section class="card"><span>${c2m ? 'УТГЫГ ТАНЬ' : 'CZECH ҮГИЙГ САНА'}</span><h1>${esc(prompt)}</h1><div class="choices" id="choices"></div><p class="hint">Зөв бол дараагийн дасгал руу автоматаар орно.</p></section>`;
  }

  function render() {
    if (!state.course) return;
    root.innerHTML = state.screen === 'home' ? homeHtml() : lessonHtml();
    if (state.screen === 'home') {
      document.querySelectorAll('[data-i]').forEach(b => tap(b, () => startLesson(Number(b.dataset.i))));
      return;
    }
    if (state.phase >= 3) {
      tap(document.getElementById('home'), openHome);
      return;
    }
    tap(document.getElementById('back'), openHome);
    if (state.phase === 0) {
      tap(document.getElementById('next'), next);
      return;
    }
    const box = document.getElementById('choices');
    state.options.forEach((value, index) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.dataset.value = value;
      b.textContent = value;
      tap(b, () => answer(b, index));
      box.appendChild(b);
    });
  }

  fetch('./data/czech-course.json')
    .then(r => r.json())
    .then(data => { state.course = data; render(); })
    .catch(() => root.innerHTML = '<p class="error">Хичээлийн data ачаалж чадсангүй.</p>');
})();