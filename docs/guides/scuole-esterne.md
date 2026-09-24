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

## Superficie amministrativa

Elenco e dettaglio delle scuole esterne, creazione, modifica, assegnazione e revoca dei comuni di competenza, e riabilitazione sui servizi esterni sono operazioni riservate all'amministrazione e raggruppate nella [API Reference](/api/formando-percorsi-api) sotto Amministrazione, nelle categorie dedicate alle scuole esterne e all'abilitazione sui servizi esterni. Restano disponibili anche le corrispondenti procedure da riga di comando, che eseguono le stesse scritture.

Gli effetti economici di ciascuna configurazione sono descritti in [Pagamenti, payout e fatturazione](/guides/pagamenti); i documenti che ne derivano in [Documenti fiscali e ricevute](/guides/documenti-fiscali).

## Sintesi

- Provider e scuola di competenza rispondono a due domande diverse e non sempre coincidono.
- L'insegnante incassa in prima persona se è in regime occasionale o se la sua scuola ha scelto la modalità di incasso «insegnante»; la scuola conserva in entrambi i casi la propria quota, fatturandola all'insegnante.
- La piattaforma può essere essa stessa scuola di competenza, e in tal caso non emette documenti né dispone bonifici verso se stessa.
- Un comune appartiene a una sola scuola esterna: un'assegnazione in conflitto viene rifiutata.
- Creazione e abilitazione sui servizi esterni sono separate: la prima è atomica, la seconda ritentabile.
