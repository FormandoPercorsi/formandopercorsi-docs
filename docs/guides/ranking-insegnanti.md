---
title: Ranking insegnanti
---

# Come vengono ordinati gli insegnanti in ricerca

`POST /api/availability/search` restituisce alle famiglie gli insegnanti disponibili per le lezioni richieste, già ordinati. L'ordinamento è calcolato **in SQL prima della paginazione**, combinando due gruppi di segnali:

- uno **score precalcolato offline**, ricalcolato ogni notte e conservato in `teacher_score`: disponibilità utile, tempestività, affidabilità, carico, sovraqualifica, esposizione, boost per i nuovi insegnanti;
- due componenti **live**, che dipendono dalla richiesta specifica e non possono essere precalcolate: l'aderenza agli orari richiesti e la continuità didattica con lo studente.

La separazione è deliberata: garantisce una risposta veloce dell'endpoint anche con un ranking sofisticato.

## La formula

```
RANK =  1.0 × fit                     (live)
      + 2.5 × continuità               (live)
      + score precalcolato             (teacher_score.score)
```

```
score =  0.9 × ore_utili
       + 0.15 × ore_non_utili
       + 0.5 × tempestività
       + 0.8 × affidabilità
       − 0.3 × carico
       + 0.4 × boost_nuovo
       − 0.6 × esposizione
       − 1.2 × sovraqualifica
```

Tutte le componenti sono normalizzate in `[0, 1]` prima di essere pesate, così i pesi restano confrontabili tra loro.

## Le componenti live

| Componente | Come si calcola | Peso |
| --- | --- | --- |
| **Fit orario** | Per ogni lezione richiesta, la distanza in minuti dallo slot più vicino dell'insegnante, dentro una finestra di ±45 minuti: `fit = 1 − Σ distanze / (45 × n_lezioni)`. Vale 1 se ogni lezione combacia al minuto. | 1.0 |
| **Continuità** | `1.0` se l'insegnante ha già fatto lezione con quello studente, `0.5` se con un fratello, `0` altrimenti. | 2.5 |

Il peso 2.5 sulla continuità è scelto perché deve **dominare**: un insegnante che la famiglia conosce già batte qualunque combinazione di segnali offline — è il segnale più forte che la proposta sia gradita.

## Le componenti precalcolate

Tutte valutate sulla finestra `[oggi, oggi + 89 giorni]`, la stessa della ricerca.

| Componente | Fonte | Definizione | Peso |
| --- | --- | --- | --- |
| Ore utili libere | `effective_availability` | Minuti liberi in fascia 14:00–19:00 (giorno contato solo se l'affaccio è ≥ 60 min), con decadimento lineare da 1.0 (oggi) a 0.3 (giorno 89), saturato a 3000 minuti decaduti. | +0.9 |
| Ore non utili libere | `effective_availability` | Il complemento, fuori fascia. Satura a 6000 minuti. | +0.15 |
| Tempestività | `availability_group.processed_at` | Giorni di anticipo tra inserimento e inizio della disponibilità, media pesata sui minuti. Satura a 45 giorni. | +0.5 |
| Affidabilità | `lesson.deletion_reason`, ultimi 365 giorni | `1 − tasso_cancellazione / 0.25`, attenuato da un prior bayesiano di 10 pseudo-lezioni. | +0.8 |
| Carico | lezioni future non cancellate | `minuti_prenotati / (prenotati + liberi)`. | −0.3 |
| Boost nuovo | `user.created_at` + lezioni erogate | `1.0` sotto le 5 lezioni con account creato da meno di 90 giorni, decresce a 0 alle 15 lezioni. | +0.4 |
| Esposizione | `teacher_search_exposure` | Quanto è stato mostrato di recente, saturato a 20. | −0.6 |
| Sovraqualifica | `teacher_subject` + `school` | Vedi sotto. | −1.2 |

**Perché le ore utili sono assolute e non percentuali**: si premia chi inserisce più disponibilità utili, non chi ha una percentuale alta su poche ore — un insegnante che mette dieci pomeriggi batte chi ne mette uno solo, anche se "tutti utili" per entrambi. La saturazione impedisce che chi ne inserisce quantità enormi monopolizzi i risultati.

**Perché il decadimento sull'orizzonte**: senza, un insegnante con molte ore fra tre mesi e niente la settimana prossima scavalcherebbe chi è disponibile subito — l'opposto di ciò che serve a chi sta prenotando ora. Le colonne `useful_minutes`/`other_minutes` salvano il valore grezzo non decaduto per diagnostica; il decadimento entra solo nello score.

### Sovraqualifica attenuata dalla scarsità

L'obiettivo è duplice: premiare i profili più preparati sulle richieste difficili, ma anche non "sprecarli" su richieste semplici quando servono altrove. La difficoltà è un ordinale ricavato da livello scuola + anno (elementari 1–5, medie 6–8, superiori 9–13, università 14). `gap = max(0, difficoltà_tipica_insegnante − difficoltà_richiesta)`, dove la difficoltà tipica è la mediana sulle celle dichiarate per quella materia, pesata sulle lezioni svolte quando ce ne sono almeno 3.

Il malus vale `min(1, gap/5) × abundance`, dove `abundance = clamp((n_insegnanti_nella_cella − 1) / 7, 0, 1)`. Con un solo insegnante idoneo per quella cella il malus si annulla del tutto: un profilo alto non deve sparire quando è l'unica opzione disponibile.

## Rotazione: come si evita di proporre sempre gli stessi

Ogni pagina di risultati incrementa `impressions_since` per gli insegnanti mostrati. Il decadimento avviene **solo nel job notturno**, non in tempo reale:

```
exposure_snapshot = exposure_snapshot × 0.7 + impressions_since   (emivita ≈ 2 giorni)
impressions_since = 0
```

Congelare il malus dentro la giornata è deliberato: se si muovesse in tempo reale, navigare pagina 1 → 2 → 3 riordinerebbe l'`ORDER BY` tra una richiesta e l'altra, producendo insegnanti duplicati o saltati. Così si ottiene rotazione reale (chi è stato molto esposto oggi scende domani) con ordinamento perfettamente stabile durante la navigazione.

## Dove vive il codice

| File | Ruolo |
| --- | --- |
| `services/availability/ranking/TeacherScoreComputationService.php` | Calcolo offline dello score |
| `services/availability/ranking/TeacherRankingOrderExpression.php` | Aggregati di distanza, predicato a finestra, join e `ORDER BY` |
| `services/availability/projectors/FamilySolutionsProjector.php` | Paginazione ordinata, scrittura dell'esposizione |
| `commands/TeacherScoreController.php` | `teacher-score/recompute`, `teacher-score/recompute-teacher` |

`teacher_score` ha una riga per cella `(teacher_id, subject_id, school_id, school_class)` — la stessa granularità di `teacher_subject`. `subject_id = 0`, `school_id = 0`, `school_class = ''` sono sentinelle per "qualsiasi", usate come fallback quando la ricerca non specifica la materia.

Il job notturno gira ogni notte alle 05:30 UTC (dopo la derivazione delle disponibilità delle 05:00), è set-based (una decina di query aggregate), e scrive con pattern **upsert-then-reap** (mai truncate-then-insert): `INSERT ... ON DUPLICATE KEY UPDATE` seguito da `DELETE ... WHERE computed_at < :run_started_at`, così le ricerche in corso non vedono mai la tabella vuota.

```shell
php yii teacher-score/recompute [--dryRun=1]        # tutti gli insegnanti
php yii teacher-score/recompute-teacher <id>        # uno solo (cold start / ops)
```

`--dryRun=1` calcola tutto senza scrivere nulla (né azzerare `impressions_since`), e stampa le prime 20 variazioni di punteggio.

La query a runtime usa sempre `LEFT JOIN` verso `teacher_score` (mai `INNER JOIN`) con `COALESCE(score, 0.6)`: una tabella vuota o stantia degrada l'ordine, non fa sparire insegnanti. Il tie-break finale `teacher_id ASC` rende la paginazione deterministica.

## Configurazione e kill switch

Tutto in `config/params.php`, chiave `teacherRanking`: pesi, saturazioni, finestra, decadimenti, fascia oraria utile, soglie del cold start. `'enabled' => false` è il kill switch: riporta l'ordinamento al comportamento precedente (`ORDER BY availability.teacher_id ASC`) senza bisogno di un rollback del deploy. Cambiare un peso richiede un deploy **e** una riesecuzione di `teacher-score/recompute`, perché i pesi offline sono già ripiegati dentro `score`.

:::note
Il frontend web attuale non mostra alcun indicatore visivo di ranking (nessuna stella, nessun punteggio): gli insegnanti vengono semplicemente renderizzati nell'ordine in cui l'API li restituisce, che è già l'ordine calcolato qui. Il ranking è quindi "invisibile" per design.
:::
