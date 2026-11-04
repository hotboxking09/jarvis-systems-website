var e=`<a class="skip-link" href="#main">Skip to content</a>
  <canvas id="signal-canvas" aria-hidden="true"></canvas><div class="noise-layer" aria-hidden="true"></div>

  <header class="site-header" id="top">
    <a class="brand" href="/en/">
      <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
      <span><strong>JARVIS</strong><small>SYSTEM</small></span>
    </a>
    <nav class="main-nav" aria-label="Main navigation">
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-links">MENU</button>
      <div class="nav-links" id="nav-links"><a href="/en/">Home</a><a href="/en/solutions/">Services</a><a href="/en/shop/">Shop</a><a href="/en/#projekte">Projects</a><a href="/en/#partner">Partners</a><a href="/en/jarvis-os/">JARVIS OS</a><a href="/en/threat-observatory/">AEGIS</a><a href="/en/updates/">Updates</a></div>
    </nav>
    <button class="header-search" type="button" data-site-search-open aria-haspopup="dialog" aria-controls="site-search-dialog" aria-label="Search this site"><span aria-hidden="true">⌕</span><span>SEARCH</span><kbd>⌘K</kbd></button>
    <nav class="language-switch" aria-label="Language"><a href="/roadmap/" hreflang="de-DE" lang="de">DE</a><a href="/en/roadmap/" hreflang="en" lang="en" aria-current="true">EN</a></nav><a class="header-contact" href="/en/solutions/#request"><span></span> START AN INQUIRY</a>
  </header>
  <main id="main">
    <section class="content-hero section-shell">
      <div class="content-hero-copy reveal">
        <nav class="breadcrumbs" aria-label="Breadcrumb navigation"><a href="/en/">JARVIS SYSTEM</a><span>/</span><span aria-current="page">Roadmap</span></nav>
        <p class="eyebrow">PUBLIC ROADMAP // GATES BEFORE RELEASE</p>
        <h1>JARVIS SYSTEM roadmap</h1>
        <p class="content-intro">The roadmap does not describe a wish list without order. Each phase has technical conditions that must be met before the next release state. Components that have already been built remain subject to testing if the installer, hardware basis or runtime change.</p>
      </div>
      <div class="content-core reveal" aria-hidden="true">
        <div class="core-rings"><i></i><i></i><i></i></div>
        <picture><source srcset="/assets/jarvis-core-head.webp" type="image/webp"><img src="/assets/jarvis-core-head.png" width="1024" height="1024" alt="" decoding="async"></picture>
        <span>ROADMAP // ONLINE</span>
      </div>
      <div class="content-facts"><div><span>PHASE</span><b>HARDWARE GATE</b></div><div><span>PUBLIC ISO</span><b>LOCKED</b></div><div><span>NEXT</span><b>BARE METAL</b></div><div><span>GOAL</span><b>COMMUNITY RELEASE</b></div></div>
    </section>
    <div class="content-layout section-shell">
      <aside class="content-index"><b>PAGE MATRIX</b><a href="#foundation">01 // FOUNDATION</a><a href="#boot-install">02 // BOAT &amp; INSTALL</a><a href="#hardware">03 // ACTIVE GATE</a><a href="#trust">04 // TRUST &amp; RECOVERY</a><a href="#community">05 // COMMUNITY RELEASE</a><a href="/en/updates/">LIVE DEVELOPMENT LOG</a></aside>
      <article class="content-copy"><section id="foundation" class="content-block reveal">
      <p class="eyebrow">01 // FOUNDATION</p>
      <h2>System identity, shell and runtime</h2>
      <p>The first phase established the common design language, the fixed system interface, the login path, the unified shell, the frame core and the system telemetry. This basis exists in the laboratory and continues to be regression tested.</p><div class="content-callout">STATUS // FOUNDATION BUILT — CONTINUOUS REGRESSION TESTING</div>
    </section><section id="boot-install" class="content-block reveal">
      <p class="eyebrow">02 // BOAT &amp; INSTALL</p>
      <h2>EFI manager and community installer</h2>
      <p>The native EFI manager, mouse and keyboard operation, and installer media launch were tested in OVMF. The installation path is further decoupled from remaining distribution components and must complete fresh installations reproducibly.</p><ul class="content-checklist"><li>Dynamic system detection</li><li>Interactive boat maps</li><li>Network and account preflight</li><li>Installation and recovery log</li></ul>
    </section><section id="hardware" class="content-block reveal">
      <p class="eyebrow">03 // ACTIVE GATE</p>
      <h2>Wide hardware portability</h2>
      <p>This phase is the current focus. JARVIS OS must automatically recognize capabilities and respond cleanly to missing sensors or drivers. Documented tests are planned on various Intel and AMD platforms as well as different graphics, Wi-Fi, LAN, memory and display classes.</p><div class="content-callout">ACTIVE // VM IS PREFORM, BARE METAL IS PROOF OF RELEASE</div>
    </section><section id="trust" class="content-block reveal">
      <p class="eyebrow">04 // TRUST &amp; RECOVERY</p>
      <h2>Secure boot, updates and reliable return paths</h2>
      <p>Before a public ISO, signature and trust chain, update errors, offline repair, rollback and recovery must be checked. Users must not be left without a documented way back after a failed update or incorrect configuration.</p>
    </section><section id="community" class="content-block reveal">
      <p class="eyebrow">05 // COMMUNITY RELEASE</p>
      <h2>Controlled test group before wide release</h2>
      <p>The first external group should consist of volunteer testers with clear requirements, security instructions, and structured feedback. Only then will public documentation, download release, and an expanded community infrastructure follow.</p><div class="content-callout">NO DATE FAKES // A publication only receives a date when the technical gates can be realistically planned.</div>
    </section></article>
    </div>
    <section class="related-section section-shell" aria-labelledby="related-title">
      <p class="eyebrow">NEXT SIGNALS</p><h2 id="related-title">Continue exploring JARVIS</h2>
      <div class="related-grid"><a class="related-card" href="/en/entwicklung/"><span>JARVIS KNOWLEDGE</span><h3>How JARVIS OS is developed</h3><p>This is how JARVIS OS is created: documented builds, VM and hardware tests, backups, release gates and traceable status information.</p><b>OPEN →</b></a><a class="related-card" href="/en/technik/"><span>JARVIS KNOWLEDGE</span><h3>Technology behind JARVIS SYSTEM</h3><p>Technical overview of UEFI boot manager, runtime, unified shell, login, hardware detection and real telemetry of JARVIS OS.</p><b>OPEN →</b></a><a class="related-card" href="/en/faq/"><span>JARVIS KNOWLEDGE</span><h3>Frequently asked questions about JARVIS OS</h3><p>Clear answers about JARVIS OS: Linux base, own kernel, download, installation, hardware, Windows dual boot, data protection, development and community.</p><b>OPEN →</b></a></div>
    </section>
  </main>

  <footer class="site-footer section-shell">
    <div class="footer-brand"><b>JARVIS SYSTEM</b><span>TECHNOLOGY PROJECT + DIGITAL SOLUTIONS</span><p>Websites, Local IT und technische Lösungen aus Deutschland – mit JARVIS OS als eigenem Kernprojekt.</p><small>Öffentlicher Standort: Deutschland · Baden-Württemberg · Landkreis Waldshut</small><a href="mailto:jarvissystem@jarvisserver.org">jarvissystem@jarvisserver.org</a></div>
    <nav class="footer-directory" aria-label="Complete site navigation">
      <div><b>SERVICES</b><a href="/en/solutions/">All offers</a><a href="/en/shop/">Shop</a><a href="/en/#projekte">Work examples</a><a href="/en/solutions/#local-it">Local IT &amp; On Site</a><a href="/en/solutions/#request">Request a project</a><a href="/en/solutions/#services">Website check</a></div>
      <div><b>JARVIS OS</b><a href="/en/jarvis-os/">System profile</a><a href="/en/technik/">Technology</a><a href="/en/entwicklung/">Development</a><a href="/en/roadmap/">Roadmap</a></div>
      <div><b>PROJECT</b><a href="/en/updates/">Updates</a><a href="/en/gruender/">Founder</a><a href="/en/community/">Community</a><a href="/en/threat-observatory/">Threat Map</a></div>
      <div><b>ORIENTATION</b><a href="/en/#partner">Partner &amp; Founding 100</a><a href="/en/uebersicht/">Website index</a><a href="/en/connect/">Official profiles</a><a href="/en/support/">Support</a><a href="/en/faq/">FAQ</a></div>
    </nav>
    <div class="footer-legal">
      <div><p>© 2026 Oliver-frank Pristaff. All rights reserved. No ISO distribution.</p>
      <a href="/en/legal.html">Rights, notices &amp; privacy</a> ·
      <a href="https://www.linkedin.com/in/oliver-frank-pristaff/" rel="me">LinkedIn Oliver</a> ·
      <a href="https://github.com/hotboxking09">GitHub</a> ·
      <a href="https://discord.gg/DWBwuUhXmv">Discord</a></div>
      <div class="footer-state"><span></span> PROJECT SIGNAL ACTIVE</div>
    </div>
  </footer>`;export{e as default};