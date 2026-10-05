/* ============================================================
   Token 奖励卡片 · 交互逻辑
   ============================================================ */
(function () {
  "use strict";

  var TARGET = 100000000; // 1 亿 Token，改这里即可换金额
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(sel) { return document.querySelector(sel); }

  var overlay = $("#overlay");
  var card = $("#rewardCard");
  var tilt = $("#cardTilt");
  var amountEl = $("#amountValue");
  var subtitleEl = $("#cardSubtitle");
  var claimBtn = $("#claimBtn");
  var detailBtn = $("#detailBtn");
  var detailBox = $("#detailBox");
  var closeBtn = $("#closeBtn");
  var triggerBtn = $("#triggerBtn");
  var ruleLink = $("#ruleLink");
  var toast = $("#toast");

  var DEFAULT_SUBTITLE = subtitleEl.textContent;
  var isOpen = false;
  var claimed = false;
  var detailOpen = false;
  var countRAF = null;

  function fmt(n) { return n.toLocaleString("en-US"); }

  /* ---------------- 彩带 ---------------- */
  var canvas = $("#confetti");
  var ctx = canvas.getContext("2d");
  var COLORS = ["#7c5cff", "#4f8cff", "#22d3ee", "#f472b6", "#facc15", "#a3e635", "#fb923c"];
  var pieces = [];
  var confettiRAF = null;

  function fitCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", fitCanvas);
  fitCanvas();

  function spawn(x, y, count, power) {
    for (var i = 0; i < count; i++) {
      var angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1; // 向上扇形喷发
      var speed = power * (0.4 + Math.random() * 0.8);
      pieces.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 6 + Math.random() * 7,
        h: 8 + Math.random() * 10,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        shape: Math.random() < 0.25 ? "circle" : "rect",
        life: 0,
        ttl: 140 + Math.random() * 80,
        drag: 0.985,
        g: 0.16 + Math.random() * 0.08,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.1 + Math.random() * 0.15
      });
    }
    if (!confettiRAF) tickConfetti();
  }

  function tickConfetti() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    pieces = pieces.filter(function (p) { return p.life < p.ttl && p.y < window.innerHeight + 40; });

    for (var i = 0; i < pieces.length; i++) {
      var p = pieces[i];
      p.life++;
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.g;
      p.x += p.vx + Math.sin(p.wobble) * 1.2;
      p.wobble += p.wobbleSpeed;
      p.y += p.vy;
      p.rot += p.vr;

      var alpha = p.life > p.ttl - 30 ? (p.ttl - p.life) / 30 : 1;
      var squash = Math.sin(p.wobble * 2) * 0.6 + 1; // 翻转时的压扁效果

      ctx.save();
      ctx.globalAlpha = Math.max(alpha, 0);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, (-p.h / 2) * squash, p.w, p.h * squash);
      }
      ctx.restore();
    }

    if (pieces.length) {
      confettiRAF = requestAnimationFrame(tickConfetti);
    } else {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      confettiRAF = null;
    }
  }

  function burstFrom(el) {
    if (reducedMotion) return;
    var r = el.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height * 0.35;
    spawn(cx, cy, 90, 11);
    spawn(cx, cy, 50, 6);
  }

  /* ---------------- 数字滚动 ---------------- */
  function countUp(el, target, duration) {
    if (countRAF) cancelAnimationFrame(countRAF);
    if (reducedMotion) { el.textContent = fmt(target); return; }
    duration = duration || 1600;
    var t0 = performance.now();
    function frame(now) {
      var p = Math.min((now - t0) / duration, 1);
      var eased = 1 - Math.pow(2, -10 * p); // easeOutExpo
      el.textContent = fmt(Math.round(target * eased));
      if (p < 1) countRAF = requestAnimationFrame(frame);
      else { el.textContent = fmt(target); countRAF = null; }
    }
    countRAF = requestAnimationFrame(frame);
  }

  /* ---------------- 3D 视差倾斜 ---------------- */
  var curRx = 0, curRy = 0, tgtRx = 0, tgtRy = 0, tiltRAF = null;

  function tiltLoop() {
    tiltRAF = requestAnimationFrame(function () {
      curRx += (tgtRx - curRx) * 0.12;
      curRy += (tgtRy - curRy) * 0.12;
      tilt.style.transform =
        "perspective(900px) rotateX(" + curRx.toFixed(2) + "deg) rotateY(" + curRy.toFixed(2) + "deg)";
      if (Math.abs(tgtRx - curRx) > 0.01 || Math.abs(tgtRy - curRy) > 0.01) {
        tiltLoop();
      } else {
        tiltRAF = null;
      }
    });
  }
  tilt.addEventListener("mousemove", function (e) {
    if (reducedMotion) return;
    var r = tilt.getBoundingClientRect();
    tgtRy = ((e.clientX - r.left) / r.width - 0.5) * 10;
    tgtRx = -((e.clientY - r.top) / r.height - 0.5) * 8;
    if (!tiltRAF) tiltLoop();
  });
  tilt.addEventListener("mouseleave", function () {
    tgtRx = 0; tgtRy = 0;
    if (!tiltRAF) tiltLoop();
  });

  /* ---------------- 轻提示 ---------------- */
  var toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2600);
  }

  /* ---------------- 打开 / 关闭 ---------------- */
  function openCard() {
    if (isOpen) return;
    isOpen = true;
    claimed = false;
    detailOpen = false;

    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("locked");

    card.classList.remove("claimed");
    detailBox.classList.remove("open");
    detailBtn.textContent = "查看明细";
    claimBtn.disabled = false;
    claimBtn.classList.remove("done");
    claimBtn.textContent = "开心收下";
    subtitleEl.textContent = DEFAULT_SUBTITLE;
    amountEl.textContent = fmt(0);

    setTimeout(function () { burstFrom(card); }, 260);
    setTimeout(function () { countUp(amountEl, TARGET); }, 380);
  }

  function closeCard() {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("locked");
    triggerBtn.textContent = "🎁 再看一次弹窗";
  }

  closeBtn.addEventListener("click", closeCard);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeCard(); });
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeCard();
  });

  /* ---------------- 领取到账 ---------------- */
  claimBtn.addEventListener("click", function () {
    if (claimed) return;
    claimed = true;
    claimBtn.disabled = true;
    claimBtn.innerHTML = '<span class="spinner"></span>到账中…';

    setTimeout(function () {
      claimBtn.classList.add("done");
      claimBtn.textContent = "✓ 已到账";
      subtitleEl.textContent = "额度已存入账户余额，快去用起来吧！";
      burstFrom(claimBtn);
      showToast("🎉 100,000,000 Token 已存入余额");
    }, 900);
  });

  /* ---------------- 明细展开 ---------------- */
  detailBtn.addEventListener("click", function () {
    detailOpen = !detailOpen;
    detailBox.classList.toggle("open", detailOpen);
    detailBtn.textContent = detailOpen ? "收起明细" : "查看明细";
  });

  ruleLink.addEventListener("click", function (e) {
    e.preventDefault();
    showToast("规则：活动 Token 与付费额度共用，模型调用按量扣减");
  });

  triggerBtn.addEventListener("click", openCard);

  /* 进入页面自动弹一次，模拟真实领奖场景 */
  setTimeout(openCard, 600);
})();
