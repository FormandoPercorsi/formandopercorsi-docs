---
title: Pagamenti, Payout e Fatturazione
---

# Pagamenti, Payout e Fatturazione

Ogni volta che una famiglia paga una lezione, quel pagamento va diviso fra più soggetti: **l'insegnante** che ha erogato la lezione, **la scuola esterna di competenza** (un partner locale che gestisce gli insegnanti di una certa zona, se presente), e **FPC** (la piattaforma), che trattiene una propria quota per il servizio.

Il punto meno intuitivo del sistema, utile da avere chiaro fin da subito: **il pagamento della famiglia non atterra sul conto di FPC**. Stripe fa arrivare i soldi **direttamente sul conto Stripe Connect dell'insegnante o della scuola esterna** che "detiene" quella lezione. Solo dopo, con un processo automatico mensile (o giornaliero per casi particolari), si calcola quanto spetta a ciascuno, si spostano i soldi di conseguenza tramite bonifici interni a Stripe, si emettono le fatture corrispondenti, e si effettuano i bonifici finali verso i conti correnti bancari reali.

```
Famiglia paga con carta
        │
        ▼
Stripe Checkout (conto Stripe Connect dell'insegnante o della scuola esterna)
        │  i soldi arrivano QUI, non su FPC
        ▼
[fine mese] Batch di payout
        │
        ├─► FPC preleva la propria quota (fattura + bonifico interno)
        ├─► se la scuola esterna deteneva i soldi: bonifico interno alla banca dell'insegnante
        └─► bonifico bancario reale verso insegnante / scuola esterna
```

## Cosa vede la famiglia

- **Prezzo della lezione**: `GET /api/lesson/price` — dipende da durata e città di fatturazione della famiglia; un `promotional_code` può azzerarlo o modificarlo.
- **Preventivo assicurativo opzionale**: `GET /api/lesson/insurance-quote?amount=X` — vedi [Assicurazione](/guides/assicurazione).
- **Credito famiglia/referral**, se presente saldo, si applica automaticamente e scala il prezzo (mostrato come riga di sconto separata) — vedi [Referral & Crediti](/guides/referral-crediti).
- **Checkout**: `POST /api/lesson/single` (o l'equivalente per i percorsi) restituisce un `payment_url` di una sessione Stripe Checkout hosted — un redirect pieno del browser, non un embed.
- **Ritorno da Stripe**: pagine di successo e di annullo dedicate; sull'annullo va chiamato `DELETE /api/lesson/order/{orderId}` per liberare esplicitamente l'ordine rimasto pending.
- **Fatture** (lato insegnante): `GET /api/invoice/active` (emesse) e `GET /api/invoice/passive` (ricevute), con dettaglio, PDF (`GET /api/invoice/{id}/pdf`) e XML (`GET /api/invoice/{id}/xml`).

:::caution Accoppiamenti fragili da conoscere
Lo stato fattura mostrato in una UI è tipicamente un sottoinsieme hardcoded dei valori reali del backend (`pending | sent | quarantena | accepted | rejected | notdelivered`, vedi `Invoice::STATUS_*` più sotto) — va tenuto aggiornato se cambiano.

La durata della lezione mostrata su una fattura viene spesso ricavata facendo il parsing testuale della sua descrizione generata dal backend (pattern tipo *"Lesson with length: Xh."*). Chi tocca quelle stringhe lato backend deve avvisare chi le consuma lato client.
:::

## Come si stabilisce il prezzo e la sua "spaccatura"

Il prezzo di una lezione non è una percentuale calcolata al volo: è un valore configurato a mano nella tabella `lesson_size_price`, con una riga per ogni combinazione di **durata lezione** e **città di fatturazione** (con una riga di fallback a città nulla). Per ogni riga sono configurati, come importi assoluti in euro (non percentuali):

```sql
-- tabella lesson_size_price
price                        -- quanto paga la famiglia
fixed_fpc_costs              -- costo fisso FPC (bollo, gestione, ecc.), indipendente dalla fascia insegnante
b1_fpc_quote, b2_fpc_quote, b3_fpc_quote, b4_fpc_quote                       -- quota variabile FPC, per fascia (pricing band)
b1_competence_school_quote, ..., b4_competence_school_quote                 -- quota scuola esterna, per fascia
```

Le **pricing band** (`b1`–`b4`, tabella `pricing_band`, `min_hours`/`max_hours` esclusivo) rappresentano fasce di ore mensili insegnate dal docente: più un insegnante lavora nel mese, più cambia (in suo favore) la ripartizione FPC/insegnante.

**Perché 4 quote precalcolate anziché una sola calcolata dopo**: al momento della prenotazione non si sa ancora in quale fascia oraria mensile finirà l'insegnante (dipende da tutte le lezioni che farà quel mese, comprese quelle non ancora prenotate). Si salvano quindi tutte e 4 le possibili quote su `lesson_order`, e solo a fine mese, quando la fascia reale è nota, si sceglie quella giusta.

## Dove atterra davvero il pagamento Stripe

`PaymentHelper::createPayment()` crea la sessione Stripe Checkout **sul conto Stripe Connect del "provider"** dell'ordine, non su quello di FPC:

```php
$stripeAccount = $provider->isTeacher()
    ? $provider->teacherInfo->stripe_account_id
    : $provider->externalSchoolInfo->stripe_account_id;
$checkout = $client->checkout->sessions->create($checkoutPayload, ['stripe_account' => $stripeAccount]);
```

Il **"provider"** dell'ordine (`lesson_order.provider_id`) è la scuola esterna di competenza per la città della famiglia, se esiste copertura, altrimenti l'insegnante stesso. Il "provider" è quindi il soggetto che *materialmente detiene* i soldi finché non gira il batch di payout — nel lessico del ledger più sotto è l'**holder** iniziale.

Se l'ordine include un'assicurazione, il premio è impostato come `application_fee_amount` sul `payment_intent`: essendo un pagamento su un conto Connect, questo meccanismo Stripe fa sì che **il premio finisca istantaneamente sul saldo di FPC**, senza bisogno di un trasferimento successivo — un'eccezione al flusso "differito a fine mese" descritto sopra.

I **rimborsi** vanno creati sullo stesso conto Connect dove è avvenuto l'addebito originale (`PaymentHelper::createRefund($stripeSessionId, $provider->stripe_account_id)`) — mai sul conto di FPC.

## Il ledger: chi deve dare cosa a chi

`MoneyFlowLedger` è l'accumulatore in-memory usato durante il batch di payout. Modella ogni movimento come una coppia:

- **holder**: chi detiene materialmente i soldi (chi ha ricevuto il pagamento Stripe).
- **beneficiary**: chi ha diritto economico a quei soldi.

Una riga con `holder == beneficiary` è un importo auto-trattenuto (un insegnante senza scuola esterna che si tiene la propria quota: nessun trasferimento necessario, ma l'importo conta comunque per il payout finale).

`PaymentsService::processLesson($lesson, $pricingBand)` scompone ogni lezione pagata in tre quote (con la pricing band corretta del mese) e le accumula nel ledger:

```php
$FPCQuote            = $lesson->getPayedPriceForFPC($teacherPricingBand);            // holder -> FPC
$externalSchoolQuote = $lesson->order->provider_id !== $lesson->order->teacher_id     // holder -> se stesso, se è una scuola esterna
    ? $lesson->getPayedPriceForCompetenceSchool($teacherPricingBand) : 0;
$teacherQuote        = $lesson->getPayedPrice() - $FPCQuote - $externalSchoolQuote;    // holder -> insegnante
```

Se è stato applicato un credito famiglia sull'ordine, la quota pro-rata per la lezione viene assorbita in cascata **fpc_variable → scuola esterna → fpc_fisso → insegnante** (mai la quota insegnante per prima) — dettaglio completo in [Referral & Crediti](/guides/referral-crediti).

Per le lezioni che cambiano fascia dopo essere già state processate, si ricalcolano le quote con la nuova pricing band e si accumula solo la **differenza** — il ledger non duplica mai un importo già trasferito.

## Ordine di esecuzione del batch

```shell
php yii payments/process-monthly-payouts [YYYY-MM]   # mensile, 1° del mese, elabora il mese precedente
php yii payments/process-daily-payouts                # giornaliero, elabora ordini scaduti
```

1. Per ogni insegnante attivo con lezioni nel periodo: calcola la sua pricing band in base alle ore totali, poi processa ogni lezione popolando il ledger.
2. Applica il bollo sulle scuole esterne (vedi sotto).
3. **Solo nel batch mensile**: applica le compensazioni assicurative, rettificando il ledger già popolato — deve avvenire *prima* del passo successivo perché modifica le posizioni (vedi [Assicurazione](/guides/assicurazione)).
4. Congela il ledger raggruppato per beneficiario.
5. Per ogni holder con un importo dovuto a FPC: fattura (o nota di credito, o fattura "invertita" se l'importo è negativo per compensazione assicurativa) + trasferimento Stripe interno verso FPC.
6. Per ogni insegnante beneficiario: se il holder era una scuola esterna, fattura + trasferimento scuola→insegnante; infine un unico bonifico Stripe verso il conto bancario reale del docente per il totale che gli spetta.
7. Bonifico bancario reale verso ogni scuola esterna per l'importo che ha trattenuto per sé come beneficiaria.

Ogni passo produce righe in un report CSV (allegato via email admin insieme a uno ZIP con tutte le fatture PDF) e non blocca gli altri provider in caso di errore su uno di essi.

**Il bollo sulle scuole esterne**: quando dovuto (in base al regime fiscale del docente), viene spostato dalla posizione di payout della scuola esterna verso la quota che la scuola trasferisce all'insegnante — è sempre a carico della scuola esterna che detiene i soldi, mai dell'insegnante.

## Fatturazione: elettronica, esterna o ricevuta

Come documentare ogni movimento dipende dal regime fiscale del soggetto che emette:

| Condizione | Documento emesso |
| --- | --- |
| Dati fiscali completi, regime compatibile | Fattura elettronica via Acube/SDI |
| Regime a gestione manuale (es. forfettario con obblighi particolari) | "Fattura esterna", fuori dal circuito Acube |
| `reg_f` = prestazione occasionale | Ricevuta per compenso occasionale (non una fattura) |

Gli stati di una fattura elettronica: `pending → sent → accepted` (percorso felice), oppure `sent → quarantena` (SDI non riesce a processarla al primo tentativo, si ritenta in automatico) o `sent → rejected` (contenuto o problema tecnico) o `accepted → notdelivered` (SDI non riesce a consegnarla al destinatario, ma è comunque stata emessa validamente). Ogni transizione genera una notifica in-app — vedi [Notifiche](/guides/notifiche).

Un importo negativo verso un provider (es. compenso assicurativo che supera la fee di piattaforma di quel mese) diventa una **nota di credito** (default) oppure una **fattura con provider/cliente invertiti** quando si tratta di un compenso genuino dovuto da FPC (caso delle compensazioni assicurative), non di una rettifica contabile.

## Riepilogo in breve

- La famiglia paga con carta; quei soldi vanno *prima* all'insegnante o alla scuola esterna della zona, non a FPC.
- Una volta al mese (con un'eccezione giornaliera per ordini scaduti/rimborsati), un processo automatico calcola quanto spetta a ciascuno in base a quante ore ha insegnato quel docente nel mese.
- Il processo genera le fatture corrette per ogni movimento, poi sposta davvero i soldi: prima la quota FPC, poi — se c'era una scuola esterna di mezzo — la quota insegnante, infine un bonifico vero in banca a chi deve incassare.
- L'unica eccezione a "si aspetta fine mese" è il premio assicurativo, che arriva a FPC nello stesso istante del pagamento della famiglia.
- Un rimborso avviene sul conto da cui erano partiti i soldi (insegnante o scuola esterna), mai su quello di FPC.

## Limiti noti

- Il credito famiglia/referral applicato a un ordine non viene recuperato (clawback) se quella lezione viene poi rimborsata — vedi [Referral & Crediti](/guides/referral-crediti).
- Non esiste una UI che mostri all'insegnante/famiglia lo storico dettagliato dei movimenti del ledger (solo il report CSV via email admin); le fatture stesse restano l'unica vista "utente" sui movimenti di denaro.
