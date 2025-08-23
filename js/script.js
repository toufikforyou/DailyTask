// MediTrack Script
// Basic state persistence in localStorage (simple, no backend)
(function () {
  const qs = (sel) => document.querySelector(sel);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));
  const BASE_KEY = "meditrack.daily.v1"; // will be suffixed by YYYY-MM-DD
  const DAY_KEY = 'meditrack.day.v1'; // legacy (today/tomorrow)
  const DATE_OFFSET_KEY = 'meditrack.offset.v1'; // 0 = today, 1 = tomorrow, 2 = +2 days, ...
  const ONBOARD_KEY = "meditrack.onboard.v1";
  function todayAtMidnight(){ const d=new Date(); d.setHours(0,0,0,0); return d; }
  function formatDateKey(d){
    const y=d.getFullYear();
    const m=String(d.getMonth()+1).padStart(2,'0');
    const da=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${da}`;
  }
  function storageKeyForDate(date){ return `${BASE_KEY}.${formatDateKey(date)}`; }
  function getInitialOffset(){
    // Prefer explicit offset
    let off = 0;
    try { off = JSON.parse(localStorage.getItem(DATE_OFFSET_KEY) || '0'); } catch { off = 0; }
    if (typeof off === 'number' && off >= 0) return off;
    // Fallback to legacy day key
    try {
      const daySel = JSON.parse(localStorage.getItem(DAY_KEY) || '"today"');
      if (daySel === 'tomorrow') return 1;
    } catch {}
    // Fallback to onboarding choice
    try {
      const onb = JSON.parse(localStorage.getItem(ONBOARD_KEY) || 'null');
      if (onb && onb.day === 'tomorrow') return 1;
    } catch {}
    return 0;
  }
  let currentOffset = getInitialOffset();
  function getDateFromOffset(off){ const d=todayAtMidnight(); d.setDate(d.getDate()+off); return d; }
  let currentDate = getDateFromOffset(currentOffset);
  let state = loadState(currentDate);

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
  const navPrevDay = qs('#navPrevDay');
  const navNextDay = qs('#navNextDay');
  const dayNavError = qs('#dayNavError');

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
  function setDateBoxes(date){
    dayBox.textContent = String(date.getDate()).padStart(2, '0');
    monthBox.textContent = monthNames[date.getMonth()];
    yearBox.textContent = date.getFullYear();
  }
  function setActiveDayBtnByOffset(off){
    [switchToday, switchTomorrow].forEach(b=> b && b.classList.remove('active'));
    if (off === 0 && switchToday) switchToday.classList.add('active');
    else if (off === 1 && switchTomorrow) switchTomorrow.classList.add('active');
  // Hide prev button when today
  const body = document.body;
    if (body) body.classList.toggle('nav-prev-hidden', off === 0);
    if (navPrevDay) navPrevDay.disabled = (off === 0);
  }
  // Initialize header day UI from current date/offset
  setDateBoxes(currentDate);
  setActiveDayBtnByOffset(currentOffset);
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
    saveState();
    currentOffset = 0;
    currentDate = getDateFromOffset(currentOffset);
    localStorage.setItem(DATE_OFFSET_KEY, JSON.stringify(currentOffset));
    localStorage.setItem(DAY_KEY, JSON.stringify('today'));
    setDateBoxes(currentDate); setActiveDayBtnByOffset(currentOffset);
    state = loadState(currentDate);
    applyStateToUI();
  });
  if (switchTomorrow) switchTomorrow.addEventListener('click', () => {
    saveState();
    currentOffset = 1;
    currentDate = getDateFromOffset(currentOffset);
    localStorage.setItem(DATE_OFFSET_KEY, JSON.stringify(currentOffset));
    localStorage.setItem(DAY_KEY, JSON.stringify('tomorrow'));
    setDateBoxes(currentDate); setActiveDayBtnByOffset(currentOffset);
    state = loadState(currentDate);
    applyStateToUI();
  });
  // Prev/Next navigation buttons
  function goToOffset(off){
    if (off < 0) off = 0;
    saveState();
    currentOffset = off;
    currentDate = getDateFromOffset(currentOffset);
    localStorage.setItem(DATE_OFFSET_KEY, JSON.stringify(currentOffset));
    // Update legacy day key for today/tomorrow only
    if (currentOffset === 0) localStorage.setItem(DAY_KEY, JSON.stringify('today'));
    else if (currentOffset === 1) localStorage.setItem(DAY_KEY, JSON.stringify('tomorrow'));
    setDateBoxes(currentDate); setActiveDayBtnByOffset(currentOffset);
    state = loadState(currentDate);
    applyStateToUI();
  }
  if (navPrevDay) navPrevDay.addEventListener('click', () => {
    goToOffset(currentOffset - 1);
  });
  // Validation: prevent navigating next if planner is completely blank
  function isEmptyString(s){ return !s || String(s).trim().length === 0; }
  function isPlannerBlank(){
    try {
      // Tasks: any meaningful content?
      const hasTasks = (state.tasks || []).some(t => {
        const dur = (t.duration || '').trim();
        const title = (t.title || '').trim();
        const nonDefaultDur = dur && dur.toLowerCase() !== '20 min';
        return !!title || nonDefaultDur || !!t.done;
      });

      // Notes textareas
      const textNoteKeys = ['priorityTask','whyStudy','difficultSubject','pendingTomorrow','previousNotes'];
      const hasNotesText = textNoteKeys.some(k => !isEmptyString(state.notes?.[k]));

      // Dynamic lists
      const hasListItems = Object.keys(state.notes || {}).some(k => k.endsWith(':list') && Array.isArray(state.notes[k]) && state.notes[k].length > 0);

      // Prayers
      const hasPrayers = Object.values(state.notes?.prayers || {}).some(Boolean);

      // Wasted time
      const hasWastedTime = !isEmptyString(state.notes?.wastedTime);

      // Target summary
      const t = parseFloat(state.targetSummary?.target || '');
      const f = parseFloat(state.targetSummary?.fulfilled || '');
      const hasTargets = ((isFinite(t) && t > 0) || (isFinite(f) && f > 0));

      // Other signals
      const hasTotalHours = !isEmptyString(state.totalHours);
      const hasStars = (state.stars || 0) > 0;

      const any = hasTasks || hasNotesText || hasListItems || hasPrayers || hasWastedTime || hasTargets || hasTotalHours || hasStars;
      return !any;
    } catch { return false; }
  }
  function showDayNavError(msg){
    if(dayNavError){
      dayNavError.textContent = msg;
      dayNavError.hidden = false;
    }
    if(navNextDay){
      navNextDay.classList.remove('attention');
      // reflow to retrigger animation
      void navNextDay.offsetWidth;
      navNextDay.classList.add('attention');
      setTimeout(() => navNextDay.classList.remove('attention'), 900);
    }
    // Auto-hide after 5 seconds
    clearDayNavError._t && clearTimeout(clearDayNavError._t);
    clearDayNavError._t = setTimeout(() => {
      clearDayNavError();
    }, 5000);
  }
  function clearDayNavError(){
    if(dayNavError){ dayNavError.hidden = true; dayNavError.textContent = ''; }
  }
  if (navNextDay) navNextDay.addEventListener('click', () => {
    if (isPlannerBlank()) {
      showDayNavError('আগে এই দিনের জন্য অন্তত একটি জিনিস যোগ করুন — টাস্ক, নোট, ঘণ্টা, টার্গেট বা স্টার রেটিং।');
      return;
    }
    clearDayNavError();
    goToOffset(currentOffset + 1);
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
  const back12 = onboarding.querySelector('#onbBackToStep1');
  const back23 = onboarding.querySelector('#onbBackToStep2');
  const back34 = onboarding.querySelector('#onbBackToStep3');
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
    if (back12) back12.addEventListener('click', () => {
      step2.hidden = true; step1.hidden = false;
      // keep entered name
      nameInput.focus();
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
    if (back23) back23.addEventListener('click', () => {
      step3.hidden = true; step2.hidden = false;
      // restore selected day button active state
      if (stateOnb.day) {
        step2.querySelectorAll('.btn.choice').forEach(x=>x.classList.toggle('active', x.dataset.day === stateOnb.day));
        btnS2.disabled = false;
      }
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
    const chosenOffset = stateOnb.day === 'tomorrow' ? 1 : 0;
    currentOffset = chosenOffset;
    currentDate = getDateFromOffset(currentOffset);
    setDateBoxes(currentDate);
    setActiveDayBtnByOffset(currentOffset);
    localStorage.setItem(DATE_OFFSET_KEY, JSON.stringify(currentOffset));
    localStorage.setItem(DAY_KEY, JSON.stringify(chosenOffset === 0 ? 'today' : 'tomorrow'));
  // Load corresponding day state
  state = loadState(currentDate);
  applyStateToUI();
      setTimeout(() => {
        onboarding.hidden = true;
      }, 1300);
    });
    if (back34) back34.addEventListener('click', () => {
      step4.hidden = true; step3.hidden = false;
      // restore selected plan active state
      if (stateOnb.plan) {
        step3.querySelectorAll('.btn.choice').forEach(x=>x.classList.toggle('active', x.dataset.plan === stateOnb.plan));
        btnS3.disabled = false;
      }
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
  function loadState(dateObj) {
    try {
      const dateToUse = dateObj || currentDate;
      let raw = localStorage.getItem(storageKeyForDate(dateToUse));
      // Simple migration: if no date-based data but legacy today/tomorrow exist
      if (!raw) {
        const todayKey = `${BASE_KEY}.today`;
        const tomorrowKey = `${BASE_KEY}.tomorrow`;
        const todayStr = localStorage.getItem(todayKey);
        const tomorrowStr = localStorage.getItem(tomorrowKey);
        const todayKeyStr = formatDateKey(todayAtMidnight());
        const tomorrowKeyStr = formatDateKey(getDateFromOffset(1));
        const wantKeyStr = formatDateKey(dateToUse);
        if (wantKeyStr === todayKeyStr && todayStr) raw = todayStr;
        if (wantKeyStr === tomorrowKeyStr && tomorrowStr) raw = tomorrowStr;
        if (raw) {
          // persist under date-based key for future
          localStorage.setItem(storageKeyForDate(dateToUse), raw);
        }
      }
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
    localStorage.setItem(storageKeyForDate(currentDate), JSON.stringify(state));
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
