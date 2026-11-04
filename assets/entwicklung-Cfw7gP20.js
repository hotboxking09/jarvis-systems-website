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
    <nav class="language-switch" aria-label="Sprache"><a href="/entwicklung/" hreflang="de-DE" lang="de" aria-current="true">DE</a><a href="/en/entwicklung/" hreflang="en" lang="en">EN</a></nav><a class="header-contact" href="/solutions/#request"><span></span> ANFRAGE STARTEN</a>
  </header>
  <main id="main">
    <section class="content-hero section-shell">
      <div class="content-hero-copy reveal">
        <nav class="breadcrumbs" aria-label="Brotkrümelnavigation"><a href="/">JARVIS SYSTEM</a><span>/</span><span aria-current="page">Entwicklung</span></nav>
        <p class="eyebrow">ENGINEERING PROCESS // BUILD TEST DOCUMENT</p>
        <h1>Wie JARVIS OS entwickelt wird</h1>
        <p class="content-intro">JARVIS OS entsteht iterativ: planen, bauen, isoliert testen, Fehler reproduzieren, dokumentieren und erst danach den nächsten Bereich öffnen. Die professionelle Projektdokumentation hält Entscheidungen, Dateien, Prüfergebnisse und offene Risiken fest.</p>
      </div>
      <div class="content-core reveal" aria-hidden="true">
        <div class="core-rings"><i></i><i></i><i></i></div>
        <picture><source srcset="/assets/jarvis-core-head.webp" type="image/webp"><img src="/assets/jarvis-core-head.png" width="1024" height="1024" alt="" decoding="async"></picture>
        <span>ENTWICKLUNG // ONLINE</span>
      </div>
      <div class="content-facts"><div><span>METHODE</span><b>ITERATIV</b></div><div><span>BUILD</span><b>REPRODUZIERBAR</b></div><div><span>TEST</span><b>VM + BARE METAL</b></div><div><span>STATUS</span><b>DOKUMENTIERT</b></div></div>
    </section>
    <div class="content-layout section-shell">
      <aside class="content-index"><b>PAGE MATRIX</b><a href="#workflow">01 // WORKFLOW</a><a href="#tests">02 // TEST MATRIX</a><a href="#documentation">03 // DOCUMENTATION</a><a href="#release">04 // RELEASE DISCIPLINE</a><a href="/updates/">LIVE DEVELOPMENT LOG</a></aside>
      <article class="content-copy"><section id="workflow" class="content-block reveal">
      <p class="eyebrow">01 // WORKFLOW</p>
      <h2>Vom Auftrag zum nachvollziehbaren Build</h2>
      <p>Jede grössere Änderung beginnt mit einer klaren Zielbeschreibung und einer Prüfung des bestehenden Zustands. Vor riskanten Systemeingriffen werden Backups, Recoverypfade oder VM-Snapshots vorbereitet. Danach werden Änderungen möglichst klein und prüfbar umgesetzt.</p><p>Buildskripte erzeugen definierte Artefakte statt manuell veränderter Einzelkopien. Prüfsummen, Git-Commits und Buildprotokolle machen sichtbar, welcher Quellstand zu welchem Ergebnis gehört. Das schützt nicht vor jedem Fehler, verhindert aber unkontrollierbaren Entwicklungszustand.</p>
    </section><section id="tests" class="content-block reveal">
      <p class="eyebrow">02 // TEST MATRIX</p>
      <h2>VM-Erfolg, Installation und reale Hardware sind getrennte Stufen</h2>
      <p>QEMU und OVMF erlauben schnelle UEFI- und Installerprüfungen, ohne den Entwicklungsrechner bei jedem Versuch zu gefährden. Dort werden Bootpfade, Eingabe, Darstellungslogik und Installationsabläufe reproduzierbar getestet.</p><p>Danach folgen frische Installationen und echte Hardwaretests. Ein Ergebnis wird nicht auf alle Computer übertragen, nur weil es in einer VM funktioniert. Die Hardwarematrix erfasst unterschiedliche Grafik-, Netzwerk-, Speicher-, Eingabe- und Energieklassen.</p>
    </section><section id="documentation" class="content-block reveal">
      <p class="eyebrow">03 // DOCUMENTATION</p>
      <h2>Entscheidungen und Grenzen bleiben sichtbar</h2>
      <p>Die laufende Projektdokumentation umfasst Entwicklungsprotokolle, Architekturentscheidungen, Recoveryanweisungen, Testmatrizen, Buildnachweise und eine Roadmap. Erledigte Schritte werden von offenen Punkten getrennt.</p><p>Auch Fehlschläge gehören in den Entwicklungsstand. Wenn beispielsweise ein Fingerprint-Pfad nur teilweise funktioniert oder ein Übergang kurz schwarz wird, darf die Oberfläche nicht so beschrieben werden, als sei das Problem vollständig gelöst.</p>
    </section><section id="release" class="content-block reveal">
      <p class="eyebrow">04 // RELEASE DISCIPLINE</p>
      <h2>Warum die ISO noch nicht öffentlich verteilt wird</h2>
      <p>Eine öffentliche Betriebssystem-ISO kann reale Datenträger verändern. Deshalb reichen ein schöner Bootscreen und ein erfolgreicher Einzeltest nicht aus. Partitionierung, Installation, Bootloader, Anmeldung, Netzwerk, Updates, Recovery und Deinstallation benötigen belastbare Tests.</p><p>Erst wenn diese Pfade auf einer ausreichend breiten Hardwarematrix nachvollziehbar funktionieren, wird über eine Community-Freigabe entschieden. Bis dahin bleibt die ISO intern und die Website veröffentlicht ausschliesslich überprüfbare Entwicklungsinformationen.</p><div class="content-callout">RELEASE STANDARD // Sauber und wiederholbar vor schnell und spektakulär.</div>
    </section></article>
    </div>
    <section class="related-section section-shell" aria-labelledby="related-title">
      <p class="eyebrow">NEXT SIGNALS</p><h2 id="related-title">JARVIS weiter erkunden</h2>
      <div class="related-grid"><a class="related-card" href="/technik/"><span>JARVIS KNOWLEDGE</span><h3>Technik hinter JARVIS SYSTEM</h3><p>Technischer Überblick über UEFI-Bootmanager, Runtime, Unified Shell, Login, Hardwareerkennung und reale Telemetrie von JARVIS OS.</p><b>ÖFFNEN →</b></a><a class="related-card" href="/roadmap/"><span>JARVIS KNOWLEDGE</span><h3>Roadmap von JARVIS SYSTEM</h3><p>Die JARVIS-OS-Roadmap: vom Bootmanager über Hardwareportabilität, Secure Boot und Recovery bis zum kontrollierten Community-Release.</p><b>ÖFFNEN →</b></a><a class="related-card" href="/updates/"><span>DEVELOPMENT LOG</span><h3>Aktuelle Updates</h3><p>Nachvollziehbare Entwicklungsstände und verifizierte Meilensteine.</p><b>ÖFFNEN →</b></a></div>
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