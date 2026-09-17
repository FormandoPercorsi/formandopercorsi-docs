---
title: Pagamenti, payout e fatturazione
---

# Pagamenti, payout e fatturazione

Il pagamento di una lezione riguarda più soggetti: **l'insegnante** che la eroga, **la scuola esterna di competenza** che gestisce gli insegnanti di quella area geografica, quando presente, e **la piattaforma**, che trattiene una quota a fronte del servizio prestato. Questa pagina descrive come l'importo versato dalla famiglia viene incassato, ripartito e documentato fiscalmente.

## Principio di funzionamento

L'aspetto meno intuitivo dell'intero processo, e quello da chiarire per primo, è che **il pagamento della famiglia non viene accreditato sul conto della piattaforma**. L'importo viene incassato direttamente sul conto dell'insegnante o della scuola esterna che gestisce quella lezione. Solo in un momento successivo, con un'elaborazione periodica, il sistema determina quanto spetta a ciascun soggetto, esegue i trasferimenti corrispondenti, emette i documenti fiscali e dispone i bonifici verso i conti bancari.

```
Pagamento della famiglia
        │
        ▼
Incasso sul conto dell'insegnante o della scuola esterna di competenza
        │   l'importo resta qui fino alla liquidazione periodica
        ▼
[liquidazione] Determinazione delle quote spettanti
        │
        ├─► quota della piattaforma: documento fiscale e trasferimento
        ├─► se l'incasso era della scuola esterna: trasferimento della quota all'insegnante
        └─► bonifico bancario verso insegnante e scuola esterna
```

Il soggetto che incassa è definito **provider** dell'ordine: è la scuola esterna di competenza per la città della famiglia, se esiste copertura su quel territorio, altrimenti l'insegnante stesso. È quindi il soggetto che *detiene materialmente* le somme fino alla liquidazione.

## Composizione del prezzo

Il prezzo di una lezione non è calcolato in percentuale al momento della prenotazione: è un valore configurato dall'amministrazione per ogni combinazione di **durata della lezione**, **città di fatturazione della famiglia** e **regime fiscale dell'insegnante**, con una configurazione di riferimento applicata quando la città o il regime non hanno un listino dedicato.

I listini sono **versionati**: un aggiornamento non riscrive la tariffa esistente, ne crea una nuova versione che entra in vigore a una data stabilita. Fino a quel giorno i preventivi continuano a usare quella precedente, e uno storico permette di ritirare un aggiornamento sia prima che dopo la sua entrata in vigore. Una città senza listino proprio segue quello di riferimento finché non le viene aperto il suo, dopodiché va aggiornata a parte. Il prezzo resta comunque **congelato sull'ordine** al momento della prenotazione: un cambio di listino non tocca nulla di già venduto.

Per ciascuna combinazione sono definiti, come importi assoluti e non come percentuali:

| Componente | Descrizione |
| --- | --- |
| Prezzo | Importo a carico della famiglia. |
| Costi fissi di piattaforma | Quota fissa a copertura di oneri e gestione, indipendente dalla fascia dell'insegnante. |
| Quota variabile di piattaforma | Quota che la piattaforma trattiene, differenziata per fascia di ore insegnate. |
| Quota della scuola esterna | Quota spettante alla scuola di competenza, differenziata per fascia di ore insegnate. |

Le **fasce di ore** (*pricing band*) rappresentano il monte ore mensile effettivamente insegnato dal docente: più ore un insegnante eroga nel mese, più la ripartizione si sposta in suo favore.

Poiché la fascia di un insegnante dipende da tutte le lezioni che svolgerà nel mese, comprese quelle non ancora prenotate, **al momento della prenotazione non è possibile sapere quale ripartizione si applicherà**. Il sistema registra quindi sull'ordine tutte le ripartizioni possibili, una per fascia, e sceglie quella corretta soltanto in fase di liquidazione, quando il monte ore effettivo è noto.

Le fasce sono sempre quattro e i loro confini sono anch'essi **versionati**, per la stessa ragione per cui lo sono i listini, ma con una conseguenza più delicata: la liquidazione mensile riattribuisce la fascia al mese che sta chiudendo, e rieseguirla su un mese già chiuso deve restare un'operazione a vuoto. Se i limiti fossero un solo insieme modificabile, spostarne uno riattribuirebbe anche tutti i mesi già liquidati e sposterebbe denaro fra piattaforma e insegnante alla prima riesecuzione. Le fasce vengono quindi risolte **alla data del mese che si sta liquidando**, e un aggiornamento dei limiti non può avere decorrenza nel passato. La fascia a cui ciascuna lezione è stata effettivamente liquidata resta inoltre registrata sulla lezione stessa, che è l'unica fonte attendibile di quanto è stato davvero pagato.

Poiché i limiti determinano quanto ciascun insegnante percepisce, l'amministrazione dispone di un **prospetto di simulazione** che, mese per mese, mette a confronto tre letture: la distribuzione degli insegnanti ottenuta con i limiti in vigore in quel mese, quella con cui le lezioni sono state realmente liquidate, e quella che si otterrebbe con i limiti proposti. Le prime due possono legittimamente divergere per un insegnante prossimo a un confine, e rendere visibile quella divergenza è precisamente lo scopo di tenerle distinte.

Il prezzo proposto alla famiglia può inoltre essere modificato da un codice promozionale, dal credito eventualmente maturato dalla famiglia — si veda [Crediti e programma referral](/guides/referral-crediti) — e dall'eventuale acquisto della [copertura assicurativa](/guides/assicurazione).

## Incasso

La sessione di pagamento viene creata sul conto del provider dell'ordine, non su quello della piattaforma. Due comportamenti si discostano da questo schema:

- **Premio assicurativo.** Quando l'ordine comprende una copertura, il premio è impostato come commissione di piattaforma sul pagamento: viene quindi accreditato alla piattaforma **nello stesso istante del pagamento**, senza attendere la liquidazione periodica.
- **Rimborsi.** Un rimborso viene sempre eseguito sul conto su cui era avvenuto l'addebito originario — quello dell'insegnante o della scuola esterna — e mai su quello della piattaforma.

Le operazioni di prenotazione e pagamento sono raggruppate nella sezione [Lesson](/api/lesson) della API Reference; le fatture emesse e ricevute sono consultabili dagli endpoint di fatturazione, con accesso al documento in formato PDF e XML.

## Liquidazione periodica

L'elaborazione che determina e movimenta gli importi dovuti si basa su un registro dei movimenti, nel quale ogni importo è rappresentato da una coppia di soggetti:

- chi **detiene** materialmente le somme, ossia chi ha ricevuto il pagamento;
- chi ne ha **diritto economico**.

Quando i due coincidono l'importo è già nella disponibilità di chi ne ha diritto e non richiede alcun trasferimento, pur concorrendo al calcolo finale.

```shell
php yii payments/process-monthly-payouts [YYYY-MM]   # mensile, elabora il mese precedente
php yii payments/process-daily-payouts               # giornaliero, elabora gli ordini scaduti
```

L'elaborazione procede in quest'ordine:

1. Per ogni insegnante con lezioni nel periodo, determinazione della fascia di ore raggiunta — con i limiti in vigore nel mese che si sta liquidando, non con quelli odierni — e scomposizione di ciascuna lezione nelle tre quote spettanti a insegnante, scuola esterna e piattaforma.
2. Applicazione dell'imposta di bollo a carico delle scuole esterne, quando dovuta in base al regime fiscale dell'insegnante. L'onere resta sempre in capo alla scuola che ha incassato, mai all'insegnante.
3. Applicazione delle compensazioni assicurative, che rettificano gli importi già registrati. Avviene necessariamente prima del consolidamento, perché modifica le posizioni; si veda [Copertura assicurativa](/guides/assicurazione).
4. Consolidamento delle posizioni per soggetto avente diritto.
5. Per ogni soggetto che deve un importo alla piattaforma: emissione del documento fiscale e trasferimento della somma.
6. Per ogni insegnante avente diritto: se l'incasso era stato effettuato da una scuola esterna, emissione del documento e trasferimento dalla scuola all'insegnante; quindi un unico bonifico bancario per il totale spettante.
7. Bonifico bancario verso ciascuna scuola esterna per l'importo di sua competenza.

Le lezioni che cambiano fascia dopo essere già state elaborate vengono ricalcolate registrando **la sola differenza**: nessun importo già trasferito viene duplicato.

Ogni passaggio alimenta un rendiconto inviato all'amministrazione insieme ai documenti emessi, e consultabile anche dall'area amministrativa insieme alle somme effettivamente movimentate, lezione per lezione.

Un errore su un singolo soggetto non interrompe l'elaborazione degli altri: è una scelta deliberata, perché una posizione problematica non deve costare il compenso a tutti gli altri. Ne consegue però che un'elaborazione può concludersi correttamente pur avendo saltato qualcuno, quindi ogni esecuzione viene registrata insieme alle posizioni che non è riuscita a trattare: l'esito complessivo va sempre letto insieme a quell'elenco.

## Documenti fiscali

Il documento emesso a fronte di ciascun movimento dipende dal regime fiscale del soggetto che lo emette. I regimi ammessi e i relativi vincoli sono esposti nella sezione [InvoiceLegislation](/api/invoice-legislation).

| Situazione | Documento emesso |
| --- | --- |
| Dati fiscali completi e regime compatibile | Fattura elettronica trasmessa al Sistema di Interscambio |
| Regime che richiede gestione manuale | Fattura esterna, al di fuori del canale telematico |
| Prestazione occasionale | Ricevuta per compenso occasionale |

Il ciclo di vita di una fattura elettronica prevede l'invio, l'accettazione da parte del Sistema di Interscambio e la consegna al destinatario. Sono possibili tre esiti non ordinari: la **quarantena**, quando il primo tentativo di trasmissione non va a buon fine e il sistema ritenta automaticamente; il **rifiuto**, per errori di contenuto o problemi tecnici; la **mancata consegna**, nel caso in cui il documento sia stato validamente emesso ma non recapitabile al destinatario. Ogni transizione genera una notifica, come descritto in [Notifiche](/guides/notifiche).

Quando la posizione di un soggetto risulta negativa — come può accadere se il compenso assicurativo eccede le quote di piattaforma del mese — viene emessa una nota di credito, oppure, quando si tratta di un compenso effettivamente dovuto dalla piattaforma e non di una rettifica contabile, una fattura con le parti invertite.

## Sintesi

- La famiglia paga con carta; l'importo viene incassato dall'insegnante o dalla scuola esterna di competenza, non dalla piattaforma.
- Con cadenza mensile — e giornaliera per gli ordini scaduti o rimborsati — il sistema determina quanto spetta a ciascun soggetto in base alle ore effettivamente insegnate nel mese.
- L'elaborazione emette i documenti fiscali di ogni movimento e dispone i trasferimenti: prima la quota della piattaforma, poi, se l'incasso era della scuola esterna, la quota dell'insegnante, infine il bonifico bancario verso ciascun avente diritto.
- L'unica somma che non attende la liquidazione è il premio assicurativo, accreditato alla piattaforma contestualmente al pagamento.
- Un rimborso avviene sempre sul conto che aveva incassato.

## Limiti attuali

- Il credito applicato a un ordine non viene recuperato se la lezione corrispondente viene successivamente rimborsata. Si veda [Crediti e programma referral](/guides/referral-crediti).
- Non è disponibile alcuna interfaccia che esponga a insegnanti e famiglie lo storico analitico dei movimenti: i documenti fiscali restano l'unica rappresentazione consultabile dei flussi economici.
