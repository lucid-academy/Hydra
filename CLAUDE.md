# CLAUDE.md — HYDRA

## O projekcie

Gra przeglądarkowa: grasz hydrą z podziemnego bagna i walczysz z ludźmi. Roguelite z pokoleniami, turowa mapa heksagonalna z mgłą wojny plus walka w czasie rzeczywistym z pauzą. Pełny projekt jest w `GAME_DESIGN.md`. Przeczytaj go przed każdym etapem. Jeśli kod przeczy dokumentowi, zapytaj, zanim zmienisz którekolwiek z nich.

Projekt jest długi i będzie często przebudowywany. Pisz kod tak, żeby łatwo go było zmieniać, a nie tak, żeby wyglądał na skończony.

## Z kim pracujesz

- Piotr jest autorem gry. Pisze po polsku, często z telefonu przez Remote Control. Odpowiadaj po polsku, krótko, najważniejsze na początku.
- Uczy się rzeczy technicznych. Gdy wprowadzasz narzędzie albo pojęcie, wyjaśnij jednym-dwoma zdaniami po ludzku, co to jest i po co.
- Chce szczerości. Jeśli pomysł szkodzi grze albo kodowi, powiedz to i zaproponuj alternatywę.

## Jak pracujemy

1. Pracujemy etapami (M0, M1 itd., sekcja 15 w `GAME_DESIGN.md`). Nie wychodź poza bieżący etap.
2. Przed etapem pokaż krótki plan (maksymalnie ok. 10 punktów) i pytania. Poczekaj na OK od Piotra.
3. W trakcie rób małe commity z opisowymi komunikatami po angielsku. Wdrażaj po każdym sensownym kroku, żeby Piotr mógł zajrzeć z telefonu.
4. Na koniec etapu: typecheck, testy, build, zrzuty ekranu (obejrzyj je sam, zanim uznasz, że działa), wdrożenie. Potem w czacie: link, co zrobione, **lista rzeczy do sprawdzenia w grze**, znane problemy. I stop.
5. Bez dużych przebudów i zmian architektury bez pytania. Nie usuwaj ani nie przepisuj treści, które Piotr napisał w plikach danych.
6. Otwarte pytania z dokumentu projektu: nie zgaduj. Zapytaj albo zostaw wartość w danych, z komentarzem `TODO(design)`.

## Notatki decyzji (projekt gry powstaje osobno)

- Piotr projektuje grę w osobnym projekcie w aplikacji Claude i stamtąd wkleja tutaj „Notatki decyzji".
- Gdy dostaniesz notatkę: wprowadź zmiany do `GAME_DESIGN.md` (jeden commit na notatkę) i pokaż Piotrowi, co zmieniłeś: które sekcje i co w nich dodane, zmienione albo usunięte.
- Budowę według notatki rób dopiero, gdy przyjdzie pora na dany etap, chyba że Piotr powie inaczej.
- Jeśli notatka przeczy kodowi albo innej części dokumentu, zapytaj, zanim cokolwiek zmienisz.
- Z tobą Piotr rozmawia o budowie, liczbach, balansie i o tym, co jest technicznie wykonalne.

## Stack

- **Phaser 4** (najnowsze 4.x), **TypeScript** w trybie strict, **Vite**, **Vitest** do testów, **Playwright** do zrzutów ekranu i testu dymnego.
- Bez frameworków UI (React itp.). Interfejs gry rysuje Phaser.
- Pliki danych walidowane przy ładowaniu (np. zod), żeby literówka Piotra w JSON-ie dawała czytelny błąd, a nie cichą awarię.
- Phaser 4 różni się od Phasera 3 (m.in. nowy system renderowania, filtry zamiast FX i masek). Modele często mieszają oba API: używaj API v4. Repozytorium Phasera ma folder `skills/` z wiedzą dla agentów AI. Sprawdź, czy jest w paczce npm; jeśli nie, pobierz go z GitHuba i korzystaj. W razie wątpliwości zajrzyj do przewodnika migracji v3→v4.

## Architektura (obowiązkowa)

```
GAME_DESIGN.md   dokument projektu
CLAUDE.md        ten plik
src/
  sim/           czysty TypeScript, ZERO importów z Phasera
    hex/         współrzędne osiowe, sąsiedzi, dystans, zasięg, linia wzroku, piksel↔heks
    map/         generatory map, widoczność, obiekty na heksach
    turn/        tura gracza i tura świata, Alert
    battle/      symulacja walki w stałym kroku (20 tików/s)
    rng.ts       generator liczb losowych z ziarnem
  scenes/        sceny Phasera: czytają stan z sim/ i go rysują, input zamieniają na komendy do sim/
  ui/            komponenty interfejsu
  data/          JSON: głowy, wrogowie, teren, eventy, dialogi, kapliczki, zaklęcia, modyfikatory, balans
  assets/        manifest grafik
tests/           testy symulacji
docs/            ASSETS.md, screens/
```

Zasady:
- **Symulacja oddzielona od rysowania.** Cała logika gry w `sim/`, testowalna bez przeglądarki. Sceny tylko rysują i przekazują komendy.
- **Determinizm.** W `sim/` nigdy `Math.random()` ani czasu systemowego, tylko RNG z ziarnem i licznik tików. Ten sam seed i te same komendy dają ten sam wynik.
- **Dane zamiast kodu.** Każda liczba balansu, tekst, event, statystyka wroga i kwestia dialogowa żyje w `src/data/`. Piotr będzie tam grzebał sam, więc pliki mają być czytelne, z opisowymi nazwami pól.
- **Mist to nie mgła wojny.** Mgła hydry to `mist`, wiedza gracza o mapie to `visibility`. Nigdy nie mieszaj nazw.
- Heksy: axial (q, r), pointy-top, algorytmy według Red Blob Games „Hexagonal Grids".

## Grafika

- Pixel art: wewnętrzna rozdzielczość 640×360, skalowanie całkowite, `pixelArt: true`, bez wygładzania.
- Każda grafika przez klucz w manifeście (`src/assets/manifest.json`). Podmiana grafiki to podmiana pliku, bez zmian w kodzie.
- Na start grafika zastępcza generowana w kodzie (kształty w paletach z dokumentu projektu) albo paczki **wyłącznie na licencji CC0** (np. Kenney). Każde źródło wpisz do `CREDITS.md`.
- Prowadź `docs/ASSETS.md`: dla każdej grafiki wymiary w pikselach, kadrowanie, punkt zaczepienia, liczba klatek, tło. Piotr będzie generował docelowe grafiki w GPT według tej specyfikacji, więc pisz ją tak, żeby dało się z niej zrobić prompt do generatora obrazów.

## Grafika z GPT

- `art/raw/`: surowe obrazki od Piotra (z GPT, później z PixelLab). Oryginałów nigdy nie nadpisuj ani nie edytuj, skrypt tylko z nich czyta.
- Skrypt importu: wycina jednolite tło magenta `#FF00FF`, przycina, zmniejsza do rozmiaru z `docs/ASSETS.md` bez wygładzania, sprowadza kolory do palety gry i zapisuje gotowy plik tam, gdzie wskazuje manifest. Obsługuje pojedyncze obrazki, sprite sheety i osobne klatki PNG.
- Paleta gry pochodzi z okładki (key art), którą Piotr wrzuca do `art/raw/`. Dopóki nie ma zatwierdzonej palety, zaproponuj ją na podstawie okładki.
- Jeden kąt kamery dla całego świata gry (mapa, bitwa, jednostki), zapisany w stałym bloku stylu w `docs/ART_PROMPTS.md`.
- Teren heksów powstaje z kwadratowych, powtarzalnych tekstur, które gra przycina do kształtu heksa. GPT nie umie rysować heksów, więc nie zamawiaj u niego heksów.
- `docs/ART_PROMPTS.md`: gotowe prompty do GPT po angielsku. Każdy zaczyna się od tego samego stałego bloku stylu (kąt kamery, paleta, pixel art, tło magenta).
- Gdy Piotr napisze, że wrzucił grafiki: pobierz zmiany z GitHuba, przepuść nowe pliki przez skrypt, obejrzyj wynik w grze (zrzuty ekranu), wdróż i pokaż.
- Grafiki Piotra (GPT, PixelLab) też odnotuj w `CREDITS.md`.

## Animacje: najpierw kod, potem klatki

- Wszystko, co się da, animuj w kodzie z pojedynczych obrazków: szyje, wypady i kłapanie głów, kołysanie, mignięcie przy trafieniu, odrzut, śmierć. Hydra prawie w całości tak.
- Prowadź `docs/ANIMATIONS.md`: dla każdej jednostki lista animacji (nazwa, kod czy klatki, liczba klatek, rozmiar, fps, punkt zaczepienia, kierunki).
- Animacje klatkowe (głównie rycerze: chód, atak, śmierć) Piotr zrobi prawdopodobnie w PixelLab (narzędzie AI do pixel artu, które animuje sprite'y i robi widoki z kilku kierunków). Niczego nie instaluj ani nie kupuj. Gdy dojdziemy do animacji rycerzy, sprawdź, jak działa jego integracja z Claude Code (MCP), i zaproponuj.

## Sprawdzanie pracy

- `npm run typecheck`, `npm test` i `npm run build` muszą przejść przed każdym wdrożeniem.
- `npm run shots`: Playwright otwiera zbudowaną grę w przeglądarce bez okna i robi zrzuty kluczowych ekranów do `docs/screens/`. Obejrzyj je, zanim napiszesz, że coś działa.
- Parametry URL do testów i debugowania: `?seed=123`, `?scene=battle`, `?debug=1` (nakładka z informacjami: seed, tura, tiki, stan widoczności).
- Generator map: test przechodzi przez co najmniej 1000 seedów i sprawdza reguły z sekcji 9 dokumentu projektu.
- Pracujemy na małym serwerze VPS. Nie zostawiaj uruchomionych serwerów deweloperskich ani przeglądarek, zamykaj procesy po użyciu. Jeśli Playwright nie mieści się w pamięci, powiedz o tym i zaproponuj robienie zrzutów w GitHub Actions.

## Repozytorium i wdrożenie

- Repo na koncie GitHub `lucid-academy`, nazwa robocza `hydra`. `gh` na serwerze jest zalogowany. Jeśli repo jeszcze nie istnieje, zapytaj Piotra przed jego utworzeniem: GitHub Pages na darmowym planie wymaga publicznego repo.
- Wdrożenie: GitHub Actions buduje grę przy każdym pushu do `main` i publikuje ją na GitHub Pages.
- Zapis gry w przeglądarce (localStorage), z numerem wersji formatu zapisu, żeby stare zapisy nie wysadzały nowej wersji gry.

## Sekrety

- Repo jest publiczne. Nigdy nie wrzucaj do niego kluczy, haseł ani tokenów, także w plikach konfiguracyjnych i logach. Jeśli coś wymaga klucza, trzymaj go poza repo i zapytaj Piotra, gdzie ma leżeć.
