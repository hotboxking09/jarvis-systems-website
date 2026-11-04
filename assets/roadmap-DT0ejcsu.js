var e=`<a class="skip-link" href="#main">Zum Inhalt springen</a>
  <canvas id="signal-canvas" aria-hidden="true"></canvas><div class="noise-layer" aria-hidden="true"></div>

  <header class="site-header" id="top">
    <a class="brand" href="/">
      <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
      <span><strong>JARVIS</strong><small>SYSTEM</small></span>
    </a>
    <nav class="main-nav" aria-label="Hauptnavigation">
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-links">MENÜ</button>
      <div class="nav-links" id="nav-links"><a href="/">Start</a><a href="/solutions/">Leistungen</a><a href="/shop/">Shop</a><a href="/#projekte">Projekte</a><a href="/#partner">Partner</a><a href="/jarvis-os/">JARVIS OS</a><a href="/threat-observatory/">AEGIS</a><a href="/updates/">Updates</a></div>
    </nav>
    <button class="header-search" type="button" data-site-search-open aria-haspopup="dialog" aria-controls="site-search-dialog" aria-label="Seite durchsuchen"><span aria-hidden="true">⌕</span><span>SUCHEN</span><kbd>⌘K</kbd></button>
    <nav class="language-switch" aria-label="Sprache"><a href="/roadmap/" hreflang="de-DE" lang="de" aria-current="true">DE</a><a href="/en/roadmap/" hreflang="en" lang="en">EN</a></nav><a class="header-contact" href="/solutions/#request"><span></span> ANFRAGE STARTEN</a>
  </header>
  <main id="main">
    <section class="content-hero section-shell">
      <div class="content-hero-copy reveal">
        <nav class="breadcrumbs" aria-label="Brotkrümelnavigation"><a href="/">JARVIS SYSTEM</a><span>/</span><span aria-current="page">Roadmap</span></nav>
        <p class="eyebrow">PUBLIC ROADMAP // GATES BEFORE RELEASE</p>
        <h1>Roadmap von JARVIS SYSTEM</h1>
        <p class="content-intro">Die Roadmap beschreibt keine Wunschliste ohne Reihenfolge. Jede Phase besitzt technische Bedingungen, die vor dem nächsten Releasezustand erfüllt sein müssen. Bereits gebaute Komponenten bleiben testpflichtig, wenn sich Installer, Hardwarebasis oder Laufzeit verändern.</p>
      </div>
      <div class="content-core reveal" aria-hidden="true">
        <div class="core-rings"><i></i><i></i><i></i></div>
        <picture><source srcset="/assets/jarvis-core-head.webp" type="image/webp"><img src="/assets/jarvis-core-head.png" width="1024" height="1024" alt="" decoding="async"></picture>
        <span>ROADMAP // ONLINE</span>
      </div>
      <div class="content-facts"><div><span>PHASE</span><b>HARDWARE GATE</b></div><div><span>PUBLIC ISO</span><b>LOCKED</b></div><div><span>NEXT</span><b>BARE METAL</b></div><div><span>GOAL</span><b>COMMUNITY RELEASE</b></div></div>
    </section>
    <div class="content-layout section-shell">
      <aside class="content-index"><b>PAGE MATRIX</b><a href="#foundation">01 // FOUNDATION</a><a href="#boot-install">02 // BOOT &amp; INSTALL</a><a href="#hardware">03 // ACTIVE GATE</a><a href="#trust">04 // TRUST &amp; RECOVERY</a><a href="#community">05 // COMMUNITY RELEASE</a><a href="/updates/">LIVE DEVELOPMENT LOG</a></aside>
      <article class="content-copy"><section id="foundation" class="content-block reveal">
      <p class="eyebrow">01 // FOUNDATION</p>
      <h2>Systemidentität, Shell und Laufzeit</h2>
      <p>Die erste Phase etablierte die gemeinsame Designsprache, die feste Systemoberfläche, den Login-Pfad, die Unified Shell, den Frame Core und die Systemtelemetrie. Diese Grundlage ist im Labor vorhanden und wird weiterhin regressionsgetestet.</p><div class="content-callout">STATUS // FOUNDATION BUILT — CONTINUOUS REGRESSION TESTING</div>
    </section><section id="boot-install" class="content-block reveal">
      <p class="eyebrow">02 // BOOT &amp; INSTALL</p>
      <h2>EFI-Manager und Community-Installer</h2>
      <p>Der native EFI-Manager, Maus- und Tastaturbedienung sowie der Installer-Medienstart wurden in OVMF geprüft. Der Installationspfad wird weiter von verbliebenen Distributionskomponenten entkoppelt und muss frische Installationen reproduzierbar abschliessen.</p><ul class="content-checklist"><li>Dynamische Systemerkennung</li><li>Interaktive Bootkarten</li><li>Netzwerk- und Konto-Preflight</li><li>Installations- und Recoveryprotokoll</li></ul>
    </section><section id="hardware" class="content-block reveal">
      <p class="eyebrow">03 // ACTIVE GATE</p>
      <h2>Breite Hardwareportabilität</h2>
      <p>Diese Phase ist der aktuelle Schwerpunkt. JARVIS OS muss Fähigkeiten automatisch erkennen und auf fehlende Sensoren oder Treiber sauber reagieren. Geplant sind dokumentierte Tests auf verschiedenen Intel- und AMD-Plattformen sowie unterschiedlichen Grafik-, WLAN-, LAN-, Speicher- und Displayklassen.</p><div class="content-callout">ACTIVE // VM IST VORSTUFE, BARE METAL IST FREIGABENACHWEIS</div>
    </section><section id="trust" class="content-block reveal">
      <p class="eyebrow">04 // TRUST &amp; RECOVERY</p>
      <h2>Secure Boot, Updates und belastbare Rückwege</h2>
      <p>Vor einer öffentlichen ISO müssen Signatur- und Vertrauenskette, Updatefehler, Offline-Reparatur, Rollback und Wiederherstellung geprüft werden. Nutzer dürfen nach einem fehlgeschlagenen Update oder einer fehlerhaften Konfiguration nicht ohne dokumentierten Rückweg bleiben.</p>
    </section><section id="community" class="content-block reveal">
      <p class="eyebrow">05 // COMMUNITY RELEASE</p>
      <h2>Kontrollierte Testgruppe vor breiter Veröffentlichung</h2>
      <p>Der erste externe Kreis soll aus freiwilligen Testern mit klaren Voraussetzungen, Sicherungsanweisung und strukturiertem Feedback bestehen. Erst danach folgen öffentliche Dokumentation, Downloadfreigabe und eine erweiterte Community-Infrastruktur.</p><div class="content-callout">NO DATE FAKES // Eine Veröffentlichung erhält erst dann ein Datum, wenn die technischen Gates realistisch planbar sind.</div>
    </section></article>
    </div>
    <section class="related-section section-shell" aria-labelledby="related-title">
      <p class="eyebrow">NEXT SIGNALS</p><h2 id="related-title">JARVIS weiter erkunden</h2>
      <div class="related-grid"><a class="related-card" href="/entwicklung/"><span>JARVIS KNOWLEDGE</span><h3>Wie JARVIS OS entwickelt wird</h3><p>So entsteht JARVIS OS: dokumentierte Builds, VM- und Hardwaretests, Backups, Release-Gates und nachvollziehbare Statusangaben.</p><b>ÖFFNEN →</b></a><a class="related-card" href="/technik/"><span>JARVIS KNOWLEDGE</span><h3>Technik hinter JARVIS SYSTEM</h3><p>Technischer Überblick über UEFI-Bootmanager, Runtime, Unified Shell, Login, Hardwareerkennung und reale Telemetrie von JARVIS OS.</p><b>ÖFFNEN →</b></a><a class="related-card" href="/faq/"><span>JARVIS KNOWLEDGE</span><h3>Häufige Fragen zu JARVIS OS</h3><p>Klare Antworten zu JARVIS OS: Linux-Basis, eigener Kernel, Download, Installation, Hardware, Windows-Dualboot, Datenschutz, Entwicklung und Community.</p><b>ÖFFNEN →</b></a></div>
    </section>
  </main>

  <footer class="site-footer section-shell">
    <div class="footer-brand"><b>JARVIS SYSTEM</b><span>TECHNOLOGY PROJECT + DIGITAL SOLUTIONS</span><p>Websites, Local IT und technische Lösungen aus Deutschland – mit JARVIS OS als eigenem Kernprojekt.</p><small>Öffentlicher Standort: Deutschland · Baden-Württemberg · Landkreis Waldshut</small><a href="mailto:jarvissystem@jarvisserver.org">jarvissystem@jarvisserver.org</a></div>
    <nav class="footer-directory" aria-label="Vollständige Seitennavigation">
      <div><b>LEISTUNGEN</b><a href="/solutions/">Alle Angebote</a><a href="/shop/">Shop</a><a href="/#projekte">Arbeitsbeispiele</a><a href="/solutions/#local-it">Local IT &amp; Vor Ort</a><a href="/solutions/#request">Projekt anfragen</a><a href="/solutions/#services">Website-Check</a></div>
      <div><b>JARVIS OS</b><a href="/jarvis-os/">Systemprofil</a><a href="/technik/">Technik</a><a href="/entwicklung/">Entwicklung</a><a href="/roadmap/">Roadmap</a></div>
      <div><b>PROJEKT</b><a href="/updates/">Updates</a><a href="/gruender/">Gründer</a><a href="/community/">Community</a><a href="/threat-observatory/">Threat Map</a></div>
      <div><b>ORIENTIERUNG</b><a href="/#partner">Partner &amp; Founding 100</a><a href="/uebersicht/">Website-Index</a><a href="/connect/">Offizielle Profile</a><a href="/support/">Support</a><a href="/faq/">FAQ</a></div>
    </nav>
    <div class="footer-legal">
      <div><p>© 2026 Oliver-frank Pristaff. Alle Rechte vorbehalten. Keine ISO-Verteilung.</p>
      <a href="/legal.html">Rechte, Hinweise &amp; Datenschutz</a> ·
      <a href="https://www.linkedin.com/in/oliver-frank-pristaff/" rel="me">LinkedIn Oliver</a> ·
      <a href="https://github.com/hotboxking09">GitHub</a> ·
      <a href="https://discord.gg/DWBwuUhXmv">Discord</a></div>
      <div class="footer-state"><span></span> PROJECT SIGNAL ACTIVE</div>
    </div>
  </footer>`;export{e as default};