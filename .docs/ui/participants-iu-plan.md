# Plan implementacji widoku Uczestnicy

## 1. Przegląd

Widok Uczestnicy to pierwszy krok przepływu rozliczenia i służy do zarządzania listą uczestników offline w ramach jednego rozliczenia z jasną walidacją nicków, limitem 10 osób oraz widocznym oznaczeniem właściciela.
Widok egzekwuje ograniczenia biznesowe: edycja wyłącznie przez właściciela, blokada po pierwszym wydatku w UI, oraz respektuje status open/closed rozliczenia definiujący dostępność operacji na uczestnikach.

## 2. Routing widoku

Ścieżka: /settlements/:id?step=participants, gdzie :id to identyfikator rozliczenia, a step=participants ustawia aktywny krok w nawigacji krokowej.
Widok ładuje się jako część Szczegółów rozliczenia i prezentuje sekcję krok 1 z dedykowanymi komponentami listy, formularza i bannerów stanu.

## 3. Struktura komponentów

- ParticipantsViewShell: kontener widoku z nagłówkiem kroku, licznikami i stanami globalnymi widoku.
- ParticipantForm: formularz dodawania/edycji nicka z walidacją i podpowiedzią alternatywy przy kolizji.
- ParticipantsList: lista uczestników z akcjami Edytuj/Usuń, badge „Właściciel”, filtrowaniem wewnętrznym i stabilnym sortowaniem.
- EditParticipantModal: modal edycji nicka z tymi samymi regułami walidacji co dodawanie.
- DeleteParticipantConfirm: modal potwierdzenia usunięcia z komunikatami o blokadzie przy warunkach 422.
- LockBanner: banner blokady edycji po pierwszym wydatku oraz/lub przy statusie closed, z czytelnym komunikatem.
- EmptyState: puste stany z CTA „Dodaj pierwszego uczestnika” zgodnie z paternami UX i dostępności.

## 4. Szczegóły komponentów

### ParticipantsViewShell

- Opis: Odpowiada za pobranie danych wejściowych widoku, kontrolę uprawnień właściciela, wykrywanie warunków blokady oraz przekazywanie propów do dzieci.
- Główne elementy: nagłówek kroku, licznik uczestników z limitem 10, miejsce na bannery LockBanner i EmptyState, wrapper na ParticipantForm i ParticipantsList.
- Interakcje: inicjalne ładowanie listy, odświeżenia po mutacjach, reakcje na status rozliczenia/stan wydatków.
- Walidacja: egzekwuje read-only dla niewłaściciela oraz stan blokady dla closed i po pierwszym wydatku w UI.
- Typy: ParticipantsListResponse, ParticipantDTO, oraz lokalny ParticipantsViewVM opisany w sekcji Typy.
- Propsy: settlementId, isOwner, status, expensesCount, participantsCount, initialPageState.

### ParticipantForm

- Opis: Formularz tworzenia nowego uczestnika z walidacją patternu, długości, unikalności oraz podpowiedzią alternatywy z sufiksem przy kolizji.
- Główne elementy: pole nickname z aria-invalid i aria-live, przycisk Dodaj, komunikaty walidacyjne, blokada przy osiągnięciu limitu 10.
- Interakcje: onInput walidacja patternu i długości, sprawdzenie kolizji względem listy lokalnej, submit wywołuje POST i obsługę 409/422.
- Walidacja: ^[a-z0-9_-]+$, 3–30 znaków, unikalność case-insensitive w obrębie rozliczenia, limit 10, tylko przy statusie open oraz bez blokady po pierwszym wydatku w UI.
- Typy: CreateParticipantCommand oraz lokalny NicknameValidationState.
- Propsy: onCreated(participant), disabled (gdy blokada/limit), existingNicknames, suggestSuffixFn.

### ParticipantsList

- Opis: Prezentuje listę z badge „Właściciel”, wspiera Edytuj/Usuń, stabilne sortowanie i dostępność na mobile.
- Główne elementy: wiersze z nickname, etykieta Właściciel, przyciski Edytuj/Usuń z odpowiednimi aria-label.
- Interakcje: klik Edytuj otwiera EditParticipantModal, klik Usuń otwiera DeleteParticipantConfirm, po mutacjach odświeżenie listy.
- Walidacja: rozłączenie akcji przy niewłaścicielu i/lub blokadzie, wizualne stany disabled.
- Typy: ParticipantDTO[], ParticipantsListVM z polami derived (canEdit, canDelete).
- Propsy: items, onEdit, onDelete, isOwner, isLocked.

### EditParticipantModal

- Opis: Modal umożliwia zmianę nicka zgodnie z tymi samymi regułami walidacji co formularz dodawania.
- Główne elementy: pole nickname, aria-invalid, aria-live, przyciski Zapisz/Anuluj.
- Interakcje: submit wywołuje PUT, obsługuje 409 przy kolizji i 422 gdy settlement closed.
- Walidacja: pattern, długość, unikalność (wykluczając bieżący rekord), tylko open i bez blokady w UI.
- Typy: UpdateParticipantCommand, EditParticipantState.
- Propsy: participant, existingNicknames, onSaved(updated), onClose, disabled.

### DeleteParticipantConfirm

- Opis: Modal potwierdzenia usunięcia z jasnym komunikatem i obsługą kodów 422 dla przypadków brzegowych.
- Główne elementy: treść ostrzegawcza, przyciski Usuń/Anuluj, aria-modal.
- Interakcje: potwierdzenie wywołuje DELETE, obsługa błędów 403/404/422 oraz aktualizacja listy.
- Walidacja: dostępne tylko open i gdy UI nie jest zablokowane po pierwszym wydatku, finalne rozstrzygnięcie po odpowiedzi API.
- Typy: brak dodatkowych poza id i kontekstem listy.
- Propsy: participant, onDeleted(id), onClose, disabled.

### LockBanner

- Opis: Prezentuje powód blokady edycji: closed status lub minimum jeden zarejestrowany wydatek w danym rozliczeniu.
- Główne elementy: ikona ostrzeżenia, komunikat z powodem, link do Kosztów jeśli dotyczy.
- Interakcje: brak akcji modyfikujących, jedynie informacyjne.
- Walidacja: warunki wyliczane w ParticipantsViewShell i przekazywane jako props.
- Typy: LockReason = 'closed' | 'has_expenses' | null .
- Propsy: reason.

### EmptyState

- Opis: Puste stany z CTA „Dodaj pierwszego uczestnika” oraz wskazówkami krokowymi.
- Główne elementy: ikona, tytuł, opis, przycisk wywołujący fokus na formularz.
- Interakcje: klik CTA przenosi fokus do pola nickname.
- Walidacja: wyświetlany tylko, gdy participantsCount === 0.
- Typy: brak dodatkowych.
- Propsy: onCta.

## 5. Typy

- ParticipantDTO: { id, nickname, is_owner, created_at, updated_at, last_edited_by } zgodnie z Type Definitions i kontraktem API.
- ParticipantsListResponse: { data: ParticipantDTO[], pagination } z opcjonalnym page/limit w zapytaniu, default 1/50.
- CreateParticipantCommand: { nickname: string } z walidacją 3–30, pattern ^[a-z0-9_-]+$, unikalność case-insensitive.
- UpdateParticipantCommand: { nickname: string } jak wyżej, z wykluczeniem bieżącego identyfikatora przy sprawdzaniu kolizji.
- ParticipantsViewVM: { isOwner: boolean, status: 'open'|'closed', expensesCount: number, participantsCount: number, isLocked: boolean, lockReason: LockReason } .
- ParticipantsListVM: { items: Array<ParticipantItemVM>, canCreate: boolean, canEdit: boolean, canDelete: boolean }.
- ParticipantItemVM: { id: string, nickname: string, isOwner: boolean, canEdit: boolean, canDelete: boolean }.
- NicknameValidationState: { isValidPattern: boolean, isValidLength: boolean, isUniqueLocal: boolean, conflictRemote?: boolean, suggestion?: string }.
- EditParticipantState: { initialNickname: string, currentNickname: string, isDirty: boolean, isSubmitting: boolean }.

## 6. Zarządzanie stanem

Stan widoku zarządza: listą uczestników, licznikami, flagami uprawnień, blokadą i stanami formularza oraz modalów.
Zalecany jest custom hook useParticipants(settlementId) zwracający: listę, pagination, loading, error, oraz mutacje add/update/remove z wewnętrznym odświeżeniem i stabilnym sortowaniem.
Dodatkowy hook useNicknameValidation(existingNicknames) dostarcza sprawdzanie patternu, długości, lokalnej kolizji i generowanie sugestii sufiksu deterministycznie.

## 7. Integracja API

- GET /settlements/{settlement_id}/participants z opcjonalnym page/limit do pobrania listy i total count.
- POST /settlements/{settlement_id}/participants do dodania uczestnika, kody: 201, 400, 401, 403, 404, 409, 422.
- PUT /settlements/{settlement_id}/participants/{id} do aktualizacji nicka, kody: 200, 400, 401, 403, 404, 409, 422.
- DELETE /settlements/{settlement_id}/participants/{id} do usunięcia, kody: 204, 401, 403, 404, 422.
  Nagłówki ETag i Last-Modified można respektować w cache warunkowym, lecz w widoku mutacje powinny zawsze skutkować odświeżeniem listy z pominięciem cache.

## 8. Interakcje użytkownika

- Dodanie uczestnika: wpisanie poprawnego nicka, informacja o kolizji w trakcie, ewentualna sugestia sufiksu, submit tworzy rekord i resetuje formularz.
- Edycja uczestnika: otwarcie modalu, zmiana nicka z walidacją jak przy tworzeniu, zapis aktualizuje listę i zamyka modal.
- Usunięcie uczestnika: potwierdzenie w modalu, sukces usuwa wiersz z listy, błędy 422 prezentują przyczynę w komunikacie.
- Blokada: gdy status closed lub istnieją wydatki, akcje tworzenia/edycji/usuwania są disabled, a LockBanner wyjaśnia powód.
- Puste stany: przy braku uczestników prezentowane jest CTA oraz wytyczne co dalej, zgodnie z paternami UX mobile-first.

## 9. Warunki i walidacja

- Pattern: tylko a–z, 0–9, „-”, „\_”, długość 3–30, aria-invalid i komunikaty walidacyjne po polsku.
- Unikalność: case-insensitive w obrębie rozliczenia, wstępnie lokalnie na podstawie załadowanej listy, ostatecznie 409 z API obsłużone w UI.
- Limit: do 10 uczestników, formularz disabled powyżej limitu, a API zwraca 422 z adekwatnym komunikatem.
- Uprawnienia: tylko właściciel może edytować, UI ukrywa/wyłącza akcje dla niewłaściciela, API egzekwuje 403.
- Status: operacje modyfikujące dozwolone tylko przy statusie open, API zwraca 422 dla closed, UI prezentuje LockBanner.
- Blokada po pierwszym wydatku: UI wyłącza mutacje i pokazuje banner informacyjny, aby zachować spójność procesową.

## 10. Obsługa błędów

- 400 walidacja: pokaż komunikaty pod polem nickname i na toście globalnym dla błędów formularza.
- 401/403: komunikat o braku uprawnień i tryb tylko do odczytu w widoku.
- 404: informacja o braku rozliczenia/uczestnika, z propozycją powrotu do listy rozliczeń.
- 409: kolizja nicka, wskaż konflikt i zaproponuj wariant z sufiksem zgodnie z heurystyką.
- 422: closed settlement lub reguły domenowe, wyświetl komunikat opisowy; przy DELETE możliwa informacja o powiązanych wydatkach.
- 500: komunikat ogólny o błędzie serwera i opcja ponów próbę, z logowaniem diagnostycznym po stronie klienta.

## 11. Kroki implementacji

1. Utwórz ParticipantsViewShell z routingiem /settlements/:id?step=participants oraz pobieraniem listy i metadanych rozliczenia potrzebnych do isLocked/lockReason.
2. Zaimplementuj hook useParticipants(settlementId) z metodami fetchList, add, update, remove, oraz wsparciem pagination i stabilnym odświeżaniem.
3. Dodaj ParticipantForm z walidacją patternu/długości, lokalną unikalnością i sugestią sufiksu oraz obsługą kodów 409/422.
4. Zbuduj ParticipantsList z wierszami, badge „Właściciel”, akcjami Edytuj/Usuń i stanami disabled w zależności od uprawnień i blokady.
5. Zaimplementuj EditParticipantModal z PUT i walidacją jak przy tworzeniu, z obsługą 409/422 i zamykaniem po sukcesie.
6. Zaimplementuj DeleteParticipantConfirm z DELETE i obsługą 422 (powiązane wydatki, closed) oraz odświeżaniem listy.
7. Dodaj LockBanner i warunki wyświetlania przy statusie closed lub po pierwszym wydatku, oraz EmptyState dla participantsCount=0.
8. Zadbaj o dostępność: aria-invalid, aria-live dla kolizji/sugestii, duże pola dotykowe i klawiaturę numeryczną gdzie właściwe dla mobile.
9. Zaimplementuj komunikaty błędów po polsku oraz testy UI walidacji, uprawnień i stanów blokady, łącznie z ścieżkami 401/403/404/409/422.
10. Dodaj stabilne sortowanie listy i niezmienność kolejności w obrębie grup po filtrach, przygotowując konsystentne doświadczenie UX.
11. Przeprowadź testy integracyjne flow: dodanie 10 uczestników, kolizje, edycja, usunięcie, blokada po pierwszym wydatku, status closed, oraz odczyt archiwalny.
