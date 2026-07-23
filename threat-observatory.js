"use strict";

(() => {
  const consoleRoot = document.getElementById("observatory-console");
  const mapCanvas = document.getElementById("threat-map-canvas");
  const mapViewport = document.getElementById("threat-map-viewport");
  if (!consoleRoot || !mapCanvas || !mapViewport) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const context = mapCanvas.getContext("2d", { alpha: false });
  const spectrumCanvas = document.getElementById("threat-spectrum-canvas");
  const spectrumContext = spectrumCanvas?.getContext("2d", { alpha: true });
  const tooltip = document.getElementById("map-tooltip");
  const endpoint = (consoleRoot.dataset.apiEndpoint || "").replace(/\/$/, "");
  const layers = { infrastructure: true, threat: true, honeypot: true };
  const nodesByScreen = [];
  const threatsByScreen = [];
  const directsByScreen = [];
  let sensorByScreen = null;
  let width = 1;
  let height = 1;
  let ratio = 1;
  let frame = 0;
  let mapData = null;
  let infrastructure = null;
  let globalThreat = null;
  let honeypot = null;
  let staticMap = null;
  let infrastructureLayer = null;
  let animationHandle = 0;

  const number = new Intl.NumberFormat("de-CH");
  const clock = document.getElementById("threat-clock");
  const syncState = document.getElementById("threat-sync-state");
  const statusLabel = document.getElementById("map-status-label");
  const metricPublicTotal = document.getElementById("metric-public-total");
  const metricPublicRendered = document.getElementById("metric-public-rendered");
  const metricThreatSources = document.getElementById("metric-threat-sources");
  const metricDirectEvents = document.getElementById("metric-direct-events");
  const metricSensorState = document.getElementById("metric-sensor-state");
  const metricFreshness = document.getElementById("metric-freshness");
  const sensorState = document.getElementById("sensor-lock-state");
  const sensorCopy = document.getElementById("sensor-lock-copy");
  const threatFeed = document.getElementById("threat-feed");
  const feedMode = document.getElementById("feed-mode");
  const directHeroState = document.getElementById("direct-hero-state");
  const directIntegrityLight = document.getElementById("direct-integrity-light");
  const directIntegrityTitle = document.getElementById("direct-integrity-title");
  const directIntegrityCopy = document.getElementById("direct-integrity-copy");
  const directLedgerState = document.getElementById("direct-ledger-state");
  const directLedgerUpdated = document.getElementById("direct-ledger-updated");
  const directLedgerEvents = document.getElementById("direct-ledger-events");

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const updateClock = () => {
    if (clock) {
      clock.textContent = `${new Date().toLocaleTimeString("de-CH", {
        timeZone: "UTC", hour12: false
      })} UTC`;
    }
  };
  updateClock();
  window.setInterval(updateClock, 1000);

  const ageLabel = (timestamp) => {
    const time = Date.parse(timestamp || "");
    if (!Number.isFinite(time)) return "UNKNOWN";
    const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
    if (seconds < 60) return `${seconds} SEC`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} MIN`;
    const hours = Math.floor(minutes / 60);
    if (hours < 48) return `${hours} H`;
    return `${Math.floor(hours / 24)} D`;
  };

  const project = (position) => {
    const lon = Number(position?.[0]) || 0;
    const lat = Math.max(-86, Math.min(86, Number(position?.[1]) || 0));
    const paddingX = Math.max(22, width * 0.025);
    const paddingY = Math.max(38, height * 0.09);
    return [
      paddingX + ((lon + 180) / 360) * (width - paddingX * 2),
      paddingY + ((90 - lat) / 180) * (height - paddingY * 2)
    ];
  };

  const resizeCanvas = (canvas, ctx, targetWidth, targetHeight) => {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(targetWidth * pixelRatio));
    canvas.height = Math.max(1, Math.floor(targetHeight * pixelRatio));
    canvas.style.width = `${targetWidth}px`;
    canvas.style.height = `${targetHeight}px`;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    return pixelRatio;
  };

  const drawBackground = (ctx) => {
    const gradient = ctx.createRadialGradient(width * 0.52, height * 0.48, 10, width * 0.52, height * 0.48, width * 0.72);
    gradient.addColorStop(0, "#071923");
    gradient.addColorStop(0.54, "#030c13");
    gradient.addColorStop(1, "#010407");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(79,244,255,.07)";
    ctx.lineWidth = 1;
    for (let lon = -180; lon <= 180; lon += 20) {
      const [x] = project([lon, 0]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let lat = -80; lat <= 80; lat += 20) {
      const [, y] = project([0, lat]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,43,214,.12)";
    ctx.beginPath();
    const [, equator] = project([0, 0]);
    ctx.moveTo(0, equator);
    ctx.lineTo(width, equator);
    ctx.stroke();
  };

  const traceRing = (ctx, ring) => {
    ring.forEach((coordinate, index) => {
      const [x, y] = project(coordinate);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  };

  const rebuildStaticLayers = () => {
    if (!mapData || !infrastructure) return;
    staticMap = document.createElement("canvas");
    const mapContext = staticMap.getContext("2d", { alpha: false });
    resizeCanvas(staticMap, mapContext, width, height);
    drawBackground(mapContext);
    mapData.countries.forEach((country) => {
      mapContext.beginPath();
      country.polygons.forEach((polygon) => polygon.forEach((ring) => traceRing(mapContext, ring)));
      const fill = mapContext.createLinearGradient(0, 0, width, height);
      fill.addColorStop(0, "rgba(11,47,58,.78)");
      fill.addColorStop(0.55, "rgba(7,34,45,.86)");
      fill.addColorStop(1, "rgba(22,12,38,.78)");
      mapContext.fillStyle = fill;
      mapContext.fill("evenodd");
      mapContext.strokeStyle = "rgba(79,244,255,.20)";
      mapContext.lineWidth = 0.65;
      mapContext.stroke();
    });
    const vignette = mapContext.createRadialGradient(width / 2, height / 2, width * 0.2, width / 2, height / 2, width * 0.72);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,.44)");
    mapContext.fillStyle = vignette;
    mapContext.fillRect(0, 0, width, height);

    infrastructureLayer = document.createElement("canvas");
    const nodeContext = infrastructureLayer.getContext("2d", { alpha: true });
    resizeCanvas(infrastructureLayer, nodeContext, width, height);
    nodesByScreen.length = 0;
    infrastructure.nodes.forEach((node, index) => {
      const [x, y] = project(node.position);
      const anchor = node.anchor === true;
      const radius = anchor ? 1.9 : 0.75;
      nodeContext.fillStyle = anchor ? "rgba(255,43,214,.9)" : "rgba(79,244,255,.62)";
      nodeContext.shadowColor = anchor ? "#ff2bd6" : "#4ff4ff";
      nodeContext.shadowBlur = anchor ? 8 : 3;
      nodeContext.beginPath();
      nodeContext.arc(x, y, radius, 0, Math.PI * 2);
      nodeContext.fill();
      if (index % 5 === 0 || anchor) nodesByScreen.push({ x, y, node });
    });
    nodeContext.shadowBlur = 0;
  };

  const resize = () => {
    const rectangle = mapViewport.getBoundingClientRect();
    width = Math.max(320, rectangle.width);
    height = Math.max(420, rectangle.height);
    ratio = resizeCanvas(mapCanvas, context, width, height);
    if (spectrumCanvas && spectrumContext) {
      const spectrumRectangle = spectrumCanvas.getBoundingClientRect();
      resizeCanvas(spectrumCanvas, spectrumContext, Math.max(1, spectrumRectangle.width), Math.max(1, spectrumRectangle.height));
    }
    rebuildStaticLayers();
    if (reducedMotion) draw();
  };

  const curveControl = (start, end) => {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const length = Math.hypot(dx, dy);
    return [
      (start[0] + end[0]) / 2 - dy * Math.min(0.24, 80 / Math.max(1, length)),
      (start[1] + end[1]) / 2 + dx * Math.min(0.24, 80 / Math.max(1, length))
    ];
  };

  const drawArc = (ctx, start, end, color, progress = 1, widthValue = 1) => {
    const control = curveControl(start, end);
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.quadraticCurveTo(control[0], control[1], end[0], end[1]);
    ctx.strokeStyle = color;
    ctx.lineWidth = widthValue;
    ctx.setLineDash([5, 9]);
    ctx.lineDashOffset = -progress * 38;
    ctx.shadowColor = color;
    ctx.shadowBlur = 7;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
  };

  const drawAttackArc = (ctx, start, end, phase, severity) => {
    const color = severity === "high" ? "rgba(255,49,89,.98)" : "rgba(255,92,120,.9)";
    drawArc(ctx, start, end, color, frame + phase, severity === "high" ? 2 : 1.45);
    if (reducedMotion) return;
    const control = curveControl(start, end);
    for (let index = 0; index < 3; index += 1) {
      const progress = (frame * 0.34 + phase + index / 3) % 1;
      const inverse = 1 - progress;
      const x = inverse * inverse * start[0] + 2 * inverse * progress * control[0] + progress * progress * end[0];
      const y = inverse * inverse * start[1] + 2 * inverse * progress * control[1] + progress * progress * end[1];
      ctx.fillStyle = index === 0 ? "#ffffff" : color;
      ctx.shadowColor = color;
      ctx.shadowBlur = index === 0 ? 15 : 9;
      ctx.beginPath();
      ctx.arc(x, y, index === 0 ? 2.1 : 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  };

  const pulse = (ctx, x, y, color, phase, base = 2.2) => {
    const wave = reducedMotion ? 0.45 : (Math.sin(frame * 1.6 + phase) + 1) / 2;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(x, y, base + wave * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.55 * (1 - wave);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 7 + wave * 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  const drawSpectrum = () => {
    if (!spectrumCanvas || !spectrumContext || !infrastructure) return;
    const sw = spectrumCanvas.getBoundingClientRect().width;
    const sh = spectrumCanvas.getBoundingClientRect().height;
    const bins = new Array(72).fill(0);
    infrastructure.nodes.forEach((node) => {
      const index = Math.max(0, Math.min(bins.length - 1, Math.floor(((node.position[0] + 180) / 360) * bins.length)));
      bins[index] += 1;
    });
    const max = Math.max(...bins, 1);
    spectrumContext.clearRect(0, 0, sw, sh);
    spectrumContext.fillStyle = "rgba(3,13,20,.72)";
    spectrumContext.fillRect(0, 0, sw, sh);
    const bar = sw / bins.length;
    bins.forEach((value, index) => {
      const normalized = value / max;
      const h = Math.max(1, normalized * sh * 0.78);
      const gradient = spectrumContext.createLinearGradient(0, sh - h, 0, sh);
      gradient.addColorStop(0, "rgba(79,244,255,.95)");
      gradient.addColorStop(0.7, "rgba(20,116,145,.62)");
      gradient.addColorStop(1, "rgba(255,43,214,.20)");
      spectrumContext.fillStyle = gradient;
      spectrumContext.fillRect(index * bar, sh - h, Math.max(1, bar - 1), h);
    });
    const scan = ((frame * 36) % Math.max(1, sw));
    spectrumContext.fillStyle = "rgba(104,255,178,.65)";
    spectrumContext.fillRect(scan, 0, 1, sh);
  };

  const draw = () => {
    if (!staticMap) return;
    context.clearRect(0, 0, width, height);
    context.drawImage(staticMap, 0, 0, width * ratio, height * ratio, 0, 0, width, height);
    if (layers.infrastructure && infrastructureLayer) {
      context.drawImage(infrastructureLayer, 0, 0, width * ratio, height * ratio, 0, 0, width, height);
    }

    threatsByScreen.length = 0;
    if (layers.threat && globalThreat) {
      const threatHub = project([-25, 8]);
      globalThreat.observations.forEach((observation, index) => {
        if (!observation.position) return;
        const position = project(observation.position);
        drawArc(context, position, threatHub, "rgba(255,49,89,.34)", frame + index * 0.11, 0.75);
        pulse(context, position[0], position[1], "rgba(255,49,89,.95)", index * 0.65, 1.7);
        threatsByScreen.push({ x: position[0], y: position[1], observation });
      });
      pulse(context, threatHub[0], threatHub[1], "rgba(255,43,214,.9)", 1.2, 2.8);
      context.fillStyle = "rgba(255,173,239,.86)";
      context.font = "700 9px ui-monospace, monospace";
      context.letterSpacing = "1px";
      context.fillText("EXTERNAL THREAT CORRELATION", threatHub[0] + 13, threatHub[1] - 10);
    }

    sensorByScreen = null;
    directsByScreen.length = 0;
    if (layers.honeypot && honeypot?.sensor) {
      const sensor = project(honeypot.sensor.position);
      const status = honeypot.sensor.state;
      const color = status === "online"
        ? "rgba(104,255,178,.95)"
        : status === "offline"
          ? "rgba(255,49,89,.92)"
          : "rgba(255,212,95,.92)";
      const radius = Math.max(28, Math.min(62, width * 0.045));
      const glow = context.createRadialGradient(sensor[0], sensor[1], 0, sensor[0], sensor[1], radius);
      glow.addColorStop(0, status === "online" ? "rgba(104,255,178,.24)" : "rgba(255,212,95,.18)");
      glow.addColorStop(0.58, status === "online" ? "rgba(104,255,178,.06)" : "rgba(255,212,95,.04)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(sensor[0], sensor[1], radius, 0, Math.PI * 2);
      context.fill();
      pulse(context, sensor[0], sensor[1], color, 2.4, 2.6);
      context.fillStyle = color;
      context.font = "800 9px ui-monospace, monospace";
      const sensorLabel = status === "online"
        ? "JARVIS HONEYPOT // ONLINE"
        : status === "staged"
          ? "JARVIS HONEYPOT // STAGED"
          : status === "offline"
            ? "JARVIS HONEYPOT // OFFLINE"
            : "JARVIS HONEYPOT // PENDING";
      context.fillText(sensorLabel, sensor[0] + 14, sensor[1] + 4);
      sensorByScreen = { x: sensor[0], y: sensor[1], sensor: honeypot.sensor };

      if (status === "online" && Array.isArray(honeypot.events)) {
        const directSources = new Map();
        honeypot.events.forEach((event) => {
          if (!Array.isArray(event.position) || event.position.length !== 2) return;
          const key = `${event.source_alias}:${event.position.join(",")}`;
          const existing = directSources.get(key);
          if (existing) {
            existing.count += Number(event.count) || 1;
            existing.types.add(event.type);
            if (event.severity === "high") existing.severity = "high";
          } else {
            directSources.set(key, {
              ...event,
              count: Number(event.count) || 1,
              types: new Set([event.type])
            });
          }
        });
        [...directSources.values()].slice(0, 18).forEach((event, index) => {
          const source = project(event.position);
          drawAttackArc(context, source, sensor, index * 0.19, event.severity);
          pulse(context, source[0], source[1], "rgba(255,49,89,.98)", index, event.severity === "high" ? 2.6 : 2);
          context.fillStyle = "rgba(255,180,193,.88)";
          context.font = "800 8px ui-monospace, monospace";
          context.fillText(event.source_alias.replace("SRC-", ""), source[0] + 9, source[1] - 7);
          directsByScreen.push({ x: source[0], y: source[1], event });
        });
      }
    }
    drawSpectrum();
    frame += reducedMotion ? 0 : 0.022;
    if (!reducedMotion) animationHandle = window.requestAnimationFrame(draw);
  };

  const renderFeed = () => {
    if (!threatFeed || !globalThreat) return;
    const items = globalThreat.observations
      .filter((item) => item.position)
      .sort((a, b) => b.targets_reporting_scans - a.targets_reporting_scans)
      .slice(0, 12);
    threatFeed.innerHTML = items.map((item, index) => `
      <li>
        <span>${String(index + 1).padStart(2, "0")} // ${escapeHtml(item.country)}</span>
        <div><b>${escapeHtml(item.operator)}</b><small>${number.format(item.targets_reporting_scans)} meldende Ziele</small></div>
        <i aria-hidden="true"></i>
      </li>`).join("");
  };

  const renderDirectLedger = () => {
    if (!directLedgerEvents) return;
    const events = Array.isArray(honeypot?.events) ? honeypot.events : [];
    const state = honeypot?.sensor?.state || "pending";
    if (directLedgerState) {
      directLedgerState.textContent = state === "online"
        ? "AUTHENTICATED // LIVE"
        : state === "staged"
          ? "RECEIVER STAGED"
          : state === "offline"
            ? "SENSOR OFFLINE"
            : "SENSOR PENDING";
      directLedgerState.dataset.state = state;
    }
    if (directLedgerUpdated) {
      directLedgerUpdated.textContent = `LAST EVENT // ${ageLabel(honeypot?.last_direct_event)}`;
    }
    if (events.length === 0) {
      directLedgerEvents.innerHTML = `
        <li class="direct-ledger-empty">
          <span>00 // QUIET</span>
          <div><b>NO AUTHENTICATED DIRECT EVENTS IN BUFFER</b><small>Keine Aktivität wird erfunden. Der Feed bleibt ehrlich leer.</small></div>
        </li>`;
      return;
    }
    const safeSeverities = new Set(["info", "low", "medium", "high"]);
    directLedgerEvents.innerHTML = events.slice(0, 24).map((event, index) => {
      const severity = safeSeverities.has(event.severity) ? event.severity : "info";
      const location = event.country
        ? `${escapeHtml(event.country)}${Number.isInteger(event.asn) ? ` // AS${event.asn}` : ""}`
        : "REGION/ASN NOT SAFELY ENRICHED";
      const outcome = String(event.outcome || "observed").replaceAll("_", " ").toUpperCase();
      const time = Number.isFinite(Date.parse(event.time_window))
        ? new Date(event.time_window).toLocaleString("de-CH", {
          timeZone: "UTC",
          hour12: false,
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        })
        : "--";
      return `
        <li data-severity="${severity}">
          <span>${String(index + 1).padStart(2, "0")} // ${escapeHtml(severity.toUpperCase())}</span>
          <div class="direct-ledger-main">
            <b>${escapeHtml(event.source_alias || "SRC-UNKNOWN")} // ${escapeHtml(event.label || event.type)}</b>
            <small>${escapeHtml(location)} // ${escapeHtml(time)} UTC // ×${number.format(Number(event.count) || 1)}</small>
          </div>
          <div class="direct-ledger-outcome">
            <small>OUTCOME</small><b>${escapeHtml(outcome)}</b><em>HOST COMPROMISED // NO</em>
          </div>
          <i aria-hidden="true"></i>
        </li>`;
    }).join("");
  };

  const updateMetrics = () => {
    metricPublicTotal.textContent = number.format(infrastructure.available_connected_public);
    metricPublicRendered.textContent = number.format(infrastructure.rendered_sample);
    metricThreatSources.textContent = String(globalThreat.observations.length).padStart(2, "0");
    const directEvents = Number(honeypot.counts?.direct_events_24h ?? honeypot.events?.length ?? 0);
    metricDirectEvents.textContent = number.format(Math.max(0, directEvents));
    const state = honeypot.sensor?.state || "pending";
    const online = state === "online";
    const staged = state === "staged";
    const offline = state === "offline";
    metricSensorState.textContent = online
      ? "AUTHENTICATED SENSOR // 24H"
      : staged
        ? "SECURE UPLINK STAGED"
        : offline
          ? "SENSOR OFFLINE"
          : "UPLINK PENDING";
    metricFreshness.textContent = ageLabel(globalThreat.source_updated_at || globalThreat.generated_at);
    sensorState.textContent = online ? "ONLINE" : staged ? "STAGED" : offline ? "OFFLINE" : "PENDING";
    sensorState.dataset.state = online ? "online" : staged ? "staged" : offline ? "offline" : "pending";
    if (directHeroState) {
      directHeroState.textContent = online
        ? "AUTHENTICATED SENSOR // LIVE"
        : staged
          ? "SECURE UPLINK // STAGED"
          : offline
            ? "SENSOR // OFFLINE"
            : "SENSOR // PENDING";
      directHeroState.dataset.state = state;
    }
    if (directIntegrityLight) {
      directIntegrityLight.className = online ? "ok" : "pending";
    }
    if (directIntegrityTitle) {
      directIntegrityTitle.textContent = online
        ? "AUTHENTICATED DIRECT SENSOR FEED"
        : "DIRECT SENSOR FEED NOT LIVE";
    }
    if (directIntegrityCopy) {
      directIntegrityCopy.textContent = online
        ? "HMAC-signiert, streng schemageprüft und ohne öffentliche Rohdaten"
        : "Der öffentliche Zustand wird nicht vorgetäuscht; Snapshot bleibt als Fallback verfügbar";
    }
    sensorCopy.textContent = online
      ? "Der öffentliche Feed ist aktiv. Angezeigt werden ausschließlich täglich wechselnde Quellpseudonyme, Zeitfenster und – nur wenn sicher verfügbar – vergröberte Regionen."
      : staged
        ? "Der echte Sensor und der signierte Empfänger laufen im privaten Stagingmodus. Veröffentlichte Direkt-Ereignisse bleiben absichtlich null."
        : offline
          ? "Der Empfänger ist erreichbar, aber der Sensor-Heartbeat ist veraltet. Es werden keine Direkt-Ereignisse als live ausgegeben."
          : "Der sichere Empfänger ist vorbereitet. Bis zum authentifizierten Sensor-Heartbeat bleiben direkte Angriffslinien aus.";
    feedMode.textContent = "EXTERNAL FEED";
    statusLabel.textContent = online
      ? "VERIFIED SNAPSHOTS + AUTHENTICATED JARVIS FEED"
      : staged
        ? "VERIFIED SNAPSHOTS // SECURE SENSOR STAGED"
        : offline
          ? "VERIFIED SNAPSHOTS // SENSOR OFFLINE"
          : "VERIFIED SNAPSHOTS // JARVIS UPLINK PENDING";
    syncState.textContent = online
      ? "LIVE SENSOR + VERIFIED SNAPSHOTS"
      : "VERIFIED SNAPSHOTS LOADED";
  };

  const loadJson = async (url) => {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  };

  const loadData = async () => {
    try {
      [mapData, infrastructure, globalThreat, honeypot] = await Promise.all([
        loadJson("/assets/threat-world-map.json"),
        loadJson("/data/public-infrastructure-snapshot.json"),
        loadJson("/data/global-threat-snapshot.json"),
        loadJson("/data/honeypot-public-snapshot.json")
      ]);
      if (endpoint) {
        try {
          const live = await loadJson(`${endpoint}/v1/public/attacks`);
          if (live.schema === 1 && live.sensor && Array.isArray(live.events)) honeypot = live;
        } catch {
          syncState.textContent = "LIVE SENSOR UNREACHABLE // SNAPSHOT ACTIVE";
        }
      }
      updateMetrics();
      renderFeed();
      renderDirectLedger();
      resize();
      if (animationHandle) window.cancelAnimationFrame(animationHandle);
      draw();
    } catch (error) {
      syncState.textContent = "DATA INTEGRITY ERROR";
      statusLabel.textContent = "VERIFIED DATA UNAVAILABLE";
      threatFeed.innerHTML = "<li class='feed-loading'><span>DATA ERROR</span><b>SNAPSHOT COULD NOT BE VERIFIED</b></li>";
      console.error("Threat Observatory:", error);
    }
  };

  const refreshLive = async () => {
    if (!endpoint) return;
    try {
      const live = await loadJson(`${endpoint}/v1/public/attacks?refresh=${Date.now()}`);
      if (live.schema !== 1 || !live.sensor || !Array.isArray(live.events)) {
        throw new Error("invalid live schema");
      }
      honeypot = live;
      updateMetrics();
      renderDirectLedger();
      if (reducedMotion) draw();
    } catch {
      syncState.textContent = "LIVE SENSOR UNREACHABLE // LAST VERIFIED VIEW";
    }
  };

  document.querySelectorAll(".map-layer").forEach((button) => {
    button.addEventListener("click", () => {
      const layer = button.dataset.layer;
      if (!(layer in layers)) return;
      layers[layer] = !layers[layer];
      button.classList.toggle("is-active", layers[layer]);
      button.setAttribute("aria-pressed", String(layers[layer]));
      if (reducedMotion) draw();
    });
  });

  const nearest = (x, y) => {
    const candidates = [
      ...threatsByScreen.map((item) => ({ ...item, kind: "threat" })),
      ...directsByScreen.map((item) => ({ ...item, kind: "direct" })),
      ...(sensorByScreen ? [{ ...sensorByScreen, kind: "sensor" }] : []),
      ...nodesByScreen.map((item) => ({ ...item, kind: "node" }))
    ];
    let result = null;
    let best = 18;
    candidates.forEach((item) => {
      const distance = Math.hypot(item.x - x, item.y - y);
      if (distance < best) {
        best = distance;
        result = item;
      }
    });
    return result;
  };

  const showTooltip = (event) => {
    if (!tooltip) return;
    const rectangle = mapCanvas.getBoundingClientRect();
    const x = event.clientX - rectangle.left;
    const y = event.clientY - rectangle.top;
    const item = nearest(x, y);
    if (!item) {
      tooltip.hidden = true;
      return;
    }
    let content = "";
    if (item.kind === "direct") {
      const direct = item.event;
      const network = Number.isInteger(direct.asn) ? `AS${direct.asn}` : "ASN N/A";
      content = `<b>DIRECT JARVIS SENSOR EVENT</b><span>${escapeHtml(direct.source_alias)}</span><small>${escapeHtml(direct.country || "REGION N/A")} // ${escapeHtml(network)} // ×${number.format(direct.count)}<br>${escapeHtml([...direct.types].join(" + ").toUpperCase())}<br>COARSE 2° CELL — NO RAW IP</small>`;
    } else if (item.kind === "threat") {
      const observation = item.observation;
      content = `<b>GLOBAL THREAT OBSERVATION</b><span>${escapeHtml(observation.operator)}</span><small>${escapeHtml(observation.country)} // ${number.format(observation.targets_reporting_scans)} meldende Ziele<br>EXTERNAL FEED — NOT A DIRECT JARVIS HIT</small>`;
    } else if (item.kind === "sensor") {
      content = `<b>JARVIS HONEYPOT</b><span>${escapeHtml(item.sensor.region)}</span><small>${escapeHtml(item.sensor.state.toUpperCase())} // POSITION INTENTIONALLY APPROXIMATE</small>`;
    } else {
      content = `<b>RIPE ATLAS NODE</b><span>PROBE ${item.node.id}</span><small>${escapeHtml(item.node.country)} // ${item.node.anchor ? "PUBLIC ANCHOR" : "PUBLIC MEASUREMENT PROBE"}<br>LOCATION OBFUSCATED BY SOURCE</small>`;
    }
    tooltip.innerHTML = content;
    tooltip.hidden = false;
    const maxX = rectangle.width - Math.min(270, rectangle.width * 0.75);
    tooltip.style.left = `${Math.max(8, Math.min(maxX, x + 14))}px`;
    tooltip.style.top = `${Math.max(8, Math.min(rectangle.height - 110, y + 14))}px`;
  };

  mapViewport.addEventListener("pointermove", showTooltip);
  mapViewport.addEventListener("pointerleave", () => {
    if (tooltip) tooltip.hidden = true;
  });
  mapViewport.addEventListener("pointerdown", showTooltip);

  const observer = new ResizeObserver(resize);
  observer.observe(mapViewport);
  loadData();
  window.setInterval(refreshLive, 30_000);
})();
