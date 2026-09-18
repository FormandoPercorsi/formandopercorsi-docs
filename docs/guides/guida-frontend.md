---
title: Applicazione web
---

# Applicazione web

L'applicazione web è il client attualmente in uso per famiglie, insegnanti e amministrazione. È un progetto distinto dalla piattaforma e comunica con essa esclusivamente tramite l'API REST documentata in questo sito.

Questa pagina descrive le scelte implementative del client, ossia i comportamenti che non discendono dal contratto REST e che quindi non sono deducibili dalla [API Reference](/api/formando-percorsi-api). Sono informazioni utili sia a chi lavora su questa applicazione, sia a chi ne realizza un'altra e deve sapere quali responsabilità ricadono sul client.

## Configurazione

| Variabile | Finalità |
| --- | --- |
| `REACT_APP_BACKEND_URL` | Indirizzo base della piattaforma. |
| `REACT_APP_GOOGLE_CLIENT_ID` | Accesso tramite Google. |
| `REACT_APP_GOOGLE_MAPS_KEY` | Selezione degli indirizzi su mappa. |
| `REACT_APP_ENCRYPTION_KEY` | Offuscamento dei dati di sessione conservati nel browser; si vedano le considerazioni in [Autenticazione](/guides/autenticazione). |
| `REACT_APP_ENABLE_LOGS` | Attivazione della registrazione applicativa estesa. |
| `REACT_APP_MAINTENANCE_MODE` | Se attiva, presenta una pagina di manutenzione su tutte le rotte a eccezione dell'area amministrativa. |

:::warning
La chiave per le mappe è referenziata dal codice ma non è inclusa nel file di configurazione versionato: va reperita separatamente per predisporre l'ambiente locale della selezione indirizzi.
:::

## Accesso all'API

Il client utilizza un'unica istanza del client HTTP, con un'intercettazione in uscita che applica il token di autenticazione a ogni richiesta e una in entrata che gestisce le risposte `401` attivando il rinnovo. La strategia di rinnovo completa è descritta in [Autenticazione](/guides/autenticazione).

## Ruoli e navigazione

Le tre categorie di utenza corrispondono ad altrettante aree dell'applicazione, con rotte separate. Un controllo di autorizzazione protegge ogni pagina: reindirizza alla schermata di accesso chi non è autenticato e impedisce l'accesso alle aree non pertinenti alla propria categoria.

## Area amministrativa

Oltre alle aree di famiglie e insegnanti, l'applicazione espone l'interfaccia con cui l'amministrazione governa le configurazioni e verifica cosa è successo. Le pagine seguono l'evoluzione degli endpoint amministrativi e sono quindi la parte del client che cambia più spesso.

| Pagina | Cosa permette di fare |
| --- | --- |
| **Economia** | Aggiornamenti tariffari versionati con anteprima e storico, configurazione dei limiti delle fasce di ore con simulazione della distribuzione, promozioni, città di competenza e creazione delle scuole esterne. |
| **Liquidazioni** | Le esecuzioni periodiche e ciò che hanno realmente movimentato: flussi di denaro, payout, trasferimenti, documenti emessi e ricevute in attesa di bollo. |
| **Gestione utenti** | Insegnanti, famiglie, lezioni e disponibilità, e come ultima scheda la **diagnostica**: perché una certa famiglia non riesce a prenotare un certo insegnante, descritta in [Diagnostica delle prenotazioni](/guides/diagnostica-prenotazioni). Sta qui perché interroga le stesse anagrafiche delle altre schede, ed è l'ultima perché è lo strumento a cui si ricorre quando le altre non hanno spiegato il problema. |

Due scelte di presentazione meritano di essere esplicitate, perché rendono leggibili dati che altrimenti si prestano a essere fraintesi.

**I flussi di denaro sono rappresentati come tali.** Una liquidazione è, nella sostanza, una matrice fra chi deteneva il denaro e chi ne ha diritto, e la pagina la mostra come un diagramma di flusso in cui lo spessore di ogni collegamento è l'importo e il colore è l'esito. Tre informazioni sono rese impossibili da non notare, perché sono quelle che spiegano un conto che non torna: le posizioni **fallite**, quelle **mai raggiunte** da un'elaborazione interrotta, e l'importo **non attribuito a nessuna lezione** — che è un residuo atteso, l'imposta di bollo e la ritenuta, e va presentato come tale e non come uno scarto da riconciliare. Le somme rimaste sul conto di chi le deteneva sono distinte dai movimenti veri, perché non sono un trasferimento. Da qui si scende alla singola lezione, con la ricostruzione di tutto ciò che l'ha toccata economicamente.

**Le entità si cercano per nome, mai per identificativo.** Chi usa l'area amministrativa conosce il nome di una famiglia o di un insegnante, non la sua chiave primaria: studente, insegnante, materia, indirizzo e sede si scelgono da elenchi con ricerca, e le dimensioni lasciate aperte sono una voce dell'elenco — «qualsiasi» — anziché un campo vuoto. Gli indirizzi proposti sono quelli della famiglia dello studente scelto, che è l'unico insieme che abbia senso offrire.

**Un'esecuzione riuscita non significa che sia andato tutto bene.** Le elaborazioni saltano la singola posizione problematica e proseguono, quindi l'esito complessivo viene sempre presentato insieme al numero di unità saltate, e un'esecuzione anteriore all'introduzione del registro dei movimenti è indicata come tale, non come un'elaborazione che non ha mosso nulla: sono due situazioni diverse.

:::note
Le pagine di verifica delle liquidazioni sono **di sola lettura**. Rieseguire una liquidazione resta un'operazione da riga di comando, descritta in [Pagamenti, payout e fatturazione](/guides/pagamenti): esporla su un'interfaccia significherebbe permettere a un doppio clic di pagare due volte le stesse persone.
:::

## Regole che risiedono nel client

Il modello dati è descritto in [Disponibilità](/guides/disponibilita) e [Percorsi formativi](/guides/percorsi-formativi). Quanto segue riguarda invece decisioni prese dal client.

- **Interpretazione difensiva delle risposte di ricerca.** Alcune risposte possono presentarsi come elenco, come oggetto singolo o risultare assenti. Il client normalizza questi casi prima di utilizzarli; lo stesso vale per l'elenco delle sedi, esposto in [Headquarter](/api/headquarter).
- **Selezione automatica dello slot più prossimo.** Nei percorsi formativi le alternative sono restituite in ordine di vicinanza all'orario desiderato; in assenza di una corrispondenza esatta il client preseleziona la prima.
- **Gestione dell'indirizzo per le lezioni a domicilio.** Senza un indirizzo esplicitamente selezionato la piattaforma ricade sull'indirizzo predefinito della famiglia, e la verifica del raggio di copertura può fallire. Il client anticipa quindi la selezione o creazione dell'indirizzo, esposta in [Family Addresses](/api/family-addresses).
- **Soglia di 48 ore** per cancellazione e modifica, replicata nel client in due punti indipendenti. Corrisponde al parametro descritto in [Copertura assicurativa](/guides/assicurazione).
- **Codice promozionale applicato automaticamente** quando la piattaforma espone una promozione compatibile fra quelle disponibili in [Promotion](/api/promotion).
- **Assenza del campo di invito** nel modulo di registrazione, coerentemente con lo stato di adozione descritto in [Crediti e programma referral](/guides/referral-crediti).
- **Assenza di indicatori di ordinamento** nella presentazione degli insegnanti, che sono mostrati nella sequenza restituita dall'API; si veda [Ordinamento dei risultati di ricerca](/guides/ranking-insegnanti).

## Pagamenti e fatture

Il pagamento avviene tramite reindirizzamento completo del browser verso la pagina di pagamento, con pagine dedicate per l'esito positivo e per l'annullamento. In caso di annullamento il client rilascia esplicitamente l'ordine rimasto in sospeso, così da non lasciare prenotazioni pendenti.

Il flusso completo è descritto in [Pagamenti, payout e fatturazione](/guides/pagamenti).

## Notifiche

Le notifiche sono recuperate per interrogazione periodica ogni cinque minuti, con richieste aggiuntive dopo le azioni che possono generarne. Non è impiegato alcun canale in tempo reale. I tipi non gestiti sono elencati in [Notifiche](/guides/notifiche).

## Integrazioni

- **Accesso tramite Google**, con trasmissione del token rilasciato da Google e della categoria utente.
- **Mappe Google** per la selezione degli indirizzi.
- **Nessuna integrazione diretta con il calendario**: la sincronizzazione degli impegni degli insegnanti avviene interamente da server a server.

## Duplicazioni da mantenere allineate

Alcune informazioni sono replicate nel client e devono essere aggiornate quando cambiano lato piattaforma. Ogni voce di questo elenco è un punto di rottura silenzioso: una modifica lato server non produce un errore, ma un comportamento errato nell'interfaccia.

| Elemento duplicato | Conseguenza di un disallineamento |
| --- | --- |
| Sottoinsieme degli stati fattura rappresentati nell'interfaccia | Uno stato non previsto non viene presentato all'utente. |
| Estrazione della durata della lezione dal testo descrittivo della fattura | Una modifica alla formulazione della descrizione rende la durata non più leggibile. |
| Codice promozionale gestito in modo specifico | La promozione non viene più applicata automaticamente. |
| Soglia di 48 ore per cancellazione e modifica | L'interfaccia consente o impedisce azioni in modo difforme dalla piattaforma. |
| Corrispondenza fra tipo di notifica e testo presentato | Le notifiche non previste appaiono prive di significato. |

La dipendenza dal testo descrittivo della fattura è la più fragile dell'elenco, poiché trasforma una stringa destinata alla lettura umana in un contratto di fatto fra piattaforma e client.
