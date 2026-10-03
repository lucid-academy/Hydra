# Animacje

Zasada (CLAUDE.md): wszystko, co się da, animujemy w kodzie z pojedynczych obrazków. Klatki rysujemy tylko tam, gdzie kod nie wystarczy, głównie dla ludzi Zakonu (chód, atak, śmierć), prawdopodobnie w PixelLab.

Jak czytać tabele:

- **Jak:** `kod` to ruch, obrót, skala, mignięcie albo przezroczystość liczone w grze z jednego obrazka; `klatki` to kolejne rysunki w jednym pliku.
- **Klatki, rozmiar, fps:** tylko dla animacji z klatek. Rozmiar to jedna klatka w pikselach gry.
- **Zaczepienie:** punkt obrazka, który stoi w miejscu postaci (ten sam we wszystkich klatkach).
- **Kierunki:** wszyscy patrzą w prawo, gra odbija ich w lewo. Inne kierunki tylko wtedy, gdy postanowimy inaczej.
- **Stan:** `jest` (działa w grze), `z grafiką` (zrobimy, gdy przyjdzie docelowy obrazek, żeby nie robić tego dwa razy), `później` (z etapem, który tego potrzebuje).

Klatki jednej animacji: osobne pliki `art/raw/<klucz>_frame1.png`, `_frame2.png`... albo kilka figur obok siebie na jednym obrazku. Skrypt `npm run art` przycina wszystkie klatki jednym wspólnym prostokątem, żeby postać nie skakała, i składa je w jeden pasek.

## Tułów hydry: battle_body

| Animacja | Jak | Klatki | Rozmiar | fps | Zaczepienie | Kierunki | Stan |
|---|---|---|---|---|---|---|---|
| Przesuwanie po planszy | kod: ślizg z heksu na heks | – | 132×110 | – | środek podstawy (66, 66) | brak (bez przodu i tyłu) | jest |
| Mignięcie przy trafieniu | kod: 70 ms na biało | – | | | | | jest |
| Oddech | kod: lekkie spłaszczanie i rozciąganie w pionie, ok. 3 s na cykl | – | | | | | z grafiką |
| Drgnięcie przy mocnym ciosie | kod: odrzut o 1–2 px od ciosu i powrót | – | | | | | z grafiką |

## Głowy: battle_head i battle_head_jaw

Jeden szary obrazek dla wszystkich klas, gra barwi go kolorem klasy. Żuchwa to osobny obrazek, żeby dało się otwierać pysk.

| Animacja | Jak | Klatki | Rozmiar | fps | Zaczepienie | Kierunki | Stan |
|---|---|---|---|---|---|---|---|
| Kołysanie w spoczynku | kod: wolne falowanie (ok. 2 px) | – | głowa 20×14, żuchwa 20×7 | – | środek głowy; żuchwa wisi pod nią | w prawo, odbicie w lewo | jest |
| Wypad przy ataku | kod: skok o 6 px w stronę celu na 110 ms | – | | | | | jest |
| Mignięcie przy trafieniu | kod: 70 ms na biało | – | | | | | jest |
| Wyrastanie z kikuta | kod: nowa głowa startuje z kikuta i płynie na miejsce | – | | | | | jest |
| Kłapanie przy ataku | kod: żuchwa obraca się wokół tylnego końca (ok. 25°) i wraca, ok. 120 ms | – | | | zawias na lewym końcu żuchwy | | z grafiką |
| Odrzut przy trafieniu | kod: głowa odskakuje o 2–3 px od ciosu | – | | | | | z grafiką |
| Ścięcie | kod: głowa spada i znika, krótkie mignięcie kikuta | – | | | | | z grafiką |

## Szyje

Rysowane w całości w kodzie: łańcuch nakładających się krążków po łuku od tułowia do głowy, cieńszy przy głowie. Ruszają się razem z głową. Stan: `jest`. Gdy przyjdzie grafika hydry, kolor i obrys szyi dopasujemy do tułowia (dwa kolory w kodzie, bez obrazka).

## Ludzie Zakonu: battle_enemy_manAtArms, battle_enemy_headhunter, battle_enemy_torchbearer

Teraz: jeden obrazek na typ, ruch w kodzie. Docelowo: klatki z PixelLab dla chodu, ataku i śmierci. Rozmiar klatki jak obrazka: 26×38, stopy w (13, 37), twarzą w prawo.

| Animacja | Jak | Klatki | Rozmiar | fps | Zaczepienie | Kierunki | Stan |
|---|---|---|---|---|---|---|---|
| Przestępowanie w miejscu | kod: co chwilę 1 px w górę | – | 26×38 | – | stopy (13, 37) | w prawo, odbicie w lewo | jest |
| Chód z heksu na heks | kod: podskok o 3 px w trakcie kroku | – | | | | | jest |
| Wypad przy ataku | kod: 3 px w stronę celu na 120 ms | – | | | | | jest |
| Mignięcie przy trafieniu | kod: 70 ms na biało | – | | | | | jest |
| Śmierć | kod: zanika i opada o 4 px przez 0,5 s | – | | | | | jest |
| Chód | klatki | 4 | 26×38 | 8 | stopy (13, 37) | w prawo | później (PixelLab) |
| Atak (miecz, topór, pochodnia) | klatki | 3–4 | 26×38 | 10 | stopy (13, 37) | w prawo | później (PixelLab) |
| Śmierć | klatki | 4 | 26×38 | 8 | stopy (13, 37) | w prawo | później (PixelLab) |
| Płomień pochodni (Torchbearer) | kod: mignięcie i światło, albo 2–3 klatki samego płomienia | 2–3 | do ustalenia | 8 | | | później |

Torchbearer przy przypalaniu kikuta: na razie zwykły atak. Osobna animacja, jeśli przyjdzie z PixelLab.

## Mapa

| Animacja | Jak | Klatki | Rozmiar | fps | Zaczepienie | Kierunki | Stan |
|---|---|---|---|---|---|---|---|
| Hydra idzie po mapie (map_hydra) | kod: przesuw o heks co 130 ms, kamera jedzie za nią | – | 26×28 | – | stopy (dół środka) | w prawo (odbicie w lewo: później) | jest |
| Światła (leże, kapliczki, źródła, grzyby, pochodnie) | kod: map_glow barwione i dodawane do obrazu | – | 64×64 | – | środek | – | jest |
| Migotanie świateł | kod: lekkie, wolne pulsowanie jasności | – | | | | | później |
| Zmarszczki na wodzie | kod: przesuwanie kilku jaśniejszych pikseli po heksach wody | – | | | | | później |
| Mgła wokół nieznanego (map_fog_edge) | kod: statyczna | – | 30×28 | – | | | jest |
