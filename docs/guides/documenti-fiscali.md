---
title: Documenti fiscali e ricevute
---

# Documenti fiscali e ricevute

Ogni movimento economico determinato dalla [liquidazione periodica](/guides/pagamenti) è accompagnato dal documento che il soggetto avente diritto emette verso il soggetto che deve pagare. Il tipo di documento, il canale con cui viene trasmesso e gli adempimenti che ne derivano dipendono dal **regime fiscale** del soggetto emittente. Questa pagina descrive i documenti previsti, il loro ciclo di vita e il trattamento particolare riservato alle prestazioni occasionali.

I regimi ammessi e i relativi vincoli sono esposti nella sezione [InvoiceLegislation](/api/invoice-legislation) della API Reference, che ne restituisce anche le etichette da mostrare all'utente. La consultazione dei documenti emessi e ricevuti, con accesso al PDF e all'XML, avviene dagli endpoint di fatturazione.

## Tipologie di documento

| Situazione | Documento emesso | Canale |
| --- | --- | --- |
| Dati fiscali completi e regime compatibile | Fattura elettronica | Sistema di Interscambio, tramite l'intermediario di fatturazione |
| Regime che richiede gestione manuale | Fattura esterna | Fuori dal canale telematico, confermata a posteriori |
| Prestazione occasionale | Ricevuta per compenso occasionale | Documento non fiscale, emesso dalla piattaforma o dal soggetto stesso |
| Rettifica in diminuzione | Nota di credito, o ricevuta di rimborso se il documento originario era una ricevuta | Lo stesso canale del documento rettificato |

Quando la posizione di un soggetto risulta negativa — come può accadere se il compenso assicurativo eccede le quote di piattaforma del mese — viene emessa una nota di credito, oppure, quando si tratta di un compenso effettivamente dovuto dalla piattaforma e non di una rettifica contabile, una fattura con le parti invertite.

## Ciclo di vita della fattura elettronica

Il percorso ordinario prevede l'invio al Sistema di Interscambio, l'accettazione e la consegna al destinatario. Sono possibili tre esiti non ordinari:

- **quarantena**, quando il primo tentativo di trasmissione non va a buon fine e il sistema ritenta automaticamente;
- **rifiuto**, per errori di contenuto o problemi tecnici;
- **mancata consegna**, nel caso di documento validamente emesso ma non recapitabile al destinatario.

Ogni transizione genera una notifica, come descritto in [Notifiche](/guides/notifiche). Le fatture esterne seguono un percorso parallelo e più breve: vengono registrate come da confermare e passano a confermate quando l'emittente dichiara di averle emesse con i propri strumenti.

## Rappresentazione a stampa

Il PDF di fatture, note di credito e ricevute è prodotto dalla piattaforma con un **unico modello**, così che ogni tipo di documento abbia la stessa forma: cambiano soltanto la dizione del documento e la presenza dello spazio per la marca da bollo e della riga per la sottoscrizione. All'intermediario di fatturazione resta la trasmissione telematica; il documento che il prodotto mostra è quello generato internamente. La generazione locale è disattivabile da configurazione, con ritorno al PDF prodotto dall'intermediario.

Quando la piattaforma emette materialmente un documento per conto di un altro soggetto, il documento riporta il **terzo intermediario o soggetto emittente**. L'informazione è registrata una sola volta sul documento e da lì raggiunge sia il tracciato telematico sia la stampa, che non possono quindi divergere. Nelle ricevute lo stesso fatto è dichiarato in forma discorsiva nelle note in calce, e non viene ripetuto due volte sulla stessa pagina.

Lo sconto derivante dal [credito della famiglia](/guides/referral-crediti) o da una [promozione](/guides/promozioni) compare come **riga dedicata con importo negativo**. Quando l'imposta di bollo di una fattura non è aggiunta al totale ma ricavata dalle righe, viene ripartita sulle sole righe positive: una riga di sconto conserva sempre esattamente il proprio importo, così che lo sconto stampato coincida con quello concesso.

## Prestazioni occasionali

Un insegnante in regime occasionale non emette fattura ma **ricevuta**. Due istituti si aggiungono al documento ordinario.

### Ritenuta d'acconto

La ritenuta si applica **solo quando il committente è sostituto d'imposta**: una scuola esterna, oppure la piattaforma. Una famiglia non lo è, e una ricevuta emessa a una famiglia non espone alcuna ritenuta. L'aliquota è quella configurata per il regime e l'importo calcolato viene congelato sul documento: l'aliquota può cambiare, un documento emesso no.

Che la ritenuta sia anche **effettivamente trattenuta** dal bonifico è una decisione di liquidazione, non del documento, e dipende da un parametro di configurazione attualmente disattivato: la ricevuta espone la ritenuta ma viene corrisposto il lordo. Quando il parametro è attivo, l'importo resta presso il committente, che lo versa con F24 e rilascia la Certificazione Unica: **entrambi gli adempimenti restano manuali**. La ritenuta non incide sui rimborsi di spese anticipate, che sono fuori dalla base imponibile.

L'importo indicato in ricevuta è sempre il **lordo del compenso**, coerente con le righe che la ricevuta somma; il netto è il lordo meno la ritenuta.

### Imposta di bollo

L'imposta di bollo è dovuta su una ricevuta non fiscale a partire da **77,47 €**, qualunque sia il committente — a differenza della ritenuta. Non viene mai addebitata al committente: resta fuori dalle righe e dal totale del documento, sul quale è registrata solo come annotazione insieme alla modalità con cui è stata assolta.

Le modalità sono tre e si escludono a vicenda.

| Modalità | Chi acquista la marca | Stato della ricevuta | Cosa deve fare l'insegnante |
| --- | --- | --- | --- |
| **Fisica** (predefinita) | L'insegnante | Predisposta, in attesa di bollo: priva di data, con lo spazio per la marca e la riga per la firma | Apporre la marca, datare, firmare e caricare la scansione |
| **Fisica a cura della piattaforma** | La piattaforma, su delega dell'insegnante | Emessa e **datata**, in attesa dell'adempimento della piattaforma | Nulla |
| **Virtuale** | Nessuno: il bollo è assolto in modo virtuale | Emessa e datata, senza spazio per la marca né riga per la firma | Nulla |

Una ricevuta **predisposta non è un documento valido**: diventa tale soltanto quando l'insegnante carica la scansione datata, firmata e provvista di marca. Finché ciò non avviene, l'insegnante riceve l'istruzione per email e una notifica in applicazione.

Nella modalità fisica a cura della piattaforma il documento è invece già datato, perché la piattaforma stampa, data, firma in nome dell'insegnante, applica e annulla la marca e spedisce l'**originale cartaceo** al committente in un'unica operazione: non resta nulla da completare a nessuno, la scansione è facoltativa e ciò che attesta l'adempimento è la sua registrazione, non il file. L'insegnante non riceve né notifica né istruzioni, perché non ha alcuna attività da svolgere. Va tenuto presente che in questa modalità il costo della marca sulle ricevute emesse alle famiglie è **a carico della piattaforma**: non genera alcun movimento nella liquidazione e viene recuperato, se recuperato, attraverso la quota di piattaforma prevista per il regime.

La modalità virtuale è ammessa perché la piattaforma forma e invia la ricevuta in nome e per conto dell'insegnante, e in quella veste può assolvere il bollo in modo virtuale citando in calce l'autorizzazione di cui dispone. Richiede che la funzionalità sia attiva, che numero e data dell'autorizzazione siano configurati e che l'insegnante abbia conferito la relativa delega; in mancanza di uno qualsiasi di questi elementi la ricevuta torna alla modalità fisica.

Le **due deleghe sono distinte**: quella con cui l'insegnante autorizza la piattaforma a formare e inviare la ricevuta in suo nome, e quella con cui la autorizza ad acquistare e apporre la marca fisica. Hanno presupposti differenti e possono essere conferite indipendentemente l'una dall'altra, dall'insegnante stesso.

### Le due code di adempimento

Alle ricevute non ancora provviste di marca corrispondono **due arretrati distinti**, tenuti deliberatamente separati perché sono dovuti da soggetti diversi: le ricevute che attendono la marca dell'**insegnante** e quelle che attendono l'adempimento della **piattaforma**, quest'ultima chiudibile dall'area amministrativa. Unirle nasconderebbe di chi è il problema. Entrambe sono descritte in [Area amministrativa e controllo operativo](/guides/amministrazione) ed escludono le ricevute annullate.

### Annullamento anziché rimborso

Se la famiglia sposta la lezione su un altro insegnante mentre una ricevuta è ancora predisposta, la ricevuta viene **annullata, non rimborsata**: era priva di data e di marca, quindi non è mai stata un documento valido e non c'è nulla da accreditare. Contestualmente decade la richiesta di apporre la marca, così che l'insegnante non continui a essere sollecitato. Una ricevuta già confermata segue invece il normale percorso della ricevuta di rimborso.

## Sintesi

- Il documento emesso dipende dal regime fiscale dell'emittente: fattura elettronica, fattura esterna o ricevuta occasionale.
- PDF e tracciato telematico derivano dallo stesso dato: non possono dichiarare cose diverse.
- Sulle ricevute occasionali la ritenuta d'acconto si applica solo verso committenti sostituti d'imposta; l'imposta di bollo è dovuta oltre soglia verso qualunque committente e non è mai addebitata al committente.
- Una ricevuta predisposta non è ancora un documento valido: lo diventa con la marca, la data, la firma e il caricamento della scansione.
- F24 e Certificazione Unica non sono automatizzati.
