---
title: Referral & Crediti Famiglia
---

# Sistema referral e crediti famiglia

Ogni famiglia ha un link di invito personale. Se una famiglia invitata tramite quel link completa il **primo pagamento di una lezione entro `booking_window_days` giorni** dalla propria registrazione, entrambe le famiglie ricevono un credito in euro spendibile sui pagamenti futuri: chi ha invitato riceve `referrer_credit_amount`, chi è stata invitata riceve `new_family_credit_amount`.

Il credito si applica automaticamente in fase di prenotazione, scontando il prezzo fino a un minimo garantito (`min_lesson_price`/ora), e viene mostrato in fattura come riga di sconto separata. Il flag `referral.enabled` in `config/params.php` disattiva l'intero sistema senza deploy.

:::caution
A oggi non esiste alcuna UI nel frontend web che esponga link di invito, saldo o storico transazioni, né un campo per il codice di invito nel form di registrazione. Il sistema è completo lato backend ma non ancora visibile agli utenti finali.
:::

## Le tre API

Richiedono JWT e sono disponibili solo per un paterfamilias attivo (altri ruoli: `403`; token mancante/non valido: `401`).

**`GET /api/family/referral`** — link di invito, saldo, inviti pendenti e completati:

```json
{
  "referral_link": "https://<frontend-url>/register?ref=aZ3kP9qLtR7mN2xW8vB4cJ1sD6fH0yUo",
  "balance": 3,
  "pending_invites": [{"paterfamilias_id": 32, "first_name": "Mario", "last_name": "Rossi", "created_at": "2026-08-13 11:45:06"}],
  "completed_referrals": [{"paterfamilias_id": 41, "first_name": "Luisa", "last_name": "Bianchi", "referral_first_paid_lesson_at": "2026-08-20 09:12:33"}]
}
```

**`POST /api/family/referral/invite`** — invia un'email con il link di invito. Corpo: `{"email": "amico@example.com"}`. Email mancante/non valida → `400`.

**`GET /api/family/credits`** — saldo e storico transazioni, più recenti prima:

```json
{
  "balance": 3,
  "transactions": [{"id": 1, "amount": "3.00", "type": "referral_earned", "description": "...", "reference_order_id": 12, "created_at": "..."}]
}
```

`type` ∈ `referral_earned` | `credit_used` | `credit_refunded`.

:::caution Gotcha
`balance` è un **numero** JSON, mentre `transactions[].amount` è una **stringa** decimale (mappa un campo `DECIMAL(10,2)`). Va convertito prima di fare somme o confronti.
:::

Il link di invito porta a `/register?ref=<token>`: il frontend deve leggere il param `ref` e inviarlo nella registrazione famiglia come campo `referral_token` (stringa, max 64 caratteri, facoltativo — senza, la registrazione prosegue normalmente).

## Modello dati

Il saldo **non** è un campo cachato: è derivato come `SUM(amount)` sulla tabella `family_credit_transaction` (`FamilyCreditTransaction::getBalanceForFamily()`). Ogni movimento è una riga con tipo, importo firmato e riferimenti, il che dà auditabilità completa senza riconciliazione.

```sql
-- group_family
referral_token                 VARCHAR(64) NOT NULL UNIQUE   -- generato alla creazione
referred_by_user_id            INT UNSIGNED NULL             -- paterfamilias della famiglia referrer
referral_first_paid_lesson_at  DATETIME NULL                 -- timestamp primo pagamento + claim di idempotenza

-- lesson_order
credit_applied     DECIMAL(10,2) NOT NULL DEFAULT 0
card_fingerprint   VARCHAR(64) NULL   -- impronta carta Stripe, su ogni ordine pagato

-- family_credit_transaction
amount                     DECIMAL(10,2)   -- positivo = accreditato, negativo = speso
type                       ENUM('referral_earned', 'credit_used', 'credit_refunded')
reference_order_id         INT UNSIGNED NULL   -- FK -> lesson_order
reference_transaction_id   INT UNSIGNED NULL   -- self-FK, usata da credit_refunded per puntare alla transazione originale
flagged_for_review         TINYINT(1)          -- segnale antifrode
```

`type` usa tre valori: sia il credito al referrer sia quello di benvenuto sono registrati come `referral_earned` — si distinguono per `group_family_id` (chi riceve) e per `description`, non per un tipo diverso.

## Flusso end-to-end

```
1. Famiglia A condivide il proprio link: /register?ref={A.referral_token}

2. Famiglia B si registra con ?ref=<token>
       → risolve la famiglia referrer, salva referred_by_user_id su B
       → la registrazione prosegue normalmente anche se il token è assente

3. Famiglia B paga la prima lezione (webhook checkout.session.completed)
       → se referred_by_user_id è valorizzato: FamilyCreditService::awardReferralCredits(B, order)
           → UPDATE group_family SET referral_first_paid_lesson_at = NOW() WHERE id = B.id AND referral_first_paid_lesson_at IS NULL
           → rowsAffected === 0? stop (già assegnato)
           → fuori dalla finestra booking_window_days da B.created_at? stop
           → controllo antifrode → eventuale flagged_for_review
           → +new_family_credit_amount a B, +referrer_credit_amount ad A (entrambi referral_earned)

4. Famiglia A prenota (o percorso formativo)
       → lockFamilyForCreditUpdate(A) — SELECT ... FOR UPDATE dentro la transazione
       → creditToApply = min(saldo_A, totalPrice - min_lesson_price × totalHours), o 0 se non conviene
       → order->amount -= creditToApply; order->credit_applied = creditToApply
       → deductCredit(A, creditToApply, order) → -creditToApply, credit_used
       → coupon Stripe one-off per mostrare lo sconto in checkout

5. Checkout scaduto senza pagamento → reverseCredit(order->id), idempotente
```

## Il calcolo del credito applicabile

```php
$minPrice = min_lesson_price * $totalHours;
if ($totalPrice <= $minPrice) {
    return 0.0;
}
$maxDiscount = $totalPrice - $minPrice;
return min($saldoFamiglia, $maxDiscount);
```

`min_lesson_price` (14,00 €/ora in produzione) è il prezzo minimo orario sotto il quale il credito non si applica più. Fissarlo a monte garantisce per costruzione che resti sempre margine sufficiente per FPC/scuola esterna, senza mai dover intaccare la quota insegnante.

## Distribuzione del credito sui payout

Quando l'ordine ha `credit_applied`, va ripartito per lezione in proporzione alle ore. Il punto delicato: `order->amount` (e `lesson->getPayedPrice()`) è **già** netto del credito, decrementato al momento della prenotazione. Se il calcolo dei payout derivasse le quote direttamente da lì, il credito verrebbe scalato due volte, e la differenza cadrebbe interamente sulla quota insegnante. Per questo il credito pro-rata viene riaggiunto prima di calcolare le quote FPC/scuola, e solo dopo sottratto di nuovo in cascata:

```php
$teacherQuote = ($lesson->getPayedPrice() + $creditApplied) - $FPCQuote - $externalSchoolQuote;
```

Il credito viene assorbito in cascata **fpc_variable → scuola esterna → fpc_fisso → insegnante**: si mangia prima il margine FPC variabile, poi quello della scuola, poi il margine fisso FPC, e solo come ultima risorsa la quota insegnante — che in pratica non viene mai raggiunta, perché `min_lesson_price` garantisce a monte margine sufficiente. L'esito è tracciato su `lesson.credit_to_fpc_variable/ext_school/fpc_fixed/teacher`.

**Perché la quota insegnante non va mai toccata**: l'insegnante non ha nulla a che vedere con la promozione referral; il costo dell'acquisizione lo assorbe FPC (ed eventualmente la scuola esterna).

## Idempotenza e concorrenza

`group_family.referral_first_paid_lesson_at` funge da doppio scopo: marcatore temporale **e** claim atomico di idempotenza. La clausola `WHERE ... IS NULL` sull'update garantisce che solo la prima esecuzione vinca la race, coprendo sia i retry del webhook Stripe sia chiamate concorrenti, senza un lock separato. Il claim e l'inserimento delle due righe di credito stanno in un'unica transazione: se la scrittura fallisce dopo il claim, il rollback annulla anche il claim, e l'assegnazione resta ritentabile.

Sulla spesa: `lockFamilyForCreditUpdate()` esegue `SELECT ... FOR UPDATE` prima di calcolare il credito applicabile, dentro la stessa transazione che poi chiamerà `deductCredit()` — serializza le richieste concorrenti sulla stessa famiglia fino al commit, evitando che due prenotazioni simultanee leggano lo stesso saldo e lo spendano due volte.

## Segnale antifrode (non bloccante)

`card_fingerprint` è registrato su **ogni** ordine pagato (best-effort). Al momento dell'assegnazione, si verifica se la stessa carta ha già pagato un ordine di uno studente della famiglia referrer: se sì, il credito **viene comunque assegnato** — è un segnale debole, non prova di abuso — ma entrambe le transazioni vengono marcate `flagged_for_review = true` e parte una mail agli admin per revisione manuale. I fingerprint Stripe non sono garantiti stabili fra account Connect diversi, quindi il controllo può avere falsi negativi, ma è pensato per non produrre falsi positivi bloccanti.

## Configurazione

```php
// config/params.php
'referral' => [
    'enabled'                  => true,
    'referrer_credit_amount'   => 3.00,   // credito alla famiglia che ha invitato
    'new_family_credit_amount' => 1.00,   // credito alla famiglia invitata
    'booking_window_days'      => 14,     // giorni dalla registrazione entro cui pagare la prima lezione
    'min_lesson_price'         => 14.00,  // €/ora minimo garantito dopo l'applicazione del credito
],
```

## Limiti noti

- **Nessun clawback sul rimborso.** Se una lezione pagata con credito viene rimborsata, il credito speso non torna disponibile; se quel pagamento aveva innescato l'assegnazione di un credito referral, l'assegnazione non viene annullata (`reverseCredit()` scatta solo su `checkout.session.expired`, mai su un rimborso post-pagamento).
- **Nessun tetto** al numero di referral per famiglia.
