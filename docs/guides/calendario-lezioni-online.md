---
title: Calendario e lezioni online
---

# Calendario e lezioni online

Le lezioni prenotate sulla piattaforma possono comparire nel calendario Google dell'insegnante, e le lezioni online possono ricevere automaticamente un collegamento Google Meet. Questa pagina descrive come funzionano le due integrazioni, che sono indipendenti fra loro, e come si collocano rispetto ai collegamenti inseriti a mano e ai promemoria. Le operazioni sono nella sezione [Auth](/api/auth) della API Reference (collegamento dell'account Google e attivazione delle due funzioni) e in [Lesson](/api/lesson) (collegamento di una singola lezione).

## Modello

L'integrazione è **interamente da server a server**: nessun client accede ai calendari, e l'insegnante non concede alla piattaforma alcun permesso sul proprio account Google.

```
Account di servizio della piattaforma
   │  possiede
   ▼
Calendario «della piattaforma» dedicato all'insegnante  ◄── eventi creati, aggiornati, rimossi
   │  condiviso in lettura (se l'insegnante lo attiva)       a ogni variazione della lezione
   ▼
Account Google dell'insegnante
```

- **Ogni insegnante ha un calendario dedicato**, creato in coda dei lavori al momento della registrazione e di proprietà della piattaforma. Gli eventi delle lezioni vengono scritti lì, che l'insegnante abbia o meno collegato un account Google.
- **La condivisione** rende quel calendario visibile nell'account Google dell'insegnante, che vede le proprie lezioni accanto agli altri impegni senza dover consultare la piattaforma. Disattivarla revoca la condivisione; il calendario continua a essere aggiornato.
- **I calendari degli insegnanti sono nascosti** dall'elenco dell'account di servizio, che ne possiede molti.

Gli eventi riportano materia, nome dello studente e orario, nel fuso `Europe/Rome`, e hanno come partecipanti l'insegnante e lo studente quando hanno un indirizzo email.

## Collegare l'account Google

L'insegnante collega il proprio account Google dal profilo, inviando il token rilasciato da Google; un account già collegato va scollegato prima di collegarne un altro. Dopo il collegamento due interruttori indipendenti sono disponibili:

| Funzione | Effetto | Requisiti |
| --- | --- | --- |
| **Sincronizzazione del calendario** | Condivide il calendario delle lezioni con l'account Google collegato e invia all'insegnante un'email di conferma. | Account Google collegato e calendario dell'insegnante già creato (avviene in background alla registrazione: se non è ancora pronto la richiesta va ripetuta poco dopo). |
| **Collegamenti Meet automatici** | Ogni nuova lezione **online** riceve un collegamento Google Meet. | Account Google collegato. |

Scollegare l'account Google revoca la condivisione e disattiva entrambe le funzioni.

Lo stesso account Google può essere usato anche per accedere alla piattaforma; si veda [Autenticazione](/guides/autenticazione#accesso-tramite-google).

## Sincronizzazione degli eventi

Ogni operazione che crea, modifica o cancella una lezione accoda un lavoro di sincronizzazione del relativo evento; le operazioni sono quindi **asincrone**, e un evento può comparire o aggiornarsi con qualche istante di ritardo rispetto alla lezione. Il lavoro è idempotente — un evento già creato non viene duplicato — e se l'evento da aggiornare non esiste più su Google ne crea uno nuovo. Gli errori temporanei dei servizi Google vengono ritentati dalla coda; gli altri sono registrati nei log con categoria `google_calendar` e non interrompono mai l'operazione sulla lezione, che resta valida indipendentemente dal calendario.

Per allineare a posteriori calendari e lezioni esistono due comandi, descritti in [Attività pianificate e comandi console](/guides/attivita-pianificate#recuperi-una-tantum): uno crea i calendari mancanti e risincronizza le lezioni recenti e future, l'altro nasconde i calendari creati prima che venissero nascosti automaticamente.

## Collegamenti alle lezioni online

Una lezione online può avere un collegamento alla stanza virtuale, mostrato a famiglia e insegnante nel dettaglio della lezione e incluso nell'email di promemoria. Il collegamento ha due origini:

- **Automatica**, quando l'insegnante ha attivato i collegamenti Meet: la stanza viene creata insieme all'evento e configurata con accesso aperto, così che lo studente entri senza attendere l'ammissione. Se l'apertura non riesce la stanza resta con la sala d'attesa predefinita di Meet.
- **Manuale**, quando l'insegnante inserisce un collegamento a sua scelta, anche di un servizio diverso da Meet, dal dettaglio della lezione.

Un collegamento inserito a mano **non viene mai sovrascritto** da quello generato automaticamente. Il collegamento Meet viene generato alla creazione dell'evento: attivare la funzione non lo aggiunge alle lezioni già sincronizzate.

## Promemoria

Circa venticinque minuti prima dell'inizio, una lezione pagata genera un promemoria via email alla famiglia e — se lo studente ha un proprio indirizzo e ha dato il consenso — allo studente, con il collegamento quando presente. È previsto anche il promemoria via WhatsApp alla famiglia che vi abbia acconsentito, attraverso un modello di messaggio approvato; il canale è però disattivato in entrambi gli ambienti (si veda [Ambienti di sviluppo e produzione](/guides/ambienti#posta-elettronica-e-whatsapp)). La cadenza dell'invio è descritta in [Attività pianificate e comandi console](/guides/attivita-pianificate).
