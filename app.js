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
  try {
    const response = await fetch("data/updates.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const updates = Array.isArray(data) ? data : data.updates;
    if (!Array.isArray(updates)) throw new Error("Ungültiges Updateformat");
    feed.innerHTML = updates.map((entry) => `
      <article class="update-entry reveal is-visible">
        <time class="update-date" datetime="${escapeHtml(entry.date)}">${escapeHtml(entry.date.split("-").reverse().join("."))}</time>
        <div><h3>${escapeHtml(entry.title)}</h3><p>${escapeHtml(entry.summary)}</p></div>
        <span class="update-tag">${escapeHtml(entry.state || entry.code)}</span>
      </article>`).join("");
  } catch (error) {
    feed.innerHTML = "<p class='loading'>UPDATE-DATEN TEMPORÄR NICHT VERFÜGBAR.</p>";
  }
}
loadUpdates();

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
