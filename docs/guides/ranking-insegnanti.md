---
title: Ordinamento dei risultati di ricerca
---

# Ordinamento dei risultati di ricerca

Quando una famiglia cerca un insegnante per una o più lezioni, il sistema restituisce i profili disponibili già ordinati per pertinenza. L'ordinamento è calcolato prima della paginazione, così che la prima pagina contenga effettivamente le proposte migliori e la navigazione fra pagine resti coerente. L'endpoint di ricerca è documentato nella sezione [Availability](/api/availability) della API Reference.

L'ordinamento combina due gruppi di segnali:

- un **punteggio precalcolato**, aggiornato ogni notte per ciascun insegnante, che sintetizza disponibilità offerta, tempestività di inserimento, affidabilità, carico di lavoro, adeguatezza al livello richiesto ed esposizione recente;
- due **componenti calcolate al momento**, che dipendono dalla richiesta specifica e non possono essere precalcolate: l'aderenza agli orari richiesti e la continuità didattica con lo studente.

La separazione è deliberata: consente di mantenere un ordinamento articolato senza penalizzare i tempi di risposta della ricerca.

## Composizione del punteggio

```
ordinamento =  1,0 × aderenza oraria        (calcolata al momento)
             + 2,5 × continuità didattica   (calcolata al momento)
             + punteggio precalcolato
```

```
punteggio precalcolato =  0,90 × ore utili disponibili
                        + 0,15 × ore non utili disponibili
                        + 0,50 × tempestività
                        + 0,80 × affidabilità
                        − 0,30 × carico
                        + 0,40 × sostegno ai nuovi insegnanti
                        − 0,60 × esposizione recente
                        − 1,20 × sovraqualifica
```

Tutte le componenti sono normalizzate nell'intervallo `[0, 1]` prima di essere pesate, in modo che i pesi siano confrontabili fra loro.

## Componenti calcolate al momento

| Componente | Criterio | Peso |
| --- | --- | --- |
| **Aderenza oraria** | Per ogni lezione richiesta si misura la distanza in minuti dallo slot disponibile più vicino, entro una finestra di ±45 minuti. Il valore è massimo quando ogni lezione coincide esattamente con l'orario richiesto. | 1,0 |
| **Continuità didattica** | Valore pieno se l'insegnante ha già svolto lezioni con quello studente, dimezzato se le ha svolte con un fratello, nullo altrimenti. | 2,5 |

Il peso attribuito alla continuità è il più alto dell'intera formula, ed è una scelta deliberata: un insegnante che la famiglia conosce già deve prevalere su qualunque combinazione di segnali generali, perché è l'indicazione più attendibile che la proposta sarà gradita.

## Componenti precalcolate

Tutte valutate sull'orizzonte dei 90 giorni successivi, lo stesso considerato dalla ricerca.

| Componente | Criterio | Peso |
| --- | --- | --- |
| Ore utili disponibili | Minuti liberi nella fascia pomeridiana 14:00–19:00, con decadimento dal giorno corrente verso la fine dell'orizzonte, fino a una soglia di saturazione. | +0,90 |
| Ore non utili disponibili | Minuti liberi al di fuori di quella fascia, con soglia di saturazione più alta. | +0,15 |
| Tempestività | Anticipo con cui le disponibilità vengono inserite rispetto alla data a cui si riferiscono, mediato sui minuti offerti. | +0,50 |
| Affidabilità | Tasso di cancellazione dell'ultimo anno, attenuato per non penalizzare chi ha svolto poche lezioni. | +0,80 |
| Carico | Quota di tempo già prenotato rispetto al tempo complessivamente offerto. | −0,30 |
| Sostegno ai nuovi insegnanti | Vantaggio temporaneo per i profili recenti con poche lezioni all'attivo, che si esaurisce con l'esperienza acquisita. | +0,40 |
| Esposizione recente | Quante volte il profilo è già stato mostrato nei risultati di ricerca. | −0,60 |
| Sovraqualifica | Distanza fra il livello scolastico abitualmente coperto dall'insegnante e quello richiesto. | −1,20 |

Due criteri meritano una spiegazione, perché il loro comportamento non è immediato:

**Le ore disponibili sono conteggiate in valore assoluto, non in percentuale.** L'obiettivo è premiare chi mette a disposizione più tempo utile, non chi presenta una percentuale elevata su poche ore offerte: un insegnante che rende disponibili dieci pomeriggi deve prevalere su chi ne rende disponibile uno solo. La soglia di saturazione impedisce che quantità molto elevate monopolizzino i risultati.

**Le ore più lontane nel tempo pesano meno.** Senza decadimento, un insegnante con molta disponibilità fra tre mesi e nessuna nell'immediato scavalcherebbe chi è disponibile subito, in contrasto con l'esigenza di chi sta prenotando.

### Sovraqualifica e scarsità

Il criterio persegue due obiettivi insieme: valorizzare i profili più preparati sulle richieste impegnative ed evitare di impiegarli su richieste elementari quando sono necessari altrove. La difficoltà di una richiesta è espressa come livello ordinale ricavato da grado scolastico e anno di corso, dalla scuola primaria all'università; la penalizzazione cresce con la distanza fra il livello abitualmente coperto dall'insegnante e quello richiesto.

La penalizzazione è però attenuata dalla scarsità: quando per quella combinazione di materia e livello esiste un solo insegnante idoneo, si annulla del tutto. Un profilo qualificato non deve sparire dai risultati proprio quando è l'unica opzione disponibile.

## Rotazione dell'esposizione

Ogni pagina di risultati incrementa un contatore di esposizione per i profili mostrati. Il contatore viene però attenuato **solo durante l'elaborazione notturna**, mai durante la navigazione.

La scelta è deliberata: se la penalizzazione da esposizione variasse in tempo reale, l'ordinamento cambierebbe fra una pagina e la successiva, con il risultato di mostrare due volte alcuni insegnanti e di ometterne altri. Congelandola nell'arco della giornata si ottiene una rotazione effettiva — chi è stato molto esposto oggi scende domani — mantenendo un ordinamento stabile durante la consultazione.

## Comportamento in caso di dati mancanti

Il punteggio precalcolato è applicato come contributo facoltativo: se per un insegnante non è ancora disponibile, o se l'elaborazione notturna non è andata a buon fine, viene impiegato un valore neutro. Una tabella dei punteggi vuota o non aggiornata **degrada la qualità dell'ordinamento, ma non fa sparire alcun insegnante dai risultati**. A parità di punteggio l'ordinamento ricade su un criterio deterministico, così che la paginazione resti coerente.

## Configurazione ed esercizio

Pesi, soglie di saturazione, orizzonte temporale, fascia oraria considerata utile e parametri di decadimento sono interamente configurabili. È previsto un interruttore di disattivazione che riporta l'ordinamento al comportamento precedente senza necessità di annullare un rilascio.

La modifica di un peso richiede sia il rilascio della nuova configurazione sia una rielaborazione completa dei punteggi, poiché i pesi delle componenti precalcolate sono già incorporati nel punteggio memorizzato.

```shell
php yii teacher-score/recompute [--dryRun=1]   # rielabora tutti gli insegnanti
php yii teacher-score/recompute-teacher <id>   # rielabora un singolo insegnante
```

L'elaborazione notturna è pianificata dopo la derivazione delle disponibilità, ed è progettata per non lasciare mai la base dati in uno stato intermedio: i nuovi punteggi sostituiscono i precedenti e solo al termine vengono rimosse le righe non più aggiornate, così che le ricerche in corso non vedano mai dati assenti. L'esecuzione in modalità di prova calcola i nuovi punteggi senza scrivere nulla e riporta le variazioni più rilevanti.

:::note
L'applicazione web non mostra alcun indicatore di ordinamento: gli insegnanti sono presentati nella sequenza restituita dall'API, che è già quella descritta in questa pagina. L'ordinamento è quindi deliberatamente non visibile all'utente finale.
:::
