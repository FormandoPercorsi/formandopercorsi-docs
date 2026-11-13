---
title: Simulazione delle tariffe
---

# Simulazione delle tariffe

La simulazione risponde a una domanda che l'amministrazione si pone prima di toccare un listino: **«se metto questo prezzo e lascio all'insegnante questa quota, che cosa resta alla piattaforma, una volta pagate imposte, commissioni e costi di struttura?»** — e, con una variazione di prezzo, **«che cosa cambia?»**. È la versione di sistema del foglio di calcolo con cui i listini venivano costruiti a mano.

:::caution Stato di adozione
La funzionalità è **in sviluppo** sul backend e non è ancora stata rilasciata: le operazioni descritte qui compaiono nella API Reference solo dopo il rilascio del backend e la ricostruzione di questo sito. Non scrive mai su un listino, su un ordine o sui costi fissi di una prenotazione: è uno **stimatore**. I costi fissi reali, quando la piattaforma deciderà di includervi anche i costi di struttura, si costruiranno a partire dai suoi risultati, in un passo separato.
:::

## Come ragiona un calcolo

Ogni calcolo è **per ora di lezione**, su un prodotto (una lezione singola, un percorso da 6, 12 o 18 ore) e per ciascuna fascia di ore dell'insegnante (`b1`..`b4`, vedi [Pagamenti, payout e fatturazione](/guides/pagamenti)):

1. dal **prezzo** pagato dalla famiglia si tolgono le **imposte** di chi fattura, e resta il *ricavo netto*;
2. dal ricavo netto si toglie la **quota netta dell'insegnante** che si vuole garantire per quella fascia, e resta la *quota disponibile* per la piattaforma;
3. dalla quota disponibile si tolgono i **costi fissi** (commissioni dei pagamenti, fatturazione, costi di struttura ripartiti sulle ore), e resta il *margine*;
4. la **quota della piattaforma** è margine più costi fissi, mostrata anche al netto dell'IVA.

Le regole di arrotondamento sono quelle del foglio e sono scelte di business, non rumore numerico: i costi fissi e il margine sono arrotondati **per difetto a 0,10 €** (la piattaforma assorbe il resto, e la quota non sovrastima mai ciò che è disponibile), il costo della fattura è arrotondato per eccesso al centesimo.

Il calcolo segnala come **non coerente** (`consistent: false`) una combinazione che non sta in piedi: se la quota dell'insegnante supera il ricavo netto il margine diventa negativo, e il controllo «insegnante + quota piattaforma ≤ ricavo netto» del foglio sarebbe soddisfatto in modo banale. Per questo il margine non deve essere negativo.

## Le voci di costo sono dati

I costi non sono scritti nel codice: sono **righe configurabili**, con una data di decorrenza, e se ne aggiunge una nuova (server, commercialista, avvocati, servizi bancari…) senza alcun rilascio. Ciascuna ha un **tipo**, che dice come scala, e una **destinazione**, che dice da dove viene tolta.

| Tipo | L'importo è… | Esempio |
| --- | --- | --- |
| `percent_of_price` | una percentuale sul prezzo | 1,5% di commissione sul pagamento |
| `fixed_per_order` | euro per ordine, divisi per le ore dell'ordine | 0,25 € a pagamento; 0,08 € a fattura |
| `fixed_per_hour` | euro per ora di lezione | la stima di 0,05 € l'ora sul bonifico |
| `fixed_per_payout` | euro per bonifico, divisi per le ore che in media un bonifico copre | i 0,10 € di un bonifico |
| `fixed_per_active_account` | euro per insegnante o scuola pagati almeno una volta nel mese, divisi per le ore che un tale account copre in un mese | i 2 € mensili per account |
| `annual_overhead` | euro all'anno, divisi per le ore erogate nell'anno di riferimento | il costo annuo dei server |
| `rate` | un parametro di un'imposta calcolata (vedi sotto), mai un costo | il coefficiente di redditività |

La destinazione è `tax` (riduce il ricavo che poi si divide fra insegnante e piattaforma), `fpc_cost` (un costo che sopporta la piattaforma) o `parameter` (un ingresso di una voce derivata). Una voce può valere per un solo prodotto (l'imposta di bollo è dovuta sui percorsi, mai su una lezione singola) e per un solo **regime**: una voce del regime prevale su quella generale con lo stesso codice.

I valori di partenza sono quelli del foglio, con Stripe scomposto nelle quattro voci con cui viene fatturato (1,5% e 0,25 € sul pagamento; 0,25% e 0,10 € sul bonifico) più il costo mensile per account attivo.

### L'imposta del regime forfettario è calcolata, non digitata

Per il regime forfettario la percentuale d'imposta non è un numero scritto a mano: si **deriva dalla regola italiana**, a partire da tre parametri configurabili:

```
aliquota = coefficiente × (contributi + imposta sostitutiva × (1 − contributi))
```

Con i valori del regime forfettario startup (coefficiente 78%, contributi 26,07%, imposta sostitutiva 5%) l'aliquota è **23,2179%**, il 23,21% del foglio. Passare all'aliquota ordinaria del 15% significa cambiare un parametro, non il codice. Un regime con solo alcuni dei tre parametri è un errore di configurazione e viene rifiutato, perché indovinare quello mancante metterebbe un'imposta sbagliata in ogni tariffa. La durata quinquennale dell'aliquota startup e le soglie di ricavo **non** sono modellate: il regime della parte è un dato in ingresso.

## I volumi di riferimento

Le voci che si ripartiscono su una quantità hanno bisogno di un volume. Per impostazione predefinita è quello **reale dei dodici mesi interi precedenti la data della simulazione**: le ore erogate (le stesse che contano per le fasce), le ore che in media copre un bonifico, le ore che copre un account pagato in un mese. Le ore sono quelle di lezioni **distinte**: una lezione compare nei bonifici sia dell'insegnante sia della scuola, e sommarle due volte conterebbe la stessa ora doppia.

Un volume che non esiste è *sconosciuto*, mai zero: una voce che lo richiede viene **rifiutata** con un messaggio che lo dice, invece di dividere per niente o di considerarla gratuita. Succede, per esempio, su un database senza bonifici registrati; i collegamenti fra bonifici e lezioni esistono solo per le elaborazioni eseguite da quando vengono scritti. In alternativa i volumi si possono indicare a mano (`volume.source: "explicit"`) o escludere (`"none"`).

## Una simulazione

```
POST /api/admin/pricing-simulation/run
```

```json
{
  "as_of": "2027-01-01",
  "vat_type": "forfettario_startup",
  "volume": { "source": "trailing_year" },
  "products": [
    {
      "key": "lezione-singola",
      "price_per_hour": 21.5,
      "order_hours": 1,
      "is_training": false,
      "teacher_net_per_hour": { "b1": 10, "b2": 11, "b3": 12 },
      "reference_hours": 1000
    }
  ],
  "adjustment": { "type": "percent", "value": 10 },
  "band_weights": { "b1": 0.5, "b2": 0.3, "b3": 0.2 }
}
```

- `as_of` è il giorno in cui si leggono le voci di costo (assente: oggi). Una tariffa che parte fra tre mesi si simula con i costi che saranno in vigore allora.
- `vat_type` è il **regime di chi fattura alla famiglia**: seleziona le voci d'imposta.
- `cost_overrides` permette di provare **costi ipotetici** senza salvarli: una voce con lo stesso codice sostituisce quella in vigore, una nuova si aggiunge (per esempio `{"code": "servers", "kind": "annual_overhead", "bucket": "fpc_cost", "amount": 6000}`).
- Una richiesta malformata è un `400` che **nomina il campo** sbagliato; nulla viene sostituito in silenzio da un valore predefinito.

Per ogni prodotto e fascia la risposta contiene `before`, e con un `adjustment` anche `after` e `delta`. Con volumi di 40 ore per account, 4 ore per bonifico e 3.000 ore l'anno, una lezione singola a 21,50 €/ora con 10 € netti all'insegnante dà:

| | Prima | Dopo (+10%, 23,65 €) | Differenza |
| --- | --- | --- | --- |
| Ricavo netto per ora | 16,51 € | 18,16 € | |
| Costi fissi per ora | 0,80 € | 0,80 € | 0,00 € |
| **Margine** per ora | **5,70 €** | **7,30 €** | **+1,60 €** |
| **Quota piattaforma** per ora | **6,50 €** | **8,10 €** | **+1,60 €** |
| Quota piattaforma senza IVA | 5,32 € | 6,63 € | |

Un percorso da 18 ore a 19,90 €/ora con le stesse ipotesi: costi fissi 0,40 €, margine 4,70 €, quota piattaforma 5,10 €. Sul percorso pesa anche l'imposta di bollo, ripartita sulle ore.

### Aumento di prezzo e proiezione sui volumi

`adjustment` applica una variazione a **tutti** i prodotti: `percent` oppure `amount_per_hour`. È il modo di rispondere a «che cosa succede se aumento i prezzi?» senza costruire un listino.

Se un prodotto indica `reference_hours` (le ore vendute nel periodo di riferimento), il margine viene **proiettato sulle ore**: per ogni fascia, come se tutte le ore fossero vendute in quella; e, se si indicano i `band_weights` (la ripartizione delle ore fra le fasce, che somma a 1), pesato in un unico risultato con il confronto prima/dopo. Nella risposta, `volume.hours_by_order_type` riporta le ore reali per lezione singola e percorso del periodo, per precompilare questi valori.

La proiezione usa **le stesse ore prima e dopo**: non modella come la domanda reagisce al prezzo. È una stima dell'effetto contabile di un aumento, non una previsione di vendite.

## Scenari salvati

Un'ipotesi su cui si vuole tornare si salva come **scenario**: un nome, una nota e la richiesta, conservata così com'è scritta (una `as_of` omessa resta omessa, e ogni esecuzione risolve i costi e i volumi di quel giorno). Salvare uno scenario non applica nulla ai listini. La richiesta viene validata al salvataggio, quindi uno scenario accettato si può sempre eseguire.

Eseguire uno scenario restituisce la simulazione e ne conserva l'esito e l'ora, per confrontarlo con la volta successiva. Uno scenario non si elimina: si **archivia**, e uno archiviato è in sola lettura (non si modifica né si esegue). Quando si invia una `request` in modifica, sostituisce l'intera richiesta precedente.

## Amministrare le voci di costo

Le voci di costo si leggono e si programmano con operazioni proprie, con la stessa logica dei [listini e delle fasce](/guides/amministrazione#configurazione-economica):

- l'elenco mostra **ogni versione** con uno stato derivato dalle date (`future`, `in_force`, `past`);
- la consultazione «in vigore» restituisce le voci **come le userebbe una simulazione** a una data e per un regime, con i parametri d'imposta già derivati in un'unica voce;
- una nuova versione parte da una **decorrenza** uguale a oggi o successiva, e chiude la precedente il giorno prima; una decorrenza passata, o due versioni della stessa voce che partono lo stesso giorno, sono rifiutate;
- si **ritira** solo una versione non ancora in vigore, e la precedente si riapre: una versione in vigore è storia, e si può solo sostituire con una nuova.

## Che cosa non è ancora coperto

- Il **regime occasionale** e le **tariffe per livello scolastico** non sono ancora modellati: le regole di calcolo non sono state definite.
- I **prodotti** di una simulazione si indicano a mano (prezzo all'ora, ore dell'ordine, quota insegnante per fascia): non si leggono ancora dal listino in vigore.
- La stima dei **0,05 € l'ora** sul bonifico è provvisoria: il costo reale è di 0,10 € a bonifico, e la voce `fixed_per_payout` lo ripartisce sulle ore che un bonifico copre davvero, quando quei volumi sono disponibili.
- L'imposta si applica al regime di **chi fattura alla famiglia**, che coincide con quello dell'insegnante solo quando l'insegnante è il fornitore dell'ordine.

## Operazioni

Tutte riservate all'amministrazione. I dettagli di richieste e risposte sono nella API Reference, sotto i tag *Admin - Pricing Simulation* e *Admin - Cost Items*.

| Operazione | Percorso |
| --- | --- |
| Simulare senza salvare | `POST /api/admin/pricing-simulation/run` |
| Elencare, leggere, salvare, modificare scenari | `GET`/`POST /api/admin/pricing-simulation/scenarios`, `GET`/`PUT …/scenarios/{id}` |
| Eseguire / archiviare uno scenario | `POST …/scenarios/{id}/run`, `POST …/scenarios/{id}/archive` |
| Elencare le versioni delle voci di costo | `GET /api/admin/cost-items` |
| Voci in vigore a una data per un regime | `GET /api/admin/cost-items/in-force` |
| Programmare una versione | `POST /api/admin/cost-items` |
| Ritirare una versione non ancora in vigore | `DELETE /api/admin/cost-items/{id}` |
