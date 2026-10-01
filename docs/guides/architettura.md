---
title: Architettura del sistema
---

# Architettura del sistema

La piattaforma è composta da un servizio applicativo centrale, da una o più applicazioni client che vi accedono tramite API REST, e da un insieme di integrazioni con servizi esterni. Questa pagina descrive come queste parti sono organizzate e come vengono rilasciate. Per una descrizione dei processi di business si veda [Panoramica della piattaforma](/guides/piattaforma).

## Il quadro d'insieme

```
   Applicazioni client                   Servizi esterni
   (famiglie, insegnanti,                Stripe · Acube/SDI
    amministrazione)                     Google Calendar · WhatsApp · SMTP
          │                                        ▲
          │ HTTPS / JSON                           │
          ▼                                        │
   ┌──────────────────────────────────────────────────────┐
   │                    API REST                          │
   │  autenticazione · validazione · regole di business   │
   ├──────────────────────────────────────────────────────┤
   │  Elaborazioni asincrone                              │
   │  coda dei lavori · attività pianificate              │
   ├──────────────────────────────────────────────────────┤
   │                    Base dati                         │
   └──────────────────────────────────────────────────────┘
```

Non esiste un livello intermedio fra client e servizio applicativo: instradamento, logica di business, persistenza, lavorazioni asincrone e integrazioni con terze parti risiedono tutti nello stesso servizio. Di conseguenza **ogni regola descritta in queste guide è applicata lato server**, indipendentemente da quanto un client scelga di replicarne la logica per fini di interfaccia.

## Il contratto verso i client

L'accesso avviene esclusivamente tramite l'API REST documentata nella [API Reference](/api/formando-percorsi-api). Alcune caratteristiche trasversali:

- **Autenticazione a token.** Ogni richiesta autenticata espone un token JWT di breve durata; il rinnovo avviene tramite un refresh token. Si veda [Autenticazione](/guides/autenticazione).
- **Autorizzazione per categoria.** Le tre categorie di utenza — famiglia, insegnante, amministrazione — determinano quali endpoint sono accessibili e quale livello di dettaglio viene restituito sulle stesse entità.
- **Errori tipizzati.** Le condizioni di errore sono espresse con codici HTTP: `400` per input non valido, `401` per token assente o scaduto, `403` per ruolo non abilitato, `500` per errori interni. Il dettaglio per ogni operazione è nella reference.
- **Fuso orario.** Tutti gli orari sono espressi in `Europe/Rome`, nel formato `Y-m-d H:i:s`.

## Ambienti e rilascio

Lo **stesso codice** viene distribuito su due ambienti, ciascuno sul proprio sottodominio:

| Ambiente | API | Applicazione web | Branch del backend | Branch del frontend |
| --- | --- | --- | --- | --- |
| Sviluppo | `dev.api.formandopercorsi.com` | `dev.formandopercorsi.com` | `develop` | `develop` |
| Produzione | `api.formandopercorsi.com` | `formandopercorsi.com` | `main` | `master` |

Un ambiente di pre-produzione è previsto dall'infrastruttura ma non è attivo. La distinzione fra ambienti è determinata dalla configurazione — base dati, credenziali, servizi esterni, indirizzi pubblici — e non da versioni divergenti del codice: in particolare gli interruttori delle funzionalità sono parte del codice e sono identici nei due ambienti a parità di versione. La composizione di ciascun ambiente su AWS e le differenze fra i due sono descritte in [Ambienti di sviluppo e produzione](/guides/ambienti).

Nessuno dei rilasci è automatico. La pubblicazione avviene in due passaggi distinti, entrambi eseguiti con lo strumento operativo `fpc` del repository [`FormandoPercorsi/aws`](https://github.com/FormandoPercorsi/aws):

1. **Costruzione delle immagini.** Dopo il push sul branch dell'ambiente si avvia il workflow di costruzione su GitHub Actions, che pubblica le immagini su ECR.
2. **Rilascio sui servizi in esecuzione**, preceduto dalle migrazioni della base dati quando la release ne contiene.

I due passaggi possono essere eseguiti con un solo comando; ad esempio, per il backend in sviluppo:

```bash
./fpc deploy --env dev --component="service:rest,service:queue" --build --migrate --force-redeploy --with-docs --yes
```

Il significato di ogni opzione, l'ordine in cui le fasi vengono eseguite e gli altri casi d'uso (frontend, sola documentazione, variabili d'ambiente, attività pianificate, comandi una tantum, accesso alla base dati) sono descritti in [Rilascio e operatività con `fpc`](/guides/rilascio-fpc).

Poiché la specifica OpenAPI viene rigenerata dal codice sorgente a ogni costruzione dell'immagine, la [API Reference](/api/formando-percorsi-api) di ciascun ambiente rispecchia ciò che in quell'ambiente è effettivamente in esecuzione. Questa documentazione viene a sua volta costruita scaricando la specifica dal backend **in esecuzione**: perché l'API Reference recepisca nuove annotazioni OpenAPI, l'immagine della documentazione va ricostruita e rilasciata dopo il rilascio del backend, ciò che l'opzione `--with-docs` fa contestualmente.

## Elaborazioni asincrone

Due meccanismi distinti eseguono lavoro al di fuori del ciclo richiesta/risposta:

- **Coda dei lavori**, persistita su base dati, per operazioni innescate da un'azione utente ma troppo onerose per essere svolte durante la richiesta (invii massivi di email, sincronizzazioni con servizi esterni).
- **Attività pianificate**, eseguite a cadenza fissa da task effimeri avviati da regole Amazon EventBridge: derivazione notturna delle disponibilità prenotabili, ricalcolo degli indicatori di ordinamento, liquidazione mensile e giornaliera dei compensi, promemoria delle lezioni, scadenza delle coperture assicurative, decadenza delle richieste di modifica e delle cancellazioni dell'insegnante non risolte, passaggio di classe annuale, aggregazione delle metriche di utilizzo.

Per chi integra un client la conseguenza pratica è che **alcuni dati cambiano senza che il client abbia compiuto alcuna azione**: gli slot prenotabili, l'ordinamento dei risultati di ricerca, lo stato di una fattura e il saldo dei crediti possono variare fra due chiamate successive.

Ogni esecuzione di un'attività pianificata è registrata con il proprio esito e con le unità di lavoro che non è riuscita a trattare, consultabili dall'area amministrativa: si veda [Area amministrativa e controllo operativo](/guides/amministrazione). Il calendario completo, con i comandi da eseguire a mano, è in [Attività pianificate e comandi console](/guides/attivita-pianificate).

## Organizzazione interna del servizio applicativo

Questa sezione interessa chi lavora al codice del backend. Il servizio è realizzato con il framework Yii2 (PHP) e segue una separazione di responsabilità costante in tutto il progetto.

Il percorso di una richiesta attraversa sempre gli stessi livelli:

1. La rotta viene risolta e instradata verso un **controller**.
2. Il controller verifica autenticazione e autorizzazione, e delega la validazione dell'input a un **form model**.
3. La logica di business è affidata a un **service** di dominio.
4. La risposta viene composta da un **assembler**, che traduce le entità di dominio in **DTO** coerenti con il ruolo di chi ha effettuato la richiesta.

| Livello | Responsabilità |
| --- | --- |
| **Controller** | Esclusivamente azioni REST: nessuna logica di business. |
| **Form model** | Validazione della richiesta, separata dalle entità persistenti. |
| **Modello** | Entità della base dati. |
| **Service** | Logica di business, organizzata per dominio funzionale. |
| **Assembler / DTO** | Composizione della risposta in funzione del ruolo e del livello di dettaglio. |
| **Validator** | Regole di validazione condivise fra più form. |
| **Comando console** | Attività pianificate e lavorazioni asincrone. |

Due convenzioni hanno effetti visibili anche dall'esterno e vale la pena conoscerle:

- **Cancellazione logica.** Le entità principali non vengono rimosse dalla base dati: cambiano stato. Per le lezioni viene inoltre registrato il motivo della cancellazione e il soggetto che l'ha richiesta, informazione da cui dipendono sia la copertura assicurativa sia l'indicatore di affidabilità dell'insegnante usato in ricerca.
- **Transazionalità.** Ogni operazione che scrive su più tabelle è racchiusa in una transazione: in caso di errore parziale non resta stato incoerente. Questo vale in particolare per prenotazione, modifica e liquidazione dei compensi.

## Domini funzionali

| Dominio | Contenuto | Approfondimento |
| --- | --- | --- |
| Disponibilità | Derivazione degli slot prenotabili, ordinamento degli insegnanti in ricerca | [Disponibilità](/guides/disponibilita), [Ordinamento dei risultati](/guides/ranking-insegnanti) |
| Lezioni | Creazione, modifica e cancellazione di lezioni e percorsi | [Percorsi formativi](/guides/percorsi-formativi), [Modifiche e cancellazioni](/guides/modifiche-cancellazioni) |
| Prezzi e pagamenti | Determinazione del prezzo, incasso, liquidazione dei compensi | [Pagamenti, payout e fatturazione](/guides/pagamenti) |
| Fatturazione | Fatturazione elettronica, fatture esterne e ricevute | [Documenti fiscali e ricevute](/guides/documenti-fiscali) |
| Scuole esterne | Territori di competenza, modalità di incasso, abilitazione sui servizi esterni | [Scuole esterne, provider e incasso](/guides/scuole-esterne) |
| Assicurazione | Coperture, sinistri e compensazione dell'insegnante | [Copertura assicurativa](/guides/assicurazione) |
| Crediti e referral | Maturazione e utilizzo del credito famiglia e del credito insegnante | [Crediti e programma referral](/guides/referral-crediti), [Crediti degli insegnanti](/guides/crediti-insegnanti) |
| Notifiche | Comunicazioni in-app ed email | [Notifiche](/guides/notifiche) |
| Anagrafiche | Scuole, città, province, sedi | [School](/api/school), [City](/api/city), [Province](/api/province), [Headquarter](/api/headquarter) |
| Contenuti didattici | Materie, argomenti, esercizi | [Subject](/api/subject), [Topic](/api/topic), [StudentExercise](/api/student-exercise) |
| Calendario | Sincronizzazione Google Calendar e collegamenti per le lezioni online | — |
| Statistiche | Indicatori aggregati su lezioni, disponibilità, utenti e flussi economici | [Statistiche e indicatori](/guides/statistiche) |
| Tracking e metriche | Raccolta degli eventi di utilizzo e loro aggregazione in metriche configurabili | [Tracking degli eventi e metriche](/guides/tracking-metriche) |

La sincronizzazione con Google Calendar avviene interamente da server a server: i client non vi partecipano in alcun modo.
