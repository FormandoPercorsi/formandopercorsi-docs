---
title: Scuole esterne, provider e incasso
---

# Scuole esterne, provider e incasso

Una **scuola esterna di competenza** è un partner locale che presidia un insieme di comuni: sugli ordini delle famiglie residenti in quei comuni ha diritto a una quota, e — salvo i casi descritti più sotto — è il soggetto che incassa materialmente il pagamento. Questa pagina descrive come la competenza territoriale viene assegnata, chi incassa in ciascuna configurazione e come una scuola esterna viene creata e abilitata sui servizi esterni.

## Due domande distinte: chi incassa e chi ha diritto alla quota

Su ogni ordine sono registrati due soggetti che è importante non confondere:

- il **provider**, ossia chi incassa il pagamento della famiglia e ne emette il documento;
- la **scuola di competenza**, ossia la scuola esterna che ha diritto alla quota di competenza, se ne esiste una per la città della famiglia.

Nella configurazione ordinaria i due coincidono. Divergono in **due casi**, nei quali l'insegnante incassa sul proprio conto ed emette il documento alla famiglia, mentre la scuola conserva la propria quota e la fattura all'insegnante in liquidazione — esattamente come fa la piattaforma con la propria:

1. **insegnante in regime occasionale**, che deve emettere la ricevuta in prima persona;
2. **qualunque insegnante di una scuola che ha scelto la modalità di incasso «insegnante»**, indipendentemente dal regime fiscale. La modalità è una proprietà della singola scuola, non una decisione della piattaforma: alcune scuole preferiscono che sia l'insegnante a incassare e farsi fatturare dopo.

Per chi integra o interroga il sistema la conseguenza pratica è che **un controllo del tipo «esiste una scuola esterna di competenza» va fatto sulla scuola di competenza, non sul provider**: dal fatto che il provider sia l'insegnante non si può più dedurre che nessuna scuola abbia diritto alla quota.

La decisione avviene una sola volta, al momento della prenotazione, ed è **congelata sull'ordine**: modificare la competenza territoriale di una scuola o la sua modalità di incasso ha effetto dalle prenotazioni successive, mai su quelle già effettuate.

## La piattaforma come provider

La piattaforma può presidiare direttamente alcune aree. Tecnicamente lo fa presentandosi come una scuola esterna a tutti gli effetti, contrassegnata come coincidente con la piattaforma stessa, con l'unica differenza di riutilizzare il proprio conto di incasso anziché un conto dedicato. Non esiste alcun interruttore da attivare: la modalità è operativa esattamente quando quella scuola esiste e ha comuni di competenza assegnati.

L'unico comportamento specifico è che la piattaforma non può fatturare né pagare se stessa. Il riconoscimento del soggetto avviene per **partita IVA e conto di incasso**, non per identificativo, così da funzionare in tutte le forme in cui la piattaforma compare nei movimenti; la fattura verso se stessa viene soppressa, il doppio passaggio si riduce a un unico trasferimento diretto verso l'insegnante e il bonifico verso se stessa non viene disposto. **Ogni soppressione è registrata nei log**, cosicché una posta mancante nel rendiconto mensile resti spiegabile.

## Comuni di competenza

L'assegnazione dei comuni a una scuola esterna è un'operazione amministrativa. La regola che la governa è una sola, e ha una motivazione precisa: la ricerca della scuola competente per una città restituisce **un solo soggetto**, quindi una città rivendicata da due scuole renderebbe arbitrario chi incassa. L'assegnazione di una città già assegnata ad altra scuola viene pertanto **rifiutata, non unita**.

Riassegnare alla stessa scuola una città che già possiede non produce alcun effetto, così che una ripetizione dell'operazione resti innocua. La revoca di una città, come già detto, vale dalle prenotazioni successive.

## Creazione e abilitazione sui servizi esterni

La creazione di una scuola esterna comporta scritture nella base dati e l'abilitazione presso due servizi esterni: il conto per l'incasso e il registro dell'intermediario di fatturazione. I due gruppi di operazioni sono deliberatamente separati:

```
1. Utente, scuola esterna e comuni di competenza  →  un'unica transazione
       └─► o tutto o nulla: non può restare una scuola esterna a metà

2. Conto di incasso e registro di fatturazione     →  passi non bloccanti
       └─► l'esito di ciascuno (eseguito, saltato, non riuscito con motivo)
           viene restituito nella risposta
```

Un'indisponibilità di un servizio esterno non impedisce quindi la creazione, e ciò che non è riuscito si **ritenta**, non si ricrea. Gli stessi due passaggi sono disponibili per un utente qualsiasi, e non solo per una scuola esterna appena creata: anche un **insegnante** la cui abilitazione è fallita in fase di registrazione si trova nella medesima situazione, e la registrazione tratta quei due passaggi come non bloccanti.

Due dati non sono modificabili dall'esterno: l'identificativo del conto di incasso, che si disallineerebbe da quanto il servizio di pagamento conosce davvero e che si muove solo attraverso l'operazione di abilitazione; e il contrassegno che indica la scuola coincidente con la piattaforma, che non è esposto affatto. La modalità di incasso «insegnante», per la stessa ragione, non è ammessa su quella scuola: la sua intera funzione è incassare.

## Il gestore che insegna

Il responsabile di una scuola esterna può insegnare egli stesso. Il caso è modellato con un **secondo utente**, un insegnante *gestito dalla scuola*, e non con un secondo ruolo sull'utente della scuola: ogni percorso economico ricava il soggetto da un identificativo controllando prima se sia un insegnante, e un solo identificativo con due ruoli faceva incassare, fatturare e pagare gli ordini della scuola come se fossero dell'insegnante, pagando due volte lo stesso utente, una per ciascun driver di bonifico.

Due legami distinti, con due scopi:

- **L'identità fiscale è quella della scuola.** L'insegnante gestito non ha partita IVA, codice fiscale, IBAN, regime fiscale, conto di incasso, anagrafica presso l'intermediario di fatturazione né sequenza di numerazione: li prende dalla scuola. Ogni insegnante gestito è legato a **una sola scuola**, e una scuola ne ha **uno solo**; la scuola coincidente con la piattaforma non può averlo. Nel flusso economico l'insegnante gestito **non è mai una parte**: dove le regole renderebbero l'insegnante il provider, lo è la scuola, e come titolare o beneficiario di una posizione nel registro un identificativo è sempre ricondotto al soggetto legale che rappresenta, con un'unica definizione. Nei comuni della scuola la quota dell'insegnante confluisce così nella posizione che la scuola trattiene per sé: nessuna fattura a sé stessa, nessun trasferimento a sé stessa, un solo bonifico. Altrove l'insegnante si comporta come uno qualunque. La fascia di ore resta calcolata sull'insegnante.
- **Le credenziali sono quelle della scuola.** L'insegnante gestito non ha password propria: accede con l'email e la password della scuola. La sua email è una copia mantenuta allineata, e non è mai trovata da una ricerca per email né riceve un ripristino della password. Si veda [Autenticazione](/guides/autenticazione#profili-con-le-stesse-credenziali).

L'insegnante gestito **non matura credito insegnante**: nessuno emette documenti verso di lui, quindi un credito non potrebbe mai essere speso. Le maturazioni sono saltate, il credito in maturazione è vuoto e le rettifiche amministrative sono rifiutate; si veda [Crediti degli insegnanti](/guides/crediti-insegnanti). Non può modificare i dati fiscali e di pagamento, che appartengono alla scuola e sono rifiutati con un errore, e la sincronizzazione con i servizi esterni è saltata.

Il profilo si crea dall'amministrazione con `POST /api/admin/external-schools/{id}/teacher-profile` (corpo facoltativo: nome, cognome, telefono, data di nascita), che risponde `201` con l'identificativo dell'insegnante e la scuola aggiornata, dove compare `operated_teacher_user_id`. Risponde `400` se la scuola non ha un utente attivo, è la scuola della piattaforma o ha già il profilo. Il profilo parte **senza avere accettato le condizioni**: deve accettare in proprio quelle degli insegnanti, come descritto in [Condizioni generali di contratto](/guides/condizioni-contrattuali). Nel profilo dell'insegnante compare `operating_external_school` (identificativo e denominazione della scuola).

I **dipendenti** di una scuola restano insegnanti ordinari con la propria posizione fiscale: questo meccanismo è per l'unica persona che *è* la scuola.

L'email di una scuola può ora essere ripresentata invariata in una modifica: l'unicità la confronta con gli altri utenti e non con la scuola stessa né con la copia dell'insegnante gestito.

## Sedi gestite da una scuola

Una scuola esterna può **gestire** una o più sedi, nel senso di seguirne l'operatività: chi vi insegna, quando, e quanto la sede è occupata. Ogni sede ha al più una scuola che la gestisce, mentre una scuola può gestirne un numero qualsiasi. È un legame diverso dalla **sede di base** della scuola, quella da cui si misura il raggio delle lezioni a domicilio: la base di una scuola non è necessariamente una sede che la scuola gestisce.

L'assegnazione è amministrativa (`PUT /api/admin/headquarters/{id}/managing-school`). Il corpo deve contenere `external_school_id`: un identificativo assegna la sede, `null` esplicito la libera; un corpo senza il campo è rifiutato anziché letto come revoca, così che un client difettoso non tolga la gestione per errore. Le sedi espongono ora `managed_by_external_school_id`.

Due consultazioni, per una sede e un intervallo di date (dalla data odierna e per 7 giorni se non indicato, al massimo 92 giorni):

| Consultazione | Contenuto |
| --- | --- |
| **Agenda** | Le lezioni tenute in sede, in ordine di inizio, con insegnante, studente, materia, durata, tipo di ordine e uno stato sintetico: programmata, svolta o cancellata. Con `include_cancelled` compaiono anche le lezioni prenotate e poi cancellate o spostate altrove, con il motivo della cancellazione. Riporta **solo i nomi**: nessun recapito di insegnanti o studenti viene esposto. |
| **Attività** | Per giorno o per settimana ISO (`group_by=day\|week`), con i periodi vuoti riportati a zero: lezioni e ore prenotate e svolte, lezioni cancellate, studenti e insegnanti distinti, **picco di lezioni contemporanee** e, se la sede ha un numero di posti, il **tasso di occupazione al picco**. Un totale sull'intero intervallo — in cui conteggi distinti e picco non sono la somma dei periodi — e le lezioni dei prossimi 7 giorni, qualunque sia l'intervallo richiesto. |

Tre definizioni determinano i numeri:

- una lezione appartiene a una sede se si svolge **in sede** e quella è la sede indicata sulla lezione;
- una lezione **occupa un posto** se è pagata, in modifica, liquidata o gratuita; mai un checkout non pagato o una proposta di modifica non accettata. Una cancellazione conta solo se la lezione aveva davvero occupato il posto: non una sessione di pagamento scaduta, né una modifica rifiutata o decaduta;
- il **picco** considera gli intervalli semiaperti, quindi due lezioni una dopo l'altra non si sovrappongono, e conta anche una lezione iniziata nel periodo precedente e ancora in corso; il tasso di occupazione è il picco diviso per il numero di posti della sede.

L'amministrazione consulta agenda e attività di qualunque sede (`/api/admin/headquarters/{id}/agenda` e `/activity`). La scuola esterna elenca le **proprie** sedi (`GET /api/school/headquarters`) e ne consulta agenda e attività sotto `/api/school/headquarters/{id}/…`; una sede che non gestisce risponde `404` e non `403`, così da non rivelarne l'esistenza.

La colonna nasce **vuota**: la base di una scuola non è necessariamente una sede che gestisce, e gestirla significa vederne l'agenda con i nomi. Il comando una tantum `headquarter/backfill-managing-school` propone come gestita la base di ciascuna scuola, scrivendo solo i casi non ambigui: si veda [Attività pianificate e comandi console](/guides/attivita-pianificate#recuperi-una-tantum).

## Statistiche della propria competenza

Una scuola esterna consulta le statistiche dell'amministrazione **ristrette alla propria competenza**: lezioni, famiglie e insegnanti attivi, i prospetti sui prodotti e, per il denaro, solo ricavo e propria quota di competenza. Costi della piattaforma, margine, commissioni e fasce non le sono mai calcolati. Le regole sono descritte in [Statistiche e indicatori](/guides/statistiche#statistiche-di-una-scuola-esterna).

## Superficie amministrativa

Elenco e dettaglio delle scuole esterne, creazione, modifica, assegnazione e revoca dei comuni di competenza, assegnazione delle sedi gestite e riabilitazione sui servizi esterni sono operazioni riservate all'amministrazione e raggruppate nella [API Reference](/api/formando-percorsi-api) sotto Amministrazione, nelle categorie dedicate alle scuole esterne e all'abilitazione sui servizi esterni. Restano disponibili anche le corrispondenti procedure da riga di comando, che eseguono le stesse scritture.

Gli effetti economici di ciascuna configurazione sono descritti in [Pagamenti, payout e fatturazione](/guides/pagamenti); i documenti che ne derivano in [Documenti fiscali e ricevute](/guides/documenti-fiscali).

## Sintesi

- Provider e scuola di competenza rispondono a due domande diverse e non sempre coincidono.
- L'insegnante incassa in prima persona se è in regime occasionale o se la sua scuola ha scelto la modalità di incasso «insegnante»; la scuola conserva in entrambi i casi la propria quota, fatturandola all'insegnante.
- La piattaforma può essere essa stessa scuola di competenza, e in tal caso non emette documenti né dispone bonifici verso se stessa.
- Un comune appartiene a una sola scuola esterna: un'assegnazione in conflitto viene rifiutata.
- Creazione e abilitazione sui servizi esterni sono separate: la prima è atomica, la seconda ritentabile.
- Una scuola può gestire delle sedi, di cui consulta agenda e occupazione; è un legame distinto dalla sua sede di base.
- Una scuola legge le statistiche della sola propria competenza, senza i costi della piattaforma.
