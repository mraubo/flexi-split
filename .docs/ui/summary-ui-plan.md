# Plan implementacji widoku Podsumowanie [FlexiSplit]

### Przegląd
Widok Podsumowanie prezentuje ostateczne salda per osoba oraz listę minimalnych przelewów „kto → komu → ile”, wspiera nieodwracalne zamknięcie rozliczenia i kopiowanie kompletnego podsumowania do schowka, z naciskiem na mobile‑first, czytelność i stabilne sortowanie wyników. Funkcjonalność opiera się na algorytmie równego podziału z deterministycznym przydziałem reszt groszy wg znormalizowanych nicków oraz nettingu minimalizującego liczbę transakcji, z danymi dostępnymi po zamknięciu przez endpoint snapshotu.

### Routing widoku
Ścieżka: /settlements/:id?step=summary, gdzie step=summary stanowi trzeci etap przepływu Uczestnicy → Koszty → Podsumowanie → Zamknięcie. Widok jest dostępny dla właściciela rozliczenia w trybie edycji do momentu zamknięcia oraz w trybie tylko‑do‑odczytu po zmianie statusu na closed i przeniesieniu do archiwum.

### Struktura komponentów
- SummaryPage (kontener strony)
- SummaryHeader (tytuł, status, CTA)
- BalancesSection (lista sald per osoba)
- TransfersSection (lista minimalnych przelewów)
- ControlSumNote (kontrola sum: suma do zapłaty = suma do otrzymania)
- CloseSettlementButton + ConfirmCloseModal (zamknięcie z potwierdzeniem)
- CopySummaryButton (+ opcjonalny Web Share)
- Toasts/Alerts (potwierdzenia, błędy, info o blokadzie)
- ReadOnlyBanner/Badge (stan closed, brak edycji)

### Szczegóły komponentów
#### SummaryPage
- Opis: Komponent stronny odpowiedzialny za orkiestrację danych, autoryzację, stan i render hierarchii sekcji podsumowania.
- Elementy: nagłówek, sekcja sald, sekcja przelewów, notka kontroli sum, akcje Zamknij i Kopia podsumowania, toasty.
- Zdarzenia: ładowanie snapshotu po status=closed, wywołanie zamknięcia, kopiowanie podsumowania, obsługa błędów 401/403/404/422/500.
- Walidacja: widok snapshotu tylko dla closed, CTA zamknięcia wyłącznie dla ownera i statusu open, stabilne sortowanie list.
- Typy: SettlementSnapshotDTO, TransferDTO, BalancesMap, ApiError, SummaryVM, TransferItemVM, ClipboardResult.
- Propsy: brak (page‑level), pobiera :id z routingu i stan globalny auth.

#### SummaryHeader
- Opis: Prezentuje tytuł rozliczenia, status (open/closed) oraz dostępne akcje (Zamknij, Kopia podsumowania, Udostępnij).
- Elementy: tytuł, badge statusu, przyciski akcji, opcjonalny znacznik „Właściciel” przy nicku właściciela w kontekście rozliczenia.
- Zdarzenia: klik Zamknij wywołuje modal, klik Kopia podsumowania kopiuje snapshot do schowka, opcjonalny Web Share.
- Walidacja: ukrycie/wyłączenie akcji w zależności od statusu i uprawnień ownera.
- Typy: SettlementDetailsDTO (tytuł, status), SummaryActionsState.
- Propsy: status, isOwner, handlers onCloseClick, onCopyClick, onShareClick.

#### BalancesSection
- Opis: Lista sald per osoba w PLN ze znakiem plus/minus, sformatowana w pl‑PL i posortowana stabilnie.
- Elementy: wiersze z nickiem, kwotą i znakiem, legenda interpretacji plus/minus.
- Zdarzenia: brak modyfikujących, tylko prezentacja.
- Walidacja: format walutowy, dokładność do grosza, niezmienność po closed.
- Typy: SummaryVM.balances: Array<{participantId, nickname, amountCents, formattedAmount, sign}>.
- Propsy: balancesVM.

#### TransfersSection
- Opis: Minimalna lista przelewów „kto → komu → ile”, sortowanie stabilne i czytelny zapis.
- Elementy: wiersze transferów z from/to i kwotą, opcjonalny przycisk kopiowania pojedynczego wiersza.
- Zdarzenia: brak modyfikujących, tylko prezentacja i ewentualny copy pojedynczego wpisu.
- Walidacja: format walutowy, brak edycji po closed.
- Typy: TransferItemVM: {fromId, fromNickname, toId, toNickname, amountCents, formattedAmount}.
- Propsy: transfersVM.

#### ControlSumNote
- Opis: Komunikat kontroli sum potwierdzający, że suma należności równa się sumie zobowiązań.
- Elementy: krótka notka lub znacznik ze statusem OK.
- Zdarzenia: brak.
- Walidacja: prezentacja tylko jeśli snapshot/transfers dostępne.
- Typy: wyliczone sumy z SummaryVM.
- Propsy: totals {sumPayable, sumReceivable, isBalanced}.

#### CloseSettlementButton + ConfirmCloseModal
- Opis: Akcja zamknięcia z modalem potwierdzenia nieodwracalności, wyświetlając liczbę kosztów i datę.
- Elementy: przycisk CTA, modal aria‑modal z focus trap, spinner w trakcie POST, klawisz Esc do zamykania.
- Zdarzenia: confirm → POST /settlements/{id}/close, success → stan closed, error → toasty.
- Walidacja: body puste, opcjonalny nagłówek Idempotency‑Key, obsługa statusów 401/403/404/422.
- Typy: CloseSettlementCommand=Record<string,never>, CloseSettlementResponseSchema kształt danych.
- Propsy: disabled, onConfirm, onCancel.

#### CopySummaryButton
- Opis: Kopiuje nagłówek, salda i listę przelewów do schowka po zamknięciu, wyświetla toast potwierdzający.
- Elementy: przycisk kopiowania, opcjonalny przycisk udostępniania Web Share.
- Zdarzenia: writeText → toast success/error oraz emisja zdarzenia summary_copied po stronie serwera, jeśli przewidziano.
- Walidacja: dostępne wyłącznie dla statusu closed i gdy snapshot dostępny.
- Typy: ClipboardResult, tekst generowany z SummaryVM i TransfersVM.
- Propsy: summaryText, disabled.

#### Toasts/Alerts i ReadOnlyBanner
- Opis: Warstwa komunikatów o błędach walidacji, uprawnień i sukcesach, plus baner tylko‑do‑odczytu po closed.
- Elementy: toast sukcesu, ostrzeżenia i błędu, baner „Rozliczenie zamknięte”.
- Zdarzenia: automatyczne ukrywanie po czasie, ręczne zamknięcie.
- Walidacja: treść po polsku, bez żargonu księgowego, zgodność z WCAG AA.
- Typy: ApiError, EventDTO dla telemetrycznych zdarzeń.
- Propsy: message, type.

### Typy
- Używane DTO: SettlementSnapshotDTO, TransferDTO, BalancesMap, SettlementDetailsDTO, ApiError, EventDTO z definicji typów.
- Nowe ViewModel:  
  - SummaryVM: {balances: Array<{participantId: UUID, nickname: string, amountCents: number, formattedAmount: string, sign: '+'|'-'|'0'}>, totals: {sumPayable: number, sumReceivable: number, isBalanced: boolean}} .  
  - TransferItemVM: {fromId: UUID, fromNickname: string, toId: UUID, toNickname: string, amountCents: number, formattedAmount: string}.
  - SummaryActionsState: {canClose: boolean, canCopy: boolean, isOwner: boolean, isClosed: boolean}.
- Util formatCurrency(amountCents, 'PLN') i formatDate/DateTime do prezentacji PL.

### Zarządzanie stanem
- Zmienne: settlementId (z routingu), status (open/closed), snapshot (balances, transfers), loading/error stany, isClosing, toasts.
- Hooki: useSummaryData (pobiera snapshot dla closed), useClipboard (kopiowanie podsumowania), useConfirmClose (obsługa POST i modala), z synchronizacją z Astro/Vue/React island zgodnie ze stackiem.
- Zasady: po closed przechodzimy w tryb read‑only, zdarzenia telemetryczne emitowane po stronie serwera zgodnie z listą.

### Integracja API
- POST /settlements/{id}/close: puste body, opcjonalny Idempotency‑Key, 200 na sukces, 401/403/404/422 na błędy; odpowiedź zawiera status=closed, closed_at, balances i transfers.
- GET /settlements/{id}/snapshot: dostępne wyłącznie dla closed, zwraca balances i transfers wraz z algorithm_version i created_at, z 401/403/404/422 dla błędów.
- Polityka dostępu: tylko uwierzytelnieni użytkownicy, rozróżnienie 403 vs 404 wg istnienia i uprawnień.

### Interakcje użytkownika
- Wejście na /settlements/:id?step=summary ładuje dane i prezentuje salda oraz minimalne przelewy, lub CTA zamknięcia jeżeli status open.
- Klik „Zamknij rozliczenie” otwiera modal z liczbą kosztów, datą i ostrzeżeniem o nieodwracalności, potwierdzenie wywołuje zamknięcie i przełącza widok w tryb closed.
- Klik „Kopia podsumowania” kopiuje nagłówek, salda i listę przelewów do schowka i wyświetla toast potwierdzenia, opcjonalnie wywołuje Web Share.
- Przeglądanie archiwum udostępnia nieedytowalny snapshot i listę przelewów z zachowaniem kontroli sum.

### Warunki i walidacja
- Prezentacja snapshotu tylko dla statusu closed, w open akcja zamknięcia dostępna wyłącznie dla właściciela.
- Formatowanie kwot w pl‑PL z dokładnością do grosza, klawiatura numeryczna dotyczy wcześniejszych kroków dodawania wydatków.
- Stabilne sortowanie list i grupowanie, zgodność z WCAG AA, jasne komunikaty błędów po polsku.

### Obsługa błędów
- 401 Unauthorized: przekierowanie/komunikat o konieczności logowania i blokada akcji.
- 403 Forbidden: komunikat o braku uprawnień i tryb tylko‑do‑odczytu, bez ujawniania szczegółów.
- 404 Not Found: informacja o braku rozliczenia, CTA powrotu do listy.
- 422 Unprocessable Entity: „already closed” dla POST close lub „not closed” dla GET snapshot, z toas­tem i odpowiednim stanem UI.
- 500 Server Error: komunikat ogólny i propozycja ponowienia/przejścia do listy, logowanie telemetryczne po stronie serwera.

### Wyzwania i rozwiązania
- Spójność algorytmów: jeśli przewidziany jest podgląd w open, local preview musi odzwierciedlać algorithm_version=1 backendu, dlatego rekomendowany jest brak lokalnej kalkulacji lub wspólna biblioteka współdzielona między frontendem i backendem.
- Konflikt stacku: Shadcn/ui (React) vs wzmianka o Vue 3 — w Astro zalecane są wyspy React dla shadcn albo wybór ekwiwalentów UI dla Vue, z decyzją architektoniczną w tym widoku na rzecz jednego runtime dla spójności dostępności i stylów.
- Dostępność i mobile‑first: upewnić się, że modal ma focus‑trap, Esc, role i aria‑modal, a listy są czytelne na małych ekranach.

### Kroki implementacji
1. Zaimplementuj routing /settlements/:id?step=summary oraz straż autoryzacji i pobrania statusu rozliczenia.
2. Zbuduj SummaryPage z podziałem na SummaryHeader, BalancesSection, TransfersSection, ControlSumNote i warstwę Toasts/Alerts.
3. Zaimplementuj ConfirmCloseModal z pełną dostępnością i obsługą POST /settlements/{id}/close, wraz z obsługą Idempotency‑Key i stanów isClosing.
4. Zaimplementuj CopySummaryButton z navigator.clipboard.writeText i komunikatem potwierdzenia oraz opcjonalnym Web Share.
5. Dodaj adaptery do mapowania DTO → VM, w tym formatCurrency i wyliczenie totals z kontroli sum.
6. Zaimplementuj GET /settlements/{id}/snapshot dla statusu closed, pamiętając o 401/403/404/422 i toperach błędów.
7. Wprowadź baner read‑only oraz ukrywanie/wyłączanie akcji zależnie od isOwner i statusu.
8. Dodaj telemetryczne eventy po stronie serwera (settle_confirmed, settled, summary_copied) i ich minimalny kontekst.
9. Zweryfikuj WCAG AA, stabilne sortowanie, polskie komunikaty i poprawność formatowania pl‑PL.
10. Przygotuj testy e2e/integrowe dla scenariuszy happy‑path i błędów 401/403/404/422/500, w tym idempotencji zamknięcia.