const QUIZ_STORAGE_KEY = 'marigold-quizzes';
const QUIZ_DRAFT_KEY   = 'marigold-quiz-draft';

var currentTopic     = 'General Financial Literacy';
var currentCount     = 5;
var currentQuestions = [];
var draftStartedAt   = null;
var frSaveTimer      = null;

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

    document.getElementById('quiz-generate-btn').addEventListener('click', generateQuiz);
    document.getElementById('quiz-submit-btn').addEventListener('click', submitQuiz);
    document.getElementById('quiz-retake-btn').addEventListener('click', retakeQuiz);
    document.getElementById('quiz-new-btn').addEventListener('click', newQuiz);

    // Resume a draft if navigated here with ?resume=1
    var params = new URLSearchParams(window.location.search);
    if (params.get('resume') === '1') {
        var draft = JSON.parse(localStorage.getItem(QUIZ_DRAFT_KEY) || 'null');
        if (draft && draft.questions && draft.questions.length > 0) {
            currentTopic     = draft.topic;
            currentCount     = draft.count;
            currentQuestions = draft.questions;
            draftStartedAt   = draft.startedAt;
            renderQuestions(draft.questions);
            if (draft.answers) restoreAnswers(draft.answers);
            showSection('quiz-questions');
            return;
        }
    }
});

function showSection(id) {
    ['quiz-setup', 'quiz-loading', 'quiz-questions', 'quiz-results'].forEach(function (s) {
        var el = document.getElementById(s);
        if (el) el.classList.add('hidden');
    });
    var target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
}

// ── Draft helpers ──────────────────────────────────────────────────────────

function collectAnswers() {
    var answers = [];
    document.querySelectorAll('.quiz-question-card').forEach(function (card, i) {
        var q = currentQuestions[i];
        if (!q) return;
        if (q.type === 'mc') {
            var sel = card.querySelector('.quiz-option-btn.selected');
            answers.push(sel ? parseInt(sel.dataset.index) : null);
        } else {
            var ta = card.querySelector('.quiz-fr-input');
            answers.push(ta ? ta.value.trim() : '');
        }
    });
    return answers;
}

function saveDraft() {
    if (currentQuestions.length === 0) return;
    var now = new Date();
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    if (!draftStartedAt) {
        draftStartedAt = months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();
    }
    localStorage.setItem(QUIZ_DRAFT_KEY, JSON.stringify({
        topic:      currentTopic,
        count:      currentCount,
        questions:  currentQuestions,
        answers:    collectAnswers(),
        startedAt:  draftStartedAt
    }));
}

function clearDraft() {
    localStorage.removeItem(QUIZ_DRAFT_KEY);
    draftStartedAt = null;
}

function restoreAnswers(answers) {
    document.querySelectorAll('.quiz-question-card').forEach(function (card, i) {
        var q = currentQuestions[i];
        var ans = answers[i];
        if (q.type === 'mc' && ans !== null && ans !== undefined) {
            var btn = card.querySelector('.quiz-option-btn[data-index="' + ans + '"]');
            if (btn) btn.classList.add('selected');
        } else if (q.type === 'fr' && ans) {
            var ta = card.querySelector('.quiz-fr-input');
            if (ta) ta.value = ans;
        }
    });
}

// ── Generate ───────────────────────────────────────────────────────────────

async function generateQuiz() {
    showSection('quiz-loading');

    try {
        var response = await fetch(API_BASE + '/quiz/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: currentTopic, count: currentCount })
        });
        var data = await response.json();

        if (data.error || !data.questions || data.questions.length === 0) {
            alert('Failed to generate quiz. Please try again.');
            showSection('quiz-setup');
            return;
        }

        currentQuestions = data.questions;
        draftStartedAt   = null;   // reset so saveDraft stamps a fresh date
        renderQuestions(data.questions);
        saveDraft();
        showSection('quiz-questions');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        alert('Could not connect to server. Make sure it is running.');
        showSection('quiz-setup');
    }
}

// ── Render questions ───────────────────────────────────────────────────────

function renderQuestions(questions) {
    var container = document.getElementById('quiz-question-list');
    container.innerHTML = '';

    questions.forEach(function (q, i) {
        var card = document.createElement('div');
        card.className = 'quiz-question-card';
        card.dataset.index = i;

        var topRow = document.createElement('div');
        topRow.className = 'quiz-q-top-row';

        var qNum = document.createElement('span');
        qNum.className = 'quiz-q-number';
        qNum.textContent = 'Question ' + (i + 1) + ' of ' + questions.length;

        var badge = document.createElement('span');
        badge.className = 'quiz-q-badge ' + (q.type === 'mc' ? 'quiz-badge-mc' : 'quiz-badge-fr');
        badge.textContent = q.type === 'mc' ? 'Multiple Choice' : 'Free Response';

        topRow.appendChild(qNum);
        topRow.appendChild(badge);
        card.appendChild(topRow);

        var qText = document.createElement('p');
        qText.className = 'quiz-q-text';
        qText.textContent = q.question;
        card.appendChild(qText);

        if (q.type === 'mc') {
            var optionsDiv = document.createElement('div');
            optionsDiv.className = 'quiz-options';
            q.options.forEach(function (opt, oi) {
                var btn = document.createElement('button');
                btn.className = 'quiz-option-btn';
                btn.dataset.index = oi;
                var letter = document.createElement('span');
                letter.className = 'quiz-option-letter';
                letter.textContent = String.fromCharCode(65 + oi);
                var text = document.createElement('span');
                text.className = 'quiz-option-text';
                text.textContent = opt;
                btn.appendChild(letter);
                btn.appendChild(text);
                btn.addEventListener('click', function () {
                    optionsDiv.querySelectorAll('.quiz-option-btn').forEach(function (b) { b.classList.remove('selected'); });
                    btn.classList.add('selected');
                    saveDraft();
                });
                optionsDiv.appendChild(btn);
            });
            card.appendChild(optionsDiv);
        } else {
            var textarea = document.createElement('textarea');
            textarea.className = 'quiz-fr-input';
            textarea.placeholder = 'Type your answer here…';
            textarea.rows = 4;
            textarea.addEventListener('input', function () {
                clearTimeout(frSaveTimer);
                frSaveTimer = setTimeout(saveDraft, 600);
            });
            card.appendChild(textarea);
        }

        container.appendChild(card);
    });
}

// ── Submit ─────────────────────────────────────────────────────────────────

async function submitQuiz() {
    var cards = document.querySelectorAll('.quiz-question-card');
    var answers = [];

    cards.forEach(function (card, i) {
        var q = currentQuestions[i];
        if (q.type === 'mc') {
            var selected = card.querySelector('.quiz-option-btn.selected');
            answers.push(selected ? parseInt(selected.dataset.index) : null);
        } else {
            var textarea = card.querySelector('.quiz-fr-input');
            answers.push(textarea ? textarea.value.trim() : '');
        }
    });

    var unansweredMC = answers.filter(function (a, i) {
        return currentQuestions[i].type === 'mc' && a === null;
    }).length;

    if (unansweredMC > 0) {
        if (!confirm(unansweredMC + ' multiple choice question(s) are unanswered. Submit anyway?')) return;
    }

    var frPairs = [];
    currentQuestions.forEach(function (q, i) {
        if (q.type === 'fr') frPairs.push({ question: q.question, answer: answers[i] || '' });
    });

    var frGrades = [];
    if (frPairs.length > 0) {
        var submitBtn = document.getElementById('quiz-submit-btn');
        var origText  = submitBtn.textContent;
        submitBtn.textContent = 'Grading…';
        submitBtn.disabled = true;

        try {
            var resp = await fetch(API_BASE + '/quiz/grade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pairs: frPairs })
            });
            var gradeData = await resp.json();
            frGrades = gradeData.grades || frPairs.map(function () { return { score: 0, feedback: 'Could not grade.' }; });
        } catch (err) {
            frGrades = frPairs.map(function () { return { score: 0, feedback: 'Could not connect to server.' }; });
        }

        submitBtn.textContent = origText;
        submitBtn.disabled = false;
    }

    var frGradeIdx = 0, mcCorrect = 0, mcTotal = 0, frTotal = 0, frMax = 0;

    var questionResults = currentQuestions.map(function (q, i) {
        if (q.type === 'mc') {
            mcTotal++;
            var correct = answers[i] === q.correct;
            if (correct) mcCorrect++;
            return Object.assign({}, q, { userAnswer: answers[i], isCorrect: correct });
        } else {
            frMax += 2;
            var grade = frGrades[frGradeIdx++];
            frTotal += grade.score;
            return Object.assign({}, q, { userAnswer: answers[i], frScore: grade.score, frFeedback: grade.feedback });
        }
    });

    var totalPoints = mcCorrect + frTotal;
    var maxPoints   = mcTotal + frMax;
    var pct         = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

    clearDraft();
    renderResults(questionResults, totalPoints, maxPoints, pct);
    saveQuizResult(questionResults, totalPoints, maxPoints, pct);
    showSection('quiz-results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Results ────────────────────────────────────────────────────────────────

function renderResults(questionResults, totalPoints, maxPoints, pct) {
    var gradeLabel, gradeClass;
    if (pct >= 90)      { gradeLabel = 'Excellent! 🌟';      gradeClass = 'grade-excellent'; }
    else if (pct >= 75) { gradeLabel = 'Great Job! 👍';       gradeClass = 'grade-great'; }
    else if (pct >= 60) { gradeLabel = 'Good Effort! 💪';     gradeClass = 'grade-good'; }
    else                { gradeLabel = 'Keep Practicing! 📚'; gradeClass = 'grade-practice'; }

    var banner = document.getElementById('quiz-score-banner');
    banner.className = 'quiz-score-banner ' + gradeClass;
    banner.innerHTML =
        '<div class="quiz-score-big">' + totalPoints + '<span class="quiz-score-denom"> / ' + maxPoints + ' pts</span></div>' +
        '<div class="quiz-score-pct">' + pct + '%</div>' +
        '<div class="quiz-score-grade-label">' + gradeLabel + '</div>' +
        '<div class="quiz-score-bar-track"><div class="quiz-score-bar" style="width:' + pct + '%"></div></div>';

    var list = document.getElementById('quiz-review-list');
    list.innerHTML = '';

    questionResults.forEach(function (q, i) {
        var card = document.createElement('div');
        card.className = 'quiz-review-card';

        var header = document.createElement('div');
        header.className = 'quiz-review-header';

        var num = document.createElement('span');
        num.className = 'quiz-review-num';
        num.textContent = 'Q' + (i + 1);

        var badge = document.createElement('span');
        badge.className = 'quiz-q-badge ' + (q.type === 'mc' ? 'quiz-badge-mc' : 'quiz-badge-fr');
        badge.textContent = q.type === 'mc' ? 'Multiple Choice' : 'Free Response';

        var resultBadge = document.createElement('span');
        if (q.type === 'mc') {
            resultBadge.className = 'quiz-result-badge ' + (q.isCorrect ? 'result-correct' : 'result-wrong');
            resultBadge.textContent = q.isCorrect ? '✓ Correct' : '✗ Incorrect';
        } else {
            resultBadge.className = 'quiz-result-badge result-fr';
            resultBadge.textContent = q.frScore + ' / 2 pts';
        }

        header.appendChild(num);
        header.appendChild(badge);
        header.appendChild(resultBadge);
        card.appendChild(header);

        var qText = document.createElement('p');
        qText.className = 'quiz-review-question';
        qText.textContent = q.question;
        card.appendChild(qText);

        if (q.type === 'mc') {
            var optList = document.createElement('div');
            optList.className = 'quiz-review-options';
            q.options.forEach(function (opt, oi) {
                var row = document.createElement('div');
                row.className = 'quiz-review-option';
                var isCorrect  = oi === q.correct;
                var isUserPick = oi === q.userAnswer;
                if (isCorrect)              row.classList.add('review-opt-correct');
                if (isUserPick && !isCorrect) row.classList.add('review-opt-wrong');
                var icon   = isCorrect ? ' ✓' : (isUserPick ? ' ✗' : '');
                var letter = document.createElement('span');
                letter.className = 'quiz-option-letter';
                letter.textContent = String.fromCharCode(65 + oi);
                var text = document.createElement('span');
                text.textContent = opt + icon;
                row.appendChild(letter);
                row.appendChild(text);
                optList.appendChild(row);
            });
            card.appendChild(optList);

            var exp = document.createElement('div');
            exp.className = 'quiz-review-explanation';
            exp.innerHTML = '<span class="quiz-explain-label">Why?</span> ' + escapeHtml(q.explanation);
            card.appendChild(exp);
        } else {
            var userAns = document.createElement('div');
            userAns.className = 'quiz-review-answer';
            userAns.innerHTML = '<span class="quiz-explain-label">Your answer:</span> ' +
                (q.userAnswer ? escapeHtml(q.userAnswer) : '<em>No answer provided</em>');
            card.appendChild(userAns);

            var fb = document.createElement('div');
            fb.className = 'quiz-review-feedback';
            fb.innerHTML = '<span class="quiz-explain-label">Feedback:</span> ' + escapeHtml(q.frFeedback);
            card.appendChild(fb);
        }

        list.appendChild(card);
    });
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function saveQuizResult(questionResults, totalPoints, maxPoints, pct) {
    var quizzes = JSON.parse(localStorage.getItem(QUIZ_STORAGE_KEY) || '[]');
    var now = new Date();
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    quizzes.unshift({
        id:        Date.now().toString(),
        date:      months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear(),
        topic:     currentTopic,
        count:     currentQuestions.length,
        score:     totalPoints,
        maxScore:  maxPoints,
        pct:       pct,
        questions: questionResults
    });
    if (quizzes.length > 20) quizzes.splice(20);
    localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(quizzes));
}

function retakeQuiz() {
    renderQuestions(currentQuestions);
    saveDraft();
    showSection('quiz-questions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function newQuiz() {
    clearDraft();
    showSection('quiz-setup');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
