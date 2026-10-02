---
title: Area amministrativa e controllo operativo
---

# Area amministrativa e controllo operativo

Oltre alla gestione delle anagrafiche, l'amministrazione dispone di un insieme di strumenti che rispondono a domande di esercizio: **le elaborazioni pianificate sono state eseguite e tutto è andato a buon fine**, **che cosa ha effettivamente movimentato una liquidazione**, **quali adempimenti sono arretrati**, **perché una famiglia non riesce a prenotare**. Questa pagina le descrive nel loro insieme. Sono tutte riservate all'amministrazione e raggruppate nella [API Reference](/api/formando-percorsi-api) sotto Amministrazione.

## Esecuzioni delle elaborazioni pianificate

Una parte rilevante del comportamento della piattaforma dipende da attività pianificate, non da richieste dei client: derivazione degli slot prenotabili, indicatori di ordinamento, promemoria, scadenza delle coperture, passaggio di classe, liquidazione dei compensi. Ogni esecuzione viene **registrata**: comando eseguito, esito, inizio e fine, durata, informazioni di contesto che il comando stesso aggiunge man mano (il mese trattato, il numero di righe elaborate). Oltre allo storico è consultabile il **quadro sintetico dell'ultima esecuzione di ciascun comando**, che è la risposta alla domanda «c'è qualcosa che oggi non ha girato o non è andato bene»; vi compaiono i comandi che hanno girato almeno una volta, quindi un comando mai eseguito si riconosce dalla sua assenza.

Due proprietà di questo registro sono indispensabili per leggerlo correttamente.

**Esito positivo non significa che nulla sia andato storto.** Le elaborazioni di liquidazione intercettano gli errori per singola unità di lavoro e proseguono, per una ragione deliberata: una posizione problematica non deve costare il compenso a tutti gli altri. Ne consegue che un'esecuzione può concludersi correttamente pur avendo saltato qualcuno. Le unità non trattate sono registrate come **segnalazioni** dell'esecuzione, con il relativo conteggio: l'esito va sempre letto insieme a quel conteggio.

**Un'esecuzione interrotta non resta in corso per sempre.** Un'elaborazione che termini in modo anomalo viene chiusa come interrotta, perché una riga rimasta «in esecuzione» si leggerebbe come «sta ancora lavorando» proprio a chi sta verificando se i pagamenti sono usciti.

La registrazione non può in nessun caso far fallire l'elaborazione che documenta: ogni scrittura degrada, in caso di problemi, a una riga di log. Il calendario delle attività pianificate in ciascun ambiente, e i comandi che si eseguono a mano, sono descritti in [Attività pianificate e comandi console](/guides/attivita-pianificate).

## Che cosa ha movimentato una liquidazione

Le [statistiche economiche](/guides/statistiche) rispondono a «quanto abbiamo incassato e quanto è costato in un periodo». Questa area risponde a una domanda diversa e complementare: «che cosa ha fatto quella esecuzione, soggetto per soggetto e lezione per lezione». È possibile consultare:

- l'elenco delle **esecuzioni di liquidazione**, mensili e giornaliere, con i totali delle posizioni registrate e di quanto è effettivamente uscito;
- la **matrice delle posizioni** di una singola esecuzione, ossia ogni importo con il soggetto che lo deteneva e quello che ne aveva diritto, il relativo esito e il dettaglio per lezione;
- i **bonifici** e i **trasferimenti** disposti, filtrabili per soggetto, periodo ed esecuzione di origine;
- la **ricostruzione di una singola lezione**: tutto ciò che ne ha toccato il denaro, attraverso posizioni, trasferimenti, bonifici, quote fatturate alle scuole e rimborsi;
- il **rendiconto** dell'esecuzione e l'archivio dei documenti che ha emesso.

Nulla di tutto questo **scrive**: rieseguire una liquidazione resta un'operazione da riga di comando, perché esporla come richiesta HTTP permetterebbe a un doppio clic di pagare due volte lo stesso soggetto. Il file del rendiconto, in particolare, viene individuato a partire da ciò che l'esecuzione stessa ha registrato e mai da un percorso indicato nella richiesta.

Tre semantiche sono facili da fraintendere e vanno rappresentate come sono:

- la differenza fra l'importo di una posizione e la somma delle sue quote per lezione è un **residuo reale e atteso** — contiene gli importi che non appartengono ad alcuna lezione, come la rifusione dell'imposta di bollo e la ritenuta accreditata a chi la versa — e non va né nascosta né ripartita sulle lezioni;
- un'esecuzione **precedente all'introduzione del registro** non ha posizioni, e va distinta da un'esecuzione che non ha movimentato nulla: la prima non sa, la seconda sa che non c'era niente da fare;
- l'esito «non trattata» di una posizione è **definitivo**, non uno stato di lavorazione: significa che nessun passaggio l'ha raggiunta, tipicamente perché l'esecuzione si è interrotta prima.

Un bonifico, infine, è **aggregato** per soggetto: liquida in un'unica disposizione tutte le posizioni che vi hanno contribuito, quindi non è ricostruibile dalla singola posizione ma dal suo dettaglio per lezione.

## Code di adempimento

Due arretrati di natura fiscale sono consultabili come code, ordinate dalla più vecchia e con il numero di giorni di attesa: le **ricevute predisposte in attesa della marca dell'insegnante** e quelle **in attesa dell'adempimento della piattaforma**, queste ultime chiudibili dalla stessa area registrando l'avvenuta spedizione dell'originale, con scansione facoltativa. Sono tenute separate perché sono dovute da soggetti diversi, e unirle nasconderebbe di chi sia il problema; entrambe escludono le ricevute annullate, che non attendono nessuno. Il significato dei due stati è descritto in [Documenti fiscali e ricevute](/guides/documenti-fiscali).

Una terza consultazione riguarda l'**ordinamento in ricerca**: restituisce gli indicatori di un insegnante così come l'elaborazione notturna li ha lasciati, per poter rispondere a chi chiede perché compare in una certa posizione. La componente del punteggio che dipende dalla singola ricerca è valutata al momento e non è quindi presente; una tabella vuota significa punteggio iniziale, mai un insegnante escluso. Il criterio complessivo è descritto in [Ordinamento dei risultati di ricerca](/guides/ranking-insegnanti).

## Configurazione economica

Due configurazioni incidono direttamente su quanto ciascun soggetto percepisce e sono per questo **versionate**, con decorrenza, storico e possibilità di ritiro: i **listini** per durata, città e regime fiscale, e i **limiti delle fasce di ore**. Entrambe si amministrano con le stesse operazioni — anteprima senza scrittura, programmazione, elenco con lo stato derivato dalla decorrenza, dettaglio, ritiro di una variazione non ancora in vigore o già in vigore, e consultazione di ciò che è in vigore a una data — ed entrambe rifiutano una correzione «in sovrascrittura»: correggere una variazione programmata significa ritirarla, e il ritiro lascia traccia. Le regole e le ragioni di questa impostazione sono descritte in [Pagamenti, payout e fatturazione](/guides/pagamenti); per i listini è inoltre disponibile un'operazione che elenca le entità tariffate e le città che già dispongono di un listino proprio, necessaria per costruire un'interfaccia dato che una tariffa è identificata da soli riferimenti numerici.

Le **[promozioni](/guides/promozioni)** si amministrano da operazioni distinte da quelle rivolte alle famiglie: l'operazione disponibile a una famiglia non è un elenco, ma restituisce solo ciò che quella famiglia può attivare. Tre regole governano il ciclo di vita di una promozione:

- non viene mai **eliminata definitivamente**, perché gli utilizzi già concessi sono l'unica traccia di ciò che è stato scontato: la si disattiva;
- il **codice deve restare univoco fra le promozioni vive**, dato che la prenotazione risolve una promozione a partire dal codice; una promozione disattivata libera il proprio codice;
- l'essere **utilizzabile è una condizione derivata** da date e utilizzi residui, non uno stato registrato: nessuna elaborazione marca una promozione come scaduta al passare della sua data finale.

## Diagnostica e abilitazioni

Due strumenti completano l'area:

- la **diagnostica delle prenotazioni**, che per uno studente e una lezione anche solo parzialmente specificata spiega quale regola impedisce la prenotazione, descritta in [Diagnostica delle prenotazioni](/guides/diagnostica-prenotazioni);
- la **riabilitazione sui servizi esterni** di un utente la cui registrazione non è andata a buon fine — sia una scuola esterna sia un insegnante — descritta in [Scuole esterne, provider e incasso](/guides/scuole-esterne).

## Sintesi

- Ogni elaborazione pianificata lascia una registrazione; l'esito positivo va letto insieme al numero delle unità di lavoro non trattate.
- La consultazione delle liquidazioni è di sola lettura: la riesecuzione resta un'operazione da riga di comando.
- I due arretrati di bollo sono code distinte perché sono dovuti da soggetti distinti.
- Listini e limiti delle fasce si modificano programmando una nuova versione, non riscrivendo quella in vigore.
- Una promozione si disattiva, non si elimina.
