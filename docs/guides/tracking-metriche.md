---
title: Tracking degli eventi e metriche
---

# Tracking degli eventi e metriche

La piattaforma raccoglie eventi di utilizzo inviati dai client e li trasforma in **metriche** configurabili, calcolate periodicamente e conservate per la reportistica. È un sottosistema deliberatamente separato dalle [statistiche](/guides/statistiche): queste ultime interrogano i dati di esercizio — lezioni, ordini, disponibilità — mentre le metriche descrivono il comportamento degli utenti prima e attorno a quei fatti.

L'architettura è a due strati: la **raccolta** degli eventi, che li accetta e li scrive nel flusso dei log, e l'**aggregazione**, che li rilegge periodicamente e ne ricava le metriche. La separazione è intenzionale: il volume degli eventi grezzi non viene scritto nella base dati transazionale, resta disponibile nei log per verifiche a posteriori, e ciò che viene conservato è già aggregato.

```
Client  ──POST──►  raccolta eventi  ──►  flusso dei log
                                              │
                            elaborazione pianificata di aggregazione
                                              │
                                    metriche primitive  ──►  metriche composte
                                              │
                                        risultati conservati  ──►  consultazione
```

## Raccolta degli eventi

L'invio avviene con un'unica operazione, la cui autenticazione è **facoltativa**: gli eventi di un visitatore non ancora registrato sono precisamente quelli che interessa raccogliere. Ogni evento dichiara il proprio tipo, un identificativo di sessione del browser e un insieme di dati specifici del tipo; l'orario può essere indicato o viene assunto quello di ricezione.

I tipi attualmente gestiti sono due:

| Evento | Dati richiesti | Uso tipico |
| --- | --- | --- |
| Visualizzazione di pagina | La pagina | Navigazione all'interno dell'applicazione |
| Atterraggio da una fonte | Il tipo di fonte, con identificativo e campagna facoltativi | Attribuzione del traffico, comprese le fonti non digitali |

La validazione è **specifica per tipo**: un evento che non porta i dati previsti dal proprio tipo viene rifiutato, così che l'aggregazione non debba difendersi da eventi incompleti. L'operazione è inoltre soggetta a un limite di frequenza per indirizzo di provenienza, e l'indirizzo non viene conservato in chiaro ma solo come impronta calcolata con un elemento segreto di configurazione.

Chi integra un client deve tenere presente che l'identificativo di sessione è generato **dal client** e deve restare stabile per l'intera sessione del browser: è la chiave con cui gli eventi vengono attribuiti a una stessa visita, e un identificativo rigenerato a ogni richiesta rende inutilizzabile qualunque metrica basata sulle sessioni.

## Metriche

Una metrica è una definizione amministrata, non una voce scritta nel codice: viene creata, modificata e disattivata dall'area amministrativa. Se ne distinguono due specie.

Una metrica **primitiva** aggrega direttamente gli eventi e risponde a domande elementari: quanti eventi, quante sessioni distinte, quanti utenti distinti, quanti eventi anonimi o autenticati, somma, minimo, massimo o numero di valori distinti di un campo dell'evento.

Una metrica **composta** non legge gli eventi: combina i risultati di altre metriche attraverso un'espressione, con operatori aritmetici e un insieme di funzioni disponibili. È il modo in cui si esprime un tasso di conversione o un'incidenza percentuale, ossia una grandezza che è un rapporto fra due misure e non una misura a sé.

A ciascuna definizione si associano **regole** di inclusione ed esclusione, valutate in ordine, che circoscrivono gli eventi da considerare in base al tipo e al valore dei loro campi. Le regole appartengono alla definizione, così che l'insieme degli eventi aggregati sia leggibile dalla definizione stessa e non dedotto dall'espressione.

Per consentire a un'interfaccia di comporre una definizione senza replicare alcun elenco, il sistema espone le **opzioni disponibili**: specie di metrica, tipi primitivi, tipi di regola, operatori, funzioni, tipi di risultato, eventi riconosciuti e metriche già definite a cui una metrica composta può fare riferimento. Sono l'unica fonte di quegli elenchi: ricostruirli nel client significa vederli divergere alla prima estensione.

## Calcolo e consultazione

Il calcolo è affidato a **elaborazioni pianificate**, in due cadenze — giornaliera e oraria — e può essere richiesto anche per una data determinata, tipicamente per recuperare un intervallo. L'esecuzione procede in un ordine obbligato: prima le metriche primitive, che leggono gli eventi, poi le composte, che leggono i risultati delle primitive. Come ogni attività pianificata, ciascuna esecuzione è registrata e verificabile secondo quanto descritto in [Area amministrativa e controllo operativo](/guides/amministrazione).

I risultati sono conservati per definizione e periodo e sono consultabili sia come serie di una singola definizione, sia come riepilogo, sia attraverso un'interrogazione complessiva su più definizioni.

## Superficie API

Le operazioni sono raggruppate nella [API Reference](/api/formando-percorsi-api) in tre categorie distinte: la raccolta degli eventi, che è aperta ai client; l'amministrazione delle definizioni, delle regole e dei risultati; e le opzioni disponibili per comporre una definizione.

## Limiti attuali

- **Gli eventi gestiti sono due.** Ogni nuovo tipo di evento richiede un rilascio, perché la validazione è specifica per tipo; le metriche che lo useranno, al contrario, non lo richiedono.
- **L'aggregazione dipende dal flusso dei log** dell'infrastruttura: un'esecuzione mancata non si recupera da sé, ma va ripetuta indicando la data.
- **Gli eventi grezzi non sono interrogabili** dal prodotto: ciò che il sistema espone sono le metriche calcolate.
