---
title: Copertura assicurativa
---

# Copertura assicurativa

Al momento della prenotazione la famiglia può acquistare una copertura facoltativa sull'ordine. La copertura tutela l'insegnante: se una lezione assicurata viene cancellata o modificata a ridosso dell'inizio, il sistema registra automaticamente un sinistro, da cui deriva un compenso riconosciuto all'insegnante nella liquidazione mensile.

Il preventivo e l'acquisto avvengono nell'ambito del processo di prenotazione, documentato nella sezione [Lesson](/api/lesson) della API Reference.

## Preventivo e fasce di rischio

Il premio è calcolato come percentuale dell'importo dell'ordine. La percentuale dipende dalla **fascia di rischio della famiglia**, determinata dal numero complessivo di sinistri già registrati sugli ordini di quel nucleo: si parte dal 5% in assenza di sinistri e si sale progressivamente fino a un massimo del 30%.

Ogni sinistro aperto incide quindi sul costo delle coperture successive della stessa famiglia.

:::info
Le lezioni gratuite, ottenute con un codice promozionale che azzera l'importo, non sono assicurabili. Il vincolo è verificato in tre punti indipendenti del processo — al momento della composizione dell'ordine, alla richiesta di preventivo e alla creazione effettiva della copertura — così che non sia aggirabile da un client.
:::

## Acquisto

L'acquisto è contestuale al pagamento dell'ordine:

```
Richiesta di preventivo
        │  importo dell'ordine → fascia di rischio → premio
        ▼
Pagamento dell'ordine
        │  la copertura è registrata come attiva
        │  il premio è accreditato alla piattaforma contestualmente al pagamento
        ▼
Conferma del pagamento
        │  emissione della fattura per il premio alla famiglia
```

A differenza delle altre componenti dell'importo, il premio non attende la liquidazione periodica: è accreditato alla piattaforma nello stesso istante del pagamento, come descritto in [Pagamenti, payout e fatturazione](/guides/pagamenti).

## Sinistri

Un sinistro viene registrato **automaticamente**, senza alcuna richiesta esplicita, quando si verificano contemporaneamente tre condizioni:

1. la lezione è coperta da assicurazione;
2. la cancellazione o la modifica avviene entro la **finestra assicurativa**, ossia nelle ultime 48 ore prima dell'inizio;
3. l'azione è compiuta da un utente della famiglia — genitore o studente — e non dall'insegnante.

Sono previste due tipologie, **cancellazione** e **modifica**, entrambe generatrici di compenso per l'insegnante. La distinzione rileva ai fini della successiva analisi di sostituzione dello slot.

:::note
La soglia delle 48 ore governa anche la possibilità stessa di cancellare o modificare una lezione. Vale la pena ricordare l'asimmetria descritta in [Percorsi formativi](/guides/percorsi-formativi): una lezione singola resta cancellabile entro la finestra, mentre una lezione appartenente a un percorso può essere solo modificata.
:::

## Compenso dell'insegnante

Il compenso è determinato durante la liquidazione mensile, dopo l'elaborazione di tutte le lezioni del periodo e prima del consolidamento delle posizioni. Per ogni insegnante con sinistri pendenti il sistema:

1. determina la fascia di ore raggiunta nel periodo;
2. calcola il compenso come ore di lezione non erogate moltiplicate per la tariffa oraria prevista per quella fascia;
3. emette un documento fiscale autonomo dall'insegnante verso la piattaforma, con l'imposta di bollo a carico della piattaforma;
4. rettifica le posizioni già registrate, riducendo quanto l'insegnante deve alla piattaforma e aumentando corrispondentemente quanto gli spetta;
5. contrassegna i sinistri come liquidati.

Se la rettifica porta la posizione verso la piattaforma in negativo, il documento emesso è una fattura con le parti invertite anziché una nota di credito: si tratta infatti di un compenso effettivamente dovuto dalla piattaforma, non di una rettifica contabile.

## Scadenza delle coperture e analisi

Alcune attività pianificate mantengono coerente lo stato delle coperture e forniscono all'amministrazione gli elementi per valutarne la sostenibilità.

| Attività | Cadenza | Finalità |
| --- | --- | --- |
| `insurance/expire` | Oraria o giornaliera | Fa decadere le coperture le cui lezioni sono tutte concluse. |
| `insurance/expire-unpaid` | Oraria | Fa decadere le coperture su ordini annullati o mai pagati. |
| `insurance/report-pending-compensations` | Giornaliera | Registra i sinistri ancora da liquidare, per verifica. |
| `insurance/claim-replacement-report` | Su richiesta o mensile | Analizza quanta parte degli slot liberati è stata effettivamente ri-prenotata. |

L'analisi di sostituzione misura in che misura il tempo liberato da una cancellazione sia stato recuperato: per le lezioni cancellate verifica la presenza di lezioni attive sovrapposte alla stessa finestra, unendo gli intervalli per evitare doppi conteggi; per le lezioni modificate e ancora attive considera lo slot integralmente sostituito. Il risultato esprime i minuti recuperati, quelli non recuperati e la relativa percentuale.

Si tratta dell'indicatore che consente di valutare se le percentuali di premio e le tariffe di compenso siano correttamente dimensionate.
