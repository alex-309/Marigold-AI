const QUIZ_STORAGE_KEY = 'marigold-quizzes';

var currentTopic   = 'General Financial Literacy';
var currentCount   = 3;
var challengeStory = null;
var currentChapter = 0;
var userChoices    = [];   // [{choiceIdx, score, text, consequence}, ...]

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

    document.getElementById('challenge-start-btn').addEventListener('click', generateChallenge);
    document.getElementById('challenge-retry-btn').addEventListener('click', retryChallenge);
    document.getElementById('challenge-new-btn').addEventListener('click', newChallenge);
});

function showSection(id) {
    ['challenge-setup', 'challenge-loading', 'challenge-story', 'challenge-results'].forEach(function (s) {
        var el = document.getElementById(s);
        if (el) el.classList.add('hidden');
    });
    var el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
}

// ── Generate ───────────────────────────────────────────────────────────────

async function generateChallenge() {
    showSection('challenge-loading');

    try {
        var response = await fetch(API_BASE + '/challenge/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: currentTopic, count: currentCount })
        });
        var data = await response.json();

        if (data.error || !data.story) {
            alert('Failed to generate challenge. Please try again.');
            showSection('challenge-setup');
            return;
        }

        challengeStory = data.story;
        currentChapter = 0;
        userChoices    = [];

        document.getElementById('challenge-title').textContent = challengeStory.title;
        renderChapter(0);
        showSection('challenge-story');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        alert('Could not connect to server. Make sure it is running.');
        showSection('challenge-setup');
    }
}

// ── Chapter rendering ──────────────────────────────────────────────────────

function renderChapter(idx) {
    var chapter  = challengeStory.chapters[idx];
    var total    = challengeStory.chapters.length;
    var container = document.getElementById('challenge-chapter');
    container.innerHTML = '';

    // Progress
    var pct = Math.round((idx / total) * 100);
    document.getElementById('challenge-progress-bar').style.width = pct + '%';
    document.getElementById('challenge-progress-text').textContent =
        'Chapter ' + (idx + 1) + ' of ' + total;

    // Intro — only on first chapter
    if (idx === 0 && challengeStory.intro) {
        var intro = document.createElement('p');
        intro.className = 'challenge-intro';
        intro.textContent = challengeStory.intro;
        container.appendChild(intro);
    }

    // Situation
    var situation = document.createElement('p');
    situation.className = 'challenge-situation';
    situation.textContent = chapter.situation;
    container.appendChild(situation);

    // Choices
    var choicesDiv = document.createElement('div');
    choicesDiv.className = 'challenge-choices';

    chapter.choices.forEach(function (choice, ci) {
        var btn = document.createElement('button');
        btn.className = 'challenge-choice-btn';
        btn.dataset.index = ci;

        var letter = document.createElement('span');
        letter.className = 'challenge-choice-letter';
        letter.textContent = String.fromCharCode(65 + ci);

        var text = document.createElement('span');
        text.className = 'challenge-choice-text';
        text.textContent = choice.text;

        btn.appendChild(letter);
        btn.appendChild(text);
        btn.addEventListener('click', function () { onChoiceMade(idx, ci); });
        choicesDiv.appendChild(btn);
    });

    container.appendChild(choicesDiv);
}

function onChoiceMade(chapterIdx, choiceIdx) {
    var chapter = challengeStory.chapters[chapterIdx];
    var choice  = chapter.choices[choiceIdx];

    userChoices[chapterIdx] = {
        choiceIdx:   choiceIdx,
        score:       choice.score,
        text:        choice.text,
        consequence: choice.consequence
    };

    var container = document.getElementById('challenge-chapter');

    // Disable all choice buttons and highlight selected
    container.querySelectorAll('.challenge-choice-btn').forEach(function (btn) {
        btn.disabled = true;
        if (parseInt(btn.dataset.index) === choiceIdx) {
            btn.classList.add('challenge-choice-selected');
        } else {
            btn.classList.add('challenge-choice-dimmed');
        }
    });

    // Consequence box
    var conseqBox = document.createElement('div');
    conseqBox.className = 'challenge-consequence-box';
    conseqBox.innerHTML =
        '<span class="challenge-conseq-label">What happened:</span> ' +
        escapeHtml(choice.consequence);
    container.appendChild(conseqBox);

    // Next / Finish button
    var isLast  = chapterIdx === challengeStory.chapters.length - 1;
    var nextBtn = document.createElement('button');
    nextBtn.className = 'challenge-next-btn';
    nextBtn.textContent = isLast ? 'See Results →' : 'Next Chapter →';
    nextBtn.addEventListener('click', function () {
        if (isLast) {
            showResults();
        } else {
            currentChapter = chapterIdx + 1;
            renderChapter(currentChapter);
            window.scrollTo({ top: document.getElementById('challenge-story').offsetTop - 90, behavior: 'smooth' });
        }
    });
    container.appendChild(nextBtn);
}

// ── Results ────────────────────────────────────────────────────────────────

function showResults() {
    var totalScore = userChoices.reduce(function (sum, c) { return sum + (c ? c.score : 0); }, 0);
    var maxScore   = challengeStory.chapters.length * 2;
    var pct        = Math.round((totalScore / maxScore) * 100);

    // Score banner
    var gradeLabel, gradeClass;
    if (pct >= 80)      { gradeLabel = 'Financial Genius! 🌟';   gradeClass = 'grade-excellent'; }
    else if (pct >= 60) { gradeLabel = 'Good Decisions! 👍';     gradeClass = 'grade-great'; }
    else if (pct >= 40) { gradeLabel = 'Room to Improve 💪';     gradeClass = 'grade-good'; }
    else                { gradeLabel = 'Learn & Try Again 📚';   gradeClass = 'grade-practice'; }

    var banner = document.getElementById('challenge-score-banner');
    banner.className = 'quiz-score-banner ' + gradeClass;
    banner.innerHTML =
        '<div class="quiz-score-big">' + totalScore + '<span class="quiz-score-denom"> / ' + maxScore + ' pts</span></div>' +
        '<div class="quiz-score-pct">' + pct + '%</div>' +
        '<div class="quiz-score-grade-label">' + gradeLabel + '</div>' +
        '<div class="quiz-score-bar-track"><div class="quiz-score-bar" style="width:' + pct + '%"></div></div>';

    // Outcome narrative
    var outcomeText = pct >= 80
        ? challengeStory.outcome_excellent
        : pct >= 50
            ? challengeStory.outcome_good
            : challengeStory.outcome_poor;

    var outcomeCard = document.getElementById('challenge-outcome');
    outcomeCard.innerHTML =
        '<span class="challenge-outcome-label">Your Story\'s Ending</span>' +
        '<p class="challenge-outcome-text">' + escapeHtml(outcomeText) + '</p>';

    // Chapter recap
    var recap = document.getElementById('challenge-recap');
    recap.innerHTML = '';

    challengeStory.chapters.forEach(function (chapter, i) {
        var uc = userChoices[i];
        if (!uc) return;

        var scoreLabel, scoreClass;
        if (uc.score === 2)      { scoreLabel = '✓ Smart Move';    scoreClass = 'result-correct'; }
        else if (uc.score === 1) { scoreLabel = '~ Acceptable';    scoreClass = 'result-fr'; }
        else                     { scoreLabel = '✗ Poor Choice';   scoreClass = 'result-wrong'; }

        var card = document.createElement('div');
        card.className = 'quiz-review-card';

        var header = document.createElement('div');
        header.className = 'quiz-review-header';

        var num = document.createElement('span');
        num.className = 'quiz-review-num';
        num.textContent = 'Ch.' + (i + 1);

        var typeBadge = document.createElement('span');
        typeBadge.className = 'quiz-q-badge quiz-badge-challenge';
        typeBadge.textContent = 'Decision';

        var resultBadge = document.createElement('span');
        resultBadge.className = 'quiz-result-badge ' + scoreClass;
        resultBadge.textContent = scoreLabel + ' · ' + uc.score + '/2';

        header.appendChild(num);
        header.appendChild(typeBadge);
        header.appendChild(resultBadge);
        card.appendChild(header);

        var sitText = document.createElement('p');
        sitText.className = 'quiz-review-question';
        sitText.textContent = chapter.situation;
        card.appendChild(sitText);

        var choiceBox = document.createElement('div');
        choiceBox.className = 'quiz-review-answer';
        choiceBox.innerHTML = '<span class="quiz-explain-label">You chose:</span> ' + escapeHtml(uc.text);
        card.appendChild(choiceBox);

        var consBox = document.createElement('div');
        consBox.className = 'quiz-review-explanation';
        consBox.innerHTML = '<span class="quiz-explain-label">Result:</span> ' + escapeHtml(uc.consequence);
        card.appendChild(consBox);

        recap.appendChild(card);
    });

    saveResult(totalScore, maxScore, pct);
    showSection('challenge-results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function saveResult(totalScore, maxScore, pct) {
    var quizzes = JSON.parse(localStorage.getItem(QUIZ_STORAGE_KEY) || '[]');
    var now     = new Date();
    var months  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    quizzes.unshift({
        id:       Date.now().toString(),
        date:     months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear(),
        topic:    currentTopic,
        type:     'challenge',
        title:    challengeStory.title,
        count:    challengeStory.chapters.length,
        score:    totalScore,
        maxScore: maxScore,
        pct:      pct,
        questions: challengeStory.chapters.map(function (ch, i) {
            var uc = userChoices[i] || {};
            return {
                type:        'challenge',
                question:    ch.situation,
                userAnswer:  uc.text        || '',
                choiceScore: uc.score       !== undefined ? uc.score : 0,
                consequence: uc.consequence || ''
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

function retryChallenge() {
    currentChapter = 0;
    userChoices    = [];
    document.getElementById('challenge-title').textContent = challengeStory.title;
    renderChapter(0);
    showSection('challenge-story');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function newChallenge() {
    challengeStory = null;
    showSection('challenge-setup');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
