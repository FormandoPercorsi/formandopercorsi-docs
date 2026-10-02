---
title: Novità e guide in-app
---

# Novità e guide in-app

Oltre alle [notifiche](/guides/notifiche), che segnalano un evento che riguarda un utente specifico, la piattaforma dispone di un **catalogo di comunicazioni editoriali** rivolte a intere categorie di utenti: le novità del prodotto («cosa c'è di nuovo») e le guide che accompagnano l'utente in una pagina o al primo accesso. Il catalogo è gestito dal backend, così che il contenuto, il pubblico e il periodo di pubblicazione si possano cambiare senza rilasciare i client, e il backend ricorda per ciascun utente che cosa ha già visto.

Le operazioni sono raggruppate nella API Reference sotto la categoria degli annunci, per ora presente solo nell'ambiente di sviluppo.

:::note Stato di adozione
La funzionalità è disponibile lato server; l'applicazione web non la utilizza ancora.
:::

## Il singolo elemento

Novità e guide condividono la stessa struttura e si distinguono per il **tipo**:

| Campo | Contenuto |
| --- | --- |
| Chiave | Identificativo leggibile e univoco (lettere minuscole, cifre, punto, trattino e trattino basso), pensato per essere referenziato dal client. Resta occupata anche dopo l'eliminazione dell'elemento. |
| Tipo | `news` per una novità, `guide` per una guida. |
| Pagina | La pagina del client a cui la guida appartiene; assente per un elemento globale. |
| Pubblico | Elenco dei ruoli destinatari fra `admin`, `teacher`, `student`, `family` ed `external_school`; un elenco vuoto significa tutti. |
| Titolo e testo | Il contenuto testuale. |
| Contenuto strutturato | Un oggetto JSON libero interpretato dal client, per esempio i passi di una guida. |
| Priorità | Ordina gli elementi restituiti, dalla più alta. |
| Periodo di pubblicazione | Inizio obbligatorio, fine facoltativa. |
| Stato | `active` oppure `draft`. |

Un elemento è **visibile** quando è attivo, non eliminato e la data corrente ricade nel suo periodo di pubblicazione. Come per le promozioni, la visibilità è **derivata** da stato e date e non registrata: nessuna elaborazione modifica un elemento al termine del periodo.

## Consultazione da parte degli utenti

Ogni utente autenticato ottiene gli elementi visibili destinati ad almeno uno dei propri ruoli e **non ancora visti**, ordinati per priorità e poi dal più recente. La richiesta può essere ristretta per tipo e per pagina — il confronto sulla pagina è esatto — e può includere anche gli elementi già visti, ciascuno con la data in cui lo è stato.

Il client segnala la presa visione di un elemento con un'operazione dedicata. L'operazione è **idempotente** e conserva la data della prima visualizzazione: segnalarla più volte, per esempio da due schede aperte, non sposta la data. Un elemento non visibile o non destinato all'utente risponde come inesistente.

## Gestione da parte dell'amministrazione

L'amministrazione dispone di elenco paginato (filtrabile per tipo, stato e pagina, con la possibilità di includere gli elementi eliminati), dettaglio, creazione, modifica parziale ed eliminazione. L'eliminazione è **logica**: l'elemento sparisce dagli utenti ma resta consultabile dall'amministrazione, e la sua chiave non può essere riutilizzata. Lo stato `draft` consente di preparare un elemento senza pubblicarlo.

## Sintesi

- Le notifiche riguardano un evento di un singolo utente; novità e guide sono comunicazioni editoriali per ruolo.
- Un elemento è mostrato una volta: il backend registra per ciascun utente la prima presa visione.
- La visibilità dipende da stato, eliminazione e periodo di pubblicazione, e non è mai registrata.
