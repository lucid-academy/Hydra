# Hydra — dokument projektu gry

> Tytuł roboczy: **Hydra**. Dokument żyje: Piotr będzie go często zmieniał. Gdy kod przeczy dokumentowi, dokument ma pierwszeństwo, ale zanim cokolwiek zmienisz, zapytaj.

## 1. Wizja

Grasz hydrą z podziemnego bagna. Rycerze Zakonu Wiecznego Ognia z zamku na wzgórzu chcą ją spalić, a jej bagno wypalić do suchej ziemi. Hydra eksploruje podziemia, rośnie w siłę, rozmnaża się i broni leża. Gdy okrzepnie, wychodzi na powierzchnię pod osłoną mgły, gasi kapliczki Płomienia i odpycha ludzi. Celem jest zgaszenie Wiecznego Płomienia i przejęcie powierzchni.

Gatunek: roguelite z pokoleniami. Warstwa strategiczna to turowa mapa heksagonalna z odkrywaniem terenu jak w Cywilizacji. Walka to osobne starcia w czasie rzeczywistym z pauzą, jak w Tomb Guard. Mroczne fantasy z absurdalnym humorem, pixel art, gra w przeglądarce, wszystkie teksty w grze po angielsku.

### Filary (każda decyzja projektowa wspiera przynajmniej jeden)

1. **Głowy to drużyna.** Każda głowa to osobna postać z klasą, imieniem i charakterem. Ścięcie nie kończy walki, tylko zmienia skład. Głowy są najsilniejsze razem: ich ataki łączą się w combosy.
2. **Mgła przeciw ogniowi.** Na powierzchni hydra istnieje tylko tam, gdzie jest Mist. Zakon walczy ogniem. Cały konflikt gry to mgła kontra płomień.
3. **Eksploracja ma cenę, ale nie ma stopera.** Im więcej hydra odkrywa i zdobywa, tym szybciej Zakon się zbroi. Długie wyprawy po podziemiach są normą, a nie ryzykanctwem.
4. **Każdy run jest inny.** Generowana mapa, losowe głowy, eventy, modyfikatory runu.
5. **Poważny świat, absurdalni ludzie.** Humor bierze się z tego, że Zakon jest śmiertelnie poważny w idiotycznych sprawach.

## 2. Referencje

- **Tomb Guard** (Studio Siege, demo na Steamie, 2026): główna referencja mechanik i stylu. Real-time z pauzą, drużyna z klasami i specjalizacjami, walka aż do bossa, eventy z ryzykiem, błogosławieństwa, odblokowania przez wyzwania, śmierć jako normalna część gry. Pixel art widziany z góry.
- **Cywilizacja:** ruch po heksach, odsłanianie mapy, mgła wojny na terenach już odkrytych.
- **Heroes of Might and Magic II:** podział na mapę przygody i osobny ekran bitwy. Wygląd hydry (nasza jest mroczniejsza).
- **Hades:** dialogi z dużym portretem i tekstem, postacie reagujące na to, co się wydarzyło, śmierć jako postęp fabuły.
- **Key art** (okładka gry): źródło palety i klimatu.

## 3. Słownik (obowiązuje w kodzie i w tekstach)

| Termin | Znaczenie |
|---|---|
| Body | Tułów hydry. Jego śmierć oznacza śmierć hydry. |
| Head | Głowa, jednostka w walce. 3 na start, maksymalnie 9. |
| Stump | Kikut po ściętej głowie. |
| Severing | Ścięcie głowy. |
| Regrowth | Odrost: z kikuta wyrastają dwie nowe głowy. |
| Cauterize | Przypalenie kikuta ogniem, blokuje odrost. |
| Scar | Blizna po przypalonym kikucie. |
| Hatchling Head | Świeżo odrośnięta głowa: poziom 1, losowa klasa, losowa przypadłość. |
| Quirk | Przypadłość głowy (cecha z plusem, minusem albo absurdem). |
| Status | Efekt nałożony na człowieka przez atak (Corroded, Terrified, Soaked, Stunned). |
| Combo | Połączenie ataków dwóch głów albo ataku ze statusem, daje dodatkowy efekt. |
| Mist | Mgła hydry: zasób i teren na powierzchni. |
| Visibility | Wiedza gracza o mapie (mgła wojny): Unexplored / Remembered / Visible. |
| Alert | Czujność Zakonu, 0–100. |
| Expedition | Wyprawa Zakonu idąca na leże. |
| Great Burning | Wielkie Palenie: szturm Zakonu na leże na koniec aktu, z bossem. |
| Order of the Eternal Flame | Zakon Wiecznego Ognia, jedyna frakcja ludzi. |
| Eternal Flame | Wieczny Płomień w katedrze na zamku. Jego zgaszenie to zwycięstwo. |
| Flame Shrine | Kapliczka Płomienia na powierzchni, podtrzymuje Wieczny Płomień. |
| Lair | Leże hydry. |
| Egg / Broodling | Jajo / wyklute młode. |
| Mutation | Dziedziczna cecha przechodząca na potomków. |
| Lineage Grimoire | Księga zaklęć rodu, przechodzi na potomków. |
| Hidden Egg | Ukryte jajo, jedyny zapis rodu. Pozwala uratować ród przed wymarciem. |
| Generation | Jedno życie hydry, czyli jeden run. |
| Lineage | Ród, ciąg pokoleń. |

**Uwaga:** Mist i mgła wojny to dwie zupełnie różne rzeczy. W kodzie mgła hydry to zawsze `mist`, a wiedza gracza o mapie to zawsze `visibility`. Nigdy nie nazywaj widoczności „fog".

## 4. Struktura gry

Trzy poziomy pętli:

**Tura:** ruch po mapie heksagonalnej, odkrywanie, decyzje. Wejście na heks z ludźmi uruchamia bitwę.

**Run, czyli jedno pokolenie:** hydra startuje w leżu na nowej, wygenerowanej mapie. Eksploruje, walczy, zbiera, znosi jaja, buduje komnaty. Czujność Zakonu rośnie razem z tym, co hydra robi i zdobywa. Wyprawy atakują leże, a gaszenie kapliczek na powierzchni czujność obniża. Gdy czujność dojdzie do maksimum, Zakon ogłasza Great Burning: szturm na leże pod wodzą Mistrza Zakonu (boss). Przetrwanie otwiera kolejny akt: Zakon się wzmacnia (nowe typy wrogów), w podziemiach otwiera się głębsza warstwa, a Alert zaczyna od nowa. Run trwa, dopóki hydra żyje.

**Ród:** po śmierci wybierasz jedno z ocalałych jaj. Nowa hydra zaczyna od aktu 1 na nowej mapie, ale dziedziczy mutacje i zaklęcia rodu (sekcja 12).

**Zwycięstwo:** zgasić Wieczny Płomień i przejąć powierzchnię (sekcja 5.7).

## 5. Mapa heksagonalna (warstwa strategiczna)

### 5.1 Warstwy
Dwie osobne mapy heksagonalne: **Underground** (podziemia) i **Surface** (powierzchnia). Łączą je **Passages** (zapadliska, studnie, krypty), czyli heksy przejścia między warstwami. W podziemiach hydra porusza się swobodnie. Na powierzchnię wychodzi tylko przez Passage i tylko na heksy z Mist.

### 5.2 Tury i ruch
- Warstwa strategiczna jest turowa. Hydra to jeden żeton na mapie.
- Hydra ma punkty ruchu na turę (startowo 3). Koszt wejścia na heks zależy od terenu (roboczo: woda 1, błoto 1, korzenie 2, sól 3, lita skała nieprzechodnia).
- Przycisk **End Turn** uruchamia turę świata: ruszają się ludzkie jednostki, Mist na powierzchni zanika, jaja się wykluwają, mogą pojawić się eventy. Sam upływ tur podnosi Alert minimalnie albo wcale (sekcja 8).
- Na powierzchni obowiązuje cykl dnia i nocy liczony w turach (roboczo 6 tur dnia, 4 tury nocy).

### 5.3 Widoczność (jak w Cywilizacji)
Każdy heks ma jeden z trzech stanów:
- **Unexplored:** czarny, nic nie wiadomo.
- **Remembered:** odkryty wcześniej, teraz poza zasięgiem wzroku. Widać przyciemniony teren i obiekty stałe. Ludzie są pokazani jako „ostatnio widziani": wyblakła ikona z informacją, ile tur temu.
- **Visible:** w zasięgu wzroku (startowo 2 heksy od hydry). Wszystko aktualne.

Zasięg wzroku zmieniają klasy głów, przypadłości, mutacje, kapliczki i noc. Broodlingi-zwiadowcy też odsłaniają mapę. Przesłuchany jeniec może odsłonić jej fragment.

### 5.4 Zawartość heksów
- **Encounter:** grupa ludzi, wejście oznacza bitwę.
- **Event:** scena z wyborami.
- **Shrine:** podziemna kapliczka z błogosławieństwem, zwykle z haczykiem.
- **Spell Cache:** zaklęcie, czyli umiejętność aktywna.
- **Resource:** złoża Muck, źródła Moisture.
- **Nest Site:** miejsce pod komnatę leża.
- **Passage:** przejście między warstwami.
- **Lair:** leże.
- **Outpost:** umocniony punkt Zakonu.
- **Flame Shrine:** kapliczka Płomienia (tylko na powierzchni).
- **Hazard:** wypalona strefa, sól, pułapka.

### 5.5 Ludzie na mapie
Patrole i wyprawy poruszają się po heksach w turze świata. Gracz widzi je tylko w zasięgu wzroku. Po bitwie posłaniec biegnie do zamku; jeśli dotrze, Alert skacze, więc warto go przechwycić. Wyprawa, która dojdzie do leża, wywołuje bitwę obronną.

### 5.6 Powierzchnia i Mist
- Hydra może wejść tylko na heks z Mist.
- Akcja **Exhale Mist** pokrywa mgłą sąsiednie heksy i kosztuje Moisture.
- Mist zanika co turę: szybciej w dzień, wolniej w nocy. Wiatr i kapłani z kadzielnicami rozwiewają ją szybciej.
- Jeśli mgła pod hydrą zniknie, hydra jest **Exposed**: traci HP co turę i ma kary w bitwie, dopóki nie wróci do mgły.
- Inne cele najazdów: wieże strażnicze, młyny, wsie, obozy Zakonu. Zniszczenie celu daje łupy albo jeńców.

### 5.7 Płomienie i zwycięstwo
- Na powierzchni płoną **Flame Shrines**, kapliczki podtrzymujące Wieczny Płomień w katedrze na zamku.
- Zgaszenie kapliczki: bitwa ze strażą, potem kapliczka gaśnie, Alert spada, a heks i jego okolica stają się terytorium hydry z trwałą mgłą (Mist tam nie zanika). Tak rośnie dominacja hydry nad powierzchnią.
- Zakon próbuje rozpalać kapliczki na nowo: oddziały Torchbearers idą po mapie do zgaszonych kapliczek. Można je przechwycić.
- Gdy zgaśnie dość kapliczek (roboczo: wszystkie), zamek staje się celem ostatecznego szturmu. Zgaszenie Wiecznego Płomienia to zwycięstwo: mgła kładzie się na całej krainie.

### 5.8 Technicznie
Współrzędne osiowe (axial q, r), heksy pointy-top, algorytmy według przewodnika Red Blob Games „Hexagonal Grids". Wszystkie operacje na heksach (sąsiedzi, dystans, zasięg, linia wzroku, zamiana piksel↔heks) w czystym TypeScripcie, pokryte testami.

## 6. Walka (warstwa taktyczna)

### 6.1 Zasady ogólne
- Osobna scena: arena widziana z góry, generowana z szablonu zależnego od terenu heksu (zalana jaskinia, krypta, pole we mgle, dziedziniec kapliczki itd.).
- Czas rzeczywisty z pauzą. Spacja to pauza: w pauzie wydajesz rozkazy, po wznowieniu wszystko się dzieje. Prędkości gry: 1× i 0,5×.
- Symulacja walki działa w stałym kroku (20 tików na sekundę), niezależnie od liczby klatek. Pauza to po prostu zatrzymanie tików.
- Ruch swobodny, nie po heksach. Kolizje jako proste okręgi, bez silnika fizyki.

### 6.2 Hydra w walce
- **Body:** duże, wolne, z własnym HP. Śmierć Body to śmierć hydry i koniec pokolenia. Porusza się na rozkaz (prawy klik albo tapnięcie w teren).
- **Heads:** każda głowa to jednostka z HP, klasą, poziomem, imieniem i przypadłością. Atakuje tylko w zasięgu szyi od Body. Ma atak podstawowy (automatyczny) i umiejętności z czasem odnowienia.
- Szyje rysowane proceduralnie jako łańcuch segmentów od Body do pozycji głowy, więc głowa widocznie „sięga" do celu.
- Sterowanie: wybór głowy klawiszami 1–9 albo kliknięciem, umiejętności Q/W/E, kliknięcie celu. Rozkazy można kolejkować w pauzie. Od początku projektujemy tak, żeby dało się grać dotykiem: duży przycisk pauzy, tapnięcie wybiera, kolejne tapnięcie wskazuje cel.

### 6.3 Ścinanie, odrost, przypalanie (rdzeń gry)
- Głowa z 0 HP zostaje ścięta i zostaje po niej Stump.
- Po czasie odrostu (roboczo 6 s) z kikuta wyrastają **dwie Hatchling Heads**: poziom 1, losowa klasa z odblokowanej puli, losowa przypadłość, wygenerowane imię. Liczba głów nigdy nie przekracza 9.
- Człowiek z ogniem (Torchbearer, zaklęcia ognia) może **przypalić** kikut: stoi przy nim kilka sekund („kanałuje"). Przypalony kikut nie odrasta do końca bitwy i zostaje blizną, którą leczy odpoczynek w leżu albo kapliczka.
- Głowy zbierają doświadczenie między bitwami i na poziomach 3 i 5 wybierają specjalizację (jak w Tomb Guard). Stracić weterana boli, ale w zamian dostajesz dwie młode głowy. To jest główne napięcie gry.

### 6.4 Klasy głów (pula startowa)
- **Biter:** walka wręcz, duże obrażenia.
- **Acid Spitter:** atak z dystansu, obrażenia w czasie, zdziera pancerz.
- **Mist Breather:** tworzy chmury mgły na arenie. Hydrę w chmurze trudniej trafić, ludzie w niej zwalniają, a ogień w chmurze słabnie.
- **Screamer:** obszarowy strach i ogłuszenie, przerywa kanałowanie (w tym przypalanie).
- **Glutton:** zjada powalonych ludzi, leczy Body.
- **The Spare:** bezużyteczna głowa. Nic nie robi, czasem robi coś absurdalnego. Jeśli dożyje, ma najlepsze specjalizacje w grze.

### 6.5 Synergie i combosy
- Głowy działają najlepiej razem. Ataki mają **tagi** (bite, acid, mist, scream, devour), a trafienia nakładają na ludzi **statusy** (Corroded, Terrified, Soaked, Stunned). Combo powstaje, gdy atak z odpowiednim tagiem trafi cel z odpowiednim statusem albo gdy dwie głowy trafią ten sam cel w krótkim oknie czasu (roboczo 1,5 s).
- Pauza jest do tego stworzona: zatrzymujesz walkę, ustawiasz kolejność ataków kilku głów, puszczasz i patrzysz, jak się składają. To główna umiejętność gracza, tak jak w Tomb Guard.
- Combo ma być widać i czuć: nazwa wyskakuje nad celem, krótkie spowolnienie, czasem komentarz głów (*„That was my idea." / „It was not."*).
- Pierwsze combosy:

| Combo | Jak | Efekt |
|---|---|---|
| Corrode & Crush | Acid Spitter nakłada Corroded, potem Biter gryzie | duże obrażenia, pancerz celu pęka na stałe |
| Acid Fog | kwas wpluty w chmurę Mist | chmura przez kilka sekund zadaje ludziom obrażenia |
| Smother | chmura Mist na Torchbearerze | pochodnia gaśnie, przez kilka sekund nie przypali kikuta |
| Panic Feast | Glutton na celu z Terrified i niskim HP | zjada go od razu, bez powalania |
| Echo Scream | dwa Screamery krzyczą w odstępie do 1 s | podwójny zasięg ogłuszenia; głowy kłócą się, która była głośniej |
| Pincer | dwa Bitery gryzą ten sam cel z przeciwnych stron | cel się przewraca |
| Twin Bond | dwie głowy z tego samego kikuta atakują ten sam cel | premia do obrażeń; gdy jedna zginie, druga wpada losowo w szał albo w żałobę |

- The Spare w dowolnym combo dokłada losowy, absurdalny efekt.
- Specjalizacje, mutacje i zaklęcia mogą dodawać nowe combosy i wzmacniać istniejące.
- Zakon ma kontry: Censer Priest zdejmuje statusy, Brazier Bearer rozprasza mgłę, rycerze są odporni na strach.
- Combosy żyją w danych (JSON): warunki (status, tagi, okno czasu, klasy głów) i efekt. Nowy combo to nowy wpis, bez zmian w kodzie.
- Odkryte combosy trafiają do kodeksu, nieodkryte widać jako „???". To zachęca do eksperymentów w kolejnych runach.

### 6.6 Ludzie: Zakon Wiecznego Ognia
- **Man-at-Arms:** podstawowy zbrojny Zakonu.
- **Headhunter:** topór, premia do obrażeń przeciw głowom, poluje właśnie na nie.
- **Torchbearer:** brat świecki z pochodnią, przypala kikuty, cel priorytetowy. Przestrzega godzin zakonnych, więc czasem przerywa walkę, żeby odmówić modlitwę o pełnej godzinie.
- **Crossbowman:** atak z dystansu.
- **Censer Priest:** rozwiewa mgłę, zdejmuje statusy, wzmacnia sojuszników.
- **Brazier Bearer:** stawia kosze żarowe, które wysuszają arenę (na suchym Body zwalnia) i rozpraszają chmury mgły.
- **Tithe Collector:** jeśli ucieknie z areny, zabiera dziesięć procent twoich zasobów. Wystawia pokwitowanie.
- **Knight of the Eternal Flame:** pancerny, szarżuje, odporny na strach.
- **Bossowie:** Mistrzowie Zakonu, na końcu Wielki Mistrz strzegący Wiecznego Płomienia.

### 6.7 Teren areny
Woda (Body szybsze, powolne leczenie), błoto, suchy grunt (Body wolniejsze), chmury Mist, kosze żarowe.

### 6.8 Koniec bitwy
- Wygrana: wszyscy ludzie martwi albo uciekli. Przegrana: śmierć Body.
- Odwrót: Body wychodzi krawędzią areny, ucieczka z karą.
- Po bitwie: doświadczenie, łupy, jeńcy. Jeńca można zjeść (Bones, leczenie) albo przesłuchać (dialog, informacja, odsłonięcie fragmentu mapy).
- Stan głów (ścięte, nowe, blizny, doświadczenie) przechodzi na mapę.

## 7. Leże i królestwo

- Leże to heks-baza. Tam hydra odpoczywa (leczenie, usuwanie blizn), znosi jaja, buduje komnaty i zarządza głowami (specjalizacje).
- Zasoby (trzy, to decyzja ostateczna): **Muck** (budowa), **Moisture** (paliwo mgły), **Bones** (z ludzi; jaja i wzrost).
- **Jaja** kosztują Bones i Muck, po kilku turach wykluwają się w **Broodlingi**: obrońców w bitwie o leże albo zwiadowców na mapie (mały żeton, odsłania teren, może zginąć). Niewyklute jaja to kandydaci na następne pokolenie.
- **Komnaty** buduje się na Nest Sites w sąsiedztwie leża, każda poszerza terytorium (jak granice w Cywilizacji): Brood Pool (więcej jaj), Mist Well (więcej Moisture), Bone Pit, Trophy Wall (morale), Shrine Grotto.
- Bitwa obronna toczy się na arenie leża, z Broodlingami i efektami komnat. Przegrana obrona oznacza, że Zakon niszczy jaja i komnaty, łącznie z możliwością zniszczenia wszystkich jaj.

## 8. Alert (czujność Zakonu)

- Skala 0–100. Rośnie przede wszystkim od tego, co hydra robi: odkrywanie nowych heksów (bardzo mało), otwieranie kapliczek i Spell Caches, bitwy, posłańcy docierający do zamku, pokazywanie się na powierzchni. Sam upływ tur podnosi go minimalnie albo wcale.
- Podziemia mają być miejscem długich wypraw. **Cel balansu:** gracz odkrywa roboczo 40–80 heksów podziemi, zanim pierwsza wyprawa ruszy na leże. Presja ma być tłem, nie stoperem.
- Progi: częstsze patrole, potem wyprawy na leże, potem nowe typy wrogów, a przy 100 Great Burning, czyli boss aktu.
- Spada po zgaszeniu kapliczki Płomienia, przechwyceniu posłańców i w niektórych eventach (heretycki mnich rozpowiada, że potwór z bagien to tylko przypowieść).
- Pasek Alertu jest zawsze widoczny.

## 9. Generator podziemi i zmienność runów

- Generator jest deterministyczny, działa z ziarna (seed). Wszystkie losowania w symulacji idą przez własny generator liczb losowych z ziarnem, nigdy przez `Math.random()`.
- Seed jest widoczny w menu pauzy, a parametr URL `?seed=` odtwarza run (do testów i do dzielenia się mapą ze znajomymi).
- Podziemia są duże (roboczo kilkaset heksów na warstwę), bo mają wystarczyć na długie wyprawy.
- Biomy podziemi: Flooded Caves, Root Tangle, Old Crypts (ludzkie katakumby), Salt Mines (sucho i groźnie), Fungal Deeps.
- Generowanie: teren z szumu, gwarancja spójności (wszystko ważne osiągalne z leża), rozmieszczenie obiektów według reguł:
  - leże blisko środka mapy,
  - kapliczki nie bliżej niż N heksów od leża,
  - co najmniej 2 Passages na powierzchnię,
  - gęstość i siła spotkań rosną z odległością od leża,
  - Spell Caches preferują ślepe zaułki (nagroda za eksplorację).
- Powierzchnia ma osobny generator: zamek z katedrą Wiecznego Płomienia na wzgórzu po przeciwnej stronie, kapliczki Płomienia rozsiane po krainie, wsie, pola, las, rzeka, obozy Zakonu. Mgła startowo tylko przy wyjściach z Passages.
- Warstwy zmienności: układ mapy, rozmieszczenie obiektów, pula eventów, przypadłości nowych głów, skład wypraw Zakonu oraz jeden losowy **modyfikator runu**:
  - Drought: mgła zanika szybciej.
  - Wet Year: więcej wody, więcej Moisture.
  - A Generous Bequest: Zakon dostał spadek. Więcej wrogów, lepsze łupy.
  - Plague of Frogs: do ustalenia, ma być dziwnie.
  - Feast of Saint Cinder: Zakon świętuje, Alert rośnie wolniej.
- Walidator: test generuje co najmniej 1000 seedów i sprawdza powyższe reguły (osiągalność, liczebności, brak kolizji obiektów).

## 10. Eventy

- Jak w Tomb Guard: tekst i wybory z ryzykiem i nagrodą. Niektóre wybory wymagają głowy danej klasy, niektóre kosztują zasoby, niektóre to hazard.
- Eventy żyją w danych (JSON): warunki (warstwa, biom, akt, zakres Alertu, obecne klasy głów), wybory, wyniki (zmiany zasobów, przypadłość, mutacja, nowa głowa, bitwa, dialog, odsłonięcie mapy, przedmiot).
- Przykład tonu i struktury:

> *A novice of the Order of the Eternal Flame is inspecting your swamp for heresy. He has a checklist.*
> - **Eat him.** +Bones, Alert +5.
> - **[Screamer] Answer his questions.** He faints. Alert −5.
> - **Ask about indulgences.** −20 Muck. Gain *Indulgence*: once per run, an Expedition turns back while your case is under review.

## 11. Dialogi (w stylu Hadesa)

- Prezentacja: przyciemnione tło, duży portret (popiersie) po lewej albo prawej, plakietka z imieniem, tekst pojawiający się litera po literze, kliknięcie przewija dalej, czasem wybór.
- Kto mówi: głowy (ich kłótnie to główny silnik komedii), Old Mother Toad (strażniczka leża i mentorka, pamięta wszystkie pokolenia), jeńcy, Mistrzowie Zakonu (wejścia bossów), przodkowie przy zmianie pokolenia.
- Wyzwalacze: po bitwie (reakcja na to, co się stało: ścięcie, odrost, przypalenie), nowy biom, pierwszy wróg danego typu, zgaszona kapliczka, zmiana pokolenia, boss.
- Kluczowa zasada z Hadesa: kwestie mają warunki i priorytety, a flagi pilnują, żeby się nie powtarzały. Gracz ma czuć, że gra zauważyła, co zrobił.
- Wszystkie kwestie w danych (JSON), nie w kodzie.

## 12. Pokolenia i dziedzictwo

- Po śmierci hydry: ekran pokolenia, wybór jednego z ocalałych jaj. Nowe pokolenie zaczyna od aktu 1 na nowej mapie.
- Postęp w życiu hydry przechodzi na potomków na dwa sposoby:
  - **Mutations:** dziedziczne cechy. Hydra zdobywa je w trakcie życia (kapliczki, zjedzeni bossowie, zgaszone płomienie, dziwne eventy), a jaja dziedziczą część z nich. Każde jajo pokazuje, które mutacje niesie, np. *Thick-necked* (+20% HP głów), *Fireproof Scales* (przypalanie trwa dłużej), *Paranoid* (+1 zasięg wzroku, −1 głowa na start). Mutacje mogą mieć minusy.
  - **Lineage Grimoire:** zaklęcia znalezione w trakcie życia można w leżu wpisać do księgi rodu. Potomek zaczyna z wybranymi zaklęciami z księgi. Liczba miejsc w księdze rośnie powoli.
- **Hidden Egg, czyli zapis rodu:** gdy rodowi dobrze się wiedzie, gracz może w leżu poprosić Old Mother Toad, żeby ukryła jedno jajo w sekretnym miejscu. Jajo zapamiętuje dziedzictwo rodu z tej chwili (mutacje i księgę zaklęć). Naraz może istnieć tylko jedno ukryte jajo i nie da się go podmienić na nowsze, więc moment ukrycia to prawdziwa decyzja. Po wykorzystaniu można ukryć następne.
- **Wymarcie rodu:** gdy hydra umiera, a nie ma żadnego jaja (bo nie zdążyła ich znieść albo wyprawa zniszczyła wszystkie), gracz dostaje wybór:
  - **End the Lineage:** ród się kończy i trafia do Księgi Rodów. Nowy ród zaczyna bez mutacji i zaklęć, odblokowania konta zostają.
  - **Miraculous Intervention:** dostępna tylko, gdy istnieje ukryte jajo. Old Mother Toad wyciąga je z kryjówki i ród trwa dalej z dziedzictwem zapisanym w jaju. Wszystko, co ród zdobył po ukryciu jaja, przepada.
- Dwie warstwy postępu: **dziedzictwo rodu** (mutacje, księga zaklęć; przepada, gdy ród wymrze) i **odblokowania konta** (na stałe: nowe klasy głów, eventy, kapliczki, modyfikatory, zdobywane przez wyzwania jak w Tomb Guard).
- **Księga Rodów:** kronika pokoleń z epitafiami, np. *„Morwenna II. Slain by a tithe collector. He gave her a receipt."*

## 13. Styl wizualny

- Pixel art, wewnętrzna rozdzielczość 640×360, skalowanie całkowite, bez wygładzania.
- Paleta z key artu. Podziemia i hydra są zimne: głęboki turkus, bagienna zieleń, czerń, chorobliwie żółtozielona bioluminescencja. Zakon i powierzchnia są ciepli: złoto, pomarańcz, czerwone chorągwie, ogień. Mist to granica między tymi światami: blada, zielonkawoszara, półprzezroczysta. Konflikt gry jest dosłownie widoczny: ciepłe światło płomieni przeciw zimnej mgle.
- Hydra: sprite Body, proceduralne szyje, sprite'y głów z odcieniem zależnym od klasy. Dzięki temu dodanie głowy nie wymaga nowej animacji.
- Portrety do dialogów: większe popiersia w pixel arcie.
- Grafika na start: zastępcza (generowana w kodzie) i darmowe paczki CC0. Docelowe sprite'y i portrety robi Piotr w GPT, dlatego wymiary i kadrowanie każdej grafiki muszą być spisane w `docs/ASSETS.md`.

## 14. Humor: zasady pisania

- Świat jest ponury i poważny. Zakon jest śmiertelnie poważny w sprawach absurdalnych: śluby, relikwie z certyfikatami autentyczności, grafiki dyżurów przy płomieniu, odpusty, godziny zakonne, przepisy przeciwpożarowe zakonu czczącego ogień.
- Głowy hydry to komiczny chór: kłócą się, mają ambicje, mylą się.
- Deadpan i krótko. Bez współczesnych memów i internetowego slangu. Łamanie czwartej ściany rzadko i celowo.
- Jedyna frakcja ludzi: **Order of the Eternal Flame**. Rycerze, bracia świeccy z pochodniami, kapłani z kadzielnicami, poborcy dziesięciny. Motto: *„The Flame never sleeps."*
- Próbki tonu:
  - Boss: *„Grand Master Ignatius Vell. By the Eternal Flame, this swamp is hereby declared kindling."*
  - Kapliczka Płomienia: *„The Flame never sleeps. Brother Aldric, its keeper, very much does."*
  - Po odroście: *NEW HEAD: „Where are we?" / OTHER NEW HEAD: „Who are you?" / GERALD: „Ask Kevin. Oh. Right."*
  - Podziemna kapliczka: *„A shrine to a frog god nobody remembers. The offering bowl holds one coin and a note: 'IOU one sacrifice. — Management.'"*
  - Old Mother Toad: *„I have buried eleven of you. You are not my favourite."*

## 15. Kamienie milowe

Zasada: po każdym etapie gra jest wdrożona i grywalna pod linkiem, a Claude Code zatrzymuje się na playtest.

**M0: fundament.** Projekt (Vite + TypeScript + Phaser 4), testy, skrypt do zrzutów ekranu, repo na GitHubie, automatyczne wdrożenie na GitHub Pages. Ekran startowy dostępny pod linkiem.

**M1: pierwszy grywalny kawałek, czyli cała pętla w najcieńszej wersji.**
1. Mała mapa podziemi (heksy, promień ok. 8–10) z ziarna, prosty teren (woda, błoto, skała), trzy stany widoczności, żeton hydry, punkty ruchu, End Turn, licznik tur i Alert (na razie rośnie od odkrywania i bitew).
2. Kilka heksów spotkań, wejście na taki heks uruchamia bitwę. Jeden typ znajdźki (Muck).
3. Bitwa: Body i 3 głowy (Biter, Acid Spitter, Mist Breather) przeciw zbrojnym, Headhunterom i Torchbearerom. Pauza i rozkazy, ścinanie, odrost, przypalanie, wygrana i przegrana, powrót na mapę ze zmienionym składem głów. System statusów i trzy pierwsze combosy: Corrode & Crush, Acid Fog, Smother.
4. Minimalny interfejs: lista głów z HP, pasek Alertu, przycisk pauzy.

Gotowe, gdy: da się rozegrać kilka bitw pod linkiem, testy przechodzą, a zrzuty mapy i bitwy leżą w `docs/screens/`.

**M2: podziemia na serio.** Pełny generator z biomami i walidatorem, duża mapa, leże, kapliczki, Spell Caches, zasoby, pozostałe klasy głów i ich combosy, kodeks combosów, doświadczenie i specjalizacje.

**M3: Zakon kontratakuje.** Alert z progami, patrole i posłańcy na mapie, wyprawy, obrona leża, jaja i Broodlingi, Great Burning jako boss aktu.

**M4: powierzchnia.** Passages, Mist, dzień i noc, kapliczki Płomienia (gaszenie, trwała mgła, ponowne rozpalanie przez Zakon), stan Exposed.

**M5: eventy i dialogi.** Oba systemy i pierwsza porcja treści.

**M6: pokolenia.** Ekran pokolenia, mutacje, księga zaklęć rodu, ukryte jajo i wybór przy wymarciu rodu, odblokowania, Księga Rodów, zapis gry.

**M7 i dalej: finał i szlif.** Szturm na zamek i zwycięstwo, dźwięk, podmiana grafiki, balans, pełne sterowanie dotykowe.

## 16. Otwarte pytania (decyduje Piotr, nie zgadywać)

- Ile kapliczek Płomienia trzeba zgasić, żeby zamek stał się celem (roboczo: wszystkie).
