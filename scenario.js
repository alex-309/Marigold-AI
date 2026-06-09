(function () {
    var SCENARIO_KEY = 'marigold-scenario-history';
    var GOALS_KEY = 'marigold-goals';
    var GENERATE_MSG = 'Give me a new financial scenario to practice.';

    function t(key) {
        var lang = localStorage.getItem('marigold-lang') || 'en';
        var T = window.MarigoldI18n && window.MarigoldI18n.TRANSLATIONS;
        if (!T) return key;
        return (T[lang] && T[lang][key]) || (T['en'] && T['en'][key]) || key;
    }

    document.addEventListener('DOMContentLoaded', function () {
        var sendButton = document.getElementById('send-button');
        var chatbox = document.getElementById('chatbox');
        var chatMessages = document.getElementById('chat-messages');
        var newBtn = document.getElementById('new-scenario-btn');

        document.getElementById('clear-display').addEventListener('click', function () {
            showClearViewConfirm(function () {
                chatMessages.innerHTML = '';
            });
        });

        document.getElementById('clear-all').addEventListener('click', function () {
            showClearAllConfirm(function () {
                chatMessages.innerHTML = '';
                localStorage.removeItem(SCENARIO_KEY);
            });
        });

        loadHistory(chatMessages);

        if (getHistory().length === 0) {
            generateScenario(chatMessages);
        }

        newBtn.addEventListener('click', function () {
            addDivider(chatMessages);
            generateScenario(chatMessages);
        });

        sendButton.addEventListener('click', function () {
            sendResponse(chatbox, chatMessages);
        });

        chatbox.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendResponse(chatbox, chatMessages);
            }
        });
    });

    function getHistory() {
        return JSON.parse(localStorage.getItem(SCENARIO_KEY) || '[]');
    }

    function saveMessage(role, content) {
        var history = getHistory();
        history.push({ role: role, content: content });
        localStorage.setItem(SCENARIO_KEY, JSON.stringify(history));
    }

    function loadHistory(container) {
        var history = getHistory();
        history.forEach(function (msg) {
            if (msg.role === 'assistant') {
                appendBubble('Marigold', msg.content, 'bot-message', container);
            } else if (msg.role === 'user' && msg.content !== GENERATE_MSG) {
                appendBubble('You', msg.content, 'user-message', container);
            }
        });
        container.scrollTop = container.scrollHeight;
    }

    function renderMarkdown(text) {
        var safe = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        function inlineFmt(s) {
            return s
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>');
        }

        var lines = safe.split('\n');
        var out = [];
        var inUl = false, inOl = false;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var ulM = line.match(/^[-*]\s+(.+)/);
            var olM = line.match(/^\d+\.\s+(.+)/);

            if (ulM) {
                if (inOl) { out.push('</ol>'); inOl = false; }
                if (!inUl) { out.push('<ul>'); inUl = true; }
                out.push('<li>' + inlineFmt(ulM[1]) + '</li>');
            } else if (olM) {
                if (inUl) { out.push('</ul>'); inUl = false; }
                if (!inOl) { out.push('<ol>'); inOl = true; }
                out.push('<li>' + inlineFmt(olM[1]) + '</li>');
            } else {
                if (inUl) { out.push('</ul>'); inUl = false; }
                if (inOl) { out.push('</ol>'); inOl = false; }
                out.push(line.trim() === '' ? '<br>' : inlineFmt(line) + '<br>');
            }
        }

        if (inUl) out.push('</ul>');
        if (inOl) out.push('</ol>');

        return out.join('').replace(/(<br>)+$/, '');
    }

    function appendBubble(sender, text, className, container) {
        var bubble = document.createElement('div');
        bubble.className = 'message-bubble ' + className;

        var senderEl = document.createElement('strong');
        senderEl.textContent = sender + ':';

        var textEl = document.createElement('span');
        textEl.className = 'message-text';
        if (className.indexOf('bot-message') !== -1) {
            textEl.innerHTML = renderMarkdown(text);
        } else {
            textEl.textContent = text;
        }

        bubble.appendChild(senderEl);
        bubble.appendChild(document.createTextNode(' '));
        bubble.appendChild(textEl);
        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
        return bubble;
    }

    function addDivider(container) {
        var div = document.createElement('div');
        div.className = 'scenario-divider';
        div.textContent = t('scenario_divider');
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    function parseGoalFromReply(reply) {
        var match = reply.match(/\[GOAL:\s*(.+?)\]/);
        if (match) {
            return {
                text: reply.replace(/\s*\[GOAL:\s*.+?\]/, '').trim(),
                goal: match[1].trim()
            };
        }
        return { text: reply, goal: null };
    }

    function showGoalSuggestion(bubble, goalText) {
        var row = document.createElement('div');
        row.className = 'goal-suggestion';

        var label = document.createElement('span');
        label.className = 'goal-suggest-label';
        label.textContent = t('goal_detected');

        var btn = document.createElement('button');
        btn.className = 'goal-suggest-btn';
        btn.textContent = t('add_to_goals') + goalText + '"';
        btn.addEventListener('click', function () {
            addGoalToPlanner(goalText);
            btn.textContent = t('added_to_goals');
            btn.disabled = true;
        });

        row.appendChild(label);
        row.appendChild(btn);
        bubble.appendChild(row);
        bubble.parentElement.scrollTop = bubble.parentElement.scrollHeight;
    }

    function addGoalToPlanner(text) {
        var goals = JSON.parse(localStorage.getItem(GOALS_KEY) || '[]');
        goals.push({
            id: Date.now().toString(),
            text: text.trim(),
            completed: false,
            locked: false,
            dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        });
        localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    }

    function clearUnlockedGoals() {
        var goals = JSON.parse(localStorage.getItem(GOALS_KEY) || '[]');
        localStorage.setItem(GOALS_KEY, JSON.stringify(goals.filter(function (g) { return !!g.locked; })));
    }

    function showClearViewConfirm(onConfirm) {
        var overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';

        var modal = document.createElement('div');
        modal.className = 'confirm-modal info';
        modal.innerHTML =
            '<h2 class="confirm-title">' + t('clear_view_title') + '</h2>' +
            '<p class="confirm-body">' + t('clear_view_body') + '</p>' +
            '<ul class="confirm-info-list">' +
                '<li>' + t('scenario_clear_view_li1') + '</li>' +
                '<li>' + t('clear_view_li2') + '</li>' +
            '</ul>' +
            '<p class="confirm-note">' + t('clear_view_note') + '</p>' +
            '<div class="confirm-buttons">' +
                '<button class="confirm-cancel-btn">' + t('confirm_cancel') + '</button>' +
                '<button class="confirm-view-btn">' + t('clear_view_btn') + '</button>' +
            '</div>';

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        modal.querySelector('.confirm-cancel-btn').addEventListener('click', function () {
            document.body.removeChild(overlay);
        });

        modal.querySelector('.confirm-view-btn').addEventListener('click', function () {
            document.body.removeChild(overlay);
            onConfirm();
        });

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) document.body.removeChild(overlay);
        });
    }

    function showClearAllConfirm(onConfirm) {
        var overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';

        var modal = document.createElement('div');
        modal.className = 'confirm-modal';
        modal.innerHTML =
            '<h2 class="confirm-title">' + t('clear_all_title') + '</h2>' +
            '<p class="confirm-body">' + t('clear_all_body') + '</p>' +
            '<ul class="confirm-list">' +
                '<li>' + t('scenario_clear_all_li1') + '</li>' +
                '<li>' + t('scenario_clear_all_li2') + '</li>' +
            '</ul>' +
            '<div class="confirm-buttons">' +
                '<button class="confirm-cancel-btn">' + t('confirm_cancel') + '</button>' +
                '<button class="confirm-delete-btn">' + t('clear_all_confirm_btn') + '</button>' +
            '</div>';

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        modal.querySelector('.confirm-cancel-btn').addEventListener('click', function () {
            document.body.removeChild(overlay);
        });

        modal.querySelector('.confirm-delete-btn').addEventListener('click', function () {
            document.body.removeChild(overlay);
            onConfirm();
        });

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) document.body.removeChild(overlay);
        });
    }

    async function generateScenario(container) {
        saveMessage('user', GENERATE_MSG);
        var lang = localStorage.getItem('marigold-lang') || 'en';
        var thinking = appendBubble('Marigold', t('scenario_generating'), 'bot-message', container);
        var messages = getHistory().map(function (m) { return { role: m.role, content: m.content }; });

        try {
            var res = await fetch(API_BASE + '/scenario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: messages, lang: lang })
            });
            var data = await res.json();
            var parsed = parseGoalFromReply(data.reply);
            thinking.querySelector('.message-text').innerHTML = renderMarkdown(parsed.text);
            saveMessage('assistant', parsed.text);
            if (parsed.goal) { showGoalSuggestion(thinking, parsed.goal); }
        } catch (err) {
            thinking.querySelector('.message-text').textContent = t('scenario_error');
        }
    }

    async function sendResponse(chatbox, container) {
        var message = chatbox.value.trim();
        if (!message) return;

        saveMessage('user', message);
        appendBubble('You', message, 'user-message', container);
        chatbox.value = '';

        var lang = localStorage.getItem('marigold-lang') || 'en';
        var thinking = appendBubble('Marigold', t('scenario_evaluating'), 'bot-message', container);
        var messages = getHistory().map(function (m) { return { role: m.role, content: m.content }; });

        try {
            var res = await fetch(API_BASE + '/scenario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: messages, lang: lang })
            });
            var data = await res.json();
            var parsed = parseGoalFromReply(data.reply);
            thinking.querySelector('.message-text').innerHTML = renderMarkdown(parsed.text);
            saveMessage('assistant', parsed.text);
            if (parsed.goal) { showGoalSuggestion(thinking, parsed.goal); }
        } catch (err) {
            thinking.querySelector('.message-text').textContent = t('scenario_error');
        }
    }
})();
