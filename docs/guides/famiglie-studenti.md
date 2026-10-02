---
title: Famiglie e studenti
---

# Famiglie e studenti

La famiglia è l'unità con cui la piattaforma ragiona per tutto ciò che riguarda la prenotazione e il pagamento: è la famiglia che prenota, paga, matura credito e riceve i documenti, mentre lo studente è il destinatario della lezione. Questa pagina descrive come una famiglia nasce, come sono gestiti studenti, materie e indirizzi, e quali dati di una famiglia condizionano la ricerca. Gli endpoint sono nelle sezioni [Family](/api/family), [Family Students](/api/family-students), [Family Student Subjects](/api/family-student-subjects), [Family Addresses](/api/family-addresses) e [Family Favourite Teachers](/api/family-favourite-teachers) della API Reference.

## Composizione

| Elemento | Descrizione |
| --- | --- |
| **Genitore di riferimento** | L'utente che si registra, accede, prenota e paga per conto della famiglia. È l'unico membro con credenziali di accesso. |
| **Studenti** | Uno o più utenti destinatari delle lezioni. Non accedono alla piattaforma: sono gestiti dal genitore. |
| **Indirizzo di fatturazione** | L'indirizzo intestatario dei documenti. La sua **città** è anche quella che determina il listino applicato e la scuola esterna di competenza (si vedano [Pagamenti](/guides/pagamenti) e [Scuole esterne](/guides/scuole-esterne)), e l'ambito delle promozioni legate a una città. |
| **Indirizzi delle lezioni** | Gli indirizzi presso cui si svolgono le lezioni a domicilio, distinti da quello di fatturazione. |
| **Sede di riferimento** | La sede a cui la famiglia fa capo, facoltativa. |
| **Insegnanti preferiti** | Gli insegnanti con cui la famiglia ha già lavorato. |
| **Credito** | Il saldo maturato con il programma referral; si veda [Crediti e programma referral](/guides/referral-crediti). |

## Registrazione

La registrazione crea in un'unica transazione il genitore, la famiglia con il suo indirizzo di fatturazione, il primo indirizzo delle lezioni ed eventualmente il primo studente, e accredita alla famiglia il credito di benvenuto quando è stata invitata da un'altra famiglia. L'account nasce **inattivo**: viene attivato dal collegamento di conferma inviato per email. La registrazione richiede l'accettazione delle condizioni generali per le famiglie, il cui testo è esposto dalla sezione [Contract](/api/contract).

L'accesso è possibile anche con Google; in quel caso le condizioni vanno accettate al primo accesso, come descritto in [Autenticazione](/guides/autenticazione#accesso-tramite-google).

Il cambio dell'indirizzo email segue lo stesso schema in due tempi degli insegnanti: il nuovo indirizzo diventa effettivo solo dopo la conferma tramite il collegamento ricevuto, valido 24 ore.

## Studenti

Ogni studente è associato a una **scuola** e a un **anno di corso**, e ha un insieme di **materie** scelte fra quelle insegnate in quella scuola. Questi tre dati determinano che cosa lo studente può prenotare: la ricerca propone solo gli insegnanti che coprono la materia per quella scuola e quella classe. Facoltativamente uno studente ha un proprio indirizzo email, a cui — con il suo consenso — sono inviati anche i promemoria delle lezioni.

Alcune regole governano la coerenza di questi dati:

- **Un cambio di scuola elimina le sole materie che la nuova scuola non insegna**, mantenendo le altre. Non viene rifiutato l'aggiornamento né chiesto di riselezionare tutto: una selezione vuota è uno stato che il percorso di prenotazione sa già segnalare.
- **Il passaggio di classe annuale** fa avanzare ogni studente di un anno e, a chi ha concluso un ciclo (5ª primaria, 3ª secondaria di primo grado, 5ª secondaria di secondo grado, 5° anno di università), azzera scuola e anno di corso. Uno studente senza scuola o senza anno non può prenotare finché la famiglia non li seleziona di nuovo; le lezioni già in calendario restano invece modificabili con lo stesso insegnante. Si vedano [Notifiche](/guides/notifiche#passaggio-di-classe) e [Modifiche e cancellazioni delle lezioni](/guides/modifiche-cancellazioni).
- **Il profilo del genitore deve essere completo** perché uno studente possa prenotare: è uno dei controlli del percorso di prenotazione, verificabile con la [diagnostica](/guides/diagnostica-prenotazioni).

L'applicazione web, all'apertura di una qualunque pagina della famiglia, presenta una finestra per ogni studente con un passaggio di classe ancora da confermare, e non consente di prenotare per quello studente finché la famiglia non ha confermato la promozione o scelto la nuova scuola. Il blocco legato alla sola conferma della promozione è una regola del client; quello legato alla scuola azzerata è applicato anche dalla piattaforma.

## Indirizzi delle lezioni

Una famiglia può registrare più indirizzi presso cui svolgere lezioni a domicilio, uno dei quali è **predefinito**. Le regole:

- **Ogni indirizzo è geolocalizzato al momento del salvataggio.** Un indirizzo che il servizio di geolocalizzazione non riconosce viene rifiutato, così che la famiglia possa correggerlo: un indirizzo senza coordinate non potrebbe ospitare lezioni a domicilio, perché la distanza dall'insegnante non sarebbe calcolabile.
- **Esiste sempre esattamente un indirizzo predefinito**: il primo inserito lo diventa automaticamente, impostarne un altro come predefinito toglie la qualifica al precedente, ed eliminare il predefinito la trasferisce a un altro indirizzo.
- **La lezione conserva una copia dell'indirizzo scelto.** Modificare o eliminare un indirizzo non tocca le lezioni già prenotate.
- Un indirizzo eliminato non viene cancellato ma marcato come tale.

Alla prenotazione di una lezione a domicilio conviene indicare sempre l'indirizzo: in sua assenza la piattaforma usa quello predefinito, che può non essere entro il raggio d'azione dell'insegnante scelto. Si veda [Applicazione web](/guides/guida-frontend#regole-che-risiedono-nel-client).

## Insegnanti preferiti

Un insegnante entra automaticamente fra i preferiti della famiglia quando la famiglia prenota con lui una lezione o un percorso; la famiglia può anche aggiungerlo o toglierlo esplicitamente, e l'amministrazione può gestire i preferiti di qualunque famiglia. I preferiti sono l'elenco di insegnanti che il percorso di prenotazione propone quando la famiglia sceglie di rivolgersi a un insegnante già noto, anziché cercarne uno fra tutti i disponibili; si vedano [Percorsi formativi](/guides/percorsi-formativi) e [Ordinamento dei risultati di ricerca](/guides/ranking-insegnanti), dove la continuità con lo studente è uno dei fattori dell'ordinamento.

## Che cosa vede la famiglia

| Area | Contenuto |
| --- | --- |
| **Home** | Le lezioni prenotate, con il calendario e lo storico; la prenotazione di una singola lezione; la modifica o la cancellazione di una lezione e la risposta alle richieste di modifica dell'insegnante; il credito e il programma di invito. |
| **Percorsi formativi** | La prenotazione di un pacchetto di lezioni; si veda [Percorsi formativi](/guides/percorsi-formativi). |
| **Documenti** | Le fatture, le ricevute e le note di credito intestate alla famiglia. |
| **Profilo** | Dati del genitore, studenti, indirizzi, password. |
| **Esercizi** | L'elenco delle materie; la pagina è predisposta per i [contenuti didattici](/guides/contenuti-didattici), non ancora pubblicati alle famiglie. |

## Eliminazione

Il genitore può eliminare il proprio account e, singolarmente, uno degli studenti della famiglia. L'eliminazione è **logica**: l'utente passa allo stato eliminato e non può più accedere né essere usato per prenotare, mentre ordini, lezioni e documenti restano, perché sono dati economici e fiscali da conservare.

L'eliminazione di uno studente è rifiutata finché ha lezioni future ancora attive — prenotate, pagate, gratuite, in attesa di risposta a una modifica, o cancellate dall'insegnante e non ancora risolte: vanno prima cancellate, così che nessuna lezione resti nel calendario di un insegnante per una famiglia che non la vede più. L'applicazione web non espone ancora questa funzione.
