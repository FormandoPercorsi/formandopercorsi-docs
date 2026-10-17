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

Ogni rimborso di una lezione — su cancellazione della famiglia o a risoluzione di una cancellazione dell'insegnante — **restituisce alla famiglia il credito** speso per quella lezione e storna l'eventuale credito che l'insegnante vi aveva maturato, nella stessa transazione; si vedano [Crediti e programma referral](/guides/referral-crediti#restituzione-del-credito) e [Crediti degli insegnanti](/guides/crediti-insegnanti#storno).

## La modifica della famiglia con lo stesso insegnante

La modifica che la famiglia chiede con lo stesso insegnante è applicata subito e **non attende alcuna risposta**: la richiesta che la accompagna è quindi registrata come già **accettata**. In precedenza restava in attesa, e l'operazione di rifiuto della famiglia poteva ancora agire su di essa, facendo rivivere la lezione originaria dopo che era già stata sostituita. Una correzione dei dati ha chiuso come accettate le richieste di questo tipo rimaste in attesa; nessuna richiesta davvero in attesa di risposta è stata toccata.

## Cambio di insegnante e ripartizione economica

La famiglia ha pagato una volta e paga lo stesso importo chiunque tenga la lezione: importo dell'ordine, residuo da pagare e credito applicato **non vengono toccati** dallo spostamento. Ciò che cambia è la **ripartizione**, perché il listino applicabile dipende dal regime fiscale dell'insegnante e la scuola che incassa dipende dal territorio.

Lo spostamento determina quindi di nuovo, per il nuovo insegnante, chi incassa e quale scuola ha diritto alla quota — con le stesse regole di una prenotazione, descritte in [Scuole esterne, provider e incasso](/guides/scuole-esterne) — e ricalcola sull'ordine i costi fissi e le quote per ciascuna fascia di ore, riportando poi la ripartizione sulle singole lezioni. La quota dell'insegnante è il residuo fra prezzo e quote altrui: un listino le cui quote eccedessero quanto la famiglia ha pagato interrompe l'operazione con un errore registrato, anziché produrre un compenso negativo.

Il credito eventualmente maturato dal primo insegnante sulla lezione viene stornato all'interno dello spostamento; il nuovo insegnante lo maturerà alla liquidazione, come descritto in [Crediti degli insegnanti](/guides/crediti-insegnanti#storno).

Documenti e trasferimento di denaro fra conti intervengono solo se cambia **chi incassa**; la ripartizione sull'ordine viene invece ricalcolata in ogni caso, perché due insegnanti con regimi fiscali diversi possono incassare attraverso la stessa scuola. Una ricevuta ancora priva di marca viene **annullata e non rimborsata**, per le ragioni descritte in [Documenti fiscali e ricevute](/guides/documenti-fiscali).

## La cancellazione dell'intero ordine da parte dell'amministrazione

Quando un ordine già pagato non verrà erogato — un errore di prenotazione, un caso eccezionale concordato con la famiglia — l'amministrazione può **cancellare l'ordine nel suo insieme** e rimborsarlo. È l'unico percorso che lo consente, e vale anche per i **percorsi formativi**: la cancellazione della singola lezione è rifiutata sia per gli amministratori sia per i percorsi, e ripeterla lezione per lezione rimborserebbe ogni volta l'intero pagamento ed emetterebbe una nota di credito sull'intero ordine per ciascuna lezione.

Le operazioni sono nella sezione [Admin - Lesson orders](/api/admin-lesson-orders) della API Reference, con un'anteprima di sola lettura (`GET /api/admin/lesson-orders/{id}/cancellation`) e l'esecuzione (`POST` sullo stesso percorso). Lo stesso servizio è raggiungibile da console:

```shell
php yii lesson-order/cancel <orderId> [--reason="..."] [--refundInsurance=1] [--releasePromotion=1] [--allowPast=1] [--actorId=<id>] [--dryRun=1] [--interactive=0]
php yii lesson-order/cancellation-status <orderId>
```

Le opzioni sono il **motivo** (testo libero, conservato sulla cancellazione), il **rimborso del premio assicurativo**, il **rilascio della promozione** e il permesso di cancellare un ordine le cui lezioni sono **già iniziate**. Da console il comando mostra l'anteprima e chiede conferma, salvo `--interactive=0`.

**L'anteprima precede sempre l'esecuzione.** Restituisce lezioni coinvolte, importi (quanto ha pagato la carta, premio, rimborso totale, credito della famiglia da restituire), avvertenze e **impedimenti**, ciascuno con un codice stabile. Esiti possibili: `eligible`, `blocked`, `in_progress` (una esecuzione precedente si è fermata a metà), `completed` e `already_completed`. Un ordine non cancellabile risponde `400` con gli impedimenti. Sono tali:

| Codice | Causa |
| --- | --- |
| `lesson_settled`, `settlement_link_exists` | Una lezione è già stata liquidata o compresa in una liquidazione |
| `lesson_awaiting_payment` | Una lezione è ancora in attesa di pagamento |
| `lesson_already_started` | Una lezione è iniziata o passata (superabile con `allow_past`) |
| `previous_refund_exists`, `stripe_already_refunded`, `stripe_refund_exceeds_refundable` | Esiste già un rimborso, registrato qui o su Stripe |
| `stripe_unavailable`, `missing_stripe_session`, `missing_provider_stripe_account` | Il pagamento non è verificabile o rimborsabile |
| `document_provider_mismatch` | Il documento della famiglia è stato emesso da un fornitore diverso da quello attuale (cambio di fornitore): va stornato a mano |
| `no_cancellable_lesson`, `unsupported_order_type` | Nulla da cancellare, o tipo di ordine non gestito |

Le avvertenze non fermano l'operazione: il credito *referral* scattato dall'ordine **non viene stornato**, un sinistro assicurativo già aperto resta valido, il premio non viene rimborsato se non richiesto, e l'ordine comprende lezioni passate.

**L'esecuzione non è transazionale, è riprendibile.** Fatture elettroniche e rimborsi sulla carta non si annullano: per questo esiste un solo record di cancellazione per ordine, che è anche il registro dell'avanzamento. I passi, nell'ordine, sono:

1. in **un'unica transazione**, sulle righe bloccate: le lezioni passano a `deleted` con motivo `admin_cancelled` (una lezione già cancellata dall'insegnante e in attesa di scelta della famiglia passa invece a `teacher_cancelled_refunded`), si restituiscono la disponibilità, il credito della famiglia e le maturazioni dell'insegnante, si libera la promozione se richiesto e si fa scadere l'assicurazione;
2. la **nota di credito** della famiglia; una ricevuta ancora in attesa di marca da bollo è invece **annullata**, perché non è mai stata un documento valido (si veda [Documenti fiscali e ricevute](/guides/documenti-fiscali));
3. l'eventuale nota di credito del premio assicurativo;
4. il **rimborso sulla carta**, per l'importo registrato al passo 1: quanto pagato per le lezioni, più il premio solo se richiesto;
5. la chiusura: registrazione del rimborso e dell'ordine come `cancelled`, quindi l'invio delle email a famiglia (con la nota di credito allegata), insegnante e scuola di competenza.

Ogni esito irreversibile è registrato **subito dopo** averlo ottenuto, e una nuova esecuzione salta ciò che è già fatto: se un passo fallisce, ripetere la richiesta riprende da lì (`500`, con l'errore registrato). Una seconda richiesta con **opzioni diverse** da quelle della cancellazione in corso è rifiutata con `409`, come lo è quella che trova l'ordine in uso da un'altra esecuzione; una cancellazione già conclusa risponde `already_completed` senza cambiare nulla. Prima del documento e del rimborso viene riverificato che le lezioni non siano state liquidate nel frattempo.

Tre scelte da conoscere. L'ordine diventa `cancelled` e **mai** `deleted`, che continua a significare «mai pagato». Il premio assicurativo è **trattenuto** per impostazione predefinita, e la promozione resta **consumata** salvo richiesta. Il rimborso è sempre un importo esplicito e non può essere completato da un rimborso estraneo già presente sullo stesso pagamento.

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
