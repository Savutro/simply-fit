"use strict";

(() => {
  const {
    APP_VERSION,
    STORAGE_KEY,
    PREVIOUS_STORAGE_KEYS,
    WELCOME_STORAGE_KEY,
    DARK_MODE_STORAGE_KEY,
    VIEW_STORAGE_KEY,
    BACKUP_TYPE,
    SCHEMA_VERSION,
    VIEW_NAMES,
    METRICS,
    SOCIAL_LINKS
  } = window.WorkoutTrackerConfig;
  const { icon } = window.WorkoutTrackerIcons;

  const state = {
    data: loadData(),
    currentView: readSavedView(),
    selectedExerciseId: null,
    selectedPlanId: null,
    exerciseSearch: "",
    planMode: "active",
    activePlanItemId: null,
    exerciseDraft: null,
    planDraft: null,
    logDraft: null,
    history: {
      fromDate: "",
      toDate: ""
    },
    analytics: {
      exerciseId: null,
      metric: "volume",
      fromDate: "",
      toDate: ""
    },
    darkMode: readLocalStorage(DARK_MODE_STORAGE_KEY) === "true"
  };

  const els = {};
  let toastTimer = null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    applyTheme();
    cacheElements();
    ensureCurrentView();
    bindEvents();
    initializeSelections();
    render();
    showWelcomeDialog();
  }

  function cacheElements() {
    els.tabs = Array.from(document.querySelectorAll(".tab"));
    els.views = Array.from(document.querySelectorAll(".view"));
    els.toast = document.getElementById("toast");
    els.welcomeDialog = document.getElementById("welcomeDialog");
    els.dismissWelcomeButton = document.getElementById("dismissWelcomeButton");
    els.confirmDialog = document.getElementById("confirmDialog");
    els.confirmTitle = document.getElementById("confirmTitle");
    els.confirmMessage = document.getElementById("confirmMessage");
    els.confirmCancelButton = document.getElementById("confirmCancelButton");
    els.confirmAcceptButton = document.getElementById("confirmAcceptButton");

    els.exerciseCount = document.getElementById("exerciseCount");
    els.exerciseList = document.getElementById("exerciseList");
    els.exerciseEditor = document.getElementById("exerciseEditor");
    els.newExerciseButton = document.getElementById("newExerciseButton");

    els.planCount = document.getElementById("planCount");
    els.planList = document.getElementById("planList");
    els.planEditor = document.getElementById("planEditor");
    els.newPlanButton = document.getElementById("newPlanButton");

    els.logPlanSelect = document.getElementById("logPlanSelect");
    els.startLogButton = document.getElementById("startLogButton");
    els.logEditor = document.getElementById("logEditor");
    els.logStatus = document.getElementById("logStatus");

    els.historyList = document.getElementById("historyList");
    els.historyCount = document.getElementById("historyCount");
    els.historyFromDate = document.getElementById("historyFromDate");
    els.historyToDate = document.getElementById("historyToDate");

    els.progressStatus = document.getElementById("progressStatus");
    els.progressExerciseSelect = document.getElementById("progressExerciseSelect");
    els.progressMetricSelect = document.getElementById("progressMetricSelect");
    els.progressFromDate = document.getElementById("progressFromDate");
    els.progressToDate = document.getElementById("progressToDate");
    els.progressSummary = document.getElementById("progressSummary");
    els.progressChart = document.getElementById("progressChart");
    els.progressTable = document.getElementById("progressTable");

    els.backupStats = document.getElementById("backupStats");
    els.exportButton = document.getElementById("exportButton");
    els.importInput = document.getElementById("importInput");
    els.darkModeButton = document.getElementById("darkModeButton");
    els.resetButton = document.getElementById("resetButton");
    els.aboutPanel = document.getElementById("aboutPanel");
  }

  function bindEvents() {
    els.tabs.forEach((tab) => {
      tab.addEventListener("click", () => switchView(tab.dataset.view));
    });

    els.dismissWelcomeButton?.addEventListener("click", () => {
      localStorage.setItem(WELCOME_STORAGE_KEY, "true");
    });
    els.welcomeDialog?.addEventListener("close", () => {
      localStorage.setItem(WELCOME_STORAGE_KEY, "true");
    });

    document.addEventListener("click", (event) => {
      if (event.target.matches('input[type="date"], input[type="time"]')) {
        openNativePicker(event.target);
      }
    });

    els.newExerciseButton.addEventListener("click", () => {
      state.selectedExerciseId = null;
      state.exerciseSearch = "";
      state.exerciseDraft = createBlankExerciseDraft();
      switchView("exercises", { skipCapture: true });
    });

    els.exerciseList.addEventListener("input", (event) => {
      if (event.target.id !== "exerciseSearchInput") {
        return;
      }
      state.exerciseSearch = event.target.value;
      updateExercisePickerResults();
    });

    els.exerciseList.addEventListener("change", (event) => {
      if (event.target.id !== "exerciseSelect") {
        return;
      }
      state.selectedExerciseId = event.target.value || null;
      state.exerciseDraft = exerciseToDraft(getExercise(state.selectedExerciseId));
      render();
    });

    els.exerciseEditor.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) {
        return;
      }
      if (button.dataset.action === "save-exercise") {
        saveExercise();
      }
      if (button.dataset.action === "delete-exercise") {
        deleteExercise();
      }
    });

    els.newPlanButton.addEventListener("click", () => {
      state.selectedPlanId = null;
      state.planMode = "active";
      state.planDraft = createBlankPlanDraft();
      switchView("plans", { skipCapture: true });
    });

    els.planList.addEventListener("change", (event) => {
      if (event.target.id === "planStatusSelect") {
        state.planMode = event.target.value === "archived" ? "archived" : "active";
        state.selectedPlanId = firstPlanIdByMode(state.planMode);
        state.planDraft = state.selectedPlanId ? planToDraft(getPlan(state.selectedPlanId)) : createBlankPlanDraft();
        render();
        return;
      }
      if (event.target.id !== "planSelect") {
        return;
      }
      state.selectedPlanId = event.target.value || null;
      state.planDraft = planToDraft(getPlan(state.selectedPlanId));
      render();
    });

    els.planEditor.addEventListener("click", handlePlanEditorClick);
    els.planEditor.addEventListener("change", handlePlanEditorChange);
    els.planEditor.addEventListener("toggle", handlePlanItemToggle, true);
    els.startLogButton.addEventListener("click", startWorkoutLog);
    els.logEditor.addEventListener("click", handleLogEditorClick);
    els.historyList.addEventListener("click", handleHistoryClick);

    [els.progressExerciseSelect, els.progressMetricSelect].forEach((control) => {
      control.addEventListener("change", () => {
        syncAnalyticsControls();
        renderAnalytics();
      });
    });

    [els.historyFromDate, els.historyToDate].forEach((control) => {
      control.addEventListener("change", () => {
        syncHistoryDateControls();
        renderHistory();
      });
    });

    [els.progressFromDate, els.progressToDate].forEach((control) => {
      control.addEventListener("change", () => {
        syncAnalyticsControls();
        renderAnalytics();
      });
    });

    els.exportButton.addEventListener("click", exportBackup);
    els.importInput.addEventListener("change", handleImport);
    els.darkModeButton.addEventListener("click", toggleDarkMode);

    els.resetButton.addEventListener("click", async () => {
      const confirmed = await confirmAction({
        title: "Clear local data?",
        message: "This removes all exercises, plans, and logs from this device. JSON backups are not affected.",
        confirmText: "Clear Data",
        danger: true
      });
      if (!confirmed) {
        return;
      }
      state.data = createEmptyData();
      state.selectedExerciseId = null;
      state.selectedPlanId = null;
      state.exerciseDraft = createBlankExerciseDraft();
      state.planDraft = createBlankPlanDraft();
      state.logDraft = null;
      persist();
      render();
      showToast("Local workout data cleared.");
    });
  }

  function initializeSelections() {
    state.selectedExerciseId = firstActiveExerciseId();
    state.exerciseDraft = state.selectedExerciseId
      ? exerciseToDraft(getExercise(state.selectedExerciseId))
      : createBlankExerciseDraft();

    state.selectedPlanId = firstPlanIdByMode(state.planMode);
    state.planDraft = state.selectedPlanId ? planToDraft(getPlan(state.selectedPlanId)) : createBlankPlanDraft();
    state.analytics.exerciseId = firstExerciseIdWithSessions() || firstActiveExerciseId();
  }

  function switchView(view, options = {}) {
    if (!VIEW_NAMES.includes(view)) {
      return;
    }
    if (!options.skipCapture) {
      captureVisibleDraft();
    }
    state.currentView = view;
    rememberCurrentView();
    render();
  }

  function captureVisibleDraft() {
    if (state.currentView === "exercises") {
      state.exerciseDraft = readExerciseDraft();
    }
    if (state.currentView === "plans") {
      state.planDraft = readPlanDraft();
    }
    if (state.currentView === "log") {
      state.logDraft = readLogDraft();
    }
  }

  function render() {
    renderNavigation();
    renderExercises();
    renderPlans();
    renderLog();
    renderAnalytics();
    renderHistory();
    renderBackup();
  }

  function renderNavigation() {
    ensureCurrentView();
    els.tabs.forEach((tab) => {
      tab.classList.toggle("is-active", tab.dataset.view === state.currentView);
    });
    els.views.forEach((view) => {
      view.classList.toggle("is-active", view.id === `view-${state.currentView}`);
    });
  }

  function renderExercises() {
    renderExerciseList();
    renderExerciseEditor();
  }

  function renderExerciseList() {
    const exercises = getActiveExercises();
    const filteredExercises = filterExercises(exercises, state.exerciseSearch);
    els.exerciseCount.textContent = `${exercises.length} active ${plural(exercises.length, "exercise", "exercises")}`;

    if (!exercises.length) {
      els.exerciseList.innerHTML = emptyState("No exercises", "Create your exercise index first.");
      return;
    }

    els.exerciseList.innerHTML = `
      <div class="picker-panel">
        <label class="field">
          <span>Search</span>
          <input id="exerciseSearchInput" type="search" value="${escapeAttribute(state.exerciseSearch)}" placeholder="Find exercise">
        </label>
        <label class="field">
          <span>Open exercise</span>
          <select id="exerciseSelect">
            ${renderExercisePickerOptions(filteredExercises)}
          </select>
        </label>
        <p class="picker-meta" id="exercisePickerMeta">${renderExercisePickerMeta(filteredExercises)}</p>
      </div>
    `;
  }

  function updateExercisePickerResults() {
    const select = document.getElementById("exerciseSelect");
    const meta = document.getElementById("exercisePickerMeta");
    if (!select || !meta) {
      return;
    }

    const filteredExercises = filterExercises(getActiveExercises(), state.exerciseSearch);
    select.innerHTML = renderExercisePickerOptions(filteredExercises);
    select.value = filteredExercises.some((exercise) => exercise.id === state.selectedExerciseId)
      ? state.selectedExerciseId
      : "";
    meta.innerHTML = renderExercisePickerMeta(filteredExercises);
  }

  function renderExercisePickerOptions(exercises) {
    if (!exercises.length) {
      return `<option value="" disabled>No matches</option>`;
    }
    return exercises.map((exercise) => `
      <option value="${escapeHtml(exercise.id)}" ${exercise.id === state.selectedExerciseId ? "selected" : ""}>
        ${escapeHtml(exercise.name)}
      </option>
    `).join("");
  }

  function renderExercisePickerMeta(exercises) {
    const selectedExercise = state.selectedExerciseId ? getExercise(state.selectedExerciseId) : null;
    return `${exercises.length} ${plural(exercises.length, "match", "matches")}${selectedExercise ? ` - selected ${escapeHtml(selectedExercise.name)}` : ""}`;
  }

  function renderExerciseEditor() {
    const draft = state.exerciseDraft || createBlankExerciseDraft();
    const isExisting = Boolean(draft.id && getExercise(draft.id));
    const title = isExisting ? "Edit exercise" : "New exercise";

    els.exerciseEditor.innerHTML = `
      <form class="exercise-form" id="exerciseForm">
        <div class="section-title">
          <h3>${title}</h3>
          ${isExisting ? `<span class="status-chip">${countActivePlanUsage(draft.id)} active ${plural(countActivePlanUsage(draft.id), "plan", "plans")}</span>` : ""}
        </div>
        <div class="alert alert-error" id="exerciseAlert"></div>
        <div class="form-grid">
          <label class="field">
            <span>Name</span>
            <input name="exerciseName" value="${escapeAttribute(draft.name)}" autocomplete="off" required>
          </label>
          <label class="field">
            <span>Tracking type</span>
            <select name="exerciseKind">
              <option value="strength" ${draft.kind === "strength" ? "selected" : ""}>Reps x weight</option>
              <option value="duration" ${draft.kind === "duration" ? "selected" : ""}>Time</option>
            </select>
          </label>
          <label class="field full-width">
            <span>Setup notes</span>
            <textarea name="exerciseNotes" placeholder="Machine setup, cues, seat height">${escapeHtml(draft.notes)}</textarea>
          </label>
        </div>
        <div class="editor-actions">
          <button class="button" type="button" data-action="save-exercise">${isExisting ? "Save Exercise" : "Create Exercise"}</button>
          ${isExisting ? `<button class="button button-danger" type="button" data-action="delete-exercise">Delete Exercise</button>` : ""}
        </div>
      </form>
    `;
  }

  function renderPlans() {
    renderPlanList();
    renderPlanEditor();
  }

  function renderPlanList() {
    const activePlans = getActivePlans();
    const archivedPlans = getArchivedPlans();
    const visiblePlans = getPlansByMode(state.planMode);
    els.planCount.textContent = `${activePlans.length} active, ${archivedPlans.length} archived`;

    if (!activePlans.length && !archivedPlans.length) {
      els.planList.innerHTML = emptyState("No plans", "Create a plan after adding exercises.");
      return;
    }

    const selectedPlan = state.selectedPlanId ? getPlan(state.selectedPlanId) : null;
    els.planList.innerHTML = `
      <div class="picker-panel">
        <label class="field">
          <span>Folder</span>
          <select id="planStatusSelect">
            <option value="active" ${state.planMode === "active" ? "selected" : ""}>Active plans (${activePlans.length})</option>
            <option value="archived" ${state.planMode === "archived" ? "selected" : ""}>Archived plans (${archivedPlans.length})</option>
          </select>
        </label>
        <label class="field">
          <span>Open plan</span>
          <select id="planSelect">
            ${visiblePlans.length ? visiblePlans.map((plan) => `<option value="${escapeHtml(plan.id)}" ${plan.id === state.selectedPlanId ? "selected" : ""}>${escapeHtml(plan.name)}</option>`).join("") : `<option value="" disabled>No ${state.planMode} plans</option>`}
          </select>
        </label>
        <p class="picker-meta">${visiblePlans.length} ${state.planMode} ${plural(visiblePlans.length, "plan", "plans")}${selectedPlan ? ` - selected ${escapeHtml(selectedPlan.name)}` : ""}</p>
      </div>
    `;
  }

  function renderPlanEditor() {
    const activeExercises = getActiveExercises();
    const draft = state.planDraft || createBlankPlanDraft();
    if (!activeExercises.length && !draft.id) {
      els.planEditor.innerHTML = `
        <div class="empty-state">
          <h3>Create exercises first</h3>
          <p>Plans are built from the exercise index.</p>
          <div class="button-row">
            <button class="button" type="button" data-action="go-exercises">Create Exercise</button>
          </div>
        </div>
      `;
      return;
    }

    const existingPlan = draft.id ? getPlan(draft.id) : null;
    const isExisting = Boolean(existingPlan);
    const isArchived = Boolean(existingPlan?.archivedAt);

    if (isArchived) {
      els.planEditor.innerHTML = `
        <form class="plan-form readonly-plan" id="planForm">
          <div class="section-title">
            <h3>Archived plan</h3>
            <span class="status-chip status-chip-warning">Archived</span>
          </div>
          <div class="alert alert-error" id="planAlert"></div>
          <div class="readonly-block">
            <strong>${escapeHtml(draft.name || "Untitled plan")}</strong>
            ${draft.notes ? `<p class="readonly-note">${escapeHtml(draft.notes)}</p>` : ""}
          </div>
          <div class="exercise-list">
            ${draft.items.length ? draft.items.map((item, index) => renderPlanItemEditor(item, index, true)).join("") : emptyState("No exercises in plan", "This archived plan has no exercises.")}
          </div>
          <div class="editor-actions">
            <button class="button button-danger" type="button" data-action="delete-plan">Delete Plan</button>
            <button class="button button-secondary" type="button" data-action="restore-plan">Restore Plan</button>
          </div>
        </form>
      `;
      return;
    }

    els.planEditor.innerHTML = `
      <form class="plan-form" id="planForm">
        <div class="section-title">
          <h3>${isExisting ? "Edit plan" : "New plan"}</h3>
          <button class="button button-secondary button-small" type="button" data-action="add-plan-item">+ Exercise</button>
        </div>
        <div class="alert alert-error" id="planAlert"></div>
        <div class="form-grid">
          <label class="field">
            <span>Plan name</span>
            <input name="planName" value="${escapeAttribute(draft.name)}" autocomplete="off" required>
          </label>
          <label class="field">
            <span>Plan notes</span>
            <textarea name="planNotes">${escapeHtml(draft.notes)}</textarea>
          </label>
        </div>
        <div class="exercise-list">
          ${draft.items.length ? draft.items.map((item, index) => renderPlanItemEditor(item, index)).join("") : emptyState("No exercises in plan", "Add exercises from the index.")}
        </div>
        <div class="editor-actions">
          <button class="button" type="button" data-action="save-plan">${isExisting ? "Save Plan" : "Create Plan"}</button>
          ${isExisting ? `<button class="button button-danger" type="button" data-action="archive-plan">Archive Plan</button>` : ""}
          ${isExisting ? `<button class="button button-danger" type="button" data-action="delete-plan">Delete Plan</button>` : ""}
        </div>
      </form>
    `;
  }

  function renderPlanItemEditor(item, index, isArchived = false) {
    const exercise = getExercise(item.exerciseId);
    const exerciseKind = getExerciseKind(item.exerciseId);
    const isOpen = state.activePlanItemId ? state.activePlanItemId === item.id : index === 0;
    const archivedSetChips = isArchived ? renderCompactSetChips(item.targetSets) : "";
    if (isArchived) {
      return `
        <details class="editor-card plan-item-card" data-plan-item-id="${escapeHtml(item.id)}" ${isOpen ? "open" : ""}>
          <summary class="editor-card-header">
            <div class="plan-summary-main">
              <h3>${index + 1}. ${escapeHtml(exercise?.name || "Unknown exercise")}</h3>
            </div>
            <div class="plan-summary-side">
              <div class="set-chip-row">${archivedSetChips || `<span class="set-pill">No sets</span>`}</div>
              <span class="summary-chevron" aria-hidden="true">${icon("chevronDown")}</span>
            </div>
          </summary>
          ${exercise?.notes ? `<p class="exercise-note">${escapeHtml(exercise.notes)}</p>` : ""}
          <div class="set-chip-row set-chip-row-large">${archivedSetChips || `<span class="muted">No target sets</span>`}</div>
        </details>
      `;
    }
    return `
      <details class="editor-card plan-item-card" data-plan-item-id="${escapeHtml(item.id)}" ${isOpen ? "open" : ""}>
        <summary class="editor-card-header">
          <div class="plan-summary-main">
            <div class="plan-title-row">
              <h3>${index + 1}. ${escapeHtml(exercise?.name || "Choose exercise")}</h3>
              <div class="plan-order-controls">
                <button class="button button-ghost button-icon button-icon-small" type="button" data-action="move-item-up" aria-label="Move exercise up" title="Move up">${icon("chevronUp")}</button>
                <button class="button button-ghost button-icon button-icon-small" type="button" data-action="move-item-down" aria-label="Move exercise down" title="Move down">${icon("chevronDown")}</button>
              </div>
            </div>
          </div>
          <div class="plan-summary-side">
            <span class="summary-chevron" aria-hidden="true">${icon("chevronDown")}</span>
          </div>
        </summary>
        <div class="exercise-actions">
          <button class="button button-danger button-small" type="button" data-action="remove-plan-item">Remove</button>
        </div>
        <div class="form-grid">
          <label class="field">
            <span>Exercise</span>
            <select name="exerciseId">
              ${renderExerciseOptions(item.exerciseId)}
            </select>
          </label>
        </div>
        ${exercise?.notes ? `<p class="exercise-note">${escapeHtml(exercise.notes)}</p>` : ""}
        <div class="section-title">
          <h3>Target sets</h3>
          <button class="button button-secondary button-small" type="button" data-action="add-set">+ Set</button>
        </div>
        <div class="set-list">
          ${item.targetSets.length ? item.targetSets.map((set) => renderSetEditor(set, exerciseKind)).join("") : emptyState("No target sets", "Add at least one set.")}
        </div>
      </details>
    `;
  }

  function renderSetEditor(set, kind = "strength", isDisabled = false) {
    const setKind = normalizeExerciseKind(kind) || "strength";
    const normalized = normalizeSetForKind(set, setKind) || createDefaultSet(setKind);
    const disabled = isDisabled ? "disabled" : "";
    return `
      <div class="set-editor" data-set-id="${escapeHtml(normalized.id)}" data-kind="${setKind}">
        <div class="set-fields strength-fields">
          <label class="field">
            <span>Reps</span>
            <input name="setReps" type="number" inputmode="decimal" min="1" step="1" value="${numberValue(normalized.reps)}" ${disabled}>
          </label>
          <label class="field">
            <span>Weight</span>
            <input name="setWeight" type="number" inputmode="decimal" min="0" step="0.5" value="${numberValue(normalized.weight)}" ${disabled}>
          </label>
          <label class="field">
            <span>Unit</span>
            <select name="setWeightUnit" ${disabled}>
              <option value="kg" ${normalized.weightUnit === "kg" ? "selected" : ""}>kg</option>
              <option value="lb" ${normalized.weightUnit === "lb" ? "selected" : ""}>lb</option>
            </select>
          </label>
        </div>

        <div class="set-fields duration-fields">
          <label class="field">
            <span>Time</span>
            <input name="setDuration" type="number" inputmode="decimal" min="1" step="1" value="${numberValue(normalized.duration)}" ${disabled}>
          </label>
          <label class="field">
            <span>Unit</span>
            <select name="setDurationUnit" ${disabled}>
              <option value="min" ${normalized.durationUnit === "min" ? "selected" : ""}>min</option>
              <option value="sec" ${normalized.durationUnit === "sec" ? "selected" : ""}>sec</option>
            </select>
          </label>
        </div>

        <div class="set-actions">
          <button class="button button-danger button-icon" type="button" data-action="remove-set" aria-label="Remove set" title="Remove set" ${disabled}>${icon("trash")}</button>
        </div>
      </div>
    `;
  }

  function renderLog() {
    const plans = getActivePlans();
    els.logPlanSelect.innerHTML = plans.length
      ? plans.map((plan) => `<option value="${escapeHtml(plan.id)}">${escapeHtml(plan.name)}</option>`).join("")
      : `<option value="">No plans</option>`;
    els.logPlanSelect.disabled = !plans.length;
    els.startLogButton.disabled = !plans.length;

    if (state.logDraft && getActivePlan(state.logDraft.planId)) {
      els.logPlanSelect.value = state.logDraft.planId;
    } else if (state.selectedPlanId && getActivePlan(state.selectedPlanId)) {
      els.logPlanSelect.value = state.selectedPlanId;
    }

    if (!state.logDraft) {
      els.logStatus.textContent = plans.length ? "Choose a plan." : "Create a plan first.";
      els.logEditor.innerHTML = "";
      return;
    }

    els.logStatus.textContent = `Logging ${state.logDraft.planName}.`;
    els.logEditor.innerHTML = `
      <form class="workspace-panel plan-form" id="logForm">
        <div class="alert alert-error" id="logAlert"></div>
        <div class="log-meta">
          <label class="field">
            <span>Date</span>
            <input name="completedDate" type="date" value="${escapeAttribute(toDateInputText(state.logDraft.completedAt))}">
          </label>
          <label class="field">
            <span>Time</span>
            <input name="completedTime" type="time" value="${escapeAttribute(toTimeInputText(state.logDraft.completedAt))}">
          </label>
          <label class="field">
            <span>Workout notes</span>
            <textarea name="sessionNotes">${escapeHtml(state.logDraft.sessionNotes)}</textarea>
          </label>
        </div>
        <div class="log-exercise-list">
          ${state.logDraft.entries.map(renderLogEntry).join("")}
        </div>
        <div class="editor-actions">
          <button class="button" type="button" data-action="finish-log">Finish Workout</button>
          <button class="button button-secondary" type="button" data-action="cancel-log">Cancel</button>
        </div>
      </form>
    `;
  }

  function renderLogEntry(entry, index) {
    const exerciseKind = entry.exerciseKind || getExerciseKind(entry.exerciseId);
    return `
      <article class="exercise-log-card" data-log-entry-id="${escapeHtml(entry.id)}">
        <div class="editor-card-header">
          <h3>${index + 1}. ${escapeHtml(entry.exerciseName)}</h3>
          <button class="button button-secondary button-small" type="button" data-action="add-log-set">+ Set</button>
        </div>
        ${entry.exerciseNotes ? `<p class="exercise-note">${escapeHtml(entry.exerciseNotes)}</p>` : ""}
        ${renderSetText(entry.plannedSets, "Planned")}
        <div class="set-list">
          ${entry.loggedSets.length ? entry.loggedSets.map((set) => renderSetEditor(set, exerciseKind)).join("") : emptyState("No logged sets", "Add at least one completed set.")}
        </div>
        <label class="field">
          <span>Log notes</span>
          <textarea name="entryNotes">${escapeHtml(entry.notes)}</textarea>
        </label>
      </article>
    `;
  }

  function renderHistory() {
    const start = parseDateBoundary(state.history.fromDate, "start");
    const end = parseDateBoundary(state.history.toDate, "end");
    const sessions = [...state.data.sessions]
      .filter((session) => isWithinDateRange(session.completedAt, start, end))
      .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));
    els.historyFromDate.value = state.history.fromDate;
    els.historyToDate.value = state.history.toDate;
    els.historyCount.textContent = `${sessions.length} ${plural(sessions.length, "session", "sessions")} shown`;

    if (!sessions.length) {
      els.historyList.innerHTML = emptyState("No logged workouts", "Finish a workout to add one.");
      return;
    }

    els.historyList.innerHTML = sessions.map((session) => `
      <details class="history-card history-details">
        <summary class="history-card-header">
          <span class="summary-chevron" aria-hidden="true">${icon("chevronDown")}</span>
          <div>
            <strong>${escapeHtml(session.planName)}</strong>
            <div class="muted">${formatDateTime(session.completedAt)}</div>
          </div>
          <div class="history-summary-actions">
            <span class="status-chip">${session.entries.length} ${plural(session.entries.length, "exercise", "exercises")}</span>
            <button class="button button-danger button-icon" type="button" data-action="delete-session" data-session-id="${escapeHtml(session.id)}" aria-label="Delete log" title="Delete log">${icon("trash")}</button>
          </div>
        </summary>
        <div class="history-body">
          ${session.sessionNotes ? `<p class="muted">${escapeHtml(session.sessionNotes)}</p>` : ""}
          ${session.entries.map((entry) => `
            <div class="history-entry">
              <strong>${escapeHtml(entry.exerciseName)}</strong>
              ${renderSetPills(entry.loggedSets, "Logged")}
              ${entry.notes ? `<p class="muted">${escapeHtml(entry.notes)}</p>` : ""}
            </div>
          `).join("")}
        </div>
      </details>
    `).join("");
  }

  function renderAnalytics() {
    const exercises = getExercisesForAnalytics();
    const selectedId = exercises.some((exercise) => exercise.id === state.analytics.exerciseId)
      ? state.analytics.exerciseId
      : exercises[0]?.id || "";

    state.analytics.exerciseId = selectedId;
    state.analytics.metric = METRICS[state.analytics.metric] ? state.analytics.metric : "volume";
    const availableKinds = getAvailableSetKindsForExercise(selectedId);
    const metricKeys = Object.keys(METRICS);
    const enabledMetricKeys = metricKeys.filter((key) => isMetricAvailable(key, availableKinds));
    if (!enabledMetricKeys.includes(state.analytics.metric)) {
      state.analytics.metric = enabledMetricKeys[0] || metricKeys[0];
    }

    els.progressExerciseSelect.innerHTML = exercises.length
      ? exercises.map((exercise) => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(exercise.name)}</option>`).join("")
      : `<option value="">No exercises</option>`;
    els.progressExerciseSelect.value = selectedId;
    els.progressExerciseSelect.disabled = !exercises.length;
    els.progressMetricSelect.innerHTML = renderMetricOptions(availableKinds);
    els.progressMetricSelect.value = state.analytics.metric;
    els.progressMetricSelect.disabled = !exercises.length;
    els.progressFromDate.value = state.analytics.fromDate;
    els.progressToDate.value = state.analytics.toDate;
    els.progressFromDate.disabled = !exercises.length;
    els.progressToDate.disabled = !exercises.length;

    if (!exercises.length) {
      els.progressStatus.textContent = "Create exercises and log workouts first.";
      els.progressSummary.innerHTML = "";
      els.progressChart.innerHTML = emptyState("No data", "Analytics will appear after workouts are logged.");
      els.progressTable.innerHTML = "";
      return;
    }

    const allPoints = buildAnalyticsPoints(selectedId, state.analytics.fromDate, state.analytics.toDate);
    const metric = state.analytics.metric;
    const points = allPoints.filter((point) => point[metric] > 0);
    els.progressStatus.textContent = `${allPoints.length} logged ${plural(allPoints.length, "entry", "entries")} in range.`;
    renderAnalyticsSummary(points, metric);
    els.progressChart.innerHTML = points.length ? renderLineChart(points, metric) : emptyState("No metric data", METRICS[metric].empty);
    renderAnalyticsTable(allPoints, metric);
  }

  function renderAnalyticsSummary(points, metric) {
    const values = points.map((point) => point[metric]);
    const latest = values.at(-1) || 0;
    const best = values.length ? Math.max(...values) : 0;
    const first = values[0] || 0;
    const change = latest - first;

    els.progressSummary.innerHTML = [
      ["Data points", String(points.length)],
      ["Latest", formatMetricValue(latest, metric)],
      ["Best", formatMetricValue(best, metric)],
      ["Change", `${change >= 0 ? "+" : ""}${formatMetricValue(change, metric)}`]
    ].map(([label, value]) => `
      <div class="stat-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `).join("");
  }

  function renderAnalyticsTable(points, metric) {
    if (!points.length) {
      els.progressTable.innerHTML = "";
      return;
    }

    els.progressTable.innerHTML = points.slice().reverse().map((point) => `
      <div class="analytics-row">
        <strong>${escapeHtml(formatDate(point.completedAt))}</strong>
        <span>${escapeHtml(point.planName)} - ${escapeHtml(point.setsLabel)}</span>
        <span class="status-chip">${escapeHtml(formatMetricValue(point[metric], metric))}</span>
      </div>
    `).join("");
  }

  function renderBackup() {
    const activePlans = getActivePlans().length;
    const activeExercises = getActiveExercises().length;
    const sessions = state.data.sessions.length;
    els.backupStats.textContent = `${activeExercises} ${plural(activeExercises, "exercise", "exercises")}, ${activePlans} ${plural(activePlans, "plan", "plans")}, ${sessions} ${plural(sessions, "session", "sessions")}`;
    els.darkModeButton.textContent = state.darkMode ? "Light Mode" : "Dark Mode";
    els.aboutPanel.innerHTML = `
      <h3>About</h3>
      <p class="muted">App by Savutro.</p>
      <dl class="about-list">
        <div><dt>App Version</dt><dd>${escapeHtml(APP_VERSION)}</dd></div>
        <div><dt>Data Schema</dt><dd>v${SCHEMA_VERSION}</dd></div>
        <div><dt>Storage</dt><dd>Local storage</dd></div>
      </dl>
      <nav class="social-links" aria-label="Savutro links">
        ${SOCIAL_LINKS.map((link) => `
          <a href="${escapeAttribute(link.href)}" target="_blank" rel="noopener" aria-label="${escapeAttribute(link.label)}" title="${escapeAttribute(link.title || link.label)}">${icon(link.icon)}</a>
        `).join("")}
      </nav>
    `;
  }

  function handlePlanEditorClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }

    const action = button.dataset.action;
    if (button.closest("summary")) {
      event.preventDefault();
    }
    if (action === "go-exercises") {
      state.exerciseDraft = createBlankExerciseDraft();
      switchView("exercises", { skipCapture: true });
      return;
    }
    if (action === "add-plan-item") {
      addPlanItem();
      return;
    }
    if (action === "save-plan") {
      savePlan();
      return;
    }
    if (action === "archive-plan") {
      archivePlan();
      return;
    }
    if (action === "restore-plan") {
      restorePlan();
      return;
    }
    if (action === "delete-plan") {
      deletePlan();
      return;
    }

    const itemCard = button.closest("[data-plan-item-id]");
    if (!itemCard) {
      return;
    }

    state.planDraft = readPlanDraft();
    const item = state.planDraft.items.find((draftItem) => draftItem.id === itemCard.dataset.planItemId);
    if (!item) {
      return;
    }

    if (action === "add-set") {
      item.targetSets.push(createDefaultSet(getExerciseKind(item.exerciseId)));
    }
    if (action === "remove-set") {
      const setId = button.closest("[data-set-id]")?.dataset.setId;
      item.targetSets = item.targetSets.filter((set) => set.id !== setId);
    }
    if (action === "remove-plan-item") {
      state.planDraft.items = state.planDraft.items.filter((draftItem) => draftItem.id !== item.id);
      state.activePlanItemId = state.planDraft.items[0]?.id || null;
    }
    if (action === "move-item-up" || action === "move-item-down") {
      moveDraftItem(state.planDraft.items, item.id, action === "move-item-up" ? -1 : 1);
    }
    renderPlanEditor();
  }

  function handlePlanEditorChange(event) {
    if (!event.target.matches('select[name="exerciseId"]')) {
      return;
    }

    const itemCard = event.target.closest("[data-plan-item-id]");
    state.planDraft = readPlanDraft();
    const item = state.planDraft.items.find((draftItem) => draftItem.id === itemCard?.dataset.planItemId);
    if (item) {
      state.activePlanItemId = item.id;
      item.targetSets = item.targetSets.map((set) => normalizeSetForKind(set, getExerciseKind(item.exerciseId)));
    }
    renderPlanEditor();
  }

  function handlePlanItemToggle(event) {
    const details = event.target.closest?.("[data-plan-item-id]");
    if (!details || !details.open) {
      return;
    }
    state.activePlanItemId = details.dataset.planItemId;
    Array.from(els.planEditor.querySelectorAll("[data-plan-item-id]")).forEach((item) => {
      if (item !== details) {
        item.open = false;
      }
    });
  }

  function handleLogEditorClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }

    const action = button.dataset.action;
    if (action === "finish-log") {
      finishWorkoutLog();
      return;
    }
    if (action === "cancel-log") {
      state.logDraft = null;
      renderLog();
      showToast("Workout log cancelled.");
      return;
    }

    state.logDraft = readLogDraft();
    const entryCard = button.closest("[data-log-entry-id]");
    const entry = state.logDraft?.entries.find((draftEntry) => draftEntry.id === entryCard?.dataset.logEntryId);
    if (!entry) {
      return;
    }

    if (action === "add-log-set") {
      entry.loggedSets.push(createDefaultSet(entry.exerciseKind || getExerciseKind(entry.exerciseId)));
    }
    if (action === "remove-set") {
      const setId = button.closest("[data-set-id]")?.dataset.setId;
      entry.loggedSets = entry.loggedSets.filter((set) => set.id !== setId);
    }
    renderLog();
  }

  function handleHistoryClick(event) {
    const button = event.target.closest("[data-action='delete-session']");
    if (!button) {
      return;
    }
    event.preventDefault();
    deleteSession(button.dataset.sessionId);
  }

  async function saveExercise() {
    const draft = readExerciseDraft();
    const error = validateExerciseDraft(draft);
    if (error) {
      showAlert("exerciseAlert", error);
      showToast(error, "error");
      return;
    }

    const now = new Date().toISOString();
    const existing = draft.id ? getExercise(draft.id) : null;
    if (existing && existing.kind !== draft.kind && exerciseHasSetUsage(existing.id)) {
      const confirmed = await confirmAction({
        title: "Change exercise type?",
        message: "This will reset incompatible sets in plans and logs for this exercise.",
        confirmText: "Change Type",
        danger: false
      });
      if (!confirmed) {
        return;
      }
    }
    const savedExercise = {
      id: existing?.id || createId(),
      name: draft.name.trim(),
      kind: draft.kind,
      notes: draft.notes.trim(),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      archivedAt: null
    };

    if (existing) {
      state.data.exercises = state.data.exercises.map((exercise) => exercise.id === savedExercise.id ? savedExercise : exercise);
    } else {
      state.data.exercises.push(savedExercise);
    }

    alignSetsForExercise(savedExercise.id, savedExercise.kind);

    state.selectedExerciseId = savedExercise.id;
    state.exerciseDraft = exerciseToDraft(savedExercise);
    state.analytics.exerciseId ||= savedExercise.id;
    persist();
    render();
    showToast("Exercise saved.");
  }

  async function deleteExercise() {
    const exercise = state.selectedExerciseId ? getExercise(state.selectedExerciseId) : null;
    if (!exercise) {
      return;
    }

    const plansUsingExercise = getPlansUsingExercise(exercise.id);
    if (plansUsingExercise.length > 0) {
      const message = `Remove this exercise from ${plansUsingExercise.length} ${plural(plansUsingExercise.length, "plan", "plans")} before deleting it.`;
      showToast(message, "error");
      return;
    }

    const logUsage = getLogUsage(exercise.id);
    if (logUsage.entryCount > 0) {
      const confirmed = await confirmAction({
        title: "Delete exercise?",
        message: `Delete "${exercise.name}" and remove ${logUsage.entryCount} logged ${plural(logUsage.entryCount, "entry", "entries")} from ${logUsage.sessionCount} ${plural(logUsage.sessionCount, "session", "sessions")}?`,
        confirmText: "Delete Exercise",
        danger: true
      });
      if (!confirmed) {
        return;
      }
      removeExerciseFromLogs(exercise.id);
    } else {
      const confirmed = await confirmAction({
        title: "Delete exercise?",
        message: `Delete "${exercise.name}"?`,
        confirmText: "Delete Exercise",
        danger: true
      });
      if (!confirmed) {
        return;
      }
    }

    state.data.exercises = state.data.exercises.filter((item) => item.id !== exercise.id);
    state.selectedExerciseId = firstActiveExerciseId();
    state.exerciseDraft = state.selectedExerciseId
      ? exerciseToDraft(getExercise(state.selectedExerciseId))
      : createBlankExerciseDraft();
    persist();
    render();
    showToast("Exercise deleted.");
  }

  function addPlanItem() {
    const firstExercise = getActiveExercises()[0];
    if (!firstExercise) {
      switchView("exercises", { skipCapture: true });
      showToast("Create an exercise before building a plan.", "error");
      return;
    }

    state.planDraft = readPlanDraft();
    const item = {
      id: createId(),
      exerciseId: firstExercise.id,
      notes: "",
      targetSets: [createDefaultSet(firstExercise.kind)]
    };
    state.planDraft.items.push(item);
    state.activePlanItemId = item.id;
    renderPlanEditor();
  }

  function savePlan() {
    const draft = readPlanDraft();
    const existing = draft.id ? getPlan(draft.id) : null;
    if (existing?.archivedAt) {
      showToast("Archived plans cannot be edited. Restore it first.", "error");
      return;
    }
    const error = validatePlanDraft(draft);
    if (error) {
      showAlert("planAlert", error);
      showToast(error, "error");
      return;
    }

    const now = new Date().toISOString();
    const savedPlan = {
      id: existing?.id || createId(),
      name: draft.name.trim(),
      notes: draft.notes.trim(),
      items: draft.items.map((item, index) => ({
        id: item.id || createId(),
        exerciseId: item.exerciseId,
        notes: "",
        targetSets: normalizeSetsForKind(item.targetSets, getExerciseKind(item.exerciseId)),
        sortIndex: index
      })),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      archivedAt: existing?.archivedAt || null
    };

    if (existing) {
      state.data.plans = state.data.plans.map((plan) => plan.id === savedPlan.id ? savedPlan : plan);
    } else {
      state.data.plans.push(savedPlan);
    }

    state.selectedPlanId = savedPlan.id;
    state.planDraft = planToDraft(savedPlan);
    persist();
    render();
    showToast("Plan saved.");
  }

  async function archivePlan() {
    const plan = state.selectedPlanId ? getPlan(state.selectedPlanId) : null;
    if (!plan) {
      return;
    }
    const confirmed = await confirmAction({
      title: "Archive plan?",
      message: `Archive "${plan.name}"? Logged sessions stay in history.`,
      confirmText: "Archive Plan",
      danger: false
    });
    if (!confirmed) {
      return;
    }

    plan.archivedAt = new Date().toISOString();
    plan.updatedAt = plan.archivedAt;
    state.planMode = "archived";
    state.selectedPlanId = plan.id;
    state.planDraft = planToDraft(plan);
    state.logDraft = null;
    persist();
    render();
    showToast("Plan archived.");
  }

  function restorePlan() {
    const plan = state.selectedPlanId ? getPlan(state.selectedPlanId) : null;
    if (!plan || !plan.archivedAt) {
      return;
    }

    plan.archivedAt = null;
    plan.updatedAt = new Date().toISOString();
    state.planMode = "active";
    state.selectedPlanId = plan.id;
    state.planDraft = planToDraft(plan);
    persist();
    render();
    showToast("Plan restored.");
  }

  async function deletePlan() {
    const plan = state.selectedPlanId ? getPlan(state.selectedPlanId) : null;
    if (!plan) {
      return;
    }
    const confirmed = await confirmAction({
      title: "Delete plan?",
      message: `Delete "${plan.name}"? Logged sessions stay in history.`,
      confirmText: "Delete Plan",
      danger: true
    });
    if (!confirmed) {
      return;
    }

    state.data.plans = state.data.plans.filter((item) => item.id !== plan.id);
    state.selectedPlanId = firstPlanIdByMode(state.planMode);
    state.planDraft = state.selectedPlanId ? planToDraft(getPlan(state.selectedPlanId)) : createBlankPlanDraft();
    state.logDraft = state.logDraft?.planId === plan.id ? null : state.logDraft;
    persist();
    render();
    showToast("Plan deleted.");
  }

  async function deleteSession(sessionId) {
    const session = state.data.sessions.find((item) => item.id === sessionId);
    if (!session) {
      return;
    }
    const confirmed = await confirmAction({
      title: "Delete log?",
      message: `Delete log "${session.planName}" from ${formatDateTime(session.completedAt)}?`,
      confirmText: "Delete Log",
      danger: true
    });
    if (!confirmed) {
      return;
    }

    state.data.sessions = state.data.sessions.filter((item) => item.id !== sessionId);
    persist();
    render();
    showToast("Log deleted.");
  }

  function startWorkoutLog() {
    const plan = getActivePlan(els.logPlanSelect.value);
    if (!plan) {
      showToast("Create a plan before logging.", "error");
      return;
    }
    if (!plan.items.length) {
      showToast("Add exercises to this plan before logging.", "error");
      return;
    }

    state.logDraft = createLogDraft(plan);
    state.currentView = "log";
    rememberCurrentView();
    render();
    showToast("Workout started.");
  }

  function finishWorkoutLog() {
    const draft = readLogDraft();
    const error = validateLogDraft(draft);
    if (error) {
      showAlert("logAlert", error);
      showToast(error, "error");
      return;
    }

    const plan = getActivePlan(draft.planId);
    if (!plan) {
      showToast("The selected plan is no longer available.", "error");
      state.logDraft = null;
      renderLog();
      return;
    }

    const now = new Date().toISOString();
    const session = {
      id: draft.id,
      planId: plan.id,
      planName: plan.name,
      startedAt: draft.startedAt,
      completedAt: draft.completedAt,
      sessionNotes: draft.sessionNotes.trim(),
      createdAt: now,
      sourcePlanUpdatedAt: plan.updatedAt,
      entries: draft.entries.map((entry) => ({
        id: entry.id,
        planItemId: entry.planItemId,
        exerciseId: entry.exerciseId,
        exerciseName: entry.exerciseName,
        exerciseKind: entry.exerciseKind || getExerciseKind(entry.exerciseId),
        exerciseNotes: entry.exerciseNotes,
        notes: entry.notes.trim(),
        plannedSets: normalizeSetsForKind(entry.plannedSets, entry.exerciseKind || getExerciseKind(entry.exerciseId)),
        loggedSets: normalizeSetsForKind(entry.loggedSets, entry.exerciseKind || getExerciseKind(entry.exerciseId))
      }))
    };

    session.entries.forEach((entry) => {
      const planItem = plan.items.find((item) => item.id === entry.planItemId);
      if (planItem) {
        planItem.targetSets = cloneSetsForKind(entry.loggedSets, getExerciseKind(entry.exerciseId));
      }
    });
    plan.updatedAt = now;

    state.data.sessions.push(session);
    state.logDraft = null;
    state.selectedPlanId = plan.id;
    state.planDraft = planToDraft(plan);
    state.analytics.exerciseId = session.entries[0]?.exerciseId || state.analytics.exerciseId;
    persist();
    state.currentView = "history";
    rememberCurrentView();
    render();
    showToast("Workout logged and plan updated.");
  }

  function readExerciseDraft() {
    const form = document.getElementById("exerciseForm");
    if (!form) {
      return state.exerciseDraft || createBlankExerciseDraft();
    }
    return {
      id: state.exerciseDraft?.id || null,
      name: form.elements.exerciseName.value.trim(),
      kind: normalizeExerciseKind(form.elements.exerciseKind.value) || "strength",
      notes: form.elements.exerciseNotes.value.trim()
    };
  }

  function readPlanDraft() {
    const form = document.getElementById("planForm");
    if (!form) {
      return state.planDraft || createBlankPlanDraft();
    }

    return {
      id: state.planDraft?.id || null,
      name: form.elements.planName.value.trim(),
      notes: form.elements.planNotes.value.trim(),
      items: Array.from(form.querySelectorAll("[data-plan-item-id]")).map((card) => {
        const exerciseId = card.querySelector('[name="exerciseId"]').value;
        return {
          id: card.dataset.planItemId || createId(),
          exerciseId,
          notes: "",
          targetSets: readSetEditors(card, getExerciseKind(exerciseId))
        };
      })
    };
  }

  function readLogDraft() {
    const form = document.getElementById("logForm");
    if (!form || !state.logDraft) {
      return state.logDraft;
    }

    const completedAt = combineDateAndTime(form.elements.completedDate.value, form.elements.completedTime.value);
    return {
      ...state.logDraft,
      completedAt: completedAt || state.logDraft.completedAt || new Date().toISOString(),
      dateInvalid: !completedAt,
      sessionNotes: form.elements.sessionNotes.value.trim(),
      entries: Array.from(form.querySelectorAll("[data-log-entry-id]")).map((card) => {
        const existing = state.logDraft.entries.find((entry) => entry.id === card.dataset.logEntryId);
        return {
          ...existing,
          notes: card.querySelector('[name="entryNotes"]').value.trim(),
          loggedSets: readSetEditors(card, existing?.exerciseKind || getExerciseKind(existing?.exerciseId))
        };
      })
    };
  }

  function readSetEditors(container, kind = "strength") {
    const setKind = normalizeExerciseKind(kind) || "strength";
    return Array.from(container.querySelectorAll(".set-editor")).map((row) => {
      if (row.dataset.kind && row.dataset.kind !== setKind) {
        return createDefaultSet(setKind, row.dataset.setId || createId());
      }
      return {
        id: row.dataset.setId || createId(),
        kind: setKind,
        reps: setKind === "strength" ? numberOrNull(row.querySelector('[name="setReps"]')?.value) : null,
        weight: setKind === "strength" ? numberOrNull(row.querySelector('[name="setWeight"]')?.value) : null,
        weightUnit: setKind === "strength" ? normalizeWeightUnit(row.querySelector('[name="setWeightUnit"]')?.value) : null,
        duration: setKind === "duration" ? numberOrNull(row.querySelector('[name="setDuration"]')?.value) : null,
        durationUnit: setKind === "duration" ? normalizeDurationUnit(row.querySelector('[name="setDurationUnit"]')?.value) : null
      };
    });
  }

  function validateExerciseDraft(draft) {
    if (!draft.name) {
      return "Exercise name is required.";
    }

    const duplicate = state.data.exercises.find((exercise) => (
      !exercise.archivedAt
      && exercise.id !== draft.id
      && exercise.name.toLowerCase() === draft.name.toLowerCase()
    ));
    if (duplicate) {
      return "An active exercise with this name already exists.";
    }
    return "";
  }

  function validatePlanDraft(draft) {
    if (!draft.name) {
      return "Plan name is required.";
    }
    if (!draft.items.length) {
      return "Add at least one exercise to the plan.";
    }

    for (const [index, item] of draft.items.entries()) {
      const exercise = getExercise(item.exerciseId);
      if (!exercise || exercise.archivedAt) {
        return `Choose an active exercise for row ${index + 1}.`;
      }
      const setError = validateSetList(item.targetSets, `${exercise.name} target`);
      if (setError) {
        return setError;
      }
    }
    return "";
  }

  function validateLogDraft(draft) {
    if (!draft || !draft.entries.length) {
      return "Start a workout before saving.";
    }
    if (draft.dateInvalid) {
      return "Enter a valid workout date.";
    }
    for (const entry of draft.entries) {
      const setError = validateSetList(entry.loggedSets, entry.exerciseName);
      if (setError) {
        return setError;
      }
    }
    return "";
  }

  function validateSetList(sets, label) {
    if (!sets.length) {
      return `${label} needs at least one set.`;
    }
    for (const [index, set] of sets.entries()) {
      const issue = validateSet(set);
      if (issue) {
        return `${label}, set ${index + 1}: ${issue}`;
      }
    }
    return "";
  }

  function validateSet(set) {
    if (set.kind === "duration") {
      if (!isPositiveNumber(set.duration)) {
        return "time must be greater than 0.";
      }
      return "";
    }
    if (!isPositiveNumber(set.reps)) {
      return "reps must be greater than 0.";
    }
    if (!isNonNegativeNumber(set.weight)) {
      return "weight must be 0 or greater.";
    }
    return "";
  }

  function createLogDraft(plan) {
    const now = new Date().toISOString();
    return {
      id: createId(),
      planId: plan.id,
      planName: plan.name,
      startedAt: now,
      completedAt: now,
      sessionNotes: "",
      entries: plan.items
        .slice()
        .sort((a, b) => a.sortIndex - b.sortIndex)
        .map((item) => {
          const exercise = getExercise(item.exerciseId);
          const exerciseKind = getExerciseKind(item.exerciseId);
          return {
            id: createId(),
            planItemId: item.id,
            exerciseId: item.exerciseId,
            exerciseName: exercise?.name || "Exercise",
            exerciseKind,
            exerciseNotes: exercise?.notes || "",
            notes: "",
            plannedSets: cloneSetsForKind(item.targetSets, exerciseKind),
            loggedSets: cloneSetsForKind(item.targetSets, exerciseKind)
          };
        })
    };
  }

  function createBlankExerciseDraft() {
    return { id: null, name: "", kind: "strength", notes: "" };
  }

  function createBlankPlanDraft() {
    return { id: null, name: "", notes: "", items: [] };
  }

  function createDefaultSet(kind = "strength", id = createId()) {
    if (kind === "duration") {
      return {
        id,
        kind: "duration",
        reps: null,
        weight: null,
        weightUnit: null,
        duration: 10,
        durationUnit: "min"
      };
    }
    return {
      id,
      kind: "strength",
      reps: 10,
      weight: 20,
      weightUnit: "kg",
      duration: null,
      durationUnit: null
    };
  }

  function exerciseToDraft(exercise) {
    if (!exercise) {
      return createBlankExerciseDraft();
    }
    return {
      id: exercise.id,
      name: exercise.name,
      kind: getExerciseKind(exercise.id),
      notes: exercise.notes
    };
  }

  function planToDraft(plan) {
    if (!plan) {
      return createBlankPlanDraft();
    }
    return {
      id: plan.id,
      name: plan.name,
      notes: plan.notes,
      items: plan.items
        .slice()
        .sort((a, b) => a.sortIndex - b.sortIndex)
        .map((item) => ({
          id: item.id,
          exerciseId: item.exerciseId,
          notes: "",
          targetSets: cloneSetsForKind(item.targetSets, getExerciseKind(item.exerciseId))
        }))
    };
  }

  function createEmptyData() {
    const now = new Date().toISOString();
    return {
      schemaVersion: SCHEMA_VERSION,
      createdAt: now,
      updatedAt: now,
      exercises: [],
      plans: [],
      sessions: []
    };
  }

  function loadData() {
    const stored = readLocalStorage(STORAGE_KEY)
      || PREVIOUS_STORAGE_KEYS.map(readLocalStorage).find(Boolean);
    if (!stored) {
      return createEmptyData();
    }

    try {
      return normalizeImportedData(JSON.parse(stored));
    } catch {
      return createEmptyData();
    }
  }

  function readLocalStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function readSavedView() {
    const savedView = readLocalStorage(VIEW_STORAGE_KEY);
    return VIEW_NAMES.includes(savedView) ? savedView : "exercises";
  }

  function ensureCurrentView() {
    if (!VIEW_NAMES.includes(state.currentView)) {
      state.currentView = "exercises";
    }
  }

  function rememberCurrentView() {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, state.currentView);
    } catch {
      // The app still works if localStorage is unavailable.
    }
  }

  function persist() {
    state.data.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  }

  function exportBackup() {
    const exportedAt = new Date().toISOString();
    const payload = {
      type: BACKUP_TYPE,
      schemaVersion: SCHEMA_VERSION,
      exportedAt,
      data: state.data
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `workout-tracker-backup-${exportedAt.slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Backup exported.");
  }

  function handleImport(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const importedData = normalizeImportedData(parsed);
        const confirmed = await confirmAction({
          title: "Import backup?",
          message: "Replace local data with this backup?",
          confirmText: "Import Backup",
          danger: false
        });
        if (!confirmed) {
          return;
        }
        state.data = importedData;
        initializeSelections();
        state.logDraft = null;
        persist();
        render();
        showToast("Backup imported.");
      } catch (error) {
        showToast(error.message || "Import failed.", "error");
      }
    };
    reader.readAsText(file);
  }

  // Migration keeps old backups importable while schema v4 becomes the app shape.
  function normalizeImportedData(parsed) {
    const imported = parsed?.type === BACKUP_TYPE ? parsed.data : parsed;
    const version = Number(imported?.schemaVersion || parsed?.schemaVersion);
    if (!imported || ![1, 2, 3, 4].includes(version)) {
      throw new Error("Unsupported backup schema version.");
    }
    if (!Array.isArray(imported.exercises) || !Array.isArray(imported.plans) || !Array.isArray(imported.sessions)) {
      throw new Error("Backup is missing required collections.");
    }

    const data = {
      schemaVersion: SCHEMA_VERSION,
      createdAt: imported.createdAt || new Date().toISOString(),
      updatedAt: imported.updatedAt || new Date().toISOString(),
      exercises: imported.exercises.map(normalizeExercise),
      plans: imported.plans.map(normalizePlan),
      sessions: imported.sessions.map(normalizeSession)
    };
    backfillExerciseKinds(data);
    alignAllSetsToExerciseKinds(data);
    return data;
  }

  function normalizeExercise(exercise) {
    return {
      id: String(exercise.id || createId()),
      name: String(exercise.name || "Exercise"),
      kind: normalizeExerciseKind(exercise.kind || exercise.type || exercise.setKind),
      notes: String(exercise.notes || exercise.defaultNotes || ""),
      createdAt: exercise.createdAt || new Date().toISOString(),
      updatedAt: exercise.updatedAt || new Date().toISOString(),
      archivedAt: exercise.archivedAt || null
    };
  }

  function normalizePlan(plan) {
    return {
      id: String(plan.id || createId()),
      name: String(plan.name || "Plan"),
      notes: String(plan.notes || ""),
      items: Array.isArray(plan.items) ? plan.items.map((item, index) => ({
        id: String(item.id || createId()),
        exerciseId: String(item.exerciseId || ""),
        notes: "",
        targetSets: normalizeSets(item.targetSets || item.sets || []),
        sortIndex: Number.isFinite(Number(item.sortIndex)) ? Number(item.sortIndex) : index
      })) : [],
      createdAt: plan.createdAt || new Date().toISOString(),
      updatedAt: plan.updatedAt || new Date().toISOString(),
      archivedAt: plan.archivedAt || null
    };
  }

  function normalizeSession(session) {
    return {
      id: String(session.id || createId()),
      planId: String(session.planId || ""),
      planName: String(session.planName || "Plan"),
      startedAt: session.startedAt || session.completedAt || new Date().toISOString(),
      completedAt: session.completedAt || new Date().toISOString(),
      sessionNotes: String(session.sessionNotes || ""),
      createdAt: session.createdAt || new Date().toISOString(),
      sourcePlanUpdatedAt: session.sourcePlanUpdatedAt || null,
      entries: Array.isArray(session.entries) ? session.entries.map((entry) => ({
        id: String(entry.id || createId()),
        planItemId: String(entry.planItemId || ""),
        exerciseId: String(entry.exerciseId || ""),
        exerciseName: String(entry.exerciseName || "Exercise"),
        exerciseKind: normalizeExerciseKind(entry.exerciseKind || entry.kind),
        exerciseNotes: String(entry.exerciseNotes || ""),
        notes: String(entry.notes || ""),
        plannedSets: normalizeSets(entry.plannedSets || []),
        loggedSets: normalizeSets(entry.loggedSets || entry.sets || [])
      })) : []
    };
  }

  function normalizeSets(sets) {
    if (!Array.isArray(sets)) {
      return [];
    }
    return sets.map(normalizeSet).filter(Boolean);
  }

  function normalizeSetsForKind(sets, kind) {
    return normalizeSets(sets).map((set) => normalizeSetForKind(set, kind)).filter(Boolean);
  }

  function normalizeSet(set) {
    const source = set?.raw && !("weight" in set) && !("duration" in set)
      ? parseLegacySet(set.raw)
      : set;
    if (!source) {
      return null;
    }

    const kind = source.kind === "duration" ? "duration" : "strength";
    if (kind === "duration") {
      return {
        id: String(source.id || createId()),
        kind,
        reps: null,
        weight: null,
        weightUnit: null,
        duration: numberOrNull(source.duration),
        durationUnit: normalizeDurationUnit(source.durationUnit || "min")
      };
    }

    return {
      id: String(source.id || createId()),
      kind: "strength",
      reps: numberOrNull(source.reps),
      weight: numberOrNull(source.weight ?? source.load),
      weightUnit: normalizeWeightUnit(source.weightUnit || source.loadUnit || "kg"),
      duration: null,
      durationUnit: null
    };
  }

  function normalizeSetForKind(set, kind) {
    const setKind = normalizeExerciseKind(kind) || "strength";
    const normalized = normalizeSet(set);
    if (!normalized) {
      return createDefaultSet(setKind);
    }
    if (normalized.kind === setKind) {
      return normalized;
    }
    return createDefaultSet(setKind, normalized.id);
  }

  function normalizeExerciseKind(kind) {
    const value = String(kind || "").toLowerCase().replace(/[\s_-]/g, "");
    return value === "duration" || value === "time" ? "duration"
      : value === "strength" || value === "repsweight" || value === "repsxweight" ? "strength"
        : null;
  }

  function backfillExerciseKinds(data) {
    data.exercises.forEach((exercise) => {
      exercise.kind ||= inferExerciseKind(data, exercise.id);
    });
  }

  function inferExerciseKind(data, exerciseId) {
    const counts = { strength: 0, duration: 0 };
    data.plans.forEach((plan) => {
      plan.items
        .filter((item) => item.exerciseId === exerciseId)
        .flatMap((item) => item.targetSets)
        .forEach((set) => {
          const normalized = normalizeSet(set);
          if (normalized) {
            counts[normalized.kind] += 1;
          }
        });
    });
    data.sessions.forEach((session) => {
      session.entries
        .filter((entry) => entry.exerciseId === exerciseId)
        .flatMap((entry) => [...entry.plannedSets, ...entry.loggedSets])
        .forEach((set) => {
          const normalized = normalizeSet(set);
          if (normalized) {
            counts[normalized.kind] += 1;
          }
        });
    });
    return counts.duration > counts.strength ? "duration" : "strength";
  }

  function alignAllSetsToExerciseKinds(data) {
    data.plans.forEach((plan) => {
      plan.items.forEach((item) => {
        const exercise = data.exercises.find((candidate) => candidate.id === item.exerciseId);
        item.targetSets = normalizeSetsForKind(item.targetSets, exercise?.kind || "strength");
      });
    });
    data.sessions.forEach((session) => {
      session.entries.forEach((entry) => {
        const exercise = data.exercises.find((candidate) => candidate.id === entry.exerciseId);
        const kind = exercise?.kind || entry.exerciseKind || "strength";
        entry.exerciseKind = kind;
        entry.plannedSets = normalizeSetsForKind(entry.plannedSets, kind);
        entry.loggedSets = normalizeSetsForKind(entry.loggedSets, kind);
      });
    });
  }

  function parseLegacySet(rawText) {
    const raw = String(rawText || "").trim();
    const strength = raw.match(/^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(kg|kgs|lb|lbs)?$/i);
    if (strength) {
      return {
        kind: "strength",
        reps: Number(strength[1]),
        weight: Number(strength[2]),
        weightUnit: normalizeWeightUnit(strength[3] || "kg")
      };
    }

    const duration = raw.match(/^(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)$/i);
    if (duration) {
      return {
        kind: "duration",
        duration: Number(duration[1]),
        durationUnit: normalizeDurationUnit(duration[2])
      };
    }

    const reps = raw.match(/^(\d+(?:\.\d+)?)\s*(reps|rep)?$/i);
    if (reps) {
      return {
        kind: "strength",
        reps: Number(reps[1]),
        weight: 0,
        weightUnit: "kg"
      };
    }
    return null;
  }

  function getActiveExercises() {
    return state.data.exercises
      .filter((exercise) => !exercise.archivedAt)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function getExercisesForAnalytics() {
    const sessionExerciseIds = new Set();
    state.data.sessions.forEach((session) => {
      session.entries.forEach((entry) => sessionExerciseIds.add(entry.exerciseId));
    });

    return state.data.exercises
      .filter((exercise) => !exercise.archivedAt || sessionExerciseIds.has(exercise.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function getAvailableSetKindsForExercise(exerciseId) {
    const exercise = getExercise(exerciseId);
    if (exercise?.kind) {
      return {
        strength: exercise.kind === "strength",
        duration: exercise.kind === "duration"
      };
    }

    const kinds = { strength: false, duration: false };
    if (!exerciseId) {
      return kinds;
    }

    state.data.plans.forEach((plan) => {
      plan.items
        .filter((item) => item.exerciseId === exerciseId)
        .flatMap((item) => item.targetSets)
        .forEach((set) => markSetKind(kinds, set));
    });

    state.data.sessions.forEach((session) => {
      session.entries
        .filter((entry) => entry.exerciseId === exerciseId)
        .flatMap((entry) => [...entry.plannedSets, ...entry.loggedSets])
        .forEach((set) => markSetKind(kinds, set));
    });

    return kinds;
  }

  function markSetKind(kinds, set) {
    const normalized = normalizeSet(set);
    if (!normalized) {
      return;
    }
    kinds[normalized.kind === "duration" ? "duration" : "strength"] = true;
  }

  function isMetricAvailable(metric, availableKinds) {
    if (!availableKinds.strength && !availableKinds.duration) {
      return true;
    }
    return Boolean(availableKinds[METRICS[metric].setKind]);
  }

  function renderMetricOptions(availableKinds) {
    return Object.entries(METRICS).map(([key, metric]) => {
      const disabled = isMetricAvailable(key, availableKinds) ? "" : "disabled";
      return `<option value="${escapeHtml(key)}" ${disabled}>${escapeHtml(metric.label)}</option>`;
    }).join("");
  }

  function getActivePlans() {
    return state.data.plans
      .filter((plan) => !plan.archivedAt)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function getArchivedPlans() {
    return state.data.plans
      .filter((plan) => plan.archivedAt)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function getPlansByMode(mode) {
    return mode === "archived" ? getArchivedPlans() : getActivePlans();
  }

  function getExercise(id) {
    return state.data.exercises.find((exercise) => exercise.id === id) || null;
  }

  function getExerciseKind(exerciseId) {
    return getExercise(exerciseId)?.kind || "strength";
  }

  function getPlan(id) {
    return state.data.plans.find((plan) => plan.id === id) || null;
  }

  function getActivePlan(id) {
    const plan = getPlan(id);
    return plan && !plan.archivedAt ? plan : null;
  }

  function firstActiveExerciseId() {
    return getActiveExercises()[0]?.id || null;
  }

  function firstPlanIdByMode(mode) {
    return getPlansByMode(mode)[0]?.id || null;
  }

  function firstExerciseIdWithSessions() {
    return state.data.sessions.flatMap((session) => session.entries)[0]?.exerciseId || null;
  }

  function countActivePlanUsage(exerciseId) {
    return getActivePlans().filter((plan) => plan.items.some((item) => item.exerciseId === exerciseId)).length;
  }

  function getPlansUsingExercise(exerciseId) {
    return state.data.plans.filter((plan) => plan.items.some((item) => item.exerciseId === exerciseId));
  }

  function getLogUsage(exerciseId) {
    const sessionCount = state.data.sessions.filter((session) => (
      session.entries.some((entry) => entry.exerciseId === exerciseId)
    )).length;
    const entryCount = state.data.sessions.reduce((total, session) => (
      total + session.entries.filter((entry) => entry.exerciseId === exerciseId).length
    ), 0);
    return { entryCount, sessionCount };
  }

  function removeExerciseFromLogs(exerciseId) {
    state.data.sessions = state.data.sessions
      .map((session) => ({
        ...session,
        entries: session.entries.filter((entry) => entry.exerciseId !== exerciseId)
      }))
      .filter((session) => session.entries.length > 0);
  }

  function exerciseHasSetUsage(exerciseId) {
    return state.data.plans.some((plan) => (
      plan.items.some((item) => item.exerciseId === exerciseId && item.targetSets.length > 0)
    )) || state.data.sessions.some((session) => (
      session.entries.some((entry) => (
        entry.exerciseId === exerciseId
        && (entry.plannedSets.length > 0 || entry.loggedSets.length > 0)
      ))
    ));
  }

  function alignSetsForExercise(exerciseId, kind) {
    state.data.plans.forEach((plan) => {
      plan.items.forEach((item) => {
        if (item.exerciseId === exerciseId) {
          item.targetSets = normalizeSetsForKind(item.targetSets, kind);
        }
      });
    });
    state.data.sessions.forEach((session) => {
      session.entries.forEach((entry) => {
        if (entry.exerciseId === exerciseId) {
          entry.exerciseKind = kind;
          entry.plannedSets = normalizeSetsForKind(entry.plannedSets, kind);
          entry.loggedSets = normalizeSetsForKind(entry.loggedSets, kind);
        }
      });
    });
  }

  function filterExercises(exercises, query) {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) {
      return exercises;
    }
    return exercises.filter((exercise) => (
      exercise.name.toLowerCase().includes(trimmedQuery)
      || exercise.notes.toLowerCase().includes(trimmedQuery)
    ));
  }

  function renderExerciseOptions(selectedId) {
    const options = getActiveExercises();
    const current = selectedId ? getExercise(selectedId) : null;
    if (current?.archivedAt && !options.some((exercise) => exercise.id === current.id)) {
      options.push(current);
    }

    return [
      `<option value="">Choose exercise</option>`,
      ...options.map((exercise) => `<option value="${escapeHtml(exercise.id)}" ${exercise.id === selectedId ? "selected" : ""}>${escapeHtml(exercise.name)}${exercise.archivedAt ? " (archived)" : ""}</option>`)
    ].join("");
  }

  function moveDraftItem(items, itemId, direction) {
    const index = items.findIndex((item) => item.id === itemId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= items.length) {
      return;
    }
    const [item] = items.splice(index, 1);
    items.splice(nextIndex, 0, item);
  }

  function cloneSets(sets) {
    return normalizeSets(sets).map((set) => ({ ...set }));
  }

  function cloneSetsForKind(sets, kind) {
    return normalizeSetsForKind(sets, kind).map((set) => ({ ...set }));
  }

  function buildAnalyticsPoints(exerciseId, fromDate, toDate) {
    const start = parseDateBoundary(fromDate, "start");
    const end = parseDateBoundary(toDate, "end");

    return state.data.sessions
      .flatMap((session) => session.entries
        .filter((entry) => entry.exerciseId === exerciseId)
        .map((entry) => {
          const summary = summarizeSets(entry.loggedSets);
          return {
            id: entry.id,
            completedAt: session.completedAt,
            planName: session.planName,
            setsLabel: entry.loggedSets.map(formatSet).join(", "),
            volume: summary.volumeKg,
            bestWeight: summary.bestWeightKg,
            reps: summary.reps,
            duration: summary.durationSeconds / 60
          };
        }))
      .filter((point) => {
        const date = new Date(point.completedAt);
        return (!start || date >= start) && (!end || date <= end);
      })
      .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
  }

  function isWithinDateRange(value, start, end) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return false;
    }
    return (!start || date >= start) && (!end || date <= end);
  }

  function summarizeSets(sets) {
    return normalizeSets(sets).reduce((summary, set) => {
      if (set.kind === "duration") {
        summary.durationSeconds += toSeconds(set);
        return summary;
      }

      const weightKg = toKg(set.weight || 0, set.weightUnit);
      summary.reps += set.reps || 0;
      summary.volumeKg += (set.reps || 0) * weightKg;
      summary.bestWeightKg = Math.max(summary.bestWeightKg, weightKg);
      return summary;
    }, {
      reps: 0,
      volumeKg: 0,
      bestWeightKg: 0,
      durationSeconds: 0
    });
  }

  function renderLineChart(points, metric) {
    const width = 620;
    const height = 280;
    const pad = { top: 24, right: 22, bottom: 44, left: 58 };
    const chartWidth = width - pad.left - pad.right;
    const chartHeight = height - pad.top - pad.bottom;
    const values = points.map((point) => point[metric]);
    const maxValue = Math.max(...values, 1);
    const yMax = maxValue * 1.15;
    const coordinates = points.map((point, index) => {
      const x = points.length === 1
        ? pad.left + chartWidth / 2
        : pad.left + (index / (points.length - 1)) * chartWidth;
      const y = pad.top + chartHeight - (point[metric] / yMax) * chartHeight;
      return { x, y, point };
    });

    const path = coordinates.map((coordinate) => `${round(coordinate.x)},${round(coordinate.y)}`).join(" ");
    const first = coordinates[0];
    const last = coordinates.at(-1);

    return `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeAttribute(METRICS[metric].label)} progress chart">
        <line class="chart-axis" x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + chartHeight}"></line>
        <line class="chart-axis" x1="${pad.left}" y1="${pad.top + chartHeight}" x2="${pad.left + chartWidth}" y2="${pad.top + chartHeight}"></line>
        <text x="${pad.left}" y="18" fill="#66736f" font-size="12">${escapeHtml(METRICS[metric].label)} (${escapeHtml(METRICS[metric].unit)})</text>
        <text x="${pad.left}" y="${height - 10}" fill="#66736f" font-size="12">${escapeHtml(formatDate(first.point.completedAt))}</text>
        <text x="${pad.left + chartWidth}" y="${height - 10}" text-anchor="end" fill="#66736f" font-size="12">${escapeHtml(formatDate(last.point.completedAt))}</text>
        <polyline class="chart-line" points="${path}"></polyline>
        ${coordinates.map(({ x, y, point }) => `
          <circle class="chart-dot" cx="${round(x)}" cy="${round(y)}" r="5"></circle>
          <title>${escapeHtml(formatDate(point.completedAt))}: ${escapeHtml(formatMetricValue(point[metric], metric))}</title>
        `).join("")}
      </svg>
    `;
  }

  function renderSetPills(sets, label) {
    const normalized = normalizeSets(sets);
    if (!normalized.length) {
      return `<p class="muted">${escapeHtml(label)}: no sets</p>`;
    }
    return `
      <ul class="set-pill-list" aria-label="${escapeAttribute(label)} sets">
        ${normalized.map((set) => `<li class="set-pill">${escapeHtml(formatSet(set))}</li>`).join("")}
      </ul>
    `;
  }

  function renderSetText(sets, label) {
    const normalized = normalizeSets(sets);
    const text = normalized.length ? normalized.map(formatSet).join(", ") : "no sets";
    return `<p class="set-text">${escapeHtml(label)}: ${escapeHtml(text)}</p>`;
  }

  function renderCompactSetChips(sets) {
    return normalizeSets(sets)
      .map((set) => `<span class="set-pill">${escapeHtml(formatSet(set))}</span>`)
      .join("");
  }

  function formatSet(set) {
    const normalized = normalizeSet(set);
    if (!normalized) {
      return "Invalid set";
    }
    if (normalized.kind === "duration") {
      return `${formatNumber(normalized.duration)}${normalized.durationUnit}`;
    }
    return `${formatNumber(normalized.reps)}x${formatNumber(normalized.weight)}${normalized.weightUnit}`;
  }

  function formatMetricValue(value, metric) {
    const unit = METRICS[metric].unit;
    return `${formatNumber(value)} ${unit}`;
  }

  function formatNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return "0";
    }
    return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, "");
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value || "";
    }
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value || "";
    }
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
  }

  function toDateInputText(isoValue) {
    const date = isoValue ? new Date(isoValue) : new Date();
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function toTimeInputText(isoValue) {
    const date = isoValue ? new Date(isoValue) : new Date();
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function combineDateAndTime(dateValue, timeValue) {
    const date = parseFlexibleDate(dateValue);
    if (!date) {
      return null;
    }
    const [hour = 0, minute = 0] = String(timeValue || "00:00").split(":").map(Number);
    date.setHours(hour || 0, minute || 0, 0, 0);
    return date.toISOString();
  }

  function parseDateBoundary(value, boundary) {
    const date = parseFlexibleDate(value);
    if (!date) {
      return null;
    }
    if (boundary === "end") {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date;
  }

  function parseFlexibleDate(value) {
    const text = String(value || "").trim();
    if (!text) {
      return null;
    }

    const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    const european = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    const match = iso || european;
    if (!match) {
      return null;
    }

    const year = iso ? Number(match[1]) : Number(match[3]);
    const month = iso ? Number(match[2]) : Number(match[2]);
    const day = iso ? Number(match[3]) : Number(match[1]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }
    return date;
  }

  function openNativePicker(input) {
    if (!input || input.disabled) {
      return;
    }
    input.focus();
    if (typeof input.showPicker !== "function") {
      return;
    }
    try {
      input.showPicker();
    } catch {
      // Browsers only allow showPicker during a direct user action.
    }
  }

  function syncAnalyticsControls() {
    state.analytics.exerciseId = els.progressExerciseSelect.value;
    state.analytics.metric = els.progressMetricSelect.value;
    state.analytics.fromDate = els.progressFromDate.value;
    state.analytics.toDate = els.progressToDate.value;
  }

  function syncHistoryDateControls() {
    state.history.fromDate = els.historyFromDate.value;
    state.history.toDate = els.historyToDate.value;
  }

  function toSeconds(set) {
    if (set.kind !== "duration") {
      return 0;
    }
    return set.durationUnit === "sec" ? set.duration || 0 : (set.duration || 0) * 60;
  }

  function toKg(weight, unit) {
    return unit === "lb" ? weight * 0.45359237 : weight;
  }

  function normalizeWeightUnit(unit) {
    return String(unit || "kg").toLowerCase().startsWith("lb") ? "lb" : "kg";
  }

  function normalizeDurationUnit(unit) {
    const lower = String(unit || "min").toLowerCase();
    return lower.startsWith("s") ? "sec" : "min";
  }

  function numberOrNull(value) {
    if (value === "" || value === null || value === undefined) {
      return null;
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function numberValue(value) {
    return value === null || value === undefined ? "" : escapeAttribute(value);
  }

  function isPositiveNumber(value) {
    return Number.isFinite(Number(value)) && Number(value) > 0;
  }

  function isNonNegativeNumber(value) {
    return Number.isFinite(Number(value)) && Number(value) >= 0;
  }

  function round(value) {
    return Math.round(value * 100) / 100;
  }

  function plural(count, singular, pluralText) {
    return count === 1 ? singular : pluralText;
  }

  function emptyState(title, body) {
    return `
      <div class="empty-state">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(body)}</p>
      </div>
    `;
  }

  function showAlert(id, message, type = "error") {
    const alert = document.getElementById(id);
    if (!alert) {
      return;
    }
    alert.textContent = message;
    alert.className = `alert alert-${type} is-visible`;
  }

  function showToast(message, type = "success") {
    if (!els.toast) {
      return;
    }
    window.clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.className = `toast is-visible ${type === "error" ? "is-error" : ""}`;
    toastTimer = window.setTimeout(() => {
      els.toast.className = "toast";
    }, 3000);
  }

  function confirmAction({ title, message, confirmText = "Confirm", cancelText = "Cancel", danger = true }) {
    if (!els.confirmDialog) {
      return Promise.resolve(false);
    }

    els.confirmTitle.textContent = title || "Confirm";
    els.confirmMessage.textContent = message || "";
    els.confirmCancelButton.textContent = cancelText;
    els.confirmAcceptButton.textContent = confirmText;
    els.confirmAcceptButton.className = `button ${danger ? "button-danger" : ""}`.trim();

    return new Promise((resolve) => {
      let settled = false;
      const cleanup = () => {
        els.confirmCancelButton.removeEventListener("click", cancel);
        els.confirmAcceptButton.removeEventListener("click", accept);
        els.confirmDialog.removeEventListener("cancel", cancel);
      };
      const settle = (value) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        if (els.confirmDialog.open && typeof els.confirmDialog.close === "function") {
          els.confirmDialog.close();
        } else {
          els.confirmDialog.removeAttribute("open");
        }
        resolve(value);
      };
      const cancel = (event) => {
        event?.preventDefault();
        settle(false);
      };
      const accept = () => settle(true);

      els.confirmCancelButton.addEventListener("click", cancel);
      els.confirmAcceptButton.addEventListener("click", accept);
      els.confirmDialog.addEventListener("cancel", cancel);

      if (typeof els.confirmDialog.showModal === "function") {
        els.confirmDialog.showModal();
      } else {
        els.confirmDialog.setAttribute("open", "");
      }
    });
  }

  function toggleDarkMode() {
    state.darkMode = !state.darkMode;
    localStorage.setItem(DARK_MODE_STORAGE_KEY, String(state.darkMode));
    applyTheme();
    renderBackup();
    showToast(state.darkMode ? "Dark mode enabled." : "Light mode enabled.");
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.darkMode ? "dark" : "light";
  }

  function showWelcomeDialog() {
    if (!els.welcomeDialog || localStorage.getItem(WELCOME_STORAGE_KEY) === "true") {
      return;
    }
    if (typeof els.welcomeDialog.showModal === "function") {
      els.welcomeDialog.showModal();
    } else {
      els.welcomeDialog.setAttribute("open", "");
    }
  }

  function createId() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  window.WorkoutTracker = {
    test: {
      createEmptyData,
      normalizeImportedData,
      normalizeSet,
      normalizeSets,
      summarizeSets,
      buildAnalyticsPoints,
      formatSet
    }
  };
})();
