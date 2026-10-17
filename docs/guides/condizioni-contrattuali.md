---
title: Condizioni generali di contratto
---

# Condizioni generali di contratto (CGC)

Famiglie e insegnanti aderiscono alla piattaforma accettando le **condizioni generali di contratto** della propria categoria. I testi sono **versionati**: ogni versione è un documento immutabile, la versione in vigore è determinata dalla sua data di decorrenza, e ogni accettazione è registrata con ciò che serve a dimostrare **quale testo** è stato accettato, **quando** e **come**. Quando una nuova versione entra in vigore, chi non l'ha accettata non può più compiere operazioni di scrittura finché non lo fa.

Le operazioni sono raggruppate nella sezione [Contract](/api/contract) della API Reference. La consultazione dei testi non richiede autenticazione; lo stato di accettazione e l'accettazione sì.

## Chi è vincolato

| Utente | Contratto | Note |
| --- | --- | --- |
| Insegnante | `teacher` | Accetta in proprio. |
| Famiglia (genitore) | `family` | Accetta in proprio. |
| Studente | — | Agisce sotto l'accettazione della propria famiglia. |
| Amministratore, scuola esterna | — | Regolati da accordi separati: lo stato restituisce `contract: null` e `must_accept: false`. |

## Versioni e decorrenza

I testi risiedono nel repository del backend, uno per versione, in `uploads/contracts/cgc/<tipo>/<lingua>/<versione>.json`. Oggi la sola lingua è `ita`. Una versione pubblicata **non viene mai modificata**: una correzione è una nuova versione.

La versione in vigore **non è dichiarata, è derivata**: è la più alta fra quelle la cui `effective_from` è arrivata. Questo permette di committare una versione in anticipo e di tenerla in attesa:

| Stato | Significato |
| --- | --- |
| `past` | Superata da una versione successiva ora in vigore. |
| `current` | In vigore oggi. |
| `upcoming` | Pubblicata ma con decorrenza futura: è il **periodo di preavviso**, che per gli insegnanti è di 15 giorni ai sensi del Regolamento UE 2019/1150. Può già essere accettata. |

Attualmente la versione in vigore è la **2.0** (dal 5 dicembre 2025) e la **3.0**, pubblicata il 15 ottobre 2026 per entrambe le categorie, decorre dal **1° dicembre 2026**.

### Testo di una versione

Ogni versione ha titolo, numero di versione, data di ultimo aggiornamento, data di decorrenza, avvertenza iniziale, dichiarazione di accettazione e un elenco di **sezioni**. Una sezione ha numero, titolo, contenuto in Markdown e, facoltativamente, **sottosezioni** con la stessa forma (la numerazione è progressiva: sezione `4`, sottosezione `4.16`). I rimandi interni fra clausole sono già risolti nei numeri corretti: il client mostra il testo così com'è e non deve rinumerare né interpretare nulla.

## Clausole da approvare specificamente

Alcune clausole sono vessatorie e, ai sensi degli artt. 1341 e 1342 del codice civile, richiedono l'**approvazione specifica**, una per una, oltre all'accettazione generale. Nel testo la clausola è contrassegnata `specific_approval: true`. La regola è questa:

- il contrassegno su una **sezione** copre tutta la sezione, che si approva **una volta sola**, con il numero della sezione;
- il contrassegno su una **sottosezione** copre quella sola clausola, che si approva con il proprio numero;
- l'insieme delle clausole da approvare è esattamente quello che lo stato restituisce in `specific_approval_clauses` (numero e titolo), e **cambia da una versione all'altra**: il client non deve mai elencarle a mano.

## Come si accetta

Il flusso è sempre lo stesso, all'accesso e a ogni cambio di versione:

1. `GET /api/contract/status` indica che cosa l'utente deve accettare;
2. il client mostra il testo e le clausole da approvare una per una;
3. `POST /api/contract/accept` registra l'accettazione.

### Lo stato

```json
{
  "status": "ok",
  "contract": "teacher",
  "must_accept": false,
  "current": {
    "version": "2.0",
    "effective_from": "2025-12-05",
    "content_hash": "…",
    "specific_approval_clauses": [{"number": "3", "title": "…"}]
  },
  "accepted": {"version": "2.0", "accepted_at": null, "legacy": true},
  "upcoming": {
    "version": "3.0",
    "effective_from": "2026-12-01",
    "content_hash": "…",
    "specific_approval_clauses": [{"number": "1.5", "title": null}],
    "accepted": false
  }
}
```

- `must_accept` è vero quando l'utente **non ha accettato la versione in vigore** (o una successiva). È il solo campo che decide se l'utente è bloccato.
- `accepted` è l'ultima versione accettata. Con `legacy: true` l'utente ha accettato **prima che il versionamento esistesse**: di quell'accettazione si conosce solo il fatto, non la data né il testo, e `accepted_at` è nullo.
- `upcoming` è nullo se non c'è alcuna versione in attesa; altrimenti ha la forma di `current` più `accepted`, che dice se l'utente l'ha già accettata. Durante il preavviso il client dovrebbe proporla, affiancandole il [confronto con la versione precedente](#confronto-fra-versioni).

### L'accettazione

```json
{"contract": "teacher", "version": "3.0", "specific_approvals": ["1.5", "3.3", "…"]}
```

- `contract` è `teacher` o `family` e deve corrispondere alla categoria dell'utente; `version` può essere **solo la versione in vigore o quella in arrivo**. Altro è un `400`.
- `specific_approvals` deve contenere **esattamente** i numeri di `specific_approval_clauses` di quella versione: né una in meno né una in più. In caso contrario risponde `400` con l'elenco delle clausole mancanti (`missing`) e di quelle non previste (`unknown`).
- L'operazione è **idempotente per versione**: ripetere l'accettazione di una versione già accettata restituisce quella registrata, senza crearne un'altra.
- La risposta riporta `contract`, `version` e `accepted_at`.

Ogni accettazione è una riga che **non viene mai modificata**: contiene utente, contratto, lingua, versione, **impronta SHA-256 del file accettato** (che fissa esattamente il testo, a prescindere da come il file sarà in seguito spostato o riformattato), numeri delle clausole approvate, indirizzo IP, user agent, metodo di firma e istante. Il metodo di firma è oggi `click`; è previsto spazio per un metodo più forte, come una password monouso, senza modifiche allo schema. Accettare una nuova versione aggiunge una riga.

## Che cosa succede a chi non ha accettato

Finché `must_accept` è vero, **ogni richiesta di scrittura** (`POST`, `PUT`, `PATCH`, `DELETE`) è rifiutata con `403` e il messaggio `You must accept terms and conditions to use this feature.`. Le letture non sono mai bloccate. Restano consentite, perché l'utente possa uscire dal blocco o orientarsi:

- tutta l'area di accesso: accesso, rinnovo del token, uscita, registrazione, reimpostazione della password, conferme e **cambio di profilo** (uscire da un profilo bloccato non può essere impedito);
- `GET /api/contract/status` e `POST /api/contract/accept`;
- la ricerca di insegnanti, e l'elenco, il dettaglio e la ricerca delle lezioni;
- l'elenco, il dettaglio e la lettura delle notifiche;
- la raccolta degli eventi di tracciamento.

Il blocco guarda al **verbo**, non all'intenzione: una ricerca che si invia con `POST` e non è nell'elenco qui sopra, come la ricerca di disponibilità o il calcolo del prezzo di una lezione, è rifiutata come qualunque altra scrittura.

La conseguenza pratica da tenere presente: **pubblicare una versione con decorrenza già passata blocca tutte le famiglie e tutti gli insegnanti alle scritture finché non accettano**. La decorrenza futura è lo strumento previsto per evitarlo.

### Il vecchio flag e le accettazioni precedenti

Prima del versionamento l'accettazione era un solo flag sull'utente, `terms_and_conditions`, impostato dalla casella della registrazione o da `POST /api/auth/accept-terms`. Quel flag vale oggi come accettazione della **versione 2.0, e di nessuna successiva** (versione configurata in `contracts.legacyAcceptedVersion`). Ne discende che:

- chi aveva accettato prima non è bloccato finché la 2.0 è in vigore, e dovrà accettare esplicitamente la 3.0 dal 1° dicembre 2026;
- **`POST /api/auth/accept-terms` e la casella della registrazione non bastano più** a sbloccare un utente quando è in vigore una versione successiva alla 2.0: impostano il flag e nient'altro. Il client deve passare da `POST /api/contract/accept`, che oltre a registrare l'accettazione imposta anche il flag;
- il campo `terms_and_conditions` restituito all'accesso continua a dire «ha mai accettato qualcosa», **non** «ha accettato la versione in vigore». Per decidere se mostrare la schermata di accettazione si usa `must_accept`.

## Consultare i testi

Questi endpoint sono pubblici, con o senza token, e servono anche alle pagine pubbliche e alla registrazione.

| Operazione | Percorso |
| --- | --- |
| Testo della famiglia | `GET /api/contract/cgc/family/{lang}[?version=]` |
| Testo dell'insegnante | `GET /api/contract/cgc/teacher/{lang}[?version=]` |
| Versioni pubblicate | `GET /api/contract/cgc/{type}/{lang}/versions` |
| PDF di una versione | `GET /api/contract/cgc/{type}/{lang}/pdf[?version=]` |
| PDF di confronto | `GET /api/contract/cgc/{type}/{lang}/diff-pdf?from=&to=[&full=1]` |

Senza `version` si ottiene la versione in vigore. Un tipo, una lingua o una versione inesistenti rispondono `404`. L'elenco delle versioni è ordinato dalla più vecchia e riporta per ciascuna `version`, `effective_from` e lo stato `past`/`current`/`upcoming`.

### Confronto fra versioni

Il PDF di confronto affianca le due versioni **mettendo in evidenza le differenze parola per parola**. Le clausole sono appaiate **per testo, non per numero**: inserire una clausola rinumera tutte le successive, e un confronto per numero segnalerebbe come modificato quasi tutto il documento. Rendere vessatoria una clausola che non lo era conta come modifica. Per impostazione predefinita le serie di clausole invariate sono compresse; con `full=1` sono stampate per intero.

## Pubblicare una nuova versione

1. Si aggiunge il file della nuova versione accanto alle precedenti, senza toccarle, con `effective_from` nel futuro (per gli insegnanti, almeno 15 giorni dopo la pubblicazione).
2. Si verifica il testo prima di pubblicarlo: i comandi console accettano anche il percorso di una bozza.
3. Si rigenerano le copie versionate in `docs/contracts/` del backend.
4. Alla pubblicazione la versione compare come `upcoming` e può essere già accettata; alla data di decorrenza diventa `current` senza alcun intervento.
5. Si invia l'avviso agli utenti con `policy-update/notify-users`, **una sola volta** per aggiornamento: si veda [Attività pianificate e comandi console](/guides/attivita-pianificate).

```shell
php yii contract/pdf <teacher|family> [version|current|path.json] [--out=dir]
php yii contract/diff-pdf <teacher|family> <from> <to> [--full=1] [--out=dir]
php yii contract/export <teacher|family> --out=@app/docs/contracts
```

`contract/export` produce il PDF di ogni versione pubblicata e il confronto di ciascuna con la precedente; le copie committate in `docs/contracts/` vanno rigenerate a ogni nuova versione.

I PDF sono prodotti con lo stesso motore dei [documenti fiscali](/guides/documenti-fiscali), con modelli propri per il contratto e per il confronto.

## Per chi sviluppa un client

Una sintesi operativa per l'applicazione web è nella sezione [Applicazione web](/guides/guida-frontend#condizioni-contrattuali). In breve: dopo l'accesso, e prima di ogni schermata che scrive, interrogare `status`; se `must_accept` è vero bloccare l'interfaccia con la schermata di accettazione; se `upcoming` è presente e non accettato, avvisare e proporre l'accettazione anticipata; trattare un `403` con il messaggio sui termini come segnale di rivalutare `status`.
