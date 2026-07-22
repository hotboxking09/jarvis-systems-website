"use strict";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
if (navToggle && navLinks) {
  const closeNav = () => {
    navLinks.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  };
  navToggle.addEventListener("click", () => {
    const open = !navLinks.classList.contains("is-open");
    navLinks.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
  });
  navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeNav));
  document.addEventListener("keydown", (event) => event.key === "Escape" && closeNav());
}

document.querySelectorAll("a[aria-disabled='true']").forEach((link) => {
  link.addEventListener("click", (event) => event.preventDefault());
});

const reveals = document.querySelectorAll(".reveal");
if (reducedMotion || !("IntersectionObserver" in window)) {
  reveals.forEach((item) => item.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -7%" });
  reveals.forEach((item) => observer.observe(item));
}

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

async function loadUpdates() {
  const feed = document.getElementById("update-feed");
  if (!feed) return;
  // Release builds contain the complete update feed as static HTML so crawlers,
  // readers without JavaScript and assistive tools receive the same content.
  if (feed.querySelector(".update-entry")) return;
  try {
    const response = await fetch("data/updates.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const updates = Array.isArray(data) ? data : data.updates;
    if (!Array.isArray(updates)) throw new Error("Ungültiges Updateformat");
    feed.innerHTML = updates.map((entry) => `
      <article class="update-entry reveal is-visible">
        <time class="update-date" datetime="${escapeHtml(entry.date)}">${escapeHtml(entry.date.split("-").reverse().join("."))}</time>
        <div><h3><a href="/updates/${encodeURIComponent(entry.slug)}/">${escapeHtml(entry.title)}</a></h3><p>${escapeHtml(entry.summary)}</p><a class="text-link" href="/updates/${encodeURIComponent(entry.slug)}/">TECHNISCHEN BERICHT LESEN →</a></div>
        <span class="update-tag">${escapeHtml(entry.state || entry.code)}</span>
      </article>`).join("");
  } catch (error) {
    feed.innerHTML = "<p class='loading'>UPDATE-DATEN TEMPORÄR NICHT VERFÜGBAR.</p>";
  }
}
loadUpdates();

const livePanel = document.getElementById("live-engineering-signal");
if (livePanel) {
  const endpoint = (livePanel.dataset.endpoint || "").replace(/\/$/, "");
  const liveState = livePanel.querySelector(".live-link-state");
  const stateLabel = document.getElementById("live-state-label");
  const carrierLabel = document.getElementById("live-carrier-label");
  const values = {
    link: document.getElementById("live-link-value"),
    session: document.getElementById("live-session-value"),
    today: document.getElementById("live-today-value"),
    pulse: document.getElementById("live-pulse-value"),
    process: document.getElementById("live-process-value"),
    freshness: document.getElementById("live-freshness-value")
  };
  let signal = {
    online: false,
    pulse: 0,
    compute: 0,
    processes: 0,
    sessionSeconds: 0,
    todaySeconds: 0,
    freshnessSeconds: null,
    receivedAt: performance.now()
  };

  const duration = (seconds) => {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const remainder = safe % 60;
    return [hours, minutes, remainder].map((part) => String(part).padStart(2, "0")).join(":");
  };

  const setVisualState = (state, label, carrier) => {
    liveState.dataset.liveState = state;
    stateLabel.textContent = label;
    carrierLabel.textContent = carrier;
    values.link.textContent = label;
  };

  const updateReadouts = () => {
    const elapsed = signal.online ? Math.floor((performance.now() - signal.receivedAt) / 1000) : 0;
    values.session.textContent = duration(signal.sessionSeconds + elapsed);
    values.today.textContent = duration(signal.todaySeconds + elapsed);
    values.pulse.textContent = `${String(Math.round(signal.pulse)).padStart(3, "0")}%`;
    values.process.textContent = String(signal.processes).padStart(2, "0");
    values.freshness.textContent = signal.freshnessSeconds === null
      ? "--"
      : `${String(signal.freshnessSeconds + elapsed).padStart(2, "0")} SEC`;
  };

  const refreshSignal = async () => {
    if (!endpoint) {
      setVisualState("error", "BACKEND PENDING", "LIVE RELAY NOT CONNECTED");
      updateReadouts();
      return;
    }
    try {
      const response = await fetch(`${endpoint}/v1/status`, { cache: "no-store", mode: "cors" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const online = data.schema === 1 && data.codex_active === true && data.state === "engineering";
      signal = {
        online,
        pulse: online ? Math.min(100, Math.max(0, Number(data.pulse) || 0)) : 0,
        compute: online ? Math.min(100, Math.max(0, Number(data.compute) || 0)) : 0,
        processes: online ? Math.min(32, Math.max(0, Number(data.process_count) || 0)) : 0,
        sessionSeconds: online ? Math.max(0, Number(data.session_seconds) || 0) : 0,
        todaySeconds: Math.max(0, Number(data.active_seconds_today) || 0),
        freshnessSeconds: data.freshness_seconds === null ? null : Math.max(0, Number(data.freshness_seconds) || 0),
        receivedAt: performance.now()
      };
      setVisualState(
        online ? "online" : "offline",
        online ? "ENGINEERING LIVE" : "SYSTEM STANDBY",
        online ? "AUTHENTICATED CODEX CARRIER DETECTED" : "NO ACTIVE CODEX CARRIER"
      );
      updateReadouts();
    } catch {
      signal.online = false;
      signal.pulse = 0;
      signal.compute = 0;
      signal.processes = 0;
      setVisualState("error", "SIGNAL LOST", "PUBLIC RELAY TEMPORARILY UNREACHABLE");
      updateReadouts();
    }
  };

  const liveCanvas = document.getElementById("live-wave-canvas");
  if (liveCanvas) {
    const liveContext = liveCanvas.getContext("2d", { alpha: true });
    let liveWidth = 0;
    let liveHeight = 0;
    let liveFrame = 0;
    const resizeLiveCanvas = () => {
      const rectangle = liveCanvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      liveWidth = Math.max(1, rectangle.width);
      liveHeight = Math.max(1, rectangle.height);
      liveCanvas.width = Math.floor(liveWidth * ratio);
      liveCanvas.height = Math.floor(liveHeight * ratio);
      liveContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const trace = (center, color, phaseOffset, weight) => {
      const activity = signal.online ? (.13 + signal.pulse / 100) : .018;
      const compute = signal.online ? (.15 + signal.compute / 120) : .02;
      liveContext.beginPath();
      for (let x = 0; x <= liveWidth + 3; x += 3) {
        const normalized = x / Math.max(1, liveWidth);
        const carrier = Math.sin(normalized * 72 + liveFrame * (2.1 + weight) + phaseOffset);
        const voice = Math.sin(normalized * 19 - liveFrame * 1.3 + phaseOffset) * Math.sin(normalized * 5 + liveFrame * .21);
        const burst = Math.pow(Math.abs(Math.sin(normalized * 11 + liveFrame * .38 + phaseOffset)), 7);
        const amplitude = liveHeight * (.025 + activity * .105 + compute * burst * .06) * weight;
        const y = center + (carrier * .33 + voice * .67) * amplitude;
        if (x === 0) liveContext.moveTo(x, y); else liveContext.lineTo(x, y);
      }
      liveContext.strokeStyle = color;
      liveContext.lineWidth = signal.online ? 1.45 : .8;
      liveContext.shadowColor = color;
      liveContext.shadowBlur = signal.online ? 10 : 3;
      liveContext.stroke();
      liveContext.shadowBlur = 0;
    };
    const drawLiveSignal = () => {
      liveContext.clearRect(0, 0, liveWidth, liveHeight);
      liveFrame += reducedMotion ? 0 : .025;
      trace(liveHeight * .29, "rgba(79,244,255,.95)", 0, 1);
      trace(liveHeight * .5, "rgba(255,43,214,.85)", 1.8, .82);
      trace(liveHeight * .71, "rgba(255,49,89,.78)", 3.7, .68);
      const scan = (liveFrame * 90) % Math.max(1, liveWidth);
      liveContext.fillStyle = "rgba(104,255,178,.45)";
      liveContext.fillRect(scan, 0, 1, liveHeight);
      if (!reducedMotion) window.requestAnimationFrame(drawLiveSignal);
    };
    const liveObserver = new ResizeObserver(resizeLiveCanvas);
    liveObserver.observe(liveCanvas);
    resizeLiveCanvas();
    drawLiveSignal();
  }

  refreshSignal();
  window.setInterval(refreshSignal, 8000);
  window.setInterval(updateReadouts, 1000);
}

const canvas = document.getElementById("signal-canvas");
if (canvas && !reducedMotion) {
  const context = canvas.getContext("2d", { alpha: true });
  let width = 0;
  let height = 0;
  let ratio = 1;
  let nodes = [];
  let frame = 0;

  const resize = () => {
    ratio = Math.min(window.devicePixelRatio || 1, 1.7);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(65, Math.max(22, Math.floor(width / 30)));
    nodes = Array.from({ length: count }, (_, index) => ({
      x: (index / Math.max(1, count - 1)) * width,
      y: Math.random() * height,
      speed: .09 + Math.random() * .22,
      phase: Math.random() * Math.PI * 2,
      amplitude: 20 + Math.random() * 80
    }));
  };

  const draw = () => {
    context.clearRect(0, 0, width, height);
    frame += 0.008;
    context.lineWidth = .7;
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      node.y -= node.speed;
      if (node.y < -60) node.y = height + 60;
      const x = node.x + Math.sin(frame + node.phase) * node.amplitude;
      const next = nodes[(index + 5) % nodes.length];
      const nextX = next.x + Math.sin(frame + next.phase) * next.amplitude;
      const distance = Math.hypot(x - nextX, node.y - next.y);
      if (distance < Math.min(300, width * .22)) {
        const gradient = context.createLinearGradient(x, node.y, nextX, next.y);
        gradient.addColorStop(0, "rgba(79,244,255,.24)");
        gradient.addColorStop(1, "rgba(255,43,214,.08)");
        context.strokeStyle = gradient;
        context.beginPath();
        context.moveTo(x, node.y);
        context.lineTo(nextX, next.y);
        context.stroke();
      }
      context.fillStyle = index % 7 === 0 ? "rgba(255,43,214,.7)" : "rgba(79,244,255,.65)";
      context.fillRect(x - 1, node.y - 1, 2, 2);
    }
    window.requestAnimationFrame(draw);
  };

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  }, { passive: true });
  resize();
  draw();
}
