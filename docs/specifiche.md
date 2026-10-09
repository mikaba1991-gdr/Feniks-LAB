# Sito Feniks LAB – Specifiche e progetto tecnico

Oct 9, 2026 · @Michele

## Contesto e obiettivi

Il sito di Feniks LAB (Ing. Giada Molari) deve trasformare richieste generiche in schede cliente già compilate, così che lei possa fare preventivi rapidi e a prezzo basso. La parte energia va online per prima: è quella che oggi genera lavoro.

**Posizionamento.** È uno studio di ingegneria che offre due servizi diversi: termotecnica e interior & garden design. Il sito deve presentare la combinazione come un punto di forza ("uno studio che rinnova la casa, dall'impianto all'arredo"), senza sembrare dispersivo. In futuro lei vorrebbe seguire cantieri interi.

**Obiettivi misurabili**

- Richieste di conto termico e detrazioni da privati e soprattutto da installatori, in tutta Italia, gestite da remoto.
- Preventivi interior generati in modo semi-automatico in base a metratura e scelte del cliente.
- Contenuti aggiornabili da lei in autonomia: mappa dei lavori e notizie sulla normativa.
- Visibilità su Google per ricerche legate ai suoi servizi.

**Vincoli**

- Costi ricorrenti minimi: nessuna spesa scaricabile.
- Sviluppo nel tempo libero di Michele, con Claude Code.
- Rilascio a fasi: prima l'energia, il design dopo con un avviso "in arrivo".

## Specifiche funzionali

Il sito ha una home "studio di ingegneria" che si divide in due rami: Energia e Design. Ogni ramo ha i suoi servizi e il suo modulo guidato, che produce una scheda cliente pronta da valutare. I campi esatti dei moduli li fornirà Giada via email.

### Home (studio)

- Chi è: Ing. Giada Molari, foto, breve storia, valori.
- Servizi di ingegneria in sintesi, con due ingressi grandi verso Energia e Design.
- Richiamo a lavori recenti (dalla mappa) e ultime notizie.
- Contatti diretti: telefono, WhatsApp, email.

### Ramo Energia (fase 1, priorità massima)

- **Pagine servizio:** Conto termico, Detrazioni fiscali, Progettazione impianti / Legge 10. Più sintetiche di eco-bonus.it.
- **"Parla con l'esperto":** pulsante sempre visibile con chiamata, WhatsApp e richiesta di ricontatto.
- **Due percorsi distinti:** privato e installatore/idraulico. L'installatore è il cliente più prezioso: porta più pratiche.
- **Modulo guidato per pratica:** dati preliminari (luogo, tipo di intervento, superficie immobile, impianto esistente e nuovo), caricamento foto e documenti, contatti, consenso privacy.
- **Output:** email a Giada con scheda cliente leggibile e allegati, più email di conferma al cliente.

### Ramo Design (fase 2, bilingue IT/EN)

- **Pacchetti a prezzo fisso**, sul modello Havenly: per esempio consulenza online, progetto stanza, progetto completo.
- **Quiz di stile:** il cliente sceglie tra immagini, indica metratura, stanza, budget, mobili da tenere, idee già chiare.
- **Calcolo preventivo automatico** in base a stanza, metratura e pacchetto. Va mostrato come "stima indicativa", poi confermata da Giada.
- **Scheda cliente** inviata a Giada con foto e preferenze.
- **Portfolio** prima/dopo.
- Durante la fase 1 la sezione mostra una pagina "in arrivo" con contatto.

### Contenuti aggiornabili da Giada

- **Lavori:** titolo, città (con coordinate), tipo di servizio, foto, breve testo. Compaiono su mappa ed elenco.
- **Notizie e normativa:** articoli e video incorporati (YouTube). Sono anche il motore SEO del sito.
- **Portfolio design:** progetti con foto prima/dopo.
- **Testi principali** delle pagine servizio (non layout e struttura).

### Requisiti trasversali

- Mobile first: gran parte del traffico arriverà da Instagram e da telefono.
- GDPR: informativa, consenso esplicito per foto e indirizzi, cookie banner solo se si usano strumenti di tracciamento.
- SEO tecnico: una pagina per ogni servizio, URL parlanti, dati strutturati, sitemap, Search Console.
- Prestazioni: pagine leggere e veloci, immagini ottimizzate automaticamente.

## Siti di riferimento: cosa prendere e cosa no

Da eco-bonus.it prendiamo il doppio percorso privato/installatore e il metodo a fasi; da Havenly i pacchetti a prezzo chiaro e il quiz di stile. Entrambi sono molto più grandi di quanto serva qui.

| Elemento | Sito | Cosa ne facciamo |
| --- | --- | --- |
| Offerta separata per installatori (gestione diretta o cliente inviato con sconto) | [eco-bonus.it](https://www.eco-bonus.it/servizi/conto-termico/) | Sì, versione semplice: pagina "Per installatori" e codice sconto per i clienti inviati |
| Pulsante "Parla con un esperto" ripetuto | eco-bonus.it | Sì, fisso su mobile |
| Metodo in fasi (verifica, lavori, documenti, invio al GSE, pagamento) | eco-bonus.it | Sì, come schema visivo breve |
| FAQ approfondite su requisiti e immobili ammessi | eco-bonus.it | Sì, poche e mirate: sono ottime per la SEO |
| Calcolatore incentivo, area riservata clienti, ticketing | eco-bonus.it | No in fase 1: costoso da fare e da tenere aggiornato |
| Pagina lunghissima con testimonianze | eco-bonus.it | No, versione corta; recensioni Google quando ci saranno |
| Pacchetti con prezzo, tempi, ruolo del cliente, cosa si riceve | [Havenly](https://havenly.com/interior-design-services) | Sì, 2–3 pacchetti in tabella chiara |
| Quiz di stile con immagini | Havenly | Sì, ridotto: 5–8 domande |
| Prima/dopo con cursore | Havenly | Sì, nel portfolio |
| FAQ su foto e misure da inviare | Havenly | Sì, riduce le domande ripetute |
| Shop di arredi, AI design, rete di designer | Havenly | No |

Nota tecnica: Havenly è costruito con Astro, lo stesso framework proposto nel capitolo successivo. Non è una garanzia, ma conferma che la scelta regge anche su siti grandi.

## Capitolo tecnico

La scelta è un sito statico in Astro su Cloudflare, con un CMS basato su Git per i contenuti di Giada e funzioni serverless per i moduli. I costi ricorrenti si riducono al solo dominio, circa 10–20 €/anno, e non c'è un server da mantenere o aggiornare.

### Stack scelto

| Componente | Scelta | Perché | Costo/anno |
| --- | --- | --- | --- |
| Framework | Astro + TypeScript | Pagine statiche velocissime (ottime per la SEO), componenti interattivi solo dove servono, routing bilingue nativo | 0 € |
| Hosting | Cloudflare Pages | Piano gratuito molto generoso, HTTPS e CDN inclusi, deploy automatico da GitHub | 0 € |
| CMS per Giada | Decap CMS (o Sveltia CMS, compatibile) su `/admin` | Interfaccia a moduli; salva i contenuti come file nel repository, quindi niente database | 0 € |
| Moduli e caricamento file | Cloudflare Pages Functions + R2 (storage) | Il codice riceve i dati, salva le foto, compone la scheda cliente | 0 € entro le soglie gratuite |
| Invio email | Resend (o simile) | Scheda cliente a Giada e conferma al cliente dal dominio del sito | 0 € entro le soglie gratuite |
| Anti-spam | Cloudflare Turnstile | Alternativa gratuita al captcha, senza cookie di tracciamento | 0 € |
| Mappa lavori | Leaflet + OpenStreetMap | Gratuita; i punti arrivano dai lavori inseriti nel CMS | 0 € |
| Statistiche | Cloudflare Web Analytics | Senza cookie, quindi niente banner solo per questo | 0 € |
| Email sul dominio | Cloudflare Email Routing → casella attuale di Giada | Inoltro gratuito di info@dominio | 0 € |
| Dominio | Registrar italiano, DNS gestiti su Cloudflare | Unica spesa fissa | 10–20 € |

*Soglie e piani gratuiti (Cloudflare, Resend) vanno verificati al momento dell'attivazione: sono stime, non certezze.*

### Scelte che fanno la differenza su qualità, prezzo e guadagno

1. **Prezzi dei pacchetti design nel CMS.** Il calcolatore legge un file di configurazione modificabile da Giada (prezzo base per stanza, euro/m², maggiorazioni). Lei cambia i prezzi senza chiamare te.
2. **Moduli generati da configurazione.** Ogni modulo (conto termico, detrazioni, quiz design) è descritto in un file con campi, passaggi e foto richieste. Un solo componente li disegna tutti. Aggiungere un modulo nuovo diventa un lavoro di minuti, non di giorni.
3. **Scheda cliente fatta bene.** L'email a Giada contiene un riepilogo ordinato e i link alle foto salvate su R2, con scadenza. Questo è il pezzo che le fa risparmiare tempo davvero.
4. **Conservazione limitata dei dati.** Regola automatica su R2 che cancella le foto dopo un periodo fissato (es. 12 mesi). Riduce il rischio GDPR senza lavoro manuale.
5. **Account intestati a lei.** Dominio, Cloudflare e Resend vanno a nome di Giada, con te come collaboratore. Il repository può restare tuo durante lo sviluppo e poi essere trasferito o condiviso.

### Perché non WordPress

WordPress con Elementor costa oltre 200 €/anno, richiede aggiornamenti continui di plugin e sicurezza ed è più lento. Il vantaggio reale è che Giada lo conosce già. Il CMS proposto è però più semplice: ha solo i campi che le servono, niente costruttore di pagine in cui perdersi. *(Altamente fiducioso)*

### Punto debole da sapere

Il repository resta sul GitHub di Michele. Per usare il pannello, Giada crea il proprio account GitHub gratuito e viene aggiunta come collaboratrice con accesso in scrittura. Non va usato l'account di Michele né creato un account a suo nome da altri: ognuno accede con le proprie credenziali. Serve anche un piccolo servizio di autenticazione (una Function in più). In alternativa si valuta Pages CMS, che semplifica l'accesso.

## Fasi, ore e proposta economica

Con le specifiche arrivate il lavoro sale a circa 60–100 ore totali, più della prima stima di 40–70. Il perimetro è cresciuto: due moduli guidati, calcolatore preventivi, CMS, percorso installatori. La proposta è 1.000–1.600 € in due rate legate alle fasi.

| Fase | Contenuto | Ore stimate | Prezzo amico |
| --- | --- | --- | --- |
| 0. Base | Repository, Astro, Cloudflare, dominio, stile grafico dalla bozza, home | 8–12 | incluso in fase 1 |
| 1. Energia | Pagine servizio, pagina installatori, moduli conto termico e detrazioni con foto, email scheda cliente, CMS (lavori, notizie, mappa), SEO tecnico, privacy, pagina "Design in arrivo" | 32–50 | 600–950 € |
| 2. Design | Pacchetti, quiz di stile, calcolatore preventivo, portfolio prima/dopo, versione inglese | 20–35 | 400–650 € |
| Trasversale | Formazione di Giada sul pannello, revisioni, test su telefono | inclusa sopra | inclusa |
| **Totale** |  | **60–97** | **1.000–1.600 €** |

**Tariffa effettiva.** Con circa 80 ore e 1.300 € sono circa 16 €/h. È un prezzo da amica: va bene se lo fai anche per esperienza e portfolio, ma conviene esserne consapevoli. *(Moderatamente fiducioso sulle ore)*

**Manutenzione dopo il rilascio.** Esclusa dal prezzo. Proposta: 150–250 €/anno per piccoli interventi e aggiornamenti, oppure tariffa oraria a chiamata. I contenuti li gestisce lei dal pannello.

**Dove si può limare**

- Quiz di stile senza immagini (scelte testuali): circa −5 ore.
- Inglese solo sulle pagine design principali, non su notizie e portfolio: circa −5 ore.
- Testi scritti interamente da Giada, tu impagini e basta: risparmio sulle revisioni.
- Calcolatore design rimandato: in fase 2 solo prezzi fissi dei pacchetti.

**Cosa può fare Giada per accelerare:** testi delle pagine servizio, elenco campi e foto per ogni modulo, prezzi dei pacchetti, foto dei progetti, logo vettoriale.

## Rischi e domande aperte

Il rischio principale non è tecnico ma di perimetro: un progetto tra amici tende a crescere. Va fissato per iscritto cosa è incluso, prima di iniziare.

| Rischio | Effetto | Contromisura |
| --- | --- | --- |
| Il perimetro cresce durante il lavoro | Ore raddoppiate a parità di prezzo | Elenco funzioni concordato; il resto diventa "fase 3" a parte |
| Aspettative SEO troppo alte su "conto termico" | Delusione nei primi mesi | Chiarire subito: risultati in mesi, guidati dagli articoli e dalle ricerche specifiche |
| Preventivo automatico preso come prezzo vincolante | Contestazioni dai clienti | Dicitura "stima indicativa, confermata dopo verifica" |
| Foto e indirizzi di privati | Responsabilità GDPR di Giada | Informativa chiara, consenso esplicito, cancellazione automatica |
| Normativa che cambia (es. Conto Termico 3.0) | Testi e moduli superati | Testi e campi modificabili da CMS e configurazione |
| Tempo libero di Michele limitato | Uscita della fase 1 che slitta | Date indicative, non promesse; fase 1 ridotta all'essenziale |

**Domande per Giada (da chiudere con l'email)**

- [ ] Elenco campi, foto e documenti richiesti per conto termico e detrazioni, separati per privato e installatore.
- [ ] Per gli installatori: solo modulo dedicato o anche condizioni economiche riservate (listino, codice sconto)?
- [ ] Pacchetti design: quanti, cosa include ciascuno, logica di prezzo (per stanza, per m², maggiorazioni).
- [ ] Inglese: solo ramo design o anche home?
- [ ] Dominio: ne ha già uno? Nome preferito?
- [ ] Testi: li scrive lei o servono bozze da rivedere?
- [ ] Foto professionali e logo vettoriale disponibili?
- [ ] Contatti pubblici: telefono, WhatsApp, orari.
- [ ] Data obiettivo per la fase 1.
