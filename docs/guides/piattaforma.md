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
| **Scuola esterna di competenza** | Partner locale che gestisce gli insegnanti di una determinata area geografica. Quando esiste copertura per la città della famiglia, è il soggetto che incassa il pagamento e che successivamente gira all'insegnante la quota dovuta. |
| **Amministrazione** | Gestisce anagrafiche, candidature degli insegnanti, configurazione dei prezzi, verifica dei pagamenti e reportistica. Endpoint: [Admin - Users](/api/admin-users), [Admin - Lessons](/api/admin-lessons), [Admin - Availability](/api/admin-availability), [Admin - Finance](/api/admin-finance). |

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
| Copertura assicurativa e sinistri | [Copertura assicurativa](/guides/assicurazione) | [Lesson](/api/lesson) |
| Crediti e programma di segnalazione | [Crediti e programma referral](/guides/referral-crediti) | [Family Referral](/api/family-referral) |
| Comunicazioni agli utenti | [Notifiche](/guides/notifiche) | [Notification](/api/notification) |

## Componenti del sistema

**Applicazioni client.** Interfacce utente distinte per famiglie, insegnanti e amministrazione. Sono progetti separati e comunicano con la piattaforma esclusivamente tramite l'API REST documentata in questo sito. Le caratteristiche dell'applicazione web attualmente in uso, comprese le regole che risiedono solo nel client, sono descritte in [Applicazione web](/guides/guida-frontend).

**API REST.** Il punto di accesso unico a tutte le funzionalità. Autenticazione a token, formato JSON, contratto descritto nella [API Reference](/api/formando-percorsi-api). Non esiste un livello intermedio fra client e piattaforma: ogni regola di business è applicata lato server.

**Elaborazioni asincrone.** Una parte rilevante del comportamento della piattaforma non è innescata da una richiesta HTTP ma da lavorazioni pianificate: derivazione notturna delle disponibilità, calcolo degli indicatori usati per l'ordinamento in ricerca, liquidazione mensile dei compensi, promemoria delle lezioni, passaggio di classe annuale, scadenza delle coperture assicurative. Chi integra un client deve tenerne conto: alcuni dati cambiano senza che il client abbia compiuto alcuna azione.

**Integrazioni esterne.** Incassi e trasferimenti su Stripe, fatturazione elettronica tramite Acube, sincronizzazione calendario e generazione dei collegamenti per le lezioni online tramite Google, invio di messaggi tramite email e WhatsApp.

## Glossario

| Termine | Significato |
| --- | --- |
| **Availability** | Fascia oraria che un insegnante dichiara come disponibile. |
| **Effective Availability** | Tempo che resta realmente libero dopo aver sottratto lezioni già prenotate e tempi di spostamento. |
| **Consecutive Availability** | Slot concretamente prenotabile, derivato da una Effective Availability per una specifica durata e modalità. |
| **Percorso formativo** | Insieme di lezioni prenotate in un'unica soluzione a condizioni economiche dedicate. |
| **Pricing band** | Fascia di ore mensili insegnate, da cui dipende la ripartizione del compenso fra insegnante e piattaforma. |
| **Provider** | Soggetto che incassa materialmente il pagamento di un ordine: la scuola esterna di competenza, se presente, altrimenti l'insegnante. |
| **Sinistro** | Evento che attiva la copertura assicurativa acquistata su un ordine, tipicamente una cancellazione a ridosso della lezione. |
| **Credito famiglia** | Importo maturato dalla famiglia, spendibile in automatico sulle prenotazioni successive. |
