---
title: Statistiche e indicatori
---

# Statistiche e indicatori

L'area amministrativa dispone di un insieme di interrogazioni aggregate su lezioni, disponibilità, utenti e flussi economici. Tutte condividono la stessa forma di richiesta e la stessa struttura di risposta, e tutte sono di sola lettura. Sono raggruppate nella [API Reference](/api/formando-percorsi-api) sotto Amministrazione: [Admin - Lessons](/api/admin-lessons), [Admin - Availability](/api/admin-availability), [Admin - Users](/api/admin-users), [Admin - Finance](/api/admin-finance), oltre alla categoria dedicata alla distribuzione delle fasce di ore.

## Forma comune della richiesta

Ogni interrogazione accetta un intervallo temporale, una **granularità** con cui suddividerlo (giorno, settimana, mese, anno), un eventuale **raggruppamento** (insegnante, materia, scuola, città, provincia, anno di corso) e filtri per materia, scuola, città e provincia. La risposta è paginata e ordinabile per periodo, per chiave di raggruppamento o per qualunque misura restituita; è inoltre esportabile in CSV o XLSX.

Ogni area espone un'operazione complessiva, che restituisce tutte le sue misure, e un'operazione per singola misura, utile quando l'interfaccia mostra un solo grafico.

Due proprietà valgono per tutte le misure e conviene conoscerle prima di leggere un numero.

**Un raggruppamento suddivide un totale, non lo moltiplica.** Le dimensioni usate per raggruppare sono **univoche per riga**: la materia è quella della lezione, la scuola è quella dello studente. Raggiungerle attraverso l'offerta dichiarata dall'insegnante — che copre molte combinazioni di materia, scuola e classe — moltiplicherebbe ogni importo per l'ampiezza di quell'offerta. Per la stessa ragione i **filtri** su materia e scuola rispondono alla stessa domanda del raggruppamento: selezionano le lezioni di quella materia, non gli insegnanti che la coprono.

**Un insieme di dati che non sa rispondere al raggruppamento richiesto confluisce nel gruppo nullo.** È il caso, per esempio, degli ordini quando si raggruppa per materia: un ordine contiene lezioni di materie diverse e la commissione di incasso che grava su di esso non è attribuibile a una sola. Il gruppo nullo è la risposta corretta, non un dato mancante.

## Lezioni

Le misure descrivono il volume erogato e ciò che lo ha disturbato: minuti e numero di lezioni **completate**, **prenotate**, **modificate** e **cancellate** nel periodo. Poiché su ogni cancellazione è registrato il motivo e il soggetto che l'ha richiesta, l'aggregato distingue le cancellazioni della famiglia da quelle dell'insegnante e dai loro esiti, come descritto in [Modifiche e cancellazioni delle lezioni](/guides/modifiche-cancellazioni).

## Disponibilità

Le misure ricostruiscono quanto tempo gli insegnanti offrono e quanto ne viene effettivamente venduto: ore **dichiarate**, ore **effettivamente libere** dopo aver sottratto lezioni e spostamenti, **quota di occupazione** e ore **utili**, ossia quelle collocate nella fascia pomeridiana di maggiore domanda, con un minimo giornaliero. La definizione delle ore utili è **unica** ed è la stessa usata dall'[ordinamento dei risultati di ricerca](/guides/ranking-insegnanti): non esistono due nozioni di ora utile che possano divergere. I concetti di disponibilità dichiarata, tempo effettivamente libero e slot prenotabile sono descritti in [Disponibilità](/guides/disponibilita).

## Utenti

Famiglie registrate e insegnanti registrati nel periodo; famiglie e insegnanti **attivi**, ossia con almeno una lezione nei trenta giorni precedenti l'inizio del periodo; famiglie cancellate, usate come **approssimazione dell'abbandono**. Quest'ultima misura va letta per quello che è: registra la cancellazione dell'account, non l'interruzione dell'utilizzo.

## Flussi economici

Le misure economiche mettono a confronto ciò che è stato incassato con ciò che è costato, e la loro correttezza dipende interamente dal fatto che le due grandezze siano misurate sulla **stessa popolazione e allo stesso grano**, ossia la lezione.

| Misura | Contenuto |
| --- | --- |
| Ricavo | Somma dei prezzi delle lezioni degli ordini incassati |
| Quota della piattaforma | Quota variabile spettante alla piattaforma, alla fascia a cui la lezione è stata liquidata |
| Costi fissi di piattaforma | Quota fissa attribuita alla lezione |
| Quota delle scuole esterne | Quota di competenza, alla stessa fascia |
| Compenso degli insegnanti | Residuo fra prezzo e quote |
| Commissioni di incasso e di pagamento | Oneri del servizio di pagamento su ordini e bonifici, più una componente fissa mensile per insegnante liquidato |
| Costo di emissione dei documenti | Onere unitario per documento fiscale emesso |
| Margine e sua incidenza sul ricavo | Differenza fra ricavo e costi complessivi, e relativo rapporto |

Tre scelte di calcolo hanno conseguenze visibili su ciò che si legge.

**Il ricavo è misurato per lezione, non per ordine.** Sull'importo dell'ordine un ordine le cui lezioni siano state tutte cancellate contribuirebbe al ricavo pur non avendo alcuna lezione che ne porti il costo, gonfiando il margine. I prezzi per lezione sono la ripartizione pro-rata dell'ordine, quindi nulla va perduto per un ordine ancora in corso di erogazione.

**La fascia di ore è quella a cui ciascuna lezione è stata effettivamente liquidata**, che è registrata sulla lezione ed è l'unica fonte attendibile. Solo dove quel dato non esiste — lezioni liquidate prima della sua introduzione, oppure non ancora liquidate — la fascia viene ricostruita dalle ore che l'insegnante ha erogato **nel mese di quella lezione**. Una fascia è una proprietà di un insegnante-mese, e un ordine può contenere lezioni di mesi diversi: attribuirne una sola all'ordine non potrebbe rappresentarla.

**Il periodo è determinato dalla data dell'ordine**, deliberatamente, così che un intervallo confronti il denaro incassato con i costi di quello stesso incasso; soltanto la fascia viene dal mese della lezione. Va inoltre tenuto presente che le misure economiche contano le ore in modo diverso dalla liquidazione — per orario di fine e durata effettiva anziché per durata tariffata — perché è ciò che serve a misurare un ricavo; le due definizioni non sono sovrapponibili e non vanno unificate.

## Distribuzione delle fasce di ore

È il prospetto che supporta la **scelta** dei limiti delle fasce, descritto in [Pagamenti, payout e fatturazione](/guides/pagamenti). Mese per mese mette a confronto tre letture: la distribuzione degli insegnanti ottenuta con i limiti in vigore in quel mese, quella con cui le lezioni sono state realmente liquidate e, se la richiesta propone un diverso insieme di limiti, quella che si otterrebbe con essi, con il relativo scostamento. Una lezione ancora non liquidata è riportata come tale e non conteggiata nella fascia più bassa; le prime due letture possono legittimamente divergere per un insegnante prossimo a un confine, e rendere visibile quella divergenza è lo scopo di tenerle distinte.

## Limiti attuali

- Le statistiche sono **calcolate al momento della richiesta**: un intervallo ampio con granularità fine è un'interrogazione onerosa e non esiste alcuna precomputazione.
- Non sono esposte né a insegnanti né a famiglie: sono interamente riservate all'amministrazione.
- Le misure economiche descrivono **aggregati di periodo**. Ciò che una liquidazione ha effettivamente movimentato si consulta altrove, come descritto in [Area amministrativa e controllo operativo](/guides/amministrazione).
