# Jarvis Systems Website

Einfache Startseite mit HTML, CSS und JavaScript. Das Projekt ist für GitHub
und Cloudflare Pages vorbereitet.

## Lokal starten

```powershell
pnpm install
pnpm dev
```

## Cloudflare Pages

Empfohlene Einstellungen für die GitHub-Integration:

- Production branch: `main`
- Framework preset: `None`
- Build command: leer lassen
- Build output directory: `public`
- Root directory: `/`

Alternativ ist nach der Cloudflare-Anmeldung ein direkter Upload möglich:

```powershell
pnpm deploy
```
