---
title: Assicurazione
---

# Sistema assicurativo

Le famiglie possono acquistare una copertura su un ordine di lezione. Se una lezione assicurata viene cancellata o modificata entro la **finestra assicurativa** (ultime 48 ore prima dell'inizio), viene registrato automaticamente un sinistro (*claim*), che genera un compenso economico per l'insegnante nel ciclo di pagamento mensile.

## Acquisto e tier

```
Famiglia richiede preventivo
  GET /api/lesson/insurance-quote?amount=X
  → InsuranceService::getQuote() → InsuranceQuoteDTO (tier, percentuale, premio)
        │
        ▼
Checkout dell'ordine
  → InsuranceService::createInsurance(LessonOrder)
  → record lesson_order_insurance (status = active)
  → riga Stripe "Assicurazione lezione" (il premio è application_fee_amount → ricavo piattaforma)
        │
        ▼
Conferma pagamento Stripe (webhook)
  → Fattura FPC → Famiglia
  → Aggiornamento insurance.invoice_id
```

Il tier è determinato dal **numero totale di sinistri precedenti** del genitore su tutti i suoi ordini: 0 sinistri → tier 0 (5%), 1 sinistro → tier 1 (8%), fino a un massimo di tier 5 (30%). Ogni sinistro aperto aumenta quindi il costo delle assicurazioni future per quella famiglia.

:::info
Le lezioni gratuite (con codice sconto che azzera l'importo) non sono assicurabili. La validazione avviene a tre livelli: form di creazione lezione, endpoint `insurance-quote`, e `InsuranceService::createInsurance()`.
:::

## Sinistri

Creati **automaticamente** quando un utente famiglia (genitore o studente) cancella o modifica una lezione assicurata dentro la finestra assicurativa: nel futuro, con meno di `criticalTimes.lessonDeletionFromFamiliesWarningTime` ore all'inizio (default 48 ore), e l'azione eseguita da un utente famiglia (non dall'insegnante).

- Cancellazione → `FamilyLessonDeletionService` → `InsuranceService::createClaim($lesson, 'cancellation')`
- Modifica → `LessonModificationService` → `InsuranceService::createClaim($lesson, 'modification')`

Entrambi i tipi di sinistro generano compenso per l'insegnante.

## Compensazione dell'insegnante

Gestita da `InsuranceCompensationService`, invocata durante il batch di pagamento mensile — dopo l'elaborazione di tutte le lezioni, prima della creazione delle posizioni aggregate per beneficiario (vedi [Pagamenti & Fatturazione](/guides/pagamenti)).

Per ogni insegnante con sinistri pendenti:

1. Determina la sua fascia oraria del periodo.
2. Calcola il compenso: ore lezione non erogate × tariffa oraria per fascia (`config/params.php`, chiave `insurance.compensation_per_hour`, con override per pricing band e fallback su `'default'`).
3. Emette una fattura standalone insegnante → FPC (bollo a carico FPC).
4. Rettifica il ledger: riduce la posizione insegnante→FPC, aumenta la posizione insegnante→insegnante (payout). Se la posizione FPC diventa negativa, usa `negativeAmountStrategy = 'invoice'` invece di una nota di credito.
5. Marca i sinistri come `teacher_compensation_status = 'paid'`.

## Endpoint

| Metodo | Path | Descrizione | Autenticazione |
| --- | --- | --- | --- |
| `GET` | `/api/lesson/insurance-quote?amount=X` | Preventivo assicurativo per la famiglia dell'utente loggato | Solo famiglia |

Acquisto, registrazione sinistri e compensazione sono gestiti internamente da altri flussi (checkout, cancellazione/modifica lezione, batch pagamenti) — non ci sono altri endpoint dedicati.

## Comandi e scheduling

| Comando | Frequenza | Descrizione |
| --- | --- | --- |
| `php yii insurance/expire` | Oraria/giornaliera | Fa scadere le assicurazioni le cui lezioni sono tutte terminate |
| `php yii insurance/expire-unpaid` | Oraria | Fa scadere le assicurazioni su ordini cancellati/non pagati |
| `php yii insurance/report-pending-compensations` | Giornaliera | Log dei sinistri pendenti per revisione |
| `php yii insurance/claim-replacement-report <from> <to> [--teacherId=N] [--email]` | Su richiesta / mensile con `--email` | Analisi del tasso di sostituzione degli slot liberati |

`InsuranceService::getClaimReplacementAnalytics()` calcola quanto dello slot liberato dall'insegnante è stato ri-prenotato: per le lezioni cancellate cerca lezioni attive sovrapposte nella stessa finestra (con interval merging per evitare doppi conteggi), per le lezioni modificate ancora attive le considera completamente sostituite. Restituisce `replacedMinutes`, `unreplacedMinutes` e `replacementRate` %.

:::note
Il cutoff di 48 ore usato qui (`criticalTimes.lessonDeletionFromFamiliesWarningTime`) è duplicato come costante hardcoded anche lato frontend web, in due punti indipendenti dei flussi di prenotazione singola e a percorso.
:::
