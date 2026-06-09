(function () {

    /* ────────────────────────────────────────
       PAGE TRANSITIONS
       CSS handles the enter animation (pageIn
       keyframe on body).  JS only needs to
       trigger the exit animation on link clicks.
    ──────────────────────────────────────── */
    document.addEventListener('click', function (e) {
        var link = e.target.closest('a[href]');
        if (!link) return;
        var href = link.getAttribute('href');
        if (!href || href.charAt(0) === '#' || href.indexOf('://') !== -1 || href.indexOf('//') === 0) return;

        e.preventDefault();
        document.body.classList.add('page-exit');
        setTimeout(function () {
            window.location.href = href;
        }, 230);
    });

    // When the browser restores a page from bfcache (back/forward navigation),
    // remove page-exit so the page isn't permanently invisible.
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) {
            document.body.classList.remove('page-exit');
        }
    });

    /* bg-canvas intentionally left empty */

    /* ────────────────────────────────────────
       TITLE SPARKLES
       Tiny ✦ glimmers that appear and vanish
       randomly over the "Marigold AI" title.
    ──────────────────────────────────────── */
    (function () {
        var titleEl  = document.querySelector('.topbar .title');
        var rightEl  = document.querySelector('.topbar');
        if (!titleEl || !rightEl) return;

        var CHARS  = ['✦', '✦', '✧', '✦', '⋆', '✦'];
        var COLORS = ['#ffffff', '#FDE68A', '#FBBF24', '#ffffff', '#FEF3C7', '#ffffff'];

        function spawn() {
            var el = document.createElement('span');
            el.className = 'topbar-sparkle';

            // Position over the title text, with a little overhang on each side
            var tw = titleEl.offsetWidth;
            var th = titleEl.offsetHeight;
            var tx = titleEl.offsetLeft;
            var ty = titleEl.offsetTop;

            el.style.left = (tx - 6 + Math.random() * (tw + 12)) + 'px';
            el.style.top  = (ty - 4 + Math.random() * (th +  8)) + 'px';

            var size = 7 + Math.random() * 11;
            el.style.fontSize = size + 'px';
            el.textContent    = CHARS[Math.floor(Math.random() * CHARS.length)];
            el.style.color    = COLORS[Math.floor(Math.random() * COLORS.length)];

            var dur = 0.65 + Math.random() * 0.85;
            el.style.animationDuration = dur + 's';

            rightEl.appendChild(el);
            setTimeout(function () {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, dur * 1000 + 80);

            setTimeout(spawn, 220 + Math.random() * 480);
        }

        // Start after the page-in animation finishes (~500 ms)
        setTimeout(spawn, 550);
    }());

    /* ────────────────────────────────────────
       TOPBAR: SHOOTING STARS + FLOWER OUTLINES
    ──────────────────────────────────────── */
    (function () {
        var topbar = document.querySelector('.topbar');
        if (!topbar) return;

        var canvas = document.createElement('canvas');
        canvas.id  = 'topbar-canvas';
        topbar.insertBefore(canvas, topbar.firstChild);
        var ctx = canvas.getContext('2d');

        /* ── Flower definitions — animated appear/disappear ── */
        var FLOWERS = [
            { xf:0.04, yf:0.50, sz:26, maxOp:0.09, rot: 0.30, phase:'waiting', age:0, op:0, fadeIn:0.9, visDur:2.5, fadeOut:0.8, waitDur:0.3 },
            { xf:0.14, yf:0.28, sz:16, maxOp:0.06, rot: 0.90, phase:'waiting', age:0, op:0, fadeIn:0.7, visDur:3.2, fadeOut:0.7, waitDur:1.2 },
            { xf:0.27, yf:0.68, sz:21, maxOp:0.07, rot:-0.40, phase:'waiting', age:0, op:0, fadeIn:1.0, visDur:2.8, fadeOut:0.9, waitDur:2.5 },
            { xf:0.42, yf:0.38, sz:14, maxOp:0.05, rot: 1.30, phase:'waiting', age:0, op:0, fadeIn:0.8, visDur:1.9, fadeOut:0.7, waitDur:0.8 },
            { xf:0.58, yf:0.62, sz:23, maxOp:0.07, rot:-0.70, phase:'waiting', age:0, op:0, fadeIn:1.1, visDur:3.5, fadeOut:1.0, waitDur:3.0 },
            { xf:0.72, yf:0.32, sz:17, maxOp:0.06, rot: 0.50, phase:'waiting', age:0, op:0, fadeIn:0.8, visDur:2.2, fadeOut:0.8, waitDur:1.8 },
            { xf:0.84, yf:0.58, sz:27, maxOp:0.08, rot:-0.20, phase:'waiting', age:0, op:0, fadeIn:1.2, visDur:4.0, fadeOut:1.0, waitDur:4.5 },
            { xf:0.94, yf:0.32, sz:15, maxOp:0.05, rot: 0.80, phase:'waiting', age:0, op:0, fadeIn:0.7, visDur:2.0, fadeOut:0.7, waitDur:2.2 },
        ];

        function updateFlower(f, dt) {
            f.age += dt;
            if (f.phase === 'waiting') {
                f.op = 0;
                if (f.age >= f.waitDur) { f.phase = 'in'; f.age = 0; }
            } else if (f.phase === 'in') {
                f.op = Math.min(1, f.age / f.fadeIn) * f.maxOp;
                if (f.age >= f.fadeIn) { f.phase = 'visible'; f.age = 0; }
            } else if (f.phase === 'visible') {
                f.op = f.maxOp;
                if (f.age >= f.visDur) { f.phase = 'out'; f.age = 0; }
            } else if (f.phase === 'out') {
                f.op = Math.max(0, 1 - f.age / f.fadeOut) * f.maxOp;
                if (f.age >= f.fadeOut) {
                    f.phase   = 'waiting';
                    f.age     = 0;
                    f.waitDur = 0.5 + Math.random() * 2.5;
                    f.visDur  = 1.5 + Math.random() * 3.5;
                }
            }
        }

        function drawFlower(f) {
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.rot);
            ctx.globalAlpha  = f.op;
            ctx.strokeStyle  = '#FEF3C7';
            ctx.lineWidth    = Math.max(0.7, f.sz * 0.055);
            ctx.lineCap      = 'round';
            ctx.lineJoin     = 'round';

            var petals = 5;
            var dist = f.sz * 0.38;
            var pw   = f.sz * 0.22;
            var ph   = f.sz * 0.37;

            for (var i = 0; i < petals; i++) {
                var a = (i / petals) * Math.PI * 2 - Math.PI / 2;
                ctx.save();
                ctx.rotate(a);
                ctx.translate(0, -dist);
                ctx.beginPath();
                ctx.ellipse(0, 0, pw, ph, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            ctx.beginPath();
            ctx.arc(0, 0, f.sz * 0.10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        /* ── Shooting stars ── */
        var stars = [];
        var timeSinceLast = 0;
        var nextSpawn     = 0.3;

        function spawnStar() {
            var speed = 170 + Math.random() * 140;
            var angle = 0.07 + Math.random() * 0.16;
            return {
                x:    Math.random() * canvas.width * 0.55,
                y:    Math.random() * canvas.height,
                vx:   Math.cos(angle) * speed,
                vy:   Math.sin(angle) * speed,
                len:  50 + Math.random() * 70,
                age:  0,
                life: 0.85 + Math.random() * 1.1,
                alive: true,
            };
        }

        function drawStar(s, dt) {
            s.age += dt;
            s.x   += s.vx * dt;
            s.y   += s.vy * dt;

            if (s.age >= s.life || s.x > canvas.width + 100) {
                s.alive = false;
                return;
            }

            var t  = s.age / s.life;
            var op = t < 0.2  ? t / 0.2
                   : t > 0.75 ? (1 - t) / 0.25
                   : 1.0;
            op = Math.max(0, Math.min(1, op));

            var mag = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
            var tx  = s.x - (s.vx / mag) * s.len;
            var ty  = s.y - (s.vy / mag) * s.len;

            var grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
            grad.addColorStop(0,    'rgba(255,252,210,' + (op * 0.95) + ')');
            grad.addColorStop(0.35, 'rgba(255,225,100,' + (op * 0.50) + ')');
            grad.addColorStop(1,    'rgba(255,200, 50,0)');

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(tx, ty);
            ctx.strokeStyle = grad;
            ctx.lineWidth   = 2;
            ctx.lineCap     = 'round';
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,245,' + op + ')';
            ctx.fill();
            ctx.restore();
        }

        /* ── Resize ── */
        function resize() {
            canvas.width  = topbar.offsetWidth;
            canvas.height = topbar.offsetHeight;
            FLOWERS.forEach(function (f) {
                f.x = f.xf * canvas.width;
                f.y = f.yf * canvas.height;
            });
        }
        window.addEventListener('resize', resize);
        resize();

        /* ── Animation loop ── */
        var lastTs = null;
        function loop(ts) {
            if (!lastTs) lastTs = ts;
            var dt = Math.min((ts - lastTs) / 1000, 0.05);
            lastTs = ts;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            FLOWERS.forEach(function (f) { updateFlower(f, dt); if (f.op > 0.001) drawFlower(f); });

            timeSinceLast += dt;
            if (timeSinceLast >= nextSpawn) {
                stars.push(spawnStar());
                timeSinceLast = 0;
                nextSpawn = 0.5 + Math.random() * 1.2;
            }

            for (var i = stars.length - 1; i >= 0; i--) {
                drawStar(stars[i], dt);
                if (!stars[i].alive) stars.splice(i, 1);
            }

            requestAnimationFrame(loop);
        }

        requestAnimationFrame(loop);
    }());

    /* ────────────────────────────────────────
       SIDEBAR: FALLING FLOWER OUTLINES
    ──────────────────────────────────────── */
    (function () {
        var sidebarEl      = document.getElementById('sidebar');
        var sidebarContent = sidebarEl && sidebarEl.querySelector('.sidebar-content');
        if (!sidebarContent) return;

        var sCanvas = document.createElement('canvas');
        sCanvas.id  = 'sidebar-canvas';
        sidebarContent.appendChild(sCanvas);
        var sCtx = sCanvas.getContext('2d');

        var FCOUNT = 30;
        var fallers = [];

        function makeFaller(startY) {
            var bx = 15 + Math.random() * 230;
            return {
                x:        bx,
                baseX:    bx,
                y:        startY !== undefined ? startY : (-20 - Math.random() * 60),
                sz:       11 + Math.random() * 17,
                maxOp:    0.10 + Math.random() * 0.08,
                op:       0,
                speed:    20 + Math.random() * 25,
                rot:      Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.55,
                wobble:   Math.random() * Math.PI * 2,
                wobbleSpd: 0.5 + Math.random() * 0.7,
                wobbleAmt: 8 + Math.random() * 12,
            };
        }

        function sResize() {
            sCanvas.width  = 260;
            sCanvas.height = sidebarEl.offsetHeight;
        }
        window.addEventListener('resize', sResize);
        sResize();

        for (var si = 0; si < FCOUNT; si++) {
            fallers.push(makeFaller(Math.random() * sCanvas.height));
        }

        function drawFaller(f) {
            sCtx.save();
            sCtx.translate(f.x, f.y);
            sCtx.rotate(f.rot);
            sCtx.globalAlpha = f.op;
            sCtx.strokeStyle = '#D97706';
            sCtx.lineWidth   = Math.max(0.7, f.sz * 0.055);
            sCtx.lineCap     = 'round';
            sCtx.lineJoin    = 'round';

            var petals = 5, dist = f.sz * 0.38, pw = f.sz * 0.22, ph = f.sz * 0.37;
            for (var pi = 0; pi < petals; pi++) {
                var a = (pi / petals) * Math.PI * 2 - Math.PI / 2;
                sCtx.save();
                sCtx.rotate(a);
                sCtx.translate(0, -dist);
                sCtx.beginPath();
                sCtx.ellipse(0, 0, pw, ph, 0, 0, Math.PI * 2);
                sCtx.stroke();
                sCtx.restore();
            }
            sCtx.beginPath();
            sCtx.arc(0, 0, f.sz * 0.10, 0, Math.PI * 2);
            sCtx.stroke();
            sCtx.restore();
        }

        var sLastTs = null;
        function sLoop(ts) {
            if (!sLastTs) sLastTs = ts;
            var dt = Math.min((ts - sLastTs) / 1000, 0.05);
            sLastTs = ts;

            sCtx.clearRect(0, 0, sCanvas.width, sCanvas.height);

            fallers.forEach(function (f) {
                f.y      += f.speed * dt;
                f.rot    += f.rotSpeed * dt;
                f.wobble += f.wobbleSpd * dt;
                f.x       = f.baseX + Math.sin(f.wobble) * f.wobbleAmt;

                var yFrac = f.y / sCanvas.height;
                if (yFrac < 0.12) {
                    f.op = (yFrac / 0.12) * f.maxOp;
                } else if (yFrac > 0.82) {
                    f.op = Math.max(0, (1 - yFrac) / 0.18) * f.maxOp;
                } else {
                    f.op = f.maxOp;
                }

                if (f.y > sCanvas.height + f.sz + 10) {
                    var nf = makeFaller();
                    f.x = nf.x; f.baseX = nf.baseX; f.y = nf.y;
                    f.sz = nf.sz; f.maxOp = nf.maxOp; f.speed = nf.speed;
                    f.rot = nf.rot; f.wobble = nf.wobble;
                }

                if (f.op > 0.005) drawFaller(f);
            });

            requestAnimationFrame(sLoop);
        }
        requestAnimationFrame(sLoop);
    }());

    /* ────────────────────────────────────────
       SIDEBAR BUTTON CANVAS ANIMATIONS
    ──────────────────────────────────────── */
    (function () {
        var sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        function initBtnCanvas(selector) {
            var el = sidebar.querySelector(selector);
            if (!el) return null;
            var c = document.createElement('canvas');
            c.className = 'btn-anim-canvas';
            el.insertBefore(c, el.firstChild);
            c.width  = 240;
            c.height = 90;
            return { c: c, ctx: c.getContext('2d'), el: el };
        }

        var tipsD = initBtnCanvas('.sidebar-tips-toggle');
        var scenD = initBtnCanvas('a[href="scenario.html"]');
        var goalD = initBtnCanvas('a[href="goals.html"]');
        var calcD = initBtnCanvas('a[href="calculator.html"]');
        var expD  = initBtnCanvas('a[href="expenses.html"]');
        var quizD = initBtnCanvas('a[href="quiz.html"]');

        /* ─── TIPS: floating light bulbs ─── */
        var tipsBulbs = [], tipsTimer = 0, tipsInt = 0.45;
        function makeBulb(c) {
            var fi = 0.22 + Math.random() * 0.18, vis = 0.45 + Math.random() * 0.55, fo = 0.20 + Math.random() * 0.18;
            return {
                x: 8 + Math.random() * (c.width - 16), y: 6 + Math.random() * (c.height - 12),
                sz: 9 + Math.random() * 8, age: 0, fi: fi, vis: vis, fo: fo,
                total: fi + vis + fo, maxOp: 0.32 + Math.random() * 0.18, op: 0,
            };
        }
        function drawTips(dt) {
            if (!tipsD) return;
            var c = tipsD.c, ctx = tipsD.ctx;
            ctx.clearRect(0, 0, c.width, c.height);
            tipsTimer += dt;
            if (tipsTimer >= tipsInt && tipsBulbs.length < 7) {
                tipsBulbs.push(makeBulb(c)); tipsTimer = 0;
                tipsInt = 0.35 + Math.random() * 0.65;
            }
            ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
            for (var i = tipsBulbs.length - 1; i >= 0; i--) {
                var b = tipsBulbs[i]; b.age += dt;
                if (b.age >= b.total) { tipsBulbs.splice(i, 1); continue; }
                b.op = b.age < b.fi ? (b.age / b.fi) * b.maxOp
                     : b.age < b.fi + b.vis ? b.maxOp
                     : Math.max(0, 1 - (b.age - b.fi - b.vis) / b.fo) * b.maxOp;
                ctx.save();
                ctx.globalAlpha = b.op;
                ctx.font = Math.round(b.sz) + 'px serif';
                ctx.fillText('💡', b.x, b.y);
                ctx.restore();
            }
        }

        /* ─── SCENARIO: arrows flying in from all directions ─── */
        var scenArrows = [];
        function makeScenArrow(w, h) {
            var angle = Math.random() * Math.PI * 2;
            var cos = Math.cos(angle), sin = Math.sin(angle);
            var x, y;
            if (Math.abs(cos) >= Math.abs(sin)) {
                x = cos > 0 ? -18 : w + 18;
                y = Math.random() * h;
            } else {
                x = Math.random() * w;
                y = sin > 0 ? -18 : h + 18;
            }
            return { x: x, y: y, vx: cos, vy: sin, angle: angle, spd: 28 + Math.random() * 32 };
        }
        (function () {
            for (var i = 0; i < 3; i++) {
                var a = makeScenArrow(240, 90);
                a.x += a.vx * i * 38;
                a.y += a.vy * i * 38;
                scenArrows.push(a);
            }
        }());
        function drawScenario(dt) {
            if (!scenD) return;
            var c = scenD.c, ctx = scenD.ctx, w = c.width, h = c.height;
            ctx.clearRect(0, 0, w, h);
            for (var i = 0; i < scenArrows.length; i++) {
                var a = scenArrows[i];
                a.x += a.vx * a.spd * dt;
                a.y += a.vy * a.spd * dt;
                if (a.x < -30 || a.x > w + 30 || a.y < -30 || a.y > h + 30) {
                    scenArrows[i] = makeScenArrow(w, h);
                    continue;
                }
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(a.angle);
                ctx.globalAlpha = 0.22;
                ctx.fillStyle = '#D97706';
                ctx.beginPath(); ctx.rect(-22, -3, 16, 6); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(10, 0); ctx.lineTo(-7, -7); ctx.lineTo(-7, 7);
                ctx.closePath(); ctx.fill();
                ctx.restore();
            }
        }

        /* ─── GOAL PLANNER: sliding ☀ ☽ 📆 ─── */
        var GOAL_CHARS = ['☀️', '🌙', '📆'];
        var goalItems = (function () {
            var items = [];
            for (var gi = 0; gi < 3; gi++) {
                items.push({
                    ch:  GOAL_CHARS[gi % GOAL_CHARS.length],
                    x:   -10 - gi * 38,
                    y:   10 + Math.random() * 70,
                    spd: 14 + Math.random() * 36,
                    sz:  15 + Math.random() * 5,
                    op:  0.30 + Math.random() * 0.15,
                });
            }
            return items;
        }());
        function drawGoal(dt) {
            if (!goalD) return;
            var c = goalD.c, ctx = goalD.ctx, w = c.width, h = c.height;
            ctx.clearRect(0, 0, w, h);
            ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
            goalItems.forEach(function (item) {
                item.x += item.spd * dt;
                if (item.x > w + 20) item.x = -20 - Math.random() * 60;
                ctx.save();
                ctx.globalAlpha = item.op;
                ctx.font = item.sz + 'px serif';
                ctx.fillText(item.ch, item.x, item.y);
                ctx.restore();
            });
        }

        /* ─── CALCULATOR: falling math symbols ─── */
        var MATH_SYMS = ['+', '−', '÷', '×'];
        var calcItems = [];
        function makeMathItem(randomY) {
            return {
                ch: MATH_SYMS[Math.floor(Math.random() * MATH_SYMS.length)],
                x: 8 + Math.random() * 224, y: randomY ? Math.random() * 90 : -14,
                spd: 15 + Math.random() * 18, sz: 11 + Math.random() * 9,
                op: 0.13 + Math.random() * 0.10,
            };
        }
        (function () { for (var i = 0; i < 8; i++) calcItems.push(makeMathItem(true)); }());
        function drawCalc(dt) {
            if (!calcD) return;
            var c = calcD.c, ctx = calcD.ctx, w = c.width, h = c.height;
            ctx.clearRect(0, 0, w, h);
            ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
            for (var i = 0; i < calcItems.length; i++) {
                var item = calcItems[i]; item.y += item.spd * dt;
                if (item.y > h + 14) { calcItems[i] = makeMathItem(false); continue; }
                ctx.save();
                ctx.globalAlpha = item.op;
                ctx.font = 'bold ' + Math.round(item.sz) + 'px monospace';
                ctx.fillStyle = '#92400E';
                ctx.fillText(item.ch, item.x, item.y);
                ctx.restore();
            }
        }

        /* ─── EXPENSE TRACKER: falling $ + animated zigzag ─── */
        var expOffset = 0;
        var expItems = [];
        function makeExpItem(randomY) {
            return {
                x: 8 + Math.random() * 224, y: randomY ? Math.random() * 90 : -14,
                spd: 12 + Math.random() * 14, sz: 10 + Math.random() * 7,
                op: 0.13 + Math.random() * 0.09,
            };
        }
        (function () { for (var i = 0; i < 5; i++) expItems.push(makeExpItem(true)); }());
        // Random-walk graph (stock-chart style, non-uniform heights)
        var EXP_GL = 360;
        var expGraph = (function () {
            var pts = [0.5], v = 0;
            for (var gi = 1; gi < EXP_GL; gi++) {
                v = v * 0.82 + (Math.random() - 0.48) * 0.10;
                pts.push(Math.max(0.06, Math.min(0.94, pts[gi - 1] + v)));
            }
            return pts;
        }());
        function drawExpense(dt) {
            if (!expD) return;
            var c = expD.c, ctx = expD.ctx, w = c.width, h = c.height;
            ctx.clearRect(0, 0, w, h);
            expOffset += 20 * dt;
            var pxPer = 4;
            var startI = Math.floor(expOffset / pxPer) % EXP_GL;
            var frac   = (expOffset / pxPer) - Math.floor(expOffset / pxPer);
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(-frac * pxPer, (1 - expGraph[startI]) * (h - 16) + 8);
            for (var xi = 0; xi <= Math.ceil(w / pxPer) + 2; xi++) {
                var idx = (startI + xi + 1) % EXP_GL;
                ctx.lineTo((xi + 1 - frac) * pxPer, (1 - expGraph[idx]) * (h - 16) + 8);
            }
            ctx.strokeStyle = '#D97706'; ctx.lineWidth = 3; ctx.globalAlpha = 0.32;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
            ctx.restore();
            ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
            for (var i = 0; i < expItems.length; i++) {
                var item = expItems[i]; item.y += item.spd * dt;
                if (item.y > h + 14) { expItems[i] = makeExpItem(false); continue; }
                ctx.save();
                ctx.globalAlpha = item.op;
                ctx.font = 'bold ' + Math.round(item.sz) + 'px sans-serif';
                ctx.fillStyle = '#D97706'; ctx.fillText('$', item.x, item.y);
                ctx.restore();
            }
        }

        /* ─── QUIZ CENTER: spinning stars ─── */
        var quizStars = [];
        (function () {
            for (var i = 0; i < 4; i++) {
                quizStars.push({
                    x: i * 60 + Math.random() * 30, y: 12 + Math.random() * 66,
                    spd: 26 + Math.random() * 18, rot: Math.random() * Math.PI * 2,
                    rotSpd: 1.8 + Math.random() * 2.0, sz: 7 + Math.random() * 6,
                    op: 0.18 + Math.random() * 0.10,
                });
            }
        }());
        function drawStarPath(ctx, x, y, r, rot) {
            var inner = r * 0.42;
            ctx.beginPath();
            for (var i = 0; i < 10; i++) {
                var ang = rot + (i * Math.PI / 5) - Math.PI / 2;
                var rad = i % 2 === 0 ? r : inner;
                var px = x + Math.cos(ang) * rad, py = y + Math.sin(ang) * rad;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
        }
        function drawQuiz(dt) {
            if (!quizD) return;
            var c = quizD.c, ctx = quizD.ctx, w = c.width, h = c.height;
            ctx.clearRect(0, 0, w, h);
            for (var si = 0; si < quizStars.length; si++) {
                var s = quizStars[si]; s.x += s.spd * dt; s.rot += s.rotSpd * dt;
                if (s.x > w + s.sz) { s.x = -s.sz; s.y = 10 + Math.random() * (h - 20); }
                ctx.save(); ctx.globalAlpha = s.op; ctx.fillStyle = '#FBBF24';
                drawStarPath(ctx, s.x, s.y, s.sz, s.rot); ctx.fill(); ctx.restore();
            }
        }

        /* ─── Shared loop ─── */
        var btnLastTs = null;
        function btnLoop(ts) {
            if (!btnLastTs) btnLastTs = ts;
            var dt = Math.min((ts - btnLastTs) / 1000, 0.05);
            btnLastTs = ts;
            drawTips(dt); drawScenario(dt); drawGoal(dt);
            drawCalc(dt); drawExpense(dt); drawQuiz(dt);
            requestAnimationFrame(btnLoop);
        }
        requestAnimationFrame(btnLoop);
    }());

    /* ────────────────────────────────────────
       SCROLL REVEAL
    ──────────────────────────────────────── */
    if (!('IntersectionObserver' in window)) return;

    var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    function initScrollReveal() {
        var selectors = [
            '.tip-page', '.tip-page-credit', '.PLA-tip-page',
            '.saving-tip-page', '.banking-tip-page',
            '.title-tip-page', '.PLA-title-tip-page',
            '.saving-title-tip-page', '.banking-title-tip-page',
            '.quiz-setup-card', '.tc-ready-card',
            '.result-card', '.worth-breakdown-card',
        ].join(',');

        var els = document.querySelectorAll(selectors);
        els.forEach(function (el, i) {
            var rect = el.getBoundingClientRect();
            var alreadyVisible = rect.top < window.innerHeight && rect.bottom > 0;

            el.classList.add('scroll-reveal');
            // Stagger elements that start on-screen with a short delay
            el.style.transitionDelay = alreadyVisible
                ? Math.min(i * 70, 350) + 'ms'
                : '0ms';

            if (alreadyVisible) {
                // Trigger via rAF so CSS transition fires properly
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        el.classList.add('revealed');
                    });
                });
            } else {
                revealObserver.observe(el);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScrollReveal);
    } else {
        initScrollReveal();
    }

    /* ────────────────────────────────────────
       QUIZ PAGE: SCROLL POP ANIMATIONS
    ──────────────────────────────────────── */
    (function () {
        var ROOT_OPTS = { root: null, rootMargin: '-56px 0px -16px 0px', threshold: 0.08 };

        function inViewport(el) {
            var vpH = window.innerHeight || document.documentElement.clientHeight;
            var r = el.getBoundingClientRect();
            return r.top < vpH - 56 && r.bottom > 56;
        }

        // Shared observer factory
        function makeObs(addCls, removeCls) {
            return new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) entry.target.classList.add(addCls);
                    else entry.target.classList.remove(addCls);
                });
            }, ROOT_OPTS);
        }

        // Attach pop animation to an element, optionally with a stagger delay.
        // Uses double-rAF for in-viewport elements so the browser paints the
        // hidden state (animCls) before transitioning to the visible state (inCls).
        function attachPop(el, animCls, inCls, obs, delayMs) {
            el.classList.add(animCls);
            if (delayMs) el.style.transitionDelay = delayMs + 'ms';
            obs.observe(el);
            if (delayMs) setTimeout(function () { el.style.transitionDelay = '0ms'; }, delayMs + 500);
            if (inViewport(el)) {
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        el.classList.add(inCls);
                    });
                });
            }
        }

        // Watch a container; apply pop to matching child elements as they are added
        function watchContainer(container, childSelector, animCls, inCls, obs, staggerMs) {
            if (!container) return;
            var mutObs = new MutationObserver(function (mutations) {
                mutations.forEach(function (m) {
                    m.addedNodes.forEach(function (node) {
                        if (node.nodeType !== 1) return;
                        if (!childSelector || node.matches(childSelector)) {
                            var idx = container.querySelectorAll(childSelector || '*').length - 1;
                            attachPop(node, animCls, inCls, obs, staggerMs ? Math.min(idx * staggerMs, 400) : 0);
                        }
                    });
                });
            });
            mutObs.observe(container, { childList: true });
            // Observe elements already in the DOM at load time
            var existing = container.querySelectorAll(childSelector || ':scope > *');
            existing.forEach(function (el, i) {
                attachPop(el, animCls, inCls, obs, staggerMs ? Math.min(i * staggerMs, 400) : 0);
            });
        }

        function initQuizAnims() {
            // ── 1. Hub: mode cards (opacity-only to preserve hover transform) ──
            var modeObs = makeObs('quiz-pop-in', 'quiz-pop-in');
            var modeGrid = document.querySelector('.quiz-mode-grid');
            if (modeGrid) {
                watchContainer(modeGrid, '.quiz-mode-card', 'quiz-pop-anim', 'quiz-pop-in', modeObs, 60);
            }

            // ── 2. Hub: in-progress card + completed quiz items ──
            var histObs = makeObs('quiz-pop-in', 'quiz-pop-in');
            watchContainer(document.getElementById('quiz-inprog-list'), null, 'quiz-pop-anim', 'quiz-pop-in', histObs, 0);
            watchContainer(document.getElementById('quiz-prev-list'),   null, 'quiz-pop-anim', 'quiz-pop-in', histObs, 55);

            // ── 3. Standard quiz: question cards (staggered) ──
            var qObs = makeObs('quiz-pop-in', 'quiz-pop-in');
            watchContainer(document.getElementById('quiz-question-list'), '.quiz-question-card', 'quiz-pop-anim', 'quiz-pop-in', qObs, 65);

            // ── 4. Spot-the-mistake questions ──
            var smObs = makeObs('quiz-pop-in', 'quiz-pop-in');
            watchContainer(document.getElementById('sm-question-list'), '.sm-question-card', 'quiz-pop-anim', 'quiz-pop-in', smObs, 65);

            // ── 5. Drag-and-drop cards ──
            var ddObs = makeObs('quiz-pop-in', 'quiz-pop-in');
            watchContainer(document.getElementById('dd-terms'), '.dd-term-card', 'quiz-pop-anim', 'quiz-pop-in', ddObs, 50);
            watchContainer(document.querySelector('.dd-defs-col'), '.dd-def-card', 'quiz-pop-anim', 'quiz-pop-in', ddObs, 50);

            // ── 6. Timed challenge review rows ──
            var tcObs = makeObs('quiz-pop-in', 'quiz-pop-in');
            watchContainer(document.getElementById('tc-review-list'), '.tc-review-row', 'quiz-pop-anim', 'quiz-pop-in', tcObs, 40);

            // ── 7. Page titles and section headers ──
            var titleObs = makeObs('quiz-pop-in', 'quiz-pop-in');
            var titleSelectors = [
                '.quiz-hub-header',
                '.quiz-hub-subtitle',
                '.quiz-page-header',
                '.quiz-page-subtitle',
                '.quiz-prev-header'
            ];
            titleSelectors.forEach(function (sel) {
                document.querySelectorAll(sel).forEach(function (el) {
                    var delay = (sel.indexOf('subtitle') !== -1 || sel.indexOf('prev-header') !== -1) ? 80 : 0;
                    attachPop(el, 'quiz-pop-anim', 'quiz-pop-in', titleObs, delay);
                });
            });

            // ── 8. Buttons ──
            var btnObs = makeObs('quiz-pop-in', 'quiz-pop-in');

            // Topic buttons — stagger within their row
            document.querySelectorAll('.quiz-topic-btn').forEach(function (el, i) {
                attachPop(el, 'quiz-pop-anim', 'quiz-pop-in', btnObs, i * 35);
            });

            // Count / difficulty buttons — separate stagger
            document.querySelectorAll('.quiz-count-btn, .tc-diff-btn').forEach(function (el, i) {
                attachPop(el, 'quiz-pop-anim', 'quiz-pop-in', btnObs, i * 35);
            });

            // Primary action buttons — no stagger needed
            document.querySelectorAll(
                '.quiz-generate-btn, .quiz-action-btn, .quiz-erase-all-btn, .tc-start-btn'
            ).forEach(function (el) {
                attachPop(el, 'quiz-pop-anim', 'quiz-pop-in', btnObs, 0);
            });
        }

        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initQuizAnims);
        else initQuizAnims();
    }());

    /* ────────────────────────────────────────
       GOALS PAGE: ITEM + CALENDAR SCROLL POP
    ──────────────────────────────────────── */
    (function () {
        // ── Goal items ──────────────────────────
        var goalsList = document.getElementById('goals-list');
        if (goalsList) {
            var itemObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('goal-item-popped');
                    } else {
                        entry.target.classList.remove('goal-item-popped');
                    }
                });
            }, {
                root: null,
                rootMargin: '-56px 0px -16px 0px',
                threshold: 0.08
            });

            function trackGoalItem(el) {
                var vpH = window.innerHeight || document.documentElement.clientHeight;
                var er  = el.getBoundingClientRect();
                var inView = er.top < vpH - 56 && er.bottom > 56;
                el.classList.add('goal-item-anim');
                if (inView) el.classList.add('goal-item-popped');
                itemObserver.observe(el);
            }

            var goalsMutObs = new MutationObserver(function (mutations) {
                mutations.forEach(function (m) {
                    m.addedNodes.forEach(function (node) {
                        if (node.nodeType === 1 && node.classList.contains('goal-item')) {
                            trackGoalItem(node);
                        }
                    });
                });
            });
            goalsMutObs.observe(goalsList, { childList: true });

            function initGoalItems() {
                goalsList.querySelectorAll('.goal-item').forEach(trackGoalItem);
            }
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initGoalItems);
            } else {
                initGoalItems();
            }
        }

        // ── Calendar widget ──────────────────────
        var calWidget = document.querySelector('.goal-calendar');
        if (calWidget) {
            var calObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('cal-widget-popped');
                    } else {
                        entry.target.classList.remove('cal-widget-popped');
                    }
                });
            }, {
                root: null,
                rootMargin: '-56px 0px -16px 0px',
                threshold: 0.08
            });

            function initCalWidget() {
                var vpH = window.innerHeight || document.documentElement.clientHeight;
                var er  = calWidget.getBoundingClientRect();
                var inView = er.top < vpH - 56 && er.bottom > 56;
                calWidget.classList.add('cal-widget-anim');
                if (inView) calWidget.classList.add('cal-widget-popped');
                calObserver.observe(calWidget);
            }
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initCalWidget);
            } else {
                initCalWidget();
            }
        }
    }());

    /* ────────────────────────────────────────
       CHAT BUBBLE BIDIRECTIONAL SCROLL POP
    ──────────────────────────────────────── */
    (function () {
        var chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        var bubbleObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('chat-popped');
                } else {
                    entry.target.classList.remove('chat-popped');
                }
            });
        }, {
            root: chatMessages,
            rootMargin: '-4px 0px -4px 0px',
            threshold: 0.12
        });

        function trackBubble(el) {
            // Check if already inside the visible scroll area
            var cr = chatMessages.getBoundingClientRect();
            var er = el.getBoundingClientRect();
            var inView = er.top < cr.bottom && er.bottom > cr.top;

            el.classList.add('chat-scroll-anim');
            if (inView) el.classList.add('chat-popped'); // prevent flash on visible elements
            bubbleObserver.observe(el);
        }

        // Watch for bubbles added dynamically (new messages)
        var mutObs = new MutationObserver(function (mutations) {
            mutations.forEach(function (m) {
                m.addedNodes.forEach(function (node) {
                    if (node.nodeType === 1 && node.classList.contains('message-bubble')) {
                        // Wait for bubble-animate-in (0.3s) to finish before taking over
                        setTimeout(function () { trackBubble(node); }, 350);
                    }
                });
            });
        });
        mutObs.observe(chatMessages, { childList: true });

        // Track any bubbles already in the DOM (restored from localStorage)
        function initChatBubbles() {
            chatMessages.querySelectorAll('.message-bubble').forEach(function (el) {
                trackBubble(el);
            });
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initChatBubbles);
        } else {
            initChatBubbles();
        }
    }());

}());
