---
title: Ambiente di sviluppo locale
---

# Ambiente di sviluppo locale

Questa pagina descrive come predisporre in locale il servizio applicativo che espone l'API. Le applicazioni client sono progetti distinti, con una propria procedura di avvio. Gli ambienti remoti di sviluppo e produzione sono descritti in [Ambienti di sviluppo e produzione](/guides/ambienti), il rilascio su di essi in [Rilascio e operatività con `fpc`](/guides/rilascio-fpc).

## Requisiti

- Docker e Docker Compose, per il percorso consigliato
- In alternativa, per l'avvio senza Docker: [PHP](https://www.php.net/manual/en/install.php) 8.1 o superiore con le estensioni `pdo_mysql` e `mysqli`, MySQL e [Composer](https://getcomposer.org/)

Le immagini distribuite negli ambienti remoti usano PHP 8.5: è la versione su cui il codice è effettivamente in esercizio, e quella da preferire anche in locale.

## Avvio con Docker

```bash
docker-compose up
```

Un unico comando avvia l'intero stack, composto da tre container:

| Container | Contenuto | Porta sull'host |
| --- | --- | --- |
| `web` | Apache con l'applicazione e, nello stesso container, il processo che consuma la coda dei lavori asincroni (`php yii queue/listen`). Il codice è montato dalla copia locale, quindi le modifiche sono visibili senza ricostruire l'immagine. | `APP_PORT` |
| `db` | MySQL della base dati di sviluppo, con i dati persistiti in un volume. | `3306` |
| `testdb` | MySQL dedicato alla suite di test, separato dalla base di sviluppo. | `3307` |

Le variabili d'ambiente sono lette dalla shell o da un file `.env` nella radice del progetto. Oltre a quelle elencate più avanti, Docker Compose richiede `APP_PORT` e le credenziali della base di test (`TEST_DB_NAME`, `TEST_DB_USERNAME`, `TEST_DB_PASSWORD`); host e porta delle due basi dati sono impostati dal file di composizione.

In locale non ci sono attività pianificate: i comandi che negli ambienti remoti girano da soli (derivazione delle disponibilità, liquidazioni, promemoria…) si eseguono a mano quando servono, con `docker compose exec web php yii <comando>`. L'elenco è in [Attività pianificate e comandi console](/guides/attivita-pianificate).

## Avvio senza Docker

```bash
composer install      # installa le dipendenze
# definizione delle variabili d'ambiente (vedi sotto)
php yii migrate/up    # crea lo schema della base dati
php yii serve         # avvia il server di sviluppo integrato
```

È prassi consigliata raccogliere le variabili d'ambiente in un file dedicato, escluso dal controllo di versione:

```bash
export JWT_KEY='...'
export JWT_ID='...'
```

## Variabili d'ambiente

Tutte le variabili elencate sono necessarie all'avvio dell'applicazione, anche quando la corrispondente integrazione esterna non viene utilizzata in locale: in tal caso vanno definite come stringa vuota.

| Gruppo | Variabili |
| --- | --- |
| **Base dati** | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` |
| **Posta elettronica** | `EMAIL_USERNAME`, `EMAIL_PASSWORD`, `SMTP_HOST`, `SMTP_PORT`, `SENDER_EMAIL`, `SENDER_NAME` |
| **Autenticazione** | `JWT_KEY`, `JWT_ID`, `COOKIE_VALIDATION_KEY` |
| **Stripe** | `STRIPE_PUBLISHER_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_CHECKOUT_WEBHOOK_SECRET`, `STRIPE_CHECKOUT_WEBHOOK_SECRET_CONNECT`, `FORMANDO_PERCORSI_STRIPE_ACCOUNT_ID` |
| **Archiviazione file** | `STORAGE_DRIVER` (`local`\|`s3`), `STORAGE_PATH`, `STORAGE_URL`, `AWS_S3_BUCKET`, `AWS_S3_REGION`, `AWS_S3_BASE_PATH`, `IMAGES_PATH`, `VIDEO_BASE_PATH` |
| **Fatturazione elettronica** | `ACUBE_ENDPOINT`, `ACUBE_EMAIL`, `ACUBE_PASSWORD`, `ACUBE_PUBLIC_KEY`, `ACUBE_ENVIRONMENT`, `ACUBE_WH_PK_URL`, `FPC_IBAN`, `FPC_SDI_CODE` |
| **Google** | `GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_API_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `GOOGLE_CALENDAR_IMPERSONATE_EMAIL` |
| **WhatsApp** | `WHATSAPP_ENABLED`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` |
| **Contatti aziendali** | `ADMIN_EMAIL`, `ADMIN_PEC`, `ADMIN_PHONE`, `FPC_VAT_NUMBER` |
| **Bollo virtuale** (facoltative) | `BOLLO_VIRTUAL_AUTH_NUMBER`, `BOLLO_VIRTUAL_AUTH_DATE`, `BOLLO_VIRTUAL_AUTH_OFFICE` — estremi dell'autorizzazione stampati sulle ricevute quando il bollo virtuale è attivo; senza numero e data la ricevuta ricade sulla marca fisica |
| **Varie** | `TRACKING_IP_HASH_SALT`, `AWS_CLOUDWATCH_LOG_GROUP`, `URL` |
| **Applicazione** | `YII_DEBUG`, `YII_ENV`, `FRONTEND_URL` |
| **Test** | `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_NAME`, `TEST_DB_USERNAME`, `TEST_DB_PASSWORD` |

In locale conviene usare `STORAGE_DRIVER=local`, che salva i file caricati nella cartella `uploads/` del progetto (o in `STORAGE_PATH`), le credenziali di test di Stripe e la sandbox di ACube.

:::warning
`ACUBE_ENVIRONMENT` deve corrispondere ad `ACUBE_ENDPOINT` (`sandbox` oppure `production`). L'host di autenticazione è condiviso fra i due ambienti: un valore errato non produce alcun errore, ma autentica silenziosamente contro l'ambiente sbagliato.
:::

Le variabili dell'applicazione web sono elencate in [Applicazione web](/guides/guida-frontend).

## Base dati e coda dei lavori

```bash
php yii migrate/up      # applica le migrazioni
php yii migrate/down    # annulla l'ultima migrazione
php yii queue/listen    # avvia il consumo della coda (già attivo nell'ambiente Docker)
```

La coda dei lavori asincroni è persistita sulla base dati.

## Esecuzione dei test

La suite di test va eseguita **all'interno del container `web`**, poiché le dipendenze non sono condivise con la macchina host:

```bash
docker compose exec web vendor/bin/codecept run             # tutte le suite
docker compose exec web vendor/bin/codecept run unit
docker compose exec web vendor/bin/codecept run functional
```

Alcune caratteristiche della suite vanno conosciute prima di scrivere un test:

- **Lo schema della base di test è costruito dalle migrazioni**, mai da un dump. Prima di ogni suite viene confrontato l'elenco delle migrazioni con quelle già applicate e, se ne manca qualcuna, viene eseguito `php yii migrate/up --db=testdb`; una base vuota si costruisce quindi da sola al primo avvio. Una nuova migrazione non richiede alcun adeguamento dei dati di test.
- **I dati di riferimento da cui dipende la produzione** — città, province, regioni, tipi di notifica, fasce, livelli assicurativi, normative fiscali, metriche di tracking — sono inseriti dalle migrazioni stesse e non vanno replicati nei dati di test.
- **Il resto del mondo di test è scritto a mano**, in `tests/_data/fixtures/`: scuole, materie, sedi, tariffe, scuole esterne e un cast volutamente ridotto di utenti (due famiglie, due insegnanti, un amministratore, il titolare di una scuola esterna). Un test che ha bisogno di un soggetto particolare lo costruisce da sé, anziché ampliare il cast.
- **Nessun test raggiunge Stripe o ACube**: le classi che li integrano sono sostituite da imitazioni all'avvio della suite.
- **Le cartelle dei test non vanno annidate oltre due livelli** sotto `tests/unit/` o `tests/functional/`: percorsi più profondi bloccano l'esecuzione della suite sul volume montato da Docker.

Nessuna pipeline esegue i test automaticamente: vanno lanciati a mano prima di ogni merge.

## Generazione della specifica API

```bash
php docs/doc_generate.php
```

Il comando genera la specifica OpenAPI (in `web/doc/`) a partire dagli attributi PHP presenti nei controller, secondo le convenzioni di [swagger-php](https://zircote.github.io/swagger-php/). La stessa specifica, pubblicata dall'ambiente in esecuzione, è la sorgente da cui viene generata la [API Reference](/api/formando-percorsi-api) di questo sito: documentare una nuova operazione significa quindi aggiungere i relativi attributi al controller che la espone.

Negli ambienti remoti la specifica è rigenerata a ogni costruzione dell'immagine ed è servita dal backend stesso su `/doc/openapi.yaml`, senza autenticazione. Perché una modifica alle annotazioni compaia nella API Reference di questo sito occorrono quindi il rilascio del backend e, dopo, la ricostruzione della documentazione: entrambi i passaggi si ottengono con `--with-docs`, come descritto in [Rilascio e operatività con `fpc`](/guides/rilascio-fpc#anatomia-di-un-rilascio-completo-del-backend).

Alcune operazioni non sono annotate e non compaiono quindi nella reference. Si tratta in parte di chiamate da server a server — i webhook di Stripe (`/api/payment/webhook/checkout`) e di ACube (`/api/invoice/webhook/*`), descritti in [Ambienti di sviluppo e produzione](/guides/ambienti#integrazioni-esterne-per-ambiente) — e in parte di operazioni applicative a cui l'annotazione manca per omissione, fra cui la modifica di una lezione già prenotata (`PUT /api/lesson/single/{id}`), le proposte di lezione dell'insegnante, l'emissione di una nota di credito, il dettaglio pubblico di un insegnante e alcune opzioni delle metriche. Aggiungere le annotazioni mancanti è sufficiente a farle comparire nella reference al rilascio successivo.
