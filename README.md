# Sito Franco Nicola architetto · Pipicelli DomenicAntonio

Landing page statica, un solo file `index.html` più la cartella `assets/`.
Nessun framework, nessuna build: si pubblica così com'è.

## Struttura
- `index.html` — home: il loto che si apre sulla pianta disegnata e due riquadri, Franco Nicola e Pipicelli DomenicAntonio (nessuna foto)

Ogni pagina ha il suo stile dentro il file: si può aprire anche da sola, ma le immagini stanno in `assets/`, quindi va tenuta tutta la cartella insieme.
- `nicola.html` — sito di Franco Nicola: apertura con il rudere che si ricompone in casa nuova, poi studio, servizi, progetti, contatti
- `pipicelli.html` — pagina provvisoria di Pipicelli DomenicAntonio (in costruzione)
- `assets/logo.png` — marchio FN per l'intestazione
- `assets/pianta_generale.png` — pianta usata nell'animazione iniziale
- `assets/render_*.jpg` — render dei progetti
- `.nojekyll` — dice a GitHub Pages di pubblicare i file così come sono
- `studi/panarano/index.html` — modello 3D della sezione fiume–SS374–casa a Panarano (foto aerea, catasto, progetto DXF, rilievo; coordinate di A e B nascoste). Collegato dalla pagina di Pipicelli.
- `studi/coni-ottici/index.html` — editor dei coni ottici e piano fotografico (Coni_Ottici_Editor_4) con in più «Salva su GitHub» e «Apri da GitHub» per il progetto .json.
- Entrambe si rigenerano dal repository privato dello studio (`studi/panarano_sezione/build.py`, cartella `pubblico/`).

## Pubblicare su GitHub Pages (istruzioni per Claude Code)
1. Crea un repository pubblico, ad esempio `sito-franco-nicola`, e copia dentro tutto il contenuto di questa cartella.
2. `git init && git add . && git commit -m "Landing page" && git branch -M main`
3. `git remote add origin https://github.com/<utente>/sito-franco-nicola.git && git push -u origin main`
4. Su GitHub: Settings → Pages → Source: "Deploy from a branch", Branch: `main`, cartella `/ (root)`. Salva.
5. Dopo un minuto il sito è su `https://<utente>.github.io/sito-franco-nicola/`.
   Per un dominio proprio: aggiungi un file `CNAME` con il dominio e imposta il DNS come indicato da GitHub.

Con `gh` installato, i passi 1 e 3 si fanno in un comando:
`gh repo create sito-franco-nicola --public --source=. --push`

## Da confermare prima della pubblicazione
- Email, telefono e indirizzo dello studio nella sezione Contatti (ora alcuni sono segnaposto)
- P.IVA nel piè di pagina
- Anni di professione nella sezione Studio
- Nomi dei progetti e se si possono citare i committenti
- Testo di presentazione di Pipicelli DomenicAntonio

## Modifiche frequenti
- Progetti: nella sezione `id="progetti"` ogni `<article class="project">` è un progetto; basta duplicarlo e cambiare immagini e testi.
- Testi: sono tutti in chiaro in `index.html`, nessun file esterno.
- Colori e carattere: variabili CSS in cima al file (`:root`).
