# JARVIS Threat Ledger Automation

GitHub Actions ruft stündlich die öffentliche JARVIS-Threat-API ab. Das
Validierungsskript verwirft jede Antwort, die Rohdatenfelder, unbekannte
Ereignisfelder oder eine unzulässige Kompromittierungsbehauptung enthält.
Positionsdaten werden nur angenommen, wenn sie mit einem Land verbunden und
auf das öffentliche Zwei-Grad-Raster begrenzt sind.

`data/hourly-threat-ledger.json` wird nur geändert und committed, wenn sich die
authentifizierten Ereignisdaten tatsächlich verändert haben. Laufende
Heartbeats erzeugen deshalb keine künstlichen GitHub-Updates.

Discord ist von der stündlichen Website-Aktualisierung getrennt. Der tägliche
V2-Workflow liest ausschließlich den exakten öffentlichen Schema-2-Endpunkt,
prüft dessen Datenschutz-, Wahrheits- und Integritätsvertrag und sendet
höchstens einen zweisprachigen, stillen Digest pro UTC-Tag. Erwähnungen sind
gesperrt. Erst nach einem echten Discord-Receipt wird ein Zustand gespeichert;
dieser enthält nur Datum, Notice-ID, öffentliche Quellsequenz und den Hash des
Receipts – niemals Webhook oder Nachrichten-ID. Die Benachrichtigung bleibt
deaktiviert, solange das Repository-Secret `DISCORD_THREAT_WEBHOOK_URL` nicht
eingerichtet ist.
