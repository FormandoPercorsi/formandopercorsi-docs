---
title: Statistiche e indicatori
---

# Statistiche e indicatori

L'area amministrativa dispone di un insieme di interrogazioni aggregate su lezioni, disponibilità, utenti e flussi economici. Tutte condividono la stessa forma di richiesta e la stessa struttura di risposta, e tutte sono di sola lettura. Sono raggruppate nella [API Reference](/api/formando-percorsi-api) sotto Amministrazione: [Admin - Lessons](/api/admin-lessons), [Admin - Availability](/api/admin-availability), [Admin - Users](/api/admin-users), [Admin - Finance](/api/admin-finance), oltre alla categoria dedicata alla distribuzione delle fasce di ore e a quelle dei programmi di incentivo e dei prodotti acquistati, queste ultime per ora presenti solo nell'ambiente di sviluppo. Le scuole esterne dispongono di una versione ristretta alla propria competenza.

## Forma comune della richiesta

Ogni interrogazione accetta un intervallo temporale, una **granularità** con cui suddividerlo (giorno, settimana, mese, anno), un eventuale **raggruppamento** (insegnante, materia, scuola, città, provincia, anno di corso, scuola di competenza) e filtri per materia, scuola, città, provincia e [scuola di competenza](#scuola-di-competenza). La risposta è paginata e ordinabile per periodo, per chiave di raggruppamento o per qualunque misura restituita; è inoltre esportabile in CSV o XLSX.

Ogni area espone un'operazione complessiva, che restituisce tutte le sue misure, e un'operazione per singola misura, utile quando l'interfaccia mostra un solo grafico.

Due proprietà valgono per tutte le misure e conviene conoscerle prima di leggere un numero.

**Un raggruppamento suddivide un totale, non lo moltiplica.** Le dimensioni usate per raggruppare sono **univoche per riga**: la materia è quella della lezione, la scuola è quella dello studente. Raggiungerle attraverso l'offerta dichiarata dall'insegnante — che copre molte combinazioni di materia, scuola e classe — moltiplicherebbe ogni importo per l'ampiezza di quell'offerta. Per la stessa ragione i **filtri** su materia e scuola rispondono alla stessa domanda del raggruppamento: selezionano le lezioni di quella materia, non gli insegnanti che la coprono.

**Un insieme di dati che non sa rispondere al raggruppamento richiesto confluisce nel gruppo nullo.** È il caso, per esempio, degli ordini quando si raggruppa per materia: un ordine contiene lezioni di materie diverse e la commissione di incasso che grava su di esso non è attribuibile a una sola. Il gruppo nullo è la risposta corretta, non un dato mancante.

## Scuola di competenza

Tutte le interrogazioni accettano un filtro sulla **scuola esterna di competenza** (si veda [Scuole esterne, provider e incasso](/guides/scuole-esterne)): tutte, nessuna, una scuola determinata, oppure un elenco di scuole eventualmente insieme a «nessuna». Lo stesso criterio è disponibile come raggruppamento. Una scuola inesistente produce `400`.

Quale dato determina la scuola dipende dalla popolazione misurata, ed è questo il punto da conoscere:

- **denaro e lezioni** seguono la scuola di competenza registrata sull'**ordine**, mai il soggetto che ha incassato, perché le due informazioni non sempre coincidono;
- le **famiglie** seguono la scuola competente oggi per la loro città di fatturazione;
- i report **basati sugli insegnanti** non hanno una scuola univoca, perché un insegnante può lavorare in territori diversi: disponibilità, insegnanti registrati e distribuzione delle fasce **rifiutano** il filtro; gli insegnanti attivi sono contati sotto ogni scuola per cui hanno insegnato, e la suddivisione per scuola in quel caso non somma al totale; il ledger del credito degli insegnanti, ristretto a una scuola, è restituito come non disponibile.

Le righe a cui non è attribuibile alcuna scuola — bonifici, componenti fisse delle commissioni di pagamento, documenti privi di ordine — sono **escluse** da un dato filtrato e confluiscono nel gruppo nullo quando si raggruppa, che è cosa diversa dal gruppo «nessuna scuola». Le consultazioni amministrative per singola riga (liquidazioni, code di adempimento, promozioni, esecuzioni pianificate, diagnostica) non accettano il filtro: nessuna di quelle righe ha una sola scuola di competenza.

## Lezioni

Le misure descrivono il volume erogato e ciò che lo ha disturbato: minuti e numero di lezioni **completate**, **prenotate**, **modificate** e **cancellate** nel periodo. Poiché su ogni cancellazione è registrato il motivo e il soggetto che l'ha richiesta, l'aggregato distingue le cancellazioni della famiglia da quelle dell'insegnante e dai loro esiti, come descritto in [Modifiche e cancellazioni delle lezioni](/guides/modifiche-cancellazioni).

I prospetti sulle lezioni accettano una **fascia oraria** (inizio e fine, al quarto d'ora, da indicare insieme; la fine può essere `24:00`), con la stessa sovrapposizione usata per le disponibilità e per le ore utili: una lezione conta solo i minuti della propria sovrapposizione con la fascia, nella propria giornata, così che una lezione 13:00–15:00 conti 60 minuti nella fascia 14:00–19:00. Una lezione senza alcun minuto dentro la fascia **non viene contata affatto**: con la fascia, il numero di lezioni e i minuti non sono più proporzionali. La risposta riporta la fascia con cui la richiesta è stata servita. La prenotabilità, proprietà di una disponibilità, non ha senso per una lezione e viene rifiutata.

Le richieste sui flussi economici e sugli utenti **rifiutano** la fascia oraria con un errore, invece di accettarla e ignorarla: un parametro ignorato restituirebbe numeri non filtrati che sembrano filtrati. Che cosa significhi una fascia per il denaro è una decisione ancora da prendere.

## Disponibilità

Le misure ricostruiscono quanto tempo gli insegnanti offrono e quanto ne viene effettivamente venduto: ore **dichiarate**, ore **effettivamente libere** dopo aver sottratto lezioni e spostamenti, **quota di occupazione** e ore **utili**, ossia quelle collocate nella fascia pomeridiana di maggiore domanda, con un minimo giornaliero. La definizione delle ore utili è **unica** ed è la stessa usata dall'[ordinamento dei risultati di ricerca](/guides/ranking-insegnanti): non esistono due nozioni di ora utile che possano divergere. I concetti di disponibilità dichiarata, tempo effettivamente libero e slot prenotabile sono descritti in [Disponibilità](/guides/disponibilita).

Le ore dichiarate, le ore libere e la quota di occupazione accettano due restrizioni facoltative:

- una **fascia oraria** (inizio e fine, al quarto d'ora, da indicare insieme; la fine può essere `24:00`): ogni disponibilità conta solo i minuti della propria sovrapposizione con la fascia, nella propria giornata, così che uno slot 13:00–15:00 conti 60 minuti nella fascia 14:00–19:00. Il calcolo della sovrapposizione è lo stesso usato per le ore utili;
- la **prenotabilità** (`all`, `bookable`, `unbookable`): conta solo le disponibilità che possono, o non possono, ospitare la lezione più breve che la ricerca è in grado di collocare. La prenotabilità è valutata sulla durata **intera** della disponibilità, non sulla parte che cade nella fascia: uno slot libero 13:00–14:30 può ospitare una lezione 13:30–14:30, e i suoi 30 minuti dentro la fascia 14–19 sono quindi prenotabili. La soglia ignora i tempi di spostamento e di preavviso, che la ricerca reale applica per luogo.

La **quota di occupazione** rispetta la fascia oraria ma **ignora la prenotabilità**, perché il rapporto fra prenotato e totale ha senso solo sull'insieme delle disponibilità. Le **ore utili** mantengono la loro definizione fissa: il prospetto dedicato rifiuta le tre restrizioni con un errore, e nel prospetto combinato sono calcolate senza di esse.

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

## Prodotti acquistati

Tre prospetti, nella categoria Admin - Products (per ora presente solo nell'ambiente di sviluppo), descrivono **come vengono acquistate le ore**: lezioni singole per durata contro percorsi formativi per tipo, e come le famiglie passano dall'uno all'altro.

| Prospetto | Contenuto |
| --- | --- |
| **Mix** (`products/mix/search`) | Per ogni durata di lezione singola e ogni tipo di percorso: acquisti, ore acquistate, importo pagato, importo a listino, ricavo, prezzo medio orario pagato e a listino, quota delle ore sul totale e quota delle ore acquistate come percorso. Totali sull'intervallo e serie per periodo, con granularità a scelta; un filtro facoltativo limita a un solo tipo di prodotto. |
| **Transizioni** (`products/transitions/search`) | Confronta due finestre di uguale durata (da 7 a 365 giorni, 90 per impostazione predefinita) attorno a un **perno** — una data, oppure la decorrenza di un aggiornamento tariffario — e classifica ogni famiglia, in ciascuna finestra, come *nessun acquisto*, *solo singole*, *solo percorsi* o *entrambi*. Restituisce la matrice dei passaggi con le famiglie e gli acquisti di ciascuna cella. |
| **Conversione** (`products/conversion/search`) | Raggruppa per mese del **primo acquisto** le famiglie che hanno iniziato con una lezione singola e riporta quante hanno acquistato un percorso entro 30, 60 e 90 giorni. |

Le definizioni sono comuni ai tre prospetti.

**Un acquisto è un ordine incassato**, alla data dell'ordine, come nelle misure economiche. Un ordine cancellato dall'amministrazione scompare; il rimborso di una singola lezione lascia l'acquisto e riduce solo il ricavo. L'ordine separato che nasce quando una lezione di un percorso cambia insegnante è **ricondotto al percorso**: altrimenti un cambio di insegnante risulterebbe come una lezione singola acquistata in quella data.

**Le ore sono misurate all'acquisto** — quantità per durata della lezione, oppure ore del tipo di percorso — e non sommando le lezioni, che spostamenti e cancellazioni alterano. Ne consegue che modificare il numero di ore di un tipo di percorso ne riscrive lo storico. Gli importi sono aggregati per acquisto, così che il numero di lezioni non li moltiplichi: l'**importo pagato** è al netto di credito e promozione, l'**importo a listino** li comprende, il **ricavo** è quello delle misure economiche e scende al rimborso delle lezioni.

**Le transizioni sono stagionali per natura.** Una finestra che arriva a oggi accorcia entrambe alla stessa durata, e la risposta lo segnala (`truncated`): i numeri sono provvisori. Con `compare_previous_year` si ottiene la stessa matrice un anno prima, perché l'anno scolastico rende fuorviante un semplice prima/dopo che attraversi l'estate. Un aggiornamento tariffario ritirato non è mai entrato in vigore ed è rifiutato come perno.

**La conversione conta solo chi è osservabile.** Il tasso a 30, 60 o 90 giorni considera solo le famiglie il cui primo acquisto ha almeno quell'età; le altre sono riportate a parte come non ancora osservabili, e un denominatore vuoto produce un tasso nullo.

Ogni prospetto accetta **solo i propri parametri**: filtri per materia, scuola e territorio, raggruppamento, esportazione e i parametri degli altri due sono rifiutati con `400`, mai ignorati. Transizioni e conversione accettano solo la granularità mensile. Il filtro per scuola di competenza è accettato da tutti e segue la scuola registrata sull'**ordine dell'acquisto**: una famiglia è profilata solo sui propri acquisti in quella competenza.

Il precedente conteggio degli acquisti per tipo di prodotto fra le misure economiche (`finance/products/search`) è **deprecato** a favore del mix: conta ancora come nuovo acquisto l'ordine separato da un cambio di insegnante e non distingue le lezioni singole per durata. Resta disponibile finché l'applicazione amministrativa non sarà passata al nuovo prospetto, poi sarà rimosso.

## Statistiche di una scuola esterna

Una scuola esterna consulta, sotto `/api/school/statistics/…` (categoria School - Statistics, per ora presente solo nell'ambiente di sviluppo), gli stessi prospetti dell'amministrazione **ristretti alla propria competenza**:

| Prospetto | Contenuto |
| --- | --- |
| Lezioni | Completate, cancellate, modificate e prenotate, con le stesse righe del prospetto amministrativo. |
| Flussi economici | **Solo due misure**, per scelta: il ricavo e la quota di competenza spettante alla scuola. Costi e margine della piattaforma, commissioni di pagamento e di emissione e fasce non sono mai calcolati per una scuola. |
| Utenti | Famiglie nuove, attive e cancellate, sotto la scuola competente oggi per la loro città di fatturazione; insegnanti attivi, sotto la scuola delle lezioni che li hanno resi attivi, quindi un insegnante che ha lavorato anche per altre scuole è contato da ciascuna. Gli insegnanti registrati non sono disponibili: un insegnante non ha una scuola di competenza propria. |
| Prodotti | Mix, transizioni e conversione, come descritti sopra. |

Il filtro per scuola di competenza è **imposto** al chiamante. Può essere omesso o ripetere il proprio identificativo; qualunque altro valore — un'altra scuola, «tutte», «nessuna», un elenco — e il raggruppamento per scuola di competenza sono rifiutati con `400`, non sostituiti in silenzio. Un prospetto che non può essere ristretto a una scuola è rifiutato allo stesso modo. Un utente che non è una scuola esterna attiva riceve `403`.

## Distribuzione delle fasce di ore

È il prospetto che supporta la **scelta** dei limiti delle fasce, descritto in [Pagamenti, payout e fatturazione](/guides/pagamenti). Mese per mese mette a confronto tre letture: la distribuzione degli insegnanti ottenuta con i limiti in vigore in quel mese, quella con cui le lezioni sono state realmente liquidate e, se la richiesta propone un diverso insieme di limiti, quella che si otterrebbe con essi, con il relativo scostamento. Una lezione ancora non liquidata è riportata come tale e non conteggiata nella fascia più bassa; le prime due letture possono legittimamente divergere per un insegnante prossimo a un confine, e rendere visibile quella divergenza è lo scopo di tenerle distinte.

## Programmi di incentivo

Tre prospetti descrivono i programmi che riducono il prezzo pagato dalle famiglie: il [programma referral](/guides/referral-crediti), il credito di famiglie e [insegnanti](/guides/crediti-insegnanti) e le [promozioni](/guides/promozioni). Restituiscono i totali sull'intero intervallo e la serie per periodo; i totali sono calcolati sull'intervallo complessivo e non sommando i periodi, perché un conteggio di soggetti distinti non è additivo.

| Prospetto | Contenuto |
| --- | --- |
| Referral | Parametri in vigore del programma; inviti inviati, indirizzi invitati e quanti si sono registrati, anche senza passare dal collegamento; registrazioni tramite invito, quante hanno pagato e quante entro il termine, con i relativi tassi; crediti di benvenuto e della famiglia invitante riconosciuti; riconoscimenti contrassegnati per revisione; classifica delle famiglie invitanti. |
| Crediti | Lato famiglie: credito riconosciuto per origine (benvenuto, famiglia invitante, rettifiche), speso, restituito per sessione scaduta e per lezione cancellata. Sugli ordini: sconto da credito prenotato e applicato agli ordini incassati. Sulle lezioni liquidate: chi ha assorbito lo sconto (piattaforma, scuola, insegnante) e quanto attende ancora la liquidazione. Lato insegnanti: credito maturato per origine e speso. In più i **saldi** di famiglie e insegnanti alla fine dell'intervallo. |
| Promozioni | Utilizzi registrati e famiglie che le hanno usate; ordini pagati e gratuiti, famiglie che ne hanno beneficiato, sconto concesso e lezioni gratuite; elenco per promozione con le stesse misure. |

Alcune regole valgono per tutti e tre.

**Ogni blocco ha un proprio riferimento temporale**, dichiarato nella API Reference: i movimenti di credito per data del movimento, ordini e assorbimenti per data dell'ordine — lo stesso riferimento delle misure economiche — e gli utilizzi delle promozioni per data di utilizzo. Un tasso è calcolato solo all'interno di una stessa coorte, e un denominatore vuoto produce un valore nullo, non zero.

**«Pagato» ha un'unica definizione**, condivisa con le misure economiche: un ordine incassato. Un ordine con promozione conta solo finché **regge**, ossia incassato o gratuito con almeno una lezione ancora in essere: lo sconto su una prenotazione scaduta o interamente rimborsata non viene riportato come concesso.

**Un saldo negativo non compensa un saldo positivo.** Il credito in essere è la somma dei soli saldi positivi; i saldi negativi — possibili per un insegnante dopo uno storno — sono riportati a parte.

**Gli inviti sono contati solo da quando sono registrati**: la risposta indica la data da cui la registrazione è attiva, che delimita il periodo per cui le misure sugli inviti sono significative.

Questi prospetti accettano il filtro per scuola di competenza, ma **rifiutano con `400`** i filtri per materia, scuola e territorio e il raggruppamento: ignorarli restituirebbe numeri non filtrati che sembrerebbero filtrati. La suddivisione per famiglia invitante e per promozione è fornita dagli elenchi dedicati.

## Limiti attuali

- Le statistiche sono **calcolate al momento della richiesta**: un intervallo ampio con granularità fine è un'interrogazione onerosa e non esiste alcuna precomputazione.
- Non sono esposte né a insegnanti né a famiglie: sono riservate all'amministrazione e, per la sola propria competenza, alle [scuole esterne](#statistiche-di-una-scuola-esterna).
- Le misure economiche descrivono **aggregati di periodo**. Ciò che una liquidazione ha effettivamente movimentato si consulta altrove, come descritto in [Area amministrativa e controllo operativo](/guides/amministrazione).
