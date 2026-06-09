const STORAGE_KEY = "marigold-chat-history";
const GOALS_KEY = "marigold-goals";
const EXPENSES_KEY = "marigold-expenses";

document.addEventListener("DOMContentLoaded", function () {
    const sendButton = document.getElementById("send-button");
    const chatbox = document.getElementById("chatbox");
    const chatMessages = document.getElementById("chat-messages");

    loadHistory(chatMessages);

    document.getElementById("clear-display").addEventListener("click", function () {
        showClearViewConfirm(function () {
            chatMessages.innerHTML = "";
        });
    });

    document.getElementById("clear-all").addEventListener("click", function () {
        showClearAllConfirm(function () {
            chatMessages.innerHTML = "";
            localStorage.removeItem(STORAGE_KEY);
            clearUnlockedGoals();
            clearUnlockedExpenses();
        });
    });

    sendButton.addEventListener("click", sendMessage);
    chatbox.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    async function sendMessage() {
        const message = chatbox.value.trim();
        if (!message) return;

        saveMessage("You", message, "user-message");
        appendBubble("You", message, "user-message", chatMessages, true);
        chatbox.value = "";

        const lang = localStorage.getItem("marigold-lang") || "en";
        const t = (window.MarigoldI18n && window.MarigoldI18n.TRANSLATIONS[lang]) || {};
        const thinkingText = t.chat_thinking || "Thinking…";
        const errorText = t.chat_error || "Sorry, I couldn't connect. Make sure the server is running!";

        const thinking = appendBubble("Marigold", thinkingText, "bot-message", chatMessages, true);

        const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        const messages = history.map(function (msg) {
            return {
                role: msg.sender === "You" ? "user" : "assistant",
                content: msg.text
            };
        });

        try {
            const response = await fetch(API_BASE + "/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: messages, lang: lang })
            });
            const data = await response.json();
            const parsed = parseReply(data.reply);
            const textEl = thinking.querySelector(".message-text");
            textEl.innerHTML = "";

            streamText(textEl, parsed.text, chatMessages, function () {
                saveMessage("Marigold", parsed.text, "bot-message");
                if (parsed.goal) { showGoalSuggestion(thinking, parsed.goal); }
                if (parsed.expense) { showExpenseSuggestion(thinking, parsed.expense); }
            });
        } catch (err) {
            thinking.querySelector(".message-text").textContent = errorText;
        }
    }
});

function streamText(el, fullText, container, onDone) {
    var total = fullText.length;
    if (total === 0) {
        if (onDone) onDone();
        return;
    }

    // Aim for ~8 seconds regardless of response length.
    // 50 ms per tick × (total / charsPerTick) ticks ≈ 8 s.
    var INTERVAL = 50;
    var charsPerTick = Math.max(1, Math.round(total / 165));

    var idx = 0;

    function tick() {
        if (idx >= total) {
            // Final render — clean markdown, no cursor
            el.innerHTML = renderMarkdown(fullText);
            container.scrollTop = container.scrollHeight;
            if (onDone) onDone();
            return;
        }

        idx = Math.min(idx + charsPerTick, total);
        el.innerHTML =
            renderMarkdown(fullText.slice(0, idx)) +
            '<span class="typing-cursor" aria-hidden="true">&#x2588;</span>';
        container.scrollTop = container.scrollHeight;
        setTimeout(tick, INTERVAL);
    }

    tick();
}

function loadHistory(container) {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    history.forEach(function (msg) {
        appendBubble(msg.sender, msg.text, msg.className, container, false);
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

function appendBubble(sender, text, className, container, animate) {
    const bubble = document.createElement("div");
    bubble.className = "message-bubble " + className;

    const senderEl = document.createElement("strong");
    senderEl.textContent = sender + ":";

    const textEl = document.createElement("span");
    textEl.className = "message-text";
    if (className.indexOf("bot-message") !== -1) {
        textEl.innerHTML = renderMarkdown(text);
    } else {
        textEl.textContent = text;
    }

    bubble.appendChild(senderEl);
    bubble.appendChild(document.createTextNode(" "));
    bubble.appendChild(textEl);
    container.appendChild(bubble);

    if (animate) {
        bubble.classList.add('bubble-animate-in');
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    } else {
        container.scrollTop = container.scrollHeight;
    }

    return bubble;
}

function saveMessage(sender, text, className) {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    history.push({ sender: sender, text: text, className: className });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function parseReply(reply) {
    var result = { text: reply, goal: null, expense: null };

    var goalMatch = reply.match(/\[GOAL:\s*(.+?)\]/);
    if (goalMatch) {
        result.text = result.text.replace(/\s*\[GOAL:\s*.+?\]/, "").trim();
        result.goal = goalMatch[1].trim();
    }

    var expMatch = reply.match(/\[EXPENSE:\s*([^|\]]+)\|([^|\]]+)\|([^\]]+)\]/);
    if (expMatch) {
        result.text = result.text.replace(/\s*\[EXPENSE:\s*[^\]]+\]/, "").trim();
        result.expense = {
            amount:      parseFloat(expMatch[1].trim()),
            type:        expMatch[2].trim().toLowerCase(),
            description: expMatch[3].trim()
        };
    }

    return result;
}

// Self-contained translations — no dependency on translations.js so caching never breaks these.
var CHAT_STRINGS = {
    en: {
        confirm_cancel:       'Cancel',
        clear_view_title:     'Clear View?',
        clear_view_body:      "This only clears the chat from your screen — don't worry!",
        clear_view_li1:       '✅ Your full chat history is saved',
        clear_view_li2:       "✅ Marigold's memory stays intact",
        clear_view_li3:       '✅ All your goals (locked and unlocked) are untouched',
        clear_view_li4:       '✅ Your Expense Tracker is untouched',
        clear_view_note:      "Only what's visible on screen will be cleared.",
        clear_view_btn:       'Clear View',
        clear_all_title:      'Clear Everything?',
        clear_all_body:       'This will permanently delete:',
        clear_all_li1:        'Your entire chat history',
        clear_all_li2:        "Marigold's memory of your conversation",
        clear_all_li3:        'All <strong>unlocked</strong> goals in your Goal Planner',
        clear_all_li4:        'All <strong>unlocked</strong> entries in your Expense Tracker',
        clear_all_note:       '🔒 Locked goals and expense entries will be kept.',
        clear_all_confirm_btn:'Yes, Clear All',
        goal_detected:        '💡 Goal detected:',
        add_to_goals:         '+ Add to Goal Planner: "',
        added_to_goals:       '✓ Added to Goal Planner!',
        transaction_detected: '💰 Transaction detected:',
        log_income:           'Income',
        log_expense:          'Expense',
        log_to_expenses:      '+ Log to Expense Tracker: ',
        added_to_expenses:    '✓ Added to Expense Tracker!'
    },
    es: {
        confirm_cancel:       'Cancelar',
        clear_view_title:     '¿Borrar Vista?',
        clear_view_body:      '¡Esto solo borra el chat de tu pantalla — no te preocupes!',
        clear_view_li1:       '✅ Tu historial completo de chat está guardado',
        clear_view_li2:       '✅ La memoria de Marigold permanece intacta',
        clear_view_li3:       '✅ Todas tus metas (bloqueadas y desbloqueadas) no se tocan',
        clear_view_li4:       '✅ Tu Rastreador de Gastos no se toca',
        clear_view_note:      'Solo se borrará lo que es visible en pantalla.',
        clear_view_btn:       'Borrar Vista',
        clear_all_title:      '¿Borrar Todo?',
        clear_all_body:       'Esto eliminará permanentemente:',
        clear_all_li1:        'Todo tu historial de chat',
        clear_all_li2:        'La memoria de Marigold de tu conversación',
        clear_all_li3:        'Todas las metas <strong>desbloqueadas</strong> en tu Planificador de Metas',
        clear_all_li4:        'Todas las entradas <strong>desbloqueadas</strong> en tu Rastreador de Gastos',
        clear_all_note:       '🔒 Las metas y entradas bloqueadas se conservarán.',
        clear_all_confirm_btn:'Sí, Borrar Todo',
        goal_detected:        '💡 Meta detectada:',
        add_to_goals:         '+ Agregar al Planificador de Metas: "',
        added_to_goals:       '✓ ¡Agregado al Planificador!',
        transaction_detected: '💰 Transacción detectada:',
        log_income:           'Ingreso',
        log_expense:          'Gasto',
        log_to_expenses:      '+ Registrar en Rastreador de Gastos: ',
        added_to_expenses:    '✓ ¡Agregado al Rastreador!'
    },
    fr: {
        confirm_cancel:       'Annuler',
        clear_view_title:     'Effacer la Vue ?',
        clear_view_body:      "Cela efface uniquement le chat de votre écran — ne vous inquiétez pas !",
        clear_view_li1:       '✅ Votre historique complet de chat est sauvegardé',
        clear_view_li2:       '✅ La mémoire de Marigold reste intacte',
        clear_view_li3:       '✅ Tous vos objectifs (verrouillés et déverrouillés) sont intacts',
        clear_view_li4:       '✅ Votre Suivi des Dépenses est intact',
        clear_view_note:      "Seul ce qui est visible à l'écran sera effacé.",
        clear_view_btn:       'Effacer la Vue',
        clear_all_title:      'Tout Effacer ?',
        clear_all_body:       'Cela supprimera définitivement :',
        clear_all_li1:        'Tout votre historique de chat',
        clear_all_li2:        'La mémoire de Marigold de votre conversation',
        clear_all_li3:        "Tous les objectifs <strong>déverrouillés</strong> dans votre Planificateur d'Objectifs",
        clear_all_li4:        'Toutes les entrées <strong>déverrouillées</strong> dans votre Suivi des Dépenses',
        clear_all_note:       '🔒 Les objectifs et entrées verrouillés seront conservés.',
        clear_all_confirm_btn:'Oui, Tout Effacer',
        goal_detected:        '💡 Objectif détecté :',
        add_to_goals:         "+ Ajouter au Planificateur d'Objectifs : \"",
        added_to_goals:       '✓ Ajouté au Planificateur !',
        transaction_detected: '💰 Transaction détectée :',
        log_income:           'Revenu',
        log_expense:          'Dépense',
        log_to_expenses:      '+ Enregistrer dans le Suivi des Dépenses : ',
        added_to_expenses:    '✓ Ajouté au Suivi !'
    }
};

function t(key) {
    var lang = localStorage.getItem("marigold-lang") || "en";
    var T = CHAT_STRINGS[lang] || CHAT_STRINGS.en;
    return T[key] !== undefined ? T[key] : (CHAT_STRINGS.en[key] !== undefined ? CHAT_STRINGS.en[key] : key);
}

function showGoalSuggestion(bubble, goalText) {
    const row = document.createElement("div");
    row.className = "goal-suggestion";

    const label = document.createElement("span");
    label.className = "goal-suggest-label";
    label.textContent = t("goal_detected");

    const btn = document.createElement("button");
    btn.className = "goal-suggest-btn";
    btn.textContent = t("add_to_goals") + goalText + '"';

    const scheduleBtn = document.createElement("button");
    scheduleBtn.className = "goal-suggest-btn goal-schedule-btn";
    scheduleBtn.textContent = "📅 Schedule";

    const dateRow = document.createElement("div");
    dateRow.className = "goal-schedule-row";
    dateRow.style.display = "none";

    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.className = "goal-schedule-date";
    dateInput.min = new Date().toISOString().split("T")[0];
    dateInput.value = new Date().toISOString().split("T")[0];

    const confirmBtn = document.createElement("button");
    confirmBtn.className = "goal-suggest-btn goal-schedule-confirm-btn";
    confirmBtn.textContent = "Add to Calendar";

    dateRow.appendChild(dateInput);
    dateRow.appendChild(confirmBtn);

    btn.addEventListener("click", function () {
        addGoalToPlanner(goalText, null);
        btn.textContent = t("added_to_goals");
        btn.disabled = true;
        scheduleBtn.style.display = "none";
        dateRow.style.display = "none";
    });

    scheduleBtn.addEventListener("click", function () {
        dateRow.style.display = dateRow.style.display === "none" ? "" : "none";
        if (dateRow.style.display !== "none") {
            bubble.parentElement.scrollTo({ top: bubble.parentElement.scrollHeight, behavior: 'smooth' });
        }
    });

    confirmBtn.addEventListener("click", function () {
        if (!dateInput.value) return;
        addGoalToPlanner(goalText, dateInput.value);
        confirmBtn.textContent = "✓ Added to Calendar!";
        confirmBtn.disabled = true;
        btn.disabled = true;
        scheduleBtn.style.display = "none";
    });

    row.appendChild(label);
    row.appendChild(btn);
    row.appendChild(scheduleBtn);
    bubble.appendChild(row);
    bubble.appendChild(dateRow);
    bubble.parentElement.scrollTo({ top: bubble.parentElement.scrollHeight, behavior: 'smooth' });
}

function addGoalToPlanner(text, dueDate) {
    var goals = JSON.parse(localStorage.getItem(GOALS_KEY) || "[]");
    goals.push({
        id: Date.now().toString(),
        text: text.trim(),
        completed: false,
        locked: false,
        dueDate: dueDate || null,
        dateAdded: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    });
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

function clearUnlockedGoals() {
    var goals = JSON.parse(localStorage.getItem(GOALS_KEY) || "[]");
    var locked = goals.filter(function (g) { return !!g.locked; });
    localStorage.setItem(GOALS_KEY, JSON.stringify(locked));
}

function clearUnlockedExpenses() {
    var list = JSON.parse(localStorage.getItem(EXPENSES_KEY) || "[]");
    var locked = list.filter(function (e) { return !!e.locked; });
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(locked));
}

function showExpenseSuggestion(bubble, expenseData) {
    var row = document.createElement("div");
    row.className = "expense-suggestion";

    var label = document.createElement("span");
    label.className = "expense-suggest-label";
    label.textContent = t("transaction_detected");

    var typeLabel = expenseData.type === "income" ? t("log_income") : t("log_expense");
    var btn = document.createElement("button");
    btn.className = "expense-suggest-btn";
    btn.textContent = t("log_to_expenses") + typeLabel + ' $' +
        parseFloat(expenseData.amount).toFixed(2) + ' — "' + expenseData.description + '"';
    btn.addEventListener("click", function () {
        addExpenseToTracker(expenseData);
        btn.textContent = t("added_to_expenses");
        btn.disabled = true;
    });

    row.appendChild(label);
    row.appendChild(btn);
    bubble.appendChild(row);
    bubble.parentElement.scrollTo({ top: bubble.parentElement.scrollHeight, behavior: 'smooth' });
}

function addExpenseToTracker(data) {
    var list = JSON.parse(localStorage.getItem(EXPENSES_KEY) || "[]");
    var today = new Date();
    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var dateStr = months[today.getMonth()] + " " + today.getDate() + ", " + today.getFullYear();
    var defaultCat = data.type === "income" ? "Other" : "Other";
    list.unshift({
        id:          Date.now().toString(),
        type:        data.type === "income" ? "income" : "expense",
        amount:      parseFloat(data.amount),
        category:    defaultCat,
        description: data.description || (data.type === "income" ? "Income" : "Expense"),
        date:        dateStr,
        locked:      false
    });
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(list));
}

function showClearViewConfirm(onConfirm) {
    var overlay = document.createElement("div");
    overlay.className = "confirm-overlay";

    var modal = document.createElement("div");
    modal.className = "confirm-modal info";
    modal.innerHTML =
        '<h2 class="confirm-title">' + t("clear_view_title") + '</h2>' +
        '<p class="confirm-body">' + t("clear_view_body") + '</p>' +
        '<ul class="confirm-info-list">' +
            '<li>' + t("clear_view_li1") + '</li>' +
            '<li>' + t("clear_view_li2") + '</li>' +
            '<li>' + t("clear_view_li3") + '</li>' +
            '<li>' + t("clear_view_li4") + '</li>' +
        '</ul>' +
        '<p class="confirm-note">' + t("clear_view_note") + '</p>' +
        '<div class="confirm-buttons">' +
            '<button class="confirm-cancel-btn">' + t("confirm_cancel") + '</button>' +
            '<button class="confirm-view-btn">' + t("clear_view_btn") + '</button>' +
        '</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    modal.querySelector(".confirm-cancel-btn").addEventListener("click", function () {
        document.body.removeChild(overlay);
    });

    modal.querySelector(".confirm-view-btn").addEventListener("click", function () {
        document.body.removeChild(overlay);
        onConfirm();
    });

    overlay.addEventListener("click", function (e) {
        if (e.target === overlay) document.body.removeChild(overlay);
    });
}

function showClearAllConfirm(onConfirm) {
    var overlay = document.createElement("div");
    overlay.className = "confirm-overlay";

    var modal = document.createElement("div");
    modal.className = "confirm-modal";
    modal.innerHTML =
        '<h2 class="confirm-title">' + t("clear_all_title") + '</h2>' +
        '<p class="confirm-body">' + t("clear_all_body") + '</p>' +
        '<ul class="confirm-list">' +
            '<li>' + t("clear_all_li1") + '</li>' +
            '<li>' + t("clear_all_li2") + '</li>' +
            '<li>' + t("clear_all_li3") + '</li>' +
            '<li>' + t("clear_all_li4") + '</li>' +
        '</ul>' +
        '<p class="confirm-note">' + t("clear_all_note") + '</p>' +
        '<div class="confirm-buttons">' +
            '<button class="confirm-cancel-btn">' + t("confirm_cancel") + '</button>' +
            '<button class="confirm-delete-btn">' + t("clear_all_confirm_btn") + '</button>' +
        '</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    modal.querySelector(".confirm-cancel-btn").addEventListener("click", function () {
        document.body.removeChild(overlay);
    });

    modal.querySelector(".confirm-delete-btn").addEventListener("click", function () {
        document.body.removeChild(overlay);
        onConfirm();
    });

    overlay.addEventListener("click", function (e) {
        if (e.target === overlay) document.body.removeChild(overlay);
    });
}
