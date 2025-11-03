Poniżej znajduje się kompletny plan implementacji widoku Formularz wydatku dla FlexiSplit, gotowy do zapisania jako .ai/expense-form-view-implementation-plan.md i zgodny z PRD, user stories oraz kontraktami API i typami z załącznika.

# Plan implementacji widoku Formularz wydatku

## 1. Przegląd

Widok służy do dodawania i edycji wydatków w ramach rozliczenia z równym podziałem kosztów i jednym płacącym, z walidacją kwot, domyślnym udziałem wszystkich uczestników i obsługą przypadku jednoosobowego wydatku.
Formularz zawiera pola: kwota w PLN z separatorem dziesiętnym, selektor płacącego z listy uczestników, lista uczestników z checkboxami domyślnie zaznaczonymi, data, opis ≤140 znaków oraz podgląd jednostkowej części, a zapisy realizowane są przez POST/PUT endpointy dla rozliczeń o statusie open.

## 2. Routing widoku

Ścieżki: tworzenie nowego wydatku pod /settlements/:id/expenses/new oraz edycja istniejącego pod /settlements/:id/expenses/:expenseId/edit zgodnie z opisem widoku.
Dostępność akcji edycji jest warunkowana statusem rozliczenia (open), a dla closed interfejs ma blokować edycję oraz obsłużyć błędy 422 z API w razie wyścigu stanów.

## 3. Struktura komponentów

- ExpenseForm (kontener logiki formularza i walidacji).
- AmountInput (kontrolka kwoty z klawiaturą numeryczną i weryfikacją 0,01+).
- PayerSelect (selektor płacącego z dostępnych uczestników rozliczenia).
- ParticipantsChecklist (lista uczestników z checkboxami, domyślnie wszyscy zaznaczeni).
- DateInput (pole daty wydatku zgodne z wymaganym formatem).
- DescriptionField (opis z licznikiem znaków i limitem 140).
- SharePreview (podgląd liczby osób i jednostkowej części kosztu).
- FormActions (Zapisz/Anuluj z blokadą podczas requestu).
- ErrorBanner (komunikaty walidacji i błędów API po polsku).

## 4. Szczegóły komponentów

### ExpenseForm

- Opis: Komponent nadrzędny spinający stan formularza, walidację, integrację z API oraz ścieżki tworzenia i edycji, zależny od statusu rozliczenia (open/closed).
- Główne elementy: formularz HTML z role="form", aria-describedby dla błędów, focus management i trap w trybie modalnym, sekcja pól i przyciski akcji.
- Zdarzenia: submit (POST/PUT), cancel (nawigacja wstecz), onChange pól, onValidate przy blur/submit.
- Walidacja: amount ≥ 0,01 PLN, payer należy do uczestników rozliczenia, co najmniej 1 uczestnik zaznaczony, data wymagana, opis ≤ 140 znaków, blokada zapisu gdy brak uczestników.
- Typy: ExpenseDetailsDTO/ExpenseDTO do trybu edycji, CreateExpenseCommand/UpdateExpenseCommand do zapisu, ExpenseParticipantMiniDTO dla list, ApiError do obsługi błędów, własny ExpenseFormVM.
- Propsy: mode: 'create'|'edit', settlementId: UUID, expenseId?: UUID, participants: ExpenseParticipantMiniDTO[], initialData?: ExpenseDTO, onSaved: (id: UUID) => void .

### AmountInput

- Opis: Pole kwoty w groszach z wejściem dziesiętnym, klawiaturą numeryczną na mobile i prezentacją w pl‑PL.
- Główne elementy: input type="text" z pattern i step, maska akceptująca separator dziesiętny, aria-invalid.
- Zdarzenia: onChange parsujący PLN→cents, onBlur walidujący minimalną wartość.
- Walidacja: > 0, minimalna jednostka 0,01 PLN, format zgodny z locale, brak wartości ujemnych i zera.
- Typy: AmountCents, helpery formatCurrency oraz ewentualny parser string→cents.
- Propsy: value: AmountCents|undefined, onChange: (cents: number|undefined) => void, error?: string .

### PayerSelect

- Opis: Selektor płacącego ograniczony do uczestników rozliczenia, wraz z oznaczeniem właściciela jeżeli dotyczy.
- Główne elementy: select z listą participant.nickname i value=participant.id, label i opis dostępności.
- Zdarzenia: onChange ustawiający payer_participant_id.
- Walidacja: wartość wymagana, ID musi istnieć w rozliczeniu, zgodność z API.
- Typy: ExpenseParticipantMiniDTO, UUID.
- Propsy: participants: ExpenseParticipantMiniDTO[], value?: UUID, onChange: (id: UUID) => void, error?: string.

### ParticipantsChecklist

- Opis: Lista checkboxów wszystkich uczestników, domyślnie wszyscy zaznaczeni, z możliwością odznaczania pojedynczych osób.
- Główne elementy: lista input type="checkbox" z labelami nickname, licznik zaznaczonych.
- Zdarzenia: onToggle(id), onSelectAll, onClearAll.
- Walidacja: co najmniej 1 uczestnik zaznaczony, edge case: dokładnie 1 uczestnik obsłużony bez dzielenia.
- Typy: ExpenseParticipantMiniDTO, UUID[].
- Propsy: items: ExpenseParticipantMiniDTO[], selectedIds: UUID[], onChange: (ids: UUID[]) => void, error?: string.

### DateInput

- Opis: Data wydatku wymagana przez API w formacie date.
- Główne elementy: input type="date" z lokalizacją pl‑PL i aria-invalid.
- Zdarzenia: onChange ustawiający expense_date.
- Walidacja: pole wymagane, format YYYY‑MM‑DD zgodny z kontraktem.
- Typy: DateString.
- Propsy: value?: DateString, onChange: (v: DateString) => void, error?: string.

### DescriptionField

- Opis: Opcjonalny opis z limitem 140 znaków i licznikiem.
- Główne elementy: textarea/input z aria-describedby, licznik aktualizowany onInput.
- Zdarzenia: onChange/onInput.
- Walidacja: długość ≤ 140 znaków, pole może być null.
- Typy: string|null .
- Propsy: value?: string, onChange: (v: string) => void, error?: string, maxLength=140.

### SharePreview

- Opis: Oblicza share_count i prezentuje jednostkową część w PLN z regułą deterministycznej przydziału reszty groszy.
- Główne elementy: tekstowy podgląd „Osób w podziale: N, Część na osobę: X zł”.
- Zdarzenia: brak, reaguje na zmiany amount i selectedIds.
- Walidacja: wyświetla ostrzeżenie, gdy selectedIds puste lub amount niepoprawny.
- Typy: AmountCents, util formatCurrency.
- Propsy: amountCents?: number, selectedCount: number, normalizedNicknames: string[] do kolejności deterministycznej.

### FormActions

- Opis: Zestaw przycisków Zapisz i Anuluj z obsługą disabled podczas requestu.
- Główne elementy: button type="submit", button type="button".
- Zdarzenia: onSubmit, onCancel.
- Walidacja: kontrola disabled jeśli invalid lub loading.
- Typy: brak dodatkowych.
- Propsy: canSubmit: boolean, isSubmitting: boolean, onCancel: () => void.

### ErrorBanner

- Opis: Prezentuje błędy walidacji i komunikaty z API po polsku bez żargonu księgowego.
- Główne elementy: rola alert, lista błędów.
- Zdarzenia: zamknięcie banera jeżeli przewidziane.
- Walidacja: brak, jedynie prezentacja.
- Typy: ApiError.
- Propsy: error?: ApiError|string .

## 5. Typy

- Wykorzystać istniejące DTO: ExpenseDTO, ExpenseDetailsDTO, ExpenseParticipantMiniDTO, CreateExpenseCommand, UpdateExpenseCommand, UUID, AmountCents, DateString, ApiError z sekcji Type Definitions.
- Nowe ViewModel: ExpenseFormVM { amountCents?: number; payerId?: UUID; participantIds: UUID[]; date?: DateString; description?: string|null; isValid: boolean; errors: Record<string,string>; isSubmitting: boolean } .
- View props i helpery: parser kwoty PLN→cents, formatCurrency z pl‑PL oraz normalizacja nicków do deterministycznej kolejności dla reszt groszy w podglądzie.

## 6. Zarządzanie stanem

Stan lokalny w ExpenseForm przechowuje amountCents, payerId, participantIds, date, description, errors, isSubmitting oraz computed shareCount i jednostkową część do podglądu.
Opcjonalny hook useExpenseForm zapewni inicjalizację wartości domyślnych (wszyscy uczestnicy zaznaczeni, pusta kwota/opis, dzisiejsza data), walidację pól i submit, a także mapowanie błędów API na pola.

## 7. Integracja API

- POST /settlements/{settlement_id}/expenses dla tworzenia, body: payer_participant_id, amount_cents (>0), expense_date, description|null (≤140), participant_ids (min 1), statusy błędów: 400/401/403/404/422 .
- PUT /settlements/{settlement_id}/expenses/{id} dla edycji z tym samym body, success 200, te same kody błędów, a 422 dla closed.
- W trybie edycji formularz wypełnia się danymi ExpenseDTO, w trybie tworzenia używa domyślnych wartości i po sukcesie emituje onSaved oraz odświeża listę wydatków w widoku szczegółów rozliczenia.

## 8. Interakcje użytkownika

- Wejście do „Dodaj wydatek” automatycznie zaznacza wszystkich uczestników, fokus na kwotę i prezentuje klawiaturę numeryczną na mobile.
- Zmiana kwoty natychmiast aktualizuje podgląd jednostkowej części, a niewłaściwy format wyświetla błąd inline.
- Wybór płacącego ogranicza się do istniejących uczestników rozliczenia, a brak wyboru blokuje Zapisz.
- Odznaczanie uczestników aktualizuje shareCount i w razie pustej listy blokuje Zapisz oraz pokazuje komunikat.
- Zapis wykonuje POST/PUT i w razie sukcesu wraca do listy z grupowaniem po dacie oraz aktualizuje bilans w podsumowaniu, a błędy prezentuje w ErrorBanner.

## 9. Warunki i walidacja

- amount_cents: liczba dodatnia, minimalnie 1 cent, wprowadzanie z separatorem dziesiętnym i przechowywanie w groszach.
- payer_participant_id: wymagany, musi istnieć w rozliczeniu zgodnie z walidacją backendu.
- participant_ids: min 1, wszystkie muszą istnieć w rozliczeniu, edge case jednoosobowy bez dzielenia.
- expense_date: wymagane pole date zgodnie z kontraktem.
- description: opcjonalne, długość ≤ 140 znaków, null dozwolone.
- Status rozliczenia: edycja tylko dla open, closed skutkuje blokadą w UI i ewentualnie 422 z API przy wyścigu.

## 10. Obsługa błędów

- 401 unauthorized: przekierowanie do logowania lub baner „Wymagane logowanie”.
- 403 forbidden: komunikat o braku uprawnień właściciela do edycji.
- 404 not_found: komunikat „Rozliczenie/Wydatek nie znaleziony”, przy edycji możliwość powrotu do listy.
- 422 settlement_closed/invalid_payer/invalid_participants: baner z opisem i oznaczenie pól payer/participants/lock UI dla closed.
- 400 validation_error/invalid_uuid/invalid_json: prezentacja detali walidacji po polsku w ErrorBanner i przy polach.

## 11. Kroki implementacji

- Utworzyć trasę i stronę widoku dla /settlements/:id/expenses/new oraz /settlements/:id/expenses/:expenseId/edit w Astro z komponentami React zgodnie ze stackiem.
- Zaimplementować ExpenseForm i hook useExpenseForm z inicjalizacją stanu, walidacją pól i mapowaniem błędów API.
- Zbudować komponenty pól: AmountInput, PayerSelect, ParticipantsChecklist, DateInput, DescriptionField, SharePreview z wymaganą dostępnością i walidacją.
- Podłączyć POST/PUT do endpointów z poprawnym body i obsługą statusów 201/200 oraz błędów 400/401/403/404/422.
- Dodać ErrorBanner i spójne komunikaty po polsku, bez żargonu księgowego, zgodnie z wytycznymi UX.
- Zapewnić mobile‑first, klawiaturę numeryczną, focus management, aria‑atrybuty i kontrasty zgodne z WCAG AA.
- Zintegrować emisję zdarzeń serwerowych po sukcesie (expense_added), jeżeli śledzenie jest aktywne po stronie backendu, oraz odświeżyć listę i bilans w widoku rozliczenia.
