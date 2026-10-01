---
title: Promozioni
---

# Promozioni

Una promozione è un codice che modifica il prezzo di una lezione al momento della prenotazione. Questa pagina descrive i tipi di promozione disponibili, le condizioni che ne determinano l'utilizzabilità, il modo in cui una famiglia le scopre e le applica, l'effetto sulla ripartizione dei compensi e le regole con cui l'amministrazione le gestisce. Gli endpoint sono nella sezione [Promotion](/api/promotion) della API Reference.

## Tipi di promozione

| Tipo | Effetto sul prezzo | Effetto sulle quote e sulla liquidazione |
| --- | --- | --- |
| **Lezione gratuita** (`free_lesson_teacher_paid`) | Il prezzo della lezione è azzerato. | Sono azzerate anche tutte le quote — costi fissi, quota di piattaforma, quota della scuola esterna. La lezione non passa dal pagamento, nasce in uno stato dedicato e **non entra nella liquidazione**: l'eventuale compenso dell'insegnante non transita dalla piattaforma. |
| **Sconto** (`discount`) | Il prezzo è ridotto di una percentuale (`percent`) o di un importo fisso (`fixed`), mai al di sotto del prezzo minimo garantito. | Le quote restano a **listino**; lo sconto è assorbito in liquidazione con la stessa gerarchia del credito della famiglia (si veda [Effetto sui compensi](#effetto-sui-compensi)). |

### Il limite inferiore dello sconto

Uno sconto non porta mai il prezzo sotto il **prezzo orario minimo garantito**, lo stesso limite che vale per il credito della famiglia (descritto in [Crediti e programma referral](/guides/referral-crediti#applicazione-del-credito)). Se lo sconto richiesto supera il margine disponibile viene ridotto fino al limite; se il prezzo è già pari al minimo lo sconto è nullo. Promozione e credito si combinano senza poter violare il limite: lo sconto si applica per primo e il credito viene calcolato sul prezzo già scontato, quindi il minimo vale per i due insieme.

L'importo in euro effettivamente scontato viene **congelato sull'ordine**, come il credito applicato: un'eventuale modifica successiva della promozione o del listino non cambia ciò che è stato venduto.

### Lezioni gratuite e operazioni successive

Una lezione gratuita non ha un incasso da restituire: la sua cancellazione non produce alcun rimborso e non è assicurabile (si veda [Copertura assicurativa](/guides/assicurazione)).

## Condizioni di utilizzo

Una promozione è utilizzabile da una famiglia quando sono soddisfatte **tutte** le condizioni seguenti:

| Condizione | Regola |
| --- | --- |
| Stato | La promozione è attiva (non disattivata dall'amministrazione). |
| Periodo di validità | La data odierna è compresa fra data di inizio e data di fine, quando indicate. |
| Città | Se la promozione è legata a una città, la città di fatturazione della famiglia deve coincidere. |
| Utilizzi per utente | Se è fissato un numero massimo di utilizzi per utente, l'utente non deve averlo raggiunto. |
| Durata della lezione | Se la promozione è limitata ad alcune durate (1, 1,5 o 2 ore), la lezione deve averne una. |
| Modalità della lezione | Se la promozione è limitata ad alcune modalità (online, a domicilio della famiglia, a domicilio dell'insegnante, in sede), la lezione deve essere in una di queste. |
| Livello scolastico | Se la promozione è limitata ad alcuni livelli (primaria, secondaria di primo grado, secondaria di secondo grado, università), lo **studente** della lezione deve frequentare in quel momento una scuola di uno di quei livelli. |

Le ultime tre condizioni formano i **vincoli sulla lezione** della promozione. Due aspetti del loro trattamento sono deliberati:

- **Un vincolo illeggibile non concede lo sconto.** Un vincolo registrato con un valore non riconosciuto non corrisponde ad alcuna lezione, anziché essere ignorato: una restrizione che non si riesce a interpretare non deve mai tradursi in uno sconto concesso a tutti. Per questo l'amministrazione non può salvare una promozione con valori non validi.
- **Il livello scolastico è quello attuale dello studente.** Uno studente senza scuola — per esempio perché il passaggio di classe ha concluso il suo ciclo — o un utente che non è uno studente non soddisfano un vincolo di livello.

Le promozioni si applicano alla **prenotazione di singole lezioni**; i [percorsi formativi](/guides/percorsi-formativi) hanno condizioni economiche proprie e non accettano codici promozionali.

## Uso da parte della famiglia

L'elenco delle promozioni **non è pubblico**: l'operazione rivolta alle famiglie restituisce soltanto le promozioni che la famiglia che la invoca può attivare. Accetta facoltativamente lo studente per cui si intende prenotare:

- **con lo studente**, sono restituite le promozioni utilizzabili per quello studente;
- **senza lo studente**, una promozione vincolata al livello scolastico è restituita se almeno uno studente della famiglia la soddisfa, così che un genitore veda anche le promozioni destinate a uno solo dei figli.

Anche il preventivo di prezzo accetta lo studente, per valutare correttamente un codice vincolato al livello scolastico. Durata e modalità, quando la ricerca non le conosce ancora, non escludono la promozione: vengono verificate definitivamente al momento della prenotazione.

Alla prenotazione il codice viene **verificato di nuovo lato server**, con tutte le condizioni. È un punto essenziale: un client può legittimamente proporre o applicare in automatico un codice ricevuto dall'elenco — come fa l'applicazione web — e la piattaforma resta l'unico garante di chi abbia diritto allo sconto. L'utilizzo viene registrato alla prenotazione e **rimosso se la sessione di pagamento scade** senza essere completata, perché in quel caso la prenotazione non è mai avvenuta e l'utilizzo non deve contare.

## Effetto sui compensi

Lo sconto di una promozione di tipo **sconto** non riduce le quote di piattaforma e di scuola esterna registrate sull'ordine, che restano a listino: viene assorbito in fase di liquidazione, insieme all'eventuale credito della famiglia e con la stessa gerarchia (si veda [Crediti e programma referral](/guides/referral-crediti#ripartizione-del-credito-sui-compensi)). Lo sconto della promozione viene assorbito per primo, il credito su ciò che resta. La quota assorbita da ciascun soggetto è registrata per singola lezione, distintamente da quella del credito.

Quando è attivo il [credito degli insegnanti](/guides/crediti-insegnanti) la gerarchia si rovescia anche per le promozioni: l'insegnante assorbe lo sconto, entro il limite del proprio compenso sulla lezione, e matura un credito di pari importo, distinto per origine da quello generato dal credito delle famiglie ma confluito nello stesso saldo.

## Amministrazione

L'amministrazione gestisce le promozioni da operazioni dedicate, distinte da quella rivolta alle famiglie: un elenco completo filtrabile per stato e codice, con il numero di utilizzi di ciascuna; il dettaglio, con gli utilizzi più recenti e chi li ha fatti; la creazione, la modifica e la disattivazione. Le regole che ne governano il ciclo di vita sono:

- **Una promozione non si elimina, si disattiva.** Utilizzi registrati e ordini continuano a riferirsi a essa; la disattivazione la rende inutilizzabile e libera il suo codice.
- **Dopo il primo utilizzo, tipo e sconto sono bloccati.** Tipo, modalità di sconto e valore non possono più essere modificati, così che resti ricostruibile che cosa è stato concesso; date, città, limiti di utilizzo e vincoli restano modificabili.
- **Il codice è univoco fra le promozioni attive**, perché la prenotazione individua la promozione a partire dal codice: due promozioni attive con lo stesso codice renderebbero arbitrario quale sconto si applica.
- **L'utilizzabilità è derivata, non registrata.** Nessuna elaborazione porta una promozione nello stato «scaduta» al passare della data di fine; l'elenco amministrativo espone quindi un indicatore derivato da stato e date, da leggere al posto dello stato registrato.

L'interfaccia amministrativa dell'applicazione web raccoglie le promozioni nella pagina «Economia»; si veda [Applicazione web](/guides/guida-frontend#area-amministrativa).
