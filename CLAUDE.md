# CLAUDE.md — Sito Feniks LAB

> Questo file è il contesto permanente del progetto per Claude Code.
> Leggilo tutto prima di ogni task. Le specifiche di business complete sono nel documento
> "Sito Feniks LAB – Specifiche e progetto tecnico" (copia in `docs/specifiche.md`).
> Se una richiesta contraddice questo file, chiedi conferma prima di procedere.

## 1. Il progetto in breve

Sito per **Feniks LAB – Ing. Giada Molari**, studio di ingegneria con due rami:

- **Energia** (fase 1, priorità): conto termico, detrazioni fiscali, progettazione impianti / Legge 10.
  Clienti: privati e **installatori/idraulici** in tutta Italia, lavoro da remoto.
- **Design** (fase 2): interior & garden design, **bilingue IT/EN**, pacchetti a prezzo fisso,
  quiz di stile e calcolo preventivo indicativo.

Obiettivo centrale: ogni richiesta arriva a Giada come **scheda cliente completa** (dati + foto),
così lei prepara preventivi rapidi senza telefonate o sopralluoghi.

Vincoli: costi ricorrenti ≈ solo dominio; nessun server da mantenere; Giada aggiorna
i contenuti da sola tramite pannello `/admin`.

## 2. Stack (non cambiarlo senza chiedere)

| Area | Scelta |
|---|---|
| Framework | Astro (ultima versione stabile) + TypeScript strict |
| Stile | CSS nativo con custom properties (niente Tailwind, niente framework UI) |
| Interattività | Isole Astro con vanilla TS; Preact solo se un componente lo richiede davvero |
| Hosting | Cloudflare Pages, deploy automatico da branch `main` |
| Backend | Cloudflare Pages Functions in `functions/` |
| Storage file | Cloudflare R2, binding `RICHIESTE` |
| Email | Resend (API HTTP) |
| Anti-spam | Cloudflare Turnstile |
| CMS | **Decap CMS** ospitato sul sito in `/admin` (file in `public/admin/decap/`, versione bloccata, aggiornabile con `scripts/aggiorna-decap.sh`), configurato in `public/admin/config.yml`. Login GitHub tramite le Functions `/api/auth` e `/api/callback` (nessun servizio esterno a parte GitHub). Giada usa un suo account GitHub, collaboratrice del repository |
| Mappa | Leaflet + tile OpenStreetMap (con attribuzione obbligatoria), caricata in automatico quando entra nello schermo |
| Analytics | Cloudflare Web Analytics (senza cookie) |
| Package manager | npm, versioni fissate nel `package-lock.json` |

## 3. Ambiente di lavoro

- Si lavora con **Claude Code in cloud** sul repository GitHub di Michele.
- Ogni task: **branch dedicato** (`feat/…`, `fix/…`) → commit piccoli e descrittivi in italiano → **pull request**.
  Non fare push diretti su `main`.
- Prima di aprire la PR: `npm run build` e `npm run check` devono passare senza errori.
- **Nessun segreto nel repository.** Chiavi e token stanno solo nelle variabili d'ambiente
  di Cloudflare Pages. In locale/cloud usa `.dev.vars` (in `.gitignore`) con valori finti.
- Se ti serve un'informazione che non hai (testi, prezzi, campi dei moduli), **non inventarla**:
  usa un segnaposto evidente `TODO(Giada): …` e segnalalo nella descrizione della PR.

## 4. Struttura del repository

```
/
├─ CLAUDE.md
├─ docs/specifiche.md            # specifiche di business
├─ astro.config.mjs              # i18n, sitemap, integrazioni
├─ public/
│  └─ admin/                     # pannello Decap CMS (index.html, config.yml, decap/)
├─ src/
│  ├─ config/
│  │  ├─ forms/                  # un file JSON per modulo (vedi §6)
│  │  │  ├─ conto-termico.json
│  │  │  ├─ detrazioni.json
│  │  │  └─ design-quiz.json     # fase 2
│  │  └─ site.ts                 # nome, contatti, social (letti anche da content/settings)
│  ├─ content/                   # contenuti gestiti dal CMS (Content Collections)
│  │  ├─ lavori/                 # un .md per lavoro
│  │  ├─ notizie/                # articoli e video
│  │  ├─ portfolio/              # fase 2
│  │  ├─ pagine/                 # testi delle pagine servizio
│  │  └─ settings/               # contatti.json, prezzi-design.json
│  ├─ content.config.ts          # schemi Zod delle collection
│  ├─ components/
│  │  ├─ FormWizard.astro        # UN solo componente per tutti i moduli
│  │  ├─ MappaLavori.astro
│  │  ├─ ParlaConEsperto.astro   # CTA fissa su mobile
│  │  └─ …
│  ├─ layouts/
│  ├─ pages/
│  │  ├─ index.astro             # home studio
│  │  ├─ energia/…               # conto-termico, detrazioni, progettazione, installatori
│  │  ├─ design/…                # fase 2 (in fase 1: pagina "in arrivo")
│  │  ├─ en/design/…             # fase 2
│  │  ├─ lavori/…
│  │  ├─ notizie/…
│  │  └─ privacy.astro
│  └─ styles/tokens.css
└─ functions/
   └─ api/
      ├─ richiesta.ts            # POST: riceve i moduli
      └─ file/[[path]].ts        # GET: scarica file protetti da token
```

## 5. Design system

Riprendi la bozza grafica approvata (palette del logo Instagram, fenice).

```css
--bg:#F4E7E3; --surface:#FBF5F3; --ink:#2E2828; --muted:#6E6260;
--red:#9E1B22; --ember:#D9542B; --blush:#E9C3BE; --line:#DCC7C2; --cold:#3D6E8C;
--serif:"Fraunces", Georgia, serif;           /* titoli */
--sans:"Bricolage Grotesque", system-ui, sans-serif; /* testo */
```

- Elemento firma: la **fascia termica** (gradiente freddo → caldo) nella home.
- Mobile first, contrasto AA, focus visibile, `prefers-reduced-motion` rispettato.
- Tema scuro via `prefers-color-scheme`.
- Font self-hosted (pacchetti `@fontsource`) per evitare richieste a Google (GDPR).
- Immagini sempre con `astro:assets` (ridimensionamento e formati moderni automatici).

## 6. Moduli guidati: guidati da configurazione

Tutti i moduli usano `FormWizard.astro` e un file JSON. Nessun modulo scritto a mano.

```json
{
  "id": "conto-termico",
  "titolo": "Richiesta pratica Conto Termico",
  "destinatari": ["privato", "installatore"],
  "passi": [
    {
      "titolo": "Chi sei",
      "campi": [
        { "nome": "profilo", "tipo": "scelta", "opzioni": ["Privato", "Installatore"], "obbligatorio": true }
      ]
    },
    {
      "titolo": "L'immobile",
      "campi": [
        { "nome": "comune", "tipo": "testo", "obbligatorio": true },
        { "nome": "superficie_mq", "tipo": "numero", "min": 10, "max": 5000 },
        { "nome": "intervento", "tipo": "scelta", "opzioni": ["TODO(Giada)"] }
      ]
    },
    {
      "titolo": "Foto e documenti",
      "campi": [
        { "nome": "foto", "tipo": "file", "accetta": ["image/*", "application/pdf"],
          "maxFile": 10, "maxMB": 10,
          "aiuto": "Generatore attuale, targhetta, locale tecnico" }
      ]
    },
    { "titolo": "Contatti", "campi": "@contatti-standard" }
  ]
}
```

Tipi di campo: `testo`, `testoLungo`, `numero`, `email`, `telefono`, `scelta`, `sceltaMultipla`,
`sceltaImmagini` (quiz di stile), `file`, `consenso`.
Supporta `mostraSe: { "campo": "profilo", "valore": "Installatore" }` per campi condizionali.

Requisiti del wizard:
- Avanzamento a passi con barra di progresso; validazione per passo; tasto Indietro.
- Compressione delle immagini lato browser prima dell'invio (lato lungo max 2000 px).
- Salvataggio della bozza in `sessionStorage` per non perdere i dati se si ricarica la pagina.
- Consenso privacy obbligatorio, con link all'informativa, non pre-spuntato.
- Widget Turnstile nell'ultimo passo.
- Funziona senza JS? No: mostra un messaggio con email e telefono in `<noscript>`.

## 7. API `POST /api/richiesta`

Input: `multipart/form-data` con `form_id`, `dati` (JSON), `turnstile_token`, `file[]`.

Passi lato server:
1. Verifica Turnstile (`TURNSTILE_SECRET`). Fallito → 400.
2. Carica la config del modulo (importata in build) e **rivalida** i dati lato server.
3. Controlla i file: tipo MIME, numero, dimensione. Rifiuta il resto.
4. Genera `id` richiesta (`YYYYMMDD-xxxx`), salva i file in R2: `richieste/{anno}/{id}/{nomefile}`.
5. Invia a `MAIL_TO` un'email HTML con **scheda cliente** (campi in ordine, etichette leggibili)
   e link ai file `GET /api/file/{id}/{nome}?t={hmac}` firmati con `FILE_LINK_SECRET`, validi 90 giorni.
6. Invia al cliente un'email di conferma (senza allegati, senza dati sensibili ripetuti).
7. Risposta `200 { ok: true, id }`. Errori sempre in JSON con messaggio leggibile in italiano.

Variabili e binding: `RESEND_API_KEY`, `TURNSTILE_SECRET`, `FILE_LINK_SECRET`, `MAIL_TO`, `MAIL_FROM`, R2 `RICHIESTE`.
Pannello: `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET` (app OAuth GitHub).

Conservazione: regola di lifecycle R2 che elimina `richieste/` dopo 12 mesi (da configurare
nella dashboard; documentalo nella PR).

## 8. Contenuti gestiti da Giada (Content Collections)

- **lavori**: `titolo`, `data`, `citta`, `lat`, `lng`, `servizio` (enum: conto-termico | detrazioni |
  progettazione | interior | garden), `foto[]`, `descrizione`. Alimenta mappa ed elenco.
- **notizie**: `titolo`, `data`, `sommario`, `corpo` (markdown), `video` (URL YouTube opzionale), `tag[]`.
  I video si caricano solo al click (embed `youtube-nocookie`).
- **pagine**: testi delle pagine servizio (titolo, intro, sezioni, FAQ).
- **settings/contatti.json**: telefono, WhatsApp, email, orari.
- **settings/prezzi-design.json** (fase 2): prezzi base per pacchetto, €/m², maggiorazioni.

Gli schemi Zod devono dare errori chiari: se Giada sbaglia un campo, la build fallisce con un messaggio
che dice quale file e quale campo.

## 9. SEO

- Una pagina per servizio, URL parlanti (`/energia/conto-termico`).
- `<title>` e meta description per ogni pagina, da frontmatter.
- Dati strutturati JSON-LD: `ProfessionalService` (studio), `Service` (pagine servizio),
  `FAQPage` (FAQ), `Article` (notizie), `BreadcrumbList`.
- `@astrojs/sitemap`, `robots.txt`, canonical, `hreflang` IT/EN sulle pagine design.
- Open Graph con immagine per ogni pagina.
- Obiettivo Lighthouse ≥ 95 su Performance, SEO, Accessibilità (mobile).

## 10. Internazionalizzazione

- Config Astro i18n: `defaultLocale: "it"`, `locales: ["it","en"]`, italiano senza prefisso.
- Solo le pagine **design** (e home, se confermato) hanno la versione `/en/`.
- Stringhe di interfaccia in `src/i18n/{it,en}.json`; nessun testo hard-coded nei componenti condivisi.

## 11. Backlog — Fase 1 (Energia), in ordine

Ogni voce = una PR. Spunta solo quando la PR è unita.

- [ ] F1-01 Setup Astro + TS strict + struttura cartelle + deploy su Cloudflare Pages
- [ ] F1-02 Design system (`tokens.css`), layout base, header, footer, CTA "Parla con l'esperto"
- [ ] F1-03 Home studio (dalla bozza grafica)
- [ ] F1-04 Content Collections + schemi Zod (lavori, notizie, pagine, settings)
- [ ] F1-05 Pagine servizio Energia + pagina Installatori (testi da `content/pagine`)
- [ ] F1-06 `FormWizard` generico + config `conto-termico.json` e `detrazioni.json`
- [ ] F1-07 Function `/api/richiesta` + R2 + Resend + Turnstile + `/api/file`
- [ ] F1-08 Mappa lavori + elenco + pagina dettaglio lavoro
- [ ] F1-09 Notizie: elenco, dettaglio, video al click
- [ ] F1-10 SEO (§9), privacy, pagina 404, pagina "Design in arrivo"
- [ ] F1-11 Pannello CMS: Decap CMS in `/admin` con login GitHub dalle nostre Functions (decisione presa)
- [ ] F1-12 Guida d'uso per Giada in `docs/guida-pannello.md` (linguaggio semplice, con passi)

## 12. Backlog — Fase 2 (Design)

- [ ] F2-01 Pagine design + pacchetti (dati da CMS)
- [ ] F2-02 Quiz di stile (`design-quiz.json`, campo `sceltaImmagini`)
- [ ] F2-03 Calcolatore preventivo da `prezzi-design.json`, con dicitura "stima indicativa"
- [ ] F2-04 Portfolio con confronto prima/dopo
- [ ] F2-05 Versione inglese delle pagine design

## 13. Regole di comportamento per Claude Code

- Fai **una cosa per PR**. Se trovi un problema fuori dal task, annotalo nella PR, non correggerlo.
- Niente dipendenze nuove senza motivarle nella PR (peso, alternativa nativa considerata).
- Commenti nel codice in italiano, nomi di variabili e funzioni in inglese.
- Accessibilità non opzionale: etichette sui campi, ordine di tabulazione, messaggi di errore leggibili.
- Non inserire mai testi normativi o importi di incentivi "a memoria": vanno solo da contenuti forniti da Giada.
- Alla fine di ogni task scrivi nella PR: cosa hai fatto, come verificarlo, cosa resta aperto.

## Second brain di Michele
A fine sessione, se è successo qualcosa di rilevante a livello di progetto (tappa raggiunta, decisione importante, cambio di stato, blocco), crea il file C:\Users\MicheleAbate\Downloads\SecondoCervello_v2\SecondoCervello\00_Inbox\AAAA-MM-GG progetto Feniks-LAB.md con:
- prima riga `data: AAAA-MM-GG`
- da 1 a 3 righe di livello macro
Niente dettagli tecnici, codice, credenziali o dati di clienti. Se non è successo nulla di rilevante, non scrivere niente.
