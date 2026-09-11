# formandopercorsi-docs

Sito di documentazione di Formando PerCorsi: guide discorsive + API reference generata dallo spec OpenAPI del backend, il tutto statico (nessun backend, nessun database, nessuna autenticazione), costruito con [Docusaurus](https://docusaurus.io/) e [docusaurus-plugin-openapi-docs](https://github.com/PaloAltoNetworks/docusaurus-openapi-docs).

> Questo repository è stato migrato dalla precedente versione basata su Create React App + [Redoc](https://github.com/Redocly/redoc) (che mostrava solo la reference API, fetchata a runtime dal backend). Il codice della vecchia versione resta in `legacy-cra/` per riferimento, non fa più parte della build.

## Struttura

```
docs/
  intro.md              # pagina di atterraggio delle guide
  guides/                # guide scritte a mano (Markdown)
  api/                   # generato da docusaurus-plugin-openapi-docs per l'ambiente di produzione, NON modificare a mano
  api-develop/           # generato da docusaurus-plugin-openapi-docs per l'ambiente di sviluppo, NON modificare a mano
openapi/
  formandopercorsi.production.yaml        # fetchato da scripts/fetch-openapi.js dal branch main del backend, NON committato
  formandopercorsi.develop.yaml           # fetchato da scripts/fetch-openapi.js dal branch develop del backend, NON committato
  formandopercorsi.production.docs.yaml   # generato da scripts/prepare-openapi.js, è quello che legge il plugin
  formandopercorsi.develop.docs.yaml      # generato da scripts/prepare-openapi.js, è quello che legge il plugin
scripts/
  fetch-openapi.js    # scarica gli spec aggiornati dal repo backend (vedi sotto)
  prepare-openapi.js  # ripulisce entrambi gli spec prima della generazione (vedi sotto)
sidebars.ts           # sidebar "Guide" scritta a mano + due sidebar "API Reference" (produzione/sviluppo), ciascuna raggruppata per tag
docusaurus.config.ts
```

## Sviluppo locale

```bash
npm install
npm run start        # dev server con hot reload, su http://localhost:3000
```

## Due ambienti, due spec, due alberi di reference

`develop` e `main` (produzione) del backend possono divergere: `develop` può già avere un endpoint o un campo non ancora promosso in produzione. Per non mostrare come "disponibile" qualcosa che in produzione non c'è ancora (o viceversa, nascondere qualcosa che c'è già in sviluppo), il sito genera **due alberi di reference separati** dai due spec branch-specific, selezionabili dal menu a tendina "API Reference" in navbar (`Produzione (main)` / `Sviluppo (develop)`).

## Aggiornare lo spec API

Nessun passo manuale: `npm run gen-api-docs` (e quindi anche `npm run build`, che lo esegue come primo passo) scarica da solo lo spec aggiornato di entrambi i branch prima di rigenerare le pagine. `openapi/formandopercorsi.production.yaml` e `.develop.yaml` non sono più file committati nel repository — sono scritti a ogni run da `scripts/fetch-openapi.js` e ignorati da git.

Ogni build prende quindi lo stato attuale di `web/doc/openapi.yaml` su `main`/`develop` in quel momento (il backend lo tiene aggiornato rigenerandolo con `php docs/doc_generate.php` e committandolo insieme alle modifiche agli endpoint) — non c'è una copia "congelata" da tenere sincronizzata a mano, ma bisogna comunque **rilanciare la build dei docs** ogni volta che si vuole che la reference rifletta l'ultimo stato del backend: non è fetch a runtime nel browser (vedi "Perché non fetch a runtime" più sotto).

`scripts/fetch-openapi.js` recupera `web/doc/openapi.yaml` da `FormandoPercorsi/formandopercorsi-backend` in uno di due modi, nell'ordine:

1. **Clone locale**: se è impostata la variabile d'ambiente `BACKEND_REPO_PATH` (percorso di un clone locale del repo backend), usa `git show origin/<branch>:web/doc/openapi.yaml` — comodo in locale se hai già i due repo affiancati (assicurati che i remote-tracking branch siano aggiornati con `git fetch` prima).
2. **GitHub API**: altrimenti, usa `GITHUB_TOKEN` (o `GH_TOKEN`) per leggere il file via l'API REST di GitHub — necessario perché il repo backend è privato. Serve un token con permesso di lettura su `formandopercorsi-backend`.

```bash
# opzione locale
BACKEND_REPO_PATH=../formandopercorsi-backend npm run gen-api-docs

# opzione con token
GITHUB_TOKEN=ghp_xxx npm run gen-api-docs
```

### Cosa fa `scripts/prepare-openapi.js`

Lo spec esportato dal backend (via swagger-php) ha due difetti puramente cosmetici che il generatore di pagine erediterebbe altrimenti:

1. **Tag duplicati**: alcuni tag (es. `Family`, `Lesson`, `Topic`) compaiono più volte nell'elenco dei tag di primo livello, a volte con descrizioni diverse — senza dedup, il sito mostrerebbe due categorie diverse con lo stesso nome. Lo script tiene la descrizione più completa e scarta i duplicati.
2. **`operationId` illeggibili**: swagger-php assegna un `operationId` automaticamente, ma come hash opaco (es. `74fba823e08bb7452c422ae12a8376ac`), che il plugin usa sia come id della pagina generata sia come slug dell'URL. Lo script lo sostituisce con uno slug leggibile derivato da tag + summary (es. `auth-signin`).

Nessuno dei due tocca a quali endpoint appartiene un tag, né gli schema di richiesta/risposta — solo metadati di presentazione. Lo script elabora entrambi gli ambienti in un'unica esecuzione (`node scripts/prepare-openapi.js`, senza argomenti); passare invece `<inputPath> <outputPath>` esplicitamente elabora un unico file ad hoc, utile per test locali.

### Perché non fetch a runtime

La vecchia versione (Redoc) faceva fetch dello spec **a runtime nel browser**, quindi una singola build serviva sia l'ambiente di produzione che quello di sviluppo, sempre aggiornati senza rebuild. `docusaurus-plugin-openapi-docs` invece **pre-genera una pagina statica per endpoint al momento della build**: in cambio di dover rigenerare il sito quando l'API cambia, si ottengono pagine di reference integrate nella stessa ricerca/navigazione delle guide discorsive, con schema, esempi di codice in più linguaggi e pannello "prova l'endpoint" — cosa che una singola pagina Redoc non offriva.

## Organizzazione della sidebar "API Reference"

Il plugin genera una categoria per ogni tag OpenAPI (circa 30, in ordine di apparizione nello spec). `sidebars.ts` le **raggruppa** in una manciata di sezioni tematiche (Autenticazione, Famiglia & Prenotazioni, Insegnanti, Contenuti didattici, Pagamenti & Fatturazione, Notifiche, Anagrafiche geografiche, Amministrazione) leggendo le categorie generate per etichetta, non copiandole a mano — quindi resta valido dopo ogni rigenerazione. La stessa funzione (`buildApiSidebar`) costruisce sia la sidebar di produzione che quella di sviluppo, a partire dai rispettivi `docs/api/sidebar` e `docs/api-develop/sidebar` generati. Per aggiungere un nuovo tag a un gruppo esistente, basta aggiungerne il nome all'array corrispondente in `sidebars.ts`; un tag presente nello spec generato ma non ancora assegnato a nessun gruppo (in uno qualsiasi dei due ambienti) fa fallire la build con un errore esplicito, così non sparisce mai silenziosamente dalla sidebar.

## Scrivere una guida

Aggiungi un file Markdown in `docs/guides/`, poi referenzialo in `sidebars.ts` sotto `guidesSidebar`. Nessuna convenzione di "sezione per sviluppatori frontend / sezione per non sviluppatori": si scrive un unico testo scorrevole, con le informazioni tecniche necessarie intrecciate nella spiegazione — chi legge sa già cosa gli serve.

## Build e deploy

Build statica, nessun backend/DB/auth:

```bash
npm run build     # genera i file in build/
npm run serve     # serve la build localmente per un ultimo controllo
```

Il `Dockerfile`/`nginx.conf`/`docker-compose.yml` e i workflow in `.github/workflows/` sono invariati rispetto alla versione precedente: build Node → serve statico con nginx, deploy via SSH+Docker Compose sul server OVH (workflow manuale) o push immagine su ECR/DockerHub.

Ovunque giri `npm run build` (locale o nel workflow di deploy) deve poter raggiungere `formandopercorsi-backend` in uno dei due modi descritti in "Aggiornare lo spec API" — un `GITHUB_TOKEN`/`GH_TOKEN` con permesso di lettura su quel repo va quindi configurato come secret dove gira la build, se non si usa `BACKEND_REPO_PATH`.
