const QUIZ_STORAGE_KEY = 'marigold-quizzes';

var currentTopic  = 'General Financial Literacy';
var currentCount  = 3;
var currentScenarios = [];  // [{story, mistake}]

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

    document.getElementById('sm-generate-btn').addEventListener('click', generateScenarios);
    document.getElementById('sm-submit-btn').addEventListener('click', submitAnswers);
    document.getElementById('sm-retake-btn').addEventListener('click', retake);
    document.getElementById('sm-new-btn').addEventListener('click', newScenarios);
});

function showSection(id) {
    ['sm-setup', 'sm-loading', 'sm-questions', 'sm-results'].forEach(function (s) {
        var el = document.getElementById(s);
        if (el) el.classList.add('hidden');
    });
    var el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
}

// ── Generate ───────────────────────────────────────────────────────────────

async function generateScenarios() {
    showSection('sm-loading');

    try {
        var response = await fetch(API_BASE + '/spotmistake/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: currentTopic, count: currentCount })
        });
        var data = await response.json();

        if (data.error || !data.scenarios || data.scenarios.length === 0) {
            alert('Failed to generate scenarios. Please try again.');
            showSection('sm-setup');
            return;
        }

        currentScenarios = data.scenarios;
        renderQuestions(data.scenarios);
        showSection('sm-questions');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        alert('Could not connect to server. Make sure it is running.');
        showSection('sm-setup');
    }
}

// ── Render questions ───────────────────────────────────────────────────────

function renderQuestions(scenarios) {
    var container = document.getElementById('sm-question-list');
    container.innerHTML = '';

    scenarios.forEach(function (scenario, i) {
        var card = document.createElement('div');
        card.className = 'sm-question-card';
        card.dataset.index = i;

        var topRow = document.createElement('div');
        topRow.className = 'quiz-q-top-row';

        var num = document.createElement('span');
        num.className = 'quiz-q-number';
        num.textContent = 'Scenario ' + (i + 1) + ' of ' + scenarios.length;

        var badge = document.createElement('span');
        badge.className = 'quiz-q-badge quiz-badge-spotmistake';
        badge.textContent = 'Spot the Mistake';

        topRow.appendChild(num);
        topRow.appendChild(badge);
        card.appendChild(topRow);

        // Scenario story in a styled block
        var storyBlock = document.createElement('div');
        storyBlock.className = 'sm-story-block';

        var storyText = document.createElement('p');
        storyText.className = 'sm-story-text';
        storyText.textContent = scenario.story;

        storyBlock.appendChild(storyText);
        card.appendChild(storyBlock);

        // Answer prompt
        var answerLabel = document.createElement('label');
        answerLabel.className = 'sm-answer-label';
        answerLabel.textContent = 'What was the financial mistake?';

        var textarea = document.createElement('textarea');
        textarea.className = 'quiz-fr-input sm-textarea';
        textarea.placeholder = 'Describe the mistake you spotted…';
        textarea.rows = 3;

        card.appendChild(answerLabel);
        card.appendChild(textarea);
        container.appendChild(card);
    });
}

// ── Submit ─────────────────────────────────────────────────────────────────

async function submitAnswers() {
    var cards   = document.querySelectorAll('.sm-question-card');
    var answers = [];

    cards.forEach(function (card, i) {
        var ta = card.querySelector('.sm-textarea');
        answers.push(ta ? ta.value.trim() : '');
    });

    var blank = answers.filter(function (a) { return !a; }).length;
    if (blank > 0) {
        if (!confirm(blank + ' scenario(s) have no answer. Submit anyway?')) return;
    }

    var submitBtn  = document.getElementById('sm-submit-btn');
    submitBtn.textContent = 'Grading…';
    submitBtn.disabled = true;

    var items = currentScenarios.map(function (scenario, i) {
        return { story: scenario.story, mistake: scenario.mistake, userAnswer: answers[i] || '' };
    });

    var grades;
    try {
        var resp = await fetch(API_BASE + '/spotmistake/grade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: items })
        });
        var data = await resp.json();
        grades = data.grades || items.map(function () { return { score: 0, found: false, feedback: 'Could not grade.' }; });
    } catch (err) {
        grades = items.map(function () { return { score: 0, found: false, feedback: 'Could not connect to server.' }; });
    }

    submitBtn.textContent = 'Submit for Feedback';
    submitBtn.disabled = false;

    var totalScore = grades.reduce(function (sum, g) { return sum + (g.score || 0); }, 0);
    var maxScore   = currentScenarios.length * 2;
    var pct        = Math.round((totalScore / maxScore) * 100);

    var questionResults = currentScenarios.map(function (scenario, i) {
        return {
            type:         'spotmistake',
            question:     scenario.story,
            actualMistake: scenario.mistake,
            userAnswer:   answers[i] || '',
            score:        grades[i].score,
            found:        grades[i].found,
            feedback:     grades[i].feedback
        };
    });

    renderResults(questionResults, totalScore, maxScore, pct);
    saveResult(questionResults, totalScore, maxScore, pct);
    showSection('sm-results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Results ────────────────────────────────────────────────────────────────

function renderResults(questionResults, totalScore, maxScore, pct) {
    var gradeLabel, gradeClass;
    if (pct >= 90)      { gradeLabel = 'Sharp Eye! 🌟';          gradeClass = 'grade-excellent'; }
    else if (pct >= 70) { gradeLabel = 'Good Catch! 👍';         gradeClass = 'grade-great'; }
    else if (pct >= 50) { gradeLabel = 'Getting There! 💪';      gradeClass = 'grade-good'; }
    else                { gradeLabel = 'Keep Practicing! 📚';    gradeClass = 'grade-practice'; }

    var banner = document.getElementById('sm-score-banner');
    banner.className = 'quiz-score-banner ' + gradeClass;
    banner.innerHTML =
        '<div class="quiz-score-big">' + totalScore +
            '<span class="quiz-score-denom"> / ' + maxScore + ' pts</span></div>' +
        '<div class="quiz-score-pct">' + pct + '%</div>' +
        '<div class="quiz-score-grade-label">' + gradeLabel + '</div>' +
        '<div class="quiz-score-bar-track"><div class="quiz-score-bar" style="width:' + pct + '%"></div></div>';

    var list = document.getElementById('sm-review-list');
    list.innerHTML = '';

    questionResults.forEach(function (q, i) {
        var card = document.createElement('div');
        card.className = 'quiz-review-card sm-review-card';

        // Header
        var header = document.createElement('div');
        header.className = 'quiz-review-header';

        var num = document.createElement('span');
        num.className = 'quiz-review-num';
        num.textContent = 'S' + (i + 1);

        var badge = document.createElement('span');
        badge.className = 'quiz-q-badge quiz-badge-spotmistake';
        badge.textContent = 'Spot the Mistake';

        var resultBadge = document.createElement('span');
        if (q.score === 2) {
            resultBadge.className = 'quiz-result-badge result-correct';
            resultBadge.textContent = '🎯 Found It!';
        } else if (q.score === 1) {
            resultBadge.className = 'quiz-result-badge result-fr';
            resultBadge.textContent = '~ Partially';
        } else {
            resultBadge.className = 'quiz-result-badge result-wrong';
            resultBadge.textContent = '✗ Missed It';
        }

        header.appendChild(num);
        header.appendChild(badge);
        header.appendChild(resultBadge);
        card.appendChild(header);

        // Story block
        var storyBlock = document.createElement('div');
        storyBlock.className = 'sm-story-block sm-story-block-result';

        var storyText = document.createElement('p');
        storyText.className = 'sm-story-text';
        storyText.textContent = q.question;
        storyBlock.appendChild(storyText);
        card.appendChild(storyBlock);

        // User's answer
        var userBox = document.createElement('div');
        userBox.className = 'quiz-review-answer';
        userBox.innerHTML = '<span class="quiz-explain-label">Your answer:</span> ' +
            (q.userAnswer ? escapeHtml(q.userAnswer) : '<em>No answer provided</em>');
        card.appendChild(userBox);

        // AI feedback
        var fbBox = document.createElement('div');
        fbBox.className = 'quiz-review-feedback';
        fbBox.innerHTML = '<span class="quiz-explain-label">Feedback:</span> ' + escapeHtml(q.feedback);
        card.appendChild(fbBox);

        // Reveal the actual mistake
        var mistakeBox = document.createElement('div');
        mistakeBox.className = 'sm-actual-mistake';
        mistakeBox.innerHTML = '<span class="sm-mistake-label">The mistake:</span> ' + escapeHtml(q.actualMistake);
        card.appendChild(mistakeBox);

        list.appendChild(card);
    });
}

function saveResult(questionResults, totalScore, maxScore, pct) {
    var quizzes = JSON.parse(localStorage.getItem(QUIZ_STORAGE_KEY) || '[]');
    var now     = new Date();
    var months  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    quizzes.unshift({
        id:       Date.now().toString(),
        date:     months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear(),
        topic:    currentTopic,
        type:     'spotmistake',
        count:    currentScenarios.length,
        score:    totalScore,
        maxScore: maxScore,
        pct:      pct,
        questions: questionResults
    });
    if (quizzes.length > 20) quizzes.splice(20);
    localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(quizzes));
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function retake() {
    renderQuestions(currentScenarios);
    showSection('sm-questions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function newScenarios() {
    showSection('sm-setup');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
