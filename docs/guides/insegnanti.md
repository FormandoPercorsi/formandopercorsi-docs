---
title: Insegnanti, dalla candidatura al profilo
---

# Insegnanti, dalla candidatura al profilo

Un insegnante non si registra liberamente sulla piattaforma: vi entra attraverso un percorso di selezione che parte da una candidatura e passa per un invito nominativo. Questa pagina descrive quel percorso, le abilitazioni sui servizi esterni che rendono un insegnante prenotabile, e il profilo con cui l'insegnante governa materie, modalità di erogazione e dati fiscali. Le disponibilità sono descritte in [Disponibilità](/guides/disponibilita), i documenti che l'insegnante emette e riceve in [Documenti fiscali e ricevute](/guides/documenti-fiscali). Gli endpoint sono nelle sezioni [Teacher](/api/teacher), [Teacher Application](/api/teacher-application) e [Auth](/api/auth) della API Reference.

## Il percorso di ingresso

```
1. Candidatura            chiunque, senza autenticazione
       │                  └─► notifica ed email all'amministrazione
       ▼
2. Valutazione            amministrazione
       │
       ▼
3. Invito                 l'amministrazione genera un token nominativo
       │                  └─► email al candidato con il collegamento di registrazione
       ▼
4. Registrazione          il candidato, con il token
       │                  └─► profilo, dati fiscali, materie, accettazione delle condizioni
       ▼
5. Abilitazioni           automatiche, subito dopo la registrazione
                          └─► Stripe, ACube, calendario Google
```

### Candidatura

La candidatura è pubblica: non richiede un account. Raccoglie i dati anagrafici e di contatto del candidato e le materie che intende insegnare, ciascuna con le scuole e le classi per cui si propone. La sua ricezione genera una notifica in-app agli amministratori e le email previste; un errore nell'invio di queste comunicazioni non fa mai fallire la candidatura, che è già registrata. L'amministrazione consulta le candidature in un elenco filtrabile e paginato.

### Invito e token

Valutata positivamente una candidatura, l'amministrazione genera un **token di registrazione** associato all'indirizzo email del candidato e, facoltativamente, alla candidatura di provenienza. Il token viene inviato per email ed è il solo modo per creare un account insegnante: la registrazione nella categoria insegnante lo richiede sempre. Il token è **monouso** — viene marcato come utilizzato alla registrazione — e l'amministrazione può revocarlo finché non è stato usato. Con il token, la candidatura collegata è consultabile senza autenticazione, così che il modulo di registrazione possa proporre già compilati i dati e le materie indicate in candidatura.

Nell'applicazione web gli inviti si generano dalla pagina «Generatore Token» dell'area amministrativa.

### Registrazione

La registrazione crea in un'unica transazione l'utente, il profilo dell'insegnante — anagrafica, indirizzo di residenza e di fatturazione, regime fiscale, codice destinatario, IBAN, tempo di spostamento — le materie insegnate e le **numerazioni dei documenti** dell'insegnante, una per i documenti emessi automaticamente dalla piattaforma e una per quelli inseriti a mano. Il regime fiscale determina il tipo di documento che l'insegnante emette (fattura elettronica, fattura esterna o ricevuta per compenso occasionale) ed è quindi un dato con conseguenze economiche dirette, descritte in [Documenti fiscali e ricevute](/guides/documenti-fiscali) e in [Scuole esterne, provider e incasso](/guides/scuole-esterne). L'accettazione delle condizioni generali è richiesta alla registrazione; il loro testo è esposto dalla sezione [Contract](/api/contract), distintamente per famiglie e insegnanti.

### Abilitazioni sui servizi esterni

Solo dopo che la registrazione è stata confermata vengono eseguiti, come passi **non bloccanti**, la creazione dell'account Stripe connesso su cui l'insegnante incassa e riceve i trasferimenti, la configurazione anagrafica su ACube che gli consente di emettere documenti elettronici, e — in coda dei lavori — la creazione del calendario Google della piattaforma a lui dedicato. Un errore su uno di questi passi non annulla la registrazione: l'insegnante esiste, ma non è prenotabile finché l'abilitazione mancante non viene completata. L'amministrazione può **ritentare** singolarmente l'abilitazione Stripe o ACube di qualunque utente, la stessa operazione usata per le scuole esterne (si veda [Scuole esterne, provider e incasso](/guides/scuole-esterne)). L'applicazione web segnala all'insegnante, nella propria home, quando Stripe o ACube non risultano configurati.

## Quando un insegnante è prenotabile

Perché un insegnante compaia nei risultati di ricerca e possa essere prenotato devono valere insieme più condizioni: account attivo, profilo completo, Stripe configurato, possibilità di emettere documenti, copertura della materia, della scuola e della classe dello studente, e capacità di raggiungere il luogo della lezione nella modalità richiesta. Quando una famiglia non trova un insegnante che si aspetta di trovare, la [diagnostica delle prenotazioni](/guides/diagnostica-prenotazioni) le verifica una per una e indica quale non è soddisfatta.

## Il profilo

### Materie, scuole e classi

L'offerta didattica di un insegnante è un insieme di terne **materia – scuola – classe**: per ogni materia l'insegnante indica in quali scuole e per quali anni di corso può insegnarla. È su queste terne che la ricerca abbina insegnante e studente, il quale a sua volta è associato a una scuola e a un anno di corso (si veda [Famiglie e studenti](/guides/famiglie-studenti)). Le stesse terne alimentano anche l'ordinamento in ricerca, che premia l'aderenza fra il livello dell'insegnante e quello richiesto (si veda [Ordinamento dei risultati di ricerca](/guides/ranking-insegnanti)).

Le terne valgono per le **nuove prenotazioni**. Una lezione già prenotata resta sempre modificabile con lo stesso insegnante anche se nel frattempo l'insegnante ha smesso di coprire quella scuola o quella classe, o lo studente ha cambiato scuola: si veda [Modifiche e cancellazioni delle lezioni](/guides/modifiche-cancellazioni).

### Modalità di erogazione e raggio d'azione

Le modalità in cui un insegnante insegna dipendono dalle disponibilità che dichiara (si veda [Disponibilità](/guides/disponibilita)) e da alcune impostazioni del profilo:

| Impostazione | Effetto |
| --- | --- |
| **Sede** | La sede presso cui l'insegnante opera. Abilita le lezioni in sede e, con il raggio dalla sede, quelle a domicilio con partenza dalla sede. Le sedi sono un'anagrafica gestita dall'amministrazione e consultabile da tutti; si veda [Headquarter](/api/headquarter). |
| **Raggio dal domicilio** | Distanza massima, misurata dal domicilio dell'insegnante, entro cui accetta lezioni a domicilio dello studente. Con raggio nullo questa modalità non è offerta. |
| **Raggio dalla sede** | Distanza massima, misurata dalla sede, per le lezioni a domicilio con partenza dalla sede. |
| **Preavviso per modalità** | Preavviso minimo predefinito con cui una lezione online, a domicilio o in sede può essere prenotata. |
| **Tempo di spostamento** | Tempo che una lezione fuori casa occupa prima e dopo la sua durata. Modificarlo ricalcola gli slot attorno alle lezioni future. |

La distanza è calcolata fra le coordinate del domicilio o della sede e quelle dell'**indirizzo della lezione**: un indirizzo della famiglia non ancora geolocalizzato non può ospitare lezioni a domicilio. Nell'applicazione web i raggi si impostano su una mappa.

### Dati personali, fiscali e di contatto

Dal profilo l'insegnante aggiorna i propri dati anagrafici, fiscali e bancari, la presentazione e la fotografia mostrate alle famiglie, le numerazioni dei documenti emessi a mano e il consenso alle comunicazioni via WhatsApp. Le deleghe alla piattaforma per l'imposta di bollo sulle ricevute occasionali — una per il bollo virtuale, una per la marca apposta da FPC, indipendenti fra loro — si concedono e si revocano da un'operazione dedicata, descritta in [Documenti fiscali e ricevute](/guides/documenti-fiscali).

Il **cambio di indirizzo email** avviene in due tempi: il nuovo indirizzo viene registrato come in attesa e riceve un collegamento di conferma valido 24 ore; solo la conferma lo rende effettivo. Fino ad allora l'accesso continua con l'indirizzo precedente.

### Account Google

L'insegnante può collegare il proprio account Google, che abilita due funzioni indipendenti: la condivisione del calendario delle lezioni e la generazione automatica dei collegamenti Meet per le lezioni online. Sono descritte in [Calendario e lezioni online](/guides/calendario-lezioni-online).

## Che cosa vede l'insegnante

| Area | Contenuto |
| --- | --- |
| **Home** | Il calendario delle disponibilità e quello delle lezioni prenotate, con gli spostamenti; da qui l'insegnante inserisce le disponibilità, modifica o cancella una lezione e propone una modifica alla famiglia. |
| **Profilo** | Dati personali e fiscali, materie, sede e raggi, account Google, password. |
| **Area amministrativa** | I documenti emessi e ricevuti, la creazione dei documenti da inserire a mano e la situazione dei pagamenti. |
| **Esercizi** | Pagina predisposta ma non ancora popolata: i contenuti didattici sono per ora gestiti solo dall'amministrazione; si veda [Contenuti didattici](/guides/contenuti-didattici). |

Il saldo e i movimenti del [credito dell'insegnante](/guides/crediti-insegnanti) sono esposti dall'API, ma l'applicazione web non ha ancora una pagina che li mostri.

L'insegnante consulta inoltre i dati degli studenti e delle famiglie con cui ha lezioni, nella misura necessaria a erogarle (per esempio l'indirizzo di una lezione a domicilio): le operazioni rivolte agli insegnanti restituiscono la vista ridotta di quei soggetti, non quella completa.

## Limiti attuali

- Il token di registrazione prevede una scadenza di 24 ore, ma il controllo che dovrebbe applicarla confronta un valore sbagliato e non scatta mai: un token resta valido finché non viene usato o revocato. Gli inviti non usati vanno quindi revocati esplicitamente.
- L'elenco degli studenti dell'insegnante (`GET /api/teacher/student`) filtra le lezioni su un identificativo errato e restituisce sempre un elenco vuoto; l'applicazione web non lo utilizza.
