Oto kompletny plan implementacji widoku „Archiwalne rozliczenie – podgląd” przygotowany na podstawie załączonego PRD, opisów endpointów i typów, gotowy do zapisania jako .ai/archiwalne-rozliczenie-podglad-view-implementation-plan.md.

# Plan implementacji widoku Archiwalne rozliczenie – podgląd

## 1. Przegląd

Widok służy do przeglądania zamkniętego rozliczenia wraz z jego bilansem i listą przelewów, bez możliwości edycji, z wyraźnym oznaczeniem statusu „Zamknięte” i przyciskiem kopiowania pełnego podsumowania do schowka. Źródłem danych są szczegóły rozliczenia oraz snapshot obliczeń (salda i transfery) dostępny wyłącznie dla rozliczeń o statusie closed i użytkowników z uprawnieniami dostępu.

## 2. Routing widoku

Ścieżka: /settlements/:id z wymaganym stanem domenowym status=closed, przy czym dla rozliczeń otwartych snapshot zwróci błąd 422 i należy poinformować użytkownika oraz zaproponować powrót do trybu edycji.

## 3. Struktura komponentów

- ArchivedSettlementPage: kontener strony, orkiestracja pobrań i renderowanie sekcji.
- ClosedBanner: baner informujący o statusie „Zamknięte” i blokadzie edycji.
- SettlementHeader: nagłówek z tytułem, metadanymi i statusem.
- BalancesPanel: lista sald per uczestnik w PLN, dokładność do grosza.
- TransfersPanel: zminimalizowana lista przelewów „kto komu ile” posortowana stabilnie.
- CopySummaryButton: akcja „Kopia podsumowania” z komunikatem o sukcesie i logowaniem zdarzenia summary_copied.
- ErrorState i LoadingState: stany ładowania i błędów dla obu zapytań.

## 4. Szczegóły komponentów

### ArchivedSettlementPage

- Opis: Pobiera szczegóły rozliczenia i snapshot, waliduje status, renderuje sekcje i obsługuje błędy 401/403/404/422.
- Główne elementy: ClosedBanner, SettlementHeader, BalancesPanel, TransfersPanel, CopySummaryButton, ErrorState, LoadingState.
- Interakcje: inicjalizacja fetchy, retry, delegacja do CopySummaryButton.
- Walidacja: wymagane status=closed dla snapshotu, dostęp tylko dla uprawnionych, poprawny UUID parametru id.
- Typy: SettlementDetailsDTO, SettlementSnapshotDTO, ApiError, ArchivedSettlementViewVM.
- Propsy: { id: UUID } z routera.

### ClosedBanner

- Opis: Wyświetla badge/baner „Zamknięte” oraz krótki opis braku możliwości edycji.
- Elementy: znacznik statusu, aria-live=”polite” dla czytników, wysoki kontrast.
- Interakcje: brak, czysto prezentacyjny.
- Walidacja: render tylko gdy status === "closed".
- Typy: { status: "closed" }.
- Propsy: { status: "closed" }.

### SettlementHeader

- Opis: Tytuł rozliczenia, liczby uczestników i wydatków, daty utworzenia/aktualizacji/zamknięcia, waluta (PLN).
- Elementy: h1 z tytułem, metryki, daty sformatowane pl-PL.
- Interakcje: brak.
- Walidacja: obecność title i dat, poprawna prezentacja liczników i waluty.
- Typy: SettlementDetailsDTO, SettlementHeaderVM.
- Propsy: { settlement: SettlementDetailsDTO }.

### BalancesPanel

- Opis: Lista sald per uczestnik w PLN z dokładnością do grosza, wartości z mapy balances snapshotu.
- Elementy: lista/tabla z nickname i kwotą, formatowanie walutowe pl-PL, legenda koloru dla należności/dopłat.
- Interakcje: przewijanie, sortowanie alfabetyczne po nickname stabilne (opcjonalnie).
- Walidacja: pełne odwzorowanie balances, brak modyfikacji danych, waluta PLN.
- Typy: SettlementSnapshotDTO, BalanceItemVM.
- Propsy: { participants: ParticipantDTO[], balances: BalancesMap }.

### TransfersPanel

- Opis: Minimalna lista przelewów generowana przez backend, prezentacja from → to: amount.
- Elementy: lista pozycji, odwzorowanie UUID na nickname, stabilna kolejność.
- Interakcje: kopiowanie pojedynczej pozycji (opcjonalnie), przewijanie.
- Walidacja: suma „do zapłaty” równa sumie „do otrzymania” zapewniana przez backend, UI nie zmienia tej listy.
- Typy: TransferDTO, TransferItemVM.
- Propsy: { participants: ParticipantDTO[], transfers: TransferDTO[] }.

### CopySummaryButton

- Opis: Generuje tekst z nagłówkiem, saldami i transferami oraz kopiuje do schowka.
- Elementy: przycisk, aria-label, toast o sukcesie/błędzie.
- Interakcje: onClick → composeSummary() → navigator.clipboard.writeText → sukces: toast + logowanie summary_copied, błąd: toast i fallback.
- Walidacja: snapshot dostępny, zawiera balances i transfers, poprawne sformatowanie PLN.
- Typy: SummaryTextBuilderInput, string.
- Propsy: { settlement: SettlementDetailsDTO, snapshot: SettlementSnapshotDTO, participants: ParticipantDTO[] }.

### ErrorState / LoadingState

- Opis: Wspólne stany dla obu fetchy, różnicowanie kodów 401/403/404/422/500.
- Elementy: spinnery, komunikaty w języku polskim zgodne z PRD, CTA powrotu lub odświeżenia.
- Interakcje: retry, nawigacja „Wróć do listy”.
- Walidacja: dostępność WCAG AA, aria-live dla błędów.
- Typy: ApiError.
- Propsy: { error?: ApiError }.

## 5. Typy

- SettlementDetailsDTO: jak w definicjach, zawiera sumaryczne pola i total_expenses_amount_cents.
- SettlementSnapshotDTO: { settlement_id, balances: Record<UUID, AmountCents>, transfers: TransferDTO[], algorithm_version, created_at }.
- ParticipantDTO: { id, nickname, is_owner, created_at, updated_at, last_edited_by }.
- TransferDTO: { from: UUID, to: UUID, amount_cents: AmountCents }.
- ApiError: { status: number; code?: string; message?: string; details?: unknown }.
- ArchivedSettlementViewVM: { settlement: SettlementDetailsDTO; snapshot: SettlementSnapshotDTO; participants: ParticipantDTO[] }.
- BalanceItemVM: { participantId: UUID; nickname: string; amountCents: number; formatted: string }.
- TransferItemVM: { fromNickname: string; toNickname: string; amountCents: number; formatted: string }.
- SettlementHeaderVM: { title: string; status: "closed"; participantsCount: number; expensesCount: number; createdAt: Date; updatedAt: Date; closedAt: Date | null } .
- SummaryTextBuilderInput: { header: SettlementHeaderVM; balances: BalanceItemVM[]; transfers: TransferItemVM[] }.

## 6. Zarządzanie stanem

- useSettlement(id): pobiera GET /settlements/{id}, przechowuje loading/error/data, revalidacja przy focusie i retry.
- useSettlementSnapshot(id): pobiera GET /settlements/{id}/snapshot, obsługuje 422 odmiennie od 401/403/404, retry z backoff.
- useClipboard(): abstrakcja na navigator.clipboard z fallback do tymczasowego textarea, zwraca copy(text) i stan.
- useToast(): do komunikatów o skopiowaniu/ błędach, z polskimi treściami.
- Format helpers: formatCurrency(PLN), formatDate/DateTime pl-PL z dostarczonych utili.

## 7. Integracja API

- GET /settlements/{id}: 200 → SettlementDetailsDTO, błędy: 401 unauthorized, 403 forbidden, 404 not found.
- GET /settlements/{id}/snapshot: 200 → SettlementSnapshotDTO, błędy: 401, 403, 404, 422 gdy rozliczenie nie jest zamknięte, 500 przy problemie ze snapshotem.
- Wymogi: UUID walidowany po stronie API, dostęp tylko dla właściciela/uczestników, snapshot dostępny wyłącznie dla closed.

## 8. Interakcje użytkownika

- Wejście na widok: automatyczne pobranie szczegółów i snapshotu oraz render banera „Zamknięte”.
- Kopiowanie podsumowania: kliknięcie „Kopia podsumowania” kopiuje header, listę sald i listę przelewów w czytelnym układzie i pokazuje komunikat o sukcesie.
- Błędy dostępu: w przypadku 401 zaproponowanie logowania, 403 informacja o braku uprawnień, 404 o braku rozliczenia, 422 o niezamkniętym statusie.

## 9. Warunki i walidacja

- Status zamknięcia: snapshot renderowany tylko, gdy status === "closed"; przy 422 komunikat „Rozliczenie nie jest zamknięte” i link do trybu edycji.
- Uprawnienia: wyłącznie tryb odczytu, wszystkie kontrolki edycji ukryte/disabled, brak mutacji.
- Format PLN: wszystkie wartości kwot prezentowane zgodnie z pl-PL i przechowywane w groszach, dokładność do 0,01 PLN.
- Stabilność sortowania: listy i grupy prezentowane w kolejności stabilnej zgodnie z PRD.

## 10. Obsługa błędów

- 401 Unauthorized: przekierowanie do logowania lub CTA „Zaloguj się, aby zobaczyć rozliczenie”.
- 403 Forbidden: komunikat „Brak uprawnień do tego rozliczenia”, link do listy rozliczeń.
- 404 Not Found: „Nie znaleziono rozliczenia”, CTA powrotu.
- 422 Unprocessable Entity: „Rozliczenie nie jest zamknięte – podgląd archiwalny dostępny po zamknięciu”.
- 500 Server Error / snapshot missing: „Wystąpił błąd podczas pobierania podsumowania” z opcją spróbuj ponownie.

## 11. Kroki implementacji

1. Dodać routing /settlements/:id i guard sprawdzający obecność parametru id oraz poprawny UUID po stronie klienta dla wczesnego feedbacku UI.
2. Zaimplementować hook useSettlement(id) z obsługą 401/403/404 i mapowaniem SettlementDetailsDTO na VM nagłówka.
3. Zaimplementować hook useSettlementSnapshot(id) z dedykowaną obsługą 422 i mapowaniem balances/transfers do VM oraz formatowaniem PLN.
4. Utworzyć komponenty ClosedBanner, SettlementHeader, BalancesPanel, TransfersPanel wraz z testami jednostkowymi formatowania i mapowania UUID → nickname.
5. Zaimplementować CopySummaryButton z composeSummary() generującym sekcje: nagłówek, salda per osoba, lista przelewów oraz integracją useClipboard i useToast.
6. Dodać stany LoadingState i ErrorState z komunikatami po polsku dla wszystkich kodów błędów i atrybutami dostępności.
7. Spiąć wszystko w ArchivedSettlementPage: równoległe fetche, fallbacki, retry, render sekcji i wyłączenie jakichkolwiek akcji edycyjnych.
8. Telemetria: dodać wywołanie logowania zdarzenia summary_copied po udanym kopiowaniu (po stronie serwera per PRD) lub przez dedykowany endpoint zdarzeń, zgodnie z polityką analityki.
9. QA: sprawdzić scenariusze 401/403/404/422/500, poprawność formatów pl-PL, stabilność sortowania oraz zgodność z WCAG AA na mobile.
10. Dokumentacja: opisać widok, typy i kontrakty w README modułu oraz dodać wpis do changelogu.
