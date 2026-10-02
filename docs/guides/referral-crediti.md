---
title: Crediti e programma referral
---

# Crediti e programma referral

Ogni famiglia dispone di un collegamento di invito personale. Una famiglia che si registra tramite quel collegamento riceve subito un **credito di benvenuto**, spendibile già sulla prima lezione; la famiglia che l'ha invitata matura il proprio credito quando la famiglia invitata completa il **primo pagamento entro il termine previsto** dalla registrazione. Il credito è in euro e viene speso automaticamente sulle prenotazioni successive.

Il credito viene applicato in fase di prenotazione riducendo l'importo dovuto fino a un minimo garantito, ed è riportato in fattura come riga di sconto distinta. Gli endpoint sono raggruppati nella sezione [Family Referral](/api/family-referral) della API Reference.

Il programma può essere disattivato integralmente con un interruttore nei parametri dell'applicazione, che come tutti gli interruttori funzionali richiede un rilascio del backend (si veda [Attività pianificate e comandi console](/guides/attivita-pianificate#interruttori-funzionali)).

:::note Stato di adozione
L'applicazione web espone il programma nella home della famiglia: collegamento di invito da copiare o condividere, invio dell'invito per email, saldo del credito, inviti in attesa e inviti andati a buon fine. Il codice contenuto in un collegamento di invito viene memorizzato dal browser alla prima visita di qualunque pagina e trasmesso automaticamente alla registrazione, quindi non esiste un campo da compilare a mano. Non è ancora presentato lo storico analitico dei movimenti di credito.
:::

## Operazioni disponibili

Tutte richiedono autenticazione e sono riservate al genitore di riferimento di una famiglia attiva. Le altre categorie di utenza ricevono `403`; in assenza di token valido la risposta è `401`.

**Collegamento di invito, saldo e stato degli inviti.**

```json
{
  "referral_link": "https://<frontend-url>/register?ref=aZ3kP9qLtR7mN2xW8vB4cJ1sD6fH0yUo",
  "balance": 3,
  "pending_invites": [
    {"paterfamilias_id": 32, "first_name": "Mario", "last_name": "Rossi", "created_at": "2026-08-13 11:45:06"}
  ],
  "completed_referrals": [
    {"paterfamilias_id": 41, "first_name": "Luisa", "last_name": "Bianchi", "referral_first_paid_lesson_at": "2026-08-20 09:12:33"}
  ]
}
```

**Invio dell'invito per email**, a fronte di un indirizzo destinatario. Un indirizzo assente o non valido produce `400`.

**Saldo e storico dei movimenti**, in ordine cronologico decrescente. Ogni movimento è classificato come credito maturato, credito utilizzato, credito ripristinato oppure rettifica dell'amministrazione; per quest'ultima la descrizione è la motivazione scritta dall'amministratore (si veda [Rettifiche dell'amministrazione](#rettifiche-dellamministrazione)).

:::caution Tipi dei valori restituiti
Il saldo è restituito come valore numerico, mentre l'importo dei singoli movimenti è una **stringa** decimale. La conversione va effettuata prima di qualunque somma o confronto.
:::

Il collegamento di invito conduce alla pagina di registrazione con il codice in parametro. Il client deve leggerlo e trasmetterlo nella registrazione della famiglia come token di riferimento: il campo è facoltativo e, in sua assenza, la registrazione prosegue normalmente.

## Maturazione del credito

```
1. La famiglia A condivide il proprio collegamento di invito

2. La famiglia B si registra utilizzandolo
       └─► il riferimento alla famiglia invitante viene memorizzato
       └─► credito di benvenuto alla famiglia B, nella stessa transazione della registrazione
       └─► la registrazione prosegue anche se il codice è assente o non valido

3. La famiglia B paga la prima lezione
       └─► verifica che il pagamento ricada nel termine previsto dalla registrazione
       └─► controllo antifrode
       └─► accredito alla famiglia A
```

Il credito di benvenuto è scritto nella stessa transazione della registrazione: se non può essere scritto, la registrazione non va a buon fine. Il credito della famiglia invitante, invece, non viene riconosciuto se il primo pagamento avviene oltre il termine previsto dalla registrazione della famiglia invitata. Conta come primo pagamento anche una lezione scontata con il credito di benvenuto — il prezzo minimo garantito impedisce che diventi gratuita — mentre una lezione resa gratuita da una [promozione](/guides/promozioni) non passa dal pagamento e non conta.

Le famiglie invitate registrate prima che il credito di benvenuto fosse anticipato alla registrazione, e che non hanno ancora pagato, lo ricevono al primo pagamento insieme all'accredito della famiglia invitante, come avveniva in precedenza.

## Applicazione del credito

Il credito disponibile viene applicato automaticamente alla prenotazione successiva, entro il limite che garantisce un prezzo orario minimo:

```
sconto massimo   = prezzo totale − (prezzo minimo orario × ore totali)
credito applicato = min(saldo disponibile, sconto massimo)
```

Se il prezzo totale è già pari o inferiore al minimo garantito, il credito non viene applicato. In fase di pagamento lo sconto è rappresentato come riduzione dedicata, così da risultare visibile alla famiglia.

Il prezzo orario minimo non è soltanto una tutela commerciale: garantisce **per costruzione** che resti margine sufficiente a coprire le quote di piattaforma e scuola esterna, evitando che il costo della promozione possa arrivare a incidere sul compenso dell'insegnante.

## Ripartizione del credito sui compensi

Un ordine su cui è stato applicato un credito richiede attenzione particolare in fase di liquidazione, perché l'importo registrato sull'ordine è **già al netto** dello sconto. Se le quote spettanti a ciascun soggetto venissero calcolate direttamente su quell'importo, il credito risulterebbe detratto due volte e la differenza ricadrebbe interamente sul compenso dell'insegnante.

Il credito viene quindi reintegrato prima del calcolo delle quote e successivamente assorbito secondo una precisa gerarchia:

```
quota variabile di piattaforma → quota della scuola esterna → quota fissa di piattaforma → compenso dell'insegnante
```

Il compenso dell'insegnante è l'ultima voce aggredibile e, grazie al prezzo minimo garantito descritto sopra, non viene di fatto mai raggiunta. Il principio è che **l'insegnante è estraneo all'iniziativa promozionale**: il costo di acquisizione è a carico della piattaforma ed eventualmente della scuola esterna. La ripartizione effettiva è registrata per ciascuna lezione, così da restare verificabile.

Esiste una configurazione, oggi disattivata, che rovescia deliberatamente questa gerarchia facendo assorbire lo sconto all'insegnante e riconoscendogli in cambio un credito di pari importo: è descritta in [Crediti degli insegnanti](/guides/crediti-insegnanti).

## Restituzione del credito

Il credito speso torna disponibile in due casi, entrambi idempotenti e mai oltre quanto l'ordine aveva effettivamente speso:

- **Sessione di pagamento scaduta.** La prenotazione non è mai avvenuta e viene restituito il credito dell'intero ordine.
- **Cancellazione rimborsata di una lezione.** Quando una lezione pagata anche con credito viene rimborsata — per cancellazione della famiglia, oppure per la risoluzione con rimborso, richiesto o per decorrenza del termine, di una [cancellazione dell'insegnante](/guides/modifiche-cancellazioni) — viene restituita la parte di credito attribuita a quella lezione. La restituzione avviene nella stessa transazione dello storno dell'eventuale [credito maturato dall'insegnante](/guides/crediti-insegnanti) sulla stessa lezione, e non dipende dall'interruttore del programma referral: disattivare il programma non deve trattenere credito che una famiglia ha già speso.

In liquidazione, sulle lezioni rimaste di un ordine viene ripartito soltanto il credito che l'ordine ha conservato, così che la parte restituita non venga assorbita una seconda volta.

Lo spostamento di una lezione già pagata su un altro insegnante, invece, **non** restituisce credito: la famiglia ha pagato una volta e il credito applicato all'ordine resta tale.

## Rettifiche dell'amministrazione

L'amministrazione può **accreditare o rettificare** il credito di una famiglia, e consultarne lo storico completo, da operazioni dedicate. Una rettifica ha un importo con segno, diverso da zero, e una **motivazione obbligatoria**, che la famiglia vede come descrizione del movimento nel proprio storico; l'amministratore che l'ha scritta è registrato ma non è esposto alla famiglia. Una rettifica negativa che porterebbe il saldo sotto zero è rifiutata. Le rettifiche sono indipendenti dall'interruttore del programma. Le stesse operazioni esistono per il [credito degli insegnanti](/guides/crediti-insegnanti).

## Correttezza in caso di concorrenza

Due meccanismi garantiscono che il credito non possa essere riconosciuto o speso più volte:

- **In fase di maturazione**, il credito di benvenuto è scritto una sola volta perché la registrazione avviene una sola volta. Per il credito della famiglia invitante, la registrazione del primo pagamento funge insieme da marcatore temporale e da prenotazione atomica dell'operazione: solo la prima esecuzione ha effetto, e ciò copre sia i tentativi ripetuti di notifica da parte del sistema di pagamento sia eventuali richieste concorrenti. L'accredito avviene nella stessa transazione, cosicché un errore successivo annulli anche la prenotazione dell'operazione, che resta quindi ripetibile.
- **In fase di utilizzo**, la posizione della famiglia viene bloccata prima del calcolo del credito applicabile e fino al termine della transazione che lo detrae. Due prenotazioni simultanee della stessa famiglia non possono quindi leggere lo stesso saldo e spenderlo entrambe.

## Controllo antifrode

Su ogni ordine pagato viene registrata l'impronta dello strumento di pagamento utilizzato. Al momento dell'accredito il sistema verifica se lo stesso strumento abbia già pagato ordini della famiglia invitante.

Il controllo riguarda il credito della famiglia invitante, l'unico che dipende da un pagamento. In caso positivo il credito **viene comunque riconosciuto**: si tratta di un indizio, non di una prova di abuso. Il movimento viene però contrassegnato per revisione e l'amministrazione riceve una segnalazione. Il controllo è deliberatamente non bloccante, anche perché le impronte non sono garantite stabili fra conti diversi e possono quindi produrre mancati rilevamenti.

## Parametri di configurazione

| Parametro | Valore corrente | Significato |
| --- | --- | --- |
| Credito alla famiglia invitante | 3,00 € | Riconosciuto a chi ha inviato l'invito. |
| Credito di benvenuto alla famiglia invitata | 1,50 € | Riconosciuto alla registrazione tramite invito. |
| Termine per il primo pagamento | 14 giorni | Calcolato dalla registrazione della famiglia invitata; condiziona il solo credito della famiglia invitante. |
| Prezzo orario minimo garantito | 15,50 €/ora | Soglia sotto la quale il credito — e lo sconto di una [promozione](/guides/promozioni) — non viene applicato. |

## Limiti attuali

- **Il credito della famiglia invitante non viene annullato da un rimborso.** Se la lezione rimborsata era il primo pagamento della famiglia invitata, il credito già riconosciuto alla famiglia invitante resta.
- **Gli inviti inviati per email sono registrati solo da ottobre 2026**: le [statistiche del programma](/guides/statistiche#programmi-di-incentivo) sugli inviti partono da quel momento e lo dichiarano nella risposta.
- **Nessun limite** al numero di inviti che una singola famiglia può convertire in credito.
