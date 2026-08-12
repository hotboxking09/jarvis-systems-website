"use strict";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const pageLanguage = document.documentElement.lang.startsWith("en") ? "en" : "de";
const localizedRoute = (path) => pageLanguage === "en" ? `/en${path}` : path;

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
    const response = await fetch("/data/updates.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const updates = Array.isArray(data) ? data : data.updates;
    if (!Array.isArray(updates)) throw new Error("Ungültiges Updateformat");
    feed.innerHTML = updates.map((entry) => `
      <article class="update-entry reveal is-visible">
        <time class="update-date" datetime="${escapeHtml(entry.date)}">${escapeHtml(entry.date.split("-").reverse().join("."))}</time>
        <div><h3><a href="${localizedRoute(`/updates/${encodeURIComponent(entry.slug)}/`)}">${escapeHtml(entry.title)}</a></h3><p>${escapeHtml(entry.summary)}</p><a class="text-link" href="${localizedRoute(`/updates/${encodeURIComponent(entry.slug)}/`)}">${pageLanguage === "en" ? "READ TECHNICAL REPORT" : "TECHNISCHEN BERICHT LESEN"} →</a></div>
        <span class="update-tag">${escapeHtml(entry.state || entry.code)}</span>
      </article>`).join("");
  } catch (error) {
    feed.innerHTML = `<p class='loading'>${pageLanguage === "en" ? "UPDATE DATA TEMPORARILY UNAVAILABLE." : "UPDATE-DATEN TEMPORÄR NICHT VERFÜGBAR."}</p>`;
  }
}
loadUpdates();

const requestAssistant = document.querySelector(".request-assistant");
if (requestAssistant) {
  const form = document.getElementById("project-request-form");
  const result = document.getElementById("project-request-result");
  const preview = document.getElementById("project-request-preview");
  const mailto = document.getElementById("project-request-mailto");
  const copyButton = document.getElementById("project-request-copy");
  const editButton = document.getElementById("project-request-edit");
  const copyState = document.getElementById("project-request-copy-state");
  const goal = document.getElementById("request-goal");
  const count = document.getElementById("request-count");
  const contactEmail = requestAssistant.dataset.contactEmail || "";

  const updateCount = () => {
    if (goal && count) count.textContent = String(goal.value.length);
  };
  goal?.addEventListener("input", updateCount);
  updateCount();

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity() || !preview || !mailto || !result) return;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const service = String(data.get("service") || "").trim();
    const budget = String(data.get("budget") || "Nicht angegeben").trim();
    const project = String(data.get("project") || "Nicht angegeben").trim();
    const requestGoal = String(data.get("goal") || "").trim();
    const subject = pageLanguage === "en" ? `JARVIS SYSTEM – Inquiry: ${service}` : `JARVIS SYSTEM – Anfrage: ${service}`;
    const body = (pageLanguage === "en" ? [
      "Hello Oliver",
      "",
      "I would like to request a non-binding review of the following project:",
      "",
      `Name: ${name}`,
      `Reply address: ${email}`,
      `Service: ${service}`,
      `Company / project / website: ${project || "Not specified"}`,
      `Budget range: ${budget}`,
      "",
      "Goal or problem:",
      requestGoal,
      "",
      "I have not included passwords, recovery codes, payment details or confidential customer data in this initial inquiry.",
      "",
      "Kind regards",
      name,
    ] : [
      "Guten Tag Oliver",
      "",
      "ich möchte folgende Anfrage unverbindlich prüfen lassen:",
      "",
      `Name: ${name}`,
      `Antwortadresse: ${email}`,
      `Bereich: ${service}`,
      `Unternehmen / Projekt / Website: ${project || "Nicht angegeben"}`,
      `Budgetrahmen: ${budget}`,
      "",
      "Ziel oder Problem:",
      requestGoal,
      "",
      "Ich habe keine Passwörter, Recoverycodes, Zahlungsdaten oder vertraulichen Kundendaten in diese Erstanfrage aufgenommen.",
      "",
      "Freundliche Grüsse",
      name,
    ]).join("\n");
    preview.value = body;
    mailto.href = `mailto:${encodeURIComponent(contactEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    form.hidden = true;
    result.hidden = false;
    copyState.textContent = "";
    result.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  });

  copyButton?.addEventListener("click", async () => {
    if (!preview) return;
    try {
      await navigator.clipboard.writeText(preview.value);
      copyState.textContent = pageLanguage === "en" ? "Text copied to the clipboard." : "Text wurde in die Zwischenablage kopiert.";
    } catch {
      preview.focus();
      preview.select();
      const copied = document.execCommand("copy");
      copyState.textContent = copied
        ? (pageLanguage === "en" ? "Text copied to the clipboard." : "Text wurde in die Zwischenablage kopiert.")
        : (pageLanguage === "en" ? "Copying failed. Please select the text manually." : "Kopieren war nicht möglich. Bitte den Text manuell markieren.");
    }
  });

  editButton?.addEventListener("click", () => {
    if (!form || !result) return;
    result.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  });
}

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

const shopDialog = document.querySelector("[data-shop-dialog]");
if (shopDialog) {
  const isEnglish = document.documentElement.lang.toLowerCase().startsWith("en");
  const copy = isEnglish ? {
    front: "FRONT",
    back: "BACK",
    shown: (count) => `${count} ${count === 1 ? "PRODUCT" : "PRODUCTS"} SHOWN`,
    added: (size) => `Size ${size} added to your cart.`,
    quantity: "QUANTITY",
    remove: "REMOVE",
    itemCount: (count) => `${count} ${count === 1 ? "ITEM" : "ITEMS"}`,
    alt: (type, colour, view) => `${type} in ${colour} // ${view}`,
    priceLoading: "CHF PRICE LOADING",
    priceUnavailable: "CHF PRICE TEMPORARILY UNAVAILABLE",
    syncReady: "CHF LIVE PRICES // FOURTHWALL VERIFIED",
    syncFailed: "CHF PRICE CONNECTION UNAVAILABLE // PURCHASE LOCKED",
    from: "FROM"
  } : {
    front: "VORDERSEITE",
    back: "RÜCKSEITE",
    shown: (count) => `${count} ${count === 1 ? "PRODUKT" : "PRODUKTE"} ANGEZEIGT`,
    added: (size) => `Grösse ${size} wurde in den Warenkorb gelegt.`,
    quantity: "MENGE",
    remove: "ENTFERNEN",
    itemCount: (count) => `${count} ${count === 1 ? "ARTIKEL" : "ARTIKEL"}`,
    alt: (type, colour, view) => `${type} in ${colour} // ${view}`,
    priceLoading: "CHF-PREIS WIRD GELADEN",
    priceUnavailable: "CHF-PREIS VORÜBERGEHEND NICHT VERFÜGBAR",
    syncReady: "CHF LIVE-PREISE // FOURTHWALL VERIFIZIERT",
    syncFailed: "CHF-PREISVERBINDUNG NICHT VERFÜGBAR // KAUF GESPERRT",
    from: "AB"
  };

  const parseVariantMap = (raw) => {
    const variants = new Map();
    String(raw || "").split(",").forEach((pair) => {
      const separator = pair.indexOf(":");
      if (separator < 1) return;
      const size = pair.slice(0, separator);
      const variant = pair.slice(separator + 1);
      if (size && /^[0-9a-f-]{36}$/i.test(variant)) variants.set(size, variant);
    });
    return variants;
  };

  const openers = Array.from(document.querySelectorAll("[data-shop-open]"));
  const products = new Map(openers.map((opener) => [opener.dataset.cartId, {
    id: opener.dataset.cartId,
    kind: opener.dataset.kind,
    type: opener.dataset.productType,
    colour: opener.dataset.colour,
    code: opener.dataset.code,
    primary: opener.dataset.primary,
    secondary: opener.dataset.secondary,
    base: opener.dataset.productBase,
    textileColour: opener.dataset.providerColour,
    providerSlug: opener.dataset.providerSlug,
    sizes: (opener.dataset.sizes || "").split(",").filter(Boolean),
    material: isEnglish ? opener.dataset.materialEn : opener.dataset.material,
    weight: opener.dataset.weight,
    fit: opener.dataset.fit,
    prices: new Map(),
    variants: parseVariantMap(opener.dataset.variantMap),
    cardPrice: opener.querySelector("[data-shop-card-price]"),
    priceReady: false
  }]));

  const dialogImage = shopDialog.querySelector("[data-shop-dialog-image]");
  const dialogTitle = shopDialog.querySelector("[data-shop-dialog-title]");
  const dialogType = shopDialog.querySelector("[data-shop-dialog-type]");
  const dialogCode = shopDialog.querySelector("[data-shop-dialog-code]");
  const dialogBase = shopDialog.querySelector("[data-shop-dialog-base]");
  const dialogTextileColour = shopDialog.querySelector("[data-shop-dialog-provider-colour]");
  const dialogMaterial = shopDialog.querySelector("[data-shop-dialog-material]");
  const dialogSizes = shopDialog.querySelector("[data-shop-dialog-sizes]");
  const dialogPrice = shopDialog.querySelector("[data-shop-dialog-price]");
  const addButton = shopDialog.querySelector("[data-shop-add]");
  const addFeedback = shopDialog.querySelector("[data-shop-add-feedback]");
  const viewLabel = shopDialog.querySelector("[data-shop-view-label]");
  const primaryThumb = shopDialog.querySelector("[data-shop-thumb-primary]");
  const secondaryThumb = shopDialog.querySelector("[data-shop-thumb-secondary]");
  const viewButtons = Array.from(shopDialog.querySelectorAll("[data-shop-view]"));
  const sizeRadios = Array.from(shopDialog.querySelectorAll('input[name="shop-size"]'));
  let activeProduct = null;
  let activeSize = "M";
  let views = { primary: "", secondary: "" };

  const CART_KEY = "jarvis-shop-cart-v1";
  let cart = [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
    if (Array.isArray(stored)) {
      const normalized = new Map();
      stored.forEach((entry) => {
        const id = typeof entry?.id === "string" ? entry.id : "";
        const size = typeof entry?.size === "string" ? entry.size : "";
        const product = products.get(id);
        if (!product?.sizes.includes(size) || !product.variants.has(size)) return;
        const key = `${id}::${size}`;
        const quantity = Math.max(1, Math.min(10, Number.parseInt(entry.qty, 10) || 1));
        const previous = normalized.get(key);
        normalized.set(key, { id, size, qty: Math.min(10, (previous?.qty || 0) + quantity) });
      });
      cart = Array.from(normalized.values());
    }
  } catch (_error) {
    cart = [];
  }

  const cartDialog = document.querySelector("[data-shop-cart]");
  const cartItems = cartDialog?.querySelector("[data-shop-cart-items]");
  const cartEmpty = cartDialog?.querySelector("[data-shop-cart-empty]");
  const cartCountNodes = Array.from(document.querySelectorAll("[data-shop-cart-count]"));
  const cartTotal = cartDialog?.querySelector("[data-shop-cart-total]");
  const cartSubtotal = cartDialog?.querySelector("[data-shop-cart-subtotal]");
  const checkoutButton = cartDialog?.querySelector("[data-shop-checkout]");
  const checkoutBase = cartDialog?.dataset.checkoutBase || "";
  const checkoutEnabled = cartDialog?.dataset.checkoutEnabled === "true";
  const storefrontApi = cartDialog?.dataset.storefrontApi || "";
  const storefrontToken = cartDialog?.dataset.storefrontToken || "";
  const priceStatus = document.querySelector("[data-shop-price-status]");
  let priceSyncReady = false;

  const formatPrice = (value) => `CHF ${Number(value).toFixed(2)}`;

  const saveCart = () => {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (_error) {
      // The cart still works for the current page view when storage is unavailable.
    }
  };

  const entryPrice = (entry) => Number(products.get(entry.id)?.prices.get(entry.size) || 0);

  const renderCart = () => {
    if (!cartItems || !cartEmpty) return;
    cartItems.replaceChildren();
    const total = cart.reduce((sum, entry) => sum + entry.qty, 0);
    const subtotal = priceSyncReady
      ? cart.reduce((sum, entry) => sum + entryPrice(entry) * entry.qty, 0)
      : 0;
    cartEmpty.hidden = cart.length > 0;
    cartItems.hidden = cart.length === 0;
    cartCountNodes.forEach((node) => { node.textContent = String(total); });
    if (cartTotal) cartTotal.textContent = copy.itemCount(total);
    if (cartSubtotal) cartSubtotal.textContent = priceSyncReady ? formatPrice(subtotal) : copy.priceLoading;
    if (checkoutButton) checkoutButton.disabled = cart.length === 0 || !checkoutEnabled || !priceSyncReady;

    cart.forEach((entry) => {
      const product = products.get(entry.id);
      if (!product) return;
      const item = document.createElement("li");
      item.className = "shop-cart-item";

      const image = document.createElement("img");
      image.src = product.primary;
      image.alt = copy.alt(product.type, product.colour, copy.front);
      image.width = 78;
      image.height = 112;
      image.loading = "lazy";

      const details = document.createElement("div");
      details.className = "shop-cart-item-copy";
      const code = document.createElement("b");
      code.textContent = `${product.code} // ${entry.size}`;
      const title = document.createElement("strong");
      title.textContent = `${product.colour} ${product.type}`;
      const price = document.createElement("small");
      const itemPrice = product.prices.get(entry.size);
      price.textContent = itemPrice ? formatPrice(itemPrice) : copy.priceLoading;
      details.append(code, title, price);

      const actions = document.createElement("div");
      actions.className = "shop-cart-item-actions";
      const quantity = document.createElement("div");
      quantity.className = "shop-cart-quantity";
      quantity.setAttribute("aria-label", `${copy.quantity}: ${entry.qty}`);
      const key = `${entry.id}::${entry.size}`;
      const less = document.createElement("button");
      less.type = "button";
      less.dataset.cartAction = "decrease";
      less.dataset.cartKey = key;
      less.setAttribute("aria-label", `${copy.quantity} −`);
      less.textContent = "−";
      const value = document.createElement("span");
      value.textContent = String(entry.qty);
      const more = document.createElement("button");
      more.type = "button";
      more.dataset.cartAction = "increase";
      more.dataset.cartKey = key;
      more.setAttribute("aria-label", `${copy.quantity} +`);
      more.textContent = "+";
      quantity.append(less, value, more);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "shop-cart-remove";
      remove.dataset.cartAction = "remove";
      remove.dataset.cartKey = key;
      remove.textContent = copy.remove;
      actions.append(quantity, remove);
      item.append(image, details, actions);
      cartItems.append(item);
    });
  };

  const setPriceForSize = (size) => {
    if (!activeProduct || !dialogPrice) return;
    const price = activeProduct.prices.get(size) || activeProduct.prices.values().next().value;
    dialogPrice.textContent = price ? formatPrice(price) : copy.priceUnavailable;
  };

  const applyLivePrice = (product, payload) => {
    if (payload?.slug !== product.providerSlug || !Array.isArray(payload?.variants)) {
      throw new Error("product identity mismatch");
    }
    const byId = new Map(payload.variants.map((variant) => [variant?.id, variant]));
    const prices = new Map();
    product.variants.forEach((variantId, size) => {
      const variant = byId.get(variantId);
      const value = Number(variant?.unitPrice?.value);
      if (variant?.unitPrice?.currency !== "CHF" || !Number.isFinite(value) || value <= 0) {
        throw new Error(`invalid CHF price for ${product.id} ${size}`);
      }
      prices.set(size, value);
    });
    if (prices.size !== product.variants.size) throw new Error("variant price set incomplete");
    product.prices = prices;
    product.priceReady = true;
    const minimum = Math.min(...prices.values());
    if (product.cardPrice) product.cardPrice.textContent = `${copy.from} ${formatPrice(minimum)}`;
  };

  const syncLivePrices = async () => {
    let api;
    try {
      api = new URL(storefrontApi);
    } catch (_error) {
      api = null;
    }
    if (
      !api
      || api.protocol !== "https:"
      || api.hostname !== "storefront-api.fourthwall.com"
      || !/^ptkn_[0-9a-f-]{36}$/i.test(storefrontToken)
    ) {
      throw new Error("storefront price configuration unavailable");
    }
    await Promise.all(Array.from(products.values(), async (product) => {
      const url = new URL(`${api.href.replace(/\/$/, "")}/products/${encodeURIComponent(product.providerSlug)}`);
      url.searchParams.set("storefront_token", storefrontToken);
      url.searchParams.set("currency", "CHF");
      const response = await fetch(url, {
        cache: "no-store",
        credentials: "omit",
        mode: "cors",
        referrerPolicy: "no-referrer",
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error(`storefront price request failed: ${response.status}`);
      applyLivePrice(product, await response.json());
    }));
    if (Array.from(products.values()).some((product) => !product.priceReady)) {
      throw new Error("not all product prices were synchronized");
    }
    priceSyncReady = true;
    if (priceStatus) {
      priceStatus.textContent = copy.syncReady;
      priceStatus.classList.add("is-ready");
    }
    if (addButton) addButton.disabled = false;
    if (activeProduct) setPriceForSize(activeSize);
    renderCart();
  };

  const lockPriceFlow = () => {
    priceSyncReady = false;
    products.forEach((product) => {
      product.priceReady = false;
      product.prices = new Map();
      if (product.cardPrice) product.cardPrice.textContent = copy.priceUnavailable;
    });
    if (priceStatus) {
      priceStatus.textContent = copy.syncFailed;
      priceStatus.classList.remove("is-ready");
    }
    if (addButton) addButton.disabled = true;
    if (activeProduct) setPriceForSize(activeSize);
    renderCart();
  };

  const setShopView = (view) => {
    if (!views[view] || !activeProduct) return;
    const viewName = view === "primary" ? copy.front : copy.back;
    dialogImage.src = views[view];
    dialogImage.alt = copy.alt(activeProduct.type, activeProduct.colour, viewName);
    viewLabel.textContent = viewName;
    viewButtons.forEach((button) => {
      const selected = button.dataset.shopView === view;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  };

  openers.forEach((opener) => {
    opener.addEventListener("click", () => {
      activeProduct = products.get(opener.dataset.cartId || "") || null;
      if (!activeProduct) return;
      views = { primary: activeProduct.primary, secondary: activeProduct.secondary };
      dialogTitle.textContent = activeProduct.colour;
      dialogType.textContent = `${activeProduct.type.toUpperCase()} // ${activeProduct.fit.toUpperCase()}`;
      dialogCode.textContent = activeProduct.code;
      dialogBase.textContent = activeProduct.base.toUpperCase();
      dialogTextileColour.textContent = activeProduct.textileColour.toUpperCase();
      dialogMaterial.textContent = `${activeProduct.material.toUpperCase()} // ${activeProduct.weight.toUpperCase()}`;
      dialogSizes.textContent = `${activeProduct.sizes[0]}–${activeProduct.sizes.at(-1)}`;
      primaryThumb.src = views.primary;
      secondaryThumb.src = views.secondary;
      primaryThumb.alt = copy.alt(activeProduct.type, activeProduct.colour, copy.front);
      secondaryThumb.alt = copy.alt(activeProduct.type, activeProduct.colour, copy.back);
      sizeRadios.forEach((radio) => {
        const supported = activeProduct.sizes.includes(radio.value);
        radio.disabled = !supported;
        radio.closest("label")?.toggleAttribute("hidden", !supported);
        radio.checked = supported && radio.value === "M";
      });
      activeSize = activeProduct.sizes.includes("M") ? "M" : activeProduct.sizes[0];
      if (addFeedback) addFeedback.textContent = "";
      if (addButton) addButton.disabled = !priceSyncReady || !activeProduct.priceReady;
      setPriceForSize(activeSize);
      setShopView("primary");
      if (typeof shopDialog.showModal === "function") shopDialog.showModal();
      else shopDialog.setAttribute("open", "");
      shopDialog.scrollTop = 0;
      shopDialog.querySelector(".shop-dialog-copy")?.scrollTo(0, 0);
    });
  });

  viewButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.classList.contains("is-active")));
    button.addEventListener("click", () => setShopView(button.dataset.shopView));
  });
  sizeRadios.forEach((radio) => radio.addEventListener("change", () => {
    if (radio.checked) {
      activeSize = radio.value;
      setPriceForSize(activeSize);
      if (addFeedback) addFeedback.textContent = "";
    }
  }));

  addButton?.addEventListener("click", () => {
    if (!priceSyncReady || !activeProduct?.priceReady || !activeProduct.variants.has(activeSize)) return;
    const existing = cart.find((entry) => entry.id === activeProduct.id && entry.size === activeSize);
    if (existing) existing.qty = Math.min(10, existing.qty + 1);
    else cart.push({ id: activeProduct.id, size: activeSize, qty: 1 });
    saveCart();
    renderCart();
    if (addFeedback) addFeedback.textContent = copy.added(activeSize);
  });

  const filterButtons = Array.from(document.querySelectorAll("[data-shop-filter]"));
  const resultCount = document.querySelector("[data-shop-result-count]");
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.shopFilter || "all";
      let visible = 0;
      document.querySelectorAll("[data-shop-product]").forEach((card) => {
        const show = filter === "all" || card.dataset.kind === filter;
        card.hidden = !show;
        if (show) visible += 1;
      });
      filterButtons.forEach((candidate) => {
        const selected = candidate === button;
        candidate.classList.toggle("is-active", selected);
        candidate.setAttribute("aria-pressed", String(selected));
      });
      if (resultCount) resultCount.textContent = copy.shown(visible);
    });
  });

  shopDialog.querySelector("[data-shop-dialog-close]")?.addEventListener("click", () => shopDialog.close());
  shopDialog.addEventListener("click", (event) => {
    if (event.target === shopDialog) shopDialog.close();
  });

  document.querySelectorAll("[data-shop-cart-open]").forEach((button) => {
    button.addEventListener("click", () => {
      renderCart();
      if (typeof cartDialog?.showModal === "function") cartDialog.showModal();
      else cartDialog?.setAttribute("open", "");
    });
  });
  cartDialog?.querySelector("[data-shop-cart-close]")?.addEventListener("click", () => cartDialog.close());
  cartDialog?.addEventListener("click", (event) => {
    if (event.target === cartDialog) cartDialog.close();
  });
  cartItems?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cart-action]");
    if (!button) return;
    const entry = cart.find((candidate) => `${candidate.id}::${candidate.size}` === button.dataset.cartKey);
    if (!entry) return;
    if (button.dataset.cartAction === "increase") entry.qty = Math.min(10, entry.qty + 1);
    if (button.dataset.cartAction === "decrease") entry.qty -= 1;
    if (button.dataset.cartAction === "remove" || entry.qty < 1) {
      cart = cart.filter((candidate) => candidate !== entry);
    }
    saveCart();
    renderCart();
  });
  cartDialog?.querySelector("[data-shop-cart-clear]")?.addEventListener("click", () => {
    cart = [];
    saveCart();
    renderCart();
  });
  checkoutButton?.addEventListener("click", () => {
    if (!checkoutEnabled || !checkoutBase || !priceSyncReady || cart.length === 0) return;
    const items = cart.map((entry) => {
      const variant = products.get(entry.id)?.variants.get(entry.size);
      return variant ? `${variant}:${entry.qty}` : "";
    }).filter(Boolean);
    if (items.length !== cart.length) return;
    const checkoutUrl = new URL("/cart/checkout", checkoutBase);
    checkoutUrl.searchParams.set("products", items.join(","));
    // CHF is the explicit catalogue and checkout reference currency for the
    // international launch candidate. Do not rely on geolocation or an old
    // cookie to silently change the advertised amount.
    checkoutUrl.searchParams.set("currency", "CHF");
    window.location.assign(checkoutUrl.href);
  });

  renderCart();
  syncLivePrices().catch(lockPriceFlow);
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
