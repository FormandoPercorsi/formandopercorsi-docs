---
title: Architettura e moduli
---

# Architettura e moduli

## Il quadro d'insieme

`formandopercorsi-backend` è **l'intero backend**: un'API REST Yii2 (PHP) autenticata via JWT che serve i client di famiglie/studenti/insegnanti e il pannello admin. Non esiste un backend-for-frontend o un gateway separato — routing, logica di business, persistenza, job asincroni e integrazioni con terze parti (Stripe, fatturazione elettronica Acube, Google Calendar, WhatsApp) vivono tutti qui. I frontend sono repository separati.

Lo **stesso codice** viene distribuito su `develop` (deploy automatico), pre-produzione e `master`/produzione: l'ambiente è determinato da `YII_ENV`/`YII_DEBUG`, non da un fork o da branch diversi.

## Il percorso di una richiesta

1. La rotta viene abbinata in `config/routes.php` → smistata a `modules/api/controllers/*Controller`.
2. Il controller estende `RestBaseController` (autenticazione JWT + CORS + controllo accessi).
3. L'input viene validato da un **form model** (`modules/api/models/`) che estende `BaseForm`.
4. La logica di business è delegata a un **service** (`services/<dominio>/`).
5. La risposta viene serializzata da un **DTO** (`models/dto/`), assemblato da un **assembler** (`assemblers/`).

## I livelli principali

| Livello | Dove | Responsabilità |
| --- | --- | --- |
| **Controller** | `modules/api/controllers/` | Solo azioni REST, nessuna logica di business. Restituiscono array grezzi o DTO. |
| **Form model** | `modules/api/models/` | Solo validazione della richiesta; estendono `BaseForm`. Separati dai model ActiveRecord. |
| **Model ActiveRecord** | `models/` | Entità del database; classe base `app\models\base\Record` (aggiunge `TimestampBehavior` + `BlameableBehavior`, non soft-delete). |
| **DTO** | `models/dto/` | Forme di risposta serializzabili; implementano `JsonSerializable`. Creati via `<Entità>Assembler::toArray($entità, $detailLevel)`. |
| **Service** | `services/` | Logica di business, organizzata per dominio (`lesson/`, `payments/`, `availability/`, `invoice/`, `credit/`, `referral/`, ...). |
| **Assembler** | `assemblers/` | Mappano i model ActiveRecord ai DTO in base al ruolo/livello di dettaglio di chi guarda. |
| **Comandi console** | `commands/` | Job asincroni; estendono `AsyncBaseController`. Invocati via `php yii <comando-kebab>/<azione>` o accodati sulla coda basata su database. |
| **Helper** | `helpers/` | Utility stateless. `EmailHelper::sendEmail()` è l'unico punto d'ingresso per tutte le email in uscita. |
| **Validator** | `validators/` | Validatori custom che estendono `yii\validators\Validator`, specchiando la struttura a domini di form/service. |

### Soft delete

Non è gestito genericamente dalla classe base: è una convenzione per-model tramite una colonna `status` con costanti definite dal model stesso.

- `User` usa interi: `STATUS_DELETED = 0`, `STATUS_INACTIVE = 9`, `STATUS_ACTIVE = 10`.
- La maggior parte degli altri model (`Lesson`, `Availability`, `AvailabilityGroup`, `LessonOrder`, ...) usa stringhe: `STATUS_DELETED = 'deleted'`, `STATUS_ACTIVE = 'active'`, ...
- `Lesson` registra anche *il motivo* della cancellazione tramite una colonna `deletion_reason` più `deleted_by_user_id`; va sempre cancellata tramite `Lesson::markDeleted($reason, $status, $actorId)`, mai assegnando `status` a mano.

### Aggiungere un nuovo endpoint

1. Form model in `modules/api/models/<dominio>/` che estende `BaseForm`.
2. Azione nel controller `modules/api/controllers/<Dominio>Controller` con attributo `#[OA\Post(...)]` (o simile) — questo è ciò che genera la [API Reference](/api/formando-percorsi-api).
3. Rotta in `config/routes.php`, raggruppata per dominio seguendo i commenti già presenti.

### Job asincroni

`Yii::$app->queue->push(new SomeJob($data))` da un controller. La coda è basata su database (tabella `queue`); il listener (`php yii queue/listen`) gira come processo in background nel container Docker insieme ad Apache.

## Moduli per dominio (`services/<dominio>/`)

| Dominio | Cosa contiene |
| --- | --- |
| `availability` | Availability → Effective Availability → Consecutive Availability, ranking insegnanti. Vedi [Disponibilità](/guides/disponibilita) e [Ranking insegnanti](/guides/ranking-insegnanti). |
| `credit` | Saldo/ledger crediti famiglia. Vedi [Referral & Crediti](/guides/referral-crediti). |
| `insurance` | Assicurazione lezione, sinistri, compenso insegnante. Vedi [Assicurazione](/guides/assicurazione). |
| `invoice` | Fatturazione elettronica (Acube/SDI) e fatture/ricevute esterne. Vedi [Pagamenti & Fatturazione](/guides/pagamenti). |
| `lesson` | Creazione, modifica, cancellazione lezione; tipi di notifica in `lesson/notification/`. |
| `lessonPriceCalculation` | Pricing band e calcolo del costo lezione. Vedi [Pagamenti & Fatturazione](/guides/pagamenti). |
| `mailer` | Orchestrazione email in uscita (wrappa `EmailHelper`). |
| `notification` | Servizi di notifica in-app per evento di dominio. Vedi [Notifiche](/guides/notifiche). |
| `payments` | Elaborazione payout mensile/giornaliero, ledger, Stripe. Vedi [Pagamenti & Fatturazione](/guides/pagamenti). |
| `policy` | Notifiche di aggiornamento termini e condizioni. |
| `promotion` | Sconti/coupon promozionali. |
| `referral` | Link e inviti referral. Vedi [Referral & Crediti](/guides/referral-crediti). |
| `school` | Catalogo scuole, passaggio di classe annuale. |
| `subject` / `subtopic` / `topic` | Tassonomia del curriculum. |
| `teacherApplication` | Candidature di nuovi insegnanti. |
| `track` / `trackingMetrics` | Tracking eventi e sistema di aggregazione metriche. |
| `user` | Servizi account utente/famiglia/insegnante. |
| `googlecalendar` | Sincronizzazione Google Calendar/Meet per le lezioni — interamente server-to-server, il frontend non è coinvolto. |

## Struttura del repository

```
modules/api/         # controller, form model, service scoped all'API
services/            # logica di business per dominio
assemblers/          # mapping ActiveRecord -> DTO in base al ruolo/dettaglio
models/              # entità ActiveRecord + models/dto/ per le risposte
validators/          # validatori custom, specchiano la struttura service/form
commands/            # comandi console per job asincroni
helpers/             # utility stateless (EmailHelper, ecc.)
exceptions/          # eccezioni di dominio custom
mail/                # template email
migrations/          # migrazioni database (Yii2 migrate)
config/              # config web/console, routes, params (incl. credenziali terze parti)
tests/               # Codeception: unit/ e functional/
docs/                # script di generazione della documentazione OpenAPI
```
