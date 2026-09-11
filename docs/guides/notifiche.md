---
title: Notifiche
---

# Notifiche

Il sistema comunica agli utenti gli eventi che li riguardano attraverso notifiche applicative, affiancate quando previsto da email. Ogni notifica ha un tipo che identifica univocamente l'evento, così che i client possano tradurla in un messaggio e, ove pertinente, in un'azione. Le operazioni di consultazione e aggiornamento sono documentate nella sezione [Notification](/api/notification) della API Reference.

## Struttura della notifica

| Campo | Formato | Descrizione |
| --- | --- | --- |
| `id` | intero | Identificatore univoco. |
| `type` | stringa | Tipo dell'evento; determina l'interpretazione dei metadati. |
| `status` | `unread` \| `read` \| `accepted` \| `rejected` \| `archived` \| `deleted` | Stato della notifica. |
| `metadata` | oggetto | Informazioni aggiuntive, la cui struttura dipende dal tipo. |
| `accept_link` / `reject_link` | stringa o `null` | Collegamenti per accettare o rifiutare, quando l'evento richiede una decisione. |
| `created_at`, `updated_at`, `read_at`, `deleted_at` | `Y-m-d H:i:s` | Riferimenti temporali. |
| `created_by`, `updated_by` | intero | Autore della creazione e dell'ultimo aggiornamento. |

La presenza di `accept_link` e `reject_link` è l'elemento che distingue una notifica puramente informativa da una che richiede un'azione dell'utente. Un client che ignori questi campi lascia l'utente senza modo di rispondere.

## Lezioni

| Tipo | Destinatario | Evento |
| --- | --- | --- |
| `new_single_lesson_booked_family` / `_teacher` | Famiglia / Insegnante | Prenotazione di una lezione singola. |
| `new_training_booked_family` / `_teacher` | Famiglia / Insegnante | Prenotazione di un percorso formativo. |
| `single_lesson_deleted_from_teacher_family` / `_teacher` | Famiglia / Insegnante | Cancellazione da parte dell'insegnante. |
| `single_lesson_deleted_from_family_family` / `_teacher` | Famiglia / Insegnante | Cancellazione da parte della famiglia. |
| `lesson_undo_delete_teacher` / `_family` | Insegnante / Famiglia | Annullamento di una cancellazione entro il termine consentito. |
| `lesson_modified_same_teacher_family` / `_teacher` | Famiglia / Insegnante | Modifica senza cambio di insegnante. |
| `lesson_modified_different_teacher_old_teacher` / `_new_teacher` / `_family` | Insegnante precedente / Nuovo insegnante / Famiglia | Modifica con cambio di insegnante. |
| `lesson_modify_requested_from_teacher_family` / `_teacher` | Famiglia / Insegnante | Richiesta di modifica avanzata dall'insegnante; la notifica alla famiglia richiede una decisione. |
| `lesson_modify_confirmed_family` / `_teacher` | Famiglia / Insegnante | Accettazione della richiesta di modifica. |
| `lesson_modified_rejected_family` / `_teacher` | Famiglia / Insegnante | Rifiuto della richiesta di modifica. |

I metadati riportano l'identificativo della lezione; le notifiche di modifica riportano sia la lezione precedente sia quella nuova, per consentire il confronto. Le notifiche relative ai percorsi riportano l'elenco delle lezioni coinvolte e il tipo di percorso.

## Passaggio di classe

| Tipo | Destinatario | Evento |
| --- | --- | --- |
| `school_year_promoted` | Famiglia | Lo studente è stato promosso all'anno successivo; la notifica richiede conferma. |
| `school_year_school_reset` | Famiglia | Lo studente ha concluso il ciclo scolastico: scuola e anno di corso vengono azzerati ed è necessario selezionare una nuova scuola prima di poter prenotare. |

Entrambe sono generate dall'attività pianificata annualmente a inizio settembre. La seconda ha un effetto operativo diretto: **fino alla nuova selezione della scuola lo studente non può prenotare lezioni**, poiché le materie disponibili dipendono da scuola e anno di corso.

## Fatturazione

Generate in risposta agli aggiornamenti provenienti dal canale di fatturazione elettronica. I metadati riportano l'identificativo della fattura.

| Tipo | Evento |
| --- | --- |
| `invoice_sent` | Fattura trasmessa correttamente al Sistema di Interscambio. |
| `invoice_accepted` | Fattura consegnata al destinatario. |
| `invoice_rejected` | Fattura rifiutata per errori di contenuto o problemi tecnici. |
| `invoice_not_delivered` | Fattura validamente emessa ma non recapitabile al destinatario. |
| `invoice_quarantena` | Primo tentativo di trasmissione non riuscito; il sistema ritenterà automaticamente. |

Il flusso completo di fatturazione è descritto in [Pagamenti, payout e fatturazione](/guides/pagamenti).

## Altri eventi

| Tipo | Destinatario | Evento |
| --- | --- | --- |
| `policy_updated` | Insegnanti e studenti | Aggiornamento dei termini e delle condizioni di servizio. |
| `new_teacher_application` | Amministrazione | Ricezione di una nuova candidatura da insegnante. Si veda [Teacher Application](/api/teacher-application). |

## Recapito e stato di adozione

Le notifiche vengono recuperate dai client per interrogazione periodica: **non esiste alcun canale in tempo reale**. L'applicazione web interroga l'API ogni cinque minuti, con richieste aggiuntive immediatamente dopo le azioni che possono generare notifiche.

:::caution Copertura parziale nei client
L'applicazione web gestisce esplicitamente solo un sottoinsieme dei tipi elencati: prenotazione, cancellazione e modifica delle lezioni, percorsi formativi e fatturazione. Gli altri tipi vengono presentati come notifica generica, priva di testo specifico e — per quelli che richiedono una decisione — priva dell'azione corrispondente.

Non sono attualmente gestiti l'annullamento di una cancellazione, il passaggio di classe, l'aggiornamento dei termini di servizio e le nuove candidature. Le relative notifiche restano recuperabili dall'API, ma nessun utente le vede tradotte in un messaggio comprensibile. Prima di affidare a una di queste notifiche una comunicazione rilevante — l'esito di una promozione, un aggiornamento contrattuale — è necessario verificare che il client di destinazione la gestisca.
:::
