---
title: Crediti degli insegnanti
---

# Crediti degli insegnanti

Il credito dell'insegnante è il lato simmetrico del [credito della famiglia](/guides/referral-crediti): quando una lezione viene erogata a un prezzo ridotto dal credito di una famiglia, l'insegnante che l'ha erogata **matura a sua volta un credito**, che spende come sconto automatico sulle fatture che la piattaforma e la scuola esterna di competenza emettono *nei suoi confronti* in liquidazione.

:::caution Stato di adozione
La funzionalità è completa lato server ma **disattivata per impostazione predefinita**: a interruttore spento la ripartizione e la liquidazione si comportano esattamente come prima, e nessun movimento viene registrato. Sposta denaro fra piattaforma e insegnanti, e viene quindi attivata dopo una verifica su un ambiente non di produzione, non contestualmente al rilascio.
:::

## Perché esiste, e cosa cambia nella ripartizione

Senza questa funzionalità lo sconto concesso alla famiglia viene assorbito in cascata dalle quote di piattaforma e di scuola esterna, e l'insegnante non ne sopporta di norma alcuna parte — è il comportamento descritto in [Crediti e programma referral](/guides/referral-crediti). Riconoscere all'insegnante un credito pari all'intero sconto, lasciando in vigore quella cascata, significherebbe che la piattaforma paga la promozione due volte.

L'ordine di assorbimento viene quindi **invertito**, e questa inversione è il cuore della funzionalità:

```
a interruttore spento   quota variabile di piattaforma → scuola esterna → quota fissa → insegnante
a interruttore acceso   insegnante (fino a capienza della sua quota) → quota variabile → scuola esterna → quota fissa
```

Con l'interruttore acceso, le quote di piattaforma e di scuola restano al **valore di listino** e lo sconto è assorbito dall'insegnante, che matura **esattamente quanto ha assorbito**. Importo maturato e importo assorbito sono lo stesso numero per costruzione: se divergessero, qualcuno sarebbe compensato due volte.

L'assorbimento è **limitato alla quota dell'insegnante**: oltre quella capienza torna in funzione la cascata precedente, perché un insegnante non può finanziare più di quanto guadagni sulla lezione. Una quota che risultasse comunque negativa è considerata un esito impossibile e interrompe la liquidazione di quell'insegnante con un errore registrato, anziché produrre un compenso negativo.

## Maturazione

La maturazione avviene **alla liquidazione della lezione**, non alla prenotazione e non al momento del bonifico. Alla prenotazione la ripartizione non esiste ancora e la lezione può ancora essere cancellata, spostata o rimborsata: maturare in quel momento richiederebbe un apparato di storno per eventi che la liquidazione filtra già da sé. Il bonifico, all'opposto, è aggregato per insegnante e non conosce più le singole lezioni, mentre la lezione è il grano naturale del fatto «su questa lezione l'insegnante ha assorbito un importo».

La registrazione avviene nella stessa transazione che porta la lezione a liquidata: è **stato della liquidazione**, non contabilità di servizio, e se non può essere scritta la lezione non deve risultare liquidata. Un'unica maturazione per lezione è garantita da un vincolo di unicità, cosicché rieseguire la liquidazione di un mese già chiuso resti l'operazione a vuoto che deve essere.

## Utilizzo

Il credito si spende **solo in liquidazione**: non esiste alcuna operazione con cui richiederne l'utilizzo.

Sono scontabili soltanto le posizioni in cui l'insegnante è il **soggetto che paga**, ossia il cliente del documento. Ne segue che:

- la posizione deve prevedere l'emissione di un documento *verso* l'insegnante, e il beneficiario deve essere la piattaforma o la scuola esterna di competenza;
- un documento scontato non è mai una ricevuta occasionale: le ricevute occasionali nascono dalle posizioni opposte, quelle in cui l'insegnante è il soggetto che incassa;
- un insegnante che **non** è provider non riceve alcuna fattura dalla piattaforma né dalla scuola, e il suo credito **resta a saldo** finché non diventa spendibile. È una conseguenza accettata, non una dimenticanza: diventa spendibile quando quell'insegnante inizia a incassare in prima persona, nei casi descritti in [Scuole esterne, provider e incasso](/guides/scuole-esterne).

Quando in un mese esistono due documenti verso lo stesso insegnante — quello della piattaforma e quello della scuola — l'ordine di utilizzo è deterministico: **prima la piattaforma, poi le scuole**. La piattaforma è la posizione che esiste sempre, mentre quella della scuola dipende dal territorio, e la stabilità dell'ordine garantisce che due esecuzioni sullo stesso stato producano la stessa allocazione.

Lo sconto **non può eccedere il documento**: ciò che avanza non viene speso e resta sul saldo per il mese successivo. Non è mai una quota per lezione, e non viene quindi ripartito sulle lezioni della posizione: la ripartizione per lezione descrive l'economia della lezione, mentre lo sconto è un fatto della relazione fra l'insegnante e chi gli fattura. Sul documento compare come **riga dedicata con importo negativo**, quindi visibile al destinatario.

La passata di sconto è eseguita dopo quelle di ritenuta, assicurazione e imposta di bollo, perché il suo limite è l'importo *definitivo* del documento e il bollo può ancora modificarlo. L'idempotenza non è un controllo aggiuntivo ma una proprietà della liquidazione: la riesecuzione di un mese già chiuso produce una differenza nulla, nessuna posizione e quindi nessun documento e nessuna spesa. **Qualunque modifica futura che rigenerasse le posizioni di un mese già liquidato spenderebbe il saldo due volte**: è la proprietà da tutelare.

## Consultazione

L'insegnante consulta il proprio saldo e lo storico dei movimenti da un unico endpoint, raggruppato nella [API Reference](/api/formando-percorsi-api) sotto la categoria dedicata al credito dell'insegnante. L'operazione è riservata all'insegnante attivo che la richiede e **non accetta alcun identificativo**: il ledger di un altro insegnante è irraggiungibile per costruzione.

Il saldo è **derivato** dalla somma dei movimenti, non conservato, come quello della famiglia. Ogni movimento è classificato come credito maturato, credito utilizzato o credito stornato, e riporta il riferimento alla lezione o al documento che lo ha originato.

:::caution Tipi dei valori restituiti
Come per il credito della famiglia, il saldo è un valore numerico mentre l'importo dei singoli movimenti è una **stringa** decimale: la conversione va effettuata prima di qualunque somma o confronto.
:::

## Limiti attuali

- **L'interruttore è spento**, quindi in produzione la ripartizione resta quella descritta in [Crediti e programma referral](/guides/referral-crediti) e nessun credito viene maturato.
- **Lo storno non è ancora collegato agli eventi che lo richiederebbero.** La registrazione di uno storno è prevista e disponibile, ma nessun flusso la invoca: il rimborso di una lezione già liquidata e il cambio di insegnante su una lezione già liquidata non riducono quindi il credito maturato. Quando verrà collegata, il saldo potrà legittimamente diventare negativo — l'insegnante può aver già speso ciò che viene stornato — e l'utilizzo leggerà il saldo come non negativo per non produrre mai uno sconto di segno rovesciato.
- **Nessuna rettifica manuale.** Non esiste alcuna operazione amministrativa che scriva sul ledger: un registro di denaro scrivibile via API si apre quando un processo lo richiede.
- **Nessun prospetto amministrativo dei saldi.** Il credito complessivamente maturato e non ancora speso — che è una passività — e l'elenco degli insegnanti che non riescono a spenderlo non sono al momento consultabili dall'area amministrativa.
