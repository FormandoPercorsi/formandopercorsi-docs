---
title: Percorsi formativi
---

# Percorsi formativi

Un percorso formativo è un insieme di lezioni prenotate in un'unica operazione a condizioni economiche più favorevoli rispetto alle lezioni singole: un monte ore che può essere distribuito liberamente nel calendario oppure organizzato come appuntamento settimanale ricorrente.

I pacchetti disponibili — monte ore, eventuale periodicità, prezzo — sono configurati dall'amministrazione e possono essere recuperati dal client insieme alle altre opzioni di prenotazione. Gli endpoint coinvolti sono documentati nelle sezioni [Lesson](/api/lesson) e [Availability](/api/availability) della API Reference.

## Sequenza di prenotazione

La prenotazione di un percorso segue le stesse fasi di una lezione singola, con due differenze: la selezione riguarda più lezioni contemporaneamente, e nel caso periodico la ricerca deve considerare la ripetizione dello stesso slot per più settimane.

### 1. Definizione della richiesta

Il client raccoglie le opzioni disponibili per la famiglia autenticata: studenti, materie compatibili con la scuola e l'anno di corso dello studente, durate ammesse, modalità di erogazione ed eventuali insegnanti preferiti. Le relative operazioni sono raggruppate sotto [Lesson](/api/lesson), [Family Students](/api/family-students), [Family Student Subjects](/api/family-student-subjects) e [Family Favourite Teachers](/api/family-favourite-teachers).

Dopo la scelta della materia va acquisito il numero di lezioni settimanali previste, informazione necessaria alle fasi successive.

### 2. Selezione delle lezioni sul calendario

La ricerca degli slot disponibili viene richiamata più volte, una per ciascuna lezione da collocare: a ogni chiamata si aggiungono alla richiesta le lezioni già selezionate, così che il sistema tenga conto degli impegni progressivamente assunti.

Per i percorsi periodici la richiesta deve indicare anche per quante settimane consecutive lo slot deve ripetersi: vengono così proposte solo le disponibilità che reggono per l'intera durata del percorso. Il valore si ricava dai parametri del pacchetto:

```
Monte ore del percorso:  12 ore
Durata delle lezioni:    1,5 ore
Lezioni a settimana:     2

settimane consecutive = 12 / (1,5 × 2) = 4
```

La selezione prosegue finché tutte le lezioni non periodiche sono collocate oppure, nel caso periodico, finché è raggiunto il numero di lezioni settimanali previsto: le successive vengono programmate di conseguenza fino a esaurimento del monte ore.

:::note
Richiedere più settimane di calendario in una singola chiamata riduce sensibilmente il numero di richieste necessarie a completare la selezione.
:::

### 3. Scelta dell'insegnante

Individuati gli orari, la ricerca degli insegnanti disponibili viene effettuata indicando **tutte** le lezioni che si intendono prenotare. Per ciascuna lezione richiesta la risposta riporta sia le disponibilità che coincidono esattamente con l'orario desiderato, sia quelle prossime a esso. L'ordine in cui gli insegnanti vengono restituiti è già quello di pertinenza descritto in [Ordinamento dei risultati di ricerca](/guides/ranking-insegnanti).

La struttura della risposta è pensata per essere rielaborata dal client, non presentata così com'è. Si consiglia di mostrare un elenco di insegnanti, segnalando per ciascuno se la disponibilità è esatta o approssimata, e di consentire l'espansione del singolo profilo per consultare l'elenco completo degli orari proposti.

### 4. Conferma e pagamento

La conferma del percorso restituisce il collegamento a una sessione di pagamento, con le stesse modalità previste per la lezione singola. Il seguito del processo — incasso, ripartizione dei compensi e fatturazione — è descritto in [Pagamenti, payout e fatturazione](/guides/pagamenti).

## Differenze rispetto alla lezione singola

| Aspetto | Lezione singola | Percorso formativo |
| --- | --- | --- |
| Selezione | Un solo slot | Più slot, selezionati in sequenza |
| Prezzo | Tariffa ordinaria | Condizioni dedicate al pacchetto |
| Cancellazione | Ammessa entro la finestra prevista | Non ammessa: le lezioni possono essere modificate, non cancellate |

L'asimmetria sulla cancellazione è rilevante per chi realizza un client: una lezione appartenente a un percorso non può essere annullata, ma solo spostata. Le implicazioni sulla copertura assicurativa sono descritte in [Copertura assicurativa](/guides/assicurazione).

:::note
Gli indicatori di prenotabilità agli estremi e il contatore delle settimane consecutive descritti in [Disponibilità](/guides/disponibilita) non risultano attualmente utilizzati dall'applicazione web. È opportuno verificare lo stato di adozione della prenotazione periodica prima di considerarla pienamente operativa.
:::
