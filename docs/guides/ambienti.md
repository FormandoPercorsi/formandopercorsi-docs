---
title: Ambienti di sviluppo e produzione
---

# Ambienti di sviluppo e produzione

La piattaforma è in esecuzione in due ambienti, **sviluppo** e **produzione**, che condividono lo stesso codice e la stessa infrastruttura AWS ma hanno base dati, archivio file, credenziali e integrazioni esterne distinti. Questa pagina descrive come sono composti, in che cosa differiscono e quali accorgimenti richiede lavorare sull'uno o sull'altro. Le procedure di rilascio sono descritte in [Rilascio e operatività con `fpc`](/guides/rilascio-fpc), le attività pianificate in [Attività pianificate e comandi console](/guides/attivita-pianificate).

## Quadro sintetico

| | Sviluppo (`dev`) | Produzione (`prod`) |
| --- | --- | --- |
| **API** | `https://dev.api.formandopercorsi.com` | `https://api.formandopercorsi.com` |
| **Applicazione web** | `https://dev.formandopercorsi.com` | `https://formandopercorsi.com` (`www.` reindirizza al dominio principale) |
| **Branch del backend** | `develop` | `main` |
| **Branch del frontend** | `develop` | `master` |
| **Immagini del backend** | `develop-web-latest`, `develop-queue-latest`, `develop-cron-latest` | `main-web-latest`, `main-queue-latest`, `main-cron-latest` |
| **Immagine del frontend** | `develop-latest` | `master-latest` |
| **Base dati** | istanza RDS MySQL `fpc-mysql-dev` | istanza RDS MySQL `fpc-mysql-prod` |
| **`YII_ENV`** | `dev` | `prod` |
| **Fatturazione elettronica** | ACube **sandbox** | ACube **production** (invio reale allo SDI) |
| **Accesso Google** | client OAuth dedicato allo sviluppo | client OAuth dedicato alla produzione |
| **Mittente email** | «Formando PerCorsi Dev» | «Formando PerCorsi» |
| **Ricalcolo notturno del ranking** | attivo | attivato con la promozione su `main` che lo introduce |

La documentazione (`https://docs.formandopercorsi.com`) è un servizio unico, indipendente dall'ambiente: un'unica immagine, costruita dal branch `master` di questo sito, che contiene sia la API Reference di produzione sia quella di sviluppo.

:::note
L'ambiente di **pre-produzione** (`preprod.api.formandopercorsi.com`, `preprod.formandopercorsi.com`) è previsto dall'infrastruttura ma **non è attivo**: le regole di instradamento del bilanciatore sono commentate e non esistono servizi né definizioni dei task per esso. Il workflow di costruzione del frontend produce comunque un'immagine «preprod» per qualunque branch diverso da `develop` e `master`, che però non viene distribuita da nessuna parte.
:::

## Composizione dell'infrastruttura

Entrambi gli ambienti risiedono nella regione AWS `eu-south-1` (Milano) e condividono un unico cluster ECS, `formandopercorsi-cluster`, eseguito su istanze EC2, e un unico Application Load Balancer.

```
                         Application Load Balancer (HTTPS, instradamento per host)
                 ┌────────────────┬──────────────────┬─────────────────┬──────────────────┐
                 ▼                ▼                  ▼                 ▼                  ▼
          dev.api.*         api.*             dev.*            formandopercorsi.com   docs.*
       ┌────────────┐   ┌────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────┐
       │ rest (dev) │   │ rest (prod)│   │ frontend(dev)│   │frontend(prod)│   │   docs   │
       └─────┬──────┘   └─────┬──────┘   └──────────────┘   └──────────────┘   └──────────┘
             │                │
       ┌─────┴──────┐   ┌─────┴──────┐        ECS cluster «formandopercorsi-cluster» (EC2)
       │ queue (dev)│   │queue (prod)│
       └─────┬──────┘   └─────┬──────┘        + task «cron» avviati da EventBridge
             ▼                ▼
       RDS MySQL dev    RDS MySQL prod        + bucket S3 per ambiente
```

Per ciascun ambiente il backend è composto da **tre processi**, costruiti dallo stesso codice in tre immagini distinte:

| Componente | Servizio ECS | Ruolo |
| --- | --- | --- |
| `rest` | `formandopercorsi-rest-web-<env>` | Server web (Apache) che espone l'API, la specifica OpenAPI su `/doc/openapi.yaml` e i webhook. È l'unico raggiungibile dall'esterno. |
| `queue` | `formandopercorsi-queue-<env>` | Processo permanente che consuma la coda dei lavori asincroni persistita sulla base dati (`php yii queue/listen`). |
| `cron` | nessun servizio: task effimeri | Ogni attività pianificata avvia un task dedicato tramite una regola EventBridge, che esegue un singolo comando console e termina. Lo stesso task è usato per le migrazioni e per i comandi eseguiti a mano. |

A questi si aggiungono `frontend` (`formandopercorsi-frontend-web-<env>`, l'applicazione web servita come sito statico da nginx) e il servizio `docs`, comune ai due ambienti.

Alcune caratteristiche hanno conseguenze operative dirette:

- **Un'istanza per servizio, con interruzione durante il rilascio.** Ogni servizio gira con un solo task e la strategia di rilascio arresta il task in esecuzione prima di avviare il nuovo. Ogni rilascio comporta quindi qualche decina di secondi di indisponibilità del componente interessato.
- **Le immagini sono identificate da un tag mobile** (`…-latest`). Un rilascio che non cambia la definizione del servizio non viene rilevato come modifica: per far ripartire il servizio con l'immagine appena costruita va sempre richiesto un nuovo rilascio forzato, come descritto in [Rilascio e operatività con `fpc`](/guides/rilascio-fpc).
- **I task `cron` usano sempre l'ultima immagine.** Ogni esecuzione pianificata avvia un nuovo task che scarica l'immagine `…-cron-latest` del proprio ambiente: dopo aver ricostruito il backend le attività pianificate adottano il nuovo codice dalla prima esecuzione successiva, senza bisogno di ridistribuire le regole EventBridge.
- **La base dati non è esposta su Internet.** Vi si accede da locale solo attraverso un tunnel SSM, con `./fpc db-tunnel` (si veda [Rilascio e operatività con `fpc`](/guides/rilascio-fpc#accesso-alla-base-dati)).

## Configurazione

La configurazione di ciascun processo è definita nella **definizione del task** ECS dell'ambiente, nel repository [`FormandoPercorsi/aws`](https://github.com/FormandoPercorsi/aws) (`infra/ecs/tasks/<env>/`). Le variabili non riservate vi compaiono in chiaro; quelle riservate (chiavi JWT, password della base dati e della posta, chiavi Stripe e Google, credenziali ACube, sale per l'anonimizzazione degli indirizzi IP) sono riferimenti ad AWS Secrets Manager e vengono risolte all'avvio del task. L'elenco completo delle variabili lette dal backend è in [Ambiente di sviluppo locale](/guides/setup-locale#variabili-dambiente).

### Che cosa dipende dall'ambiente e che cosa no

**Il comportamento funzionale non dipende dall'ambiente.** Gli interruttori delle funzionalità — copertura assicurativa, credito degli insegnanti, ricevute occasionali con bollo virtuale o fisico, pacchetti con insegnanti occasionali, programma referral, ordinamento algoritmico — sono definiti nel codice, nei parametri dell'applicazione, e sono quindi **identici in sviluppo e in produzione** a parità di versione. Accendere una funzionalità solo in sviluppo significa distribuire in sviluppo un codice che la accende: non esiste un interruttore per ambiente.

Ciò che cambia fra i due ambienti è soltanto:

- **i servizi esterni a cui ci si collega**: base dati, bucket S3, account e chiavi Stripe, ambiente ACube, client OAuth di Google, account di posta;
- **gli indirizzi pubblici** (`URL`, `FRONTEND_URL`, `GOOGLE_REDIRECT_URI`), usati per i collegamenti nelle email, per l'emittente dei token e per il ritorno dall'accesso con Google;
- **`YII_ENV`**, che nel codice determina un solo comportamento: il cookie del refresh token viene marcato `Secure` solo in produzione;
- **`YII_DEBUG`**, che aumenta il livello di dettaglio dei log. Nelle definizioni attuali è attivo in entrambi gli ambienti.

Lo stato corrente degli interruttori funzionali è riassunto in [Attività pianificate e comandi console](/guides/attivita-pianificate#interruttori-funzionali).

### Configurazione del frontend

L'applicazione web è un sito statico: le sue variabili (`REACT_APP_*`) sono **incorporate al momento della costruzione dell'immagine**, non lette all'avvio. Il workflow di costruzione del repository frontend le ricava dal branch:

| Branch | Backend di riferimento | Log estesi | `robots.txt` |
| --- | --- | --- | --- |
| `master` | produzione | no | `robots.txt.production` |
| `develop` | sviluppo | sì | `robots.txt.develop` |
| qualunque altro | pre-produzione | sì | `robots.txt.preprod` |

Ne derivano due conseguenze:

- le variabili `REACT_APP_*` presenti nella definizione del task del frontend **non hanno alcun effetto**: per cambiarne una occorre modificare i segreti del repository frontend o il workflow, e ricostruire l'immagine;
- le variabili non passate dal workflow (`REACT_APP_GOOGLE_MAPS_KEY`, `REACT_APP_ENCRYPTION_KEY`, `REACT_APP_MAINTENANCE_MODE`) risultano **vuote** nelle immagini distribuite. In particolare la modalità manutenzione non è attivabile senza modificare il workflow.

L'elenco delle variabili del frontend e il loro significato sono in [Applicazione web](/guides/guida-frontend#configurazione).

## Integrazioni esterne per ambiente

### Stripe

Ogni ambiente ha le proprie chiavi e il proprio endpoint webhook. Il webhook di pagamento, `POST /api/payment/webhook/checkout`, riceve gli eventi di completamento e di scadenza delle sessioni di pagamento (`checkout.session.completed`, `checkout.session.expired`) e ne verifica la firma con il segreto dell'endpoint. È previsto un secondo segreto, per un endpoint registrato a livello di account connessi, usato quando la verifica con il primo fallisce; nelle definizioni attuali è valorizzato solo il primo.

Se il webhook non viene recapitato o la sua firma non è valida, l'esito della sessione viene comunque recuperato dall'attività pianificata che ogni quindici minuti interroga Stripe sugli ordini ancora in attesa oltre la durata della sessione, e applica lo stesso trattamento: un webhook perso ritarda la conferma della prenotazione di al più un quarto d'ora, ma non la perde (si veda [Attività pianificate e comandi console](/guides/attivita-pianificate)). Un webhook mal configurato resta comunque da correggere: dopo ogni modifica alle chiavi o all'endpoint va verificato nella dashboard di Stripe che le consegne risultino riuscite.

### ACube e SDI

In sviluppo i documenti sono emessi verso la **sandbox** di ACube e non raggiungono lo SDI; in produzione sono documenti fiscali reali. ACube notifica gli eventi sui documenti (ricezione di fatture passive, esiti di consegna, cambi di stato, conservazione) su sei endpoint sotto `/api/invoice/webhook/`, ciascuno firmato; la firma è verificata con la chiave pubblica indicata in `ACUBE_PUBLIC_KEY` o, in sua assenza, scaricata da `ACUBE_WH_PK_URL`. Indipendentemente dai webhook, lo stato delle fatture è riallineato ogni notte dall'attività di sincronizzazione.

:::warning
L'host da cui la sandbox pubblica la propria chiave pubblica restituisce in realtà la chiave di **produzione**. Poiché nelle definizioni attuali dei task `ACUBE_PUBLIC_KEY` non è valorizzata, in sviluppo la verifica delle firme dei webhook ACube ricade su quell'host e può fallire. Per ricevere correttamente i webhook della sandbox occorre valorizzare `ACUBE_PUBLIC_KEY` con la chiave della sandbox. Analogamente, `ACUBE_ENVIRONMENT` deve sempre corrispondere ad `ACUBE_ENDPOINT`: l'host di autenticazione è condiviso e un valore errato autentica in silenzio contro l'ambiente sbagliato.
:::

I webhook di Stripe e ACube sono chiamate da server a server, documentate nella API Reference sotto **Webhook** come contratto da rispettare nella configurazione di quei servizi, non come operazioni per i client.

### Google

Accesso con Google, sincronizzazione dei calendari degli insegnanti e generazione dei collegamenti alle lezioni online usano credenziali distinte per ambiente. L'accesso con Google richiede che l'indirizzo di ritorno (`<frontend>/oauth/google/callback`) sia registrato sul client OAuth dell'ambiente corrispondente, e che il client indicato al frontend coincida con quello del backend.

### Posta elettronica e WhatsApp

Entrambi gli ambienti inviano email reali tramite lo stesso server SMTP: **in sviluppo le email arrivano davvero agli indirizzi presenti nella base dati**, e occorre tenerne conto prima di popolare la base di sviluppo con indirizzi reali. I messaggi WhatsApp non sono abilitati in nessuno dei due ambienti (`WHATSAPP_ENABLED` non è valorizzata).

## Osservabilità

Tutti i processi scrivono i log sullo standard output in formato strutturato, raccolti in CloudWatch in un gruppo per componente e ambiente:

| Componente | Gruppo di log |
| --- | --- |
| API | `/ecs/formandopercorsi-rest-web-<env>` |
| Coda dei lavori | `/ecs/formandopercorsi-queue-<env>` |
| Attività pianificate, migrazioni e comandi eseguiti a mano | `/ecs/formandopercorsi-cron-<env>` |
| Applicazione web | `/ecs/formandopercorsi-frontend-web-<env>` |
| Documentazione | `/ecs/formandopercorsi-docs` |

Oltre ai log, ogni esecuzione di un comando console è registrata nella base dati con esito, durata e segnalazioni, consultabile dall'area amministrativa: si veda [Area amministrativa e controllo operativo](/guides/amministrazione#esecuzioni-delle-elaborazioni-pianificate). Per verificare che un'attività pianificata abbia girato, quel registro è la fonte più immediata; i log servono a capire perché qualcosa è andato storto.

## Lavorare sull'ambiente di sviluppo

L'ambiente di sviluppo è il luogo dove si verifica una modifica prima di promuoverla in produzione, e alcune pratiche ne preservano l'utilità:

- **Ogni rilascio di `develop` va accompagnato dalle sue migrazioni.** Una migrazione non applicata produce errori su tutte le richieste che toccano l'entità interessata; il comando di rilascio le esegue con `--migrate`.
- **La API Reference di sviluppo riflette ciò che è distribuito, non ciò che è sul branch.** Dopo un rilascio che modifica le annotazioni OpenAPI la documentazione va ricostruita, con `--with-docs`.
- **Le operazioni economiche in sviluppo sono comunque operazioni.** Pagamenti e liquidazioni girano sulle credenziali Stripe dell'ambiente e le email partono davvero: prima di eseguire a mano una liquidazione o un comando di recupero conviene usarne la modalità di prova (`--dryRun=1`), dove disponibile.
- **Gli interruttori funzionali sono quelli della versione distribuita.** Una funzionalità da provare solo in sviluppo va accesa su `develop` e spenta prima della promozione su `main`, oppure promossa spenta.

## Promozione in produzione

La promozione consiste nel portare su `main` (backend) e `master` (frontend) il codice verificato su `develop`, e nel ripetere su `prod` la stessa sequenza di rilascio. Rispetto allo sviluppo cambiano tre aspetti:

1. ogni comando `fpc` che agisce su `prod` chiede conferma esplicita, oppure richiede `--yes` quando eseguito in modo non interattivo;
2. le migrazioni toccano dati reali: è prudente verificarle prima in sviluppo e, per quelle che modificano dati esistenti, valutare un'istantanea della base dati;
3. dopo il rilascio è opportuno verificare il quadro delle ultime esecuzioni nell'area amministrativa, in particolare se il rilascio cade a ridosso della liquidazione mensile (giorno 7 di ogni mese alle 03:00 UTC) o di quella giornaliera (ogni giorno alle 07:00 UTC).
