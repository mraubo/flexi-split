# Plan implementacji widoku Lista rozliczeń

## 1. Przegląd
Widok Lista rozliczeń pozwala właścicielowi przeglądać aktywne i archiwalne rozliczenia, tworzyć nowe (z limitem 3 aktywnych), usuwać zamknięte oraz przechodzić do szczegółów. Widok wspiera mobile-first, stabilne sortowanie, dostępność zgodną z WCAG AA oraz jasne stany puste i komunikaty.

## 2. Routing widoku
- Ścieżka: /settlements?tab=active|archive
- Domyślny tab: active
- Zmiana zakładki aktualizuje query param tab i refetchuje listę z odpowiednim statusem.

## 3. Struktura komponentów
- SettlementsPage (wyspa React w Astro)
  - TabsSegment
  - HeaderBar
    - NewSettlementButton (otwiera NewSettlementDialog)
  - ContentArea
    - LoadingSkeleton (podczas fetchu)
    - ErrorState
    - EmptyState
    - SettlementsList
      - SettlementCard (xN)
        - CardActionsMenu (dla closed)
    - PaginationControls (Load more)
  - ConfirmDeleteDialog (portal)
  - NewSettlementDialog (portal)
  - ToastsProvider

## 4. Szczegóły komponentów
### SettlementsPage
- Opis komponentu: Główny kontener zarządzający stanem zakładek, zapytaniami, tworzeniem i usuwaniem.
- Główne elementy: kontener, TabsSegment, przycisk nowego rozliczenia, lista, dialogi, toasty.
- Obsługiwane interakcje:
  - Zmiana zakładki: przełącza status między open/closed i synchronizuje URL.
  - Utworzenie rozliczenia: otwiera dialog, po potwierdzeniu wykonuje POST i odświeża listę „Aktywne”.
  - Usunięcie rozliczenia: potwierdzenie i DELETE; odświeża „Archiwum”.
- Obsługiwana walidacja:
  - Limit 3 aktywnych: prewencyjne zliczenie i komunikat; obsługa 422 z API.
  - Dostępność akcji usuń tylko dla closed.
- Typy: SettlementsListResponse, SettlementSummaryDTO, SettlementsTab, SettlementsQueryState, CreateSettlementCommand.
- Propsy: brak (komponent strony).

### TabsSegment
- Opis komponentu: Przełączanie między Aktywne/Archiwum z a11y Tabs.
- Główne elementy: role="tablist", dwa przyciski tabów, aria-selected, underline/indicator.
- Obsługiwane interakcje: klik/Enter/Space zmienia aktywny tab, aktualizuje query param.
- Obsługiwana walidacja: brak.
- Typy: SettlementsTab = "active" | "archive".
- Propsy:
  - value: SettlementsTab
  - onChange: (tab: SettlementsTab) => void

### HeaderBar
- Opis komponentu: Pasek nagłówka z tytułem i akcjami.
- Główne elementy: tytuł „Rozliczenia”, licznik aktywnych (opcjonalny), NewSettlementButton.
- Obsługiwane interakcje: klik „Nowe rozliczenie”.
- Obsługiwana walidacja: disable przycisku jeśli osiągnięto limit 3 aktywne.
- Typy: AggregatedCountsVM.
- Propsy:
  - activeCount?: number
  - onNewSettlementClick: () => void
  - limitActive: number (domyślnie 3)

### NewSettlementButton
- Opis komponentu: Przycisk wywołujący dialog tworzenia.
- Główne elementy: Button z ikoną „+”.
- Obsługiwane interakcje: klik otwiera dialog.
- Obsługiwana walidacja: disabled gdy activeCount >= 3.
- Typy: brak.
- Propsy:
  - disabled: boolean
  - onClick: () => void

### NewSettlementDialog
- Opis komponentu: Formularz utworzenia rozliczenia z polem tytułu (max 100, wymagane).
- Główne elementy: Dialog + Form (Input, licznik znaków, Submit/Cancel).
- Obsługiwane interakcje:
  - Submit: POST /api/settlements.
  - Cancel: zamyka dialog.
- Obsługiwana walidacja:
  - title: required, trim, 1–100 znaków.
  - Obsługa 422 MAX_OPEN_SETTLEMENTS — render komunikat o limicie.
- Typy: CreateSettlementCommand, ApiError.
- Propsy:
  - open: boolean
  - onOpenChange: (open: boolean) => void
  - onCreated: (created: SettlementSummaryDTO) => void

### SettlementsList
- Opis komponentu: Lista kart rozliczeń z paginacją „Załaduj więcej”.
- Główne elementy: <ul role="list">, SettlementCard jako <li>.
- Obsługiwane interakcje: klik karty przechodzi do /settlements/:id.
- Obsługiwana walidacja: brak.
- Typy: SettlementCardVM[], PaginationMeta.
- Propsy:
  - items: SettlementCardVM[]
  - pagination: PaginationMeta
  - loading: boolean
  - onLoadMore: () => void

### SettlementCard
- Opis komponentu: Karta pojedynczego rozliczenia z metadanymi i akcjami.
- Główne elementy: Card, tytuł, badge statusu, liczniki, daty (created/updated/closed), CTA „Zobacz” lub klik całej karty, CardActionsMenu dla closed.
- Obsługiwane interakcje:
  - Klik/Enter na karcie/linku — nawigacja.
  - Otwórz menu akcji → Usuń (jeśli closed).
- Obsługiwana walidacja:
  - Akcja Usuń wyłącznie, gdy status = closed.
- Typy: SettlementCardVM.
- Propsy:
  - item: SettlementCardVM
  - onDelete: (id: string) => void

### CardActionsMenu
- Opis komponentu: Menu kontekstowe karty; dla closed zawiera „Usuń”.
- Główne elementy: DropdownMenu, pozycja „Usuń”.
- Obsługiwane interakcje: klik „Usuń” → emit event.
- Obsługiwana walidacja: ukryte dla open.
- Typy: brak.
- Propsy:
  - canDelete: boolean
  - onRequestDelete: () => void

### ConfirmDeleteDialog
- Opis komponentu: Potwierdzenie usunięcia archiwalnego rozliczenia (akcja nieodwracalna).
- Główne elementy: AlertDialog z tytułem, opisem, przyciskami.
- Obsługiwane interakcje: Potwierdzenie → DELETE /api/settlements/{id}.
- Obsługiwana walidacja:
  - Obsługa 422 (gdyby status nie był closed): komunikat „Rozliczenie nie jest zamknięte”.
  - 404: komunikat „Nie znaleziono”.
- Typy: ApiError.
- Propsy:
  - open: boolean
  - settlementId?: string
  - settlementTitle?: string
  - onOpenChange: (open: boolean) => void
  - onDeleted: (id: string) => void

### EmptyState
- Opis komponentu: Pusty stan z CTA „Utwórz rozliczenie” (dla aktywnych) lub informacją o braku archiwum.
- Główne elementy: Ikona, copy, CTA.
- Obsługiwane interakcje: klik CTA → otwarcie NewSettlementDialog.
- Obsługiwana walidacja: disabled CTA, jeśli limit 3 aktywne.
- Typy: brak.
- Propsy:
  - variant: "active" | "archive"
  - canCreate: boolean
  - onCreateClick: () => void

### PaginationControls
- Opis komponentu: Sterowanie „Załaduj więcej” dla listy stronicowanej.
- Główne elementy: Button „Załaduj więcej”.
- Obsługiwane interakcje: klik → onLoadMore.
- Obsługiwana walidacja: ukryty, jeśli page >= total_pages.
- Typy: PaginationMeta.
- Propsy:
  - pagination: PaginationMeta
  - loading: boolean
  - onLoadMore: () => void

### LoadingSkeleton
- Opis komponentu: Szkielet ładowania listy i kart.
- Główne elementy: Skeletony shadcn/ui.
- Obsługiwane interakcje: brak.
- Obsługiwana walidacja: brak.
- Typy: brak.
- Propsy:
  - rows?: number

### ErrorState
- Opis komponentu: Widok błędu z możliwością ponownego załadowania.
- Główne elementy: alert, przycisk „Spróbuj ponownie”.
- Obsługiwane interakcje: retry → refetch.
- Obsługiwana walidacja: brak.
- Typy: ApiError.
- Propsy:
  - message: string
  - onRetry: () => void

## 5. Typy
- Importowane DTO z type_definitions:
  - SettlementSummaryDTO, SettlementsListResponse, PaginationMeta, CreateSettlementCommand.
- Nowe ViewModel:
  - SettlementsTab = "active" | "archive"
  - SettlementsQueryState:
    - status: "open" | "closed"
    - page: number
    - limit: number
    - sort_by: "updated_at"
    - sort_order: "desc"
  - SettlementCardVM:
    - id: string
    - title: string
    - status: "open" | "closed"
    - participantsCount: number
    - expensesCount: number
    - createdAt: Date
    - updatedAt: Date
    - closedAt?: Date | null
    - isDeletable: boolean // status === "closed"
    - href: string // /settlements/{id}
  - AggregatedCountsVM:
    - activeCount: number
    - archiveCount: number
- Błędy:
  - ApiError:
    - status: number
    - code?: string
    - message?: string
    - details?: unknown

## 6. Zarządzanie stanem
- Źródło prawdy: hook useSettlementsList.
- Local state:
  - tab: SettlementsTab (sync z URL query param).
  - query: SettlementsQueryState (pochodna od tab).
  - list: SettlementCardVM[]
  - pagination: PaginationMeta
  - loading, error
  - dialogs: { newOpen: boolean; confirmDelete: { open: boolean; id?: string; title?: string } }
  - counts: AggregatedCountsVM (opcjonalnie z dodatkowego szybkiego zapytania do open/closed po 1 stronie albo zliczane po fetchu każdej zakładki).
- Hooki:
  - useQueryParamTab(): synchronizacja tab <-> URL.
  - useSettlementsList(query):
    - fetchuje GET /api/settlements?status=&page=&limit=&sort_by=updated_at&sort_order=desc
    - dostarcza listę, meta, loading, error, actions (reload, loadMore, create, remove).
  - useCreateSettlement():
    - POST /api/settlements
  - useDeleteSettlement():
    - DELETE /api/settlements/{id}
- Cache:
  - Klucze per tab i stronicowanie: settlements:list:{status}:{page}:{limit}:{sort}
  - Po POST — invalidacja cache dla active.
  - Po DELETE — invalidacja cache dla archive.

## 7. Integracja API
- GET /api/settlements
  - Query: status=open|closed, page, limit, sort_by=updated_at, sort_order=desc
  - Response: SettlementsListResponse
  - Mapowanie na VM: pola *_at parsowane do Date, isDeletable = status === "closed", href = `/settlements/${id}`
- POST /api/settlements
  - Body: CreateSettlementCommand { title: string }
  - Sukces: 201 + SettlementSummaryDTO
  - Błędy:
    - 400 validation_error (title)
    - 401 unauthorized → redirect do logowania
    - 422 MAX_OPEN_SETTLEMENTS → komunikat o limicie
- DELETE /api/settlements/{id}
  - Sukces: 204
  - Błędy:
    - 401 unauthorized → redirect do logowania
    - 403 forbidden → komunikat „Brak uprawnień”
    - 404 not_found → toast „Nie znaleziono”
    - 422 unprocessable_content → „Rozliczenie nie jest zamknięte”
- Uwagi:
  - W UI wyświetlać przyjazne komunikaty po polsku zgodnie z PRD.
  - W przypadku 401 — przejście do /login i zachowanie returnTo.

## 8. Interakcje użytkownika
- Przełączanie zakładek:
  - Oczekiwany wynik: lista filtrowana odpowiednio; URL aktualizowany (tab=...).
- Tworzenie rozliczenia:
  - Otwiera dialog → wpisanie tytułu → utwórz → zamknięcie dialogu → toast powodzenia → nawigacja do szczegółów rozliczenia lub pozostanie i odświeżenie listy (preferencja: nawigacja do /settlements/{id}).
  - Jeśli limit 3 — komunikat i zablokowanie akcji.
- Wejście w szczegóły rozliczenia:
  - Klik karty przenosi do /settlements/{id}.
- Usunięcie rozliczenia (Archiwum):
  - Klik menu → Usuń → potwierdzenie → sukces: usunięcie z listy + toast.
  - Błąd: odpowiedni komunikat.
- Paginacja:
  - Klik „Załaduj więcej” → dociągnięcie następnej strony i doklejenie do listy.
- Odświeżanie:
  - Retry na błędzie → powtórne GET.

## 9. Warunki i walidacja
- Limit aktywnych:
  - UI: disable „Nowe rozliczenie” + tooltip/komunikat „Limit 3 aktywne”.
  - API: obsługa 422 MAX_OPEN_SETTLEMENTS.
- Walidacja tytułu:
  - Required, 1–100 znaków, trim, blokada w kliencie i komunikaty dla 400.
- Uprawnienia:
  - Usuwanie dostępne tylko w Arichiwum (status closed).
  - API 403 → komunikat o braku uprawnień.
- A11y:
  - Tabs z rolami aria, focus visible, role="list" dla listy.
  - Klikalna karta z atrybutem aria-label i klikalnym linkiem; zapewnić obsługę Enter/Space.
- Sortowanie i stabilność:
  - sort_by=updated_at desc, stabilne w obrębie strony.
- Mobile-first:
  - Dotykowe cele 44px, czytelny kontrast, responsywność.

## 10. Obsługa błędów
- 401: przekierowanie do /login, zapisz bieżącą lokalizację do returnTo.
- 403: toast „Brak uprawnień do tej operacji”.
- 404: toast „Nie znaleziono rozliczenia”.
- 422 (create): „Osiągnięto limit 3 aktywnych rozliczeń.”
- 422 (delete): „Rozliczenie nie jest zamknięte — nie można usunąć.”
- 400 (create): wyświetl walidację przy polu tytułu.
- 5xx: ogólny komunikat „Wystąpił nieoczekiwany błąd”, opcja spróbuj ponownie.
- Retry strategia: przy błędach sieci — pojedynczy automatyczny retry z krótkim backoffem; manualny przycisk „Spróbuj ponownie”.

## 11. Kroki implementacji
1. Routing i strona:
   - Utwórz stronę Astro pod /settlements z wyspą React SettlementsPage.
   - Implementuj synchronizację query param tab (domyślnie active).
2. Typy i utilsy:
   - Zdefiniuj ViewModel (SettlementCardVM, SettlementsQueryState).
   - Napisz mapSettlementToVM(dto: SettlementSummaryDTO) i formatery dat.
3. Hooki:
   - useQueryParamTab do obsługi URL.
   - useSettlementsList(query): fetch, parsowanie, paginacja, cache.
   - useCreateSettlement i useDeleteSettlement (fetch POST/DELETE, mapowanie błędów).
4. UI podstawowy:
   - TabsSegment z a11y.
   - HeaderBar z NewSettlementButton i licznikami (opcjonalnie).
   - LoadingSkeleton, ErrorState, EmptyState.
5. Lista i karty:
   - SettlementsList z rolami i responsywnym układem.
   - SettlementCard z nawigacją do /settlements/{id}.
   - CardActionsMenu widoczne tylko dla closed.
6. Dialogi:
   - NewSettlementDialog z walidacją tytułu (1–100), obsługa 422.
   - ConfirmDeleteDialog z opisem nieodwracalności i obsługą błędów.
7. Paginacja:
   - PaginationControls „Załaduj więcej”, agregowanie stron w stanie.
8. Integracja API:
   - GET /api/settlements z parametrami status/page/limit/sort.
   - POST /api/settlements (po sukcesie: invalidacja cache „active”, ewentualna nawigacja do szczegółów).
   - DELETE /api/settlements/{id} (po sukcesie: invalidacja cache „archive”).
9. A11y i mobile:
   - Dodaj aria-* dla tabs/list, focus ringi, rozmiary dotykowe.
   - Testy na iOS/Android w przeglądarkach mobilnych.
10. Obsługa błędów i toasty:
    - Mapowanie statusów na przyjazne komunikaty.
    - Globalny ToastsProvider i helper showToast.
11. Testy i QA:
    - Jednostkowe dla mapowania VM i walidacji tytułu.
    - Integracyjne dla hooków (msw).
    - E2E (np. Playwright) dla głównych ścieżek: tworzenie, przeglądanie, usuwanie.
12. Performance i DX:
    - Lazy mount dialogów, skeletony przy pierwszym fetchu.
    - Stabilne klucze listy (id).
    - Analiza bundle (React island minimalna).
13. Dostępność i zgodność:
    - Sprawdź kontrasty, focus order, role.
    - Przegląd komunikatów PL zgodnie z PRD.