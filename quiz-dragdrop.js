const QUIZ_STORAGE_KEY = 'marigold-quizzes';

var currentTopic  = 'General Financial Literacy';
var currentCount  = 5;
var vocabulary    = [];   // [{term, definition}, ...]
var shuffledOrder = [];   // vocabulary indices in shuffled pool order
var placements    = {};   // termIdx -> defIdx
var dragData      = null; // {defIdx, fromTerm: number|null}
var poolListenersAdded = false;

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.quiz-topic-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.quiz-topic-btn').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            currentTopic = btn.dataset.topic;
        });
    });

    document.querySelectorAll('.quiz-count-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.quiz-count-btn').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            currentCount = parseInt(btn.dataset.count);
        });
    });

    document.getElementById('dd-generate-btn').addEventListener('click', generateDragDrop);
    document.getElementById('dd-submit-btn').addEventListener('click', submitDragDrop);
    document.getElementById('dd-retry-btn').addEventListener('click', retryDragDrop);
    document.getElementById('dd-new-btn').addEventListener('click', newDragDrop);
});

function showSection(id) {
    ['dd-setup', 'dd-loading', 'dd-workspace-section', 'dd-results'].forEach(function (s) {
        var el = document.getElementById(s);
        if (el) el.classList.add('hidden');
    });
    var el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
}

// ── Shuffle helper ─────────────────────────────────────────────────────────

function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
}

// ── Generate ───────────────────────────────────────────────────────────────

async function generateDragDrop() {
    showSection('dd-loading');

    try {
        var response = await fetch(API_BASE + '/dragdrop/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: currentTopic, count: currentCount })
        });
        var data = await response.json();

        if (data.error || !data.pairs || data.pairs.length === 0) {
            alert('Failed to generate vocabulary. Please try again.');
            showSection('dd-setup');
            return;
        }

        vocabulary    = data.pairs;
        shuffledOrder = shuffle(vocabulary.map(function (_, i) { return i; }));
        placements    = {};
        poolListenersAdded = false;

        renderWorkspace();
        showSection('dd-workspace-section');
        initPoolListeners();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        alert('Could not connect to server. Make sure it is running.');
        showSection('dd-setup');
    }
}

// ── Pool drag listeners (added once per session) ───────────────────────────

function initPoolListeners() {
    if (poolListenersAdded) return;
    poolListenersAdded = true;

    var pool = document.getElementById('dd-pool');
    pool.addEventListener('dragover', function (e) {
        e.preventDefault();
        pool.classList.add('dd-drag-over');
    });
    pool.addEventListener('dragleave', function (e) {
        if (!pool.contains(e.relatedTarget)) pool.classList.remove('dd-drag-over');
    });
    pool.addEventListener('drop', function (e) {
        e.preventDefault();
        pool.classList.remove('dd-drag-over');
        if (!dragData || dragData.fromTerm === null) { dragData = null; return; }
        delete placements[dragData.fromTerm];
        dragData = null;
        renderWorkspace();
    });
}

// ── Render workspace ───────────────────────────────────────────────────────

function renderWorkspace() {
    renderTerms();
    renderPool();
}

function renderTerms() {
    var container = document.getElementById('dd-terms');
    container.innerHTML = '';

    vocabulary.forEach(function (pair, tIdx) {
        var card = document.createElement('div');
        card.className = 'dd-term-card';

        var label = document.createElement('div');
        label.className = 'dd-term-label';
        label.textContent = pair.term;

        var zone = document.createElement('div');
        zone.className = 'dd-drop-zone';
        zone.dataset.termIdx = tIdx;

        var placedDefIdx = placements[tIdx];
        if (placedDefIdx !== undefined) {
            zone.classList.add('dd-zone-filled');
            zone.appendChild(createDefCard(placedDefIdx, tIdx));
        } else {
            zone.classList.add('dd-zone-empty');
            var hint = document.createElement('span');
            hint.className = 'dd-drop-hint';
            hint.textContent = 'Drop definition here';
            zone.appendChild(hint);
        }

        zone.addEventListener('dragover', function (e) {
            e.preventDefault();
            zone.classList.add('dd-drag-over');
        });
        zone.addEventListener('dragleave', function (e) {
            if (!zone.contains(e.relatedTarget)) zone.classList.remove('dd-drag-over');
        });
        zone.addEventListener('drop', function (e) {
            e.preventDefault();
            zone.classList.remove('dd-drag-over');
            if (!dragData) return;

            var defIdx   = dragData.defIdx;
            var fromTerm = dragData.fromTerm;

            // Clear the source term if dragging from a term
            if (fromTerm !== null) delete placements[fromTerm];

            // Place in this term (displaces any existing def back to pool automatically)
            placements[tIdx] = defIdx;
            dragData = null;
            renderWorkspace();
        });

        card.appendChild(label);
        card.appendChild(zone);
        container.appendChild(card);
    });
}

function renderPool() {
    var pool = document.getElementById('dd-pool');
    pool.innerHTML = '';

    var placed = new Set(Object.values(placements));
    var unplaced = shuffledOrder.filter(function (i) { return !placed.has(i); });

    if (unplaced.length === 0) {
        var hint = document.createElement('p');
        hint.className = 'dd-pool-empty-hint';
        hint.textContent = 'All matched! Hit Submit when ready.';
        pool.appendChild(hint);
        return;
    }

    unplaced.forEach(function (defIdx) {
        pool.appendChild(createDefCard(defIdx, null));
    });
}

function createDefCard(defIdx, fromTerm) {
    var card = document.createElement('div');
    card.className = 'dd-def-card';
    card.draggable = true;
    card.dataset.defIdx = defIdx;
    card.textContent = vocabulary[defIdx].definition;

    card.addEventListener('dragstart', function (e) {
        dragData = { defIdx: defIdx, fromTerm: fromTerm !== undefined ? fromTerm : null };
        setTimeout(function () { card.classList.add('dd-dragging'); }, 0);
    });
    card.addEventListener('dragend', function () {
        card.classList.remove('dd-dragging');
        if (dragData) { dragData = null; }   // drop happened outside a valid zone
    });

    return card;
}

// ── Submit ─────────────────────────────────────────────────────────────────

function submitDragDrop() {
    var unmatched = vocabulary.filter(function (_, i) { return placements[i] === undefined; }).length;
    if (unmatched > 0) {
        if (!confirm(unmatched + ' term(s) still need a definition. Submit anyway?')) return;
    }

    var correctCount = 0;
    var results = vocabulary.map(function (pair, tIdx) {
        var matchedDefIdx = placements[tIdx];
        var isCorrect     = matchedDefIdx === tIdx;
        if (isCorrect) correctCount++;
        return {
            term:         pair.term,
            correctDef:   pair.definition,
            userDef:      matchedDefIdx !== undefined ? vocabulary[matchedDefIdx].definition : null,
            isCorrect:    isCorrect
        };
    });

    var pct = Math.round((correctCount / vocabulary.length) * 100);
    renderResults(results, correctCount, vocabulary.length, pct);
    saveResult(results, correctCount, vocabulary.length, pct);
    showSection('dd-results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Results ────────────────────────────────────────────────────────────────

function renderResults(results, correct, total, pct) {
    var gradeLabel, gradeClass;
    if (pct === 100)    { gradeLabel = 'Perfect! 🌟';          gradeClass = 'grade-excellent'; }
    else if (pct >= 75) { gradeLabel = 'Great Job! 👍';         gradeClass = 'grade-great'; }
    else if (pct >= 50) { gradeLabel = 'Good Effort! 💪';       gradeClass = 'grade-good'; }
    else                { gradeLabel = 'Keep Practicing! 📚';   gradeClass = 'grade-practice'; }

    var banner = document.getElementById('dd-score-banner');
    banner.className = 'quiz-score-banner ' + gradeClass;
    banner.innerHTML =
        '<div class="quiz-score-big">' + correct + '<span class="quiz-score-denom"> / ' + total + ' correct</span></div>' +
        '<div class="quiz-score-pct">' + pct + '%</div>' +
        '<div class="quiz-score-grade-label">' + gradeLabel + '</div>' +
        '<div class="quiz-score-bar-track"><div class="quiz-score-bar" style="width:' + pct + '%"></div></div>';

    var list = document.getElementById('dd-results-list');
    list.innerHTML = '';

    results.forEach(function (r) {
        var card = document.createElement('div');
        card.className = 'dd-result-card ' + (r.isCorrect ? 'dd-result-correct' : 'dd-result-wrong');

        var termRow = document.createElement('div');
        termRow.className = 'dd-result-header';

        var termLabel = document.createElement('span');
        termLabel.className = 'dd-result-term';
        termLabel.textContent = r.term;

        var badge = document.createElement('span');
        badge.className = 'quiz-result-badge ' + (r.isCorrect ? 'result-correct' : 'result-wrong');
        badge.textContent = r.isCorrect ? '✓ Correct' : '✗ Incorrect';

        termRow.appendChild(termLabel);
        termRow.appendChild(badge);
        card.appendChild(termRow);

        var userBox = document.createElement('div');
        userBox.className = 'dd-result-user-def';
        userBox.innerHTML = '<span class="quiz-explain-label">Your match:</span> ' +
            (r.userDef ? escapeHtml(r.userDef) : '<em>Not matched</em>');
        card.appendChild(userBox);

        if (!r.isCorrect) {
            var correctBox = document.createElement('div');
            correctBox.className = 'dd-result-correct-def';
            correctBox.innerHTML = '<span class="quiz-explain-label">Correct definition:</span> ' + escapeHtml(r.correctDef);
            card.appendChild(correctBox);
        }

        list.appendChild(card);
    });
}

function saveResult(results, correct, total, pct) {
    var quizzes = JSON.parse(localStorage.getItem(QUIZ_STORAGE_KEY) || '[]');
    var now     = new Date();
    var months  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    quizzes.unshift({
        id:       Date.now().toString(),
        date:     months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear(),
        topic:    currentTopic,
        type:     'dragdrop',
        count:    total,
        score:    correct,
        maxScore: total,
        pct:      pct,
        questions: results.map(function (r) {
            return {
                type:       'dragdrop',
                question:   r.term,
                correctDef: r.correctDef,
                userAnswer: r.userDef || '',
                isCorrect:  r.isCorrect
            };
        })
    });
    if (quizzes.length > 20) quizzes.splice(20);
    localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(quizzes));
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function retryDragDrop() {
    shuffledOrder = shuffle(vocabulary.map(function (_, i) { return i; }));
    placements    = {};
    poolListenersAdded = false;
    renderWorkspace();
    showSection('dd-workspace-section');
    initPoolListeners();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function newDragDrop() {
    showSection('dd-setup');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
