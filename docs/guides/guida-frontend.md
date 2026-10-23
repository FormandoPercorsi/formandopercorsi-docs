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

Le categorie restituite all'accesso sono quattro: `family`, `teacher`, `admin` ed `external_school`. Con le stesse credenziali possono essere raggiungibili più profili (campo `profiles`), fra i quali si passa con `POST /api/auth/switch-profile`: si veda [Autenticazione](/guides/autenticazione#profili-con-le-stesse-credenziali).

Le tre categorie di utenza corrispondono ad altrettante aree dell'applicazione, con rotte separate. Un controllo di autorizzazione protegge ogni pagina: reindirizza alla schermata di accesso chi non è autenticato e impedisce l'accesso alle aree non pertinenti alla propria categoria.

| Area | Pagine | Approfondimento |
| --- | --- | --- |
| **Pubblica** | Home e prezzi, chi siamo, «Lavora con noi» con il modulo di candidatura per gli insegnanti, informative su privacy e cookie, accesso, recupero della password, registrazione della famiglia e conferma, registrazione dell'insegnante tramite invito. | [Insegnanti](/guides/insegnanti), [Famiglie e studenti](/guides/famiglie-studenti) |
| **Famiglia** | Home con lezioni, calendario, prenotazione e programma di invito; percorsi formativi; documenti; profilo; esercizi; esito del pagamento; conferma del passaggio di classe. | [Famiglie e studenti](/guides/famiglie-studenti) |
| **Insegnante** | Home con disponibilità e lezioni; profilo con materie, sede e raggi, account Google; area amministrativa con documenti e pagamenti; esercizi. | [Insegnanti](/guides/insegnanti) |
| **Amministrazione** | Si veda la sezione seguente. | [Area amministrativa e controllo operativo](/guides/amministrazione) |

## Area amministrativa

Oltre alle aree di famiglie e insegnanti, l'applicazione espone l'interfaccia con cui l'amministrazione governa le configurazioni e verifica cosa è successo. Le pagine seguono l'evoluzione degli endpoint amministrativi e sono quindi la parte del client che cambia più spesso; per questo vanno distinte quelle già presenti sui branch distribuiti da quelle ancora in integrazione.

**Pagine presenti su `develop` e `master`:**

| Pagina | Cosa permette di fare |
| --- | --- |
| **Home** | Andamento nel tempo delle ore dichiarate, effettive, utili e prenotate, filtrabile per periodo, insegnante e materia, e consultazione delle [metriche di utilizzo](/guides/tracking-metriche). |
| **Gestione utenti** | Insegnanti, famiglie, lezioni (con il loro stato) e disponibilità effettive. |
| **Catalogo** | Gestione dei [contenuti didattici](/guides/contenuti-didattici): argomenti, sottoargomenti, esercizi con editor Markdown e formule, immagini e video. |
| **Generatore Token** | Inviti nominativi per la registrazione degli insegnanti; si veda [Insegnanti](/guides/insegnanti#invito-e-token). |

**Pagine in integrazione** sul branch `feat/introduzione-nuove-funzionalita-admin` del repository frontend, non ancora riportato su `develop` e quindi non distribuito in alcun ambiente:

| Pagina | Cosa permette di fare |
| --- | --- |
| **Economia** | Aggiornamenti tariffari versionati con anteprima e storico, configurazione dei limiti delle fasce di ore con simulazione della distribuzione, [promozioni](/guides/promozioni), città di competenza e creazione delle scuole esterne. |
| **Liquidazioni** | Le esecuzioni periodiche e ciò che hanno realmente movimentato: flussi di denaro, payout, trasferimenti, documenti emessi e ricevute in attesa di bollo. |
| **Diagnostica** (in Gestione utenti) | Perché una certa famiglia non riesce a prenotare un certo insegnante, descritta in [Diagnostica delle prenotazioni](/guides/diagnostica-prenotazioni). Sta in Gestione utenti perché interroga le stesse anagrafiche delle altre schede, ed è l'ultima scheda perché è lo strumento a cui si ricorre quando le altre non hanno spiegato il problema. |

Finché queste pagine non sono distribuite, le relative operazioni sono raggiungibili solo tramite API o, dove esiste, da riga di comando (si veda [Attività pianificate e comandi console](/guides/attivita-pianificate)). Le scelte di presentazione descritte di seguito si riferiscono a queste pagine.

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
- **Codice di invito acquisito dall'indirizzo**: il parametro `ref` di un collegamento di invito viene memorizzato nel browser alla prima visita e inviato automaticamente con la registrazione della famiglia, senza un campo da compilare; si veda [Crediti e programma referral](/guides/referral-crediti).
- **Assenza di indicatori di ordinamento** nella presentazione degli insegnanti, che sono mostrati nella sequenza restituita dall'API; si veda [Ordinamento dei risultati di ricerca](/guides/ranking-insegnanti).

## Pagamenti e fatture

Il pagamento avviene tramite reindirizzamento completo del browser verso la pagina di pagamento, con pagine dedicate per l'esito positivo e per l'annullamento. In caso di annullamento il client rilascia esplicitamente l'ordine rimasto in sospeso, così da non lasciare prenotazioni pendenti.

Il flusso completo è descritto in [Pagamenti, payout e fatturazione](/guides/pagamenti).

### Verifica dell'account Stripe dell'insegnante

Gli endpoint sono sul branch `develop` del backend; il frontend deve ancora realizzare la parte che segue. Il quadro completo, con risposte ed errori, è in [Insegnanti](/guides/insegnanti#verifica-dellaccount-stripe).

- **Dove.** All'apertura dell'area insegnante (home o profilo) chiamare `GET /api/teacher/stripe/status`. Con `onboarding_required` vero mostrare un avviso persistente con il pulsante «Completa la verifica»; con `charges_enabled` falso conviene un tono d'urgenza, perché le famiglie potrebbero non riuscire a pagare. Un `400` sullo stato equivale a verifica necessaria, salvo per il profilo dell'insegnante gestito da una scuola, a cui l'avviso non va mostrato.
- **Avvio.** Al clic chiamare `POST /api/teacher/stripe/onboarding-link` e reindirizzare **subito** il browser all'`url`: il collegamento è monouso e scade in pochi minuti, quindi non va generato al caricamento della pagina, salvato o inviato per email.
- **`/teacher/stripe/return`** (pagina da creare). Stripe vi rimanda l'insegnante sia a verifica conclusa sia quando esce a metà: rileggere lo stato e mostrare «Account verificato» (nessuna informazione mancante, pagamenti abilitati), «Verifica in corso» con un pulsante per aggiornare (nessuna informazione mancante, pagamenti non ancora abilitati), oppure «Mancano ancora delle informazioni» con il pulsante per riprendere.
- **`/teacher/stripe/refresh`** (pagina da creare). Vi arriva chi apre un collegamento scaduto o già usato: chiedere un nuovo collegamento e reindirizzare, mostrando solo un caricamento.
- I due percorsi sono costruiti dal backend sull'indirizzo del frontend: cambiarli richiede una modifica al backend. Un `403` sul collegamento con il messaggio sui termini va gestito dal flusso di accettazione delle [condizioni contrattuali](#condizioni-contrattuali), che ha la precedenza.

## Condizioni contrattuali

Le condizioni generali di contratto di famiglie e insegnanti sono versionate, e finché l'utente non ha accettato la versione in vigore il server rifiuta con `403` ogni richiesta di scrittura. Il client non deve dedurre nulla dal campo `terms_and_conditions` dell'accesso: la fonte è `GET /api/contract/status`. Il comportamento richiesto è:

- dopo l'accesso, e al rientro in un'applicazione con sessione già aperta, interrogare lo stato; se `must_accept` è vero **bloccare l'interfaccia** con la schermata di accettazione, che mostra il testo e chiede l'approvazione specifica, una per una, di ciascuna clausola di `specific_approval_clauses`, poi invia `POST /api/contract/accept`;
- se è presente `upcoming` e non ancora accettata, **avvisare** l'utente della decorrenza e proporre il confronto con la versione precedente (PDF di confronto) e l'accettazione anticipata;
- l'elenco delle clausole da approvare e il testo **non vanno codificati nel client**: cambiano a ogni versione;
- sostituire con questo flusso il vecchio `POST /api/auth/accept-terms` e la casella della registrazione, che non bastano più a sbloccare un utente quando è in vigore una versione successiva alla 2.0;
- un `403` il cui messaggio riguarda i termini va trattato come segnale di rileggere lo stato, non come errore generico.

Il quadro completo è in [Condizioni generali di contratto](/guides/condizioni-contrattuali).

## Notifiche

Le notifiche sono recuperate per interrogazione periodica ogni cinque minuti, con richieste aggiuntive dopo le azioni che possono generarne. Non è impiegato alcun canale in tempo reale. I tipi non gestiti sono elencati in [Notifiche](/guides/notifiche).

Le notifiche del **passaggio di classe** non sono mostrate nella barra delle notifiche ma da una finestra dedicata, aperta su qualunque pagina della famiglia finché ce n'è una da gestire: per uno studente promosso chiede di confermare l'anno, per uno che ha concluso il ciclo di scegliere la nuova scuola. Chi chiude la finestra senza rispondere non la vede riproposta, ma lo studente resta bloccato in prenotazione finché la conferma non avviene.

## Integrazioni

- **Accesso tramite Google**, con trasmissione del token rilasciato da Google e della categoria utente.
- **Mappe Google** per la selezione degli indirizzi.
- **Nessuna integrazione diretta con il calendario**: la sincronizzazione degli impegni degli insegnanti avviene interamente da server a server; il client si limita a collegare l'account Google dell'insegnante e ad attivare condivisione del calendario e collegamenti Meet, come descritto in [Calendario e lezioni online](/guides/calendario-lezioni-online).
- **Collegamento alla lezione online** inseribile a mano dall'insegnante nel dettaglio della lezione e mostrato alla famiglia.

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
