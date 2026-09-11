---
title: Disponibilità
---

# Disponibilità

La disponibilità di un insegnante passa per tre livelli, ciascuno derivato dal precedente:

1. **Availability** — le fasce orarie che l'insegnante dichiara come genericamente disponibili.
2. **Effective Availability (EA)** — il tempo libero che resta togliendo le lezioni già prenotate e il tempo di viaggio.
3. **Consecutive Availability (CA)** — gli slot concreti e prenotabili (15 minuti o più) dentro ogni EA.

Tutti gli orari sono in timezone `Europe/Rome`, formato `Y-m-d H:i:s`.

## Availability

Tabella `availability`: `teacher_id`, `start_date_time`/`end_date_time` (intervalli di 15 minuti, `start < end`), `location_settings` (JSON con località abilitate e tempo di preavviso), e opzionalmente `availability_group_id` se fa parte di un pattern ricorrente.

```json
{
  "online": { "enabled": true, "warning_time": 24 },
  "home": { "enabled": true, "warning_time": 24 },
  "headquarter": { "enabled": true, "warning_time": 48 },
  "home_from_headquarter": { "enabled": true, "warning_time": 48 }
}
```

Le sovrapposizioni tra availability sono permesse ma sconsigliate.

## Tempo di viaggio e come blocca le fasce

Il tempo di viaggio (minuti necessari per raggiungere/lasciare una lezione fuori casa) si comporta diversamente a seconda della location:

- **Lezioni a domicilio dell'insegnante (`home`)**: bloccano *tutte* le location per l'intera durata della lezione + il tempo di viaggio prima e dopo — l'insegnante è impegnato a insegnare, non può spostarsi.
- **Lezioni non a domicilio (a casa dello studente, in sede, online)**: bloccano `home` e `home_from_headquarter` per durata + tempo di viaggio (l'insegnante deve fisicamente spostarsi), ma bloccano `online`/`headquarter` solo per la durata della lezione, senza buffer (può insegnare online o stare in sede subito prima/dopo essersi spostato).

Esempio: lezione 14:00–15:00, tempo di viaggio 30 minuti. Se è a domicilio, blocca tutto da 13:30 a 15:30. Se è a casa dello studente, blocca `home`/`home_from_headquarter` da 13:30 a 15:30, ma `online`/`headquarter` solo da 14:00 a 15:00.

## Effective Availability

Un'EA è il blocco continuo di tempo realmente libero: availability dichiarata, meno le finestre bloccate da ogni lezione secondo la regola sopra. Ogni frammento risultante diventa un'EA separata, con due flag booleani che indicano se è prenotabile esattamente al bordo:

- `start_bookable = false` significa che una lezione finisce esattamente all'inizio dell'EA (serve un margine prima di poter iniziare a prenotare lì).
- `end_bookable = false` significa il simmetrico: una lezione inizia esattamente alla fine dell'EA.

Esempio: disponibilità 10:00–18:00 con due lezioni a domicilio (11:00–12:00 e 13:00–14:00, viaggio 15 min) produce tre EA: `10:00–10:45` (start_bookable, non end_bookable), `12:15–12:45` (né l'uno né l'altro), `14:15–18:00` (end_bookable, non start_bookable).

**Codice**: `AvailabilityCreationHelper::createEffectiveAvailabilitiesForAvailability($availability)`.

## Consecutive Availability

Una CA è uno slot specifico e acquistabile, di durata fissa (tipicamente 1, 1,5 o 2 ore). Per ogni EA vengono create CA per ogni combinazione di durata abilitata × location abilitata, a intervalli di 15 minuti, solo se lo slot rientra nei limiti dell'EA.

### `n_consecutive_weeks`: il meccanismo delle lezioni ricorrenti

Ogni CA porta un contatore `n_consecutive_weeks`: da quella settimana in poi, quante settimane consecutive esiste ancora lo stesso slot identico. Se un insegnante ha 14:00–15:00 libero ogni lunedì per 8 settimane, il sistema crea 8 CA (una per settimana), con il contatore che scende da 8 a 1. Questo permette a uno studente di prenotare un'unica lezione ricorrente per più settimane in una sola transazione: il sistema trova la CA della prima settimana desiderata e verifica che `n_consecutive_weeks` copra quante settimane servono.

**Codice**: `ConsecutiveAvailabilitiesHelper::createConsecutiveAvailabilities()`.

## Cosa succede quando un insegnante cambia il proprio tempo di viaggio

`PATCH /teacher {"travel_time_min": 30}` innesca `TravelTimeAvailabilityHelper::updateAvailabilitiesOnTravelTimeChange($teacher, $oldTT, $newTT)`, che deve aggiornare EA e CA intorno a ogni lezione futura. La logica dipende dalla direzione del cambiamento:

- **Diminuzione** (es. 30→15 min): la finestra bloccata si restringe, appare nuovo tempo libero prima e/o dopo la lezione. Si cercano le EA precedentemente rimosse dalla vecchia finestra e si ripristinano se non confliggono con lo stato attuale (`handleHomeLessonFreedTimeSlots()`).
- **Aumento** (es. 15→30 min): la finestra bloccata si espande, alcune EA esistenti possono ricadere (parzialmente o del tutto) dentro la nuova finestra. Ogni EA coinvolta viene gestita con una logica a 4 casi: **completamente dentro** → cancellata; **a cavallo** → divisa in due; **overlap parziale a inizio/fine** → accorciata (`handleHomeLessonOverlappingEffectiveAvailabilitiesOnIncrease()`).
- **Nessun cambiamento** → nessuna elaborazione.

Dopo aver sistemato tutte le EA, le CA vengono cancellate in blocco per le EA rimosse e ricreate per quelle nuove/modificate. L'intero processo gira dentro una singola transazione database: se un passaggio fallisce, tutto viene annullato.

## Da tenere presente

`available_n_consecutive_weeks`, `start_bookable` ed `end_bookable` sono pensati per supportare la prenotazione di percorsi periodici (vedi [Percorsi formativi](/guides/percorsi-formativi)) — ma il frontend web attuale non li legge/usa ancora da nessuna parte. Prima di assumere che siano già sfruttati in produzione (o di rimuoverli pensando siano dead code), va verificato lo stato di avanzamento della feature "Training Periodici".
