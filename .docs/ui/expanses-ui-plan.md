Poniżej znajduje się plan implementacji widoku „Koszty – lista i filtr (krok 2)”, gotowy do zapisania jako .ai/koszty-lista-i-filtr-view-implementation-plan.md i zgodny z wymaganiami PRD, user stories oraz stackiem technologicznym projektu FlexiSplit.

# Plan implementacji widoku Koszty – lista i filtr

## 1. Przegląd

Widok „Koszty – lista i filtr (krok 2)” służy do przeglądania, filtrowania i zarządzania wydatkami w ramach pojedynczego rozliczenia, zgodnie z przepływem Uczestnicy → Koszty → Podsumowanie. Umożliwia dodawanie, edycję i usuwanie wydatków (tylko dla właściciela i gdy rozliczenie jest otwarte), grupowanie listy po dacie, stabilne sortowanie oraz filtrowanie po osobie jako płacącym lub uczestniku podziału.

## 2. Routing widoku

Ścieżka: /settlements/:id?step=expenses, gdzie step=expenses determinuje aktywny krok „Koszty” w widoku szczegółów rozliczenia. Widok zakłada, że użytkownik jest uwierzytelniony oraz posiada uprawnienia właściciela rozliczenia do wykonywania akcji edycyjnych.

## 3. Struktura komponentów

- Layout rozliczenia: szkielety UI dla kroków Uczestnicy/Koszty/Podsumowanie, nagłówek, oraz kontener treści.
- Pasek filtra: selektor osoby (płatnik lub uczestnik) z możliwością wyczyszczenia filtra.
- Lista grup dat: grupowanie wydatków według pola expense_date, nagłówki grup z datą sformatowaną pl-PL.
- Karta wydatku: wiersz z płacącym, kwotą, liczbą osób w podziale, skrótem opisu oraz akcjami Edytuj/Usuń w stanie otwartym.
- Puste stany: komunikaty prowadzące do dodania pierwszego wydatku i/lub pierwszych uczestników, mobilnie czytelne.
- Akcje globalne: „Dodaj wydatek” oraz paginacja/„Załaduj więcej” dla GET z limit/page.

## 4. Szczegóły komponentów

### Layout rozliczenia

- Opis: Zapewnia ramę nawigacyjną kroków i renderuje zawartość dla „Koszty”, respektując status open/closed i uprawnienia.
- Główne elementy: nagłówek tytułu rozliczenia, zakładki kroków, kontener zawartości, informacja o statusie.
- Obsługiwane interakcje: przełączanie kroków, powrót do listy rozliczeń.
- Walidacja: gating edycji przy status=closed i dla niewłaściciela (ukrycie/wyłączenie akcji).
- Typy: SettlementDetailsDTO lub równoważny z polami status/tytuł; VM dla stanu nawigacji.
- Propsy: settlementId, status, isOwner, onNavigateStep.

### Pasek filtra

- Opis: Pozwala zawęzić listę do wydatków, gdzie osoba jest płacącym lub uczestnikiem podziału; integruje się z parametrem participant_id.
- Główne elementy: select/autocomplete osób z rozliczenia, przycisk Wyczyść.
- Obsługiwane interakcje: wybór osoby, czyszczenie filtra, synchronizacja z URL.
- Walidacja: participant_id musi istnieć w rozliczeniu; w razie błędu komunikat po polsku.
- Typy: ParticipantDTO, GetExpensesQuery, lokalny FilterState { participantId?: UUID }.
- Propsy: participants, value, onChange, onClear.

### Lista grup dat

- Opis: Renderuje sekcje po dacie, utrzymując stabilne sortowanie w ramach grupy dla przewidywalności filtrów.
- Główne elementy: nagłówek daty sformatowany pl-PL, lista kart wydatków.
- Obsługiwane interakcje: przewijanie/paginacja, klik w kartę do szczegółów.
- Walidacja: brak; opiera się na już zweryfikowanych danych z API.
- Typy: ExpenseDTO[], ExpensesListResponse, ExpenseGroupVM { date: Date, items: ExpenseCardVM[] }.
- Propsy: items (grupy), onLoadMore, isLoading, hasMore.

### Karta wydatku

- Opis: Wyświetla płacącego, kwotę, liczność podziału, skrót opisu oraz akcje Edytuj/Usuń gdy dozwolone.
- Główne elementy: label płacącego, sformatowana kwota PLN, badge „N osób”, przycisk menu akcji.
- Obsługiwane interakcje: otwarcie edycji, potwierdzenie usunięcia, przejście do szczegółu.
- Walidacja: przy usuwaniu weryfikacja statusu open na poziomie UI i obsługa 422 z API.
- Typy: ExpenseDTO, ExpenseCardVM { id, payerNickname, amountCents, description?, shareCount, participantsShort }.
- Propsy: expense, canEdit, onEdit, onDelete.

### Puste stany

- Opis: Komunikaty i CTA przy braku wydatków lub przy braku uczestników, zgodnie z UX i WCAG AA.
- Główne elementy: ikonografia, nagłówek, opis, przyciski akcji.
- Obsługiwane interakcje: „Dodaj pierwszy koszt”, „Dodaj pierwszego uczestnika”.
- Walidacja: brak; sterowane danymi.
- Typy: brak specyficznych, używa stanu widoku.
- Propsy: isOwner, isOpen, onAddExpense, onAddParticipant.

## 5. Typy

- DTO z backendu: ExpenseDTO, ExpensesListResponse, ParticipantDTO, wraz z polami id, payer_participant_id, amount_cents, expense_date, description, share_count, participants, created_at, updated_at, last_edited_by.
- Query models: GetExpensesQuery z polami participant_id, date_from, date_to, page, limit, sort_by, sort_order oraz ExpenseSortBy.
- Nowe ViewModel: ExpenseCardVM { id: UUID, payerNickname: string, amountCents: number, expenseDate: Date, description?: string | null, shareCount: number, participantsShort: string[] }, ExpenseGroupVM { date: Date, items: ExpenseCardVM[] }, ExpensesQueryState { participantId?: UUID, page: number, limit: number, sort_by: "expense_date" | "created_at" | "amount_cents", sort_order: "desc" | "asc" } .
- Pomocnicze: formatCurrency(amountCents, "PLN") i formatDate(date) zgodnie z pl-PL, wykorzystane do prezentacji.

## 6. Zarządzanie stanem

Stan lokalny widoku: query state (participantId, page, limit, sort), kolekcja expenses, grouping by date, isLoading, error, etag do obsługi warunku 304. Dodatkowo isOwner i isOpen wpływają na dostępność akcji edycyjnych i usuwania, a zmiana filtra resetuje page i przeładowuje dane. Rekomendowany custom hook: useExpenses(settlementId, query) obsługujący pobranie, łączenie stron, ETag i błędy 401/403/404/422.

## 7. Integracja API

- GET /settlements/{settlement_id}/expenses z parametrami participant_id, date_from, date_to, page, limit, sort_by, sort_order, zwraca PagedResponse<ExpenseDTO> i nagłówek ETag dla conditional requests (304 gdy If-None-Match pasuje).
- DELETE /settlements/{settlement_id}/expenses/{id} usuwa wydatek tylko gdy settlement status=open, 204 na sukces, 422 jeśli closed.
- Obsługa błędów: 401 Unauthorized, 403 Forbidden, 404 Not Found, 400 validation_error/invalid_uuid/invalid_participant oraz mapowania 422 dla invalid_payer/invalid_participants/settlement_closed.

## 8. Interakcje użytkownika

- Filtrowanie: wybór osoby ustawia participant_id i przeładowuje listę, filtr obejmuje rolę płacącego i uczestnika podziału, bez zmiany kolejności w grupie.
- Usuwanie: akcja „Usuń” z potwierdzeniem, po 204 aktualizacja listy i ewentualne zniknięcie pustej grupy.
- Paginacja: „Załaduj więcej” zwiększa page do limitu 100 per żądanie, scala wyniki stabilnie.

## 9. Warunki i walidacja

- Uprawnienia: właściciel może edytować do zamknięcia; niewłaściciel wyłącznie odczyt, próby edycji kończą się błędem autoryzacji.
- Status rozliczenia: closed blokuje dodawanie/edycję/usuwanie na UI i przez API, 422 dla prób zapisu.
- Kwoty: minimalnie 0,01 PLN, wartości przechowywane w groszach, prezentacja zgodna z pl‑PL; pole kwoty z klawiaturą numeryczną.
- Nicki uczestników: unikalne w ramach rozliczenia, walidowane wzorcem i case-insensitive; badge „Właściciel” przy właścicielu.
- Sortowanie: stabilne w grupach dat, filtry nie zmieniają kolejności w ramach grupy.

## 10. Obsługa błędów

- 401: komunikat o konieczności logowania i przekierowanie do logowania.
- 403: komunikat o braku uprawnień, wyłączenie akcji edycyjnych.
- 404: informacja o braku rozliczenia lub wydatku, CTA powrotu.
- 400: czytelne komunikaty walidacyjne po polsku dla invalid_uuid/validation_error/invalid_participant.
- 422: komunikaty dla settlement_closed, invalid_payer/invalid_participants; nie zmieniać lokalnego stanu w sposób niespójny.
- 500: przyjazny fallback i opcja ponów, bez żargonu księgowego.

## 11. Kroki implementacji

1. Przygotuj routing /settlements/:id?step=expenses i osadź widok w layout kroków rozliczenia z kontrolą statusu i uprawnień.
2. Zaimplementuj typy: import DTO i zdefiniuj VM (ExpenseCardVM, ExpenseGroupVM, ExpensesQueryState) oraz util formatCurrency/formatDate.
3. Zbuduj hook useExpenses z obsługą GET, ETag/304, paginacji, błędów i mapowaniem do VM oraz grupowaniem po dacie.
4. Zaimplementuj Pasek filtra ze stanem participantId i synchronizacją z URL, wraz z listą uczestników.
5. Zaimplementuj Listę grup dat z renderowaniem nagłówków i Kart wydatków, zachowując stabilne sortowanie.
6. Dodaj akcję „Usuń” (DELETE) z modalem potwierdzenia, obsługą 204/404/403/422 i natychmiastową aktualizacją listy.
7. Zaimplementuj puste stany z CTA i mobilną dostępnością, zgodnie z WCAG AA.
8. Dodaj paginację/„Załaduj więcej” z łączeniem stron i kontrolą limitu do 100, bez naruszania kolejności.

### Struktura komponentów (drzewo)

```
SettlementLayout
  └─ ExpensesView
      ├─ FilterBar
      ├─ DateGroupList
      │   ├─ DateGroupHeader
      │   └─ ExpenseCard*
      ├─ EmptyState
      └─ LoadMore
```

Powyższe drzewo odzwierciedla separację odpowiedzialności: filtr kontroluje zapytania, lista zajmuje się prezentacją pogrupowanych danych, a karty odpowiadają za akcje jednostkowe.

### Mapowanie user stories

- US‑032: usuwanie dla open z aktualizacją listy i bilansu po 204.
- US‑034: filtr ogranicza listę do ról płacący/uczestnik.
- US‑074: stabilne sortowanie w grupach i niezmienność kolejności przy filtrze.
