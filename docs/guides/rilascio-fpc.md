---
title: Rilascio e operatività con fpc
---

# Rilascio e operatività con `fpc`

`fpc` è lo strumento a riga di comando con cui si costruiscono le immagini, si rilasciano i servizi, si eseguono comandi sugli ambienti e si accede alla base dati. Risiede nel repository [`FormandoPercorsi/aws`](https://github.com/FormandoPercorsi/aws) e va eseguito dalla sua radice (`./fpc <comando> [opzioni]`). Questa pagina ne descrive il funzionamento e raccoglie i casi d'uso più frequenti; il riferimento completo di ogni opzione è nello stesso repository, in `docs/reference/fpc-reference.md`. La composizione degli ambienti su cui `fpc` agisce è descritta in [Ambienti di sviluppo e produzione](/guides/ambienti).

## Prerequisiti

| Strumento | Necessario per | Configurazione |
| --- | --- | --- |
| [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) | `deploy`, `run`, `db-tunnel` | una volta `aws configure` (regione `eu-south-1`), a ogni sessione `aws login` |
| [GitHub CLI](https://cli.github.com/) (`gh`) | `build`, e `deploy` con `--build` o `--with-docs` | una volta `gh auth login`, con accesso ai repository dell'organizzazione |
| `jq` | `run`, `deploy` con `--with-docs` o `--update-task-def` | — |
| [Session Manager plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html) | `db-tunnel` | — |

Se la sessione AWS è scaduta, `fpc` lo rileva prima di agire e, in un terminale interattivo, propone di eseguire `aws login`. La procedura di prima configurazione dell'accesso AWS è nel repository `aws`, in `docs/how-to/setup/aws-access.md`.

## I due passaggi di ogni rilascio

Rilasciare una modifica richiede sempre due operazioni distinte, che `fpc` può eseguire separatamente o in un unico comando:

1. **Costruzione dell'immagine** (`./fpc build`, oppure `--build` su `deploy`). Le immagini non sono mai costruite in locale: `fpc` avvia il workflow «ECR» del repository applicativo su GitHub Actions, sul branch corrispondente all'ambiente, e ne attende la conclusione. Il workflow costruisce e pubblica su ECR l'immagine con il tag mobile dell'ambiente.
2. **Rilascio** (`./fpc deploy`). Aggiorna tramite CloudFormation le risorse selezionate e, per i servizi ECS, avvia un nuovo rilascio che scarica l'immagine appena pubblicata.

Il branch costruito dipende dall'ambiente e dal componente:

| Componente di build | Repository | `--env dev` | `--env prod` |
| --- | --- | --- | --- |
| `backend` (alias `rest`, `queue`, `cron`) | `formandopercorsi-backend` | `develop` | `main` |
| `frontend` | `formandopercorsi-frontend` | `develop` | `master` |
| `docs` | `formandopercorsi-docs` | `master` | `master` |

Il codice va quindi **mergiato e pushato sul branch dell'ambiente prima** di lanciare la costruzione: `fpc` costruisce ciò che è su GitHub, non ciò che è nella copia locale.

:::warning
Poiché i tag delle immagini sono mobili (`develop-web-latest`, `master-latest`, …), la definizione del servizio non cambia fra un rilascio e l'altro e CloudFormation non rileva modifiche. Senza `--force-redeploy` il servizio **non viene riavviato** e continua a eseguire l'immagine precedente. Nei rilasci di codice applicativo `--force-redeploy` va quindi sempre indicato.
:::

## Anatomia di un rilascio completo del backend

Il comando seguente è il rilascio tipico di una modifica del backend in sviluppo:

```bash
./fpc deploy --env dev --component="service:rest,service:queue" --build --migrate --force-redeploy --with-docs --yes
```

| Opzione | Effetto |
| --- | --- |
| `--env dev` | Ambiente di destinazione (`dev` è anche il valore predefinito). |
| `--component="service:rest,service:queue"` | I due servizi del backend: API e coda dei lavori. Vanno **sempre rilasciati insieme**, perché la coda esegue lavori accodati dall'API e i due devono condividere la stessa versione del codice. |
| `--build` | Costruisce prima l'immagine `backend` dal branch `develop` (una sola esecuzione del workflow, che produce le immagini `web`, `queue` e `cron`). |
| `--migrate` | Applica le migrazioni della base dati con l'immagine appena costruita. |
| `--force-redeploy` | Forza il riavvio dei servizi anche quando CloudFormation non rileva modifiche. |
| `--with-docs` | Al termine ricostruisce e ridistribuisce la documentazione, così che la API Reference recepisca le nuove annotazioni OpenAPI. |
| `--yes` | Salta la conferma richiesta per `prod`; in `dev` non ha effetto, ma consente di riusare lo stesso comando cambiando solo `--env`. |

Le fasi vengono eseguite in quest'ordine:

1. **Verifica dei prerequisiti.** Con `--build` o `--with-docs` la presenza e l'autenticazione di `gh` sono verificate **prima di toccare l'ambiente**, così che una dipendenza mancante non lasci un rilascio a metà.
2. **Costruzione** dell'immagine del backend, con attesa della conclusione del workflow (fino a 30 minuti). Se la costruzione fallisce, il comando si interrompe e nulla viene rilasciato.
3. **Migrazioni**: viene avviato un task effimero con l'immagine `cron` che esegue `php yii migrate --interactive=0`.
4. **Rilascio dei servizi** `rest` e `queue`, con riavvio forzato.
5. **Documentazione**: si attende che il servizio `rest` sia stabile, poi si ricostruisce l'immagine della documentazione — che scarica la specifica OpenAPI dal backend **appena distribuito** — e si ridistribuisce il servizio `docs`. Attendere la stabilità è indispensabile: ricostruita prima, la documentazione pubblicherebbe la specifica precedente.

:::caution
Con `--migrate` il task delle migrazioni viene **avviato ma non atteso**: il rilascio dei servizi prosegue subito dopo, quindi il nuovo codice può entrare in servizio mentre le migrazioni sono ancora in corso, e un loro eventuale fallimento non interrompe il comando. Per migrazioni brevi e retrocompatibili è accettabile; quando il nuovo codice dipende in modo stretto dallo schema, o la migrazione è lunga o tocca molti dati, conviene eseguirla prima e a parte con `./fpc run`, che invece attende la conclusione, mostra i log e restituisce il codice di uscita (si veda [Migrazioni eseguite a parte](#migrazioni-eseguite-a-parte)). In ogni caso l'esito delle migrazioni lanciate con `--migrate` è nel gruppo di log `/ecs/formandopercorsi-cron-<env>`.
:::

## Casi d'uso frequenti

### Backend

**Rilascio completo in sviluppo** (codice, migrazioni, documentazione):

```bash
./fpc deploy --env dev --component="service:rest,service:queue" --build --migrate --force-redeploy --with-docs --yes
```

**Rilascio senza migrazioni** né modifiche alle annotazioni OpenAPI:

```bash
./fpc deploy --env dev --component="service:rest,service:queue" --build --force-redeploy
```

**Rilascio in produzione**, dopo aver portato le modifiche su `main`:

```bash
./fpc deploy --env prod --component="service:rest,service:queue" --build --migrate --force-redeploy --with-docs --yes
```

**Riavvio dei servizi senza ricostruire** (immagine già costruita, ad esempio dalla scheda Actions di GitHub, oppure per far ripartire un processo bloccato):

```bash
./fpc deploy --env dev --component="service:rest,service:queue" --force-redeploy
```

#### Migrazioni eseguite a parte

Quando le migrazioni devono essere concluse prima che il nuovo codice entri in servizio, si separano le fasi:

```bash
./fpc build  --env dev --component backend
./fpc run    --env dev -- php yii migrate --interactive=0
./fpc deploy --env dev --component="service:rest,service:queue" --force-redeploy --with-docs
```

`./fpc run` esegue il comando in un task effimero basato sull'immagine `cron` appena costruita, ne mostra i log in tempo reale e termina con lo stesso codice di uscita del comando: se la migrazione fallisce, il rilascio non va eseguito. Una migrazione si annulla con `php yii migrate/down 1 --interactive=0`, eseguito allo stesso modo.

### Frontend

**Rilascio in sviluppo:**

```bash
./fpc deploy --env dev --component service:frontend --build --force-redeploy
```

**Rilascio in produzione**, dopo aver portato le modifiche su `master`:

```bash
./fpc deploy --env prod --component service:frontend --build --force-redeploy --yes
```

Il frontend non ha migrazioni, e `--with-docs` non è necessario: la documentazione dipende solo dalla specifica del backend. Le variabili di configurazione del frontend sono incorporate al momento della costruzione: cambiarle richiede di ricostruire l'immagine, non di aggiornare la definizione del task (si veda [Ambienti di sviluppo e produzione](/guides/ambienti#configurazione-del-frontend)).

### Backend e frontend insieme

```bash
./fpc deploy --env dev --component="service:rest,service:queue,service:frontend" --build --migrate --force-redeploy --with-docs --yes
```

Una sola invocazione costruisce entrambe le immagini, una dopo l'altra, e rilascia i tre servizi.

### Solo documentazione

Per ripubblicare questo sito — perché è cambiata una guida, o per riallineare la API Reference a quanto è distribuito — si costruisce l'immagine dal branch `master` del repository della documentazione e si ridistribuisce il servizio:

```bash
./fpc build  --component docs
./fpc deploy --env docs --force-redeploy
```

Con `--env docs` i componenti sono impostati automaticamente sul servizio e sul task della documentazione. Poiché la costruzione scarica la specifica di **entrambi** gli ambienti, ogni ripubblicazione riallinea sia la reference di sviluppo sia quella di produzione allo stato distribuito in quel momento.

### Variabili d'ambiente o segreti modificati

Una nuova variabile, un segreto aggiunto o una modifica di CPU e memoria richiedono di registrare una nuova revisione della definizione del task e di puntarvi il servizio:

```bash
./fpc deploy --env dev --component="task:rest,task:queue,service:rest,service:queue" --update-task-def --force-redeploy
```

Le definizioni dei task sono nel repository `aws`, in `infra/ecs/tasks/<env>/`, e vanno modificate prima del rilascio. Due aspetti da ricordare:

- `--update-task-def` **riscrive** i file di parametri dei servizi (`infra/ecs/services/<env>/*-params.json`) con l'ARN dell'ultima revisione: la modifica va poi committata nel repository `aws`, altrimenti il rilascio successivo eseguito da un'altra copia tornerebbe alla revisione precedente;
- le attività pianificate usano una definizione del task propria (`task:cron`): una variabile necessaria anche ai comandi console va aggiunta anche lì, e le regole EventBridge vanno ridistribuite (si veda il caso seguente).

Per un servizio diverso dal backend la forma è la stessa, ad esempio `task:frontend,service:frontend`.

### Attività pianificate

Le pianificazioni sono definite nel repository `aws`, in `infra/ecs/eventbridge/<env>/eventbridge-cron.yaml`. Dopo averle modificate:

```bash
./fpc deploy --env dev --component eventbridge
```

Se è cambiata anche la definizione del task `cron`:

```bash
./fpc deploy --env dev --component="task:cron,eventbridge" --update-task-def
```

Un rilascio del solo codice del backend **non** richiede di ridistribuire le regole: ogni esecuzione avvia un nuovo task con l'immagine `…-cron-latest` dell'ambiente. L'elenco delle attività pianificate è in [Attività pianificate e comandi console](/guides/attivita-pianificate).

### Eseguire un comando console

`./fpc run` esegue un comando su un ambiente. Senza opzioni di destinazione lo esegue in un **task effimero** basato sull'immagine `cron`, che è la modalità da preferire per i comandi del backend: non interferisce con i servizi in esecuzione, usa l'ultima immagine costruita, mostra i log e restituisce il codice di uscita.

```bash
./fpc run --env dev -- php yii teacher-score/recompute --dryRun=1
./fpc run --env prod --yes -- php yii payments/process-monthly-payouts 2026-08
./fpc run --env prod --yes -- php yii price-change/current --target=lesson
```

Il separatore `--` delimita le opzioni di `fpc` dal comando da eseguire. Il task non dispone di un terminale interattivo: i comandi che chiedono conferma vanno lanciati in modalità non interattiva (`--interactive=0`). Il catalogo dei comandi disponibili, con quelli che dispongono di una modalità di prova, è in [Attività pianificate e comandi console](/guides/attivita-pianificate#comandi-da-eseguire-a-mano).

In alternativa il comando può essere eseguito **dentro un container già in esecuzione**, ad esempio per ispezionarne lo stato:

```bash
./fpc run --list-tasks --env prod                      # elenca i container in esecuzione
./fpc run --env dev --service rest -- php yii help     # esegue nel container del servizio «rest»
./fpc run --env dev --task <task-id> -- ls runtime     # esegue in un task specifico
./fpc run --list-ec2                                   # elenca le istanze EC2 del cluster
./fpc run --instance <id-istanza> -- docker ps         # esegue direttamente sull'istanza
```

Se più task corrispondono al servizio indicato, il comando si interrompe e chiede di restringere la destinazione con `--task`.

### Accesso alla base dati

```bash
./fpc db-tunnel --env dev                       # tunnel su 127.0.0.1:33060
./fpc db-tunnel --env prod --local-port 33061   # porta locale diversa
```

Il comando apre un tunnel SSM verso l'istanza RDS dell'ambiente, attraverso un'istanza EC2 del cluster, e resta in esecuzione finché non viene interrotto con `Ctrl+C`. Con il tunnel attivo ci si collega con un normale client MySQL a `127.0.0.1` sulla porta locale, con SSL disattivato (la connessione è già cifrata dal tunnel). Le credenziali sono in AWS Secrets Manager; la procedura completa, con la configurazione di DBeaver, è nel repository `aws`, in `docs/how-to/db/connect-via-tunnel.md`. L'accesso a `prod` non chiede conferma: va usato con particolare cautela, e mai per scrivere dati che un comando applicativo può scrivere in modo controllato.

### Costruire un branch diverso

```bash
./fpc build --env dev --component backend --branch pre-production
```

`--branch` costruisce il branch indicato al posto di quello dell'ambiente, ma **pubblica l'immagine con il tag di quel branch** (`<branch>-web-latest`), che nessun servizio utilizza: serve a verificare che l'immagine si costruisca, non a distribuirla. Il nome del branch diventa parte del tag, quindi un branch con una barra nel nome (`FPCBE-123/descrizione`) produce un tag non valido e la costruzione fallisce. Per provare una modifica in sviluppo la via prevista è il merge su `develop`.

### Infrastruttura

Bilanciatore, cluster, istanze RDS e regole EventBridge si aggiornano con i componenti `alb`, `ecs`, `rds` ed `eventbridge`. `--all` li rilascia tutti, insieme a tutti i task e i servizi dell'ambiente:

```bash
./fpc deploy --env dev --all --build --force-redeploy
```

È un'operazione da riservare all'allineamento completo di un ambiente o alla sua prima creazione: per i rilasci applicativi si indicano sempre i soli componenti interessati.

## Riepilogo delle opzioni di `deploy`

| Opzione | Significato |
| --- | --- |
| `--env dev\|prod\|docs` | Ambiente di destinazione, predefinito `dev`. |
| `--component <tipo>:<nome>,…` | Componenti da rilasciare. Tipi: `service` (`rest`, `queue`, `frontend`, `docs`), `task` (`rest`, `queue`, `frontend`, `cron`, `docs`), `eventbridge`, `alb`, `ecs`, `rds`. Un tipo senza nome seleziona tutti i componenti di quel tipo. |
| `--all` | Tutti i componenti dell'ambiente. |
| `--build` | Costruisce prima le immagini dei servizi selezionati. |
| `--migrate` | Avvia le migrazioni della base dati (senza attenderne la conclusione). |
| `--force-redeploy` | Riavvia i servizi anche senza modifiche alla loro definizione. |
| `--update-task-def` | Punta servizi e regole EventBridge all'ultima revisione della definizione del task. |
| `--with-docs` | Al termine ricostruisce e ridistribuisce la documentazione. |
| `--yes` | Salta la conferma per `prod` (necessario nei contesti non interattivi). |

Un nome di componente sconosciuto produce un avviso e viene ignorato, senza interrompere il comando: un errore di battitura in `--component` può quindi far sì che un servizio non venga rilasciato. Conviene leggere la riga `Deploying components:` stampata all'avvio.

## Verifica dopo il rilascio

1. Il comando termina con `Deploy completed.`.
2. Il servizio risponde: per il backend, `https://<host>/doc/openapi.yaml` restituisce la specifica aggiornata.
3. Nella console ECS il servizio mostra un nuovo rilascio e il task è `RUNNING`; in caso contrario i log del gruppo `/ecs/formandopercorsi-<componente>-<env>` indicano perché il container non si avvia.
4. Se il rilascio comprendeva migrazioni avviate con `--migrate`, il loro esito è nel gruppo `/ecs/formandopercorsi-cron-<env>`.
5. Con `--with-docs`, la API Reference dell'ambiente mostra le nuove operazioni.

## Risoluzione dei problemi

| Sintomo | Causa e rimedio |
| --- | --- |
| Il servizio continua a eseguire il codice precedente | Manca `--force-redeploy`, oppure l'immagine non è stata ricostruita: ripetere con `--build --force-redeploy`. |
| La costruzione fallisce subito con «GitHub CLI not found» o «not authenticated» | Installare `gh` ed eseguire `gh auth login`. In alternativa avviare il workflow «ECR» dalla scheda Actions del repository e rilasciare senza `--build`. |
| «no new run appeared» | GitHub non ha ancora registrato l'esecuzione del workflow: seguirla dalla scheda Actions del repository. |
| Il comando su `prod` si interrompe con «Refusing to run … without interactive confirmation» | Esecuzione non interattiva: aggiungere `--yes`. |
| La API Reference non mostra le nuove operazioni dopo `--with-docs` | La documentazione è costruita dalla specifica del backend in esecuzione: verificare che il rilascio del backend sia andato a buon fine e che `/doc/openapi.yaml` sia aggiornato, poi ripubblicare la documentazione. |
| Errori «Unknown column» o «Table doesn't exist» dopo un rilascio | Le migrazioni non sono state applicate o sono fallite: verificare i log del task `cron` ed eseguirle con `./fpc run -- php yii migrate --interactive=0`. |
| `run --service` segnala più task corrispondenti | Indicare il task con `--task <id>`, ricavabile da `--list-tasks`. |
| Le nuove impostazioni del task non sono applicate | Rilasciare anche `task:<nome>` e aggiungere `--update-task-def`. |
| Il tunnel non si apre o la porta è occupata | Verificare il Session Manager plugin e la sessione AWS; usare `--local-port` per una porta diversa. |
