# Plan implementacji widoku Szczegóły rozliczenia

### 1. Przegląd
Widok Szczegóły rozliczenia to route‑kontener prowadzący użytkownika przez kroki Uczestnicy → Koszty → Podsumowanie, prezentujący status open/closed i respektujący blokadę edycji po zamknięciu zgodnie z US‑012 i US‑070.
Widok pokazuje tytuł rozliczenia, status, stepper z aria‑current, badge właściciela przy odpowiednim nicku w obszarach list oraz banner read‑only i toast center dla komunikatów.

### 2. Routing widoku
Ścieżka: /settlements/:id z parametrem id walidowanym jako UUID i ładowaniem danych GET /settlements/{id} oraz aktualizacją tytułu przez PUT /settlements/{id} gdy status='open'.
Nawigacja wewnętrzna kroków realizowana przez lokalny stan steppera lub z użyciem query string step=participants|expenses|summary z aria‑current na aktywnym kroku .

### 3. Struktura komponentów
- SettlementDetailsPage (route‑kontener)
- SettlementHeader (tytuł + status + edycja tytułu gdy open)
- SettlementStepper (3 kroki: Uczestnicy, Koszty, Podsumowanie)
- ReadOnlyBanner (banner „tylko do odczytu” dla status=closed)
- ToastCenter (globalne komunikaty dla widoku)
- ParticipantsStep (komponent kroku Uczestnicy; badge „Właściciel” przy nicku)
- ExpensesStep (komponent kroku Koszty; lista, filtr po osobie, grupowanie po dacie)
- SummaryStep (komponent kroku Podsumowanie; salda per osoba, lista przelewów, „Kopia podsumowania”)

### 4. Szczegóły komponentów
#### SettlementDetailsPage
- Opis: Kontener routingu ładuje settlement, steruje krokami, egzekwuje politykę open/closed i renderuje bannery, nagłówek oraz treść kroku.
- Główne elementy: Header, Stepper, ReadOnlyBanner, Slot na krok, ToastCenter.
- Obsługiwane interakcje: zmiana kroku, wyświetlanie toastów, ochrona akcji edycji gdy closed.
- Walidacja: blokada edycji przy status=closed, obsługa 401/403/404/422 zgodnie z opisem endpointów.
- Typy: SettlementDetailsDTO, ApiError, SettlementsTab/Step enum (lokalne), ToastMessage VM.
- Propsy: brak zewnętrznych; korzysta z parametru id z routingu i kontekstu autoryzacji.

#### SettlementHeader
- Opis: Pokazuje tytuł, status i umożliwia edycję tytułu przez PUT w statusie open, z walidacją 1–100 znaków oraz obsługą błędów.
- Główne elementy: pole tekstowe tytułu z trybem view/edit, znacznik statusu, przycisk zapisu.
- Interakcje: edycja tytułu, zapis, anulowanie edycji, toasty sukcesu/błędu.
- Walidacja: długość tytułu do 100 znaków, brak zmian w closed, obsługa 400/401/403/404/422.
- Typy: UpdateSettlementCommand, SettlementDetailsDTO, ApiError, TitleFormState VM.
- Propsy: settlement (DTO), onUpdated(updatedSettlement), isReadOnly.

#### SettlementStepper
- Opis: Nawigacja po krokach z aria‑current i blokadą elementów zależnie od statusu i uprawnień, bez zmiany kolejności w ramach grup.
- Główne elementy: 3 przyciski/zakładki, aria‑current=step, opisy kroków.
- Interakcje: zmiana aktywnego kroku, synchronizacja z query string.
- Walidacja: dostępność a11y, aria‑current, focus management.
- Typy: Step enum, StepChangeHandler.
- Propsy: activeStep, onStepChange(step), isReadOnly.

#### ReadOnlyBanner
- Opis: Banner informujący o trybie tylko do odczytu po zamknięciu rozliczenia i blokujący akcje edycji.
- Główne elementy: dismissible alert, ikona informacyjna, tekst o blokadzie.
- Interakcje: zamknięcie bannera lokalnie, brak wpływu na status.
- Walidacja: render wyłącznie dla status=closed.
- Typy: żadnych poza prostymi props.
- Propsy: isClosed.

#### ToastCenter
- Opis: Centralny system komunikatów dla sukcesów, błędów walidacji i błędów uprawnień.
- Główne elementy: lista toastów, timery auto‑dismiss, role="status"/"alert".
- Interakcje: dodaj/usuń komunikat, auto‑zamykanie.
- Walidacja: dostępność komunikatów i kontrasty zgodnie z WCAG AA.
- Typy: ToastMessage VM.
- Propsy: messages, onDismiss(id).

#### ParticipantsStep
- Opis: Lista uczestników z dodawaniem/edycją/usuwaniem dla właściciela, badge „Właściciel” przy nicku, walidacja nicków i unikalności.
- Główne elementy: lista, formularz dodawania, edycja inline, badge, walidacja wzorca i unikalności.
- Interakcje: create/update/delete uczestnika, podpowiedź wolnych nicków przy kolizji.
- Walidacja: ^[a‑z0‑9_-]+$, unikalność case‑insensitive w rozliczeniu, limit 10.
- Typy: ParticipantDTO, CreateParticipantCommand, UpdateParticipantCommand, ApiError.
- Propsy: settlementId, isOwner, isReadOnly.

#### ExpensesStep
- Opis: Lista wydatków z grupowaniem po dacie, filtrowaniem po osobie, edycją/usuwaniem dla właściciela w statusie open, wprowadzanie kwot na mobile.
- Główne elementy: filtr po osobie, lista pozycji: płacący, kwota, liczba osób, skrót opisu, grupy wg daty.
- Interakcje: create/update/delete wydatek, filtr, wejście w szczegóły wydatku.
- Walidacja: kwoty w groszach, min 0,01 PLN, separator dziesiętny, locale pl‑PL, edge case jednoosobowy.
- Typy: ExpenseDTO, ExpenseDetailsDTO, CreateExpenseCommand, UpdateExpenseCommand, ExpenseParticipantMiniDTO, ApiError.
- Propsy: settlementId, isOwner, isReadOnly.

#### SummaryStep
- Opis: Prezentacja sald per osoba i listy przelewów minimalizujących liczbę transakcji oraz akcja „Kopia podsumowania” po zamknięciu.
- Główne elementy: tabelaryczna lista sald, lista przelewów, przycisk kopiowania podsumowania.
- Interakcje: kopiowanie podsumowania do schowka, wyświetlenie toastu „skopiowano”, podgląd szczegółów.
- Walidacja: dostęp do akcji kopiowania po zamknięciu rozliczenia, stabilne sortowanie wyników.
- Typy: SettlementSnapshotDTO, TransferDTO, BalancesMap, ApiError.
- Propsy: settlementId, isClosed.

### 5. Typy
Wykorzystanie dostarczonych DTO: SettlementDetailsDTO jako odpowiedź GET/PUT, ParticipantDTO i ExpenseDTO/ExpenseDetailsDTO dla dzieci kroków, SettlementSnapshotDTO dla podsumowania oraz ApiError jako opakowanie błędów.
Modele widoku: SettlementDetailsVM (id, title, status, counts, total, daty, isDeletable, href), TitleFormState (value, dirty, saving, error), Step enum, ToastMessage (id, type, text) i flagi isOwner/isReadOnly pochodzące z danych i statusu.

### 6. Zarządzanie stanem
Stan w kontenerze: loaded settlement, activeStep, isReadOnly= status==='closed', toasty, pending flags dla żądań, błąd globalny dla 401/403/404.
Hooki: useSettlementDetails(id) do GET i odświeżenia, useUpdateTitle(id) do PUT z walidacją 100 znaków, useStepper(sync z query), useToast do zarządzania komunikatami oraz użycie kontekstu auth z Supabase.

### 7. Integracja API
GET /settlements/{id}: 200 OK zwraca SettlementDetailsDTO lub 401/403/404 zgodnie z dostępem i istnieniem, z rozróżnieniem 403 vs 404 na podstawie checkAccessOrExistence.
PUT /settlements/{id}: body { "title": "string max 100" }, 200 OK ze zaktualizowanym DTO lub 400 validation_error, 401, 403, 404 oraz 422 gdy settlement nie jest open.

### 8. Interakcje użytkownika
- Zmiana kroku w stepperze przełącza widok treści i aktualizuje aria‑current oraz stan local/query.
- Edycja tytułu i zapis w headerze działa tylko gdy status=open, z komunikatami toast po sukcesie/błędzie.
- Akcje w krokach Uczestnicy i Koszty są niedostępne dla closed, a próba modyfikacji pokazuje komunikat o blokadzie.
- W Podsumowaniu dostępna jest akcja „Kopia podsumowania” kopiująca nagłówek, salda i przelewy.

### 9. Warunki i walidacja
Walidacja parametru id jako UUID i odpowiednie kody błędów 400/404/403 w oparciu o istniejące mechanizmy GET.
Walidacja tytułu: wymagany, max 100 znaków, PUT blokowany dla closed z 422, a 401/403/404 zgodnie z uprawnieniami i istnieniem.
Walidacje kroków: unikalność i wzorzec nicka, limity uczestników, poprawność kwot w groszach, mobile‑friendly input, a11y i WCAG AA.

### 10. Obsługa błędów
Mapowanie kodów: 401 unauthorized → ekran logowania lub toast, 403 forbidden → toast „brak uprawnień”, 404 not found → ekran pusty z informacją, 422 unprocessable → komunikat „rozliczenie nie jest w stanie open/closed” stosownie do akcji.
Błędy walidacji pól pokazują komunikaty po polsku, bez żargonu księgowego, z podświetleniem pól i focus management.

### 11. Kroki implementacji
1. Utwórz trasę /settlements/[id] w Astro 5 i przygotuj loader useSettlementDetails do wywołania GET z walidacją UUID oraz obsługą 401/403/404.
2. Zaimplementuj SettlementHeader z trybem edycji tytułu, walidacją do 100 znaków i akcją PUT, dezaktywując edycję dla status=closed.
3. Dodaj SettlementStepper z aria‑current i synchronizacją aktywnego kroku, domyślnie „Uczestnicy”.
4. Zaimplementuj ReadOnlyBanner renderowany dla closed oraz ToastCenter do globalnych komunikatów.
5. Wstaw placeholdery komponentów ParticipantsStep, ExpensesStep i SummaryStep integrujące się z polityką open/closed i badge „Właściciel” w listach.
6. Zapewnij formatowanie kwot w groszach i prezentację pl‑PL, klawiaturę numeryczną i grupowanie listy wydatków po dacie z filtrem po osobie.
7. Dodaj akcję „Kopia podsumowania” w SummaryStep kopiującą nagłówek, salda i listę przelewów do schowka z toas-tem sukcesu.
8. Zaimplementuj obsługę błędów i stanów pustych z jasnymi komunikatami po polsku oraz zgodność z WCAG AA.
9. Skonfiguruj analitykę zdarzeń serwerowych dla kluczowych kroków lejka oraz emisję summary_copied po akcji kopiowania.
10. Zapewnij zgodność z Tech Stack: Astro 5, React z TypeScript 5, Tailwind 4, shadcn/ui, Supabase Auth/DB, CI/CD przez GitHub Actions i hosting w Cloudflare.