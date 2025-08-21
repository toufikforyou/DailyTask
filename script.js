// MediTrack Script
// Basic state persistence in localStorage (simple, no backend)
(function(){
  const qs = sel => document.querySelector(sel);
  const qsa = sel => Array.from(document.querySelectorAll(sel));
  const STORAGE_KEY = 'meditrack.daily.v1';
  const state = loadState();

  // Date setup
  const now = new Date();
  const dayBox = qs('#dayBox');
  const monthBox = qs('#monthBox');
  const yearBox = qs('#yearBox');
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  dayBox.textContent = String(now.getDate()).padStart(2,'0');
  monthBox.textContent = monthNames[now.getMonth()];
  yearBox.textContent = now.getFullYear();
  qs('#yearCopy').textContent = now.getFullYear();

  // Elements
  const taskList = qs('#taskList');
  const addTaskBtn = qs('#addTaskBtn');
  const template = qs('#taskItemTemplate');
  const totalHours = qs('#totalHours');
  const starRating = qs('#starRating');
  const noteFields = {
    priorityTask: qs('#priorityTask'),
    whyStudy: qs('#whyStudy'),
    difficultSubject: qs('#difficultSubject'),
    pendingTomorrow: qs('#pendingTomorrow'),
  };

  // Vocabulary
  const vocabEl = qs('#vocabContent');
  const shuffleBtn = qs('#shuffleWord');
  const vocabulary = [
    { word:'Amicable', syn:'Friendly', extra:['Cordial','Good-natured'] },
    { word:'Bargain', syn:'Negotiate', extra:['Deal','Haggle'] },
    { word:'Candid', syn:'Frank', extra:['Honest','Open'] },
    { word:'Alleviate', syn:'Relieve', extra:['Ease','Mitigate'] },
    { word:'Benign', syn:'Harmless', extra:['Mild','Kind'] },
    { word:'Pragmatic', syn:'Practical', extra:['Realistic','Sensible'] },
    { word:'Diligent', syn:'Hardworking', extra:['Industrious','Persistent'] },
    { word:'Vital', syn:'Essential', extra:['Crucial','Key'] },
    { word:'Transient', syn:'Temporary', extra:['Passing','Brief'] },
    { word:'Equitable', syn:'Fair', extra:['Impartial','Just'] }
  ];

  function pickWords(count=4){
    const shuffled = [...vocabulary].sort(()=>Math.random()-0.5);
    return shuffled.slice(0,count);
  }

  function renderVocabulary(words){
    vocabEl.innerHTML = '';
    words.forEach(w => {
      const div = document.createElement('div');
      div.className='word-card';
      div.innerHTML = `<span class="word">${w.word} ↔ ${w.syn}</span>` +
        `<span class="definition">Synonyms</span>` +
        `<div class="syns">${[w.syn, ...w.extra].join(', ')}</div>`;
      vocabEl.appendChild(div);
    });
  }

  shuffleBtn.addEventListener('click', () => {
    const words = pickWords();
    renderVocabulary(words);
    state.vocab = words.map(w => w.word);
    saveState();
  });

  // Tasks
  function createTask(data){
    const li = template.content.firstElementChild.cloneNode(true);
    const checkbox = li.querySelector('.task-check');
    const durationEl = li.querySelector('.duration');
    const titleEl = li.querySelector('.task-title');

    durationEl.textContent = data.duration || '20 min';
    titleEl.textContent = data.title || 'New Task';
    if(data.done){
      li.classList.add('done');
      checkbox.checked = true;
    }

    checkbox.addEventListener('change', () => {
      li.classList.toggle('done', checkbox.checked);
      data.done = checkbox.checked;
      persistTasks();
    });

    function handleEdit(e){
      // Remove line breaks
      if(e.inputType === 'insertParagraph'){
        e.preventDefault();
        document.execCommand('undo');
      }
      data.duration = durationEl.textContent.trim();
      data.title = titleEl.textContent.trim();
      persistTasks();
    }
    durationEl.addEventListener('input', handleEdit);
    titleEl.addEventListener('input', handleEdit);

    li.querySelector('.delete-task').addEventListener('click', () => {
      li.remove();
      state.tasks = state.tasks.filter(t => t !== data);
      persistTasks();
    });

    return li;
  }

  function persistTasks(){
    state.tasks = qsa('.task-item').map(li => ({
      duration: li.querySelector('.duration').textContent.trim(),
      title: li.querySelector('.task-title').textContent.trim(),
      done: li.classList.contains('done')
    }));
    saveState();
  }

  addTaskBtn.addEventListener('click', () => {
    const data = {duration:'20 min', title:'New Task', done:false};
    const el = createTask(data);
    taskList.appendChild(el);
    state.tasks.push(data);
    persistTasks();
    el.querySelector('.task-title').focus();
  });

  // Star rating
  starRating.addEventListener('click', e => {
    if(e.target.classList.contains('star')){
      const val = Number(e.target.dataset.value);
      state.stars = val;
      updateStars();
      saveState();
    }
  });

  function updateStars(){
    qsa('.star').forEach(st => {
      const active = Number(st.dataset.value) <= (state.stars||0);
      st.classList.toggle('active', active);
      st.setAttribute('aria-checked', active);
    });
  }

  // Total hours
  totalHours.addEventListener('input', () => {
    state.totalHours = totalHours.value;
    saveState();
  });

  // Notes
  Object.entries(noteFields).forEach(([k,el]) => {
    el.addEventListener('input', () => {
      state.notes[k] = el.value;
      saveState();
    });
  });

  // Persistence helpers
  function loadState(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return { tasks: sampleTasks(), stars:0, totalHours:'', notes:{}, vocab:[] };
      return JSON.parse(raw);
    } catch(e){
      return { tasks: sampleTasks(), stars:0, totalHours:'', notes:{}, vocab:[] };
    }
  }
  function saveState(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  function sampleTasks(){
    return [
      {duration:'20 min', title:'International pocket book (3 pages)', done:false},
      {duration:'30 min', title:'Vocabulary pocket book', done:false},
      {duration:'1 hour', title:'MedWords review', done:false},
      {duration:'45 min', title:'Anatomy diagrams', done:false}
    ];
  }

  // Init render
  state.tasks.forEach(t => taskList.appendChild(createTask(t)));
  totalHours.value = state.totalHours || '';
  Object.entries(noteFields).forEach(([k,el]) => { el.value = state.notes[k] || ''; });
  updateStars();
  if(state.vocab && state.vocab.length){
    // Map stored word names back to objects
    const words = state.vocab.map(name => vocabulary.find(v => v.word === name)).filter(Boolean);
    if(words.length) renderVocabulary(words); else renderVocabulary(pickWords());
  } else {
    renderVocabulary(pickWords());
  }
})();
