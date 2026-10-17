---
title: Autenticazione
---

# Autenticazione

L'accesso all'API è regolato da un token JWT di breve durata, accompagnato da un refresh token di durata più lunga conservato in un cookie `HttpOnly`. Le credenziali vengono trasmesse una sola volta, all'accesso; da quel momento il client rinnova il token in autonomia finché il refresh token resta valido.

Il contratto completo degli endpoint è nella sezione [Auth](/api/auth) della API Reference.

## Operazioni disponibili

| Operazione | Metodo e percorso | Descrizione |
| --- | --- | --- |
| Accesso | `POST /api/auth/signin` | Autenticazione con email, password e categoria utente (`family`, `teacher`, `admin`, `external_school`). |
| Cambio di profilo | `POST /api/auth/switch-profile` | Passa a un altro profilo raggiungibile con le stesse credenziali, senza richiedere di nuovo la password. |
| Rinnovo | `POST /api/auth/refresh-token` | Emette un nuovo token JWT a partire dal refresh token. |
| Uscita | `DELETE /api/auth/refresh-token` | Invalida il refresh token lato server. |

:::note
L'uscita non dispone di un percorso dedicato: è una `DELETE` sullo stesso percorso usato per il rinnovo.
:::

## Durate e conservazione

- Il token JWT ha validità di **10 minuti**.
- Il refresh token ha validità di **30 giorni**.
- Il refresh token è conservato in un cookie `HttpOnly` limitato al percorso `/api/auth/refresh-token`, e non è quindi accessibile al codice JavaScript del client.

## Sequenza di accesso

1. `POST /api/auth/signin` con `email`, `password` e `category`. La risposta contiene il token JWT, il refresh token, la categoria e i dati dell'utente.
2. Ogni richiesta successiva riporta l'intestazione `Authorization: Bearer <token>`.
3. Alla scadenza del token, `POST /api/auth/refresh-token` restituisce un nuovo JWT.
4. `DELETE /api/auth/refresh-token` chiude la sessione.

```javascript
async function signin(email, password, category) {
  const response = await fetch('/api/auth/signin', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, password, category}),
  });
  return response.json(); // { token, refreshtoken, category, user }
}

async function refresh(refreshtoken) {
  const response = await fetch('/api/auth/refresh-token', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({refreshtoken}),
  });
  return (await response.json()).token;
}
```

## Profili con le stesse credenziali

Una stessa email e una stessa password possono aprire **più profili**: il caso è quello di una scuola esterna il cui responsabile insegna egli stesso, descritto in [Scuole esterne](/guides/scuole-esterne#il-gestore-che-insegna). Il comportamento è questo:

- all'accesso la **categoria** richiesta decide quale profilo si apre: con le credenziali della scuola, `external_school` apre la scuola e `teacher` apre l'insegnante da essa gestito. Prima una scuola esterna ricadeva, per la categoria, in quella della famiglia;
- la risposta riporta, accanto alla categoria, `profiles`: l'elenco delle categorie raggiungibili con quelle credenziali, per esempio `["external_school", "teacher"]`;
- `POST /api/auth/switch-profile` con `{"category": "teacher"}` apre una **nuova sessione** (token e refresh token) sull'altro profilo, senza password, e risponde con lo stesso corpo dell'accesso. Risponde `400` se la categoria è già quella in uso, `403` se con quelle credenziali non è raggiungibile alcun profilo attivo di quella categoria. Il cambio è registrato nel registro di audit;
- la password è sempre quella del titolare delle credenziali, qualunque profilo sia aperto: il cambio della password agisce su di essa, e una sessione aperta con credenziali altrui termina con esse;
- il cambio di profilo resta consentito anche quando il profilo corrente deve ancora accettare le condizioni: uscire da un profilo bloccato non può essere impedito. Si veda [Condizioni generali di contratto](/guides/condizioni-contrattuali).

Il client che conosce solo tre categorie deve essere esteso: una scuola esterna che accede riceve ora `external_school`.

## Gestione del rinnovo lato client

La breve durata del token rende necessaria una strategia di rinnovo esplicita. L'implementazione adottata dall'applicazione web combina due meccanismi indipendenti, ed è un riferimento utile per qualunque altro client:

- un **rinnovo reattivo**, che intercetta le risposte `401` e ritenta la richiesta dopo aver ottenuto un nuovo token;
- un **rinnovo preventivo**, che legge la scadenza dichiarata nel token e programma il rinnovo prima che si verifichi, con un controllo aggiuntivo quando l'applicazione torna in primo piano dopo un periodo in secondo piano.

Con entrambi attivi, il rinnovo avviene di norma in anticipo e una risposta `401` diventa un evento eccezionale anziché il meccanismo ordinario.

Due accorgimenti sono necessari perché il meccanismo sia corretto:

- Le richieste che ricevono `401` mentre un rinnovo è già in corso vanno **accodate** e rieseguite al termine, per evitare rinnovi multipli in parallelo.
- Gli endpoint di autenticazione stessi vanno **esclusi** dal ritentativo automatico: un loro `401` va propagato al chiamante, altrimenti si genera un ciclo di richieste.

Il fallimento di un rinnovo, dovuto a refresh token scaduto o non valido, va trattato come chiusura definitiva della sessione: azzeramento dello stato locale e ritorno alla schermata di accesso.

:::caution Conservazione dei dati di sessione lato client
La categoria utente restituita all'accesso può essere conservata dal client per determinare cosa mostrare nell'interfaccia, ma **non costituisce un controllo di sicurezza**: qualunque dato conservato nel browser è visibile e modificabile da chi vi ha accesso. L'unico controllo efficace è quello che il server esegue sul token a ogni richiesta. Anche la cifratura di questi valori lato client non muta la sostanza: una chiave distribuita all'interno del bundle pubblico non è un segreto, e l'operazione va considerata offuscamento, non protezione.
:::

## Accesso tramite Google

L'accesso può avvenire anche tramite Google, inviando il token rilasciato da Google insieme alla categoria utente. Nella risposta, un valore di `terms_and_conditions` pari a `0` indica che l'utente sta accedendo per la prima volta e deve ancora accettare i termini di servizio.

:::caution I termini sono versionati
`terms_and_conditions` dice soltanto se l'utente abbia **mai** accettato qualcosa: vale come accettazione della versione 2.0 delle condizioni e di nessuna successiva. Per sapere se l'utente debba accettare la versione in vigore, e per registrare l'accettazione, si usano `GET /api/contract/status` e `POST /api/contract/accept`, descritti in [Condizioni generali di contratto](/guides/condizioni-contrattuali). `POST /api/auth/accept-terms` imposta il solo flag e non sblocca più chi deve accettare una versione successiva alla 2.0.
:::

## Evoluzioni previste

È prevista l'introduzione di **Passkey** (WebAuthn) come modalità di accesso senza password, basata su riconoscimento biometrico o dispositivi hardware. L'adozione richiederà sia la gestione della registrazione e verifica delle credenziali lato server, sia il supporto del flusso WebAuthn nei client.
