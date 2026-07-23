# JARVIS Threat Ledger Automation

GitHub Actions ruft stündlich die öffentliche JARVIS-Threat-API ab. Das
Validierungsskript verwirft jede Antwort, die Rohdatenfelder, unbekannte
Ereignisfelder oder eine unzulässige Kompromittierungsbehauptung enthält.
Positionsdaten werden nur angenommen, wenn sie mit einem Land verbunden und
auf das öffentliche Zwei-Grad-Raster begrenzt sind.

`data/hourly-threat-ledger.json` wird nur geändert und committed, wenn sich die
authentifizierten Ereignisdaten tatsächlich verändert haben. Laufende
Heartbeats erzeugen deshalb keine künstlichen GitHub-Updates.

Eine Discord-Nachricht wird ebenfalls nur bei einer echten Datenänderung
versendet und enthält keine Erwähnungen. Sie bleibt deaktiviert, solange das
Repository-Secret `DISCORD_THREAT_WEBHOOK_URL` nicht eingerichtet ist.
