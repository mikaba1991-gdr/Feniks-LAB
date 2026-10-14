# Messa online su Cloudflare

Da fare una volta, con **account intestati a Giada** (Michele come collaboratore).
Le soglie gratuite vanno verificate al momento dell'attivazione.

## 1. Cloudflare Pages

1. Cloudflare → Workers & Pages → Create → Pages → collega il repository GitHub.
2. Impostazioni di build:
   - Branch di produzione: `main`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Variabile `SITE_URL` = dominio definitivo (es. `https://www.dominio.it`), serve a sitemap e canonical.
   - Variabile `PUBLIC_TURNSTILE_SITE_KEY` = site key del widget Turnstile (punto 3).
3. Le altre configurazioni (nome progetto, binding R2) sono in `wrangler.toml`.

## 2. R2 (foto e documenti delle richieste)

1. R2 → Create bucket → nome `feniks-lab-richieste` (deve coincidere con `wrangler.toml`).
2. **Regola di conservazione**: bucket → Settings → Object lifecycle rules → Add rule
   - Prefisso: `richieste/`
   - Azione: elimina gli oggetti **365 giorni** dopo la creazione.
   Così foto, documenti e dati delle richieste si cancellano da soli dopo 12 mesi (GDPR).
3. Il bucket resta privato: i file si scaricano solo dai link firmati dell'email.

## 3. Turnstile (anti-spam)

Turnstile → Add widget → dominio del sito → modalità "Managed".
- Site key → variabile di build `PUBLIC_TURNSTILE_SITE_KEY`
- Secret key → segreto `TURNSTILE_SECRET` (punto 5)

## 4. Resend (email)

1. Crea l'account e verifica il dominio (record DNS SPF/DKIM su Cloudflare).
2. Crea una API key con permesso di invio.

## 5. Segreti e variabili delle Functions

Pages → progetto → Settings → Variables and Secrets (ambiente Production):

| Nome | Tipo | Valore |
|---|---|---|
| `TURNSTILE_SECRET` | Secret | secret key Turnstile |
| `RESEND_API_KEY` | Secret | API key Resend |
| `FILE_LINK_SECRET` | Secret | stringa casuale lunga (es. `openssl rand -base64 32`). Se cambia, i vecchi link smettono di funzionare |
| `MAIL_TO` | Variabile | casella di Giada che riceve le schede |
| `MAIL_FROM` | Variabile | es. `Feniks LAB <richieste@dominio.it>` (dominio verificato su Resend) |

Non impostare `MAIL_DRY_RUN` in produzione.

## 6. Dominio, email e statistiche

- Dominio: registrar italiano, DNS su Cloudflare, poi Pages → Custom domains.
- Email Routing: `info@dominio` → casella attuale di Giada.
- Web Analytics: Pages → progetto → Metrics → abilita Web Analytics (senza cookie, nessun banner).
- Google Search Console: verifica il dominio e invia `https://dominio/sitemap-index.xml`.

## Verifica dopo il primo deploy

1. Invia una richiesta di prova dal telefono con 2–3 foto.
2. Controlla che a Giada arrivi la scheda e al cliente la conferma.
3. Apri un link a una foto dall'email: deve aprirsi; modificando un carattere del link deve dare "Link non valido".

## 7. Pannello contenuti (Decap CMS, ospitato sul sito)

Il pannello è in `/admin` ed è parte del sito: nessun servizio esterno. I contenuti restano file nel
repository (`src/content/`), quindi ogni modifica di Giada è un commit su `main` e Cloudflare
ricostruisce il sito in 2–3 minuti.

1. **App OAuth su GitHub** (una volta): GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
   (meglio crearla nell'account o organizzazione che possiede il repository).
   - Homepage URL: `https://dominio.it`
   - Authorization callback URL: `https://dominio.it/api/callback`
   - Genera un Client secret.
2. In Cloudflare Pages → Settings → Variables and Secrets:
   - `GITHUB_OAUTH_CLIENT_ID` (variabile) = Client ID
   - `GITHUB_OAUTH_CLIENT_SECRET` (secret) = Client secret
3. **Giada**: crea un account GitHub gratuito suo; nel repository → Settings → Collaborators la inviti
   con permesso di scrittura. Da quel momento entra da `https://dominio.it/admin` con "Accedi con GitHub".
4. Consigliato: su GitHub attiva per Giada (e per te) la verifica in due passaggi.
5. In Cloudflare → Notifications attiva l'avviso "Pages build failed": se un campo salvato non è valido
   la build si ferma con file e campo indicati, e il sito resta alla versione precedente.

Note:
- Se cambia il dominio, aggiorna Homepage e callback URL dell'app OAuth.
- Aggiornare Decap: `sh scripts/aggiorna-decap.sh <versione>` (scarica dal registro npm solo i file
  compilati in `public/admin/decap/`), poi prova `/admin` in anteprima prima di unire.
- Prova in locale senza GitHub: `npx decap-server` + `npm run dev`, poi `http://localhost:4321/admin/index.html`.
