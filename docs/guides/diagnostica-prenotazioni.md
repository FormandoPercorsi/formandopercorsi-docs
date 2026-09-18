---
title: Diagnostica delle prenotazioni
---

# Diagnostica delle prenotazioni

«L'app dice che non posso prenotare questo insegnante.» È la segnalazione più frequente che arriva all'assistenza, ed è anche quella a cui la piattaforma, da sola, risponde peggio: il percorso di prenotazione è costruito per **rifiutare in fretta**, non per spiegarsi.

I validatori si fermano al primo errore, quindi una situazione con tre problemi ne mostra uno solo. E la verifica sull'insegnante fa di peggio: condensa sei condizioni distinte — stato dell'utenza, completezza del profilo, configurazione Stripe, possibilità di emettere documenti, copertura di scuola e classe, copertura della materia — in un unico messaggio indistinto. Chi riceve la segnalazione non ha modo di sapere quale delle sei sia, se non riproducendo lato server la richiesta esatta della famiglia.

La **diagnostica delle prenotazioni** risponde a quella domanda. Per uno studente e una lezione descritta anche solo in parte, esegue i controlli reali della prenotazione e ne riporta **tutti** gli esiti, non solo il primo negativo; ricostruisce filtro per filtro perché la ricerca della famiglia non restituisce un certo insegnante; ed elenca, per ogni dato lasciato in bianco, quali valori funzionerebbero.

L'operazione è riservata all'amministrazione ed è **di sola lettura**: esegue i validatori e i filtri veri, ma non prenota, non modifica e non registra nulla. Il relativo endpoint compare sotto Amministrazione nella [API Reference](/api/formando-percorsi-api) via via che raggiunge ciascun ambiente.

## La richiesta

Solo lo **studente** è obbligatorio. Ogni altro campo — insegnante, materia, modalità, durata, inizio, indirizzo, sede — vale «qualsiasi valore» quando è lasciato in bianco, ed è proprio così che si arriva alla domanda più utile: *quali* valori funzionerebbero.

Chi riceve una segnalazione raramente conosce lo slot esatto che la famiglia ha provato a prenotare, quindi partire dal solo studente e restringere è il modo normale di usare lo strumento.

I riferimenti indicati vengono validati **solo nella forma**: un riferimento ben scritto che non esiste, che appartiene a un'altra famiglia o che punta a un utente della categoria sbagliata viene lasciato passare di proposito. Spiegare esattamente quella situazione è il compito della diagnosi, non qualcosa da prevenire rifiutando la richiesta.

Nell'applicazione web lo strumento è l'ultima scheda della gestione utenti, e tutto vi si sceglie per nome da elenchi con ricerca; si veda [Applicazione web](/guides/guida-frontend).

## Il verdetto

Il risultato non è un sì o un no, perché due soli stati mentirebbero proprio sul caso più frequente: una richiesta parziale in cui, finora, non fallisce niente.

| Verdetto | Significato |
| --- | --- |
| **Bloccata** | Almeno un controllo blocca la prenotazione. I motivi sono tutti elencati, non solo il primo. |
| **Prenotabile** | La richiesta individua una singola prenotazione — insegnante, materia, modalità, durata e inizio sono tutti indicati — e nessun controllo la blocca. |
| **Richiesta incompleta** | Niente blocca finora, ma è rimasta aperta almeno una dimensione, oppure un controllo non ha potuto essere valutato. |

«Richiesta incompleta» **non è un sì**. Un controllo non valutato non viene mai considerato superato: riportare come prenotabile una richiesta a metà significherebbe dire all'assistenza che funziona quando si è solo stabilito che *nulla di ciò che si è potuto guardare* la blocca.

## I controlli

I controlli sono organizzati in cinque stadi, nell'ordine in cui il percorso reale li incontra:

```
Studente ──► Insegnante ──► Materia ──► Modalità ──► Slot
```

A questi si aggiunge, quando calcolabile, l'analisi delle **disponibilità** descritta più sotto, che viene riportata insieme agli altri come un controllo a sé.

| Stadio | Cosa verifica |
| --- | --- |
| **Studente** | Che lo studente esista e sia tale; che abbia una scuola, un anno di corso e delle materie; che appartenga al gruppo famiglia indicato; che il profilo del genitore sia completo. |
| **Insegnante** | Che l'insegnante esista, sia tale, sia attivo, abbia un profilo completo, Stripe configurato e la possibilità di emettere documenti; che copra la scuola e la classe dello studente e la materia richiesta. |
| **Materia** | Che la materia esista e rientri fra quelle dello studente. |
| **Modalità** | Che l'insegnante possa erogare nella modalità chiesta: online, a domicilio sull'indirizzo che verrebbe usato, oppure presso la sede indicata. |
| **Slot** | Che l'insegnante abbia una disponibilità che copre l'orario chiesto e che non ci sia una lezione sovrapposta. |

Ogni controllo riporta uno di tre esiti — **passa**, **blocca**, **non valutato** — con un messaggio e i dati su cui si è basato. Un controllo «non valutato» dichiara sempre anche il motivo: manca un dato in ingresso, oppure una condizione precedente lo ha reso privo di senso. Alcuni controlli non valutati sono comunque informativi: quando la materia non è indicata, il controllo sulla materia dell'insegnante elenca ugualmente quali materie copre per quella scuola e quella classe; quando la modalità non è indicata, il controllo corrispondente elenca le modalità che l'insegnante potrebbe servire.

:::note
Una nuova condizione di rifiuto introdotta nel percorso di prenotazione deve ricevere **un controllo tutto suo** nella diagnostica. Accorparla a uno esistente rimetterebbe esattamente l'opacità che questo strumento esiste per togliere.
:::

I controlli non riscrivono le regole: richiamano i validatori reali della prenotazione. Una regola che cambia lato piattaforma cambia quindi anche qui, senza che nessuno debba allinearne una seconda copia.

## Perché la ricerca non mostra un insegnante

Un insegnante può superare ogni controllo di idoneità e **non comparire lo stesso** fra i risultati della famiglia, perché la ricerca applica una propria catena di filtri sopra l'idoneità. È una casistica che l'elenco dei controlli, da solo, non può spiegare.

La diagnostica riesegue quella catena **un filtro alla volta**, limitata al singolo insegnante, e riporta quanti slot sopravvivono dopo ciascuno:

```
Disponibilità nel periodo di ricerca   ████████████████████  42 slot
Orari di inizio ammessi                ████████              18 slot
Slot consecutivi sufficienti           █                      3 slot
Filtro modalità                                               0 slot  ◄── esclusione
Filtro durata                                                 0 slot
```

Non conta solo *quale* filtro azzera il risultato: vedere che si era già scesi a tre slot prima che la modalità entrasse in gioco cambia la diagnosi, perché indica un problema di capienza e non di configurazione. Il primo filtro che porta a zero è indicato come punto di esclusione; i successivi non vengono più applicati a una selezione che non rappresenta più la ricerca reale, e sono riportati come non valutati.

Anche qui i filtri non sono riscritti: sono gli stessi che la ricerca della famiglia esegue.

## Cosa funzionerebbe

Per ogni dimensione lasciata in bianco, la diagnostica elenca i valori ammissibili — insegnanti, materie, modalità, durate — e le finestre orarie libere che ne risultano. Le dimensioni indicate nella richiesta non vengono elencate, ma filtrano le altre.

Ogni valore elencato porta con sé l'indicazione se sia **effettivamente prenotabile**, perché le due risposte sono diverse e quella utile è spesso la seconda:

- un valore **assente** dall'elenco non esiste per questa famiglia;
- un valore **presente ma non prenotabile** esiste, e il motivo per cui non funziona è la risposta cercata.

Per le modalità la distinzione va ancora più a fondo: una modalità può risultare non prenotabile perché manca un dato della famiglia — l'indirizzo predefinito per le lezioni a domicilio, la sede per quelle in sede — e non per mancanza di disponibilità. È segnalata come tale, perché la soluzione è completare l'anagrafica, non cercare un altro insegnante.

Quando il percorso rifiuta di calcolare una dimensione — ad esempio perché lo studente non ha una scuola — quella dimensione torna vuota **con l'errore che l'ha impedita**, invece di riportare silenziosamente «nessun valore ammissibile», che si leggerebbe come una risposta quando è una mancata risposta.

## Come viene eseguita

Il percorso di prenotazione è scritto per la sessione della famiglia: risolve studente, figli, insegnanti preferiti e indirizzi a partire dall'utenza collegata. Per rispondere davvero a «cosa vede questa famiglia», la diagnostica **esegue quindi il percorso nei panni del genitore di riferimento** dello studente, invece di riprodurre quella risoluzione per conto proprio — che risponderebbe a una domanda leggermente diversa.

L'assunzione di identità dura il tempo della singola elaborazione, non viene registrata in sessione né in alcun cookie, e l'identità originaria viene ripristinata anche se l'elaborazione fallisce. Quando lo studente non ha un gruppo famiglia, o la famiglia non ha un genitore di riferimento, non c'è nessuno nei cui panni eseguire il percorso: l'analisi delle disponibilità e l'elenco dei valori ammissibili tornano non calcolati, dichiarandone il motivo.

## Limiti

- **Lo slot di una lezione in modifica non viene simulato come libero.** La ricerca reale, quando si sta spostando una lezione già prenotata, simula la liberazione del suo slot con una scrittura temporanea annullata alla fine. Riprodurla qui significherebbe scrivere da uno strumento di sola lettura. L'analisi gira quindi sul calendario così com'è, con quello slot ancora occupato, e **lo dichiara**: gli slot riportati possono essere meno di quelli veri, ma la discrepanza è visibile invece che silenziosa.
- **È un'operazione onerosa.** Ogni dimensione lasciata aperta comporta l'esecuzione di un percorso di ricerca completo. È proporzionato a uno strumento amministrativo usato su richiesta, non a qualcosa da invocare ripetutamente.
- **Risponde sul presente.** Non ricostruisce perché una prenotazione fallì in passato: rifà i controlli sullo stato attuale di anagrafiche, disponibilità e calendario.
