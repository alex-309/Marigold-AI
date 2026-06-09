(function () {
    var sidebar  = document.getElementById('sidebar');
    var tab      = document.getElementById('sidebar-tab');
    if (!sidebar || !tab) return;

    // ── Backdrop overlay ────────────────────────────────────────────────────
    var backdrop = document.createElement('div');
    backdrop.id  = 'sidebar-backdrop';
    document.body.appendChild(backdrop);

    function openSidebar() {
        sidebar.classList.add('open');
        document.documentElement.classList.add('sidebar-open');
        backdrop.classList.add('visible');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        document.documentElement.classList.remove('sidebar-open');
        backdrop.classList.remove('visible');
    }

    tab.addEventListener('click', function () {
        if (sidebar.classList.contains('open')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    backdrop.addEventListener('click', closeSidebar);

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });

    // ── Restore open state from previous visit ──────────────────────────────
    if (sidebar.classList.contains('open')) {
        document.documentElement.classList.add('sidebar-open');
        backdrop.classList.add('visible');
    }

    var settingsSection = document.getElementById('sidebar-settings-section');
    if (settingsSection && localStorage.getItem('marigold-settings-open') === 'true') {
        settingsSection.classList.add('open');
    }

    var tipsSection = document.getElementById('sidebar-tips-section');
    if (tipsSection && localStorage.getItem('marigold-tips-open') === 'true') {
        tipsSection.classList.add('open');
    }

    // ── Active page highlight ────────────────────────────────────────────────
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    sidebar.querySelectorAll('.sidebar-nav-link, .tips-nav-item').forEach(function (link) {
        var href = (link.getAttribute('href') || '').split('/').pop();
        if (href && href === currentPage) {
            link.classList.add('snl-active');
        }
    });
}());
