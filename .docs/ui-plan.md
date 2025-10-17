# Architektura UI dla FlexiSplit

## 1. Przegląd struktury UI

Interfejs jest mobile‑first, prowadzony prostym trzystopniowym przepływem w jednym widoku szczegółów rozliczenia: Uczestnicy → Koszty → Podsumowanie. Edycje są dostępne wyłącznie dla właściciela i tylko w statusie open. Po dodaniu pierwszego wydatku sekcja Uczestnicy staje się nieedytowalna. Zamknięcie rozliczenia przenosi je do archiwum i blokuje wszelkie edycje.

Nawigacja opiera się na niewielkiej liczbie tras: ekran logowania/rejestracji/resetu hasła, lista rozliczeń z przełącznikiem Aktywne/Archiwum oraz jeden route szczegółów rozliczenia ze stepperem/zakładkami. Warstwa dostępności bazuje na istniejących design tokenach z zapewnionym kontrastem WCAG AA, czytelnymi stanami fokusu i aria‑live dla komunikatów.

Mechanika sesji: przechwycenie 401 skutkuje przekierowaniem do logowania z zachowaniem ścieżki powrotu. Brak trybu offline i cache w MVP; dane są pobierane na żądanie i odświeżane po sukcesie akcji.

## 2. Lista widoków

- Nazwa widoku: Ekran logowania
- Ścieżka widoku: /login
- Główny cel: Uwierzytelnić użytkownika e‑mail + hasło i ustanowić sesję 14 dni (US‑002, US‑003, US‑004).
- Kluczowe informacje do wyświetlenia: formularz e‑mail/hasło, odnośnik do rejestracji i resetu, komunikaty błędów bez ujawniania, które pole jest niepoprawne.
- Kluczowe komponenty widoku: formularz z walidacją natywną, przycisk Zaloguj, linki Rejestracja/Reset, baner błędu, loader stanu wysyłki; połączenia API: Supabase Auth login.
- UX, dostępność i względy bezpieczeństwa: focus management na pierwszym polu, aria‑live dla błędów, ograniczenie informacji o błędach, httpOnly cookies obsługiwane przez klienta Supabase, blokada brute force poza MVP.

- Nazwa widoku: Ekran rejestracji
- Ścieżka widoku: /register
- Główny cel: Utworzyć konto e‑mail + hasło i automatycznie zalogować (US‑001, US‑005).
- Kluczowe informacje do wyświetlenia: formularz rejestracji, polityka hasła, informacja o weryfikacji e‑mail jeśli dotyczy środowiska, komunikaty walidacyjne.
- Kluczowe komponenty widoku: formularz rejestracji, przycisk Zarejestruj, link do logowania; połączenia API: Supabase Auth sign‑up.
- UX, dostępność i względy bezpieczeństwa: natywne atrybuty minlength/pattern, aria‑describedby dla polityki hasła, przyjazne komunikaty po polsku.

- Nazwa widoku: Reset hasła
- Ścieżka widoku: /reset-password
- Główny cel: Zainicjować i zakończyć proces resetu hasła (US‑005).
- Kluczowe informacje do wyświetlenia: pole e‑mail, potwierdzenie wysłania linku, formularz ustawienia nowego hasła po wejściu z linku.
- Kluczowe komponenty widoku: formularz e‑mail, formularz nowego hasła, toasty komunikatów; połączenia API: Supabase Auth reset.
- UX, dostępność i względy bezpieczeństwa: neutralne komunikaty (nie ujawniaj, czy e‑mail istnieje), aria‑live dla potwierdzeń.

- Nazwa widoku: Lista rozliczeń
- Ścieżka widoku: /settlements?tab=active|archive
- Główny cel: Przeglądać i tworzyć rozliczenia, usuwać archiwalne, przejść do szczegółów (US‑010, US‑011, US‑014, US‑050).
- Kluczowe informacje do wyświetlenia: karty Aktywne/Archiwum, wiersze z nazwą, statusem, licznikami uczestników i wydatków, datami, ograniczenie 3 aktywne.
- Kluczowe komponenty widoku: segment/karty, lista kart rozliczeń, przycisk Nowe rozliczenie, menu akcji Usuń dla zamkniętych, puste stany z CTA; połączenia API: GET /settlements, POST /settlements, DELETE /settlements/{id}.
- UX, dostępność i względy bezpieczeństwa: wyraźne komunikaty przy limicie 3 aktywnych, potwierdzenie usunięcia, stabilne sortowanie, role i etykiety dostępności dla listy i kart.

- Nazwa widoku: Szczegóły rozliczenia (route kontener)
- Ścieżka widoku: /settlements/:id
- Główny cel: Prowadzić przez kroki Uczestnicy → Koszty → Podsumowanie i prezentować status open/closed (US‑012, US‑070).
- Kluczowe informacje do wyświetlenia: tytuł rozliczenia, status, stepper/zakładki, badge „Właściciel” przy odpowiednim nicku, stan blokady edycji.
- Kluczowe komponenty widoku: nagłówek z tytułem i statusem, stepper/zakładki, toast center, banner read‑only po zamknięciu; połączenia API: GET /settlements/{id}, PUT /settlements/{id}.
- UX, dostępność i względy bezpieczeństwa: stepper jako nawigacja z aria‑current, wyłączenie akcji dla closed, informacja o braku uprawnień dla niewłaściciela.

- Nazwa widoku: Uczestnicy (krok 1)
- Ścieżka widoku: /settlements/:id?step=participants
- Główny cel: Zarządzać uczestnikami przed pierwszym wydatkiem (US‑020, US‑021, US‑022, US‑023, US‑025).
- Kluczowe informacje do wyświetlenia: lista uczestników z nickami i badge „Właściciel”, licznik uczestników z limitem 10, walidacja nicków i unikalności.
- Kluczowe komponenty widoku: formularz dodawania/edycji nicka z podpowiedzią alternatywy, lista z akcjami Edytuj/Usuń, banner blokady po pierwszym wydatku, puste stany z CTA; połączenia API: GET/POST/PUT/DELETE /settlements/{id}/participants.
- UX, dostępność i względy bezpieczeństwa: natywne pattern i aria‑invalid, aria‑live dla kolizji i propozycji sufiksu, blokada edycji po pierwszym wydatku (wsparta komunikatem), potwierdzenie usunięcia.

- Nazwa widoku: Koszty – lista i filtr (krok 2)
- Ścieżka widoku: /settlements/:id?step=expenses
- Główny cel: Przeglądać i zarządzać wydatkami, filtrować po osobie (US‑030, US‑031, US‑032, US‑034, US‑074).
- Kluczowe informacje do wyświetlenia: lista grupowana po dacie, na pozycji płacący, kwota, liczba osób w podziale, skrót opisu, filtr po osobie.
- Kluczowe komponenty widoku: pasek filtra z wyborem osoby, lista grup dat, karty wydatków z akcjami, przycisk Dodaj wydatek, puste stany; połączenia API: GET /settlements/{id}/expenses (z parametrami), DELETE /settlements/{id}/expenses/{id}.
- UX, dostępność i względy bezpieczeństwa: stabilne sortowanie w grupach, czytelne kontrasty, duże hit‑targety, komunikaty po polsku bez żargonu księgowego.

- Nazwa widoku: Formularz wydatku (modal/pełny ekran)
- Ścieżka widoku: /settlements/:id/expenses/new oraz /settlements/:id/expenses/:expenseId/edit
- Główny cel: Dodawać i edytować wydatki z równym podziałem i pojedynczym płacącym (US‑030, US‑031, US‑036, US‑037, US‑071).
- Kluczowe informacje do wyświetlenia: pola kwoty (PLN, separator dziesiętny, minimalnie 0,01), płacący (lista uczestników), lista uczestników z checkboxami domyślnie zaznaczonymi, data, opis ≤140 znaków, liczba osób w podziale i kalkulowana jednostkowa część.
- Kluczowe komponenty widoku: kontrolka AmountInput z klawiaturą numeryczną, selektor płacącego, checkboxy uczestników, pole daty, licznik znaków opisu, podgląd jednostkowego udziału, przyciski Zapisz/Anuluj; połączenia API: POST/PUT /settlements/{id}/expenses.
- UX, dostępność i względy bezpieczeństwa: walidacja natywna z pattern i step, blokada zapisu gdy brak uczestników, obsługa edge case jednoosobowego wydatku, focus trap i aria‑modal, etykiety i opisy dostępności, komunikaty walidacji po polsku.

- Nazwa widoku: Szczegóły wydatku
- Ścieżka widoku: /settlements/:id/expenses/:expenseId
- Główny cel: Pokaż pełne dane wydatku i jednostkowe części (US‑035).
- Kluczowe informacje do wyświetlenia: płacący, kwota, lista uczestników w podziale, jednostkowa część w groszach przeliczona, opis.
- Kluczowe komponenty widoku: karta szczegółów, akcje Edytuj/Usuń (gdy open), nawigacja wstecz; połączenia API: GET /settlements/{id}/expenses/{id}.
- UX, dostępność i względy bezpieczeństwa: czytelne formatowanie pl‑PL, przyciski z odpowiednimi rolami i stanami.

- Nazwa widoku: Podsumowanie (krok 3)
- Ścieżka widoku: /settlements/:id?step=summary
- Główny cel: Zaprezentować salda i listę minimalnych przelewów oraz umożliwić zamknięcie i kopiowanie podsumowania (US‑040, US‑041, US‑042, US‑043, US‑013).
- Kluczowe informacje do wyświetlenia: salda per osoba w PLN (z znakami plus/minus), lista przelewów „kto → komu → ile”, kontrola sum, status rozliczenia, przyciski Zamknij i Kopia podsumowania.
- Kluczowe komponenty widoku: sekcja sald, sekcja przelewów, przycisk Zamknij rozliczenie, przycisk Kopia podsumowania (oraz opcjonalnie Udostępnij), toasty potwierdzeń; połączenia API: POST /settlements/{id}/close, GET /settlements/{id}/snapshot (dla closed).
- UX, dostępność i względy bezpieczeństwa: ostrzeżenia przed zamknięciem, wyraźny stan tylko do odczytu po zamknięciu, navigator.clipboard.writeText z komunikatem, Web Share jako opcjonalne, stabilne sortowanie listy.

- Nazwa widoku: Modal potwierdzenia zamknięcia
- Ścieżka widoku: stan modalny w /settlements/:id?step=summary
- Główny cel: Potwierdzić nieodwracalne zamknięcie (US‑013, US‑070).
- Kluczowe informacje do wyświetlenia: liczba kosztów i data, informacja o nieodwracalności, przyciski Potwierdź/Anuluj.
- Kluczowe komponenty widoku: modal z focus trap, aria‑modal, przyciski akcji; połączenia API: POST /settlements/{id}/close po potwierdzeniu.
- UX, dostępność i względy bezpieczeństwa: klawisz Esc zamyka modal, jasny tekst konsekwencji, spinner podczas operacji.

- Nazwa widoku: Archiwalne rozliczenie – podgląd
- Ścieżka widoku: /settlements/:id (status=closed)
- Główny cel: Przeglądać zamknięte rozliczenie i jego bilans, kopiować podsumowanie (US‑050, US‑042, US‑043).
- Kluczowe informacje do wyświetlenia: salda i przelewy ze snapshotu, baner „Zamknięte”, brak akcji edycji, przycisk Kopia podsumowania.
- Kluczowe komponenty widoku: odczyt snapshotu, przycisk kopiowania, panele danych; połączenia API: GET /settlements/{id}, GET /settlements/{id}/snapshot.
- UX, dostępność i względy bezpieczeństwa: wszystkie kontrolki edycyjne ukryte lub disabled, jasne etykiety statusu, komunikaty dostępne ekranowo.

- Nazwa widoku: Ekran błędu i wygaśniętej sesji
- Ścieżka widoku: przechwytywanie 401/403/404, fallback /error
- Główny cel: Komunikować błędy dostępu, braku zasobu, wygaśnięcia sesji oraz zapewnić dalszą nawigację.
- Kluczowe informacje do wyświetlenia: opis błędu po polsku, link powrotny, przycisk zaloguj ponownie, zachowanie ścieżki docelowej.
- Kluczowe komponenty widoku: baner błędu, przyciski, odliczanie do redirect; połączenia API: brak, opiera się o kody odpowiedzi.
- UX, dostępność i względy bezpieczeństwa: aria‑live „assertive” dla krytycznych błędów, brak ujawniania szczegółów autoryzacji.

## 3. Mapa podróży użytkownika

- Wejście do aplikacji: użytkownik trafia na /login, loguje się (US‑002), sesja ustanowiona na 14 dni (US‑003). W przypadku braku konta przechodzi do /register (US‑001). W razie zapomnianego hasła używa /reset-password (US‑005).
- Lista rozliczeń: po zalogowaniu widok /settlements z kartą Aktywne. Użytkownik tworzy nowe rozliczenie, jeśli nie osiągnął limitu 3 (US‑010); w razie limitu widzi komunikat i CTA do archiwizacji/usuwania zamkniętych (US‑011, US‑014).
- Przepływ 3‑krokowy w szczegółach: w /settlements/:id stepper kieruje na Uczestnicy (US‑012).
  - Krok Uczestnicy: dodaje nicki do limitu 10, walidacja i propozycje alternatyw (US‑020, US‑023). Edytuje/usuwa w statusie open (US‑021, US‑022). Po dodaniu pierwszego wydatku sekcja jest blokowana zgodnie z ustaleniami sesji (decyzja #3).
  - Krok Koszty: przegląda listę grupowaną po dacie, dodaje wydatki, filtruje po osobie, edytuje lub usuwa (US‑030, US‑031, US‑032, US‑034, US‑074). Formularz pilnuje kwot i limitów (US‑033, US‑037, US‑071). Obsługa jednoosobowego wydatku (US‑036).
  - Krok Podsumowanie: ogląda salda i zredukowaną listę przelewów (US‑040, US‑041, US‑042). Kopiuje podsumowanie do schowka i opcjonalnie udostępnia (US‑043). Potwierdza zamknięcie w modalu, po którym rozliczenie jest tylko do odczytu i trafia do Archiwum (US‑013, US‑070, US‑050).
- Po zamknięciu: rozliczenie dostępne w zakładce Archiwum, możliwe usunięcie (US‑014). Wgląd do snapshotu i kopiowanie podsumowania pozostaje dostępne (US‑050, US‑043).

## 4. Układ i struktura nawigacji

- Główne trasy: /login, /register, /reset-password, /settlements, /settlements/:id.
- Nawigacja globalna: nagłówek z nazwą produktu i akcją Wyloguj, link do listy rozliczeń.
- Nawigacja w liście: segmentowany przełącznik Aktywne/Archiwum sterujący parametrem tab; przycisk Nowe rozliczenie w prawym górnym rogu.
- Nawigacja w szczegółach: pojedynczy route z wewnętrznymi zakładkami/stepperem sterowanymi parametrem step, który odsłania sekcje progresywnie. Po zamknięciu stepper pozostaje, ale wszystkie akcje edycji są disabled/ukryte.
- Nawigacja kontekstowa: modal dodawania/edycji wydatku i modal zamknięcia nakładają się nad krokiem Koszty/Podsumowanie; na urządzeniach mobilnych formularze mogą zajmować pełny ekran.
- Zachowanie błędów i sesji: przechwycenie 401 prowadzi na /login i po zalogowaniu wraca do poprzedniego miejsca; 403/404 prezentują /error z opcją powrotu do listy.

## 5. Kluczowe komponenty

- Stepper/zakładki rozliczenia: trzy kroki z aria‑current, blokady stanowe dla Uczestników po pierwszym wydatku i dla wszystkich po zamknięciu; wspiera US‑012, US‑070.
- Karta rozliczenia na liście: tytuł, status, liczniki, znaczniki czasu, akcje kontekstowe; wspiera US‑011, US‑014, US‑050; używa GET/POST/DELETE /settlements.
- Formularz uczestnika: pojedyncze pole z pattern `^[a-z0-9_-]+$`, walidacja unikalności z sugestią sufiksu, badge „Właściciel”; wspiera US‑020, US‑021, US‑022, US‑023, US‑025; używa endpoints uczestników.
- Pasek filtra osoby: selektor uczestnika filtrujący listę wydatków po płacącym lub uczestniku; wspiera US‑034; używa GET /expenses z participant_id.
- Lista wydatków grupowana po dacie: grupy dat ze stabilnym sortowaniem, wiersze z płacącym, kwotą, liczbą udziałów, skrótem opisu, akcje edycji/usunięcia; wspiera US‑030, US‑032, US‑074; używa GET/DELETE /expenses.
- Formularz wydatku (AmountInput, selektor płacącego, lista checkboxów): wprowadza kwotę w PLN z klawiaturą numeryczną, wybiera płacącego, domyślnie zaznacza wszystkich; pokazuje jednostkową część i obsługuje przypadek jednoosobowy; wspiera US‑030, US‑031, US‑036, US‑037, US‑071; używa POST/PUT /expenses.
- Sekcja sald i przelewów: tabela/lista sald per osoba i zredukowana lista przelewów, kontrola sum, stabilne sortowanie; wspiera US‑040, US‑041, US‑042; używa POST /settlements/{id}/close i GET /snapshot dla closed.
- Modal potwierdzenia zamknięcia: wyświetla liczbę kosztów, datę, nieodwracalność; potwierdza i wywołuje zamknięcie; wspiera US‑013, US‑070; używa POST /settlements/{id}/close.
- Przycisk „Kopia podsumowania” i Web Share: kopiuje nagłówek, salda i przelewy; opcjonalnie udostępnia; pokazuje toast potwierdzenia i emituje zdarzenie; wspiera US‑043, US‑061; używa navigator.clipboard i POST /events.
- Toasty/banery stanów: sukcesy, błędy walidacji, brak uprawnień, limity (3 aktywne, 10 uczestników, 500 wydatków); aria‑live „polite/assertive”; wspiera US‑075.
- Komponenty dostępności: focus ringi zgodne z tokenami, etykiety i opisy, odpowiednie role dla list i przycisków, kolejność tabulacji, powiększone pola dotykowe; wspiera US‑073.
- Warstwa sesji i ochrony akcji: wrapper przechwytujący 401/403, przekierowania, oznaczenia trybu read‑only; respektuje reguły RLS i statusy; wspiera US‑003, US‑004, US‑006, US‑070.

Wszystkie widoki i komponenty są spójne z planem API: dostęp i modyfikacje ograniczone do właściciela, brak edycji w statusie closed, limity i walidacje są odzwierciedlone w UI i egzekwowane po stronie serwera. Zdarzenia analityczne są wywoływane przy kluczowych akcjach (utworzenie rozliczenia, dodanie uczestnika/wydatku, potwierdzenie zamknięcia, zamknięcie, kopiowanie podsumowania, rozpoczęcie nowego rozliczenia), zgodnie z wymaganiami PRD.
