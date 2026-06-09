(function () {
    var GOALS_KEY = 'marigold-goals';
    var MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    var calYear, calMonth, selectedDayStr, activeDayStr;
    var now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth();
    selectedDayStr = null;

    document.addEventListener('DOMContentLoaded', function () {
        var listContainer = document.getElementById('goals-list');
        if (!listContainer) return;

        var input = document.getElementById('goal-input');
        var addBtn = document.getElementById('goal-add-btn');

        // ── Main add goal (uses selectedDayStr if a day is picked) ──
        addBtn.addEventListener('click', function () {
            var text = input.value.trim();
            if (!text) return;
            addGoal(text, selectedDayStr);
            input.value = '';
            refreshAll(listContainer);
            updateSelectedDayIndicator(listContainer); // refresh pill (dot count may change)
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') addBtn.click();
        });

        // ── Calendar nav ──
        document.getElementById('cal-prev').addEventListener('click', function () {
            calMonth--;
            if (calMonth < 0) { calMonth = 11; calYear--; }
            renderCalendar(listContainer);
        });
        document.getElementById('cal-next').addEventListener('click', function () {
            calMonth++;
            if (calMonth > 11) { calMonth = 0; calYear++; }
            renderCalendar(listContainer);
        });

        // ── Day modal close ──
        document.getElementById('cal-modal-close').addEventListener('click', closeDayModal);
        document.getElementById('cal-day-modal').addEventListener('click', function (e) {
            if (e.target === this) closeDayModal();
        });

        // ── Day modal: add new goal on that day ──
        document.getElementById('cal-modal-add-btn').addEventListener('click', function () {
            var text = document.getElementById('cal-modal-new-input').value.trim();
            if (!text || !activeDayStr) return;
            addGoal(text, activeDayStr);
            document.getElementById('cal-modal-new-input').value = '';
            refreshAll(listContainer);
            updateSelectedDayIndicator(listContainer);
            renderModalContent(activeDayStr, listContainer);
        });
        document.getElementById('cal-modal-new-input').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') document.getElementById('cal-modal-add-btn').click();
        });

        // ── Day modal: assign existing undated goal to this day ──
        document.getElementById('cal-modal-assign-btn').addEventListener('click', function () {
            var sel = document.getElementById('cal-modal-assign-select');
            var id = sel.value;
            if (!id || !activeDayStr) return;
            assignGoalDate(id, activeDayStr);
            sel.value = '';
            refreshAll(listContainer);
            updateSelectedDayIndicator(listContainer);
            renderModalContent(activeDayStr, listContainer);
        });

        renderCalendar(listContainer);
        renderGoals(listContainer);
    });

    // ── Data helpers ──────────────────────────────

    function getGoals() {
        return JSON.parse(localStorage.getItem(GOALS_KEY) || '[]');
    }

    function saveGoals(goals) {
        localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    }

    function addGoal(text, dueDate) {
        var goals = getGoals();
        goals.push({
            id: Date.now().toString(),
            text: text.trim(),
            completed: false,
            locked: false,
            dueDate: dueDate || null,
            dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        });
        saveGoals(goals);
    }

    function assignGoalDate(id, dueDate) {
        var goals = getGoals();
        var g = goals.find(function (x) { return x.id === id; });
        if (g) g.dueDate = dueDate;
        saveGoals(goals);
    }

    function refreshAll(container) {
        renderCalendar(container);
        renderGoals(container);
    }

    // ── Selected day ──────────────────────────────

    function selectDay(dateStr, listContainer) {
        if (selectedDayStr === dateStr) {
            // Second click on same day → open management modal
            openDayModal(dateStr, listContainer);
            return;
        }
        selectedDayStr = dateStr;
        renderCalendar(listContainer);
        updateSelectedDayIndicator(listContainer);
    }

    function deselectDay(listContainer) {
        selectedDayStr = null;
        renderCalendar(listContainer);
        updateSelectedDayIndicator(listContainer);
    }

    function updateSelectedDayIndicator(listContainer) {
        var indicator = document.getElementById('selected-day-indicator');
        var inputEl = document.getElementById('goal-input');
        if (!indicator || !inputEl) return;

        if (!selectedDayStr) {
            indicator.style.display = 'none';
            indicator.innerHTML = '';
            inputEl.placeholder = 'Enter a new financial goal…';
            return;
        }

        var parts = selectedDayStr.split('-');
        var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        var label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });

        var goals = getGoals();
        var dayCount = goals.filter(function (g) { return g.dueDate === selectedDayStr && !g.completed; }).length;

        indicator.innerHTML = '';
        indicator.style.display = 'flex';

        var pill = document.createElement('span');
        pill.className = 'selected-day-pill';

        var pillText = document.createElement('span');
        pillText.className = 'selected-day-pill-text';
        pillText.textContent = '📅 ' + label;

        pill.appendChild(pillText);

        // "View X goals" button — only when goals exist on that day
        if (dayCount > 0) {
            var viewBtn = document.createElement('button');
            viewBtn.type = 'button';
            viewBtn.className = 'selected-day-view-btn';
            viewBtn.textContent = dayCount === 1 ? '1 goal' : dayCount + ' goals';
            viewBtn.addEventListener('click', function () {
                openDayModal(selectedDayStr, listContainer);
            });
            pill.appendChild(viewBtn);
        }

        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'selected-day-pill-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', function () { deselectDay(listContainer); });
        pill.appendChild(closeBtn);

        indicator.appendChild(pill);

        inputEl.placeholder = 'Add a goal for ' + label + '…';
        inputEl.focus();
    }

    // ── Calendar ──────────────────────────────────

    function renderCalendar(listContainer) {
        var goals = getGoals();
        var label = document.getElementById('cal-month-label');
        var grid = document.getElementById('cal-grid');
        if (!label || !grid) return;

        label.textContent = MONTH_NAMES[calMonth] + ' ' + calYear;

        var firstDay = new Date(calYear, calMonth, 1).getDay();
        var daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        var today = new Date();
        var todayY = today.getFullYear(), todayM = today.getMonth(), todayD = today.getDate();

        grid.innerHTML = '';

        for (var e = 0; e < firstDay; e++) {
            var empty = document.createElement('div');
            empty.className = 'cal-cell cal-cell-empty';
            grid.appendChild(empty);
        }

        for (var d = 1; d <= daysInMonth; d++) {
            var dateStr = calYear + '-' +
                String(calMonth + 1).padStart(2, '0') + '-' +
                String(d).padStart(2, '0');

            var dayGoals = goals.filter(function (g) {
                return g.dueDate === dateStr && !g.completed;
            });

            var isToday = todayY === calYear && todayM === calMonth && todayD === d;
            var isPast = new Date(calYear, calMonth, d) < new Date(todayY, todayM, todayD);
            var isSelected = selectedDayStr === dateStr;

            var cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'cal-cell' +
                (isToday ? ' cal-cell-today' : '') +
                (isPast && !isToday ? ' cal-cell-past' : '') +
                (isSelected ? ' cal-cell-selected' : '');
            cell.dataset.date = dateStr;
            if (isSelected) cell.setAttribute('aria-pressed', 'true');

            var num = document.createElement('span');
            num.className = 'cal-day-num';
            num.textContent = d;
            cell.appendChild(num);

            if (dayGoals.length > 0) {
                var dots = document.createElement('div');
                dots.className = 'cal-dots';
                var shown = Math.min(dayGoals.length, 3);
                for (var di = 0; di < shown; di++) {
                    var dot = document.createElement('span');
                    dot.className = 'cal-dot';
                    dots.appendChild(dot);
                }
                if (dayGoals.length > 3) {
                    var more = document.createElement('span');
                    more.className = 'cal-dot-more';
                    more.textContent = '+' + (dayGoals.length - 3);
                    dots.appendChild(more);
                }
                cell.appendChild(dots);
            }

            cell.addEventListener('click', (function (ds) {
                return function () { selectDay(ds, listContainer); };
            }(dateStr)));

            grid.appendChild(cell);
        }
    }

    // ── Day Modal ─────────────────────────────────

    function openDayModal(dateStr, listContainer) {
        activeDayStr = dateStr;
        var parts = dateStr.split('-');
        var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        var labelText = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        document.getElementById('cal-modal-date-title').textContent = labelText;
        renderModalContent(dateStr, listContainer);
        document.getElementById('cal-day-modal').classList.remove('hidden');
    }

    function closeDayModal() {
        document.getElementById('cal-day-modal').classList.add('hidden');
        activeDayStr = null;
    }

    function renderModalContent(dateStr, listContainer) {
        var goals = getGoals();
        var dayGoals = goals.filter(function (g) { return g.dueDate === dateStr; });

        var listEl = document.getElementById('cal-modal-goals-list');
        listEl.innerHTML = '';

        if (dayGoals.length === 0) {
            var emptyP = document.createElement('p');
            emptyP.className = 'cal-modal-empty';
            emptyP.textContent = 'No goals on this day yet.';
            listEl.appendChild(emptyP);
        } else {
            dayGoals.forEach(function (g) {
                var row = document.createElement('div');
                row.className = 'cal-modal-goal-row' + (g.completed ? ' cal-modal-goal-done' : '');

                var txt = document.createElement('span');
                txt.className = 'cal-modal-goal-text';
                txt.textContent = g.text;

                var unschedBtn = document.createElement('button');
                unschedBtn.className = 'cal-modal-unschedule-btn';
                unschedBtn.title = 'Remove from calendar (keep in goal list)';
                unschedBtn.textContent = '📅';
                unschedBtn.addEventListener('click', function () {
                    var gl = getGoals();
                    var found = gl.find(function (x) { return x.id === g.id; });
                    if (found) found.dueDate = null;
                    saveGoals(gl);
                    refreshAll(listContainer);
                    updateSelectedDayIndicator(listContainer);
                    renderModalContent(dateStr, listContainer);
                });

                var delBtn = document.createElement('button');
                delBtn.className = 'cal-modal-delete-btn';
                delBtn.title = 'Delete goal completely';
                delBtn.innerHTML = '&times;';
                delBtn.addEventListener('click', function () {
                    saveGoals(getGoals().filter(function (x) { return x.id !== g.id; }));
                    refreshAll(listContainer);
                    updateSelectedDayIndicator(listContainer);
                    renderModalContent(dateStr, listContainer);
                });

                row.appendChild(txt);
                row.appendChild(unschedBtn);
                row.appendChild(delBtn);
                listEl.appendChild(row);
            });
        }

        var undated = goals.filter(function (g) { return !g.dueDate && !g.completed; });
        var sel = document.getElementById('cal-modal-assign-select');
        sel.innerHTML = '<option value="">— Schedule an existing goal —</option>';
        undated.forEach(function (g) {
            var opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.text.length > 48 ? g.text.slice(0, 45) + '…' : g.text;
            sel.appendChild(opt);
        });

        var assignRow = document.getElementById('cal-modal-assign-row');
        assignRow.style.display = undated.length > 0 ? '' : 'none';
    }

    // ── Goal list ─────────────────────────────────

    function renderGoals(container) {
        var goals = getGoals();
        container.innerHTML = '';

        var today = new Date();
        var todayStr = today.getFullYear() + '-' +
            String(today.getMonth() + 1).padStart(2, '0') + '-' +
            String(today.getDate()).padStart(2, '0');

        // Past: has a dueDate before today, not completed
        var past = goals.filter(function (g) {
            return !g.completed && g.dueDate && g.dueDate < todayStr;
        });
        // Upcoming: has a dueDate of today or later, not completed
        var upcoming = goals.filter(function (g) {
            return !g.completed && g.dueDate && g.dueDate >= todayStr;
        });
        // Undated active: no dueDate, not completed
        var undated = goals.filter(function (g) {
            return !g.completed && !g.dueDate;
        });
        // Done: all completed regardless of date
        var done = goals.filter(function (g) { return g.completed; });

        if (past.length === 0 && upcoming.length === 0 && undated.length === 0 && done.length === 0) {
            container.innerHTML = '<p class="goals-empty">No goals yet — add one above, click a calendar day, or let Marigold suggest one while you chat!</p>';
            return;
        }

        // Past: oldest overdue first (ascending date = most overdue at top)
        past.sort(function (a, b) {
            return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0;
        });

        // Upcoming: closest deadline first (ascending)
        upcoming.sort(function (a, b) {
            return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0;
        });

        if (past.length > 0) {
            container.appendChild(sectionTitle('Past Due', 'overdue'));
            past.forEach(function (g) { container.appendChild(createItem(g, container)); });
        }

        if (upcoming.length > 0 || undated.length > 0) {
            container.appendChild(sectionTitle('Active Goals', 'active'));
            // Scheduled goals first (closest deadline), then undated
            upcoming.forEach(function (g) { container.appendChild(createItem(g, container)); });
            undated.forEach(function (g) { container.appendChild(createItem(g, container)); });
        }

        if (done.length > 0) {
            container.appendChild(sectionTitle('Completed ✓', 'completed'));
            done.forEach(function (g) { container.appendChild(createItem(g, container)); });
        }
    }

    function sectionTitle(text, type) {
        var h = document.createElement('h2');
        h.className = 'goals-section-title goals-section-' + type;
        h.textContent = text;
        return h;
    }

    function createItem(goal, container) {
        var isLocked = !!goal.locked;
        var item = document.createElement('div');
        item.className = 'goal-item' + (goal.completed ? ' completed' : '');

        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'goal-checkbox';
        checkbox.checked = goal.completed;
        checkbox.addEventListener('change', function () {
            var goals = getGoals();
            var g = goals.find(function (x) { return x.id === goal.id; });
            if (g) g.completed = checkbox.checked;
            saveGoals(goals);
            refreshAll(container);
        });

        var text = document.createElement('span');
        text.className = 'goal-text';
        text.textContent = goal.text;

        var dateBadge = document.createElement('span');
        dateBadge.className = 'goal-date';
        if (goal.dueDate) {
            var parts = goal.dueDate.split('-');
            var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            dateBadge.textContent = '📅 ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dateBadge.title = 'Due ' + d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            dateBadge.classList.add('goal-date-scheduled');
        } else {
            dateBadge.textContent = goal.dateAdded;
        }

        var lockBtn = document.createElement('button');
        lockBtn.className = 'goal-lock-btn';
        lockBtn.textContent = isLocked ? '🔒' : '🔓';
        lockBtn.title = isLocked ? 'Locked — click to unlock.' : 'Unlocked — click to lock.';
        lockBtn.addEventListener('click', function () {
            var goals = getGoals();
            var g = goals.find(function (x) { return x.id === goal.id; });
            if (g) g.locked = !g.locked;
            saveGoals(goals);
            renderGoals(container);
        });

        var del = document.createElement('button');
        del.className = 'goal-delete-btn';
        del.innerHTML = '&times;';
        del.title = 'Remove goal';
        del.addEventListener('click', function () {
            saveGoals(getGoals().filter(function (x) { return x.id !== goal.id; }));
            refreshAll(container);
        });

        item.appendChild(checkbox);
        item.appendChild(text);
        item.appendChild(dateBadge);
        item.appendChild(lockBtn);
        item.appendChild(del);
        return item;
    }
})();
