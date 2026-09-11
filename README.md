# formandopercorsi-docs

Sito di documentazione di Formando PerCorsi: guide discorsive + API reference generata dallo spec OpenAPI del backend, il tutto statico (nessun backend, nessun database, nessuna autenticazione), costruito con [Docusaurus](https://docusaurus.io/) e [docusaurus-plugin-openapi-docs](https://github.com/PaloAltoNetworks/docusaurus-openapi-docs).

> Questo repository è stato migrato dalla precedente versione basata su Create React App + [Redoc](https://github.com/Redocly/redoc) (che mostrava solo la reference API, fetchata a runtime dal backend). Il codice della vecchia versione resta in `legacy-cra/` per riferimento, non fa più parte della build.

## Struttura

```
docs/
  intro.md          # pagina di atterraggio delle guide
  guides/            # guide scritte a mano (Markdown)
  api/               # generato da docusaurus-plugin-openapi-docs, NON modificare a mano
openapi/
  formandopercorsi.yaml        # copia dello spec esportato dal backend (web/doc/openapi.yaml)
  formandopercorsi.docs.yaml   # generato da scripts/prepare-openapi.js, è quello che legge il plugin
scripts/
  prepare-openapi.js  # ripulisce lo spec prima della generazione (vedi sotto)
sidebars.ts           # sidebar "Guide" scritta a mano + sidebar "API Reference" raggruppata per tag
docusaurus.config.ts
```

## Sviluppo locale

```bash
npm install
npm run start        # dev server con hot reload, su http://localhost:3000
```

## Aggiornare lo spec API

Quando il backend cambia endpoint:

```bash
# 1. copia lo spec aggiornato dal repo backend
cp ../formandopercorsi-backend/web/doc/openapi.yaml openapi/formandopercorsi.yaml

# 2. rigenera le pagine di reference (include automaticamente la pulizia dello spec)
npm run gen-api-docs
```

`npm run build` esegue già `gen-api-docs` come primo passo, quindi non è un passo che si può dimenticare in produzione — ma se il backend rilascia un nuovo endpoint tra un deploy e l'altro, il sito docs non lo vedrà finché non viene ribuildato con lo spec aggiornato (l'endpoint reference **non** è più fetchata live dal browser come nella vecchia versione Redoc — vedi "Perché non fetch a runtime" più sotto).

### Cosa fa `scripts/prepare-openapi.js`

Lo spec esportato dal backend (via swagger-php) ha due difetti puramente cosmetici che il generatore di pagine erediterebbe altrimenti:

1. **Tag duplicati**: alcuni tag (es. `Family`, `Lesson`, `Topic`) compaiono più volte nell'elenco dei tag di primo livello, a volte con descrizioni diverse — senza dedup, il sito mostrerebbe due categorie diverse con lo stesso nome. Lo script tiene la descrizione più completa e scarta i duplicati.
2. **`operationId` illeggibili**: swagger-php assegna un `operationId` automaticamente, ma come hash opaco (es. `74fba823e08bb7452c422ae12a8376ac`), che il plugin usa sia come id della pagina generata sia come slug dell'URL. Lo script lo sostituisce con uno slug leggibile derivato da tag + summary (es. `auth-signin`).

Nessuno dei due tocca a quali endpoint appartiene un tag, né gli schema di richiesta/risposta — solo metadati di presentazione.

### Perché non fetch a runtime

La vecchia versione (Redoc) faceva fetch dello spec **a runtime nel browser**, quindi una singola build serviva sia l'ambiente di produzione che quello di sviluppo, sempre aggiornati senza rebuild. `docusaurus-plugin-openapi-docs` invece **pre-genera una pagina statica per endpoint al momento della build**: in cambio di dover rigenerare il sito quando l'API cambia, si ottengono pagine di reference integrate nella stessa ricerca/navigazione delle guide discorsive, con schema, esempi di codice in più linguaggi e pannello "prova l'endpoint" — cosa che una singola pagina Redoc non offriva.

## Organizzazione della sidebar "API Reference"

Il plugin genera una categoria per ogni tag OpenAPI (circa 30, in ordine di apparizione nello spec). `sidebars.ts` le **raggruppa** in una manciata di sezioni tematiche (Autenticazione, Famiglia & Prenotazioni, Insegnanti, Contenuti didattici, Pagamenti & Fatturazione, Notifiche, Anagrafiche geografiche, Amministrazione) leggendo le categorie generate per etichetta, non copiandole a mano — quindi resta valido dopo ogni rigenerazione. Per aggiungere un nuovo tag a un gruppo esistente, basta aggiungerne il nome all'array corrispondente in `sidebars.ts`; un tag nuovo non ancora assegnato a nessun gruppo farà fallire la build con un errore esplicito (non sparirà silenziosamente dalla sidebar).

## Scrivere una guida

Aggiungi un file Markdown in `docs/guides/`, poi referenzialo in `sidebars.ts` sotto `guidesSidebar`. Nessuna convenzione di "sezione per sviluppatori frontend / sezione per non sviluppatori": si scrive un unico testo scorrevole, con le informazioni tecniche necessarie intrecciate nella spiegazione — chi legge sa già cosa gli serve.

## Build e deploy

Build statica, nessun backend/DB/auth:

```bash
npm run build     # genera i file in build/
npm run serve     # serve la build localmente per un ultimo controllo
```

Il `Dockerfile`/`nginx.conf`/`docker-compose.yml` e i workflow in `.github/workflows/` sono invariati rispetto alla versione precedente: build Node → serve statico con nginx, deploy via SSH+Docker Compose sul server OVH (workflow manuale) o push immagine su ECR/DockerHub.
