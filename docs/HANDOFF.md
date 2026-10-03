# Handoff: stan prac nad Hydrą

Stan na 2026-10-03. Ten plik streszcza dotychczasową pracę, żeby następna sesja mogła ją podjąć bez czytania całej rozmowy. Źródłem prawdy pozostają `GAME_DESIGN.md` (projekt gry) i `CLAUDE.md` (zasady pracy). Tutaj jest stan na dziś i to, czego w tych plikach nie ma.

- Gra: https://lucid-academy.github.io/hydra/
- Repo: https://github.com/lucid-academy/hydra (na serwerze `/root/Hydra`)

**Na start nowej sesji:** przeczytaj `CLAUDE.md`, ten plik i potrzebne sekcje `GAME_DESIGN.md`. Zrób `git pull` (Piotr może wrzucać pliki przez GitHuba) i sprawdź, czy odpowiedział na pytania z sekcji 4.

## 1. Etap

- Zrobione: **M0, M1, M1b, M2b** (sekcja 15 w `GAME_DESIGN.md`).
- **M2b** (podziemia) jest wdrożony i czeka na playtest Piotra.
- 2026-10-03 Piotr zmienił sposób pracy: grafika będzie z GPT, animacje najpierw w kodzie. Zasady są już w `CLAUDE.md`. Plan grafiki (sekcja 3.2) Piotr zatwierdził tego samego dnia i potok jest zbudowany; **czeka na pierwszą partię 5 obrazków z GPT**.
- Następny etap gry to **M2a** (głowy), ale dopiero gdy Piotr skończy je projektować. Nie budować systemu głów bez niego.

## 2. Co zrobione

**M0 (2026-09-30).** Vite + TypeScript + Phaser 4, testy (Vitest), zrzuty ekranu (Playwright), automatyczne wdrożenie z GitHub Actions na GitHub Pages, ekran tytułowy.

**M1 (2026-09-30).** Cała pętla w najcieńszej wersji:
- mapa podziemi z ziarna, trzy stany widoczności, żeton hydry, punkty ruchu, End Turn, Alert (rośnie od odkrywania i bitew), Muck, spotkania uruchamiające bitwę;
- bitwa w stałym kroku 20 tików/s: Body i 3 głowy (Biter, Acid Spitter, Mist Breather) przeciw Man-at-Arms, Headhunterom i Torchbearerom;
- pauza i rozkazy, ścinanie, odrost dwóch głów, przypalanie kikutów, blizny, wygrana, przegrana (Game Over i nowa hydra), powrót na mapę ze zmienionym składem głów;
- statusy Corroded i Soaked, chmury Mist, combosy Corrode & Crush, Acid Fog i Smother (w `src/data/combos.json`).

**M1b (2026-09-30 – 10-01), po playteście M1.**
- Bitwa na planszy 13×9 heksów widzianej pod skosem (jak Into the Breach). Body zajmuje 7 heksów w środku, ludzie chodzą z heksu na heks i otaczają hydrę, zasięgi liczone w heksach.
- Bitwa startuje w pauzie (jak FTL), prędkości 1× i 0,5×, wolniejsze tempo niż w M1. Atak podstawowy głów działa sam.
- Kilka głów naraz: Ctrl/Shift + klik, karty głów, przycisk „All heads", klawisze 1–9 i A. Body idzie na prawy klik albo tapnięcie w wolne pole.

**M2b (2026-10-01 – 10-02): podziemia.**
- Generator: mapa o promieniu 14 (631 heksów), bagno wokół leża i pięć biomów z dokumentu (Flooded Caves, Root Tangle, Fungal Deeps, Old Crypts, Salt Mines). Teren: woda i błoto (1 punkt ruchu), korzenie (2), sól (3), skała (nieprzechodnia). Test sprawdza reguły na 1000 seedach.
- Mapa pod skosem w duchu Songs of Conquest: dekoracje biomów, światła, minimapa, nazwa biomu przy wejściu.
- Kapliczki Wielkiego Węża z błogosławieństwami (przyjmij albo odrzuć), odpoczynek w leżu, zasoby Muck, Moisture i Bones.
- Spotkania w trzech poziomach siły, rosnących z odległością od leża. Plansza bitwy w kolorach biomu, w którym stało spotkanie.
- Przejścia na powierzchnię stoją na mapie, ale są zamknięte do M4.

**Narzędzia.** `npm run smoke` gra sama jak gracz: mapa, bitwy, przegrana, kapliczki; z `-- phone` na ekranie telefonu. `npm run balance` rozgrywa setki automatycznych bitew, wynik w `docs/BALANCE.md`. `npm run shots` robi zrzuty do `docs/screens/`. `npm run art` wstawia do gry obrazki z `art/raw/` (opis w `docs/ASSETS.md`). Parametry URL są w `README.md`.

**Zasady pracy (2026-10-03).** Nowe sekcje w `CLAUDE.md`: Notatki decyzji, Grafika z GPT, Animacje, Sekrety. Cała historia repo przejrzana: nie ma w niej kluczy, haseł ani tokenów.

## 3. Ustalenia spoza GAME_DESIGN.md

### 3.1 Sposób pracy

- Od 2026-10-03 projekt gry i budowa są w jednym projekcie Hydra w aplikacji Claude (wcześniej projekt gry był osobno, a budowa w Claude Code na serwerze). Zatwierdzone decyzje od razu do `GAME_DESIGN.md` (jeden commit, pokazać, co zmienione), budowa dopiero w swoim etapie. Gdy decyzja przeczy kodowi albo dokumentowi: pytać.
- Szczegóły w `CLAUDE.md`.

### 3.2 Grafika i animacje: plan z 2026-10-03, zatwierdzony

**Zrobione 2026-10-03 (w projekcie Hydra w aplikacji Claude):** prompty (`docs/ART_PROMPTS.md`, punkt 6), skrypt `npm run art` (punkty 2, 3 i 9; `scripts/artImport.ts`), cięcie heksów z tekstur przy starcie gry (punkt 5; `src/assets/terrain.ts`), żuchwa jako osobny obrazek pod głową (bez kłapania), `docs/ANIMATIONS.md` (punkt 8) i `.gitignore` (punkt 10). Kąt 45° i portret 128×160 przyjęte jak w planie. Cały proces sprawdzony na sztucznych obrazkach: import, gra, zrzuty, smoke. Zostało: paleta z okładki (punkt 4, gdy przyjdzie okładka) i dopasowanie liczb (`BODY_FOOT`, `JAW_OVERLAP`, rozmiar głowy) po pierwszej prawdziwej partii.

Plan:

1. **Kąt kamery:** widok 3/4 z góry, kamera ok. 45° nad ziemią, światło z lewej góry. Tak już są narysowane plansza bitwy i mapa (heksy spłaszczone do ok. 0,7 wysokości), więc nic do przebudowy. Portrety i ekran tytułowy to osobne ujęcia, na wprost.
2. **Skrypt `npm run art`** (biblioteka sharp, tylko jako narzędzie, do gry nie trafia):
   - wycina magentę z tolerancją, bo GPT nie trzyma idealnego koloru;
   - przycina i zmniejsza bez wygładzania: każdy piksel bierze najczęstszy kolor ze swojego bloku;
   - sprowadza kolory do palety i zapisuje plik w `public/images/` z wpisem `file` w manifeście.
   - Rozmiary bierze z manifestu (te same liczby co w `docs/ASSETS.md`). `art/raw/` tylko czyta.
3. **Nazwy plików** w `art/raw/` to klucze z manifestu (np. `battle_body.png`). Kilka części na jednym obrazku (np. głowa i żuchwa) skrypt rozdziela po plamach na magencie.
4. **Paleta:** ok. 32–48 kolorów w rampach (odcienie jednego koloru od ciemnego do jasnego), wyciągnięta z okładki. Do akceptacji Piotr dostaje próbnik i okładkę przerobioną na tę paletę. Obecne 9 kolorów z `src/data/palette.json` wchodzi do niej. Generować grafiki można przed ustaleniem palety: surowe pliki zostają, import da się powtórzyć.
5. **Teren z tekstur:**
   - tekstury są rysowane prosto z góry, skrypt spłaszcza je do kąta kamery;
   - gra przy starcie wycina z nich heksy z obwódką i ścianką, raz, a nie maską na żywo (wydajność na telefonie);
   - sąsiednie heksy biorą różne fragmenty tekstury, żeby nie było widać powtórzeń;
   - skała ma jedną teksturę na wierzch i ściany (ściany ciemniej);
   - bez tekstury zostaje grafika zastępcza.
6. **`docs/ART_PROMPTS.md`:**
   - stały blok stylu i prompty po angielsku;
   - 12 tekstur gruntu (6 biomów × 2 rodzaje) i 6 tekstur skał;
   - tułów hydry i głowa z osobną żuchwą (do kłapania w kodzie);
   - portret Old Mother Toad (popiersie 128×160).

   Każdy prompt w osobnym bloku do skopiowania. Test sprawdza, że wszystkie zaczynają się od tego samego bloku stylu.
7. **Pierwsza partia od Piotra: 5 obrazków** (bagno leża: woda, błoto, skała; tułów; głowa), żeby sprawdzić cały proces, zanim zrobi resztę.
8. **`docs/ANIMATIONS.md`** dla hydry, głów, szyj, trzech typów ludzi i mapy. Nowe animacje w kodzie (kłapanie, odrzut) dopiero z grafiką hydry, żeby nie robić ich dwa razy.
9. **Klatki:** skrypt obsłuży sprite sheety i osobne klatki PNG, ze wspólnym przycięciem wszystkich klatek, żeby postać nie skakała. PixelLab sprawdzić dopiero przy animacjach rycerzy, nic nie instalować ani nie kupować.
10. **`.gitignore`:** pliki z sekretami (`.env` itp.).

### 3.3 Decyzje robocze w grze

Podjęte przy budowie, nie ma ich w `GAME_DESIGN.md`. Liczby leżą w `src/data/` z dopiskiem `TODO(design)` i Piotr może je zmieniać.

- Bagno wokół leża (Lair Swamp) to osobny, szósty biom; dokument wymienia pięć.
- Podziemne kapliczki to kapliczki Wielkiego Węża (pomysł fabularny z §16). Każda daje całej hydrze jedno błogosławieństwo (ruch, wzrok, HP Body, regeneracja, Alert, Muck/Moisture), które można przyjąć albo odrzucić. 6 błogosławieństw w `src/data/shrines.json`, teksty napisał Claude, robocze.
- Odpoczynek: End Turn na heksie leża leczy w pełni, a z każdej blizny wyrastają 2 nowe głowy (do limitu 9). Poza leżem leczenie 12 HP Body i 4 HP każdej głowy na turę.
- Bones: 2 za każdego pokonanego człowieka (uproszczenie, zanim pojawią się jeńcy). Moisture ze źródeł, Muck ze złóż.
- Spotkania: poziom siły 1, 2 albo 3 według odległości od leża (poziom 2 od 7 heksów, poziom 3 od 11). W Salt Mines spotkań jest więcej (×1,5), w Old Crypts ×1,2. Najsilniejsza grupa to Pyre Procession.
- Bitwa: plansza 13×9 heksów, Body 200 HP, odrost 8 s.
- Wrogowie atakują najpierw głowę obok siebie (tę, która ich gryzie, potem najsłabszą), a jeśli takiej nie ma, Body. Headhunter bije tylko głowy, dopóki jakaś żyje. Torchbearer podchodzi do kikuta i go przypala.
- Biter (atak wręcz) sięga szyją aż na heks celu.

### 3.4 Technika i środowisko

- Repo nazywało się „Hydra". 2026-09-30 zmieniono nazwę na „hydra" i stary adres gry z `/Hydra/` nie działa.
- Claude Code działa na małym serwerze VPS (2 GB RAM) przez Remote Control, w sesji tmux. Piotr pisze z telefonu, okno nie musi być otwarte. Sesja startuje w katalogu innego projektu, więc `CLAUDE.md` Hydry nie wczytuje się sam.
- Na serwerze działają też inne projekty: nie ruszać ich.
- Sesje czasem się zrywają (połączenie z API), dlatego commitować małymi krokami. Nigdy `git checkout` na niezacommitowanym pliku: raz cofnęło to nowy generator.
- Wysyłanie plików z sesji na telefon nie działa („session is not on a project thread"). Obrazki do obejrzenia wrzucać do `docs/` i dawać link do GitHuba.
- Konektory w Claude (Gmail, Kalendarz, Dysk, Claude Docs) czekają na autoryzację przez Piotra w ustawieniach claude.ai. Do tego czasu są niedostępne.
- Sprawdzenie wdrożenia: nazwa pliku `assets/index-*.js` na stronie gry ma się zgadzać z lokalnym `dist/assets/`. Wdrożenie trwa ok. minuty.
- Haki testowe `window.__hydra` (gotowe sceny, podsumowanie bitwy i runu, heksy w zasięgu) czytają `smoke` i `shots`.
- Pułapki Phasera 4:
  - zdarzenia klawiszy z kolejki wracają w tej samej klatce, dlatego używać `onKeyDown` z `src/ui/keys.ts`;
  - interaktywne obiekty w przebudowywanym kontenerze czasem nie łapią tapnięć (dlatego karty głów są zwykłymi obiektami);
  - nie kłaść interaktywnych pasków pod przyciskami.

## 4. Otwarte pytania

**Czekają na Piotra:**
1. Wrażenia z playtestu M2b: mapa, kapliczki, leże, nowe biomy.
2. Pierwsza partia 5 obrazków z GPT (prompty 1–5 w `docs/ART_PROMPTS.md`).
3. Okładka gry (key art) w `art/raw/`, z której powstanie paleta.
4. Projekt głów do M2a. Powstanie w rozmowie w projekcie Hydra.

**Z `GAME_DESIGN.md` §16 (decyduje Piotr):**
- ile kapliczek Płomienia trzeba zgasić;
- nowe głowy słabsze i rosnące (od czego rosną?);
- Wielki Wąż w fabule;
- The Spare: przejmowanie kursora, Multiheadeverse.

**Pomysły na później, do rozmowy:**
- głowy działające tylko po swojej stronie Body;
- znacznik pokazujący, kogo atakuje dany wróg;
- teren areny na heksach (§6.7: woda, błoto, suchy grunt).

**Rozbieżność dokumentu i danych:** §6.3 podaje odrost „roboczo 6 s", a w `src/data/heads.json` jest 8 s (wydłużone, gdy bitwa miała zwolnić). Do wyrównania, gdy Piotr zdecyduje.

## 5. Znane problemy i braki

- Cała grafika jest zastępcza, rysowana w kodzie.
- Nie ma zapisu gry: odświeżenie strony zaczyna run od nowa. `CLAUDE.md` wymaga zapisu w localStorage z numerem wersji formatu, w planie jest w M6.
- Seed widać tylko z `?debug=1`. Menu pauzy, w którym miał być (§9), jeszcze nie ma.
- Świadomie odłożone na późniejsze etapy:
  - Spell Caches czekają na umiejętności głów (M2a);
  - przejścia na powierzchnię są zamknięte (M4);
  - Moisture i Bones tylko się zbiera, wydawanie od M3;
  - Alert tylko rośnie: bez progów, patroli, posłańców i wypraw (M3);
  - nie ma odwrotu z bitwy;
  - umiejętności Q/W/E, doświadczenie, specjalizacje, przypadłości, klasy Screamer, Glutton i The Spare oraz combosy poza trzema pierwszymi przyjdą z M2a.
- Balans (`docs/BALANCE.md`): najsilniejsza grupa (Pyre Procession) pokonuje hydrę bez rozkazów w 63% bitew, a przy sensownych rozkazach w 6%. Wszystkie liczby są robocze.
- Głowa w bitwie ma 20×14 px, więc z grafiki GPT zostanie mało szczegółów. Po pierwszym imporcie trzeba zdecydować, czy ją powiększyć.

## 6. Następne kroki

1. Poczekać na odpowiedzi Piotra (sekcja 4).
2. Gdy przyjdzie pierwsza partia: obrazki do `art/raw/` pod nazwami z promptów, `npm run art`, zrzuty, poprawić liczby (3.2), wdrożyć, pokazać. Potem kłapanie i odrzut w kodzie (`docs/ANIMATIONS.md`).
3. Gdy przyjdzie okładka: propozycja palety (próbnik i okładka w palecie), po akceptacji zapis w repo.
4. Gdy Piotr napisze, że wrzucił grafiki: `git pull`, `npm run art`, obejrzeć wynik w grze, wdrożyć, pokazać.
5. Zatwierdzone decyzje od razu wpisywać do `GAME_DESIGN.md`, a budować w swoim etapie.
6. Potem M2a (głowy), gdy projekt głów będzie gotowy, i dalej M3 według §15.
