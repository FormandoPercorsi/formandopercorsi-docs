---
title: Setup locale
---

# Setup locale

## Requisiti

- [PHP 8.1+](https://www.php.net/manual/en/install.php)
- MySQL
- [Composer](https://getcomposer.org/)
- `php8.1-mysql`
- Docker + Docker Compose (percorso consigliato)

## Avvio rapido con Docker

```bash
docker-compose up
```

Un solo comando avvia l'intero stack: Apache (web), il listener della coda asincrona, e il database.

## Setup manuale (senza Docker)

```bash
composer install                # installa le dipendenze
# definisci le variabili d'ambiente (vedi sotto)
php yii migrate/up               # crea lo schema del database
yii serve                        # avvia il server di sviluppo integrato
```

Una pratica comune è definire le variabili d'ambiente in un file `.env` (che va tenuto fuori da git):

```bash
export JWT_KEY='...'
export JWT_ID='...'
...
```

## Variabili d'ambiente richieste

Lette via `getenv()`, principalmente in `config/params.php`, `config/db.php`, `config/web.php`. Sono tutte necessarie per l'avvio dell'applicazione, anche quando la relativa integrazione di terze parti non serve in locale — se non le usi, definiscile come stringa vuota `''`.

| Gruppo | Variabili |
| --- | --- |
| **Database** | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` |
| **Email/SMTP** | `EMAIL_USERNAME`, `EMAIL_PASSWORD`, `SMTP_HOST`, `SMTP_PORT`, `SENDER_EMAIL`, `SENDER_NAME` |
| **JWT** | `JWT_KEY`, `JWT_ID`, `COOKIE_VALIDATION_KEY` |
| **Stripe** | `STRIPE_PUBLISHER_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_CHECKOUT_WEBHOOK_SECRET`, `STRIPE_CHECKOUT_WEBHOOK_SECRET_CONNECT`, `FORMANDO_PERCORSI_STRIPE_ACCOUNT_ID` |
| **Storage** | `STORAGE_DRIVER` (`local`\|`s3`), `STORAGE_PATH`, `STORAGE_URL`, `AWS_S3_BUCKET`, `AWS_S3_REGION`, `AWS_S3_BASE_PATH`, `IMAGES_PATH`, `VIDEO_BASE_PATH` |
| **Acube (fatturazione elettronica)** | `ACUBE_ENDPOINT`, `ACUBE_EMAIL`, `ACUBE_PASSWORD`, `ACUBE_PUBLIC_KEY`, `ACUBE_ENVIRONMENT`, `ACUBE_WH_PK_URL`, `FPC_IBAN`, `FPC_SDI_CODE` |
| **Google** | `GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_API_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `GOOGLE_CALENDAR_IMPERSONATE_EMAIL` |
| **WhatsApp** | `WHATSAPP_ENABLED`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` |
| **Contatti aziendali** | `ADMIN_EMAIL`, `ADMIN_PEC`, `ADMIN_PHONE`, `FPC_VAT_NUMBER` |
| **Varie** | `TRACKING_IP_HASH_SALT`, `AWS_CLOUDWATCH_LOG_GROUP`, `URL` |
| **App** | `YII_DEBUG`, `YII_ENV`, `FRONTEND_URL` |

:::warning
`ACUBE_ENVIRONMENT` deve corrispondere ad `ACUBE_ENDPOINT` (`sandbox`/`production`): l'host di login è condiviso tra i due ambienti, quindi un valore sbagliato autentica silenziosamente contro l'ambiente sbagliato.
:::

Per il frontend web (repository separato), le variabili equivalenti sono `REACT_APP_BACKEND_URL`, `REACT_APP_GOOGLE_CLIENT_ID`, `REACT_APP_GOOGLE_MAPS_KEY`, `REACT_APP_ENCRYPTION_KEY`, `REACT_APP_ENABLE_LOGS`, `REACT_APP_MAINTENANCE_MODE` — vedi [Il frontend web](/guides/guida-frontend).

## Database e coda

```bash
php yii migrate/up      # applica le migrazioni
php yii migrate/down    # annulla l'ultima migrazione
php yii queue/listen    # avvia manualmente il listener della coda (Docker lo fa già in automatico)
```

La coda è basata su database (tabella `queue`).

## Eseguire i test

I test usano Codeception, divisi in `tests/unit/` e `tests/functional/`. Vanno eseguiti **dentro il container Docker `web`**, perché `vendor/` non è condiviso con l'host:

```bash
docker compose exec web vendor/bin/codecept run           # tutte le suite
docker compose exec web vendor/bin/codecept run unit
docker compose exec web vendor/bin/codecept run functional
```

Lo schema del database di test proviene dal dump fisso `tests/_data/dev_base_dump.sql`, caricato prima di ogni suite — una migrazione che cambia una colonna va replicata anche in quel dump, altrimenti i test che toccano quel modello falliscono con `Getting unknown property`.

## Generare la documentazione API

```bash
php docs/doc_generate.php
```

genera `web/doc/openapi.yaml`/`.json` a partire dagli attributi [swagger-php](https://zircote.github.io/swagger-php/) (`#[OA\...]`) sparsi nei controller — non annotazioni PHPDoc, attributi PHP 8. Questo stesso file è la fonte da cui viene generata la [API Reference](/api/formando-percorsi-api) su questo sito.
