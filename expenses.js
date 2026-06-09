(function () {
    var EXPENSES_KEY = 'marigold-expenses';

    var EXPENSE_CATEGORIES = ['Food & Dining', 'Entertainment', 'Transportation', 'Shopping', 'Education', 'Health', 'Other'];
    var INCOME_CATEGORIES  = ['Allowance', 'Job / Work', 'Gift', 'Side Hustle', 'Other'];

    var EXPENSE_CAT_KEYS = {
        'Food & Dining':  'expense_cat_food',
        'Entertainment':  'expense_cat_entertainment',
        'Transportation': 'expense_cat_transportation',
        'Shopping':       'expense_cat_shopping',
        'Education':      'expense_cat_education',
        'Health':         'expense_cat_health',
        'Other':          'expense_cat_other'
    };
    var INCOME_CAT_KEYS = {
        'Allowance':   'income_cat_allowance',
        'Job / Work':  'income_cat_job',
        'Gift':        'income_cat_gift',
        'Side Hustle': 'income_cat_side',
        'Other':       'income_cat_other'
    };

    function getCategoryLabel(englishValue) {
        var lang = window.MarigoldI18n ? window.MarigoldI18n.getCurrentLang() : 'en';
        var t    = window.MarigoldI18n && window.MarigoldI18n.TRANSLATIONS ? window.MarigoldI18n.TRANSLATIONS[lang] : null;
        if (!t) return englishValue;
        var key = EXPENSE_CAT_KEYS[englishValue] || INCOME_CAT_KEYS[englishValue];
        return (key && t[key]) ? t[key] : englishValue;
    }
    var chartInstance      = null;

    document.addEventListener('DOMContentLoaded', function () {
        var container       = document.getElementById('expenses-list');
        if (!container) return;

        var amountInput     = document.getElementById('expense-amount');
        var typeExpenseBtn  = document.getElementById('type-expense');
        var typeIncomeBtn   = document.getElementById('type-income');
        var categorySelect  = document.getElementById('expense-category');
        var descInput       = document.getElementById('expense-desc');
        var dateInput       = document.getElementById('expense-date');
        var addBtn          = document.getElementById('expense-add-btn');

        dateInput.value  = todayISO();
        var selectedType = 'expense';

        function populateCategories(type) {
            var opts = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
            categorySelect.innerHTML = opts.map(function (o) {
                return '<option value="' + o + '">' + getCategoryLabel(o) + '</option>';
            }).join('');
        }

        populateCategories('expense');

        typeExpenseBtn.addEventListener('click', function () {
            selectedType = 'expense';
            typeExpenseBtn.classList.add('active');
            typeIncomeBtn.classList.remove('active');
            populateCategories('expense');
        });

        typeIncomeBtn.addEventListener('click', function () {
            selectedType = 'income';
            typeIncomeBtn.classList.add('active');
            typeExpenseBtn.classList.remove('active');
            populateCategories('income');
        });

        addBtn.addEventListener('click', function () {
            var amount = parseFloat(amountInput.value);
            if (!amount || amount <= 0) return;

            var desc    = descInput.value.trim() || categorySelect.value;
            var dateStr = dateInput.value || todayISO();

            addExpense({
                type:        selectedType,
                amount:      amount,
                category:    categorySelect.value,
                description: desc,
                date:        formatISO(dateStr)
            });

            amountInput.value = '';
            descInput.value   = '';
            dateInput.value   = todayISO();
            renderAll(container);
        });

        [amountInput, descInput].forEach(function (el) {
            el.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') addBtn.click();
            });
        });

        renderAll(container);
    });

    /* ── helpers ── */

    function todayISO() {
        var d  = new Date();
        var mm = String(d.getMonth() + 1).padStart(2, '0');
        var dd = String(d.getDate()).padStart(2, '0');
        return d.getFullYear() + '-' + mm + '-' + dd;
    }

    function formatISO(iso) {
        var p = iso.split('-');
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[parseInt(p[1]) - 1] + ' ' + parseInt(p[2]) + ', ' + p[0];
    }

    /* ── storage ── */

    function getExpenses() {
        return JSON.parse(localStorage.getItem(EXPENSES_KEY) || '[]');
    }

    function saveExpenses(list) {
        localStorage.setItem(EXPENSES_KEY, JSON.stringify(list));
    }

    function addExpense(data) {
        var list = getExpenses();
        list.unshift({
            id:          Date.now().toString(),
            type:        data.type,
            amount:      data.amount,
            category:    data.category,
            description: data.description,
            date:        data.date,
            locked:      false
        });
        saveExpenses(list);
    }

    /* ── rendering ── */

    function renderAll(container) {
        renderSummary();
        renderChart();
        renderList(container);
    }

    function renderSummary() {
        var list = getExpenses();

        var totalIncome = list
            .filter(function (e) { return e.type === 'income'; })
            .reduce(function (s, e) { return s + e.amount; }, 0);

        var totalExpenses = list
            .filter(function (e) { return e.type === 'expense'; })
            .reduce(function (s, e) { return s + e.amount; }, 0);

        var net = totalIncome - totalExpenses;

        document.getElementById('summary-income').textContent   = '$' + totalIncome.toFixed(2);
        document.getElementById('summary-expenses').textContent = '$' + totalExpenses.toFixed(2);

        var netEl       = document.getElementById('summary-net');
        netEl.textContent = (net >= 0 ? '+$' : '-$') + Math.abs(net).toFixed(2);
        netEl.className   = 'summary-value ' + (net >= 0 ? 'net-positive' : 'net-negative');
    }

    function renderChart() {
        var wrap   = document.getElementById('expense-chart-wrap');
        var canvas = document.getElementById('expense-chart');
        if (!wrap || !canvas) return;

        var list = getExpenses();
        if (list.length === 0) {
            wrap.style.display = 'none';
            if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
            return;
        }
        wrap.style.display = 'block';

        var totalIncome = list
            .filter(function (e) { return e.type === 'income'; })
            .reduce(function (s, e) { return s + e.amount; }, 0);
        var totalExpenses = list
            .filter(function (e) { return e.type === 'expense'; })
            .reduce(function (s, e) { return s + e.amount; }, 0);
        var net = totalIncome - totalExpenses;

        var isHC       = document.documentElement.classList.contains('high-contrast');
        var isDark     = document.documentElement.classList.contains('dark');
        var textColor  = isHC ? '#ffffff' : isDark ? '#FDE68A' : '#92400E';
        var gridColor  = isHC ? 'rgba(255,255,255,0.15)' : isDark ? 'rgba(245,158,11,0.12)' : 'rgba(217,119,6,0.1)';
        var netIsPos   = net >= 0;

        var barColors = isHC ? [
            'rgba(0,255,136,0.8)',
            'rgba(255,102,102,0.8)',
            netIsPos ? 'rgba(0,255,136,0.8)' : 'rgba(255,102,102,0.8)'
        ] : [
            'rgba(16,185,129,0.75)',
            'rgba(239,68,68,0.75)',
            netIsPos ? 'rgba(16,185,129,0.75)' : 'rgba(239,68,68,0.75)'
        ];
        var borderColors = isHC ? [
            '#00ff88', '#ff6666',
            netIsPos ? '#00ff88' : '#ff6666'
        ] : [
            '#10B981', '#EF4444',
            netIsPos ? '#10B981' : '#EF4444'
        ];

        if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

        chartInstance = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Income', 'Expenses', 'Net Balance'],
                datasets: [{
                    data: [totalIncome, totalExpenses, Math.abs(net)],
                    backgroundColor: barColors,
                    borderColor: borderColors,
                    borderWidth: 2,
                    borderRadius: 10,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                var idx = ctx.dataIndex;
                                if (idx === 2) {
                                    return (netIsPos ? '+$' : '-$') + Math.abs(net).toFixed(2);
                                }
                                return '$' + ctx.parsed.y.toFixed(2);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: textColor,
                            font: { family: 'Inter, Gill Sans, sans-serif', weight: '600', size: 13 }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: gridColor },
                        ticks: {
                            color: textColor,
                            font: { family: 'Inter, Gill Sans, sans-serif', size: 12 },
                            callback: function (v) { return '$' + v.toFixed(0); }
                        }
                    }
                }
            }
        });
    }

    function renderList(container) {
        var list = getExpenses();
        container.innerHTML = '';

        if (list.length === 0) {
            container.innerHTML = '<p class="expenses-empty">No transactions yet — add one above or let Marigold log one while you chat!</p>';
            return;
        }

        list.forEach(function (e) { container.appendChild(createItem(e, container)); });
    }

    function createItem(expense, container) {
        var isIncome = expense.type === 'income';
        var isLocked = !!expense.locked;

        var item = document.createElement('div');
        item.className = 'expense-item ' + (isIncome ? 'expense-item-income' : 'expense-item-expense');

        var typeTag = document.createElement('span');
        typeTag.className   = 'expense-type-tag ' + (isIncome ? 'tag-income' : 'tag-expense');
        typeTag.textContent = isIncome ? '+ Income' : '− Expense';

        var infoWrap = document.createElement('div');
        infoWrap.className = 'expense-info';

        var descEl = document.createElement('span');
        descEl.className   = 'expense-desc-text';
        descEl.textContent = expense.description;

        var catEl = document.createElement('span');
        catEl.className   = 'expense-cat-text';
        catEl.textContent = getCategoryLabel(expense.category);

        infoWrap.appendChild(descEl);
        infoWrap.appendChild(catEl);

        var amountEl = document.createElement('span');
        amountEl.className   = 'expense-amount ' + (isIncome ? 'amount-income' : 'amount-expense');
        amountEl.textContent = (isIncome ? '+' : '−') + '$' + expense.amount.toFixed(2);

        var dateEl = document.createElement('span');
        dateEl.className   = 'expense-date';
        dateEl.textContent = expense.date;

        var lockBtn = document.createElement('button');
        lockBtn.className   = 'goal-lock-btn';
        lockBtn.textContent = isLocked ? '🔒' : '🔓';
        lockBtn.title       = isLocked
            ? 'Locked — kept when Clear All runs. Click to unlock.'
            : 'Unlocked — deleted by Clear All. Click to lock.';
        lockBtn.addEventListener('click', function () {
            var list = getExpenses();
            var e    = list.find(function (x) { return x.id === expense.id; });
            if (e) e.locked = !e.locked;
            saveExpenses(list);
            renderList(container);
        });

        var delBtn = document.createElement('button');
        delBtn.className = 'goal-delete-btn';
        delBtn.innerHTML = '&times;';
        delBtn.title     = 'Remove transaction';
        delBtn.addEventListener('click', function () {
            saveExpenses(getExpenses().filter(function (x) { return x.id !== expense.id; }));
            renderAll(container);
        });

        item.appendChild(typeTag);
        item.appendChild(infoWrap);
        item.appendChild(amountEl);
        item.appendChild(dateEl);
        item.appendChild(lockBtn);
        item.appendChild(delBtn);
        return item;
    }
})();
