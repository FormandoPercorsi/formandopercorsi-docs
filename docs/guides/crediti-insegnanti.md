---
title: Crediti degli insegnanti
---

# Crediti degli insegnanti

Il credito dell'insegnante è il lato simmetrico del [credito della famiglia](/guides/referral-crediti): quando una lezione viene erogata a un prezzo ridotto dal credito di una famiglia o da una [promozione](/guides/promozioni) di sconto, l'insegnante che l'ha erogata **matura a sua volta un credito**, che spende come sconto automatico sulle fatture che la piattaforma e la scuola esterna di competenza emettono *nei suoi confronti* in liquidazione. Lo stesso saldo può essere alimentato da un indennizzo sulle lezioni gratuite e da rettifiche dell'amministrazione.

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

Il credito matura da tre sorgenti, che confluiscono nello stesso saldo e restano distinte nello storico:

| Sorgente | Importo maturato |
| --- | --- |
| Credito della famiglia | Quanto l'insegnante ha assorbito dello sconto prodotto dal credito della famiglia. |
| Promozione di sconto | Quanto l'insegnante ha assorbito dello sconto della promozione. |
| Indennizzo sulle lezioni gratuite | Un importo orario per ogni lezione resa gratuita da una promozione, descritto più avanti. |

Per le prime due sorgenti la maturazione avviene **alla liquidazione della lezione**, non alla prenotazione e non al momento del bonifico. Alla prenotazione la ripartizione non esiste ancora e la lezione può ancora essere cancellata, spostata o rimborsata: maturare in quel momento richiederebbe un apparato di storno per eventi che la liquidazione filtra già da sé. Il bonifico, all'opposto, è aggregato per insegnante e non conosce più le singole lezioni, mentre la lezione è il grano naturale del fatto «su questa lezione l'insegnante ha assorbito un importo».

La registrazione avviene nella stessa transazione che porta la lezione a liquidata: è **stato della liquidazione**, non contabilità di servizio, e se non può essere scritta la lezione non deve risultare liquidata. Un'unica maturazione per lezione è garantita da un vincolo di unicità, cosicché rieseguire la liquidazione di un mese già chiuso resti l'operazione a vuoto che deve essere.

### Indennizzo sulle lezioni gratuite

Una lezione resa gratuita da una promozione non passa dal pagamento e non entra nella liquidazione: non muove denaro e non conta per la fascia di ore. L'indennizzo riconosce all'insegnante, per ciascuna di queste lezioni, un credito pari a un **importo orario configurato moltiplicato per la durata** della lezione.

Lo matura la **liquidazione mensile**, per le lezioni gratuite iniziate nel mese che sta liquidando, prima di elaborare le lezioni ordinarie dell'insegnante — che potrebbe averne soltanto di gratuite — e prima della passata di utilizzo, così che l'indennizzo possa essere speso nella stessa esecuzione. Anche qui la maturazione è unica per lezione e una riesecuzione non scrive nulla. Poiché la lezione gratuita non viene liquidata, l'indennizzo non fa parte della transazione di liquidazione: un errore viene registrato come segnalazione dell'esecuzione e non trattiene la liquidazione dell'insegnante, e una riesecuzione completa ciò che manca.

L'indennizzo ha un proprio interruttore, ed è efficace solo se è acceso anche quello generale del credito degli insegnanti, senza il quale nessuno lo spenderebbe. L'importo orario è una decisione di prodotto ancora aperta e vale zero finché non viene fissato.

## Storno

Il credito **segue la lezione** che lo ha generato:

- quando una lezione viene **rimborsata** — per cancellazione della famiglia, oppure per la risoluzione con rimborso, richiesto o per decorrenza del termine, di una cancellazione dell'insegnante — le maturazioni dell'insegnante su quella lezione vengono stornate nella stessa transazione in cui la famiglia riceve indietro il proprio credito;
- quando la famiglia sposta una lezione già pagata su un **altro insegnante**, le maturazioni del primo vengono stornate all'interno dello spostamento; il nuovo insegnante matura alla liquidazione della lezione che subentra, che eredita il credito applicato all'ordine.

Uno storno è un movimento di segno opposto che punta a quello che annulla. Il saldo può quindi diventare **negativo**, perché l'insegnante può aver già speso ciò che viene stornato: in tal caso le maturazioni successive ripagano il debito, e l'utilizzo considera il saldo come non negativo, così da non produrre mai uno sconto di segno rovesciato.

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

Il saldo è **derivato** dalla somma dei movimenti, non conservato, come quello della famiglia. Ogni movimento è classificato per tipo — maturato su credito della famiglia, maturato su promozione, indennizzo su lezione gratuita, utilizzato, stornato, rettifica dell'amministrazione — e riporta il riferimento alla lezione o al documento che lo ha originato.

Accanto al saldo la risposta riporta il **credito in maturazione**: una stima, per singola lezione, di ciò che l'insegnante maturerà, con il relativo totale. Comprende le lezioni pagate e non ancora liquidate il cui ordine è stato scontato da un credito o da una promozione e, con l'indennizzo attivo, le lezioni gratuite dall'inizio del mese precedente non ancora indennizzate. La stima usa la stessa ripartizione della liquidazione, alla fascia più bassa: è la quota dell'insegnante più contenuta e quindi il limite più stretto, sicché la stima non promette mai più di quanto la liquidazione riconoscerà. È di sola lettura, resta fuori dal saldo e non è spendibile; a interruttore spento è vuota.

:::caution Tipi dei valori restituiti
Come per il credito della famiglia, il saldo è un valore numerico mentre l'importo dei singoli movimenti è una **stringa** decimale: la conversione va effettuata prima di qualunque somma o confronto.
:::

## Rettifiche dell'amministrazione

L'amministrazione può consultare il ledger completo di un insegnante, credito in maturazione compreso, e **accreditare o rettificare** il suo saldo con le stesse regole valide per le famiglie: importo con segno e diverso da zero, motivazione obbligatoria che l'insegnante vede nel proprio storico, amministratore registrato ma non esposto, rifiuto di una rettifica negativa che porterebbe il saldo sotto zero. Una rettifica non è una maturazione legata a una lezione, quindi nessuno storno la tocca, ed è possibile qualunque sia lo stato dell'interruttore.

Il credito complessivamente maturato e non ancora speso — che è una passività — è consultabile, con il dettaglio dei saldi positivi e negativi, nel [prospetto statistico dei crediti](/guides/statistiche#programmi-di-incentivo).

## Limiti attuali

- **L'interruttore è spento**, quindi in produzione la ripartizione resta quella descritta in [Crediti e programma referral](/guides/referral-crediti) e nessun credito viene maturato. È spento anche l'indennizzo sulle lezioni gratuite, il cui importo orario non è ancora stato fissato.
- **Un insegnante che non incassa in prima persona non può spendere il saldo**, come descritto sopra.
