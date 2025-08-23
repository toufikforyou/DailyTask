// MediTrack Script
// Basic state persistence in localStorage (simple, no backend)
(function () {
  const qs = (sel) => document.querySelector(sel);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));
  const BASE_KEY = "meditrack.daily.v1";
  const DAY_KEY = 'meditrack.day.v1';
  const ONBOARD_KEY = "meditrack.onboard.v1";
  function storageKeyFor(day){ return `${BASE_KEY}.${day}`; }
  function getSelectedDay(){
    let daySel = 'today';
    try { daySel = JSON.parse(localStorage.getItem(DAY_KEY) || '"today"'); } catch { daySel = 'today'; }
    if(!localStorage.getItem(DAY_KEY)){
      try {
        const onb = JSON.parse(localStorage.getItem(ONBOARD_KEY) || 'null');
        if(onb && (onb.day === 'today' || onb.day === 'tomorrow')) daySel = onb.day;
      } catch { /* ignore */ }
    }
    return (daySel === 'tomorrow') ? 'tomorrow' : 'today';
  }
  let currentDay = getSelectedDay();
  let state = loadState(currentDay);

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
  const greetingEl = qs('#greetingName');
  const switchToday = qs('#switchToday');
  const switchTomorrow = qs('#switchTomorrow');

  // Read onboarding data and greet
  let onboardData = null;
  try { onboardData = JSON.parse(localStorage.getItem(ONBOARD_KEY) || 'null'); } catch {}
  if (greetingEl && onboardData) {
    const name = onboardData.name || '';
    const goal = onboardData.goal || '';
    let msg = '';
    if (goal === 'University') msg = `— Hey Future Publician ${name}!`;
    else if (goal === 'Engineering') msg = `— Hey Future Engineer ${name}!`;
    else if (goal === 'Medical') msg = `— Hey Future Doctor ${name}!`;
    else if (name) msg = `— Welcome ${name}!`;
    greetingEl.textContent = msg;
  }

  // Day switching: affects date shown and persists
  function setDateFor(day){
    const base = new Date();
    if(day === 'tomorrow') base.setDate(base.getDate() + 1);
    dayBox.textContent = String(base.getDate()).padStart(2, '0');
    monthBox.textContent = monthNames[base.getMonth()];
    yearBox.textContent = base.getFullYear();
  }
  function setActiveDayBtn(day){
    [switchToday, switchTomorrow].forEach(b=> b && b.classList.remove('active'));
    if(day === 'tomorrow' && switchTomorrow) switchTomorrow.classList.add('active');
    else if (switchToday) switchToday.classList.add('active');
  }
  // Initialize header day UI from currentDay
  setDateFor(currentDay);
  setActiveDayBtn(currentDay);
  function applyStateToUI(){
    // Tasks
    if (taskList) {
      taskList.innerHTML = '';
      (state.tasks || []).forEach((t) => taskList.appendChild(createTask(t)));
    }
    // Hours
    if (totalHours) totalHours.value = state.totalHours || '';
    // Notes (textareas)
    Object.entries(noteFields).forEach(([k, el]) => {
      if (el) el.value = state.notes[k] || '';
    });
    // Sidebar lists
    refreshSidebarLists();
    // Prayers
    loadPrayers();
    // Wasted time
    if (wastedTimeInput) wastedTimeInput.value = state.notes.wastedTime || '';
    // Stars
    updateStars();
    // Target summary inputs + metrics
    if (targetHoursInput && fulfilledHoursInput) {
      targetHoursInput.value = state.targetSummary?.target || '';
      fulfilledHoursInput.value = state.targetSummary?.fulfilled || '';
      updateTargetMetrics();
    }
  }
  function refreshSidebarLists(){
    qsa('.sidebar .note-box').forEach(box => {
      const key = box.getAttribute('data-box');
      const list = box.querySelector('.note-list');
      if(!list) return;
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
    });
  }
  if (switchToday) switchToday.addEventListener('click', () => {
    // Persist current, switch day, load and render
    saveState();
    currentDay = 'today';
    localStorage.setItem(DAY_KEY, JSON.stringify(currentDay));
    setDateFor(currentDay); setActiveDayBtn(currentDay);
    state = loadState(currentDay);
    applyStateToUI();
  });
  if (switchTomorrow) switchTomorrow.addEventListener('click', () => {
    saveState();
    currentDay = 'tomorrow';
    localStorage.setItem(DAY_KEY, JSON.stringify(currentDay));
    setDateFor(currentDay); setActiveDayBtn(currentDay);
    state = loadState(currentDay);
    applyStateToUI();
  });

  // Onboarding logic
  const onboarding = qs('#onboarding');
  function showOnboardingIfNeeded(){
    try{
      const done = JSON.parse(localStorage.getItem(ONBOARD_KEY) || 'null');
      if(!done && onboarding){
        onboarding.hidden = false;
        setupOnboarding();
      }
    }catch{ /* ignore */ }
  }
  function setupOnboarding(){
    const step1 = onboarding.querySelector('[data-step="1"]');
    const step2 = onboarding.querySelector('[data-step="2"]');
    const step3 = onboarding.querySelector('[data-step="3"]');
    const step4 = onboarding.querySelector('[data-step="4"]');
    const step5 = onboarding.querySelector('[data-step="5"]');
    const nameInput = onboarding.querySelector('#onbName');
    const btnS1 = onboarding.querySelector('#onbToStep2');
    const btnS2 = onboarding.querySelector('#onbToStep3');
    const btnS3 = onboarding.querySelector('#onbToStep4');
    const msg = onboarding.querySelector('#onbMessage');

    const stateOnb = { name: '', day: '', plan: '', goal: '' };

    nameInput.addEventListener('input', () => {
      stateOnb.name = nameInput.value.trim();
      btnS1.disabled = stateOnb.name.length === 0;
    });
    btnS1.addEventListener('click', () => {
      step1.hidden = true; step2.hidden = false; nameInput.blur();
    });

    step2.addEventListener('click', (e) => {
      const b = e.target.closest('.btn.choice');
      if(!b) return;
      step2.querySelectorAll('.btn.choice').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      stateOnb.day = b.dataset.day;
      btnS2.disabled = false;
    });
    btnS2.addEventListener('click', () => {
      step2.hidden = true; step3.hidden = false;
    });

    step3.addEventListener('click', (e) => {
      const b = e.target.closest('.btn.choice');
      if(!b) return;
      step3.querySelectorAll('.btn.choice').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      stateOnb.plan = b.dataset.plan;
      btnS3.disabled = false;
    });
    btnS3.addEventListener('click', () => {
      step3.hidden = true; step4.hidden = false;
    });

    step4.addEventListener('click', (e) => {
      const b = e.target.closest('.btn.choice');
      if(!b) return;
      step4.querySelectorAll('.btn.choice').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      stateOnb.goal = b.dataset.goal;
      // Step 5: Personalized message
      step4.hidden = true; step5.hidden = false;
      const name = stateOnb.name || 'Student';
      let greeting = '';
      if(stateOnb.goal === 'University') greeting = `Hey Future Publician ${name}!`;
      else if(stateOnb.goal === 'Engineering') greeting = `Hey Future Engineer ${name}!`;
      else if(stateOnb.goal === 'Medical') greeting = `Hey Future Doctor ${name}!`;
      else greeting = `Welcome ${name}!`;
      msg.textContent = greeting;

      // Persist and redirect to dashboard (hide overlay)
  localStorage.setItem(ONBOARD_KEY, JSON.stringify({ ...stateOnb, ts: Date.now() }));
  // Reflect greeting and selected day immediately in header and date boxes
      if (greetingEl) {
        greetingEl.textContent = `— ${greeting}`;
      }
      const chosenDay = stateOnb.day === 'tomorrow' ? 'tomorrow' : 'today';
      setDateFor(chosenDay);
      setActiveDayBtn(chosenDay);
      localStorage.setItem('meditrack.day.v1', JSON.stringify(chosenDay));
  // Load corresponding day state
  currentDay = chosenDay;
  state = loadState(currentDay);
  applyStateToUI();
      setTimeout(() => {
        onboarding.hidden = true;
      }, 1300);
    });
  }

  showOnboardingIfNeeded();

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
  function loadState(dayKey) {
    try {
      const raw = localStorage.getItem(storageKeyFor(dayKey || currentDay));
      if (!raw)
        return {
          tasks: [],
          stars: 0,
          totalHours: "",
          notes: {},
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
        targetSummary: { target: "", fulfilled: "", rating: 0 },
      };
    }
  }
  function saveState() {
    localStorage.setItem(storageKeyFor(currentDay), JSON.stringify(state));
  }

  // Initial UI render from current day's state
  applyStateToUI();

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
    // Clamp inputs between 0 and 24
    let tRaw = targetHoursInput.value.trim();
    let fRaw = fulfilledHoursInput.value.trim();
    let tVal = parseNum(tRaw);
    let fVal = parseNum(fRaw);
    if (!isNaN(tVal)) {
      tVal = Math.max(0, Math.min(24, tVal));
      if (tVal != parseNum(tRaw)) targetHoursInput.value = String(tVal);
    }
    if (!isNaN(fVal)) {
      fVal = Math.max(0, Math.min(24, fVal));
      if (fVal != parseNum(fRaw)) fulfilledHoursInput.value = String(fVal);
    }
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
