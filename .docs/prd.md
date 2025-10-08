# Dokument wymagań produktu (PRD) - FlexiSplit

## 1. Przegląd produktu

FlexiSplit to prosta, mobilna aplikacja do jednorazowego rozliczania wspólnych kosztów w grupach znajomych i rodzin podczas wyjazdów oraz wydarzeń. MVP koncentruje się na utworzeniu jednego aktywnego rozliczenia, dodawaniu uczestników, rejestrowaniu wydatków z równym podziałem na wybranych członków oraz deterministycznym zamknięciu rozliczenia z minimalną liczbą przelewów.

Zakładany użytkownik: nieformalna grupa, mieszanka osób z kontem i uczestników „offline” dodanych przez administratora. Projekt nastawiony na mobile‑first, wspierany w przeglądarkach iOS Safari i Android Chrome.

Definicje pojęć:
- Rozliczenie: pojedyncza sesja rozrachunkowa z zestawem uczestników i wydatków.
- Administrator: osoba, która tworzy rozliczenie; ma pełne uprawnienia edycyjne.
- Uczestnik: członek rozliczenia (z kontem lub „offline”).
- Wydatek: pozycja kosztowa z jednym płacącym i listą objętych uczestników.

Wysokopoziomowy przepływ MVP: utworzenie rozliczenia → zdefiniowanie uczestników i nazw → udostępnienie zaproszeń (opcjonalnie) → dodawanie wydatków i wykluczeń → zamknięcie i obliczenie sald metodą Minimum Cash Flow → eksport podsumowania tekstowego.

Założenia kluczowe:
- Max 3 aktywne rozliczenia na użytkownika‑administratora w danym momencie (archiwum dla zamkniętych).
- PLN, obliczenia w groszach, zaokrąglenia do 0,01; reszty rozdzielane po największych częściach ułamkowych.
- Minimalizacja PII: imię/pseudonim, pseudonimizowane identyfikatory; pojedyncze linki zaproszeń z TTL 72h.

## 2. Problem użytkownika

Ręczne rozliczanie wspólnych wydatków jest czasochłonne, podatne na błędy i często prowadzi do nieporozumień oraz poczucia niesprawiedliwości. Użytkownicy mają trudność w ustaleniu, kto, ile i za co zapłacił, zwłaszcza po wyjazdach i wydarzeniach grupowych. FlexiSplit eliminuje niejasności przez prosty, jednoetapowy proces rozliczenia z przejrzystymi zasadami obliczeń, deterministycznym algorytmem minimalizacji przelewów i prostym eksportem wyników.

## 3. Wymagania funkcjonalne

3.1. Rozliczenie
1) Utworzenie pojedynczego, aktywnego rozliczenia przez administratora z nazwą (np. „Wyjazd weekendowy”).
2) Max 3 aktywne rozliczenia per administrator jednocześnie; zamknięte trafiają do archiwum i są tylko do odczytu.
3) Automatyczne nadanie identyfikatora rozliczenia; pseudonimizacja na potrzeby analityki.

3.2. Uczestnicy i zaproszenia
1) Administrator definiuje liczbę i nazwy uczestników przy tworzeniu; nazwy są unikalne w ramach rozliczenia.
2) Zaproszenia mają formę jednorazowych tokenów z TTL 72h; dołączenie jest opcjonalne.
3) Administrator może unieważnić i zregenerować token; zdarzenie jest logowane.
4) Uczestnik dołączający po raz pierwszy może zmienić swoją nazwę (przy zachowaniu unikalności); historia zmian nazw jest logowana.
5) Możliwość dodania uczestników „offline” (bez konta) i późniejszego scalenia z kontem po weryfikacji, bez zmiany participantId.

3.3. Wydatki i podział
1) Każdy wydatek ma jednego płacącego, kwotę (PLN), opis i listę objętych uczestników.
2) Równy podział na wskazanych uczestników; możliwość wykluczenia dowolnych uczestników dla danego wydatku.
3) Obliczenia w groszach; zaokrąglenie do 0,01; reszty rozdzielane stabilnie według największych części ułamkowych.
4) Uprawnienia: autor może edytować/usuwać swoje wydatki; administrator może edytować/usuwać wszystkie.
5) Prosty log zmian: kto/co/kiedy dla wydatków i nazw uczestników.

3.4. Współbieżność i wersjonowanie
1) Optymistyczne blokowanie wersją rekordu dla zapisów wydatków/uczestników.
2) W przypadku konfliktu użytkownik otrzymuje informację i aplikacja proponuje ponowienie zapisu po odświeżeniu danych.

3.5. Zamknięcie rozliczenia
1) Tylko administrator może zamknąć rozliczenie; po zamknięciu edycja jest zablokowana.
2) Obliczenie sald i minimalizacja liczby przelewów algorytmem Minimum Cash Flow:
   a) deterministyczne sortowanie po wartości bezwzględnej salda, następnie po participantId,
   b) obliczenia w groszach, stabilne rozwiązywanie remisów.
3) Rozliczenie trafia do archiwum; widok tylko do odczytu z pełnym podsumowaniem i historią zmian.

3.6. Eksport i prezentacja wyników
1) Eksport podsumowania jako tekst z przyciskiem „Kopiuj do schowka”.
2) Podsumowanie zawiera: listę sald uczestników, listę przelewów minimalizujących płatności oraz notę o zasadach obliczeń i zaokrągleń.
3) Format liczb zgodny z PL (przecinek jako separator dziesiętny w UI).

3.7. Analityka i prywatność
1) Zdarzenia: settlement_created, member_joined, expense_added, settlement_closed.
2) Parametry minimalizujące PII: pseud. settlement_id, member_count, expense_count, device_type.
3) Brak przechowywania wrażliwych danych; nazwy jako atrybut prezentacyjny, tożsamość po participantId.

3.8. Walidacje i błędy
1) Kwoty dodatnie, do dwóch miejsc po przecinku; walidacja wejścia.
2) Unikalność nazw w obrębie rozliczenia; komunikat i propozycja alternatywy w razie konfliktu.
3) Obsługa wygaśnięcia/zużycia tokenu zaproszenia i braków uprawnień.
4) Fallback przy błędzie schowka: prezentacja gotowego tekstu do ręcznego skopiowania.

## 4. Granice produktu

Poza zakresem MVP:
1) Rozliczenia cykliczne/miesięczne.
2) Przekazanie roli administratora.
3) Integracja płatności (BLIK, przelewy online) i rozliczenia płatności w aplikacji.
4) Wielowalutowość i automatyczne kursy.
5) Zaawansowane statystyki, raporty CSV/PDF.
6) Powiadomienia push.
7) Logowanie przez konta społecznościowe.
8) Dodawanie zdjęć paragonów.
9) Edycja zamkniętych rozliczeń lub ich ponowne otwarcie.
10) PWA/offline poza podstawowym cachingiem przeglądarki.

Ograniczenia i decyzje projektowe:
1) Mobile‑first; priorytet iOS Safari i Android Chrome.
2) Minimalizacja PII; krótkie TTL i jednorazowość linków zaproszeń.
3) Deterministyczny MCF i jawne zasady zaokrągleń.

Kwestie otwarte do uściślenia po MVP (nie blokują implementacji przy przyjętych założeniach tymczasowych):
1) Retencja/anonymizacja danych (okres archiwizacji, trwałość logów zmian).
2) Limity skali (max uczestników/wydatków) i zachowanie przy bardzo dużych rozliczeniach.
3) A11y i minimalne wymagania wydajności na słabszych urządzeniach.
4) Dokładny format treści eksportu (kolejność sekcji, styl liczb); w MVP: wersja tekstowa PL.
5) Zasady modyfikacji listy uczestników po rozpoczęciu dodawania wydatków; w MVP: dodawanie dozwolone, usuwanie zablokowane jeśli uczestnik figuruje w jakimkolwiek wydatku.

## 5. Historyjki użytkowników

ID: US-001
Tytuł: Utworzenie nowego rozliczenia
Opis: Jako użytkownik chcę utworzyć jedno aktywne rozliczenie, aby rozpocząć dodawanie uczestników i wydatków.
Kryteria akceptacji:
- Podając nazwę i potwierdzając, tworzę rozliczenie z rolą administratora.
- Mogę utworzyć max 3 aktywne rozliczenia. Nie mogę utworzyć czwartego aktywnego rozliczenia; otrzymuję komunikat i link do archiwum.
- Rozliczenie otrzymuje identyfikator; stan = aktywne.

ID: US-002
Tytuł: Definiowanie uczestników przy tworzeniu
Opis: Jako administrator chcę zdefiniować listę uczestników i ich nazwy.
Kryteria akceptacji:
- Mogę dodać co najmniej 1 uczestnika; nazwy muszą być unikalne.
- W przypadku konfliktu nazwy widzę komunikat i propozycję zmiany.
- Lista jest zapisana wraz z rozliczeniem.

ID: US-003
Tytuł: Zaproszenia z jednorazowym tokenem
Opis: Jako administrator chcę generować jednorazowe linki z TTL 72h dla uczestników.
Kryteria akceptacji:
- Dla każdego uczestnika generowany jest unikalny token jednorazowy.
- Token wygasa po 72h lub po pierwszym użyciu.
- Administrator może unieważnić i zregenerować token; zdarzenie jest logowane.

ID: US-004
Tytuł: Dołączenie przez uczestnika i zmiana własnej nazwy
Opis: Jako uczestnik chcę dołączyć przez link i ustawić swoją nazwę, jeśli to moja pierwsza sesja.
Kryteria akceptacji:
- Wejście przez ważny token dołącza mnie do rozliczenia.
- Jeśli nazwa koliduje, otrzymuję komunikat i muszę wybrać unikalną.
- Zmiana nazwy jest logowana w historii.
- Próba użycia wygasłego/zużytego tokenu skutkuje komunikatem o błędzie i wskazówką kontaktu z administratorem.

ID: US-005
Tytuł: Dodawanie uczestnika „offline”
Opis: Jako administrator chcę dodać uczestnika bez konta, aby uwzględnić go w rozliczeniu.
Kryteria akceptacji:
- Mogę dodać uczestnika z nazwą, bez wymogu konta.
- Uczestnik „offline” może być przypisywany do wydatków.
- Uczestnik ma participantId i może być scalony z kontem później.

ID: US-006
Tytuł: Scalenie uczestnika „offline” z kontem
Opis: Jako administrator/uczestnik chcę po weryfikacji połączyć wpis „offline” z kontem użytkownika.
Kryteria akceptacji:
- Po scaleniu pozostaje ten sam participantId i zachowana historia zmian.
- Uczestnik widzi swoje dotychczasowe wydatki i saldo.
- Zdarzenie scalenia jest logowane.

ID: US-007
Tytuł: Dodanie wydatku z równym podziałem
Opis: Jako uczestnik chcę dodać wydatek, wskazać płacącego i uczestników, aby koszt rozdzielił się równo.
Kryteria akceptacji:
- Wymagane pola: płacący, kwota > 0, opis tekstowy, lista objętych uczestników.
- Domyślnie wszyscy uczestnicy są zaznaczeni; mogę odznaczać.
- Kwoty wyliczane w groszach; suma części równa kwocie po zasadach zaokrągleń.
- Po zapisie emisja zdarzenia analitycznego expense_added.

ID: US-008
Tytuł: Wykluczenia z wydatku
Opis: Jako uczestnik chcę wykluczyć wybranych uczestników z konkretnego wydatku.
Kryteria akceptacji:
- Mogę odznaczyć dowolnych uczestników dla danego wydatku.
- Podział przelicza się tylko na pozostających uczestników.
- Zmiana jest logowana z kontekstem wydatku.

ID: US-009
Tytuł: Edycja własnego wydatku
Opis: Jako autor chcę edytować lub usunąć własny wydatek.
Kryteria akceptacji:
- Mogę zmienić opis, kwotę, płacącego, listę uczestników.
- Zmiany aktualizują wersję rekordu; historia zmian jest zapisywana.
- Usunięcie jest możliwe przed zamknięciem rozliczenia.

ID: US-010
Tytuł: Uprawnienia administratora do edycji
Opis: Jako administrator chcę edytować/usuwać dowolny wydatek.
Kryteria akceptacji:
- Administrator ma pełne uprawnienia edycyjne do wszystkich wydatków.
- Zmiany są logowane z identyfikatorem administratora.

ID: US-011
Tytuł: Współbieżność i konflikt zapisu
Opis: Jako użytkownik chcę bezpiecznego zapisu w przypadku równoczesnych edycji.
Kryteria akceptacji:
- Każdy zapis weryfikuje wersję rekordu (ETag/wersja).
- Przy konflikcie widzę komunikat o konieczności odświeżenia i ponowne próby.
- Po odświeżeniu mogę zapisać ponownie bez utraty danych.

ID: US-012
Tytuł: Zamknięcie rozliczenia
Opis: Jako administrator chcę zamknąć rozliczenie i zablokować dalsze edycje.
Kryteria akceptacji:
- Tylko administrator widzi przycisk Zamknij.
- Po zamknięciu edycja wydatków/uczestników jest niemożliwa.
- Stan rozliczenia = zamknięte; przeniesienie do archiwum.

ID: US-013
Tytuł: Algorytm minimalizacji przelewów (MCF)
Opis: Jako administrator chcę, aby lista przelewów była deterministyczna i minimalna.
Kryteria akceptacji:
- Salda liczone w groszach, z zastosowaniem zasad zaokrągleń reszt.
- Kolejność rozwiązywania remisów: najpierw po |saldo|, następnie participantId.
- Wynik jest stabilny dla tych samych danych wejściowych.

ID: US-014
Tytuł: Widok podsumowania po zamknięciu
Opis: Jako uczestnik chcę zobaczyć czytelne podsumowanie sald i przelewów.
Kryteria akceptacji:
- Widok tylko do odczytu zawiera salda wszystkich uczestników.
- Lista przelewów minimalizuje liczbę płatności.
- Widoczna jest nota o zasadach obliczeń.

ID: US-015
Tytuł: Eksport tekstowy i kopiowanie do schowka
Opis: Jako użytkownik chcę skopiować podsumowanie do schowka, by udostępnić je grupie.
Kryteria akceptacji:
- Kliknięcie przycisku kopiuje pełny tekst podsumowania.
- W razie braku dostępu do schowka pojawia się treść do ręcznego skopiowania.
- Format liczb zgodny z PL w UI.

ID: US-016
Tytuł: Historia zmian nazw uczestników
Opis: Jako administrator chcę mieć dostęp do historii zmian nazw.
Kryteria akceptacji:
- Każda zmiana nazwy zapisuje: kto, co, kiedy.
- Historia jest dostępna w widoku szczegółów uczestnika.

ID: US-017
Tytuł: Bezpieczny dostęp przez token (uwierzytelnienie lekkie)
Opis: Jako uczestnik chcę, aby dostęp do rozliczenia był możliwy wyłącznie przez ważny, jednorazowy link.
Kryteria akceptacji:
- Wejście bez ważnego tokenu kończy się komunikatem o braku dostępu.
- Użyty token nie działa ponownie.
- Administrator może unieważnić token w dowolnym momencie.

ID: US-018
Tytuł: Analityka kluczowych zdarzeń
Opis: Jako właściciel produktu chcę mierzyć tworzenie, dołączanie, dodawanie wydatków i zamykanie.
Kryteria akceptacji:
- Emisja settlement_created przy utworzeniu aktywnego rozliczenia.
- Emisja member_joined przy skutecznym dołączeniu.
- Emisja expense_added przy dodaniu wydatku.
- Emisja settlement_closed przy zamknięciu.
- Parametry zgodnie z zasadą minimalizacji PII.

ID: US-019
Tytuł: Walidacje kwot i formatów
Opis: Jako użytkownik chcę, aby błędne kwoty były blokowane z jasnym komunikatem.
Kryteria akceptacji:
- Kwota musi być > 0 i mieć maks. 2 miejsca po przecinku.
- W przypadku błędu pole jest oznaczone, a zapis zablokowany.

ID: US-020
Tytuł: Stabilna dystrybucja reszt z zaokrągleń
Opis: Jako użytkownik chcę, by różnice groszowe były rozdzielane przewidywalnie.
Kryteria akceptacji:
- Reszty wynikające z zaokrągleń przypisywane są kolejno do największych części ułamkowych.
- Wynik jest deterministyczny dla tych samych danych wejściowych.

ID: US-021
Tytuł: Archiwum rozliczeń
Opis: Jako użytkownik chcę mieć dostęp do zamkniętych rozliczeń w trybie tylko do odczytu.
Kryteria akceptacji:
- Po zamknięciu rozliczenie pojawia się w archiwum.
- Edycja jest niedostępna; dostępny jest eksport i historia.

ID: US-024
Tytuł: Komunikaty o wygaśnięciu/zużyciu tokenu
Opis: Jako uczestnik chcę jasnego komunikatu, gdy token jest nieważny.
Kryteria akceptacji:
- Token po TTL lub po użyciu jest nieważny.
- Widzę komunikat i instrukcję skontaktowania się z administratorem.

ID: US-025
Tytuł: Edycja i usuwanie wydatków przed zamknięciem
Opis: Jako uczestnik chcę mieć możliwość korekt wydatków przed zamknięciem rozliczenia, a po zamknięciu widok tylko do odczytu.
Kryteria akceptacji:
- Do momentu zamknięcia mogę edytować zgodnie z uprawnieniami.
- Po zamknięciu próby edycji są blokowane z komunikatem.

## 6. Metryki sukcesu

KPI produktu:
1) Co najmniej 50 zakończonych rozliczeń w pierwszym miesiącu od uruchomienia.
2) Współczynnik created→closed ≥ 60%.
3) Mediana 5 wydatków na rozliczenie.
4) Czas do zamknięcia ≤ 9 dni.
5) Powracalność: ≥ 20% użytkowników tworzy kolejne rozliczenie w ciągu 3 miesięcy.

Telemetria i jakość:
1) Poprawna emisja zdarzeń settlement_created, member_joined, expense_added, settlement_closed z parametrami bez PII.
2) Brak błędów krytycznych blokujących zamknięcie i eksport.
3) E2E testy na iOS Safari i Android Chrome dla ścieżki create → invite/assign names → add expenses/exclusions → close → export.
