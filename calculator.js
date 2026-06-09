document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.calc-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.calc-tab').forEach(function (t) { t.classList.remove('active'); });
            document.querySelectorAll('.calc-panel').forEach(function (p) { p.classList.remove('active'); });
            tab.classList.add('active');
            document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
        });
    });

    document.getElementById('budget-calc-btn').addEventListener('click', calcBudget);
    document.getElementById('savings-calc-btn').addEventListener('click', calcSavings);
    document.getElementById('compound-calc-btn').addEventListener('click', calcCompound);
    document.getElementById('worth-calc-btn').addEventListener('click', calcWorth);

    document.querySelectorAll('.calc-input').forEach(function (input) {
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                var btn = input.closest('.calc-panel').querySelector('.calc-btn');
                if (btn) btn.click();
            }
        });
    });
});

function fmt(n) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcBudget() {
    var income = parseFloat(document.getElementById('budget-income').value);
    if (!income || income <= 0) return;
    document.getElementById('budget-needs').textContent = fmt(income * 0.50);
    document.getElementById('budget-wants').textContent = fmt(income * 0.30);
    document.getElementById('budget-savings').textContent = fmt(income * 0.20);
    document.getElementById('budget-result').classList.remove('hidden');
}

function calcSavings() {
    var goal = parseFloat(document.getElementById('savings-goal').value);
    var monthly = parseFloat(document.getElementById('savings-monthly').value);
    var rate = (parseFloat(document.getElementById('savings-rate').value) || 0) / 100 / 12;
    if (!goal || !monthly || goal <= 0 || monthly <= 0) return;

    var months = rate === 0
        ? Math.ceil(goal / monthly)
        : Math.ceil(Math.log(1 + (goal * rate) / monthly) / Math.log(1 + rate));

    var years = Math.floor(months / 12);
    var rem = months % 12;
    var timeStr = '';
    if (years > 0) timeStr += years + ' yr' + (years !== 1 ? 's' : '');
    if (years > 0 && rem > 0) timeStr += ' ';
    if (rem > 0) timeStr += rem + ' mo';
    if (!timeStr) timeStr = '< 1 mo';

    document.getElementById('savings-time').textContent = timeStr;
    document.getElementById('savings-months').textContent = months + ' month' + (months !== 1 ? 's' : '');
    document.getElementById('savings-result').classList.remove('hidden');
}

function calcCompound() {
    var principal = parseFloat(document.getElementById('compound-principal').value) || 0;
    var monthly = parseFloat(document.getElementById('compound-monthly').value) || 0;
    var r = (parseFloat(document.getElementById('compound-rate').value) || 0) / 100 / 12;
    var years = parseFloat(document.getElementById('compound-years').value);
    if (!years || years <= 0) return;

    var n = years * 12;
    var balance = r === 0
        ? principal + monthly * n
        : principal * Math.pow(1 + r, n) + monthly * (Math.pow(1 + r, n) - 1) / r;

    var contributed = principal + monthly * n;
    document.getElementById('compound-final').textContent = fmt(balance);
    document.getElementById('compound-contributed').textContent = fmt(contributed);
    document.getElementById('compound-interest').textContent = fmt(Math.max(0, balance - contributed));
    document.getElementById('compound-result').classList.remove('hidden');
}

function calcWorth() {
    var wage  = parseFloat(document.getElementById('worth-wage').value);
    var price = parseFloat(document.getElementById('worth-price').value);
    if (!wage || wage <= 0 || !price || price <= 0) return;

    // Hours / minutes
    var totalMins = (price / wage) * 60;
    var h = Math.floor(totalMins / 60);
    var m = Math.round(totalMins % 60);
    var timeStr = '';
    if (h > 0) timeStr += h + (h === 1 ? ' hour' : ' hours');
    if (h > 0 && m > 0) timeStr += ' and ';
    if (m > 0) timeStr += m + (m === 1 ? ' minute' : ' minutes');
    if (!timeStr) timeStr = 'less than a minute';

    // Work breakdown
    var hpwRaw  = parseFloat(document.getElementById('worth-hours').value);
    var dpwRaw  = parseFloat(document.getElementById('worth-days-per-week').value);
    var hpw     = (hpwRaw > 0) ? hpwRaw : 40;
    var dpw     = (dpwRaw > 0 && dpwRaw <= 7) ? dpwRaw : 5;
    var totalH  = price / wage;
    var days    = (totalH / (hpw / dpw)).toFixed(1);
    var weeks   = (totalH / hpw).toFixed(1);
    var months  = (totalH / hpw * 12 / 52).toFixed(2);
    var years   = (totalH / hpw / 52).toFixed(2);
    var noteParts = [];
    noteParts.push((hpwRaw > 0) ? hpwRaw + ' hrs/week' : '40 hrs/week (default)');
    noteParts.push((dpwRaw > 0 && dpwRaw <= 7) ? dpwRaw + '-day work week' : '5-day work week (default)');
    var note = 'Based on ' + noteParts.join(', ');

    document.getElementById('worth-time').textContent           = timeStr;
    document.getElementById('worth-days').textContent           = days   + ' days';
    document.getElementById('worth-weeks').textContent          = weeks  + ' weeks';
    document.getElementById('worth-months').textContent         = months + ' months';
    document.getElementById('worth-years').textContent          = years  + ' years';
    document.getElementById('worth-breakdown-note').textContent = note;
    document.getElementById('worth-result').classList.remove('hidden');
}
