---
title: Panoramica della piattaforma
---

# Panoramica della piattaforma

Formando PerCorsi mette in relazione famiglie che cercano lezioni private e insegnanti che le erogano, amministrando per conto di entrambi tutto ciò che la prenotazione comporta: verifica delle disponibilità, determinazione del prezzo, incasso, ripartizione dei compensi e adempimenti fiscali.

Questa pagina descrive i soggetti coinvolti, il ciclo di vita di una lezione e le componenti che compongono il sistema. Le singole aree sono approfondite nelle guide dedicate.

## Soggetti

| Soggetto | Ruolo |
| --- | --- |
| **Famiglia** | Unità di riferimento per la prenotazione e il pagamento. È composta da un genitore di riferimento (*paterfamilias*), eventuali altri tutori e uno o più studenti. Endpoint: [Family](/api/family), [Family Students](/api/family-students). |
| **Studente** | Destinatario della lezione. È associato a una scuola e a un anno di corso, da cui dipendono le materie prenotabili. Endpoint: [Family Student Subjects](/api/family-student-subjects). |
| **Insegnante** | Dichiara le proprie disponibilità, le materie e i livelli scolastici che può coprire, ed eroga le lezioni. Endpoint: [Teacher](/api/teacher). |
| **Scuola esterna di competenza** | Partner locale che presidia una determinata area geografica e ha diritto a una quota sugli ordini delle famiglie che vi risiedono. Di norma è anche il soggetto che incassa il pagamento e che successivamente gira all'insegnante la quota dovuta, ma non sempre: si veda [Scuole esterne, provider e incasso](/guides/scuole-esterne). La piattaforma stessa può presidiare un territorio nella medesima veste. |
| **Amministrazione** | Gestisce anagrafiche, candidature degli insegnanti, configurazione dei prezzi, delle fasce di ore e delle promozioni, territori delle scuole esterne, verifica dei pagamenti e reportistica. Endpoint: [Admin - Users](/api/admin-users), [Admin - Lessons](/api/admin-lessons), [Admin - Availability](/api/admin-availability), [Admin - Finance](/api/admin-finance); le aree più recenti — aggiornamenti tariffari, configurazione delle fasce di ore, liquidazioni, esecuzioni dei job, creazione e provisioning delle scuole esterne, monitoraggio, metriche di tracking e diagnostica delle prenotazioni — compaiono sotto Amministrazione nella [API Reference](/api/formando-percorsi-api) via via che raggiungono ciascun ambiente. Il quadro d'insieme è in [Area amministrativa e controllo operativo](/guides/amministrazione). |

Ai soggetti della piattaforma si affiancano tre servizi esterni con un ruolo funzionale rilevante: **Stripe** per incassi, trasferimenti e bonifici; **Acube** come intermediario verso il Sistema di Interscambio per la fatturazione elettronica; **Google Calendar** per la sincronizzazione degli impegni degli insegnanti.

## Ciclo di vita di una lezione

Il percorso che va dalla dichiarazione di disponibilità all'accredito del compenso attraversa quasi tutte le aree del sistema.

```
1. L'insegnante dichiara le proprie disponibilità
       └─► il sistema ne deriva gli slot effettivamente prenotabili

2. La famiglia cerca una lezione (materia, durata, modalità, orario)
       └─► il sistema propone gli insegnanti disponibili, ordinati per pertinenza

3. La famiglia conferma e paga
       └─► il prezzo tiene conto di eventuali promozioni, crediti e copertura assicurativa
       └─► l'incasso avviene sul conto dell'insegnante o della scuola esterna di competenza

4. La lezione viene erogata
       └─► cancellazioni e modifiche seguono regole diverse a seconda di chi le richiede
           e di quanto tempo manca all'inizio

5. A fine mese il sistema liquida i compensi
       └─► calcola le quote spettanti a ciascun soggetto, emette i documenti fiscali
           ed esegue i trasferimenti
```

Ciascuna fase è documentata in dettaglio:

| Fase | Guida | Riferimento API |
| --- | --- | --- |
| Accesso al sistema | [Autenticazione](/guides/autenticazione) | [Auth](/api/auth) |
| Dichiarazione e derivazione delle disponibilità | [Disponibilità](/guides/disponibilita) | [Availability](/api/availability), [Availability Group](/api/availability-group) |
| Ricerca e ordinamento degli insegnanti | [Ordinamento dei risultati di ricerca](/guides/ranking-insegnanti) | [Availability](/api/availability) |
| Prenotazione di più lezioni in un'unica soluzione | [Percorsi formativi](/guides/percorsi-formativi) | [Lesson](/api/lesson) |
| Prezzo, incasso, ripartizione e fatturazione | [Pagamenti, payout e fatturazione](/guides/pagamenti) | [Lesson](/api/lesson), [InvoiceLegislation](/api/invoice-legislation) |
| Modifica o cancellazione di una lezione già pagata | [Modifiche e cancellazioni delle lezioni](/guides/modifiche-cancellazioni) | [Lesson](/api/lesson) |
| Documenti emessi a fronte dei movimenti | [Documenti fiscali e ricevute](/guides/documenti-fiscali) | [InvoiceLegislation](/api/invoice-legislation) |
| Copertura assicurativa e sinistri | [Copertura assicurativa](/guides/assicurazione) | [Lesson](/api/lesson) |
| Crediti e programma di segnalazione | [Crediti e programma referral](/guides/referral-crediti) | [Family Referral](/api/family-referral) |
| Crediti maturati dagli insegnanti | [Crediti degli insegnanti](/guides/crediti-insegnanti) | [API Reference](/api/formando-percorsi-api) |
| Territori, incasso e abilitazioni delle scuole esterne | [Scuole esterne, provider e incasso](/guides/scuole-esterne) | [API Reference](/api/formando-percorsi-api) |
| Comunicazioni agli utenti | [Notifiche](/guides/notifiche) | [Notification](/api/notification) |
| Indicatori aggregati e reportistica | [Statistiche e indicatori](/guides/statistiche) | [Admin - Finance](/api/admin-finance) |
| Eventi di utilizzo e metriche | [Tracking degli eventi e metriche](/guides/tracking-metriche) | [API Reference](/api/formando-percorsi-api) |

## Componenti del sistema

**Applicazioni client.** Interfacce utente distinte per famiglie, insegnanti e amministrazione. Sono progetti separati e comunicano con la piattaforma esclusivamente tramite l'API REST documentata in questo sito. Le caratteristiche dell'applicazione web attualmente in uso, comprese le regole che risiedono solo nel client, sono descritte in [Applicazione web](/guides/guida-frontend).

**API REST.** Il punto di accesso unico a tutte le funzionalità. Autenticazione a token, formato JSON, contratto descritto nella [API Reference](/api/formando-percorsi-api). Non esiste un livello intermedio fra client e piattaforma: ogni regola di business è applicata lato server.

**Elaborazioni asincrone.** Una parte rilevante del comportamento della piattaforma non è innescata da una richiesta HTTP ma da lavorazioni pianificate: derivazione notturna delle disponibilità, calcolo degli indicatori usati per l'ordinamento in ricerca, liquidazione mensile dei compensi, promemoria delle lezioni, passaggio di classe annuale, scadenza delle coperture assicurative, decadenza delle richieste di modifica e delle cancellazioni non risolte, aggregazione delle metriche di utilizzo. Chi integra un client deve tenerne conto: alcuni dati cambiano senza che il client abbia compiuto alcuna azione. Ogni esecuzione è registrata e verificabile, come descritto in [Area amministrativa e controllo operativo](/guides/amministrazione).

Il **passaggio di classe annuale** merita una menzione a parte perché ha un effetto visibile alle famiglie: allo studente che ha concluso il proprio ciclo di studi vengono azzerati scuola e anno di corso, e finché la famiglia non ne seleziona una nuova quello studente non può prenotare lezioni. Le lezioni già in calendario restano invece modificabili con lo stesso insegnante, come descritto in [Modifiche e cancellazioni delle lezioni](/guides/modifiche-cancellazioni).

**Integrazioni esterne.** Incassi e trasferimenti su Stripe, fatturazione elettronica tramite Acube, sincronizzazione calendario e generazione dei collegamenti per le lezioni online tramite Google, invio di messaggi tramite email e WhatsApp.

## Glossario

| Termine | Significato |
| --- | --- |
| **Availability** | Fascia oraria che un insegnante dichiara come disponibile. |
| **Effective Availability** | Tempo che resta realmente libero dopo aver sottratto lezioni già prenotate e tempi di spostamento. |
| **Consecutive Availability** | Slot concretamente prenotabile, derivato da una Effective Availability per una specifica durata e modalità. |
| **Percorso formativo** | Insieme di lezioni prenotate in un'unica soluzione a condizioni economiche dedicate. |
| **Pricing band** | Fascia di ore mensili insegnate, da cui dipende la ripartizione del compenso fra insegnante e piattaforma. |
| **Provider** | Soggetto che incassa materialmente il pagamento di un ordine ed emette il documento alla famiglia: la scuola esterna di competenza, se presente e se incassa essa stessa, altrimenti l'insegnante. |
| **Scuola di competenza** | Scuola esterna che ha diritto alla quota su un ordine, indipendentemente da chi ne ha incassato il pagamento. |
| **Ricevuta predisposta** | Ricevuta per compenso occasionale emessa senza data e senza marca da bollo: diventa un documento valido solo dopo che l'insegnante ha apposto la marca, datato, firmato e caricato la scansione. |
| **Sinistro** | Evento che attiva la copertura assicurativa acquistata su un ordine, tipicamente una cancellazione a ridosso della lezione. |
| **Credito famiglia** | Importo maturato dalla famiglia, spendibile in automatico sulle prenotazioni successive. |
| **Credito insegnante** | Importo maturato dall'insegnante sulle lezioni scontate dal credito di una famiglia, speso come sconto sui documenti che gli vengono emessi in liquidazione. |
