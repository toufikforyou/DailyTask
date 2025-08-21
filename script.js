// MediTrack Script
// Basic state persistence in localStorage (simple, no backend)
(function () {
  const qs = (sel) => document.querySelector(sel);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));
  const STORAGE_KEY = "meditrack.daily.v1";
  const state = loadState();

  // Date setup
  const now = new Date();
  const dayBox = qs("#dayBox");
  const monthBox = qs("#monthBox");
  const yearBox = qs("#yearBox");
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  dayBox.textContent = String(now.getDate()).padStart(2, "0");
  monthBox.textContent = monthNames[now.getMonth()];
  yearBox.textContent = now.getFullYear();
  qs("#yearCopy").textContent = now.getFullYear();

  // Elements
  const taskList = qs("#taskList");
  const addTaskBtn = qs("#addTaskBtn");
  const template = qs("#taskItemTemplate");
  const totalHours = qs("#totalHours");
  const starRating = qs("#starRating");
  // Target summary elements
  const targetHoursInput = qs("#targetHours");
  const fulfilledHoursInput = qs("#fulfilledHours");
  const targetDiffEl = qs("#targetDifference");
  const targetRatingEl = qs("#targetRating");
  const noteFields = {
    priorityTask: qs("#priorityTask"),
    whyStudy: qs("#whyStudy"),
    difficultSubject: qs("#difficultSubject"),
    pendingTomorrow: qs("#pendingTomorrow"),
    previousNotes: qs("#previousNotes"),
  };
  // Sidebar dynamic lists & extras
  const sidebarBoxes = qsa('.sidebar .note-box');
  const prayerIds = ['fajr','dhuhr','asr','maghrib','isha'];
  const wastedTimeInput = qs('#wastedTimeInput');

  // Vocabulary
  const vocabEl = qs("#vocabContent");
  const shuffleBtn = qs("#shuffleWord");
  const vocabulary = [
    { word: "Amicable", syn: "Friendly", extra: ["Cordial", "Good-natured"] },
    { word: "Bargain", syn: "Negotiate", extra: ["Deal", "Haggle"] },
    { word: "Candid", syn: "Frank", extra: ["Honest", "Open"] },
    { word: "Alleviate", syn: "Relieve", extra: ["Ease", "Mitigate"] },
    { word: "Benign", syn: "Harmless", extra: ["Mild", "Kind"] },
    { word: "Pragmatic", syn: "Practical", extra: ["Realistic", "Sensible"] },
    { word: "Diligent", syn: "Hardworking", extra: ["Industrious", "Persistent"] },
    { word: "Vital", syn: "Essential", extra: ["Crucial", "Key"] },
    { word: "Transient", syn: "Temporary", extra: ["Passing", "Brief"] },
    { word: "Equitable", syn: "Fair", extra: ["Impartial", "Just"] },
  ];

  function pickWords(count = 4) {
    const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  function renderVocabulary(words) {
    vocabEl.innerHTML = "";
    words.forEach((w) => {
      const div = document.createElement("div");
      div.className = "word-card";
      div.innerHTML =
        `<span class="word">${w.word} ↔ ${w.syn}</span>` +
        `<span class="definition">Synonyms</span>` +
        `<div class="syns">${[w.syn, ...w.extra].join(", ")}</div>`;
      vocabEl.appendChild(div);
    });
  }

  if (shuffleBtn) {
    shuffleBtn.addEventListener("click", () => {
      const words = pickWords();
      renderVocabulary(words);
      state.vocab = words.map((w) => w.word);
      saveState();
    });
  }

  // Tasks
  function createTask(data) {
    const li = template.content.firstElementChild.cloneNode(true);
    const checkbox = li.querySelector(".task-check");
    const durationEl = li.querySelector(".duration");
    const titleEl = li.querySelector(".task-title");

    durationEl.textContent = data.duration || "20 min";
    titleEl.textContent = data.title || "";
    if (data.done) {
      li.classList.add("done");
      checkbox.checked = true;
    }

    checkbox.addEventListener("change", () => {
      li.classList.toggle("done", checkbox.checked);
      data.done = checkbox.checked;
      persistTasks();
    });

    const checkDecor = li.querySelector('.check-decor');
    if(checkDecor){
      checkDecor.addEventListener('click', (e) => {
        e.preventDefault();
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }

    function handleEdit(e) {
      if (e.inputType === "insertParagraph") {
        e.preventDefault();
        document.execCommand("undo");
      }
      data.duration = durationEl.textContent.trim();
      data.title = titleEl.textContent.trim();
      persistTasks();
    }
    durationEl.addEventListener("input", handleEdit);
    titleEl.addEventListener("input", handleEdit);

    li.querySelector(".delete-task").addEventListener("click", () => {
      li.remove();
      state.tasks = state.tasks.filter((t) => t !== data);
      persistTasks();
    });

    return li;
  }

  function persistTasks() {
    state.tasks = qsa(".task-item").map((li) => ({
      duration: li.querySelector(".duration").textContent.trim(),
      title: li.querySelector(".task-title").textContent.trim(),
      done: li.classList.contains("done"),
    }));
    saveState();
  }

  function findInvalidTaskField(){
    const items = qsa('.task-item');
    for(const li of items){
      const dur = li.querySelector('.duration');
      const title = li.querySelector('.task-title');
      const d = (dur.textContent || '').trim();
      const t = (title.textContent || '').trim();
      const isDefault = (d.toLowerCase() === '20 min' && t === '');
      if(!d || !t || isDefault){
        return { li, field: !d ? dur : (!t ? title : title) };
      }
    }
    return null;
  }

  addTaskBtn.addEventListener('click', () => {
    const invalid = findInvalidTaskField();
    if(invalid){
      const li = invalid.li;
      li.classList.add('invalid');
      li.classList.remove('shake');
      void li.offsetWidth;
      li.classList.add('shake');
      const titleEl = li.querySelector('.task-title');
      if(titleEl){
        titleEl.focus();
      }
      const clearInvalid = () => {
        li.classList.remove('invalid');
        li.classList.remove('shake');
        li.removeEventListener('input', clearInvalid, true);
      };
      li.addEventListener('input', clearInvalid, true);
      return;
    }
    const data = {duration:'20 min', title:'', done:false};
    const el = createTask(data);
    taskList.appendChild(el);
    state.tasks.push(data);
    persistTasks();
    el.querySelector('.task-title').focus();
  });

  if (starRating) {
    starRating.addEventListener("click", (e) => {
      if (e.target.classList.contains("star")) {
        const val = Number(e.target.dataset.value);
        state.stars = val;
        updateStars();
        saveState();
      }
    });
  }

  function updateStars() {
    if (!starRating) return;
    qsa(".star").forEach((st) => {
      const active = Number(st.dataset.value) <= (state.stars || 0);
      st.classList.toggle("active", active);
      st.setAttribute("aria-checked", active);
    });
  }

  if (totalHours) {
    totalHours.addEventListener("input", () => {
      state.totalHours = totalHours.value;
      saveState();
    });
  }

  Object.entries(noteFields).forEach(([k, el]) => {
    if (!el) return;
    el.addEventListener("input", () => {
      state.notes[k] = el.value;
      saveState();
    });
  });

  // Setup dynamic note lists with plus buttons
  function setupSidebarAdds(){
    sidebarBoxes.forEach(box => {
      const key = box.getAttribute('data-box');
      const plusBtn = box.querySelector('.plus-btn');
      const input = box.querySelector('.input-with-plus .note-input');
      const list = box.querySelector('.note-list');
      
      if(!plusBtn || !input || !list) return;
      
      // Render existing items with remove buttons
      const renderList = () => {
        list.innerHTML = '';
        const arr = (state.notes[key+':list'] || []);
        arr.forEach((text, index) => {
          const li = document.createElement('li');
          li.innerHTML = `
            <span>${text}</span>
            <button type="button" class="remove-item" data-index="${index}">×</button>
          `;
          list.appendChild(li);
        });
      };
      
      renderList();
      
      // Add item function
      const addItem = () => {
        const val = (input.value || '').trim();
        if(!val) return;
        
        const current = (state.notes[key+':list'] || []);
        current.push(val);
        state.notes[key+':list'] = current;
        saveState();
        
        input.value = '';
        renderList();
      };
      
      // Plus button click
      plusBtn.addEventListener('click', addItem);
      
      // Enter key in input
      input.addEventListener('keydown', (e) => {
        if(e.key === 'Enter') {
          addItem();
        }
      });
      
      // Remove item clicks
      list.addEventListener('click', (e) => {
        if(e.target.classList.contains('remove-item')) {
          const index = parseInt(e.target.dataset.index);
          const current = (state.notes[key+':list'] || []);
          current.splice(index, 1);
          state.notes[key+':list'] = current;
          saveState();
          renderList();
        }
      });
    });
  }
  setupSidebarAdds();

  // Prayers persistence
  function loadPrayers(){
    const saved = state.notes.prayers || {};
    prayerIds.forEach(id => {
      const el = qs('#prayer-'+id);
      if(el){ el.checked = !!saved[id]; }
    });
  }
  function bindPrayers(){
    prayerIds.forEach(id => {
      const el = qs('#prayer-'+id);
      if(!el) return;
      el.addEventListener('change', () => {
        if(!state.notes.prayers) state.notes.prayers = {};
        state.notes.prayers[id] = el.checked;
        saveState();
      });
    });
  }
  loadPrayers();
  bindPrayers();

  // Wasted time single input
  if(wastedTimeInput){
    wastedTimeInput.value = state.notes.wastedTime || '';
    wastedTimeInput.addEventListener('input', () => {
      state.notes.wastedTime = wastedTimeInput.value;
      saveState();
    });
  }

  // Persistence helpers
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw)
        return {
          tasks: sampleTasks(),
          stars: 0,
          totalHours: "",
          notes: {},
          vocab: [],
          targetSummary: { target: "", fulfilled: "", rating: 0 },
        };
      const parsed = JSON.parse(raw);
      if (!parsed.targetSummary)
        parsed.targetSummary = { target: "", fulfilled: "", rating: 0 };
      return parsed;
    } catch (e) {
      return {
        tasks: sampleTasks(),
        stars: 0,
        totalHours: "",
        notes: {},
        vocab: [],
        targetSummary: { target: "", fulfilled: "", rating: 0 },
      };
    }
  }
  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  function sampleTasks() {
    return [
      { duration: "20 min", title: "International pocket book (3 pages)", done: false },
      { duration: "30 min", title: "Vocabulary pocket book", done: false },
      { duration: "1 hour", title: "MedWords review", done: false },
      { duration: "45 min", title: "Anatomy diagrams", done: false },
    ];
  }

  // Init render
  state.tasks.forEach((t) => taskList.appendChild(createTask(t)));
  if (totalHours) {
    totalHours.value = state.totalHours || "";
  }
  Object.entries(noteFields).forEach(([k, el]) => {
    if (el) {
      el.value = state.notes[k] || "";
    }
  });
  updateStars();
  if (state.vocab && state.vocab.length) {
    const words = state.vocab
      .map((name) => vocabulary.find((v) => v.word === name))
      .filter(Boolean);
    if (words.length) renderVocabulary(words);
    else renderVocabulary(pickWords());
  } else {
    renderVocabulary(pickWords());
  }

  // Target summary logic
  function bindTargetInputs() {
    if (!targetHoursInput || !fulfilledHoursInput) return false;
    targetHoursInput.value = state.targetSummary.target || "";
    fulfilledHoursInput.value = state.targetSummary.fulfilled || "";
    updateTargetMetrics();
    const recalc = () => {
      updateTargetMetrics();
      persistTargetSummary();
    };
    const evts = ["input", "change", "blur", "keyup", "paste"];
    evts.forEach((evt) => targetHoursInput.addEventListener(evt, recalc));
    evts.forEach((evt) => fulfilledHoursInput.addEventListener(evt, recalc));
    return true;
  }
  
  if (!bindTargetInputs()) {
    let attempts = 0;
    const retry = setInterval(() => {
      attempts++;
      if (bindTargetInputs() || attempts > 20) {
        clearInterval(retry);
      }
    }, 100);
  }

  function parseNum(str) {
    if (!str) return NaN;
    return parseFloat(str.replace(",", "."));
  }

  function updateTargetMetrics() {
    if (!targetHoursInput || !fulfilledHoursInput || !targetDiffEl) return;
    const tRaw = targetHoursInput.value.trim();
    const fRaw = fulfilledHoursInput.value.trim();
    const tVal = parseNum(tRaw);
    const fVal = parseNum(fRaw);
    const t = isNaN(tVal) ? 0 : tVal;
    const f = isNaN(fVal) ? 0 : fVal;
    const emptyInputs = tRaw === "" && fRaw === "";
    const diff = f - t;
    targetDiffEl.classList.remove("positive", "negative");
    if (emptyInputs) {
      targetDiffEl.textContent = "—";
    } else {
      const val = diff.toFixed(2);
      if (diff > 0) {
        targetDiffEl.textContent = "+" + val;
        targetDiffEl.classList.add("positive");
      } else if (diff < 0) {
        targetDiffEl.textContent = val;
        targetDiffEl.classList.add("negative");
      } else {
        targetDiffEl.textContent = "0.00";
      }
    }
    state.targetSummary.rating = computeTargetRating(t, f);
    updateTargetStars();
    saveState();
  }

  function computeTargetRating(t, f) {
    if (!t) {
      return 0;
    }
    const pct = (f / t) * 100;
    if (pct >= 100) return 5;
    if (pct >= 80) return 4;
    if (pct >= 60) return 3;
    if (pct >= 40) return 2;
    if (pct > 0) return 1;
    return 0;
  }

  function persistTargetSummary() {
    state.targetSummary.target = targetHoursInput.value;
    state.targetSummary.fulfilled = fulfilledHoursInput.value;
    saveState();
  }

  function updateTargetStars() {
    if (!targetRatingEl) return;
    const rating = state.targetSummary.rating || 0;
    const stars = targetRatingEl.querySelectorAll(".rating-star");
    stars.forEach((st) => {
      const val = Number(st.dataset.star);
      st.classList.toggle("active", val <= rating);
    });
    targetRatingEl.setAttribute("aria-label", rating + " out of 5 stars");
  }
})();
