---
title: Introduzione
slug: /intro
---

# Documentazione di Formando PerCorsi

Formando PerCorsi è una piattaforma per l'erogazione di lezioni private. Le famiglie individuano e prenotano lezioni con insegnanti qualificati, il pagamento è gestito tramite Stripe, e il sistema amministra l'intero ciclo che ne consegue: disponibilità degli insegnanti, determinazione del prezzo, copertura assicurativa facoltativa, crediti, ripartizione dei compensi e fatturazione elettronica.

Questa documentazione descrive il funzionamento della piattaforma e l'interfaccia applicativa attraverso cui i client vi accedono.

## Struttura della documentazione

**Guide.** Descrivono i processi e le regole che governano ciascuna area della piattaforma: quali soggetti partecipano a un processo, in quale ordine avvengono le operazioni, quali condizioni determinano un esito piuttosto che un altro, quali vincoli vanno rispettati da chi integra il sistema.

**[API Reference](/api/formando-percorsi-api).** Documenta il contratto REST completo: per ogni endpoint, parametri, corpo della richiesta, struttura della risposta, codici di errore ed esempi eseguibili direttamente dal browser. È generata dalla specifica OpenAPI pubblicata dal backend ed è disponibile in due varianti, selezionabili dal menu "API Reference" nella barra di navigazione: ambiente di produzione e ambiente di sviluppo.

Le due parti sono complementari. Le guide rimandano alle sezioni corrispondenti della reference; la reference documenta il dettaglio di ogni singola operazione.

## Percorsi di lettura

| Obiettivo | Punto di partenza |
| --- | --- |
| Comprendere la piattaforma nel suo insieme | [Panoramica della piattaforma](/guides/piattaforma) |
| Integrare un client applicativo | [Autenticazione](/guides/autenticazione), poi l'area funzionale di interesse |
| Comprendere i flussi economici | [Pagamenti, payout e fatturazione](/guides/pagamenti) |
| Sviluppare sul backend | [Architettura del sistema](/guides/architettura) e [Ambiente di sviluppo locale](/guides/setup-locale) |
| Consultare il contratto di un endpoint | [API Reference](/api/formando-percorsi-api) |
