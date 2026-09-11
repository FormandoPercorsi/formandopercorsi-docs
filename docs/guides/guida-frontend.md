---
title: Il frontend web
---

# Il frontend web

Questa pagina raccoglie informazioni su come il frontend web (`formandopercorsi-frontend`) usa concretamente l'API — cose che non emergono dalla sola API Reference perché sono decisioni implementative del client, non del contratto REST.

## Configurazione ambiente

| Variabile | Uso |
| --- | --- |
| `REACT_APP_BACKEND_URL` | Base URL del backend; il client Axios la usa come `baseURL + '/api'` |
| `REACT_APP_ENCRYPTION_KEY` | Cifra (AES) i ruoli utente salvati in `localStorage` — vedi la nota di sicurezza in [Autenticazione](/guides/autenticazione) |
| `REACT_APP_GOOGLE_CLIENT_ID` | Google Sign-In |
| `REACT_APP_ENABLE_LOGS` | Abilita log applicativi extra |
| `REACT_APP_MAINTENANCE_MODE` | Se `true`, tutte le rotte (tranne `/admin/*`) mostrano una pagina di manutenzione |

:::warning Gap noto
`EditableMap.tsx` referenzia `REACT_APP_GOOGLE_MAPS_KEY`, che non è presente nel file `.env` versionato — va procurata a parte per il setup locale della mappa indirizzi.
:::

## Client API

Istanza Axios singola con un interceptor di richiesta che inietta `Authorization: Bearer <token>` da `localStorage.authToken`, e un interceptor di risposta che gestisce i `401`. Per il comportamento completo di login/refresh/logout vedi [Autenticazione](/guides/autenticazione).

## Prenotazione: regole che vivono solo nel client

Vedi [Disponibilità](/guides/disponibilita) e [Percorsi formativi](/guides/percorsi-formativi) per il modello dati; qui invece le scelte implementative del frontend, non deducibili dall'API Reference:

- **Parsing difensivo** della risposta di `/availability/search`: il payload può arrivare come array, oggetto singolo o assente, sia per `availabilities` che per `exact_availabilities`/`near_availabilities`. Stesso pattern per `/headquarter`.
- **Selezione automatica dello slot più vicino**: per i percorsi formativi, `all_alternatives[]` è ordinato per vicinanza all'orario desiderato e il frontend seleziona di default il primo elemento quando non esiste uno slot esatto.
- **Location `home`**: senza un `address_id` selezionato, il backend ripiega sul default della famiglia e il controllo del raggio di copertura può fallire con `400` — il frontend forza un sotto-flusso di creazione/selezione indirizzo prima di procedere.
- **Cutoff di 48 ore** per cancellazione/modifica, hardcoded lato client in due punti indipendenti — corrisponde a `criticalTimes.lessonDeletionFromFamiliesWarningTime` lato backend (vedi [Assicurazione](/guides/assicurazione)). Asimmetria da conoscere: le lezioni singole restano cancellabili entro le 48 ore, quelle di un percorso formativo no (solo modificabili).
- **Codice promo `FREE26`** hardcoded: applicato automaticamente quando `GET /promotion` restituisce una promozione di tipo `free_lesson_teacher_paid` compatibile.
- **Nessun campo referral** nel form di registrazione famiglia — coerente con l'assenza di UI referral, vedi [Referral & Crediti](/guides/referral-crediti).
- **Nessun indicatore di ranking** in `TeacherCard.tsx`: gli insegnanti sono mostrati nell'ordine restituito dall'API, già ordinato server-side — vedi [Ranking insegnanti](/guides/ranking-insegnanti).

## Pagamenti e fatture

Vedi [Pagamenti & Fatturazione](/guides/pagamenti) per il flusso end-to-end. Lato client: redirect pieno del browser verso Stripe Checkout, pagine dedicate di successo/annullo, e uno stato fattura mostrato in UI che è un sottoinsieme hardcoded dei valori reali del backend — da tenere sincronizzato se cambiano.

## Notifiche

Polling di `GET /api/notification` ogni 5 minuti, più refresh on-demand dopo azioni di prenotazione/modifica/cancellazione. Diversi tipi esistenti lato backend non sono ancora gestiti — elenco completo in [Notifiche](/guides/notifiche).

## Ruoli e routing

Tre categorie utente: `family`, `teacher`, `admin` (parametro `category` su signin/signup). Un HOC di autenticazione protegge ogni pagina: reindirizza chi non è loggato al login, allontana i teacher da `/family/*` e viceversa, allontana i non-admin da `/admin/*`. Le rotte sono organizzate a specchio (`/family/*`, `/teacher/*`, `/admin/*`), ciascuna con le proprie pagine.

## Integrazioni terze parti

- **Google Sign-In**: invia `{google_token, category}` a `/auth/signin`; `terms_and_conditions === 0` nella risposta segnala un primo accesso via Google.
- **Google Maps**: usato per la selezione di indirizzi.
- **Nessuna integrazione diretta con Google Calendar**: la sincronizzazione calendario dei docenti è interamente server-to-server, il frontend non è coinvolto.
- **Nessun canale realtime**: nessun WebSocket/SSE in tutto il repository, solo polling e refresh on-demand.

## Riepilogo: cosa duplica il frontend e va tenuto sincronizzato

- Gli stati fattura mostrati in UI (sottoinsieme di `Invoice::STATUS_*`).
- Il pattern di parsing della descrizione fattura per estrarne la durata lezione.
- Il codice promozionale `FREE26`.
- La soglia di 48 ore per cancellazione/modifica lezione.
- La mappatura tipo-notifica → testo/icona.
