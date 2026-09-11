---
title: Crediti e programma referral
---

# Crediti e programma referral

Ogni famiglia dispone di un collegamento di invito personale. Quando una famiglia invitata tramite quel collegamento completa il proprio **primo pagamento entro il termine previsto** dalla registrazione, entrambe le famiglie maturano un credito in euro, spendibile automaticamente sulle prenotazioni successive.

Il credito viene applicato in fase di prenotazione riducendo l'importo dovuto fino a un minimo garantito, ed è riportato in fattura come riga di sconto distinta. Gli endpoint sono raggruppati nella sezione [Family Referral](/api/family-referral) della API Reference.

Il programma può essere disattivato integralmente da configurazione, senza necessità di un rilascio.

:::caution Stato di adozione
Le funzionalità sono complete lato server, ma l'applicazione web non espone al momento alcuna interfaccia per il collegamento di invito, il saldo o lo storico dei movimenti, né un campo per il codice di invito in fase di registrazione. Il programma non è quindi ancora visibile agli utenti finali.
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

**Saldo e storico dei movimenti**, in ordine cronologico decrescente. Ogni movimento è classificato come credito maturato, credito utilizzato o credito ripristinato.

:::caution Tipi dei valori restituiti
Il saldo è restituito come valore numerico, mentre l'importo dei singoli movimenti è una **stringa** decimale. La conversione va effettuata prima di qualunque somma o confronto.
:::

Il collegamento di invito conduce alla pagina di registrazione con il codice in parametro. Il client deve leggerlo e trasmetterlo nella registrazione della famiglia come token di riferimento: il campo è facoltativo e, in sua assenza, la registrazione prosegue normalmente.

## Maturazione del credito

```
1. La famiglia A condivide il proprio collegamento di invito

2. La famiglia B si registra utilizzandolo
       └─► il riferimento alla famiglia invitante viene memorizzato
       └─► la registrazione prosegue anche se il codice è assente o non valido

3. La famiglia B paga la prima lezione
       └─► verifica che il pagamento ricada nel termine previsto dalla registrazione
       └─► controllo antifrode
       └─► accredito a entrambe le famiglie
```

Il credito non viene riconosciuto se il primo pagamento avviene oltre il termine previsto dalla registrazione della famiglia invitata.

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

## Correttezza in caso di concorrenza

Due meccanismi garantiscono che il credito non possa essere riconosciuto o speso più volte:

- **In fase di maturazione**, la registrazione del primo pagamento funge insieme da marcatore temporale e da prenotazione atomica dell'operazione: solo la prima esecuzione ha effetto, e ciò copre sia i tentativi ripetuti di notifica da parte del sistema di pagamento sia eventuali richieste concorrenti. L'accredito alle due famiglie avviene nella stessa transazione, cosicché un errore successivo annulli anche la prenotazione dell'operazione, che resta quindi ripetibile.
- **In fase di utilizzo**, la posizione della famiglia viene bloccata prima del calcolo del credito applicabile e fino al termine della transazione che lo detrae. Due prenotazioni simultanee della stessa famiglia non possono quindi leggere lo stesso saldo e spenderlo entrambe.

## Controllo antifrode

Su ogni ordine pagato viene registrata l'impronta dello strumento di pagamento utilizzato. Al momento dell'accredito il sistema verifica se lo stesso strumento abbia già pagato ordini della famiglia invitante.

In caso positivo il credito **viene comunque riconosciuto**: si tratta di un indizio, non di una prova di abuso. Entrambi i movimenti vengono però contrassegnati per revisione e l'amministrazione riceve una segnalazione. Il controllo è deliberatamente non bloccante, anche perché le impronte non sono garantite stabili fra conti diversi e possono quindi produrre mancati rilevamenti.

## Parametri di configurazione

| Parametro | Valore corrente | Significato |
| --- | --- | --- |
| Credito alla famiglia invitante | 3,00 € | Riconosciuto a chi ha inviato l'invito. |
| Credito alla famiglia invitata | 1,00 € | Riconosciuto a chi si registra tramite invito. |
| Termine per il primo pagamento | 14 giorni | Calcolato dalla registrazione della famiglia invitata. |
| Prezzo orario minimo garantito | 14,00 €/ora | Soglia sotto la quale il credito non viene applicato. |

## Limiti attuali

- **Nessun recupero in caso di rimborso.** Se una lezione pagata con credito viene rimborsata, il credito speso non torna disponibile; se quel pagamento aveva determinato la maturazione di un credito, la maturazione non viene annullata. Il ripristino è previsto solo per le sessioni di pagamento scadute senza esito.
- **Nessun limite** al numero di inviti che una singola famiglia può convertire in credito.
