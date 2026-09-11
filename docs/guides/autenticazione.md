---
title: Autenticazione
---

# Autenticazione

L'autenticazione è basata su **JWT** a vita breve più un **refresh token** più lungo, memorizzato in un cookie HttpOnly. Il pattern è quello classico: si scambiano le credenziali una volta, poi si rinnova il JWT in autonomia finché il refresh token resta valido.

## I tre endpoint

| Endpoint | Metodo | Cosa fa |
| --- | --- | --- |
| `/api/auth/signin` | POST | Login con email, password e categoria utente (`family`, `teacher`, `admin`). |
| `/api/auth/refresh-token` | POST | Rigenera il JWT usando il refresh token. |
| `/api/auth/refresh-token` | DELETE | Logout e invalidazione del refresh token. |

Nota la seconda riga: il logout **non** è un endpoint `/signout` a sé — è una `DELETE` sullo stesso path del refresh.

## Durate

- Il JWT scade dopo **10 minuti** (`params['jwt']['expire']`, 600 secondi).
- Il refresh token dura **30 giorni** (`params['jwt']['refreshTokenExpire']`).
- Il refresh token vive in un cookie HttpOnly, limitato al path `/api/auth/refresh-token` — non è mai leggibile da JavaScript.

## Il flusso

1. `POST /api/auth/signin` con `{email, password, category}` → risposta con `token` (JWT), `refreshtoken`, `category`, `user`.
2. Ogni richiesta successiva porta `Authorization: Bearer <token>`.
3. Quando il JWT scade, `POST /api/auth/refresh-token` con `{refreshtoken}` restituisce un nuovo JWT.
4. Il logout è una `DELETE /api/auth/refresh-token`, che invalida il refresh token lato server.

```javascript
async function login(email, password, category) {
  const response = await fetch('/api/auth/signin', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, password, category}),
  });
  return response.json(); // { token, refreshtoken, category, user }
}

async function refreshToken(refreshtoken) {
  const response = await fetch('/api/auth/refresh-token', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({refreshtoken}),
  });
  return (await response.json()).token;
}

async function logout() {
  await fetch('/api/auth/refresh-token', {method: 'DELETE'});
}
```

## Come si comporta in pratica un client che lo implementa bene

Il frontend web attuale (`formandopercorsi-frontend`) tiene **due meccanismi di refresh indipendenti** attivi insieme, ed è un pattern sensato da replicare altrove:

- un interceptor Axios che intercetta le risposte `401` e chiama il refresh **in modo reattivo**;
- uno scheduler proattivo che decodifica il JWT per leggerne la scadenza (`exp`) e programma il rinnovo **prima** che scada, più un refresh extra su `visibilitychange` se il token risulta scaduto quando la tab torna visibile dopo essere stata in background.

In pratica l'endpoint di refresh viene chiamato più spesso "in anticipo" che "per errore" — un `401` isolato è quindi un evento raro, non il meccanismo primario. Le richieste `401` concorrenti durante un refresh già in corso vengono accodate e rieseguite una volta ottenuto il nuovo token, invece di scatenare refresh multipli in parallelo. Gli endpoint di auth stessi (`signin`, `signup`, `password-reset`, `refresh-token`) vanno esclusi da questo retry automatico: un loro `401` va propagato al chiamante così com'è, altrimenti si rischia un loop.

Un fallimento del refresh (token scaduto/invalido) va trattato come logout definitivo: pulizia dello stato locale e redirect al login.

:::caution
I ruoli utente (family/teacher/admin) letti dalla risposta di signin sono comodi da tenere in cache lato client per decidere cosa mostrare in UI, ma **non sono un confine di sicurezza**: qualunque cosa il client tenga in `localStorage` è visibile e modificabile da chi controlla il browser. L'unico controllo che conta è quello che il backend fa sul JWT ad ogni richiesta. Se si cifra il valore lato client per offuscarlo, va tenuto presente che una chiave di cifratura distribuita nel bundle JS pubblico non è un segreto — è offuscamento, non protezione.
:::

## Roadmap: Passkey

È prevista in futuro l'integrazione di **Passkey** (WebAuthn) per un login senza password, con impronte digitali, riconoscimento facciale o dispositivi hardware. Il backend dovrà gestire la registrazione e verifica delle passkey; il frontend dovrà supportare il flusso WebAuthn.
