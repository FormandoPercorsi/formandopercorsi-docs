---
title: Attività pianificate e comandi console
---

# Attività pianificate e comandi console

Una parte rilevante del comportamento della piattaforma non dipende da richieste dei client ma da comandi console del backend, eseguiti a cadenza fissa oppure a mano. Questa pagina ne è il catalogo operativo: quali comandi girano da soli, quando e in quale ambiente; quali vanno lanciati a mano e con quali cautele; quali interruttori funzionali ne condizionano il comportamento. Come eseguirli su un ambiente è descritto in [Rilascio e operatività con `fpc`](/guides/rilascio-fpc#eseguire-un-comando-console).

Ogni comando, pianificato o manuale, è un'azione `php yii <comando>/<azione>` e ogni sua esecuzione viene **registrata** nella base dati con esito, durata e unità di lavoro non trattate, consultabili dall'area amministrativa come descritto in [Area amministrativa e controllo operativo](/guides/amministrazione#esecuzioni-delle-elaborazioni-pianificate).

## Come sono eseguite le attività pianificate

Le pianificazioni sono regole **Amazon EventBridge** definite nel repository [`FormandoPercorsi/aws`](https://github.com/FormandoPercorsi/aws), in `infra/ecs/eventbridge/<env>/eventbridge-cron.yaml`, una copia per ambiente. A ogni scadenza la regola avvia un task ECS effimero basato sull'immagine `cron` del backend, che esegue un solo comando e termina; i log finiscono nel gruppo CloudWatch `/ecs/formandopercorsi-cron-<env>`.

Tre conseguenze di questo modello:

- **Gli orari sono in UTC.** Le espressioni EventBridge non conoscono il fuso orario italiano: un'attività pianificata alle 02:00 UTC gira alle 03:00 in inverno e alle 04:00 in estate, ora di Roma. I comandi stessi, invece, ragionano in `Europe/Rome` (per esempio quando stabiliscono quale sia «il mese precedente»).
- **Ogni esecuzione usa l'ultima immagine** del proprio ambiente: un rilascio del backend è recepito dalla prima esecuzione successiva senza ridistribuire le regole.
- **Le esecuzioni non si coordinano fra loro.** Due attività pianificate allo stesso minuto girano in parallelo su task distinti; l'ordine fra attività dipendenti è garantito solo dagli orari scelti (la derivazione delle disponibilità alle 05:00 precede il ricalcolo del ranking alle 05:30).

## Calendario delle attività pianificate

| Comando | Cadenza (UTC) | Sviluppo | Produzione | Che cosa fa |
| --- | --- | --- | --- | --- |
| `lessons/check-expired-lessons` | ogni 15 minuti (:00, :15, :30, :45) | attiva | attiva | Rete di sicurezza del webhook di pagamento: per gli ordini ancora in attesa oltre la durata della sessione (30 minuti) chiede a Stripe l'esito e applica lo stesso trattamento del webhook — conferma l'ordine pagato (lezioni pagate, documento, notifiche) o libera quello scaduto (slot, promozione, credito). Webhook e cron non elaborano mai due volte lo stesso ordine. |
| `lesson-reminder/send-reminders` | ogni 15 minuti (:00, :15, :30, :45) | attiva | attiva | Invia il promemoria delle lezioni pagate che iniziano entro 25 minuti, alla famiglia e, se ha un proprio indirizzo e il consenso, allo studente. |
| `lesson-deletion-by-teacher/expire-deleted-lessons` | ogni 15 minuti (:05, :20, :35, :50) | attiva | attiva | Risolve con il rimborso le lezioni cancellate dall'insegnante per le quali la famiglia non ha scelto entro la scadenza; si veda [Modifiche e cancellazioni](/guides/modifiche-cancellazioni). |
| `lesson-modification/expire-modification-requests` | ogni 15 minuti (:10, :25, :40, :55) | attiva | attiva | Fa decadere le richieste di modifica a cui la famiglia non ha risposto prima dell'inizio della lezione. |
| `tracking-aggregate/hourly` | ogni ora al minuto 1 | attiva | attiva | Calcola le metriche orarie di utilizzo; si veda [Tracking degli eventi e metriche](/guides/tracking-metriche). |
| `tracking-aggregate/daily` | ogni giorno alle 00:05 | attiva | attiva | Calcola le metriche giornaliere. |
| `invoices/synchronize-teacher-invoices` | ogni giorno alle 02:00 | attiva | attiva | Scarica i documenti da ACube e ne riallinea lo stato nella base dati (in attesa, inviato, scartato, consegnato…). |
| `availabilities/remove-old-availabilities` | ogni giorno alle 02:00 | attiva | attiva | Rimuove le disponibilità derivate ormai passate e i gruppi di disponibilità rimasti vuoti. |
| `auth/cleanup-tokens` | ogni giorno alle 03:00 | attiva | attiva | Elimina i refresh token revocati il cui periodo di validità di 30 giorni è trascorso. |
| `availabilities/create-derived-for-pending-availabilities` | ogni giorno alle 05:00 | attiva | attiva | Deriva gli slot prenotabili dalle disponibilità dichiarate dagli insegnanti; si veda [Disponibilità](/guides/disponibilita). |
| `teacher-score/recompute` | ogni giorno alle 05:30 | attiva | in attivazione | Ricalcola gli indicatori usati per l'ordinamento in ricerca e attenua i contatori di esposizione; si veda [Ordinamento dei risultati di ricerca](/guides/ranking-insegnanti). |
| `payments/process-daily-payouts` | ogni giorno alle 07:00 | attiva | attiva | Liquidazione giornaliera, alla fascia base; si veda [Pagamenti, payout e fatturazione](/guides/pagamenti). |
| `payments/process-monthly-payouts` | giorno 7 di ogni mese alle 03:00 | attiva | attiva | Liquidazione mensile del mese precedente, con ricalcolo delle fasce. |
| `school-year/rollover` | 1° settembre alle 04:00 | attiva | attiva | Passaggio di classe annuale; chi conclude un ciclo perde scuola e anno, e la famiglia deve riselezionarli prima di poter prenotare. |

:::note
In produzione la regola del ricalcolo notturno del ranking viene abilitata insieme alla promozione su `main` del codice che lo contiene: l'immagine di produzione attuale non ha ancora il comando, e una regola attiva prima fallirebbe ogni notte. Alla prima attivazione il comando va lanciato una volta a mano (prima con `--dryRun=1`), così che gli indicatori siano disponibili senza attendere la notte. Fino ad allora l'ordinamento degrada correttamente al punteggio iniziale e nessun insegnante sparisce dai risultati.
:::

Le attività legate alla **copertura assicurativa** (`insurance/expire`, `insurance/expire-unpaid`, `insurance/report-pending-compensations`) non sono pianificate in nessun ambiente, coerentemente con la funzionalità, che è disattivata (si veda [Interruttori funzionali](#interruttori-funzionali)). Vanno aggiunte alle regole EventBridge contestualmente alla sua attivazione, con le cadenze indicate in [Copertura assicurativa](/guides/assicurazione).

## Comandi da eseguire a mano

I comandi seguenti non sono pianificati. Vanno eseguiti con `./fpc run` (o, in locale, con `php yii` dentro il container), e sono raggruppati per finalità. Dove esiste, la **modalità di prova** (`--dryRun=1`) calcola e riporta ciò che il comando farebbe senza scrivere nulla: è il primo passo consigliato prima di qualunque esecuzione su `prod`.

### Rieseguire o recuperare un'elaborazione

| Comando | Uso |
| --- | --- |
| `payments/process-monthly-payouts [YYYY-MM]` | Riesegue la liquidazione mensile di un mese determinato. Rieseguirla su un mese già liquidato è un'operazione prevista e non produce movimenti duplicati: vengono registrate solo le differenze di fascia. |
| `payments/process-daily-payouts` | Riesegue la liquidazione giornaliera. |
| `tracking-aggregate/date <YYYY-MM-DD>` | Ricalcola le metriche di una data, tipicamente per recuperare un intervallo non elaborato. |
| `teacher-score/recompute [--dryRun=1]` | Ricalcolo completo del ranking; in prova riporta le variazioni più rilevanti. |
| `teacher-score/recompute-teacher <id> [--dryRun=1]` | Ricalcolo per un singolo insegnante. |
| `school-year/rollover [data] [--dryRun=1]` | Passaggio di classe riferito a una data diversa da oggi. |
| `invoices/synchronize-all-invoices-in-db` | Per ogni documento presente nella base dati rilegge da ACube cliente e data. Utile dopo un'anomalia di sincronizzazione. |

### Tariffe e scuole esterne

| Comando | Uso |
| --- | --- |
| `price-change/preview`, `schedule`, `list`, `show`, `cancel`, `revert`, `current` | Aggiornamenti tariffari versionati; sono la controparte da riga di comando della pagina «Tariffe» dell'area amministrativa e condividono con essa le stesse regole. È l'**unico** modo supportato di modificare una tariffa: non vanno mai modificate a mano le righe tariffarie nella base dati. |
| `external-schools/add-external-school` | Creazione interattiva di una scuola esterna. Richiede un terminale interattivo, quindi non è eseguibile con `./fpc run` in modalità effimera: in alternativa si usa l'area amministrativa, che segue lo stesso percorso di creazione. |
| `external-schools/assign-cities <id>\|--self=1 --city=A,B --province=C [--dryRun=1]` | Assegna città di competenza a una scuola esterna. Idempotente; rifiuta una città già assegnata a un'altra scuola. |
| `external-schools/provision-self-school [--dryRun=1]` | Crea l'utente e la scuola esterna attraverso cui FPC stessa opera come provider; si veda [Scuole esterne, provider e incasso](/guides/scuole-esterne). |

I limiti delle fasce di ore non hanno un comando console: si modificano solo dall'area amministrativa.

Le **numerazioni dei documenti** non richiedono alcun intervento a inizio anno: sono distinte per anno e la prima emissione dell'anno nuovo apre da sola la serie che riparte da 1. Il vecchio comando che le azzerava è stato rimosso, perché azzerava anche le numerazioni dell'anno in corso producendo numeri duplicati.

### Recuperi una tantum

Comandi scritti per riallineare dati storici dopo l'introduzione di una nuova colonna o di un nuovo comportamento. Sono idempotenti — una seconda esecuzione non modifica nulla — e vanno eseguiti una volta per ambiente, dopo le migrazioni che li rendono necessari.

| Comando | Uso |
| --- | --- |
| `lesson-cost-backfill/run [--dryRun=1]` | Valorizza la ripartizione dei costi per lezione rimasta vuota sulle lezioni anteriori alla sua introduzione. |
| `lesson-deletion-reason-backfill/run [--dryRun=1]` | Ricostruisce il motivo di cancellazione delle lezioni cancellate prima che venisse registrato. |
| `invoice-line-backfill/run [--dryRun=1] [--limit=N] [--pauseMs=200]` | Rilegge da ACube il contenuto dei documenti già emessi (righe, dati per il PDF, emissione per conto terzi). Procede a ritmo controllato, può essere spezzato in lotti con `--limit` e si ferma dopo cinque documenti consecutivi a cui ACube non risponde, con codice di uscita 69: i restanti vengono ripresi all'esecuzione successiva. |
| `google-calendar-backfill/run` | Crea i calendari Google mancanti degli insegnanti e accoda la sincronizzazione delle lezioni degli ultimi due mesi e future. |
| `google-calendar-backfill/hide-existing` | Nasconde i calendari degli insegnanti dall'elenco dell'account di servizio. |

### Comandi da usare con particolare cautela

| Comando | Cautela |
| --- | --- |
| `policy-update/notify-users` | Invia a **tutti** gli utenti la notifica e l'email di aggiornamento dei termini. Va eseguito una sola volta per ogni aggiornamento, e mai in sviluppo con una base dati contenente indirizzi reali. |
| `invoices/force-update-all-business-registry-configurations` | Riscrive su ACube la configurazione anagrafica di tutti gli insegnanti attivi. |
| `stripe-users-management/update-all-teacher-and-external-schools-accounts` | Migrazione una tantum degli account Stripe connessi di insegnanti e scuole esterne verso la configurazione corrente; sposta saldi. Non va rieseguita. |
| `insurance/claim-replacement-report <da> <a> [--teacherId=] [--email=1]` | Analisi di quanta parte degli slot liberati dai sinistri è stata ri-prenotata; di sola lettura, ma rilevante solo con l'assicurazione attiva. |

## Interruttori funzionali

Il comportamento di diversi comandi dipende da interruttori definiti nei parametri dell'applicazione. Sono parte del codice, quindi **identici in tutti gli ambienti** a parità di versione distribuita: cambiarli richiede una modifica al backend e un rilascio (si veda [Ambienti di sviluppo e produzione](/guides/ambienti#che-cosa-dipende-dallambiente-e-che-cosa-no)). Lo stato attuale sul branch `develop`:

| Interruttore | Stato | Effetto |
| --- | --- | --- |
| Copertura assicurativa | spento | La copertura non è proposta alla prenotazione; le attività di scadenza non sono pianificate. Si veda [Copertura assicurativa](/guides/assicurazione). |
| Credito degli insegnanti | spento | La liquidazione assorbe lo sconto della famiglia con la ripartizione precedente e non matura credito per l'insegnante. Si veda [Crediti degli insegnanti](/guides/crediti-insegnanti). |
| Programma referral | acceso | Si veda [Crediti e programma referral](/guides/referral-crediti). |
| Ordinamento algoritmico | acceso | Pesi e saturazioni sono anch'essi parametri; cambiarli richiede un rilascio **e** un ricalcolo, perché i pesi della parte precalcolata sono incorporati nel punteggio memorizzato. |
| PDF dei documenti generati internamente | acceso | Spento, i PDF tornano a essere quelli di ACube. Si veda [Documenti fiscali e ricevute](/guides/documenti-fiscali). |
| Ricevute occasionali: insegnante sempre provider | acceso | Spento, torna il giro in cui la scuola esterna incassa anche per l'insegnante occasionale. |
| Ricevute occasionali: marca da bollo apposta da FPC | acceso | Richiede comunque la delega del singolo insegnante. |
| Ricevute occasionali: bollo virtuale | spento | Richiede anche l'autorizzazione (`BOLLO_VIRTUAL_AUTH_*`) e la delega del singolo insegnante. |
| Ritenuta d'acconto trattenuta sui trasferimenti | spento | La ritenuta è esposta in ricevuta ma il compenso è trasferito al lordo. |
| Pacchetti con insegnanti occasionali | spento | |

Alcuni interruttori — in particolare il credito degli insegnanti — spostano denaro fra FPC, scuole e insegnanti: la loro attivazione va preceduta da una liquidazione di verifica in un ambiente non di produzione, e non coincide con un rilascio qualsiasi.
