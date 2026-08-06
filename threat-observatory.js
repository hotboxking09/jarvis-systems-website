"use strict";

(() => {
  const consoleRoot = document.getElementById("observatory-console");
  const mapCanvas = document.getElementById("threat-map-canvas");
  const mapViewport = document.getElementById("threat-map-viewport");
  if (!consoleRoot || !mapCanvas || !mapViewport) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const hardwareConcurrency = Number(navigator.hardwareConcurrency) || 4;
  const balancedRendering = coarsePointer || hardwareConcurrency <= 4;
  const globePixelRatioCap = balancedRendering ? 1.25 : 1.6;
  const frameInterval = 1000 / (balancedRendering ? 30 : 45);
  const context = mapCanvas.getContext("2d", { alpha: false });
  const globeCanvas = document.getElementById("threat-globe-canvas");
  const globeGl = globeCanvas?.getContext("webgl2", {
    alpha: false,
    antialias: !balancedRendering,
    depth: true,
    powerPreference: "high-performance"
  }) || null;
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
  let spectrumLayer = null;
  let animationHandle = 0;
  let staticRebuildHandle = 0;
  let tooltipHandle = 0;
  let queuedTooltipPoint = null;
  let lastFrameTimestamp = 0;
  let lastSpectrumTimestamp = 0;
  let screenTargetsDirty = true;
  let viewMode = "analysis";
  let timeRangeHours = 24;
  let behaviorFilter = "all";
  let typeFilter = "all";
  let confidenceFilter = "all";
  let countryFilter = "all";
  let asnFilter = null;
  let selectedDirect = null;
  let camera = { zoom: 1, panX: 0, panY: 0, rotation: 0 };
  let drag = null;
  let pinch = null;
  const activePointers = new Map();
  let globeRenderer = null;

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
  const behaviorSelect = document.getElementById("behavior-filter");
  const typeSelect = document.getElementById("type-filter");
  const confidenceSelect = document.getElementById("confidence-filter");
  const countrySelect = document.getElementById("country-filter");
  const asnInput = document.getElementById("asn-filter");
  const zoomInButton = document.getElementById("map-zoom-in");
  const zoomOutButton = document.getElementById("map-zoom-out");
  const dnaCanvas = document.getElementById("threat-dna-canvas");
  const dnaContext = dnaCanvas?.getContext("2d", { alpha: true });
  const dnaState = document.getElementById("threat-dna-state");
  const dnaDetails = document.getElementById("threat-dna-details");
  const storyState = document.getElementById("session-story-state");
  const storyEvents = document.getElementById("session-story-events");
  const proofState = document.getElementById("proof-state");
  const proofContract = document.getElementById("proof-contract");
  const proofChain = document.getElementById("proof-chain");
  const proofPrivacy = document.getElementById("proof-privacy");
  const proofFreshness = document.getElementById("proof-freshness");

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const createGlobeRenderer = (gl) => {
    const vertexSource = `#version 300 es
      in vec3 aPosition;
      uniform float uRotation;
      uniform vec2 uScale;
      uniform vec2 uPan;
      uniform float uPointSize;
      uniform float uTime;
      void main() {
        float c = cos(uRotation);
        float s = sin(uRotation);
        vec3 p = vec3(aPosition.x * c + aPosition.z * s, aPosition.y, aPosition.z * c - aPosition.x * s);
        gl_Position = vec4(p.x * uScale.x + uPan.x, p.y * uScale.y + uPan.y, -p.z, 1.0);
        gl_PointSize = uPointSize * (1.0 + 0.16 * sin(uTime * 2.2 + aPosition.x * 11.0));
      }`;
    const fragmentSource = `#version 300 es
      precision highp float;
      uniform vec4 uColor;
      uniform bool uPoint;
      out vec4 outColor;
      void main() {
        if (uPoint) {
          vec2 q = gl_PointCoord - vec2(0.5);
          float distanceFromCenter = length(q);
          if (distanceFromCenter > 0.5) discard;
          float glow = 1.0 - smoothstep(0.08, 0.5, distanceFromCenter);
          outColor = vec4(uColor.rgb, uColor.a * max(0.24, glow));
        } else {
          outColor = uColor;
        }
      }`;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || "shader compile failed");
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "shader link failed");
    const location = {
      position: gl.getAttribLocation(program, "aPosition"),
      rotation: gl.getUniformLocation(program, "uRotation"),
      scale: gl.getUniformLocation(program, "uScale"),
      pan: gl.getUniformLocation(program, "uPan"),
      pointSize: gl.getUniformLocation(program, "uPointSize"),
      time: gl.getUniformLocation(program, "uTime"),
      color: gl.getUniformLocation(program, "uColor"),
      point: gl.getUniformLocation(program, "uPoint")
    };
    const buffers = new Map();
    const sphere = (position, radius = 1) => {
      const longitude = Number(position?.[0] || 0) * Math.PI / 180;
      const latitude = Number(position?.[1] || 0) * Math.PI / 180;
      return [
        Math.cos(latitude) * Math.sin(longitude) * radius,
        Math.sin(latitude) * radius,
        Math.cos(latitude) * Math.cos(longitude) * radius
      ];
    };
    const segments = (positions) => {
      const output = [];
      for (let index = 1; index < positions.length; index += 1) output.push(...positions[index - 1], ...positions[index]);
      return output;
    };
    const arc = (start, end, steps = 28) => {
      const a = sphere(start);
      const b = sphere(end);
      const points = [];
      for (let index = 0; index <= steps; index += 1) {
        const t = index / steps;
        const x = a[0] * (1 - t) + b[0] * t;
        const y = a[1] * (1 - t) + b[1] * t;
        const z = a[2] * (1 - t) + b[2] * t;
        const length = Math.hypot(x, y, z) || 1;
        const lift = 1.015 + Math.sin(Math.PI * t) * .16;
        points.push([x / length * lift, y / length * lift, z / length * lift]);
      }
      return segments(points);
    };
    const setBuffer = (name, data) => {
      const prior = buffers.get(name);
      const buffer = prior?.buffer || gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      buffers.set(name, { buffer, count: data.length / 3 });
    };
    const build = (world, nodes, threat, sensorSnapshot) => {
      const surface = [];
      const latitudes = 28;
      const longitudes = 56;
      for (let lat = 0; lat < latitudes; lat += 1) {
        const latA = -90 + lat * 180 / latitudes;
        const latB = -90 + (lat + 1) * 180 / latitudes;
        for (let lon = 0; lon < longitudes; lon += 1) {
          const lonA = -180 + lon * 360 / longitudes;
          const lonB = -180 + (lon + 1) * 360 / longitudes;
          const a = sphere([lonA, latA], .995);
          const b = sphere([lonB, latA], .995);
          const c = sphere([lonB, latB], .995);
          const d = sphere([lonA, latB], .995);
          surface.push(...a, ...b, ...c, ...a, ...c, ...d);
        }
      }
      const grid = [];
      for (let latitude = -60; latitude <= 60; latitude += 30) {
        grid.push(...segments(Array.from({ length: 73 }, (_, index) => sphere([-180 + index * 5, latitude], 1.002))));
      }
      for (let longitude = -150; longitude <= 180; longitude += 30) {
        grid.push(...segments(Array.from({ length: 37 }, (_, index) => sphere([longitude, -90 + index * 5], 1.002))));
      }
      const countries = [];
      (world?.countries || []).forEach((country) => country.polygons.forEach((polygon) => polygon.forEach((ring) => {
        const stride = balancedRendering ? 3 : 2;
        const outline = ring.filter((position, index) => index % stride === 0 || index === ring.length - 1);
        countries.push(...segments(outline.map((position) => sphere(position, 1.008))));
      })));
      const nodePoints = (nodes?.nodes || []).map((node) => sphere(node.position, 1.012)).flat();
      const threatPoints = (threat?.observations || []).filter((item) => item.position).map((item) => sphere(item.position, 1.025)).flat();
      const externalArcs = [];
      (threat?.observations || []).filter((item) => item.position).slice(0, 18).forEach((item) => externalArcs.push(...arc(item.position, [-25, 8], 20)));
      const sensorPosition = sensorSnapshot?.sensor?.position;
      const sensorPoints = sensorPosition ? sphere(sensorPosition, 1.04) : [];
      const directPoints = [];
      const directArcs = [];
      if (sensorPosition && sensorSnapshot?.sensor?.state === "online") {
        filteredDirectEvents().filter((event) => Array.isArray(event.position)).slice(0, 24).forEach((event) => {
          directPoints.push(...sphere(event.position, 1.04));
          directArcs.push(...arc(event.position, sensorPosition));
        });
      }
      setBuffer("surface", surface);
      setBuffer("grid", grid);
      setBuffer("countries", countries);
      setBuffer("nodes", nodePoints);
      setBuffer("threats", threatPoints);
      setBuffer("externalArcs", externalArcs);
      setBuffer("sensor", sensorPoints);
      setBuffer("directs", directPoints);
      setBuffer("directArcs", directArcs);
    };
    const drawBuffer = (name, mode, color, pointSize = 1) => {
      const item = buffers.get(name);
      if (!item?.count) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, item.buffer);
      gl.enableVertexAttribArray(location.position);
      gl.vertexAttribPointer(location.position, 3, gl.FLOAT, false, 0, 0);
      gl.uniform4fv(location.color, color);
      gl.uniform1f(location.pointSize, pointSize * Math.min(window.devicePixelRatio || 1, globePixelRatioCap));
      gl.uniform1i(location.point, mode === gl.POINTS ? 1 : 0);
      gl.drawArrays(mode, 0, item.count);
    };
    const render = (timeSeconds) => {
      if (!globeCanvas || viewMode !== "globe") return;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, globePixelRatioCap);
      const rectangle = globeCanvas.getBoundingClientRect();
      const targetWidth = Math.max(1, Math.floor(rectangle.width * pixelRatio));
      const targetHeight = Math.max(1, Math.floor(rectangle.height * pixelRatio));
      if (globeCanvas.width !== targetWidth || globeCanvas.height !== targetHeight) {
        globeCanvas.width = targetWidth;
        globeCanvas.height = targetHeight;
      }
      gl.viewport(0, 0, targetWidth, targetHeight);
      gl.clearColor(.002, .012, .022, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(program);
      const radius = Math.min(rectangle.width * .43, rectangle.height * .43) * camera.zoom;
      gl.uniform1f(location.rotation, camera.rotation * Math.PI / 180);
      gl.uniform2f(location.scale, radius * 2 / rectangle.width, radius * 2 / rectangle.height);
      gl.uniform2f(location.pan, camera.panX * 2 / rectangle.width, -camera.panY * 2 / rectangle.height);
      gl.uniform1f(location.time, timeSeconds);
      drawBuffer("surface", gl.TRIANGLES, [.006, .052, .078, 1]);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      drawBuffer("grid", gl.LINES, [.08, .65, .76, .24]);
      drawBuffer("countries", gl.LINES, [.31, .96, 1, .66]);
      if (layers.infrastructure) drawBuffer("nodes", gl.POINTS, [.31, .96, 1, .82], 2.8);
      if (layers.threat) {
        drawBuffer("externalArcs", gl.LINES, [1, .15, .34, .42]);
        drawBuffer("threats", gl.POINTS, [1, .14, .32, .98], 5.8);
      }
      if (layers.honeypot) {
        drawBuffer("directArcs", gl.LINES, [1, .22, .40, .94]);
        drawBuffer("directs", gl.POINTS, [1, .12, .31, 1], 8.2);
        drawBuffer("sensor", gl.POINTS, [.34, 1, .72, 1], 11.5);
      }
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    };
    return { build, render };
  };

  if (globeGl) {
    try {
      globeRenderer = createGlobeRenderer(globeGl);
      consoleRoot.dataset.webgl = "true";
    } catch (error) {
      consoleRoot.dataset.webgl = "false";
      console.warn("Threat Observatory WebGL fallback:", error);
    }
  } else {
    consoleRoot.dataset.webgl = "false";
  }

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
    if (viewMode === "globe") {
      const lambda = (lon + camera.rotation) * Math.PI / 180;
      const phi = lat * Math.PI / 180;
      const visible = Math.cos(phi) * Math.cos(lambda) >= -0.015;
      const radius = Math.min(width * 0.43, height * 0.43) * camera.zoom;
      return [
        width / 2 + camera.panX + radius * Math.cos(phi) * Math.sin(lambda),
        height / 2 + camera.panY - radius * Math.sin(phi),
        visible
      ];
    }
    const paddingX = Math.max(22, width * 0.025);
    const paddingY = Math.max(38, height * 0.09);
    return [
      width / 2 + camera.panX + (paddingX + ((lon + 180) / 360) * (width - paddingX * 2) - width / 2) * camera.zoom,
      height / 2 + camera.panY + (paddingY + ((90 - lat) / 180) * (height - paddingY * 2) - height / 2) * camera.zoom,
      true
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
    if (viewMode === "globe") {
      const radius = Math.min(width * 0.43, height * 0.43) * camera.zoom;
      const cx = width / 2 + camera.panX;
      const cy = height / 2 + camera.panY;
      const sphere = ctx.createRadialGradient(cx - radius * .28, cy - radius * .34, radius * .05, cx, cy, radius);
      sphere.addColorStop(0, "rgba(34,118,143,.28)");
      sphere.addColorStop(.58, "rgba(5,31,43,.55)");
      sphere.addColorStop(1, "rgba(0,3,7,.96)");
      ctx.fillStyle = sphere;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(79,244,255,.5)";
      ctx.lineWidth = 1.2;
      ctx.shadowColor = "#4ff4ff";
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.shadowBlur = 0;
      return;
    }
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
    let drawing = false;
    ring.forEach((coordinate, index) => {
      const [x, y, visible] = project(coordinate);
      if (!visible || !Number.isFinite(x) || !Number.isFinite(y)) {
        drawing = false;
        return;
      }
      if (index === 0 || !drawing) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      drawing = true;
    });
    if (drawing) ctx.closePath();
  };

  const rebuildStaticLayers = () => {
    if (!mapData || !infrastructure) return;
    staticMap = document.createElement("canvas");
    const mapContext = staticMap.getContext("2d", { alpha: false });
    resizeCanvas(staticMap, mapContext, width, height);
    drawBackground(mapContext);
    if (viewMode === "globe") {
      const radius = Math.min(width * 0.43, height * 0.43) * camera.zoom;
      mapContext.save();
      mapContext.beginPath();
      mapContext.arc(width / 2 + camera.panX, height / 2 + camera.panY, radius, 0, Math.PI * 2);
      mapContext.clip();
    }
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
    if (viewMode === "globe") mapContext.restore();
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
      const [x, y, visible] = project(node.position);
      if (!visible) return;
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
    screenTargetsDirty = true;
  };

  const resize = () => {
    const rectangle = mapViewport.getBoundingClientRect();
    width = Math.max(320, rectangle.width);
    height = Math.max(420, rectangle.height);
    ratio = resizeCanvas(mapCanvas, context, width, height);
    if (spectrumCanvas && spectrumContext) {
      const spectrumRectangle = spectrumCanvas.getBoundingClientRect();
      resizeCanvas(spectrumCanvas, spectrumContext, Math.max(1, spectrumRectangle.width), Math.max(1, spectrumRectangle.height));
      rebuildSpectrumLayer();
    }
    if (dnaCanvas && dnaContext) {
      const dnaRectangle = dnaCanvas.getBoundingClientRect();
      resizeCanvas(dnaCanvas, dnaContext, Math.max(1, dnaRectangle.width), Math.max(1, dnaRectangle.height));
    }
    rebuildStaticLayers();
    renderThreatDna();
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
    if (!start?.[2] || !end?.[2]) return;
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
    if (!start?.[2] || !end?.[2]) return;
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
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
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

  const rebuildSpectrumLayer = () => {
    if (!spectrumCanvas || !spectrumContext || !infrastructure) return;
    const sw = spectrumCanvas.getBoundingClientRect().width;
    const sh = spectrumCanvas.getBoundingClientRect().height;
    spectrumLayer = document.createElement("canvas");
    const layerContext = spectrumLayer.getContext("2d", { alpha: true });
    resizeCanvas(spectrumLayer, layerContext, sw, sh);
    const bins = new Array(72).fill(0);
    infrastructure.nodes.forEach((node) => {
      const index = Math.max(0, Math.min(bins.length - 1, Math.floor(((node.position[0] + 180) / 360) * bins.length)));
      bins[index] += 1;
    });
    const max = Math.max(...bins, 1);
    layerContext.fillStyle = "rgba(3,13,20,.72)";
    layerContext.fillRect(0, 0, sw, sh);
    const bar = sw / bins.length;
    bins.forEach((value, index) => {
      const normalized = value / max;
      const h = Math.max(1, normalized * sh * 0.78);
      const gradient = layerContext.createLinearGradient(0, sh - h, 0, sh);
      gradient.addColorStop(0, "rgba(79,244,255,.95)");
      gradient.addColorStop(0.7, "rgba(20,116,145,.62)");
      gradient.addColorStop(1, "rgba(255,43,214,.20)");
      layerContext.fillStyle = gradient;
      layerContext.fillRect(index * bar, sh - h, Math.max(1, bar - 1), h);
    });
  };

  const drawSpectrum = () => {
    if (!spectrumCanvas || !spectrumContext || !spectrumLayer) return;
    const sw = spectrumCanvas.getBoundingClientRect().width;
    const sh = spectrumCanvas.getBoundingClientRect().height;
    spectrumContext.clearRect(0, 0, sw, sh);
    spectrumContext.drawImage(
      spectrumLayer,
      0,
      0,
      spectrumLayer.width,
      spectrumLayer.height,
      0,
      0,
      sw,
      sh
    );
    const scan = ((frame * 36) % Math.max(1, sw));
    spectrumContext.fillStyle = "rgba(104,255,178,.65)";
    spectrumContext.fillRect(scan, 0, 1, sh);
  };

  const filteredDirectEvents = () => {
    const events = Array.isArray(honeypot?.events) ? honeypot.events : [];
    const cutoff = Date.now() - timeRangeHours * 60 * 60 * 1000;
    return events.filter((event) => {
      const eventTime = Date.parse(event.time_window || event.time || "");
      const inRange = !Number.isFinite(eventTime) || eventTime >= cutoff;
      const category = event.behavior?.category || "legacy_event";
      const confidence = event.behavior?.confidence || "legacy";
      return inRange
        && (behaviorFilter === "all" || category === behaviorFilter)
        && (typeFilter === "all" || event.type === typeFilter)
        && (confidenceFilter === "all" || confidence === confidenceFilter)
        && (countryFilter === "all" || event.country === countryFilter)
        && (asnFilter === null || event.asn === asnFilter);
    });
  };

  const rebuildGlobe = () => {
    if (globeRenderer && mapData && infrastructure && globalThreat && honeypot) {
      globeRenderer.build(mapData, infrastructure, globalThreat, honeypot);
    }
    screenTargetsDirty = true;
  };

  const isWebglGlobe = () => viewMode === "globe"
    && Boolean(globeRenderer)
    && consoleRoot.dataset.webgl === "true";

  const directSourceGroups = (limit = 18) => {
    const groups = new Map();
    filteredDirectEvents().forEach((event) => {
      if (!Array.isArray(event.position) || event.position.length !== 2) return;
      const key = `${event.source_alias}:${event.position.join(",")}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count += Number(event.count) || 1;
        existing.types.add(event.type);
        if (event.severity === "high") existing.severity = "high";
      } else {
        groups.set(key, {
          ...event,
          count: Number(event.count) || 1,
          types: new Set([event.type])
        });
      }
    });
    return [...groups.values()].slice(0, limit);
  };

  const rebuildGlobeScreenTargets = () => {
    nodesByScreen.length = 0;
    threatsByScreen.length = 0;
    directsByScreen.length = 0;
    sensorByScreen = null;
    if (layers.infrastructure) {
      (infrastructure?.nodes || []).forEach((node, index) => {
        if (index % 5 !== 0 && node.anchor !== true) return;
        const [x, y, visible] = project(node.position);
        if (visible) nodesByScreen.push({ x, y, node });
      });
    }
    if (layers.threat) {
      (globalThreat?.observations || []).forEach((observation) => {
        if (!observation.position) return;
        const [x, y, visible] = project(observation.position);
        if (visible) threatsByScreen.push({ x, y, observation });
      });
    }
    if (layers.honeypot && honeypot?.sensor) {
      const [sensorX, sensorY, sensorVisible] = project(honeypot.sensor.position);
      if (sensorVisible) {
        sensorByScreen = { x: sensorX, y: sensorY, sensor: honeypot.sensor };
      }
      if (honeypot.sensor.state === "online") {
        directSourceGroups().forEach((event) => {
          const [x, y, visible] = project(event.position);
          if (visible) directsByScreen.push({ x, y, event });
        });
      }
    }
    screenTargetsDirty = false;
  };

  const scheduleStaticRebuild = () => {
    if (staticRebuildHandle) return;
    staticRebuildHandle = window.requestAnimationFrame(() => {
      staticRebuildHandle = 0;
      rebuildStaticLayers();
      screenTargetsDirty = true;
      if (reducedMotion) draw();
    });
  };

  const refreshCameraLayers = () => {
    screenTargetsDirty = true;
    if (isWebglGlobe()) {
      if (reducedMotion) draw();
      return;
    }
    scheduleStaticRebuild();
  };

  const populateRegionFilters = () => {
    if (!countrySelect) return;
    const selected = countrySelect.value || "all";
    const countries = [...new Set(
      (honeypot?.events || []).map((event) => event.country).filter((value) => /^[A-Z]{2}$/.test(value || ""))
    )].sort();
    countrySelect.innerHTML = '<option value="all">ALL COUNTRIES</option>'
      + countries.map((country) => `<option value="${country}">${country}</option>`).join("");
    countrySelect.value = countries.includes(selected) ? selected : "all";
    countryFilter = countrySelect.value;
  };

  const renderThreatDna = () => {
    if (!dnaCanvas || !dnaContext) return;
    const rectangle = dnaCanvas.getBoundingClientRect();
    const w = Math.max(1, rectangle.width);
    const h = Math.max(1, rectangle.height);
    dnaContext.clearRect(0, 0, w, h);
    const background = dnaContext.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, Math.max(w, h) * .6);
    background.addColorStop(0, "rgba(79,244,255,.08)");
    background.addColorStop(1, "rgba(0,0,0,0)");
    dnaContext.fillStyle = background;
    dnaContext.fillRect(0, 0, w, h);
    const event = selectedDirect;
    if (!event) {
      dnaContext.strokeStyle = "rgba(79,244,255,.16)";
      dnaContext.setLineDash([4, 8]);
      dnaContext.beginPath();
      dnaContext.arc(w / 2, h / 2, Math.min(w, h) * .28, 0, Math.PI * 2);
      dnaContext.stroke();
      dnaContext.setLineDash([]);
      return;
    }
    const seed = String(event.proof?.event_hash || event.source_alias || "legacy");
    const values = Array.from({ length: 8 }, (_, index) => {
      const pair = seed.slice(index * 2, index * 2 + 2);
      return .35 + (Number.parseInt(pair || "55", 16) / 255) * .62;
    });
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * .34;
    for (let ring = 1; ring <= 4; ring += 1) {
      dnaContext.strokeStyle = `rgba(79,244,255,${.05 + ring * .035})`;
      dnaContext.beginPath();
      values.forEach((_value, index) => {
        const angle = -Math.PI / 2 + index * Math.PI * 2 / values.length;
        const x = cx + Math.cos(angle) * radius * ring / 4;
        const y = cy + Math.sin(angle) * radius * ring / 4;
        if (index === 0) dnaContext.moveTo(x, y); else dnaContext.lineTo(x, y);
      });
      dnaContext.closePath();
      dnaContext.stroke();
    }
    dnaContext.beginPath();
    values.forEach((value, index) => {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / values.length;
      const x = cx + Math.cos(angle) * radius * value;
      const y = cy + Math.sin(angle) * radius * value;
      if (index === 0) dnaContext.moveTo(x, y); else dnaContext.lineTo(x, y);
    });
    dnaContext.closePath();
    const fill = dnaContext.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    fill.addColorStop(0, "rgba(79,244,255,.34)");
    fill.addColorStop(1, "rgba(255,49,89,.28)");
    dnaContext.fillStyle = fill;
    dnaContext.fill();
    dnaContext.strokeStyle = "rgba(255,255,255,.88)";
    dnaContext.shadowColor = "#4ff4ff";
    dnaContext.shadowBlur = 12;
    dnaContext.lineWidth = 1.4;
    dnaContext.stroke();
    dnaContext.shadowBlur = 0;
  };

  const renderInvestigation = () => {
    const events = filteredDirectEvents();
    if (selectedDirect && !events.includes(selectedDirect)) {
      selectedDirect = events.find((item) =>
        item.source_alias === selectedDirect.source_alias
        && item.type === selectedDirect.type
        && (item.session_alias || null) === (selectedDirect.session_alias || null)
      ) || null;
    }
    if (!selectedDirect && events.length) {
      selectedDirect = events.find((item) => item.behavior && item.proof && item.session_alias)
        || events.find((item) => item.behavior)
        || events[0];
    }
    const event = selectedDirect;
    if (dnaState) dnaState.textContent = event ? "VERIFIED EVENT SELECTED" : "AWAITING EVENT";
    if (dnaDetails) {
      const behavior = event?.behavior;
      dnaDetails.innerHTML = event
        ? `<dl><div><dt>CATEGORY</dt><dd>${escapeHtml((behavior?.category || "NO V2 CLASSIFICATION").replaceAll("_", " ").toUpperCase())}</dd></div><div><dt>CONFIDENCE</dt><dd>${escapeHtml((behavior?.confidence || "NOT CLASSIFIED").toUpperCase())}</dd></div><div><dt>TECHNIQUE</dt><dd>${escapeHtml(behavior?.technique_id || "NOT ASSERTED")}</dd></div><div><dt>EVIDENCE</dt><dd>${number.format(Number(behavior?.evidence_count) || 1)} SIGNAL(S)</dd></div></dl>`
        : "<p>Wähle ein echtes JARVIS-Direktereignis. Es werden nur datensparsame Metadaten dargestellt – niemals Rohbefehle.</p>";
    }
    renderThreatDna();

    const session = event?.session_alias;
    const story = session ? events.filter((item) => item.session_alias === session) : [];
    if (storyState) storyState.textContent = session ? `${session} // ${story.length} EVENT(S)` : "NO V2 SESSION SELECTED";
    if (storyEvents) storyEvents.innerHTML = story.length
      ? story.map((item, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><div><b>${escapeHtml(item.label || item.type)}</b><small>${escapeHtml((item.behavior?.category || "not_classified").replaceAll("_", " ").toUpperCase())} // ${escapeHtml(item.time_window || "TIME WINDOW NOT AVAILABLE")}</small></div></li>`).join("")
      : "<li><b>NO V2 SESSION STORY AVAILABLE</b><small>Keine Timeline wird aus Schema-1-Daten erfunden.</small></li>";

    const proof = honeypot?.proof || {};
    const verifiedChain = honeypot?.schema === 2
      && Number.isInteger(proof.chain_head_sequence)
      && typeof proof.chain_head_hash === "string"
      && proof.chain_head_hash.length === 64;
    if (proofState) proofState.textContent = verifiedChain && proof.receiver_fresh
      ? "CHAIN VERIFIED // FRESH"
      : honeypot?.schema === 2
        ? "V2 RECEIVER // CHAIN NOT ACTIVE"
        : "V1 FALLBACK";
    if (proofContract) proofContract.textContent = proof.event_contract || `SCHEMA V${honeypot?.schema || 1} FALLBACK`;
    if (proofChain) proofChain.textContent = Number.isInteger(proof.chain_head_sequence) && proof.chain_head_hash
      ? `#${number.format(proof.chain_head_sequence)} // ${String(proof.chain_head_hash).slice(0, 16).toUpperCase()}…`
      : "NO VERIFIED RECEIPT";
    if (proofPrivacy) proofPrivacy.textContent = String(proof.privacy_projection || honeypot?.privacy || "RAW DATA BLOCKED").replaceAll("_", " ").toUpperCase();
    if (proofFreshness) proofFreshness.textContent = `${ageLabel(proof.chain_received_at || honeypot?.generated_at)} // ${proof.receiver_fresh === true ? "RECEIVER FRESH" : "SNAPSHOT"}`;
  };

  const draw = (timestamp = window.performance.now()) => {
    if (!staticMap) return;
    if (!reducedMotion && lastFrameTimestamp && timestamp - lastFrameTimestamp < frameInterval) {
      animationHandle = window.requestAnimationFrame(draw);
      return;
    }
    const elapsed = lastFrameTimestamp ? Math.min(80, timestamp - lastFrameTimestamp) : frameInterval;
    lastFrameTimestamp = timestamp;
    frame += reducedMotion ? 0 : elapsed / 1000 * 1.1;

    if (isWebglGlobe()) {
      if (screenTargetsDirty) rebuildGlobeScreenTargets();
      globeRenderer.render(frame);
      if (timestamp - lastSpectrumTimestamp >= 100) {
        drawSpectrum();
        lastSpectrumTimestamp = timestamp;
      }
      if (!reducedMotion) animationHandle = window.requestAnimationFrame(draw);
      return;
    }

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
        if (!position[2] || !threatHub[2]) return;
        drawArc(context, position, threatHub, "rgba(255,49,89,.34)", frame + index * 0.11, 0.75);
        pulse(context, position[0], position[1], "rgba(255,49,89,.95)", index * 0.65, 1.7);
        threatsByScreen.push({ x: position[0], y: position[1], observation });
      });
      if (threatHub[2]) {
        pulse(context, threatHub[0], threatHub[1], "rgba(255,43,214,.9)", 1.2, 2.8);
        context.fillStyle = "rgba(255,173,239,.86)";
        context.font = "700 9px ui-monospace, monospace";
        context.letterSpacing = "1px";
        context.fillText("EXTERNAL THREAT CORRELATION", threatHub[0] + 13, threatHub[1] - 10);
      }
    }

    sensorByScreen = null;
    directsByScreen.length = 0;
    if (layers.honeypot && honeypot?.sensor) {
      const sensor = project(honeypot.sensor.position);
      if (!sensor[2]) {
        drawSpectrum();
        if (!reducedMotion) animationHandle = window.requestAnimationFrame(draw);
        return;
      }
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
        directSourceGroups().forEach((event, index) => {
          const source = project(event.position);
          if (!source[2]) return;
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
    const events = filteredDirectEvents();
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
      const servedWindow = Number(honeypot?.window_hours || 24);
      directLedgerUpdated.textContent = `LAST EVENT // ${ageLabel(honeypot?.last_direct_event)} // WINDOW ${servedWindow}H`;
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
      const pageLanguage = document.documentElement.lang.startsWith("en") ? "en-GB" : "de-CH";
      const time = Number.isFinite(Date.parse(event.time_window))
        ? new Date(event.time_window).toLocaleString(pageLanguage, {
          timeZone: "UTC",
          hour12: false,
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        })
        : "--";
      return `
        <li data-severity="${severity}" data-event-index="${index}" tabindex="0">
          <span>${String(index + 1).padStart(2, "0")} // ${escapeHtml(severity.toUpperCase())}</span>
          <div class="direct-ledger-main">
            <b>${escapeHtml(event.source_alias || "SRC-UNKNOWN")} // ${escapeHtml(event.label || event.type)}</b>
            <small>${escapeHtml(location)} // ${escapeHtml(time)} UTC // ×${number.format(Number(event.count) || 1)}${event.behavior?.category ? ` // ${escapeHtml(event.behavior.category.replaceAll("_", " ").toUpperCase())}` : ""}</small>
          </div>
          <div class="direct-ledger-outcome">
            <small>OUTCOME</small><b>${escapeHtml(outcome)}</b><em>HOST COMPROMISED // NO</em>
          </div>
          <i aria-hidden="true"></i>
        </li>`;
    }).join("");
    directLedgerEvents.querySelectorAll("[data-event-index]").forEach((item) => {
      const choose = () => {
        selectedDirect = events[Number(item.dataset.eventIndex)] || null;
        renderInvestigation();
      };
      item.addEventListener("click", choose);
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          choose();
        }
      });
    });
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
        ? (document.documentElement.lang.startsWith("en")
          ? "HMAC-signed, strictly schema-validated and free of public raw data"
          : "HMAC-signiert, streng schemageprüft und ohne öffentliche Rohdaten")
        : (document.documentElement.lang.startsWith("en")
          ? "The public state is never simulated; a verified snapshot remains available as fallback"
          : "Der öffentliche Zustand wird nicht vorgetäuscht; Snapshot bleibt als Fallback verfügbar");
    }
    const english = document.documentElement.lang.startsWith("en");
    sensorCopy.textContent = online
      ? (english
        ? "The public feed is active. It shows only daily rotating source pseudonyms, time windows and coarse regions when safely available."
        : "Der öffentliche Feed ist aktiv. Angezeigt werden ausschließlich täglich wechselnde Quellpseudonyme, Zeitfenster und – nur wenn sicher verfügbar – vergröberte Regionen.")
      : staged
        ? (english
          ? "The real sensor and signed receiver are operating in private staging mode. Published direct events deliberately remain at zero."
          : "Der echte Sensor und der signierte Empfänger laufen im privaten Stagingmodus. Veröffentlichte Direkt-Ereignisse bleiben absichtlich null.")
        : offline
          ? (english
            ? "The receiver is reachable, but the sensor heartbeat is stale. No direct events are presented as live."
            : "Der Empfänger ist erreichbar, aber der Sensor-Heartbeat ist veraltet. Es werden keine Direkt-Ereignisse als live ausgegeben.")
          : (english
            ? "The secure receiver is prepared. Direct attack lines remain disabled until an authenticated sensor heartbeat arrives."
            : "Der sichere Empfänger ist vorbereitet. Bis zum authentifizierten Sensor-Heartbeat bleiben direkte Angriffslinien aus.");
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
          const live = await loadJson(`${endpoint}/v1/public/attacks?schema=2&hours=${timeRangeHours}`);
          if ([1, 2].includes(live.schema) && live.sensor && Array.isArray(live.events)) honeypot = live;
        } catch {
          syncState.textContent = "LIVE SENSOR UNREACHABLE // SNAPSHOT ACTIVE";
        }
      }
      updateMetrics();
      populateRegionFilters();
      rebuildGlobe();
      renderFeed();
      renderDirectLedger();
      renderInvestigation();
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
      const live = await loadJson(`${endpoint}/v1/public/attacks?schema=2&hours=${timeRangeHours}&refresh=${Date.now()}`);
      if (![1, 2].includes(live.schema) || !live.sensor || !Array.isArray(live.events)) {
        throw new Error("invalid live schema");
      }
      honeypot = live;
      updateMetrics();
      populateRegionFilters();
      rebuildGlobe();
      renderDirectLedger();
      renderInvestigation();
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
      rebuildGlobe();
      if (reducedMotion) draw();
    });
  });

  const resetView = () => {
    camera = { zoom: 1, panX: 0, panY: 0, rotation: 0 };
    refreshCameraLayers();
  };

  const viewButtons = [...document.querySelectorAll("button[data-view]")];
  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      viewMode = button.dataset.view === "globe" ? "globe" : "analysis";
      viewButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      consoleRoot.dataset.view = viewMode;
      if (globeCanvas) globeCanvas.hidden = viewMode !== "globe" || !globeRenderer;
      rebuildGlobe();
      resetView();
    });
  });
  const requestedView = new URLSearchParams(window.location.search).get("view");
  if (requestedView === "globe") viewButtons.find((button) => button.dataset.view === "globe")?.click();
  document.querySelectorAll("[data-range]").forEach((button) => {
    button.addEventListener("click", () => {
      timeRangeHours = Number(button.dataset.range) || 24;
      document.querySelectorAll("[data-range]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderDirectLedger();
      renderInvestigation();
      rebuildGlobe();
      void refreshLive();
    });
  });
  behaviorSelect?.addEventListener("change", () => {
    behaviorFilter = behaviorSelect.value;
    renderDirectLedger();
    renderInvestigation();
    rebuildGlobe();
  });
  typeSelect?.addEventListener("change", () => {
    typeFilter = typeSelect.value;
    renderDirectLedger();
    renderInvestigation();
    rebuildGlobe();
  });
  confidenceSelect?.addEventListener("change", () => {
    confidenceFilter = confidenceSelect.value;
    renderDirectLedger();
    renderInvestigation();
    rebuildGlobe();
  });
  countrySelect?.addEventListener("change", () => {
    countryFilter = countrySelect.value;
    renderDirectLedger();
    renderInvestigation();
    rebuildGlobe();
  });
  asnInput?.addEventListener("input", () => {
    const text = asnInput.value.trim().toUpperCase().replace(/^AS/, "");
    asnFilter = /^\d{1,10}$/.test(text) ? Number(text) : null;
    renderDirectLedger();
    renderInvestigation();
    rebuildGlobe();
  });
  document.getElementById("map-reset")?.addEventListener("click", resetView);
  document.getElementById("tv-mode")?.addEventListener("click", async () => {
    const active = document.body.classList.toggle("observatory-tv-mode");
    const button = document.getElementById("tv-mode");
    if (button) button.textContent = active ? "EXIT TV" : "TV / 4K";
    if (active && document.fullscreenEnabled && !document.fullscreenElement) {
      try { await consoleRoot.requestFullscreen(); } catch { /* browser chrome remains as fallback */ }
    } else if (!active && document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch { /* no-op */ }
    }
    window.setTimeout(resize, 80);
  });
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) document.body.classList.remove("observatory-tv-mode");
    const button = document.getElementById("tv-mode");
    if (button) button.textContent = document.body.classList.contains("observatory-tv-mode") ? "EXIT TV" : "TV / 4K";
    window.setTimeout(resize, 80);
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
      const network = Number.isInteger(direct.asn) ? `AS${direct.asn}` : "ASN NOT SAFELY ENRICHED";
      content = `<b>DIRECT JARVIS SENSOR EVENT</b><span>${escapeHtml(direct.source_alias)}</span><small>${escapeHtml(direct.country || "REGION NOT SAFELY ENRICHED")} // ${escapeHtml(network)} // ×${number.format(direct.count)}<br>${escapeHtml([...direct.types].join(" + ").toUpperCase())}<br>COARSE 2° CELL — NO RAW IP</small>`;
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

  mapViewport.addEventListener("pointermove", (event) => {
    if (activePointers.has(event.pointerId)) {
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (pinch && activePointers.size >= 2) {
      const [first, second] = [...activePointers.values()];
      const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
      camera.zoom = Math.max(.65, Math.min(5, pinch.zoom * distance / pinch.distance));
      refreshCameraLayers();
      return;
    }
    if (drag) {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (viewMode === "globe") {
        camera.rotation = drag.rotation + dx * .28 / camera.zoom;
        camera.panY = Math.max(-height * .25, Math.min(height * .25, drag.panY + dy));
      } else {
        camera.panX = drag.panX + dx;
        camera.panY = drag.panY + dy;
      }
      refreshCameraLayers();
      return;
    }
    queuedTooltipPoint = { clientX: event.clientX, clientY: event.clientY };
    if (!tooltipHandle) {
      tooltipHandle = window.requestAnimationFrame(() => {
        tooltipHandle = 0;
        if (queuedTooltipPoint) showTooltip(queuedTooltipPoint);
        queuedTooltipPoint = null;
      });
    }
  });
  mapViewport.addEventListener("pointerleave", () => {
    if (tooltip) tooltip.hidden = true;
  });
  mapViewport.addEventListener("pointerdown", (event) => {
    mapViewport.setPointerCapture?.(event.pointerId);
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointers.size >= 2) {
      const [first, second] = [...activePointers.values()];
      pinch = {
        distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
        zoom: camera.zoom
      };
      drag = null;
      return;
    }
    drag = { x: event.clientX, y: event.clientY, panX: camera.panX, panY: camera.panY, rotation: camera.rotation };
    showTooltip(event);
  });
  const endDrag = (event) => {
    activePointers.delete(event.pointerId);
    if (pinch) {
      if (activePointers.size < 2) pinch = null;
      drag = null;
      return;
    }
    if (!drag) return;
    const rectangle = mapCanvas.getBoundingClientRect();
    const item = nearest(event.clientX - rectangle.left, event.clientY - rectangle.top);
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 7 && item?.kind === "direct") {
      selectedDirect = item.event;
      renderInvestigation();
    }
    drag = null;
  };
  mapViewport.addEventListener("pointerup", endDrag);
  mapViewport.addEventListener("pointercancel", (event) => {
    activePointers.delete(event.pointerId);
    if (activePointers.size < 2) pinch = null;
    drag = null;
  });
  const applyZoom = (factor) => {
    camera.zoom = Math.max(.65, Math.min(5, camera.zoom * factor));
    refreshCameraLayers();
  };
  zoomInButton?.addEventListener("click", () => applyZoom(1.22));
  zoomOutButton?.addEventListener("click", () => applyZoom(.82));
  mapViewport.addEventListener("wheel", (event) => {
    event.preventDefault();
    applyZoom(event.deltaY > 0 ? .88 : 1.14);
  }, { passive: false });
  mapViewport.addEventListener("dblclick", resetView);

  const observer = new ResizeObserver(resize);
  observer.observe(mapViewport);
  loadData();
  window.setInterval(refreshLive, 30_000);
})();
