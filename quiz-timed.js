const QUIZ_STORAGE_KEY = 'marigold-quizzes';

var currentTopic      = 'General Financial Literacy';
var currentCount      = 5;
var currentDifficulty = 'easy';
var currentSeconds    = 180;   // based on difficulty
var questions         = [];
var userAnswers       = [];    // option index or null per question
var currentQIdx       = 0;
var timeLeft          = 0;
var timerDuration     = 0;
var timerInterval     = null;
var timedOut          = false;

var DIFFICULTY_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
var DIFFICULTY_TIMES  = { easy: 180, medium: 90, hard: 60 };

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

    document.querySelectorAll('.tc-diff-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.tc-diff-btn').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            currentDifficulty = btn.dataset.diff;
            currentSeconds    = parseInt(btn.dataset.seconds);
        });
    });

    document.getElementById('tc-generate-btn').addEventListener('click', generateChallenge);
    document.getElementById('tc-start-btn').addEventListener('click', startChallenge);
    document.getElementById('tc-retry-btn').addEventListener('click', retryChallenge);
    document.getElementById('tc-new-btn').addEventListener('click', newChallenge);
});

function showSection(id) {
    ['tc-setup', 'tc-loading', 'tc-ready', 'tc-active', 'tc-results'].forEach(function (s) {
        var el = document.getElementById(s);
        if (el) el.classList.add('hidden');
    });
    var el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
}

function formatTime(secs) {
    var m = Math.floor(secs / 60);
    var s = secs % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
}

// ── Generate ───────────────────────────────────────────────────────────────

async function generateChallenge() {
    showSection('tc-loading');

    try {
        var response = await fetch(API_BASE + '/timed/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: currentTopic, count: currentCount, difficulty: currentDifficulty })
        });
        var data = await response.json();

        if (data.error || !data.questions || data.questions.length === 0) {
            alert('Failed to generate questions. Please try again.');
            showSection('tc-setup');
            return;
        }

        questions    = data.questions;
        userAnswers  = questions.map(function () { return null; });
        currentQIdx  = 0;
        timedOut     = false;
        timerDuration = currentSeconds;
        timeLeft      = currentSeconds;

        // Populate ready screen
        document.getElementById('tc-ready-title').textContent =
            DIFFICULTY_LABELS[currentDifficulty] + ' · ' + questions.length + ' Questions';
        document.getElementById('tc-ready-desc').textContent =
            'You have ' + formatTime(currentSeconds) + ' to answer all ' + questions.length + ' questions. ' +
            'Once you select an answer the next question appears automatically.';

        var meta = document.getElementById('tc-ready-meta');
        meta.innerHTML =
            '<span class="tc-meta-chip">' + currentTopic + '</span>' +
            '<span class="tc-meta-chip tc-meta-' + currentDifficulty + '">' + DIFFICULTY_LABELS[currentDifficulty] + '</span>' +
            '<span class="tc-meta-chip">⏱ ' + formatTime(currentSeconds) + '</span>';

        showSection('tc-ready');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        alert('Could not connect to server. Make sure it is running.');
        showSection('tc-setup');
    }
}

// ── Start ──────────────────────────────────────────────────────────────────

function startChallenge() {
    showSection('tc-active');
    renderCurrentQuestion();
    startTimer();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(function () {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            timedOut = true;
            finishChallenge();
        }
    }, 1000);
}

function updateTimerDisplay() {
    var display = document.getElementById('tc-timer-display');
    var bar     = document.getElementById('tc-timer-bar');
    if (!display || !bar) return;

    display.textContent = formatTime(timeLeft);

    var pct = (timeLeft / timerDuration) * 100;
    bar.style.width = pct + '%';

    // Color urgency
    var card = document.getElementById('tc-timer-card');
    if (timeLeft <= 10) {
        display.className = 'tc-timer-display tc-timer-red';
        bar.className     = 'tc-timer-bar tc-bar-red';
        if (card) card.classList.add('tc-timer-urgent');
    } else if (timeLeft <= 20) {
        display.className = 'tc-timer-display tc-timer-orange';
        bar.className     = 'tc-timer-bar tc-bar-orange';
        if (card) card.classList.remove('tc-timer-urgent');
    } else {
        display.className = 'tc-timer-display';
        bar.className     = 'tc-timer-bar';
        if (card) card.classList.remove('tc-timer-urgent');
    }
}

// ── Question rendering ─────────────────────────────────────────────────────

function renderCurrentQuestion() {
    var q         = questions[currentQIdx];
    var container = document.getElementById('tc-question-card');
    container.innerHTML = '';

    // Progress
    var pct = Math.round((currentQIdx / questions.length) * 100);
    document.getElementById('tc-q-progress-label').textContent =
        'Question ' + (currentQIdx + 1) + ' of ' + questions.length;
    document.getElementById('tc-q-progress-bar').style.width = pct + '%';

    // Question text
    var qText = document.createElement('p');
    qText.className = 'tc-question-text';
    qText.textContent = q.question;
    container.appendChild(qText);

    // Options
    var opts = document.createElement('div');
    opts.className = 'tc-options';

    q.options.forEach(function (opt, oi) {
        var btn = document.createElement('button');
        btn.className = 'tc-option-btn';
        btn.dataset.index = oi;

        var letter = document.createElement('span');
        letter.className = 'quiz-option-letter';
        letter.textContent = String.fromCharCode(65 + oi);

        var text = document.createElement('span');
        text.className = 'quiz-option-text';
        text.textContent = opt;

        btn.appendChild(letter);
        btn.appendChild(text);
        btn.addEventListener('click', function () { selectAnswer(oi); });
        opts.appendChild(btn);
    });

    container.appendChild(opts);
}

function selectAnswer(optionIdx) {
    userAnswers[currentQIdx] = optionIdx;

    // Highlight selected option, disable all
    document.querySelectorAll('.tc-option-btn').forEach(function (btn) {
        btn.disabled = true;
        if (parseInt(btn.dataset.index) === optionIdx) {
            btn.classList.add('selected');
        }
    });

    // Advance after brief pause
    setTimeout(function () {
        currentQIdx++;
        if (currentQIdx >= questions.length) {
            if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
            finishChallenge();
        } else {
            renderCurrentQuestion();
        }
    }, 350);
}

// ── Finish ─────────────────────────────────────────────────────────────────

function finishChallenge() {
    var timeUsed = timerDuration - timeLeft;
    var correct  = questions.filter(function (q, i) { return userAnswers[i] === q.correct; }).length;
    var answered = questions.filter(function (_, i) { return userAnswers[i] !== null; }).length;
    var pct      = Math.round((correct / questions.length) * 100);

    renderResults(correct, answered, pct, timeUsed);
    saveResult(correct, answered, pct, timeUsed);
    showSection('tc-results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Results ────────────────────────────────────────────────────────────────

function renderResults(correct, answered, pct, timeUsed) {
    var gradeLabel, gradeClass;
    if (pct === 100)    { gradeLabel = 'Perfect! 🌟';           gradeClass = 'grade-excellent'; }
    else if (pct >= 80) { gradeLabel = 'Lightning Fast! ⚡';    gradeClass = 'grade-excellent'; }
    else if (pct >= 60) { gradeLabel = 'Great Speed! 👍';       gradeClass = 'grade-great'; }
    else if (pct >= 40) { gradeLabel = 'Good Effort! 💪';       gradeClass = 'grade-good'; }
    else                { gradeLabel = 'Keep Practicing! 📚';   gradeClass = 'grade-practice'; }

    var banner = document.getElementById('tc-score-banner');
    banner.className = 'quiz-score-banner ' + gradeClass;
    banner.innerHTML =
        '<div class="quiz-score-big">' + correct +
            '<span class="quiz-score-denom"> / ' + questions.length + ' correct</span></div>' +
        '<div class="quiz-score-pct">' + pct + '%</div>' +
        '<div class="quiz-score-grade-label">' + gradeLabel + '</div>' +
        '<div class="quiz-score-bar-track"><div class="quiz-score-bar" style="width:' + pct + '%"></div></div>';

    // Time used card
    var timeCard = document.getElementById('tc-time-used-card');
    var unanswered = questions.length - answered;
    timeCard.innerHTML =
        '<span class="tc-time-used-icon">' + (timedOut ? '⏰' : '✓') + '</span>' +
        '<span class="tc-time-used-text">' +
            (timedOut
                ? 'Time ran out · ' + unanswered + ' question' + (unanswered !== 1 ? 's' : '') + ' unanswered'
                : 'Finished in ' + formatTime(timeUsed)) +
        '</span>' +
        '<span class="tc-diff-badge tc-meta-' + currentDifficulty + '">' +
            DIFFICULTY_LABELS[currentDifficulty] + '</span>';

    // Per-question review
    var list = document.getElementById('tc-review-list');
    list.innerHTML = '';

    questions.forEach(function (q, i) {
        var row = document.createElement('div');
        var answered = userAnswers[i] !== null;
        var isCorrect = userAnswers[i] === q.correct;
        row.className = 'tc-review-row ' + (answered ? (isCorrect ? 'tc-row-correct' : 'tc-row-wrong') : 'tc-row-skipped');

        var left = document.createElement('div');
        left.className = 'tc-review-left';

        var num = document.createElement('span');
        num.className = 'tc-review-num';
        num.textContent = (i + 1);

        var qText = document.createElement('span');
        qText.className = 'tc-review-q-text';
        qText.textContent = q.question;

        left.appendChild(num);
        left.appendChild(qText);

        var right = document.createElement('div');
        right.className = 'tc-review-right';

        if (!answered) {
            var skipBadge = document.createElement('span');
            skipBadge.className = 'quiz-result-badge result-wrong';
            skipBadge.textContent = '— Unanswered';
            right.appendChild(skipBadge);
        } else if (isCorrect) {
            var okBadge = document.createElement('span');
            okBadge.className = 'quiz-result-badge result-correct';
            okBadge.textContent = '✓ ' + q.options[q.correct];
            right.appendChild(okBadge);
        } else {
            var wrongBadge = document.createElement('span');
            wrongBadge.className = 'quiz-result-badge result-wrong';
            wrongBadge.textContent = '✗ ' + q.options[userAnswers[i]];
            right.appendChild(wrongBadge);

            var correctNote = document.createElement('span');
            correctNote.className = 'tc-correct-note';
            correctNote.textContent = '→ ' + q.options[q.correct];
            right.appendChild(correctNote);
        }

        row.appendChild(left);
        row.appendChild(right);
        list.appendChild(row);
    });
}

function saveResult(correct, answered, pct, timeUsed) {
    var quizzes = JSON.parse(localStorage.getItem(QUIZ_STORAGE_KEY) || '[]');
    var now     = new Date();
    var months  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    quizzes.unshift({
        id:         Date.now().toString(),
        date:       months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear(),
        topic:      currentTopic,
        type:       'timed',
        difficulty: currentDifficulty,
        count:      questions.length,
        score:      correct,
        maxScore:   questions.length,
        pct:        pct,
        timeUsed:   timeUsed,
        timedOut:   timedOut,
        questions:  questions.map(function (q, i) {
            return {
                type:      'timed',
                question:  q.question,
                options:   q.options,
                correct:   q.correct,
                userAnswer: userAnswers[i],
                isCorrect: userAnswers[i] === q.correct
            };
        })
    });
    if (quizzes.length > 20) quizzes.splice(20);
    localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(quizzes));
}

function retryChallenge() {
    userAnswers  = questions.map(function () { return null; });
    currentQIdx  = 0;
    timedOut     = false;
    timeLeft     = timerDuration;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    showSection('tc-ready');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function newChallenge() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    showSection('tc-setup');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
