---
title: Applicazione web
---

# Applicazione web

L'applicazione web è il client attualmente in uso per famiglie, insegnanti e amministrazione. È un progetto distinto dalla piattaforma e comunica con essa esclusivamente tramite l'API REST documentata in questo sito.

Questa pagina descrive le scelte implementative del client, ossia i comportamenti che non discendono dal contratto REST e che quindi non sono deducibili dalla [API Reference](/api/formando-percorsi-api). Sono informazioni utili sia a chi lavora su questa applicazione, sia a chi ne realizza un'altra e deve sapere quali responsabilità ricadono sul client.

## Configurazione

| Variabile | Finalità |
| --- | --- |
| `REACT_APP_BACKEND_URL` | Indirizzo base della piattaforma. |
| `REACT_APP_GOOGLE_CLIENT_ID` | Accesso tramite Google. |
| `REACT_APP_GOOGLE_MAPS_KEY` | Selezione degli indirizzi su mappa. |
| `REACT_APP_ENCRYPTION_KEY` | Offuscamento dei dati di sessione conservati nel browser; si vedano le considerazioni in [Autenticazione](/guides/autenticazione). |
| `REACT_APP_ENABLE_LOGS` | Attivazione della registrazione applicativa estesa. |
| `REACT_APP_MAINTENANCE_MODE` | Se attiva, presenta una pagina di manutenzione su tutte le rotte a eccezione dell'area amministrativa. |

:::warning
La chiave per le mappe è referenziata dal codice ma non è inclusa nel file di configurazione versionato: va reperita separatamente per predisporre l'ambiente locale della selezione indirizzi.
:::

## Accesso all'API

Il client utilizza un'unica istanza del client HTTP, con un'intercettazione in uscita che applica il token di autenticazione a ogni richiesta e una in entrata che gestisce le risposte `401` attivando il rinnovo. La strategia di rinnovo completa è descritta in [Autenticazione](/guides/autenticazione).

## Ruoli e navigazione

Le tre categorie di utenza corrispondono ad altrettante aree dell'applicazione, con rotte separate. Un controllo di autorizzazione protegge ogni pagina: reindirizza alla schermata di accesso chi non è autenticato e impedisce l'accesso alle aree non pertinenti alla propria categoria.

## Regole che risiedono nel client

Il modello dati è descritto in [Disponibilità](/guides/disponibilita) e [Percorsi formativi](/guides/percorsi-formativi). Quanto segue riguarda invece decisioni prese dal client.

- **Interpretazione difensiva delle risposte di ricerca.** Alcune risposte possono presentarsi come elenco, come oggetto singolo o risultare assenti. Il client normalizza questi casi prima di utilizzarli; lo stesso vale per l'elenco delle sedi, esposto in [Headquarter](/api/headquarter).
- **Selezione automatica dello slot più prossimo.** Nei percorsi formativi le alternative sono restituite in ordine di vicinanza all'orario desiderato; in assenza di una corrispondenza esatta il client preseleziona la prima.
- **Gestione dell'indirizzo per le lezioni a domicilio.** Senza un indirizzo esplicitamente selezionato la piattaforma ricade sull'indirizzo predefinito della famiglia, e la verifica del raggio di copertura può fallire. Il client anticipa quindi la selezione o creazione dell'indirizzo, esposta in [Family Addresses](/api/family-addresses).
- **Soglia di 48 ore** per cancellazione e modifica, replicata nel client in due punti indipendenti. Corrisponde al parametro descritto in [Copertura assicurativa](/guides/assicurazione).
- **Codice promozionale applicato automaticamente** quando la piattaforma espone una promozione compatibile fra quelle disponibili in [Promotion](/api/promotion).
- **Assenza del campo di invito** nel modulo di registrazione, coerentemente con lo stato di adozione descritto in [Crediti e programma referral](/guides/referral-crediti).
- **Assenza di indicatori di ordinamento** nella presentazione degli insegnanti, che sono mostrati nella sequenza restituita dall'API; si veda [Ordinamento dei risultati di ricerca](/guides/ranking-insegnanti).

## Pagamenti e fatture

Il pagamento avviene tramite reindirizzamento completo del browser verso la pagina di pagamento, con pagine dedicate per l'esito positivo e per l'annullamento. In caso di annullamento il client rilascia esplicitamente l'ordine rimasto in sospeso, così da non lasciare prenotazioni pendenti.

Il flusso completo è descritto in [Pagamenti, payout e fatturazione](/guides/pagamenti).

## Notifiche

Le notifiche sono recuperate per interrogazione periodica ogni cinque minuti, con richieste aggiuntive dopo le azioni che possono generarne. Non è impiegato alcun canale in tempo reale. I tipi non gestiti sono elencati in [Notifiche](/guides/notifiche).

## Integrazioni

- **Accesso tramite Google**, con trasmissione del token rilasciato da Google e della categoria utente.
- **Mappe Google** per la selezione degli indirizzi.
- **Nessuna integrazione diretta con il calendario**: la sincronizzazione degli impegni degli insegnanti avviene interamente da server a server.

## Duplicazioni da mantenere allineate

Alcune informazioni sono replicate nel client e devono essere aggiornate quando cambiano lato piattaforma. Ogni voce di questo elenco è un punto di rottura silenzioso: una modifica lato server non produce un errore, ma un comportamento errato nell'interfaccia.

| Elemento duplicato | Conseguenza di un disallineamento |
| --- | --- |
| Sottoinsieme degli stati fattura rappresentati nell'interfaccia | Uno stato non previsto non viene presentato all'utente. |
| Estrazione della durata della lezione dal testo descrittivo della fattura | Una modifica alla formulazione della descrizione rende la durata non più leggibile. |
| Codice promozionale gestito in modo specifico | La promozione non viene più applicata automaticamente. |
| Soglia di 48 ore per cancellazione e modifica | L'interfaccia consente o impedisce azioni in modo difforme dalla piattaforma. |
| Corrispondenza fra tipo di notifica e testo presentato | Le notifiche non previste appaiono prive di significato. |

La dipendenza dal testo descrittivo della fattura è la più fragile dell'elenco, poiché trasforma una stringa destinata alla lettura umana in un contratto di fatto fra piattaforma e client.
