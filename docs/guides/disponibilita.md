---
title: Disponibilità
---

# Disponibilità

La disponibilità di un insegnante non è un dato unico, ma il risultato di tre livelli successivi: ciò che l'insegnante dichiara, ciò che resta realmente libero una volta considerati impegni e spostamenti, e infine gli slot che una famiglia può effettivamente selezionare e acquistare.

| Livello | Significato |
| --- | --- |
| **Availability** | Fasce orarie che l'insegnante dichiara come disponibili. |
| **Effective Availability** | Tempo realmente libero, al netto delle lezioni già prenotate e dei tempi di spostamento. |
| **Consecutive Availability** | Slot concreti e prenotabili, derivati per ciascuna combinazione di durata e modalità ammesse. |

Solo il primo livello è inserito dall'insegnante; gli altri due sono derivati dal sistema e si aggiornano a ogni variazione rilevante. Gli endpoint di gestione sono documentati nelle sezioni [Availability](/api/availability) e [Availability Group](/api/availability-group) della API Reference.

Tutti gli orari sono espressi nel fuso `Europe/Rome`, nel formato `Y-m-d H:i:s`.

## Disponibilità dichiarata

Una disponibilità è definita dall'insegnante che la inserisce, da un intervallo di inizio e fine allineato a multipli di 15 minuti, e dalle modalità di erogazione abilitate su quella fascia, ciascuna con il proprio preavviso minimo di prenotazione:

```json
{
  "online": { "enabled": true, "warning_time": 24 },
  "home": { "enabled": true, "warning_time": 24 },
  "headquarter": { "enabled": true, "warning_time": 48 },
  "home_from_headquarter": { "enabled": true, "warning_time": 48 }
}
```

Le quattro modalità corrispondono a lezione online, a domicilio dell'insegnante, presso una sede, e a domicilio dello studente con partenza dalla sede. Una disponibilità può inoltre appartenere a un gruppo, quando è stata inserita come parte di uno schema ricorrente.

La sovrapposizione fra disponibilità dichiarate è ammessa dal sistema, ma è sconsigliata perché rende meno prevedibile il risultato della derivazione.

## Effetto degli spostamenti

Il tempo di spostamento dichiarato dall'insegnante determina quanto una lezione occupa oltre la propria durata. La regola distingue due casi, secondo una logica di disponibilità fisica:

- **Lezione a domicilio dell'insegnante.** Occupa *tutte* le modalità per l'intera durata più il tempo di spostamento prima e dopo: l'insegnante sta ricevendo a casa propria e non può fare altro.
- **Lezione altrove** (a domicilio dello studente, in sede oppure online). Occupa le modalità che richiedono la presenza a casa propria per la durata più il tempo di spostamento, ma occupa le modalità online e in sede per la sola durata: al termine dello spostamento l'insegnante può insegnare online o essere in sede immediatamente prima o dopo.

A titolo di esempio, per una lezione dalle 14:00 alle 15:00 con 30 minuti di spostamento: se è a domicilio dell'insegnante, l'intera fascia 13:30–15:30 risulta occupata per qualunque modalità; se è a domicilio dello studente, la fascia 13:30–15:30 risulta occupata per le modalità domiciliari, mentre online e in sede risultano occupate solo dalle 14:00 alle 15:00.

## Tempo effettivamente libero

Una Effective Availability è un blocco continuo di tempo libero: la disponibilità dichiarata, meno le finestre occupate secondo la regola precedente. Ogni frammento risultante costituisce un blocco a sé, con due indicatori che segnalano se è prenotabile esattamente ai propri estremi:

- l'estremo iniziale non è prenotabile quando una lezione termina esattamente in quell'istante;
- l'estremo finale non è prenotabile quando una lezione inizia esattamente in quell'istante.

Una disponibilità dalle 10:00 alle 18:00, con due lezioni a domicilio dalle 11:00 alle 12:00 e dalle 13:00 alle 14:00 e 15 minuti di spostamento, produce tre blocchi: 10:00–10:45, 12:15–12:45 e 14:15–18:00.

## Slot prenotabili

Una Consecutive Availability è lo slot che la famiglia seleziona in fase di prenotazione: ha durata fissa, tipicamente una, una e mezza o due ore. Per ogni blocco di tempo libero il sistema genera uno slot per ciascuna combinazione di durata e modalità ammesse, a intervalli di 15 minuti, purché lo slot ricada interamente nel blocco.

### Lezioni ricorrenti

Ogni slot riporta per quante settimane consecutive, a partire da quella di riferimento, lo stesso slot si ripete identico. Se un insegnante è libero ogni lunedì dalle 14:00 alle 15:00 per otto settimane, il sistema genera otto slot e il contatore decresce da otto a uno.

Questo dato consente di prenotare in un'unica operazione una lezione ricorrente su più settimane: il sistema individua lo slot della prima settimana desiderata e verifica che il contatore copra il numero di settimane richiesto. È il meccanismo su cui si basano i [percorsi formativi](/guides/percorsi-formativi) periodici.

## Variazione del tempo di spostamento

Quando un insegnante modifica il proprio tempo di spostamento, il sistema ricalcola tempo libero e slot attorno a ogni lezione futura. Il comportamento dipende dalla direzione della variazione:

- **Riduzione.** La finestra occupata si restringe e si libera tempo prima e dopo ogni lezione. Il sistema ripristina i blocchi precedentemente rimossi, verificando che non siano nel frattempo entrati in conflitto con altri impegni.
- **Aumento.** La finestra occupata si estende e alcuni blocchi ricadono, in tutto o in parte, dentro la nuova finestra. Ogni blocco coinvolto viene eliminato se interamente compreso, suddiviso in due se attraversato, oppure accorciato se la sovrapposizione riguarda solo un estremo.

Al termine, gli slot prenotabili vengono rigenerati per i blocchi modificati. L'intera operazione è racchiusa in un'unica transazione: se un passaggio fallisce, nessuna modifica viene applicata.

## Quando un insegnante non compare

La ricerca della famiglia parte dagli slot prenotabili descritti sopra e applica una propria catena di filtri, quindi un insegnante con disponibilità dichiarate può ugualmente non comparire fra i risultati. Per ricostruire quale filtro lo esclude, e più in generale perché una certa famiglia non riesce a prenotare un certo insegnante, l'amministrazione dispone della [Diagnostica delle prenotazioni](/guides/diagnostica-prenotazioni).

:::note
Gli indicatori di prenotabilità agli estremi e il contatore delle settimane consecutive sono predisposti per la prenotazione dei percorsi periodici, ma l'applicazione web attualmente in uso non li utilizza. È opportuno verificarne lo stato di adozione prima di assumerli operativi, e altrettanto prima di considerarli codice inutilizzato.
:::
