---
title: Autenticazione
---

# Autenticazione

L'accesso all'API è regolato da un token JWT di breve durata, accompagnato da un refresh token di durata più lunga conservato in un cookie `HttpOnly`. Le credenziali vengono trasmesse una sola volta, all'accesso; da quel momento il client rinnova il token in autonomia finché il refresh token resta valido.

Il contratto completo degli endpoint è nella sezione [Auth](/api/auth) della API Reference.

## Operazioni disponibili

| Operazione | Metodo e percorso | Descrizione |
| --- | --- | --- |
| Accesso | `POST /api/auth/signin` | Autenticazione con email, password e categoria utente (`family`, `teacher`, `admin`). |
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

## Evoluzioni previste

È prevista l'introduzione di **Passkey** (WebAuthn) come modalità di accesso senza password, basata su riconoscimento biometrico o dispositivi hardware. L'adozione richiederà sia la gestione della registrazione e verifica delle credenziali lato server, sia il supporto del flusso WebAuthn nei client.
