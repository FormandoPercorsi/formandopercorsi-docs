---
title: Insegnanti, dalla candidatura al profilo
---

# Insegnanti, dalla candidatura al profilo

Un insegnante non si registra liberamente sulla piattaforma: vi entra attraverso un percorso di selezione che parte da una candidatura e passa per un invito nominativo. Questa pagina descrive quel percorso, le abilitazioni sui servizi esterni che rendono un insegnante prenotabile, e il profilo con cui l'insegnante governa materie, modalità di erogazione e dati fiscali. Le disponibilità sono descritte in [Disponibilità](/guides/disponibilita), i documenti che l'insegnante emette e riceve in [Documenti fiscali e ricevute](/guides/documenti-fiscali). Gli endpoint sono nelle sezioni [Teacher](/api/teacher), [Teacher Application](/api/teacher-application) e [Auth](/api/auth) della API Reference; quelli della verifica dell'account Stripe e delle ore settimanali attese, per ora presenti solo nell'ambiente di sviluppo, nelle sezioni Teacher Stripe Onboarding e Teacher Expected Hours.

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

Valutata positivamente una candidatura, l'amministrazione genera un **token di registrazione** associato all'indirizzo email del candidato e, facoltativamente, alla candidatura di provenienza. Il token viene inviato per email ed è il solo modo per creare un account insegnante: la registrazione nella categoria insegnante lo richiede sempre. Il token è **monouso** — viene marcato come utilizzato alla registrazione —, vale **7 giorni** (l'email lo indica) e l'amministrazione può revocarlo finché non è stato usato. Un invito scaduto o revocato non impedisce di inviarne uno nuovo alla stessa persona; uno ancora valido sì. Con il token, la candidatura collegata è consultabile senza autenticazione, così che il modulo di registrazione possa proporre già compilati i dati e le materie indicate in candidatura.

Nell'applicazione web gli inviti si generano dalla pagina «Generatore Token» dell'area amministrativa.

L'emissione dell'invito è **riservata agli amministratori**: in precedenza il controllo non era applicato a questa operazione, e qualunque utente autenticato poteva generare, e ricevere in risposta, un invito per insegnanti.

### Registrazione

La registrazione crea in un'unica transazione l'utente, il profilo dell'insegnante — anagrafica, indirizzo di residenza e di fatturazione, regime fiscale, codice destinatario, IBAN, tempo di spostamento — le materie insegnate e le **numerazioni dei documenti** dell'insegnante, una per i documenti emessi automaticamente dalla piattaforma e una per quelli inseriti a mano. Il regime fiscale determina il tipo di documento che l'insegnante emette (fattura elettronica, fattura esterna o ricevuta per compenso occasionale) ed è quindi un dato con conseguenze economiche dirette, descritte in [Documenti fiscali e ricevute](/guides/documenti-fiscali) e in [Scuole esterne, provider e incasso](/guides/scuole-esterne). L'accettazione delle condizioni generali è richiesta alla registrazione; il loro testo è esposto dalla sezione [Contract](/api/contract), distintamente per famiglie e insegnanti.

### Abilitazioni sui servizi esterni

Solo dopo che la registrazione è stata confermata vengono eseguiti, come passi **non bloccanti**, la creazione dell'account Stripe connesso su cui l'insegnante incassa e riceve i trasferimenti, la configurazione anagrafica su ACube che gli consente di emettere documenti elettronici, e — in coda dei lavori — la creazione del calendario Google della piattaforma a lui dedicato. Un errore su uno di questi passi non annulla la registrazione: l'insegnante esiste, ma non è prenotabile finché l'abilitazione mancante non viene completata. L'amministrazione può **ritentare** singolarmente l'abilitazione Stripe o ACube di qualunque utente, la stessa operazione usata per le scuole esterne (si veda [Scuole esterne, provider e incasso](/guides/scuole-esterne)). L'applicazione web segnala all'insegnante, nella propria home, quando Stripe o ACube non risultano configurati.

### Verifica dell'account Stripe

Aprire l'account Stripe non basta perché l'insegnante possa ricevere denaro. Alla registrazione l'account connesso viene creato con i soli dati raccolti dal modulo — nome, data di nascita, indirizzo e IBAN — e **senza verifica dell'identità**, che Stripe si aspetta sia la piattaforma a raccogliere. Finché manca, Stripe tiene l'account **sospeso** (*Restricted*): pagamenti, trasferimenti e bonifici verso quell'account sono bloccati. Le conseguenze dipendono da chi incassa l'ordine (si veda [Scuole esterne, provider e incasso](/guides/scuole-esterne)):

- se l'insegnante **incassa in prima persona** — regime occasionale, oppure insegnante di una scuola con modalità di incasso «insegnante» — il pagamento della famiglia è un addebito diretto sul suo account, e **il checkout fallisce**;
- in tutti gli altri casi la famiglia paga regolarmente, ma il trasferimento e il bonifico mensile verso l'insegnante non possono partire.

Prima d'ora nessun passaggio raccoglieva quei dati, e il problema è emerso con gli insegnanti che incassano in proprio. La verifica è ora affidata alle **pagine di Stripe** (*onboarding* ospitato): l'insegnante viene reindirizzato su una pagina di Stripe che chiede esattamente ciò che manca — documento d'identità, codice fiscale, telefono — e poi rimandato all'applicazione. La piattaforma non vede né conserva documenti d'identità.

```
Area insegnante ── GET /api/teacher/stripe/status ──► onboarding_required?
        │                                                   │ no → nulla da mostrare
        │ sì
        ▼
Avviso «Verifica il tuo account per ricevere i pagamenti»  [Completa la verifica]
        │
        ▼
POST /api/teacher/stripe/onboarding-link ──► reindirizzamento all'url (pagina Stripe)
                                   │
              ┌────────────────────┴───────────────────────┐
              ▼                                            ▼
  /teacher/stripe/return                       /teacher/stripe/refresh
  fine, ma anche uscita a metà                 collegamento scaduto o già usato
  → rileggere lo stato e mostrare l'esito      → chiedere un nuovo collegamento
```

Le due operazioni sono riservate all'insegnante attivo autenticato e agiscono sempre sul **suo** account: non ricevono alcun identificativo.

- **Stato** (`GET /api/teacher/stripe/status`). È letto da Stripe **in tempo reale**, non da un dato salvato: al ritorno dalla pagina di Stripe nessun webhook è ancora arrivato. Restituisce se l'account può ricevere pagamenti (`charges_enabled`) e bonifici (`payouts_enabled`), se Stripe sta aspettando informazioni dall'insegnante (`onboarding_required`, vero quando ci sono requisiti dovuti o scaduti), il codice Stripe del blocco (`disabled_reason`, per esempio `requirements.past_due` o `requirements.pending_verification`: utile a log e assistenza, non da mostrare così com'è) e l'eventuale scadenza entro cui inviarle (`current_deadline`, timestamp Unix o `null`).
- **Collegamento** (`POST /api/teacher/stripe/onboarding-link`, senza corpo). Restituisce l'`url` di una pagina di Stripe limitata ai requisiti dovuti in quel momento. Il collegamento è **monouso e scade in pochi minuti**: va usato subito, non salvato, non inviato per email né generato in anticipo. Se l'insegnante non ha ancora un account — la creazione alla registrazione era fallita — il backend lo apre prima di restituire il collegamento.

Arrivare sulla pagina di ritorno **non** significa che la verifica sia completa: Stripe vi rimanda l'insegnante anche quando esce prima di finire. Lo stato riletto distingue tre esiti: nessuna informazione mancante e pagamenti abilitati (account verificato); nessuna informazione mancante ma pagamenti non ancora abilitati (Stripe sta esaminando i documenti, può richiedere qualche minuto); informazioni ancora mancanti (riprendere con un nuovo collegamento). I due percorsi di ritorno sono costruiti dal backend sull'indirizzo del frontend configurato (`FRONTEND_URL`): se il client li vuole diversi va cambiato il backend.

| Risposta | Quando | Significato per il client |
| --- | --- | --- |
| `400` sullo stato | L'insegnante non ha ancora un account Stripe | Equivale a «verifica necessaria»: il collegamento crea l'account. |
| `400` su entrambe | Profilo dell'[insegnante gestito da una scuola](/guides/scuole-esterne#il-gestore-che-insegna) | L'account è quello della scuola, che lo verifica per conto proprio: non mostrare l'avviso. |
| `403` sul collegamento | Condizioni generali in vigore non accettate | Come per ogni scrittura: prima l'accettazione, si veda [Condizioni generali di contratto](/guides/condizioni-contrattuali). |
| `403` | Utente che non è un insegnante attivo | — |
| `500` sul collegamento | Stripe non è riuscito ad aprire l'account | Errore generico, da ritentare più tardi. |

Stripe può chiedere nuove informazioni anche in seguito, per esempio al superamento di soglie di incasso: lo stato va quindi controllato **a ogni apertura dell'area insegnante**, non solo dopo la registrazione. Nell'ambiente di sviluppo le chiavi Stripe sono di prova e la pagina accetta dati fittizi: si veda [Ambienti di sviluppo e produzione](/guides/ambienti#stripe).

## Quando un insegnante è prenotabile

Perché un insegnante compaia nei risultati di ricerca e possa essere prenotato devono valere insieme più condizioni: account attivo, profilo completo, Stripe configurato, possibilità di emettere documenti, copertura della materia, della scuola e della classe dello studente, e capacità di raggiungere il luogo della lezione nella modalità richiesta. Quando una famiglia non trova un insegnante che si aspetta di trovare, la [diagnostica delle prenotazioni](/guides/diagnostica-prenotazioni) le verifica una per una e indica quale non è soddisfatta.

«Stripe configurato» significa oggi soltanto che **esiste un account**, non che possa incassare: un insegnante con l'account sospeso resta prenotabile, e se incassa in prima persona il problema emerge solo al checkout della famiglia. Finché la prenotazione non controlla lo stato reale dell'account, l'unica protezione è che l'insegnante completi la [verifica](#verifica-dellaccount-stripe).

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

Una modifica di nome, cognome o partita IVA riallinea l'anagrafica dell'insegnante presso ACube. Un insegnante **senza partita IVA** — il regime occasionale — non ha anagrafica presso ACube, perché le sue ricevute sono prodotte dalla piattaforma e non transitano dal Sistema di Interscambio: per lui il riallineamento è saltato. In precedenza il salvataggio del profilo di un insegnante senza partita IVA falliva proprio su quel passaggio.

Il **cambio di indirizzo email** avviene in due tempi: il nuovo indirizzo viene registrato come in attesa e riceve un collegamento di conferma valido 24 ore; solo la conferma lo rende effettivo. Fino ad allora l'accesso continua con l'indirizzo precedente.

### Account Google

L'insegnante può collegare il proprio account Google, che abilita due funzioni indipendenti: la condivisione del calendario delle lezioni e la generazione automatica dei collegamenti Meet per le lezioni online. Sono descritte in [Calendario e lezioni online](/guides/calendario-lezioni-online).

## Che cosa vede l'insegnante

| Area | Contenuto |
| --- | --- |
| **Home** | Il calendario delle disponibilità e quello delle lezioni prenotate, con gli spostamenti; da qui l'insegnante inserisce le disponibilità, modifica o cancella una lezione e propone una modifica alla famiglia. È anche il punto in cui mostrare l'avviso di [verifica dell'account Stripe](#verifica-dellaccount-stripe). |
| **Profilo** | Dati personali e fiscali, materie, sede e raggi, account Google, password. |
| **Area amministrativa** | I documenti emessi e ricevuti, la creazione dei documenti da inserire a mano e la situazione dei pagamenti. |
| **Esercizi** | Pagina predisposta ma non ancora popolata: i contenuti didattici sono per ora gestiti solo dall'amministrazione; si veda [Contenuti didattici](/guides/contenuti-didattici). |

Il saldo e i movimenti del [credito dell'insegnante](/guides/crediti-insegnanti) sono esposti dall'API, ma l'applicazione web non ha ancora una pagina che li mostri. Lo stesso vale, per ora sul solo branch `develop`, per le [ore settimanali attese](/guides/disponibilita#ore-settimanali-attese), che suggeriscono all'insegnante quando aprire più disponibilità, e per le due pagine di ritorno della verifica Stripe, che il frontend deve ancora creare.

L'insegnante dispone dell'elenco degli studenti con cui ha avuto lezioni nell'ultimo anno, e consulta i dati degli studenti e delle famiglie con cui ha lezioni, nella misura necessaria a erogarle (per esempio l'indirizzo di una lezione a domicilio): le operazioni rivolte agli insegnanti restituiscono la vista ridotta di quei soggetti, non quella completa.
