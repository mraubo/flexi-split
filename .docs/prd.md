# Dokument wymagań produktu (PRD) - FlexiSplit

## 1. Przegląd produktu

FlexiSplit to prosta aplikacja webowa do sprawnego rozliczania wspólnych kosztów po jednorazowych wydarzeniach (np. wyjazdy, imprezy rodzinne). Umożliwia właścicielowi rozliczenia dodawanie uczestników (offline, bez kont), rejestrowanie wydatków z wyborem płacącego, automatyczny równy podział kosztów oraz wygenerowanie bilansu i listy przelewów minimalizującej liczbę transakcji. Po zamknięciu rozliczenie trafia do archiwum, a edycja jest zablokowana.

Założenia MVP obejmują:

- Logowanie wymagane dla właściciela (konto e‑mail + hasło, sesja 14 dni).
- Jeden właściciel na rozliczenie, tylko właściciel może edytować.
- Uczestnicy jako byty offline (nick w ramach rozliczenia, bez kont).
- Waluta PLN; wartości przechowywane w groszach; prezentacja zgodnie z pl‑PL.
- 3‑etapowy przepływ: Uczestnicy → Koszty → Podsumowanie → Zamknięcie.

## 2. Problem użytkownika

Ręczne rozliczanie wspólnych kosztów jest skomplikowane i podatne na błędy, co prowadzi do nieporozumień oraz poczucia niesprawiedliwości. Użytkownicy potrzebują prostego, jednoznacznego i sprawiedliwego sposobu na podział kosztów po jednorazowych wydarzeniach, który:

- redukuje ryzyko błędów i sporów,
- jest szybki i czytelny na urządzeniach mobilnych,
- jasno pokazuje, kto komu ile powinien zapłacić,
- uniemożliwia modyfikacje po finalizacji, chroniąc integralność rozliczenia.

## 3. Wymagania funkcjonalne

3.1 Konta i sesje

- Rejestracja i logowanie e‑mail + hasło przez Supabase Auth; sesja ważna 14 dni.
- Możliwość wylogowania; opcjonalny reset hasła.
- Brak trybu anonimowego w MVP.

  3.2 Rozliczenia

- Tworzenie i listowanie rozliczeń; maks. 3 aktywne rozliczenia na użytkownika.
- Statusy: open/closed; zamknięcie przenosi do archiwum i blokuje edycję.
- Usuwanie wyłącznie rozliczeń archiwalnych; brak przywracania.

  3.3 Uczestnicy

- Dodawanie/edycja/usuwanie uczestników offline w ramach rozliczenia.
- Unikalne nicki (case‑insensitive, a‑z, 0‑9, „-”, „\_”) w obrębie rozliczenia.
- Limit: do 10 uczestników.
- Widoczna etykieta „Właściciel” przy nicku właściciela.

  3.4 Wydatki

- Dodawanie/edycja/usuwanie wydatków przez właściciela do momentu zamknięcia.
- Wybór płacącego z listy uczestników; domyślnie wszyscy biorą udział w podziale z możliwością odznaczania.
- Opis wydatku opcjonalny, do 140 znaków.
- Limit: do 500 wydatków na rozliczenie.
- Lista wydatków grupowana po dacie; na pozycji: płacący, kwota, liczba osób w podziale, skrót opisu.
- Filtrowanie listy po osobie.
- Wartości w groszach, wprowadzanie z separatorem dziesiętnym, prezentacja w pl‑PL.

  3.5 Rozliczanie i bilans

- Podział na równe części; reszta groszy przydzielana deterministycznie pierwszym N osobom wg znormalizowanego nicku.
- Generowanie bilansu „kto komu ile” minimalizującego liczbę przelewów; stabilne sortowanie wyników.
- Podgląd sald per osoba oraz lista przelewów.
- Funkcja „Kopia podsumowania” (nagłówek, saldo per osoba, lista przelewów) kopiująca tekst do schowka po zamknięciu.

  3.6 Uprawnienia i audyt

- Edycje dozwolone wyłącznie dla właściciela rozliczenia.
- Pola audytowe: updated_at i last_edited_by.

  3.7 Analityka

- Logowanie zdarzeń po stronie serwera w Supabase: settlement_created, participant_added, expense_added, settle_confirmed, settled, summary_copied, new_settlement_started.
- Środowiska: dev/lokalne i prod.

  3.8 Dostępność i UX

- Mobile‑first; klawiatura numeryczna dla kwot; puste stany z jasnymi wezwaniami do działania; zgodność z WCAG AA.

## 4. Granice produktu

- Brak zapraszania uczestników, dołączania przez link/e‑mail/kod (uczestnicy offline).
- Brak rozliczeń cyklicznych lub miesięcznych.
- Brak przekazania roli właściciela.
- Brak integracji płatności, wielu walut i automatycznych kursów (PLN only).
- Brak zaawansowanych statystyk, raportów i eksportów poza podstawowym podsumowaniem.
- Brak powiadomień push.
- Brak dodawania zdjęć paragonów.
- Brak edycji zamkniętych rozliczeń (zamknięcie jest nieodwracalne w MVP).
- Brak niestandardowych podziałów kosztów i wielu płacących w jednym wydatku (zawsze równy podział i pojedynczy płacący).
- Brak szkiców rozliczeń; statusy wyłącznie open/closed.
- Weryfikacja e‑mail podczas rejestracji do potwierdzenia; polityki rate‑limiting i blokad logowania do doprecyzowania poza MVP.
- Concurrency: w MVP domyślnie ostatni zapis wygrywa; mechanizmy blokad do rozważenia poza MVP.

## 5. Historyjki użytkowników

US‑001

Tytuł: Rejestracja konta

Opis: Jako nowy użytkownik chcę zarejestrować konto e‑mail + hasło, aby móc tworzyć i zarządzać rozliczeniami.

Kryteria akceptacji:

- Formularz rejestracji wymaga poprawnego e‑maila i hasła zgodnego z polityką.
- Po sukcesie użytkownik jest zalogowany i widzi listę rozliczeń.
- W przypadku błędów walidacji użytkownik otrzymuje czytelne komunikaty.

US‑002

Tytuł: Logowanie

Opis: Jako zarejestrowany użytkownik chcę się zalogować e‑mail + hasło, aby uzyskać dostęp do moich rozliczeń.

Kryteria akceptacji:

- Poprawne dane logują i przekierowują do listy rozliczeń.
- Błędne dane zwracają komunikat o niepowodzeniu bez ujawniania, które pole jest niepoprawne.
- Włączona jest pamięć sesji przez 14 dni.

US‑003

Tytuł: Utrzymanie sesji 14 dni

Opis: Jako zalogowany użytkownik chcę pozostać zalogowany przez 14 dni bez ponownego logowania.

Kryteria akceptacji:

- Tokeny sesyjne są odświeżane zgodnie z polityką i działają 14 dni.
- Sesja jest przechowywana w bezpiecznych httpOnly cookie.
- Po upływie 14 dni wymagana jest ponowna autoryzacja.

US‑004

Tytuł: Wylogowanie

Opis: Jako użytkownik chcę się wylogować, aby zakończyć bieżącą sesję na tym urządzeniu.

Kryteria akceptacji:

- Akcja wylogowania usuwa tokeny i przekierowuje do ekranu logowania.
- Po wylogowaniu dostęp do widoków zabezpieczonych jest zablokowany.

US‑005

Tytuł: Reset hasła

Opis: Jako użytkownik chcę zresetować hasło, gdy je zapomnę.

Kryteria akceptacji:

- Formularz resetu weryfikuje e‑mail i wysyła link resetu (jeśli mechanizm dostępny w środowisku).
- Po ustawieniu nowego hasła możliwe jest standardowe logowanie.

US‑006

Tytuł: Autoryzacja właścicielska

Opis: Jako właściciel rozliczenia chcę mieć wyłączne prawo edycji, aby zachować spójność danych.

Kryteria akceptacji:

- Edycje uczestników i wydatków są dostępne tylko dla właściciela.
- Użytkownicy niebędący właścicielem widzą dane w trybie tylko do odczytu.
- Próby edycji przez niewłaściciela zwracają błąd autoryzacji.

US‑010

Tytuł: Utworzenie rozliczenia

Opis: Jako właściciel chcę utworzyć nowe rozliczenie, aby rozpocząć podział kosztów.

Kryteria akceptacji:

- Utworzenie zwiększa licznik aktywnych; jeśli osiągnięto limit 3, akcja jest blokowana z komunikatem.
- Nowe rozliczenie ma status open i jest widoczne na liście aktywnych.

US‑011

Tytuł: Lista rozliczeń

Opis: Jako właściciel chcę widzieć listę moich rozliczeń (aktywne i archiwalne).

Kryteria akceptacji:

- Lista pokazuje min. nazwę, status, liczbę uczestników i wydatków.
- Dostępne są zakładki/filtry: Aktywne, Archiwum.

US‑012

Tytuł: Szczegóły rozliczenia

Opis: Jako właściciel chcę wejść w szczegóły rozliczenia, aby zarządzać uczestnikami i wydatkami.

Kryteria akceptacji:

- Widok zawiera 3 kroki: Uczestnicy → Koszty → Podsumowanie.
- Dostępne są akcje odpowiednie do statusu open/closed.

US‑013

Tytuł: Zamknięcie rozliczenia

Opis: Jako właściciel chcę zamknąć rozliczenie po akceptacji, aby zablokować edycję i wygenerować bilans.

Kryteria akceptacji:

- Przed zamknięciem wyświetla się modal potwierdzenia z liczbą kosztów i datą oraz informacją o nieodwracalności.
- Po zamknięciu status zmienia się na closed, edycja jest zablokowana, rozliczenie trafia do archiwum.

US‑014

Tytuł: Usunięcie rozliczenia archiwalnego

Opis: Jako właściciel chcę móc usunąć rozliczenie z archiwum, gdy nie jest już potrzebne.

Kryteria akceptacji:

- Usunięcie dostępne wyłącznie dla closed; akcja nieodwracalna.
- Po usunięciu rozliczenie znika z listy i nie jest dostępne przez UI.

US‑020

Tytuł: Dodanie uczestnika

Opis: Jako właściciel chcę dodać uczestnika (nick), aby uwzględnić go w podziale kosztów.

Kryteria akceptacji:

- Walidacja unikalności nicka w ramach rozliczenia (case‑insensitive).
- Dozwolone znaki: a‑z, 0‑9, „-”, „\_”.
- Po przekroczeniu limitu 10 dodawanie jest zablokowane z komunikatem.

US‑021

Tytuł: Edycja uczestnika

Opis: Jako właściciel chcę edytować nick uczestnika przed zamknięciem rozliczenia.

Kryteria akceptacji:

- Zmiana nicka przestrzega walidacji unikalności i wzorca znaków.
- Aktualizacje są widoczne w listach i w istniejących wydatkach.

US‑022

Tytuł: Usunięcie uczestnika

Opis: Jako właściciel chcę usunąć uczestnika przed zamknięciem, jeśli to konieczne.

Kryteria akceptacji:

- Usuwanie dostępne tylko dla statusu open.
- System zapobiega stanom niespójnym (np. usuwa udział w niezależnych wydatkach lub blokuje akcję z komunikatem, zgodnie z przyjętą implementacją).

US‑023

Tytuł: Walidacja i podpowiedź nicka

Opis: Jako właściciel chcę widzieć informację o kolizji nicka i otrzymać proponowaną alternatywę z sufiksem.

Kryteria akceptacji:

- Podczas wpisywania system sygnalizuje kolizję i proponuje wolny wariant.

US‑025

Tytuł: Widoczność roli właściciela

Opis: Jako uczestnik chcę wiedzieć, kto jest właścicielem rozliczenia.

Kryteria akceptacji:

- Przy nicku właściciela widoczny jest badge „Właściciel”.

US‑030

Tytuł: Dodanie wydatku

Opis: Jako właściciel chcę dodać wydatek z wyborem płacącego i domyślnym udziałem wszystkich.

Kryteria akceptacji:

- Formularz zawiera: kwotę, płacącego, listę uczestników z checkboxami, opcjonalny opis (≤140 znaków), datę.
- Domyślnie zaznaczeni są wszyscy uczestnicy; można odznaczać pojedyncze osoby.
- Po zapisie wydatek pojawia się na liście grupowanej po dacie.

US‑031

Tytuł: Edycja wydatku

Opis: Jako właściciel chcę edytować istniejący wydatek przed zamknięciem rozliczenia.

Kryteria akceptacji:

- Edycja dostępna dla open; pola walidowane jak przy dodawaniu.
- Zmiany aktualizują bilans w podsumowaniu.

US‑032

Tytuł: Usunięcie wydatku

Opis: Jako właściciel chcę usunąć wydatek przed zamknięciem rozliczenia.

Kryteria akceptacji:

- Usuwanie dostępne dla open; po usunięciu bilans i lista są aktualizowane.

US‑033

Tytuł: Opis wydatku i ograniczenia

Opis: Jako właściciel chcę dodać krótki opis, aby ułatwić identyfikację wydatku.

Kryteria akceptacji:

- Opis jest opcjonalny i ograniczony do 140 znaków; walidacja działa w formularzu.

US‑034

Tytuł: Filtrowanie po osobie

Opis: Jako właściciel chcę przefiltrować listę wydatków po wybranej osobie.

Kryteria akceptacji:

- Filtr ogranicza listę do wydatków, w których osoba była płacącym lub uczestnikiem podziału.

US‑035

Tytuł: Wejście w szczegóły wydatku

Opis: Jako właściciel chcę wejść w szczegóły wydatku, aby zobaczyć pełny udział i opis.

Kryteria akceptacji:

- Widok zawiera: płacącego, kwotę, listę uczestników w podziale, jednostkową część kosztu, opis.

US‑036

Tytuł: Edge case – wydatek jednoosobowy

Opis: Jako właściciel chcę móc zarejestrować wydatek z udziałem tylko jednej osoby.

Kryteria akceptacji:

- System poprawnie rejestruje wydatek i nie dzieli kwoty.

US‑037

Tytuł: Wprowadzanie i prezentacja kwot

Opis: Jako użytkownik chcę wprowadzać kwoty wygodnie na mobile, a system ma przechowywać wartości w groszach.

Kryteria akceptacji:

- Pole kwoty używa klawiatury numerycznej i akceptuje separator dziesiętny.
- Wartości są przechowywane w groszach; prezentacja zgodna z locale pl‑PL.

US‑040

Tytuł: Obliczanie podziału i reszt groszy

Opis: Jako właściciel chcę, aby podział był równy, a reszta groszy przydzielana deterministycznie wg znormalizowanych nicków.

Kryteria akceptacji:

- Algorytm dzieli koszt na równe części w groszach i przydziela resztę pierwszym N osobom zgodnie z deterministyczną kolejnością.
- Wynik jest stabilny i powtarzalny dla tych samych danych wejściowych.

US‑041

Tytuł: Minimalizacja liczby przelewów

Opis: Jako właściciel chcę skróconą listę przelewów minimalizującą liczbę transakcji.

Kryteria akceptacji:

- Algorytm nettingu redukuje liczbę transakcji i zwraca listę posortowaną stabilnie.
- Suma kwot do zapłaty równa się sumie kwot do otrzymania (kontrola sum).

US‑042

Tytuł: Salda per osoba

Opis: Jako uczestnik chcę zobaczyć swoje saldo po zamknięciu rozliczenia.

Kryteria akceptacji:

- Widok prezentuje salda każdej osoby w PLN z dokładnością do grosza.

US‑043

Tytuł: Kopia podsumowania do schowka

Opis: Jako właściciel chcę skopiować podsumowanie po zamknięciu, aby łatwo udostępnić je uczestnikom.

Kryteria akceptacji:

- Kliknięcie „Kopia podsumowania” kopiuje tekst zawierający nagłówek, salda per osoba i listę przelewów do schowka.

US‑050

Tytuł: Archiwum rozliczeń

Opis: Jako właściciel chcę przeglądać zakończone rozliczenia i ich bilans.

Kryteria akceptacji:

- Archiwum prezentuje listę closed; wejście w szczegóły pokazuje bilans i listę przelewów.

US‑060

Tytuł: Audyt edycji

Opis: Jako właściciel chcę, aby system rejestrował updated_at i last_edited_by przy każdej zmianie.

Kryteria akceptacji:

- Pola audytowe aktualizują się przy dodawaniu/edycji/usuwaniu danych.

US‑061

Tytuł: Zdarzenia analityczne

Opis: Jako właściciel produktu chcę śledzić kluczowe zdarzenia, aby mierzyć lejek aktywacji i sukces produktu.

Kryteria akceptacji:

- Emisja zdarzeń po stronie serwera: settlement_created, participant_added, expense_added, settle_confirmed, settled, summary_copied, new_settlement_started.
- Zdarzenia zawierają minimalny kontekst (ID rozliczenia, liczebności, timestamp).

US‑070

Tytuł: Blokada edycji po zamknięciu

Opis: Jako właściciel chcę mieć pewność, że zamknięte rozliczenie jest tylko do odczytu.

Kryteria akceptacji:

- Wszystkie akcje edycji uczestników i wydatków są niedostępne dla closed.
- Próby modyfikacji zwracają komunikat o blokadzie.

US‑071

Tytuł: Walidacja kwot

Opis: Jako właściciel chcę, aby kwoty były walidowane jako dodatnie i poprawnie sformatowane.

Kryteria akceptacji:

- Minimalna jednostka to 0,01 PLN; kwoty ujemne lub 0 są odrzucane.
- Prezentacja kwot zgodna z locale pl‑PL.

US‑072

Tytuł: Puste stany i przewodnictwo

Opis: Jako użytkownik chcę widzieć jasne komunikaty w pustych stanach, aby wiedzieć, co robić dalej.

Kryteria akceptacji:

- Po utworzeniu rozliczenia widoczne są CTA: „Dodaj pierwszego uczestnika” i „Dodaj pierwszy koszt”.

US‑073

Tytuł: Dostępność i mobile

Opis: Jako użytkownik mobilny chcę wygodnej obsługi formularzy i czytelnych kontrastów.

Kryteria akceptacji:

- Duże pola dotykowe, fokus klawiatury na kolejne pole, kontrast czytelny.
- Pola kwot oferują klawiaturę numeryczną.

US‑074

Tytuł: Filtrowanie i sortowanie stabilne

Opis: Jako użytkownik chcę przewidywalnego sortowania list i filtrów.

Kryteria akceptacji:

- Listy wydatków są grupowane po dacie i sortowane stabilnie; filtry nie zmieniają kolejności w ramach grupy.

US‑075

Tytuł: Obsługa błędów i komunikaty

Opis: Jako użytkownik chcę jasnych, przyjaznych komunikatów błędów.

Kryteria akceptacji:

- Błędy walidacji i uprawnień są komunikowane po polsku, bez żargonu księgowego.

## 6. Metryki sukcesu

- 50 zakończonych rozliczeń (unikalne) w pierwszym miesiącu produkcyjnym; źródło: liczba zdarzeń settled.
- Co najmniej 20% użytkowników tworzy kolejne rozliczenie w ciągu 3 miesięcy; źródło: cohorty z ≥2 zdarzeniami settled.
- Pozytywny feedback o prostocie: ankiety NPS/PMF po settled oraz medianowy czas do pierwszego rozliczenia.
- Lejek aktywacji: settlement_created → participant_added → expense_added → settle_confirmed → settled; monitorowane drop‑off i mediany czasu między etapami.
  -- Jakość danych: średnia liczba wydatków/rozliczenie, średnia liczba uczestników, użycie filtra po osobie, użycie „summary_copied”.
