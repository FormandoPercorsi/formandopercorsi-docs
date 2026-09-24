---
title: Modifiche e cancellazioni delle lezioni
---

# Modifiche e cancellazioni delle lezioni

Una lezione già prenotata e pagata può essere spostata o annullata, ma le regole cambiano a seconda di **chi lo chiede**, di **quanto tempo manca** all'inizio e di che cosa cambia rispetto alla prenotazione originaria. Questa pagina descrive i percorsi previsti e gli effetti che ciascuno produce su calendario, denaro e documenti. Gli endpoint coinvolti sono raggruppati nella sezione [Lesson](/api/lesson) della API Reference.

## Le tre modifiche

Tutte le modifiche passano da un'unica operazione, sulla quale il sistema distingue tre situazioni:

| Chi la richiede | Che cosa cambia | Effetto immediato |
| --- | --- | --- |
| **Insegnante** | Data, ora o modalità, con sé stesso | Proposta sottoposta alla famiglia: la lezione resta in attesa fino alla risposta |
| **Famiglia** | Data, ora o modalità, con lo stesso insegnante | Applicata subito, se lo slot è disponibile |
| **Famiglia** | Insegnante diverso | Applicata subito: è a tutti gli effetti un nuovo abbinamento |

La distinzione fra le prime due e la terza non è formale. **Una lezione già prenotata resta sempre modificabile con lo stesso insegnante**: i controlli di idoneità su scuola, anno di corso e materia esistono per il percorso di *prenotazione*, e applicarli anche alla modifica significherebbe congelare una lezione già in calendario solo perché lo studente ha cambiato scuola o anno — o perché il [passaggio di classe annuale](/guides/piattaforma) gli ha azzerato la scuola. In quel caso vengono quindi omessi i soli controlli di idoneità scolastica, mentre l'appartenenza dello studente alla famiglia richiedente e la completezza dei profili sono sempre verificate, così come lo stato dell'insegnante e i vincoli di luogo.

Passare a un **insegnante diverso** è invece un nuovo abbinamento e viene sottoposto all'intera verifica di idoneità, esattamente come una prenotazione.

## La proposta dell'insegnante

Quando è l'insegnante a chiedere lo spostamento, la lezione originaria non viene toccata: viene predisposta la lezione nella nuova collocazione e la famiglia riceve una richiesta a cui può **aderire o opporsi**.

```
Insegnante propone
      └─► lezione originaria in attesa di risposta + lezione proposta predisposta
             ├─ la famiglia accetta  → la lezione proposta diventa attiva, l'originaria è chiusa come modificata
             ├─ la famiglia rifiuta  → l'originaria torna attiva, la proposta viene scartata
             └─ nessuna risposta     → alla data di inizio della prima delle due la proposta decade
                                        e l'originaria torna attiva
```

La decadenza è affidata a un'attività pianificata, che interviene quando si raggiunge l'inizio della lezione originaria o di quella proposta, a seconda di quale venga prima. La risposta della famiglia **non è sottoposta ad alcuna nuova verifica di idoneità**: la verifica è avvenuta al momento della proposta.

## Le finestre temporali

Le soglie sono espresse in ore prima dell'inizio della lezione e sono configurabili:

| Azione | Soglia |
| --- | --- |
| Modifica richiesta dalla famiglia | 48 ore |
| Cancellazione richiesta dalla famiglia | 48 ore |
| Modifica o cancellazione richiesta dall'insegnante | Nessuna soglia |
| Risposta della famiglia a una cancellazione dell'insegnante | 48 ore dalla cancellazione, e comunque non oltre la fine della lezione |

La soglia delle 48 ore è la stessa che governa la **finestra assicurativa**: una modifica o una cancellazione che ricada in quell'intervallo su un ordine coperto genera un sinistro e un compenso per l'insegnante, come descritto in [Copertura assicurativa](/guides/assicurazione). Va inoltre ricordata l'asimmetria descritta in [Percorsi formativi](/guides/percorsi-formativi): una lezione appartenente a un percorso può essere spostata ma non cancellata.

## La cancellazione da parte dell'insegnante

È l'unico percorso a **due stadi**, e la ragione è che l'insegnante può disdire senza preavviso mentre la famiglia ha già pagato: il sistema non decide per lei.

```
1. L'insegnante cancella
       └─► la lezione entra in uno stato di attesa, non è ancora chiusa
       └─► il tempo liberato torna disponibile — a meno che l'insegnante dichiari di non
           essere più disponibile in quella fascia — e la famiglia viene avvisata
       └─► l'insegnante può revocare la propria cancellazione finché nessuno è intervenuto

2. La famiglia decide, entro la finestra prevista
       ├─ chiede il rimborso              → rimborso ed eventuale documento di rettifica
       ├─ riprenota con un altro insegnante → la lezione è considerata sostituita
       └─ non risponde                     → rimborso automatico allo scadere della finestra
```

Il **motivo** con cui la lezione viene infine chiusa distingue i tre esiti — rimborsata su richiesta, rimborsata per decorrenza della finestra, oppure sostituita — e non viene sovrascritto dal motivo generico di una cancellazione della famiglia. La distinzione non è documentale: è ciò da cui dipendono sia la copertura assicurativa sia l'indicatore di affidabilità dell'insegnante usato nell'[ordinamento dei risultati di ricerca](/guides/ranking-insegnanti). Una lezione prenotata a titolo gratuito, per effetto di una promozione che ne annulla l'importo, non produce alcun rimborso.

Lo scadere della finestra è gestito da un'attività pianificata che agisce **per conto della famiglia**, con lo stesso percorso di un rimborso richiesto: non esiste una seconda implementazione del rimborso per il caso automatico.

## Cambio di insegnante e ripartizione economica

La famiglia ha pagato una volta e paga lo stesso importo chiunque tenga la lezione: importo dell'ordine, residuo da pagare e credito applicato **non vengono toccati** dallo spostamento. Ciò che cambia è la **ripartizione**, perché il listino applicabile dipende dal regime fiscale dell'insegnante e la scuola che incassa dipende dal territorio.

Lo spostamento determina quindi di nuovo, per il nuovo insegnante, chi incassa e quale scuola ha diritto alla quota — con le stesse regole di una prenotazione, descritte in [Scuole esterne, provider e incasso](/guides/scuole-esterne) — e ricalcola sull'ordine i costi fissi e le quote per ciascuna fascia di ore, riportando poi la ripartizione sulle singole lezioni. La quota dell'insegnante è il residuo fra prezzo e quote altrui: un listino le cui quote eccedessero quanto la famiglia ha pagato interrompe l'operazione con un errore registrato, anziché produrre un compenso negativo.

Documenti e trasferimento di denaro fra conti intervengono solo se cambia **chi incassa**; la ripartizione sull'ordine viene invece ricalcolata in ogni caso, perché due insegnanti con regimi fiscali diversi possono incassare attraverso la stessa scuola. Una ricevuta ancora priva di marca viene **annullata e non rimborsata**, per le ragioni descritte in [Documenti fiscali e ricevute](/guides/documenti-fiscali).

## Effetti comuni

Qualunque sia il percorso, la chiusura o lo spostamento di una lezione comporta:

- il **ripristino della disponibilità** dell'insegnante sul tempo liberato, e l'aggiornamento degli slot prenotabili che ne derivano;
- l'**allineamento del calendario** dell'insegnante e, per le lezioni online, del collegamento associato;
- le **notifiche** ai soggetti coinvolti, in applicazione e per email, come descritto in [Notifiche](/guides/notifiche);
- la registrazione del **motivo** e del soggetto che ha agito, informazione su cui si fondano assicurazione, ordinamento in ricerca e statistiche;
- l'eventuale apertura di un **sinistro**, se l'ordine è coperto e l'evento ricade nella finestra assicurativa.

Le scritture che compongono ciascuna operazione sono racchiuse in un'unica transazione: un fallimento parziale non lascia una lezione spostata a metà. L'allineamento del calendario e l'invio delle notifiche sono invece deliberatamente non bloccanti, perché una lezione correttamente spostata non deve risultare non spostata per un servizio esterno indisponibile.

## Sintesi

- Con lo stesso insegnante una lezione è sempre modificabile; con un insegnante diverso la modifica è un nuovo abbinamento e viene verificata come una prenotazione.
- La modifica proposta dall'insegnante è una richiesta: diventa effettiva solo con l'adesione della famiglia, e decade da sé se non arriva risposta.
- Famiglia e insegnante non hanno le stesse soglie temporali: 48 ore per la famiglia, nessuna per l'insegnante.
- La cancellazione dell'insegnante non chiude la lezione: apre una scelta della famiglia, che in mancanza di risposta si risolve nel rimborso.
- Un cambio di insegnante non modifica quanto la famiglia paga, ma ricalcola come quell'importo viene ripartito.
