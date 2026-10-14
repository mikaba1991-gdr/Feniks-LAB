# Sito Feniks LAB

Sito dello studio di ingegneria **Feniks LAB – Ing. Giada Molari**: ramo Energia (Legge 10, Conto Termico,
detrazioni) e, in fase 2, ramo Interior.

Contesto, regole e backlog sono in [`CLAUDE.md`](CLAUDE.md); le specifiche di business in
[`docs/specifiche.md`](docs/specifiche.md); la messa online in [`docs/deploy.md`](docs/deploy.md).

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm install` | Installa le dipendenze (Node ≥ 22.12) |
| `npm run dev` | Sito in sviluppo su `http://localhost:4321` (senza Functions; mostra anche le bozze) |
| `npm run build` | Genera il sito statico in `dist/` |
| `npm run preview` | Sito + Functions + R2 simulato su `http://localhost:8788` (serve `.dev.vars`, vedi sotto) |
| `npm run check` | Controllo dei tipi (Astro + Functions) |
| `npm test` | Test della logica di moduli, firme, file e login del pannello (test runner nativo di Node) |
| `npx decap-server` | Con `npm run dev`: pannello Decap in locale su `http://localhost:4321/admin/index.html`, scrive direttamente nei file |

### Provare l'invio dei moduli in locale

```sh
cp .dev.vars.example .dev.vars   # valori finti, MAIL_DRY_RUN="1" stampa le email nel terminale
npm run build && npm run preview
```

La chiave Turnstile di test fa sempre passare la verifica; i file finiscono in un R2 simulato in `.wrangler/`.

## Dove si trova cosa

- `src/config/forms/*.json` – moduli guidati (campi, passi, foto). Un solo componente li disegna: `src/components/FormWizard.astro`.
- `src/lib/forms/` – validazione condivisa tra browser e server, scheda cliente, nomi file.
- `functions/api/richiesta.ts` – riceve i moduli, salva su R2, invia email (Resend).
- `functions/api/file/[[path]].ts` – download dei file con link firmato (90 giorni).
- `src/content/` – contenuti di Giada: `notizie/` (Aggiornamenti), `pagine/` (Chi sono e pagine servizio), `settings/contatti.json`. `lavori/` resta pronto ma per ora non è pubblicato (niente pagine né mappa).
- `public/admin/` – pannello Decap CMS (`config.yml` definisce cosa Giada può modificare); login in `functions/api/auth.ts` e `callback.ts`.
- `docs/mockup/` – proposte grafiche in HTML statico. Giada ha scelto la **A**, che è la grafica del sito.
- I testi da completare sono segnati `TODO(Giada)` e appaiono evidenziati in giallo nel sito.
