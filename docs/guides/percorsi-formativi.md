---
title: Percorsi formativi
---

# Percorsi formativi

Un percorso formativo permette di prenotare più lezioni contemporaneamente a un prezzo scontato rispetto alle singole lezioni — un pacchetto di ore, eventualmente distribuite come lezioni settimanali ricorrenti.

I pacchetti disponibili (numero di ore, se prevedono lezioni periodiche, prezzo) sono interamente configurati lato admin e recuperabili con:

```
GET /api/lesson/available-trainings
```

## Il flusso di prenotazione

### 1. Scelta del figlio, materia, durata, location, insegnante preferito

Stessi endpoint della prenotazione di una singola lezione:

```
GET /api/lesson/available-sons
GET /api/lesson/available-subjects
GET /api/lesson/available-lengths
GET /api/lesson/available-locations
GET /api/family/teacher          # insegnanti preferiti
```

Selezionata una materia, va chiesto quante lezioni a settimana si intendono svolgere (default 1) — questa informazione serve per i passaggi successivi.

### 2. Scelta delle lezioni sul calendario

```
POST /api/availability/calendar
```

Al primo invio bastano i parametri già raccolti: `student_id`, `teacher_id`, `subject_id`, `searched_lesson_length`, `location`. Se il percorso scelto prevede lezioni periodiche, va aggiunto anche `available_n_consecutive_weeks`: solo le disponibilità che reggono anche per quel numero di settimane a seguire vengono mostrate. Il calcolo è a carico del frontend:

```
Percorso: 12 ore (periodiche)
Durata lezioni: 1.5 ore
Lezioni a settimana: 2
available_n_consecutive_weeks = 12 / (1.5 × 2) = 4
```

`n_weeks_visualized` impostato oltre 1 riduce il numero di chiamate al backend.

Dopo la selezione della prima lezione, si richiama lo stesso endpoint aggiungendo la lezione scelta a `selected_lessons` (gli altri parametri restano invariati), finché tutte le lezioni non periodiche sono programmate, oppure — nel caso periodico — finché il numero di lezioni "a settimana" impostato è raggiunto (le restanti vengono schedulate di conseguenza fino a esaurimento ore).

### 3. Scelta dell'insegnante disponibile

```
POST /api/availability/search
```

Parametri: `student_id`, `teacher_id`, `subject_id`, `location`, `availability_kind` (in base al tipo di percorso), `required_lessons` (**tutte** le lezioni che si intendono prenotare). La risposta è un array in cui, per ogni lezione richiesta, sono mostrate le disponibilità esattamente nell'orario richiesto e quelle negli orari vicini — vedi [Ranking insegnanti](/guides/ranking-insegnanti) per come vengono ordinati i risultati.

Una UI che mostri questo livello di dettaglio grezzo non è ragionevole: conviene una lista di insegnanti disponibili, segnalando quali hanno disponibilità esatta e quali solo vicina, con la possibilità di espandere ciascuno per vedere l'elenco completo di orari proposti.

### 4. Conferma e pagamento

```
POST /api/lesson/training
```

Come per la lezione singola, restituisce un link a una sessione di checkout Stripe — vedi [Pagamenti & Fatturazione](/guides/pagamenti) per cosa succede da quel momento in poi.

:::note
`available_n_consecutive_weeks`, `start_bookable` ed `end_bookable` (vedi [Disponibilità](/guides/disponibilita)) non risultano attualmente consumati dal frontend web. Verificare lo stato di avanzamento di "Training Periodici" prima di assumere che il flusso periodico sia già pienamente operativo in produzione.
:::
