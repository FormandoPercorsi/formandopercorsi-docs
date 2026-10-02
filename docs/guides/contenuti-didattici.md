---
title: Contenuti didattici
---

# Contenuti didattici

Oltre alla prenotazione delle lezioni, la piattaforma gestisce un catalogo di contenuti didattici — argomenti, esercizi con soluzione, video — e tiene traccia dell'avanzamento degli studenti sugli esercizi. Questa pagina descrive come il catalogo è organizzato, chi può vederne che cosa e come viene alimentato. Gli endpoint sono nelle sezioni [Subject](/api/subject), [Topic](/api/topic), [Subtopic](/api/subtopic) e [StudentExercise](/api/student-exercise) della API Reference; quelli degli esercizi e dei video sono nelle sezioni Exercise e Video, che la API Reference di produzione non espone ancora e che si trovano in quella di sviluppo.

:::note Stato di adozione
Il catalogo è completo lato server e gestibile dall'area amministrativa dell'applicazione web («Catalogo»). Le pagine «Esercizi» delle aree famiglia e insegnante sono invece ancora predisposte e non mostrano i contenuti: oggi il catalogo non è esposto agli utenti finali dall'applicazione web.
:::

## Organizzazione del catalogo

```
Scuola ── insegna ──► Materia
                        ▲
                        │ (molti a molti)
                     Argomento
                        │
                        ▼
                   Sottoargomento
                        │
                        ▼
                    Esercizio ── soluzione testuale, opzioni di risposta, immagini
                        │
                        └──► video di soluzione
```

| Livello | Descrizione |
| --- | --- |
| **Materia** | Le materie sono le stesse usate dalla prenotazione. Ogni scuola ha il proprio elenco di materie insegnate, che delimita sia le materie selezionabili per uno studente sia l'offerta di un insegnante; l'associazione fra scuole e materie è gestita dall'amministrazione. |
| **Argomento** | Un tema di studio, associabile a più materie. |
| **Sottoargomento** | Un'articolazione dell'argomento, che raccoglie gli esercizi. |
| **Esercizio** | Testo della consegna, soluzione, eventuali opzioni di risposta, immagini e un video di soluzione facoltativo. Ha un ordine all'interno del sottoargomento. |
| **Video** | Un file video con anteprima, collegabile come soluzione di un esercizio. |

Testo e soluzione degli esercizi sono scritti in **Markdown** con formule matematiche in notazione LaTeX; le immagini sono caricate separatamente e richiamate dal testo. È l'applicazione web a renderizzare il formato: un altro client deve adottare la stessa convenzione per presentare correttamente i contenuti.

## Stato e visibilità degli esercizi

Due attributi indipendenti governano chi vede un esercizio.

| Stato | Significato |
| --- | --- |
| `draft` | In preparazione: visibile solo all'amministrazione. |
| `active` | Pubblicato. |
| `archived` | Ritirato: visibile solo all'amministrazione. |

| Visibilità | Chi accede al contenuto |
| --- | --- |
| `public` | Chiunque, anche senza autenticazione. |
| `registered` | Qualunque utente autenticato. |
| `premium` | Riservata a un livello di accesso non ancora attribuibile: oggi nessun utente non amministratore vi accede. |

La consultazione è pubblica — anche un visitatore non autenticato elenca gli esercizi attivi di un sottoargomento — ma un esercizio di una visibilità a cui l'utente non ha diritto è restituito **bloccato**: compare con il titolo, senza consegna né soluzione. L'amministrazione vede ogni esercizio in qualunque stato e può filtrare per stato e visibilità.

## Video e file

I file video non transitano dall'API. L'amministrazione crea il video come scheda, poi ottiene un **collegamento firmato a tempo** (valido 20 minuti) con cui il client carica il file direttamente sull'archivio dell'ambiente; allo stesso modo si caricano le anteprime. La riproduzione usa collegamenti firmati di download, generati a richiesta. Le immagini degli esercizi, invece, sono caricate attraverso l'API.

## Avanzamento degli studenti

Per ogni studente la piattaforma registra lo stato di lavorazione degli esercizi — da svolgere, in corso, completato, saltato — l'eventuale risposta scelta fra le opzioni e un contrassegno di preferito. Le operazioni prevedono due modalità di accesso: lo studente sui propri esercizi, e la famiglia sugli esercizi di uno dei propri studenti, con la verifica che lo studente appartenga alla famiglia. Poiché oggi gli studenti non dispongono di credenziali proprie, la modalità effettivamente utilizzabile è la seconda.

## Gestione

Argomenti, sottoargomenti, esercizi, immagini e video sono scritti esclusivamente dall'amministrazione. Le eliminazioni sono logiche. Nell'applicazione web la pagina «Catalogo» consente di navigare la gerarchia, scrivere consegna e soluzione con anteprima del Markdown e delle formule, inserire immagini e caricare i video di soluzione con la relativa anteprima.
