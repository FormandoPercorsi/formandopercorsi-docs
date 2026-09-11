---
title: Ambiente di sviluppo locale
---

# Ambiente di sviluppo locale

Questa pagina descrive come predisporre in locale il servizio applicativo che espone l'API. Le applicazioni client sono progetti distinti, con una propria procedura di avvio.

## Requisiti

- [PHP 8.1 o superiore](https://www.php.net/manual/en/install.php)
- MySQL
- [Composer](https://getcomposer.org/)
- L'estensione `php8.1-mysql`
- Docker e Docker Compose, per il percorso consigliato

## Avvio con Docker

```bash
docker-compose up
```

Un unico comando avvia l'intero stack: il server web, il processo che consuma la coda dei lavori asincroni e la base dati.

## Avvio senza Docker

```bash
composer install      # installa le dipendenze
# definizione delle variabili d'ambiente (vedi sotto)
php yii migrate/up    # crea lo schema della base dati
yii serve             # avvia il server di sviluppo integrato
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
| **Varie** | `TRACKING_IP_HASH_SALT`, `AWS_CLOUDWATCH_LOG_GROUP`, `URL` |
| **Applicazione** | `YII_DEBUG`, `YII_ENV`, `FRONTEND_URL` |

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

:::caution
Lo schema della base dati di test proviene da un dump fisso, caricato prima di ogni suite, e non dalle migrazioni. Una migrazione che aggiunge o modifica una colonna va quindi replicata anche in quel dump: in caso contrario tutti i test che coinvolgono l'entità interessata falliscono con un errore di proprietà inesistente, che ha l'aspetto di un difetto del codice ma è in realtà un riferimento non aggiornato.
:::

## Generazione della specifica API

```bash
php docs/doc_generate.php
```

Il comando genera la specifica OpenAPI a partire dagli attributi PHP presenti nei controller, secondo le convenzioni di [swagger-php](https://zircote.github.io/swagger-php/). La stessa specifica, pubblicata dall'ambiente in esecuzione, è la sorgente da cui viene generata la [API Reference](/api/formando-percorsi-api) di questo sito: documentare una nuova operazione significa quindi aggiungere i relativi attributi al controller che la espone.
