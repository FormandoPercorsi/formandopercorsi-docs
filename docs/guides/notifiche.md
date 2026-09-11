---
title: Notifiche
---

# Notifiche

Le notifiche sono oggetti standardizzati, ognuno con un `type` che identifica univocamente l'evento a cui si riferisce.

## L'oggetto notifica

| Campo | Formato | Descrizione |
| --- | --- | --- |
| `id` | `integer` | Identificatore univoco |
| `type` | `string` (max 100) | Tipo dell'evento — vedi tabelle sotto |
| `status` | `unread` \| `read` \| `accepted` \| `rejected` \| `archived` \| `deleted` | Stato della notifica |
| `metadata` | `json` | Informazioni aggiuntive, dipendenti dal tipo |
| `accept_link` / `reject_link` | `string` \| `null` | Link frontend per accettare/rifiutare, se applicabile |
| `created_at`, `updated_at`, `read_at`, `deleted_at` | `Y-m-d H:i:s` | Timestamp |
| `created_by`, `updated_by` | `integer` | Chi ha creato/aggiornato |

## Lezioni: prenotazione, cancellazione, modifica

| Type | Destinatario | Quando |
| --- | --- | --- |
| `new_single_lesson_booked_family` / `_teacher` | Famiglia / Insegnante | Nuova lezione singola prenotata |
| `new_training_booked_family` / `_teacher` | Famiglia / Insegnante | Nuovo percorso formativo prenotato (metadata: `lessons_id[]`, `training_type_id`) |
| `single_lesson_deleted_from_teacher_family` / `_teacher` | Famiglia / Insegnante | L'insegnante cancella una lezione |
| `single_lesson_deleted_from_family_family` / `_teacher` | Famiglia / Insegnante | La famiglia cancella una lezione |
| `lesson_undo_delete_teacher` / `_family` | Insegnante / Famiglia | L'insegnante annulla una propria cancellazione entro la finestra consentita |
| `lesson_modified_same_teacher_family` / `_teacher` | Famiglia / Insegnante | Lezione modificata senza cambio di insegnante |
| `lesson_modified_different_teacher_old_teacher` / `_new_teacher` / `_family` | Vecchio insegnante / Nuovo insegnante / Famiglia | Lezione modificata con cambio di insegnante |
| `lesson_modify_requested_from_teacher_family` / `_teacher` | Famiglia / Insegnante | L'insegnante richiede una modifica (la notifica alla famiglia porta `accept_link`/`reject_link` verso `teacher/lesson/modify-confirm|reject?lesson_modification_request_id={id}`) |
| `lesson_modify_confirmed_family` / `_teacher` | Famiglia / Insegnante | La famiglia accetta la richiesta di modifica dell'insegnante |
| `lesson_modified_rejected_family` / `_teacher` | Famiglia / Insegnante | La famiglia rifiuta la richiesta di modifica |

Metadata tipiche: `lesson_id` (intero), oppure `old_lesson_id`+`new_lesson_id` per le notifiche di modifica che confrontano lezione precedente e nuova.

## Passaggio di classe annuale

| Type | Destinatario | Quando |
| --- | --- | --- |
| `school_year_promoted` | Famiglia (guardian) | Lo studente è promosso alla classe successiva. `accept_link` verso `family/school-year/confirm?student_id={id}` |
| `school_year_school_reset` | Famiglia (guardian) | Lo studente ha completato un ciclo scolastico (5ª elementare, 3ª media, 5ª superiore, 5° anno università): scuola e anno corrente vengono azzerati e va riselezionata una nuova scuola prima di poter prenotare |

Generate da `php yii school-year/rollover`, il job schedulato annualmente il 1° settembre. Metadata: `student_id`, `school_year`.

## Fatture

Inviate da `InvoiceWebhooksController` in reazione ai webhook Acube (SDI). Metadata: sempre `invoice_id`.

| Type | Quando |
| --- | --- |
| `invoice_sent` | La fattura è stata inviata correttamente allo SDI |
| `invoice_rejected` | Rifiutata dallo SDI per errori di contenuto o problemi tecnici |
| `invoice_accepted` | Consegnata al destinatario |
| `invoice_not_delivered` | Non consegnabile al destinatario (ma comunque emessa validamente) |
| `invoice_quarantena` | Il primo tentativo di invio allo SDI è fallito; il sistema riproverà automaticamente |

Vedi [Pagamenti & Fatturazione](/guides/pagamenti) per il flusso di fatturazione completo.

## Altro

| Type | Destinatario | Quando |
| --- | --- | --- |
| `policy_updated` | Insegnanti e studenti | I termini e condizioni sono stati aggiornati |
| `new_teacher_application` | Tutti gli admin | Una nuova candidatura da insegnante è stata inviata (metadata: `teacher_application_id`) |

## Stato di implementazione nel frontend web

`NotificationsBar.tsx` gestisce esplicitamente solo un sottoinsieme dei tipi qui sopra; qualsiasi altro tipo ricade su un generico "Notifica sconosciuta", senza icona dedicata né, per i tipi con `accept_link`/`reject_link`, alcuna azione disponibile in UI.

Gestiti: tutte le notifiche di lezione (prenotazione/cancellazione/modifica), percorso formativo, fatture.

**Non ancora gestiti**: `lesson_undo_delete_*`, `school_year_promoted`/`school_year_school_reset`, `policy_updated`, `new_teacher_application`. Nessun utente le vede tradotte in un messaggio leggibile sul frontend web attuale — restano pura entità di dominio recapitabile via `GET /api/notification`, ma senza copertura UI. Da tenere presente prima di fare affidamento su queste notifiche per comunicare qualcosa di importante agli utenti (l'esito della promozione di classe, un aggiornamento dei termini di servizio).

Il polling avviene ogni 5 minuti su `GET /api/notification`, più refresh on-demand dopo azioni di prenotazione/modifica/cancellazione — non c'è alcun canale realtime (nessun WebSocket/SSE).
