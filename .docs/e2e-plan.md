# Plan Implementacji Testów E2E - FlexiSplit

> **Status**: Dokument planistyczny - definiuje strukturę implementacji testów E2E opartych na wzorcu Page Object Model dla aplikacji FlexiSplit.

## 1. Przegląd Projektu

### Cel
Implementacja kompletnego zestawu testów E2E pokrywających wszystkie "zielone ścieżki" (happy paths) aplikacji FlexiSplit zgodnie z PRD, wykorzystując wzorzec Page Object Model (POM) z Playwright.

### Zakres
- **Dodanie atrybutów `data-testid`** do ~250 elementów interaktywnych
- **Stworzenie 12 klas Page Object Model**
- **Definicja 6 głównych scenariuszy testowych** (zielone ścieżki)

---

## 2. Przepływy Aplikacji (User Flows)

### 2.1 Flow Autentykacji
**Ścieżka**: `/auth/register` → `/auth/login` → `/settlements`

**Kroki**:
1. Użytkownik wchodzi na stronę rejestracji
2. Wypełnia formularz (email, hasło, potwierdzenie hasła)
3. Klika "Zarejestruj się"
4. System automatycznie loguje i przekierowuje do `/settlements`
5. Alternatywnie: użytkownik loguje się przez `/auth/login`

**Komponenty**: `RegisterForm`, `LoginForm`, `LogoutButton`

---

### 2.2 Flow Tworzenia Rozliczenia
**Ścieżka**: `/settlements` → Dialog → `/settlements/{id}`

**Kroki**:
1. Użytkownik klika "Nowe rozliczenie"
2. Wypełnia tytuł rozliczenia
3. Klika "Utwórz"
4. System przekierowuje do szczegółów rozliczenia

**Komponenty**: `SettlementsPage`, `NewSettlementDialog`, `SettlementDetailsPage`

---

### 2.3 Flow Zarządzania Uczestnikami
**Ścieżka**: `/settlements/{id}?step=participants`

**Kroki**:
1. Użytkownik jest na kroku "Uczestnicy"
2. Wpisuje nickname w formularz
3. Klika "Dodaj uczestnika"
4. Uczestnik pojawia się na liście
5. Powtarza dla wielu uczestników (max 10)

**Komponenty**: `ParticipantForm`, `ParticipantsList`, `DeleteParticipantConfirm`

---

### 2.4 Flow Zarządzania Wydatkami
**Ścieżka**: `/settlements/{id}?step=expenses` → `/settlements/{id}/expenses/new`

**Kroki**:
1. Użytkownik przechodzi do kroku "Koszty"
2. Klika "Dodaj wydatek"
3. Wypełnia formularz:
   - Kwota
   - Płacący (wybór z listy uczestników)
   - Uczestnicy w podziale (checkboxy)
   - Data
   - Opis (opcjonalny)
4. Klika "Zapisz"
5. System przekierowuje do listy wydatków

**Komponenty**: `ExpenseForm`, `AmountInput`, `PayerSelect`, `ParticipantsChecklist`, `DateInput`, `DescriptionField`, `ExpensesView`

---

### 2.5 Flow Zamknięcia Rozliczenia
**Ścieżka**: `/settlements/{id}?step=summary` → Modal → Status closed

**Kroki**:
1. Użytkownik przechodzi do kroku "Podsumowanie"
2. Przegląda salda uczestników
3. Przegląda listę przelewów
4. Klika "Zamknij rozliczenie"
5. Potwierdza w modalu
6. System zamyka rozliczenie i wyświetla podsumowanie
7. Użytkownik może skopiować podsumowanie do schowka

**Komponenty**: `SummaryPage`, `BalancesSection`, `TransfersSection`, `ConfirmCloseModal`, `CopySummaryButton`

---

### 2.6 Flow Archiwum
**Ścieżka**: `/settlements?tab=archive`

**Kroki**:
1. Użytkownik przechodzi do zakładki "Archiwum"
2. Widzi listę zamkniętych rozliczeń
3. Klika na rozliczenie → przegląda szczegóły (read-only)
4. Kopiuje podsumowanie
5. Usuwa rozliczenie z archiwum (opcjonalnie)

**Komponenty**: `SettlementsPage`, `SettlementCard`, `ConfirmDeleteDialog`

---

## 3. Struktura Atrybutów `data-testid`

### 3.1 Komponenty Autentykacji

#### ✅ `src/components/auth/LoginForm.tsx` (ZROBIONE)
```
data-testid="form-login"                 - formularz logowania
data-testid="input-email"                - pole email
data-testid="input-password"             - pole hasło
data-testid="button-submit"              - przycisk "Zaloguj się"
data-testid="alert-error"                - alert błędu
data-testid="error-email"                - błąd walidacji email
data-testid="error-password"             - błąd walidacji hasła
data-testid="link-forgot-password"       - link do resetu hasła
data-testid="link-register"              - link do rejestracji
```

#### ✅ `src/components/auth/RegisterForm.tsx` (ZROBIONE)
```
data-testid="form-register"              - formularz rejestracji
data-testid="input-email"                - pole email
data-testid="input-password"             - pole hasło
data-testid="input-confirm-password"     - pole potwierdzenia hasła
data-testid="button-submit"              - przycisk "Zarejestruj się"
data-testid="alert-success"              - alert sukcesu
data-testid="alert-error"                - alert błędu
data-testid="text-countdown"             - countdown do przekierowania
data-testid="button-skip-countdown"      - przycisk pominięcia countdown
data-testid="link-login"                 - link do logowania
data-testid="error-email"                - błąd walidacji email
data-testid="error-password"             - błąd walidacji hasła
data-testid="error-confirm-password"     - błąd walidacji potwierdzenia
```

#### ✅ `src/components/auth/ForgotPasswordForm.tsx` (ZROBIONE)
```
data-testid="form-forgot-password"       - formularz resetu hasła
data-testid="input-email"                - pole email
data-testid="button-submit"              - przycisk "Wyślij link"
data-testid="alert-success"              - alert sukcesu
data-testid="alert-error"                - alert błędu
data-testid="error-email"                - błąd walidacji email
data-testid="link-login"                 - link do logowania
data-testid="link-register"              - link do rejestracji
```

#### ✅ `src/components/auth/LogoutButton.tsx` (ZROBIONE)
```
data-testid="button-logout"              - przycisk wylogowania
```

---

### 3.2 Komponenty Rozliczeń

#### ✅ `src/components/SettlementsPage.tsx` (ZROBIONE)
```
# Główny kontener już ma strukturę, dzieci poniżej
data-testid="page-settlements"              - strona rozliczeń (kontener główny)
```

#### ✅ `src/components/TabsSegment.tsx` (ZROBIONE)
```
data-testid="tab-active"                 - zakładka "Aktywne"
data-testid="tab-archive"                - zakładka "Archiwum"
```

#### ✅ `src/components/HeaderBar.tsx` (ZROBIONE)
```
data-testid="text-active-count"          - licznik aktywnych rozliczeń
```

#### ✅ `src/components/NewSettlementButton.tsx` (ZROBIONE)
```
data-testid="button-new-settlement"      - przycisk "Nowe rozliczenie"
```

#### ✅ `src/components/NewSettlementDialog.tsx` (ZROBIONE)
```
data-testid="dialog-new-settlement"      - dialog tworzenia rozliczenia
data-testid="input-settlement-title"     - pole tytułu
data-testid="text-char-count"            - licznik znaków
data-testid="error-message"              - komunikat błędu
data-testid="button-cancel"              - przycisk anuluj
data-testid="button-create"              - przycisk utwórz
```

#### ✅ `src/components/SettlementsList.tsx` (ZROBIONE)
```
data-testid="list-settlements"           - lista rozliczeń
data-testid="button-load-more"           - przycisk "Załaduj więcej"
```

#### ✅ `src/components/SettlementCard.tsx` (ZROBIONE)
```
data-testid="card-settlement-{id}"       - karta rozliczenia (dynamiczne id)
data-testid="badge-status"               - badge statusu
data-testid="text-participants-count"    - liczba uczestników
data-testid="text-expenses-count"        - liczba wydatków
data-testid="text-total-amount"          - suma wydatków
data-testid="text-created-date"          - data utworzenia
data-testid="text-closed-date"           - data zamknięcia
data-testid="button-view"                - przycisk "Zobacz"
```

#### ✅ `src/components/CardActionsMenu.tsx` (ZROBIONE)
```
data-testid="button-menu-actions"        - przycisk menu akcji
data-testid="menu-item-delete"           - opcja "Usuń"
```

#### ✅ `src/components/ConfirmDeleteDialog.tsx` (ZROBIONE)
```
data-testid="dialog-confirm-delete"      - dialog potwierdzenia usunięcia
data-testid="text-settlement-title"      - tytuł rozliczenia
data-testid="button-cancel"              - przycisk anuluj
data-testid="button-delete"              - przycisk usuń
data-testid="error-message"              - komunikat błędu
```

#### ✅ `src/components/SettlementHeader.tsx` (ZROBIONE)
```
data-testid="heading-settlement-title"   - nagłówek tytułu (tryb odczytu)
data-testid="input-settlement-title"     - pole edycji tytułu
data-testid="button-edit-title"          - przycisk edycji
data-testid="button-save-title"          - przycisk zapisu
data-testid="button-cancel-edit"         - przycisk anulowania edycji
data-testid="badge-status"               - badge statusu
data-testid="text-participants-count"    - liczba uczestników
data-testid="text-expenses-count"        - liczba wydatków
data-testid="error-validation"           - błąd walidacji
data-testid="error-api"                  - błąd API
```

#### ✅ `src/components/SettlementStepper.tsx` (ZROBIONE)
```
data-testid="nav-stepper"                - nawigacja kroków
data-testid="button-step-participants"   - przycisk kroku "Uczestnicy"
data-testid="button-step-expenses"       - przycisk kroku "Koszty"
data-testid="button-step-summary"        - przycisk kroku "Podsumowanie"
```

#### ✅ `src/components/SettlementDetailsPage.tsx` (ZROBIONE)
```
data-testid="page-settlement-details"    - strona szczegółów rozliczenia
data-testid="section-step-content"       - sekcja zawartości kroku
```

#### ✅ `src/components/ReadOnlyBanner.tsx` (ZROBIONE)
```
data-testid="banner-readonly"            - banner "Tylko do odczytu"
data-testid="heading-readonly-message"   - nagłówek komunikatu
data-testid="text-readonly-description"  - opis blokady
data-testid="button-dismiss-readonly"    - przycisk zamknięcia bannera
```

#### ✅ `src/components/EmptyState.tsx` (ZROBIONE)
```
data-testid="empty-state-container"      - kontener pustego stanu
data-testid="icon-empty-active"          - ikona dla aktywnych
data-testid="icon-empty-archive"         - ikona dla archiwum
data-testid="heading-empty-state"        - nagłówek pustego stanu
data-testid="text-empty-description"     - opis pustego stanu
data-testid="button-create-first-settlement"  - przycisk tworzenia pierwszego rozliczenia
```

---

### 3.3 Komponenty Uczestników

#### ⏳ `src/components/ParticipantForm.tsx` (TODO)
```
data-testid="form-participant"           - formularz uczestnika
data-testid="input-nickname"             - pole nickname
data-testid="button-add-participant"     - przycisk "Dodaj"
data-testid="text-validation-error"      - błąd walidacji
data-testid="text-helper-text"           - tekst pomocniczy
data-testid="text-nickname-suggestion"   - sugestia nickname (przy kolizji)
```

#### ⏳ `src/components/ParticipantsList.tsx` (TODO)
```
data-testid="list-participants"          - lista uczestników
data-testid="heading-participants"       - nagłówek z licznikiem
data-testid="badge-read-only"            - badge "tylko odczyt"
data-testid="participant-item-{id}"      - element uczestnika (dynamiczne id)
data-testid="text-participant-nickname"  - nickname uczestnika
data-testid="badge-owner"                - badge "Właściciel"
data-testid="button-edit-participant"    - przycisk edycji
data-testid="button-delete-participant"  - przycisk usunięcia
data-testid="text-locked-message"        - komunikat blokady
data-testid="text-lock-banner"           - banner blokady
```

#### ⏳ `src/components/DeleteParticipantConfirm.tsx` (TODO)
```
data-testid="dialog-confirm-delete-participant"  - dialog potwierdzenia usunięcia
data-testid="text-participant-nickname"          - nickname uczestnika
data-testid="text-owner-warning"                 - ostrzeżenie właściciela
data-testid="button-cancel"                      - przycisk anuluj
data-testid="button-delete"                      - przycisk usuń
data-testid="error-message"                      - komunikat błędu
```

---

### 3.4 Komponenty Wydatków

#### ⏳ `src/components/expenses/ExpenseForm.tsx` (TODO)
```
data-testid="form-expense"               - formularz wydatku
data-testid="card-expense-form"          - karta formularza
data-testid="heading-title"              - tytuł formularza
data-testid="field-amount"               - sekcja kwoty
data-testid="field-payer"                - sekcja płacącego
data-testid="field-participants"         - sekcja uczestników
data-testid="field-date"                 - sekcja daty
data-testid="field-description"          - sekcja opisu
data-testid="component-share-preview"    - podgląd podziału
data-testid="error-banner"               - banner błędu API
data-testid="button-save"                - przycisk "Zapisz"
data-testid="button-cancel"              - przycisk "Anuluj"
```

#### ⏳ `src/components/expenses/AmountInput.tsx` (TODO)
```
data-testid="field-amount"               - pole kwoty (kontener)
data-testid="input-amount"               - input kwoty
data-testid="text-currency"              - wyświetlenie waluty
data-testid="error-amount"               - błąd walidacji
data-testid="text-helper"                - tekst pomocniczy
```

#### ⏳ `src/components/expenses/PayerSelect.tsx` (TODO)
```
data-testid="field-payer"                - pole płacącego (kontener)
data-testid="select-payer"               - select płacącego
data-testid="error-payer"                - błąd walidacji
data-testid="text-helper"                - tekst pomocniczy
data-testid="select-item-{id}"           - opcja uczestnika (dynamiczne id)
```

#### ⏳ `src/components/expenses/ParticipantsChecklist.tsx` (TODO)
```
data-testid="field-participants"         - pole uczestników (kontener)
data-testid="button-select-all"          - przycisk "Zaznacz wszystkich"
data-testid="button-deselect-all"        - przycisk "Odznacz wszystkich"
data-testid="group-participants"         - grupa checkboxów
data-testid="checkbox-participant-{id}"  - checkbox uczestnika (dynamiczne id)
data-testid="label-participant-{id}"     - label uczestnika (dynamiczne id)
data-testid="text-selected-count"        - licznik zaznaczonych
data-testid="error-participants"         - błąd walidacji
data-testid="text-helper"                - tekst pomocniczy
```

#### ⏳ `src/components/expenses/DateInput.tsx` (TODO)
```
data-testid="field-date"                 - pole daty (kontener)
data-testid="input-date"                 - input daty
data-testid="error-date"                 - błąd walidacji
data-testid="text-helper"                - tekst pomocniczy
```

#### ⏳ `src/components/expenses/DescriptionField.tsx` (TODO)
```
data-testid="field-description"          - pole opisu (kontener)
data-testid="textarea-description"       - textarea opisu
data-testid="text-char-count"            - licznik znaków
data-testid="error-description"          - błąd walidacji
data-testid="text-helper"                - tekst pomocniczy
```

#### ⏳ `src/components/expenses/SharePreview.tsx` (TODO)
```
data-testid="component-share-preview"    - podgląd podziału
data-testid="text-share-info"            - informacja o podziale
```

#### ⏳ `src/components/expenses/ExpensesView.tsx` (TODO)
```
data-testid="tabs-expenses-view"         - zakładki widoku wydatków
data-testid="tab-participants"           - zakładka uczestników
data-testid="tab-expenses"               - zakładka wydatków
data-testid="filter-bar"                 - pasek filtrów
data-testid="list-expenses"              - lista wydatków
data-testid="button-load-more"           - przycisk "Załaduj więcej"
data-testid="empty-state"                - pusty stan
```

#### ⏳ `src/components/expenses/ExpensesFilterBar.tsx` (TODO)
```
data-testid="filter-bar"                 - pasek filtrów
data-testid="select-filter-participant"  - select filtra uczestnika
data-testid="button-clear-filter"        - przycisk czyszczenia filtra
data-testid="text-filter-info"           - info o aktywnym filtrze
data-testid="select-item-{id}"           - opcja uczestnika (dynamiczne id)
```

#### ⏳ `src/components/expenses/ExpensesExpenseCard.tsx` (TODO)
```
data-testid="card-expense-{id}"          - karta wydatku (dynamiczne id)
data-testid="text-payer-nickname"        - nickname płacącego
data-testid="text-amount"                - kwota
data-testid="text-share-count"           - liczba uczestników w podziale
data-testid="text-description"           - opis wydatku
data-testid="text-participants"          - lista uczestników
data-testid="button-menu-actions"        - przycisk menu akcji
data-testid="menu-item-edit"             - opcja "Edytuj"
data-testid="menu-item-delete"           - opcja "Usuń"
```

#### ⏳ `src/components/expenses/ExpensesDeleteConfirmDialog.tsx` (TODO)
```
data-testid="dialog-confirm-delete-expense"  - dialog potwierdzenia usunięcia
data-testid="text-expense-description"       - opis wydatku
data-testid="text-amount"                    - kwota
data-testid="button-cancel"                  - przycisk anuluj
data-testid="button-delete"                  - przycisk usuń
```

---

### 3.5 Komponenty Podsumowania

#### ⏳ `src/components/SummaryPage.tsx` (TODO)
```
data-testid="page-summary"               - strona podsumowania
data-testid="section-balances"           - sekcja sald
data-testid="section-transfers"          - sekcja przelewów
data-testid="button-close-settlement"    - przycisk zamknięcia
```

#### ⏳ `src/components/BalancesSection.tsx` (TODO)
```
data-testid="section-balances"           - sekcja sald
data-testid="balance-item-{id}"          - element salda (dynamiczne id)
data-testid="text-balance-{id}"          - wartość salda (dynamiczne id)
```

#### ⏳ `src/components/TransfersSection.tsx` (TODO)
```
data-testid="section-transfers"          - sekcja przelewów
data-testid="transfer-item-{index}"      - element przelewu (dynamiczny index)
data-testid="button-copy-transfer-{index}"  - przycisk kopiowania (dynamiczny index)
data-testid="text-transfer-info"         - info o przelewie
data-testid="text-summary-note"          - notatka podsumowania
```

#### ⏳ `src/components/ConfirmCloseModal.tsx` (TODO)
```
data-testid="dialog-confirm-close"       - dialog zamknięcia rozliczenia
data-testid="heading-title"              - tytuł dialogu
data-testid="text-settlement-title"      - tytuł rozliczenia
data-testid="text-expense-count"         - liczba wydatków
data-testid="text-created-date"          - data utworzenia
data-testid="box-warning"                - box ostrzeżenia
data-testid="error-message"              - komunikat błędu
data-testid="button-cancel"              - przycisk anuluj
data-testid="button-close"               - przycisk zamknij
```

#### ⏳ `src/components/CopySummaryButton.tsx` (TODO)
```
data-testid="button-copy-summary"        - przycisk kopiowania podsumowania
```

#### ⏳ `src/components/SummaryHeader.tsx` (TODO)
```
data-testid="header-summary"             - nagłówek podsumowania
```

---

## 4. Struktura Page Object Models

### 4.1 Hierarchia POM

```
tests/e2e/pages/
├── BasePage.ts (✅ istnieje)
├── auth/
│   ├── LoginPage.ts
│   ├── RegisterPage.ts
│   └── ForgotPasswordPage.ts
├── settlements/
│   ├── SettlementsListPage.ts
│   ├── SettlementDetailsPage.ts
│   └── components/
│       ├── NewSettlementDialog.ts
│       ├── SettlementCard.ts
│       └── ConfirmDeleteDialog.ts
├── participants/
│   ├── ParticipantsPage.ts
│   └── components/
│       ├── ParticipantForm.ts
│       ├── ParticipantsList.ts
│       └── DeleteParticipantDialog.ts
├── expenses/
│   ├── ExpensesPage.ts
│   ├── ExpenseFormPage.ts
│   └── components/
│       ├── ExpensesList.ts
│       ├── ExpenseCard.ts
│       ├── ExpensesFilterBar.ts
│       └── ExpenseFormComponents.ts
└── summary/
    ├── SummaryPage.ts
    └── components/
        ├── BalancesSection.ts
        ├── TransfersSection.ts
        ├── ConfirmCloseDialog.ts
        └── CopySummaryButton.ts
```

---

### 4.2 Definicje Page Object Models

#### 4.2.1 Auth Pages

##### `tests/e2e/pages/auth/LoginPage.ts`
```typescript
export class LoginPage extends BasePage {
  // Locators
  readonly formLogin: Locator
  readonly inputEmail: Locator
  readonly inputPassword: Locator
  readonly buttonSubmit: Locator
  readonly alertError: Locator
  readonly errorEmail: Locator
  readonly errorPassword: Locator
  readonly linkForgotPassword: Locator
  readonly linkRegister: Locator
  
  // Actions
  async goto(): Promise<void>
  async fillEmail(email: string): Promise<void>
  async fillPassword(password: string): Promise<void>
  async submit(): Promise<void>
  async login(email: string, password: string): Promise<void>
  async clickForgotPassword(): Promise<void>
  async clickRegister(): Promise<void>
  
  // Assertions helpers
  async getErrorMessage(): Promise<string | null>
  async hasFieldError(field: 'email' | 'password'): Promise<boolean>
}
```

##### `tests/e2e/pages/auth/RegisterPage.ts`
```typescript
export class RegisterPage extends BasePage {
  // Locators
  readonly formRegister: Locator
  readonly inputEmail: Locator
  readonly inputPassword: Locator
  readonly inputConfirmPassword: Locator
  readonly buttonSubmit: Locator
  readonly alertSuccess: Locator
  readonly alertError: Locator
  readonly textCountdown: Locator
  readonly buttonSkipCountdown: Locator
  readonly linkLogin: Locator
  
  // Actions
  async goto(): Promise<void>
  async fillEmail(email: string): Promise<void>
  async fillPassword(password: string): Promise<void>
  async fillConfirmPassword(password: string): Promise<void>
  async submit(): Promise<void>
  async register(email: string, password: string): Promise<void>
  async skipCountdown(): Promise<void>
  async clickLogin(): Promise<void>
  
  // Assertions helpers
  async isSuccessVisible(): Promise<boolean>
  async getCountdownValue(): Promise<number>
}
```

---

#### 4.2.2 Settlements Pages

##### `tests/e2e/pages/settlements/SettlementsListPage.ts`
```typescript
export class SettlementsListPage extends BasePage {
  // Locators
  readonly tabActive: Locator
  readonly tabArchive: Locator
  readonly textActiveCount: Locator
  readonly buttonNewSettlement: Locator
  readonly listSettlements: Locator
  readonly buttonLoadMore: Locator
  
  // Actions
  async goto(): Promise<void>
  async switchToTab(tab: 'active' | 'archive'): Promise<void>
  async clickNewSettlement(): Promise<void>
  async getSettlementCard(id: string): SettlementCard
  async getSettlementsCount(): Promise<number>
  async loadMore(): Promise<void>
  
  // Assertions helpers
  async getActiveCount(): Promise<string>
  async hasLoadMoreButton(): Promise<boolean>
}
```

##### `tests/e2e/pages/settlements/SettlementDetailsPage.ts`
```typescript
export class SettlementDetailsPage extends BasePage {
  // Locators
  readonly headingSettlementTitle: Locator
  readonly inputSettlementTitle: Locator
  readonly buttonEditTitle: Locator
  readonly buttonSaveTitle: Locator
  readonly buttonCancelEdit: Locator
  readonly badgeStatus: Locator
  readonly textParticipantsCount: Locator
  readonly textExpensesCount: Locator
  readonly navStepper: Locator
  readonly buttonStepParticipants: Locator
  readonly buttonStepExpenses: Locator
  readonly buttonStepSummary: Locator
  
  // Actions
  async goto(settlementId: string): Promise<void>
  async editTitle(newTitle: string): Promise<void>
  async goToStep(step: 'participants' | 'expenses' | 'summary'): Promise<void>
  
  // Assertions helpers
  async getTitle(): Promise<string>
  async getStatus(): Promise<string>
  async getParticipantsCount(): Promise<number>
  async getExpensesCount(): Promise<number>
  async isReadOnly(): Promise<boolean>
}
```

##### `tests/e2e/pages/settlements/components/NewSettlementDialog.ts`
```typescript
export class NewSettlementDialog {
  // Locators
  readonly dialog: Locator
  readonly inputSettlementTitle: Locator
  readonly textCharCount: Locator
  readonly errorMessage: Locator
  readonly buttonCancel: Locator
  readonly buttonCreate: Locator
  
  // Actions
  async fillTitle(title: string): Promise<void>
  async submit(): Promise<void>
  async cancel(): Promise<void>
  async createSettlement(title: string): Promise<void>
  
  // Assertions helpers
  async isOpen(): Promise<boolean>
  async getCharCount(): Promise<string>
  async hasError(): Promise<boolean>
}
```

##### `tests/e2e/pages/settlements/components/SettlementCard.ts`
```typescript
export class SettlementCard {
  // Locators
  readonly card: Locator
  readonly badgeStatus: Locator
  readonly textParticipantsCount: Locator
  readonly textExpensesCount: Locator
  readonly textTotalAmount: Locator
  readonly textCreatedDate: Locator
  readonly textClosedDate: Locator
  readonly buttonView: Locator
  readonly buttonMenuActions: Locator
  
  // Actions
  async click(): Promise<void>
  async viewDetails(): Promise<void>
  async openMenu(): Promise<void>
  async delete(): Promise<void>
  
  // Assertions helpers
  async getTitle(): Promise<string>
  async getStatus(): Promise<string>
  async getParticipantsCount(): Promise<number>
}
```

---

#### 4.2.3 Participants Pages

##### `tests/e2e/pages/participants/ParticipantsPage.ts`
```typescript
export class ParticipantsPage extends BasePage {
  // Locators
  readonly formParticipant: Locator
  readonly inputNickname: Locator
  readonly buttonAddParticipant: Locator
  readonly textValidationError: Locator
  readonly textNicknameSuggestion: Locator
  readonly listParticipants: Locator
  readonly headingParticipants: Locator
  
  // Actions
  async fillNickname(nickname: string): Promise<void>
  async submitParticipant(): Promise<void>
  async addParticipant(nickname: string): Promise<void>
  async getParticipantItem(id: string): ParticipantItem
  async getParticipantsCount(): Promise<number>
  
  // Assertions helpers
  async hasValidationError(): Promise<boolean>
  async getSuggestion(): Promise<string | null>
}
```

##### `tests/e2e/pages/participants/components/ParticipantsList.ts`
```typescript
export class ParticipantItem {
  // Locators
  readonly item: Locator
  readonly textParticipantNickname: Locator
  readonly badgeOwner: Locator
  readonly buttonEdit: Locator
  readonly buttonDelete: Locator
  
  // Actions
  async getNickname(): Promise<string>
  async isOwner(): Promise<boolean>
  async edit(): Promise<void>
  async delete(): Promise<void>
}
```

---

#### 4.2.4 Expenses Pages

##### `tests/e2e/pages/expenses/ExpenseFormPage.ts`
```typescript
export class ExpenseFormPage extends BasePage {
  // Locators
  readonly formExpense: Locator
  readonly inputAmount: Locator
  readonly selectPayer: Locator
  readonly groupParticipants: Locator
  readonly buttonSelectAll: Locator
  readonly buttonDeselectAll: Locator
  readonly inputDate: Locator
  readonly textareaDescription: Locator
  readonly componentSharePreview: Locator
  readonly buttonSave: Locator
  readonly buttonCancel: Locator
  
  // Actions
  async goto(settlementId: string, mode: 'new' | 'edit', expenseId?: string): Promise<void>
  async fillAmount(amount: string): Promise<void>
  async selectPayer(participantId: string): Promise<void>
  async toggleParticipant(participantId: string): Promise<void>
  async selectAllParticipants(): Promise<void>
  async deselectAllParticipants(): Promise<void>
  async fillDate(date: string): Promise<void>
  async fillDescription(description: string): Promise<void>
  async submit(): Promise<void>
  async cancel(): Promise<void>
  
  // Complex action
  async createExpense(data: {
    amount: string
    payerId: string
    participantIds: string[]
    date?: string
    description?: string
  }): Promise<void>
  
  // Assertions helpers
  async getSharePreview(): Promise<string>
  async isFormValid(): Promise<boolean>
}
```

##### `tests/e2e/pages/expenses/ExpensesPage.ts`
```typescript
export class ExpensesPage extends BasePage {
  // Locators
  readonly tabsExpensesView: Locator
  readonly tabParticipants: Locator
  readonly tabExpenses: Locator
  readonly filterBar: Locator
  readonly selectFilterParticipant: Locator
  readonly buttonClearFilter: Locator
  readonly listExpenses: Locator
  readonly buttonLoadMore: Locator
  
  // Actions
  async switchToTab(tab: 'participants' | 'expenses'): Promise<void>
  async filterByParticipant(participantId: string): Promise<void>
  async clearFilter(): Promise<void>
  async getExpenseCard(id: string): ExpenseCard
  async getExpensesCount(): Promise<number>
  async loadMore(): Promise<void>
}
```

##### `tests/e2e/pages/expenses/components/ExpenseCard.ts`
```typescript
export class ExpenseCard {
  // Locators
  readonly card: Locator
  readonly textPayerNickname: Locator
  readonly textAmount: Locator
  readonly textShareCount: Locator
  readonly textDescription: Locator
  readonly textParticipants: Locator
  readonly buttonMenuActions: Locator
  
  // Actions
  async click(): Promise<void>
  async openMenu(): Promise<void>
  async edit(): Promise<void>
  async delete(): Promise<void>
  
  // Assertions helpers
  async getAmount(): Promise<string>
  async getPayerNickname(): Promise<string>
  async getDescription(): Promise<string>
}
```

---

#### 4.2.5 Summary Pages

##### `tests/e2e/pages/summary/SummaryPage.ts`
```typescript
export class SummaryPage extends BasePage {
  // Locators
  readonly pageSummary: Locator
  readonly sectionBalances: Locator
  readonly sectionTransfers: Locator
  readonly buttonCloseSettlement: Locator
  readonly buttonCopySummary: Locator
  
  // Actions
  async getBalanceItem(participantId: string): BalanceItem
  async getTransferItem(index: number): TransferItem
  async getBalancesCount(): Promise<number>
  async getTransfersCount(): Promise<number>
  async closeSettlement(): Promise<void>
  async copySummary(): Promise<void>
  
  // Assertions helpers
  async isSettlementOpen(): Promise<boolean>
  async canCloseSettlement(): Promise<boolean>
}
```

##### `tests/e2e/pages/summary/components/BalancesSection.ts`
```typescript
export class BalanceItem {
  // Locators
  readonly item: Locator
  readonly textBalance: Locator
  
  // Assertions helpers
  async getParticipantName(): Promise<string>
  async getBalance(): Promise<string>
  async isCreditor(): Promise<boolean>
  async isDebtor(): Promise<boolean>
}
```

##### `tests/e2e/pages/summary/components/TransfersSection.ts`
```typescript
export class TransferItem {
  // Locators
  readonly item: Locator
  readonly textTransferInfo: Locator
  readonly buttonCopyTransfer: Locator
  
  // Actions
  async copyTransfer(): Promise<void>
  
  // Assertions helpers
  async getTransferInfo(): Promise<string>
  async getFromParticipant(): Promise<string>
  async getToParticipant(): Promise<string>
  async getAmount(): Promise<string>
}
```

##### `tests/e2e/pages/summary/components/ConfirmCloseDialog.ts`
```typescript
export class ConfirmCloseDialog {
  // Locators
  readonly dialog: Locator
  readonly textSettlementTitle: Locator
  readonly textExpenseCount: Locator
  readonly textCreatedDate: Locator
  readonly boxWarning: Locator
  readonly buttonCancel: Locator
  readonly buttonClose: Locator
  
  // Actions
  async confirm(): Promise<void>
  async cancel(): Promise<void>
  
  // Assertions helpers
  async isOpen(): Promise<boolean>
  async getSettlementTitle(): Promise<string>
  async getExpenseCount(): Promise<number>
}
```

---

## 5. Scenariusze Testowe (Zielone Ścieżki)

### 5.1 Scenariusz: Kompletny Flow Użytkownika

**Plik**: `tests/e2e/specs/complete-user-journey.spec.ts`

**Przebieg**:
1. **Rejestracja**
   - Otwarcie strony rejestracji
   - Wypełnienie formularza (email: `test-${timestamp}@example.com`, hasło: `TestPass123!`)
   - Kliknięcie "Zarejestruj się"
   - Weryfikacja przekierowania do `/settlements`

2. **Utworzenie rozliczenia**
   - Weryfikacja pustego stanu (brak rozliczeń)
   - Kliknięcie "Nowe rozliczenie"
   - Wypełnienie tytułu: "Wycieczka do Warszawy"
   - Kliknięcie "Utwórz"
   - Weryfikacja przekierowania do `/settlements/{id}`

3. **Dodanie uczestników**
   - Weryfikacja kroku "Uczestnicy"
   - Dodanie uczestników:
     - "jan_kowalski"
     - "anna_nowak"
     - "piotr_wisniewski"
   - Weryfikacja liczby uczestników: 3
   - Weryfikacja badge "Właściciel" przy właścicielu

4. **Dodanie wydatków**
   - Przejście do kroku "Koszty"
   - Dodanie wydatku #1:
     - Kwota: 150.00 PLN
     - Płacący: jan_kowalski
     - Uczestnicy: wszyscy
     - Data: dzisiaj
     - Opis: "Paliwo"
   - Dodanie wydatku #2:
     - Kwota: 200.50 PLN
     - Płacący: anna_nowak
     - Uczestnicy: wszyscy
     - Data: dzisiaj
     - Opis: "Noclegi"
   - Dodanie wydatku #3:
     - Kwota: 85.00 PLN
     - Płacący: piotr_wisniewski
     - Uczestnicy: jan_kowalski, anna_nowak
     - Data: dzisiaj
     - Opis: "Obiad"
   - Weryfikacja liczby wydatków: 3

5. **Zamknięcie rozliczenia**
   - Przejście do kroku "Podsumowanie"
   - Weryfikacja wyświetlenia sald
   - Weryfikacja wyświetlenia listy przelewów
   - Kliknięcie "Zamknij rozliczenie"
   - Potwierdzenie w modalu
   - Weryfikacja zmiany statusu na "Zamknięte"

6. **Weryfikacja archiwum**
   - Powrót do `/settlements`
   - Przejście do zakładki "Archiwum"
   - Weryfikacja obecności zamkniętego rozliczenia
   - Kliknięcie na rozliczenie
   - Weryfikacja trybu tylko do odczytu

7. **Wylogowanie**
   - Kliknięcie przycisku wylogowania
   - Weryfikacja przekierowania do `/auth/login`

**Oczekiwane rezultaty**:
- ✅ Użytkownik może zarejestrować się i zalogować
- ✅ Użytkownik może utworzyć rozliczenie
- ✅ Użytkownik może dodać uczestników
- ✅ Użytkownik może dodać wydatki z różnymi podziałami
- ✅ Użytkownik może zamknąć rozliczenie
- ✅ Zamknięte rozliczenie trafia do archiwum
- ✅ Zamknięte rozliczenie jest w trybie read-only
- ✅ Użytkownik może się wylogować

---

### 5.2 Scenariusz: Zarządzanie Uczestnikami

**Plik**: `tests/e2e/specs/participants-management.spec.ts`

**Przebieg**:
1. Logowanie jako istniejący użytkownik
2. Utworzenie nowego rozliczenia
3. Dodanie 5 uczestników
4. Próba dodania 6. uczestnika z tym samym nickiem → błąd walidacji + sugestia
5. Edycja nickname uczestnika
6. Usunięcie uczestnika
7. Weryfikacja liczby uczestników: 4
8. Próba dodania 10 uczestników → sukces
9. Próba dodania 11. uczestnika → błąd limitu

---

### 5.3 Scenariusz: Zarządzanie Wydatkami

**Plik**: `tests/e2e/specs/expenses-management.spec.ts`

**Przebieg**:
1. Logowanie i utworzenie rozliczenia z uczestnikami
2. Dodanie wydatku ze wszystkimi uczestnikami
3. Dodanie wydatku z częścią uczestników
4. Dodanie wydatku jednoosobowego (edge case)
5. Filtrowanie wydatków po uczestniku
6. Edycja istniejącego wydatku
7. Usunięcie wydatku
8. Weryfikacja aktualizacji sumy wydatków

---

### 5.4 Scenariusz: Walidacja Formularzy

**Plik**: `tests/e2e/specs/form-validation.spec.ts`

**Przebieg**:
1. **Walidacja rejestracji**:
   - Pusty email → błąd
   - Nieprawidłowy format email → błąd
   - Hasło za krótkie → błąd
   - Hasła się nie zgadzają → błąd

2. **Walidacja tytułu rozliczenia**:
   - Pusty tytuł → przycisk disabled
   - Tytuł > 100 znaków → ograniczenie

3. **Walidacja nickname**:
   - Nieprawidłowe znaki → błąd
   - Za krótki nickname → błąd
   - Zduplikowany nickname → błąd + sugestia

4. **Walidacja wydatku**:
   - Kwota = 0 → błąd
   - Kwota ujemna → błąd
   - Brak płacącego → błąd
   - Brak uczestników → błąd

---

### 5.5 Scenariusz: Limity i Ograniczenia

**Plik**: `tests/e2e/specs/limits-and-boundaries.spec.ts`

**Przebieg**:
1. **Limit aktywnych rozliczeń (3)**:
   - Utworzenie 3 rozliczeń
   - Próba utworzenia 4. → błąd
   - Zamknięcie 1 rozliczenia
   - Utworzenie nowego → sukces

2. **Limit uczestników (10)**:
   - Dodanie 10 uczestników → sukces
   - Próba dodania 11. → błąd

3. **Limit opisu wydatku (140 znaków)**:
   - Wpisanie 140 znaków → sukces
   - Próba wpisania 141 znaków → ograniczenie

---

### 5.6 Scenariusz: Blokady Po Zamknięciu

**Plik**: `tests/e2e/specs/closed-settlement-readonly.spec.ts`

**Przebieg**:
1. Utworzenie i zamknięcie rozliczenia
2. Próba edycji tytułu → brak możliwości
3. Próba dodania uczestnika → brak formularza
4. Próba dodania wydatku → brak przycisku
5. Weryfikacja dostępności "Kopiuj podsumowanie"
6. Weryfikacja możliwości usunięcia z archiwum

---

## 6. Utilities i Helpers

### 6.1 Test Data Generators

**Plik**: `tests/e2e/utils/testDataGenerator.ts`

```typescript
export class TestDataGenerator {
  static generateEmail(): string
  static generatePassword(): string
  static generateSettlementTitle(): string
  static generateNickname(): string
  static generateExpenseDescription(): string
  static generateAmount(min: number, max: number): number
  static generateDate(daysOffset?: number): string
}
```

### 6.2 Authentication Helpers

**Plik**: `tests/e2e/utils/authHelpers.ts`

```typescript
export async function registerAndLogin(
  page: Page,
  email?: string,
  password?: string
): Promise<{ email: string; password: string }>

export async function loginAsExistingUser(
  page: Page,
  email: string,
  password: string
): Promise<void>

export async function logout(page: Page): Promise<void>
```

### 6.3 Settlement Setup Helpers

**Plik**: `tests/e2e/utils/settlementHelpers.ts`

```typescript
export async function createSettlementWithParticipants(
  page: Page,
  title: string,
  participantNicknames: string[]
): Promise<{ settlementId: string }>

export async function addParticipantsToSettlement(
  page: Page,
  nicknames: string[]
): Promise<void>

export async function addExpenseToSettlement(
  page: Page,
  expenseData: ExpenseData
): Promise<void>
```

### 6.4 Assertion Helpers

**Plik**: `tests/e2e/utils/assertionHelpers.ts`

```typescript
export async function expectSettlementStatus(
  page: Page,
  expectedStatus: 'open' | 'closed'
): Promise<void>

export async function expectParticipantsCount(
  page: Page,
  expectedCount: number
): Promise<void>

export async function expectExpensesCount(
  page: Page,
  expectedCount: number
): Promise<void>
```

---

## 7. Podsumowanie Implementacji

### 7.1 Status Obecny

✅ **Ukończone**:
- Dodano `data-testid` do komponentów autentykacji (4 komponenty - 100%)
- Dodano `data-testid` do WSZYSTKICH komponentów rozliczeń (14/14 - 100%)
  - ✅ SettlementsPage.tsx
  - ✅ TabsSegment.tsx
  - ✅ HeaderBar.tsx
  - ✅ NewSettlementButton.tsx
  - ✅ NewSettlementDialog.tsx
  - ✅ SettlementsList.tsx
  - ✅ SettlementCard.tsx
  - ✅ CardActionsMenu.tsx
  - ✅ ConfirmDeleteDialog.tsx
  - ✅ SettlementHeader.tsx
  - ✅ SettlementStepper.tsx
  - ✅ SettlementDetailsPage.tsx
  - ✅ ReadOnlyBanner.tsx
  - ✅ EmptyState.tsx
- Istniejąca struktura bazowa POM (`BasePage.ts`, `HomePage.ts`)
- Konfiguracja Playwright gotowa

⏳ **Do wykonania**:
- Dodanie `data-testid` do komponentów uczestników (3 komponenty)
- Dodanie `data-testid` do komponentów wydatków (10 komponentów)
- Dodanie `data-testid` do komponentów podsumowania (5 komponentów)
- Utworzenie 12 klas Page Object Model
- Napisanie 6 suites testowych E2E

---

### 7.2 Kolejność Implementacji

**Faza 1: Dokończenie data-testid** (priorytet: WYSOKI)
1. ✅ Auth components (4/4) - DONE (100%)
2. ✅ Settlements components (14/14) - DONE (100%)
3. ⏳ Participants components (0/3) - TODO
4. ⏳ Expenses components (0/10) - TODO
5. ⏳ Summary components (0/5) - TODO

**Faza 2: Implementacja POM** (priorytet: WYSOKI)
1. Auth pages (3 klasy)
2. Settlements pages (3 klasy + 3 komponenty)
3. Participants pages (1 klasa + 3 komponenty)
4. Expenses pages (2 klasy + 3 komponenty)
5. Summary pages (1 klasa + 4 komponenty)

**Faza 3: Implementacja testów** (priorytet: ŚREDNI)
1. Complete user journey (1 spec)
2. Participants management (1 spec)
3. Expenses management (1 spec)
4. Form validation (1 spec)
5. Limits and boundaries (1 spec)
6. Closed settlement readonly (1 spec)

**Faza 4: Utilities i helpers** (priorytet: NISKI)
1. Test data generators
2. Authentication helpers
3. Settlement setup helpers
4. Assertion helpers

---

### 7.3 Oszacowanie Czasu

| Faza | Zadanie | Szacowany czas |
|------|---------|----------------|
| 1 | Dokończenie data-testid (18 komponentów) | 3-4h |
| 2 | Implementacja POM (12 klas głównych) | 4-5h |
| 2 | Implementacja POM components (13 klas) | 3-4h |
| 3 | Implementacja testów (6 specs) | 4-6h |
| 4 | Utilities i helpers | 2-3h |
| **TOTAL** | | **16-22h** |

---

### 7.4 Kluczowe Zasady

1. **Konsekwencja nazewnictwa**: Wszystkie `data-testid` zgodne z konwencją: `type-element-context`
2. **Izolacja testów**: Każdy test tworzy własne dane (email, rozliczenia) z timestamp
3. **Czyszczenie**: Po testach opcjonalne czyszczenie danych testowych
4. **Timeout**: Ustawić sensowne timeouty dla długich operacji (np. zamykanie rozliczenia)
5. **Retry**: Wykorzystać `test.retry()` dla niestabilnych testów
6. **Parallel**: Testy mogą działać równolegle (izolacja danych)

---

## 8. Przykładowy Kod

### 8.1 Przykład: LoginPage POM

```typescript
import { Page, Locator } from '@playwright/test';
import { BasePage } from '../BasePage';

export class LoginPage extends BasePage {
  readonly formLogin: Locator;
  readonly inputEmail: Locator;
  readonly inputPassword: Locator;
  readonly buttonSubmit: Locator;
  readonly alertError: Locator;
  readonly linkRegister: Locator;

  constructor(page: Page) {
    super(page);
    this.formLogin = page.locator('[data-testid="form-login"]');
    this.inputEmail = page.locator('[data-testid="input-email"]');
    this.inputPassword = page.locator('[data-testid="input-password"]');
    this.buttonSubmit = page.locator('[data-testid="button-submit"]');
    this.alertError = page.locator('[data-testid="alert-error"]');
    this.linkRegister = page.locator('[data-testid="link-register"]');
  }

  async goto() {
    await this.page.goto('/auth/login');
    await this.waitForLoad();
  }

  async fillEmail(email: string) {
    await this.inputEmail.fill(email);
  }

  async fillPassword(password: string) {
    await this.inputPassword.fill(password);
  }

  async submit() {
    await this.buttonSubmit.click();
  }

  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
    // Wait for navigation
    await this.page.waitForURL('/settlements');
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.alertError.isVisible()) {
      return await this.alertError.textContent();
    }
    return null;
  }
}
```

### 8.2 Przykład: Complete User Journey Test

```typescript
import { test, expect } from '@playwright/test';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { SettlementsListPage } from '../pages/settlements/SettlementsListPage';
import { SettlementDetailsPage } from '../pages/settlements/SettlementDetailsPage';
import { ParticipantsPage } from '../pages/participants/ParticipantsPage';
import { ExpenseFormPage } from '../pages/expenses/ExpenseFormPage';
import { SummaryPage } from '../pages/summary/SummaryPage';
import { TestDataGenerator } from '../utils/testDataGenerator';

test.describe('Complete User Journey', () => {
  const email = TestDataGenerator.generateEmail();
  const password = 'TestPass123!';
  const settlementTitle = 'Wycieczka do Warszawy';

  test('should complete full settlement lifecycle', async ({ page }) => {
    // 1. Register
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.register(email, password);
    await expect(page).toHaveURL('/settlements');

    // 2. Create settlement
    const settlementsPage = new SettlementsListPage(page);
    await settlementsPage.clickNewSettlement();
    // ... dialog interaction
    await expect(page).toHaveURL(/\/settlements\/.+/);

    // 3. Add participants
    const detailsPage = new SettlementDetailsPage(page);
    await detailsPage.goToStep('participants');
    
    const participantsPage = new ParticipantsPage(page);
    await participantsPage.addParticipant('jan_kowalski');
    await participantsPage.addParticipant('anna_nowak');
    await participantsPage.addParticipant('piotr_wisniewski');
    
    await expect(participantsPage.listParticipants).toContainText('3 uczestników');

    // 4. Add expenses
    await detailsPage.goToStep('expenses');
    // ... expense creation

    // 5. Close settlement
    await detailsPage.goToStep('summary');
    const summaryPage = new SummaryPage(page);
    await summaryPage.closeSettlement();
    
    await expect(detailsPage.badgeStatus).toContainText('Zamknięte');

    // 6. Verify archive
    await settlementsPage.goto();
    await settlementsPage.switchToTab('archive');
    await expect(settlementsPage.listSettlements).toContainText(settlementTitle);
  });
});
```

---

## 9. Checklist Implementacyjny

### data-testid
- [x] Auth components (4/4)
- [x] Settlements: TabsSegment, HeaderBar, NewSettlementButton, NewSettlementDialog
- [x] Settlements: SettlementsList, SettlementCard
- [ ] Settlements: CardActionsMenu, ConfirmDeleteDialog, SettlementHeader, SettlementStepper
- [ ] Participants: ParticipantForm, ParticipantsList, DeleteParticipantConfirm
- [ ] Expenses: ExpenseForm, AmountInput, PayerSelect, ParticipantsChecklist, DateInput, DescriptionField
- [ ] Expenses: ExpensesView, ExpensesFilterBar, ExpensesExpenseCard, ExpensesDeleteConfirmDialog
- [ ] Summary: SummaryPage, BalancesSection, TransfersSection, ConfirmCloseModal, CopySummaryButton

### Page Object Models
- [ ] Auth: LoginPage, RegisterPage, ForgotPasswordPage
- [ ] Settlements: SettlementsListPage, SettlementDetailsPage
- [ ] Settlements components: NewSettlementDialog, SettlementCard, ConfirmDeleteDialog
- [ ] Participants: ParticipantsPage
- [ ] Participants components: ParticipantForm, ParticipantsList, DeleteParticipantDialog
- [ ] Expenses: ExpensesPage, ExpenseFormPage
- [ ] Expenses components: ExpensesList, ExpenseCard, ExpensesFilterBar
- [ ] Summary: SummaryPage
- [ ] Summary components: BalancesSection, TransfersSection, ConfirmCloseDialog

### Test Specs
- [ ] complete-user-journey.spec.ts
- [ ] participants-management.spec.ts
- [ ] expenses-management.spec.ts
- [ ] form-validation.spec.ts
- [ ] limits-and-boundaries.spec.ts
- [ ] closed-settlement-readonly.spec.ts

### Utilities
- [ ] testDataGenerator.ts
- [ ] authHelpers.ts
- [ ] settlementHelpers.ts
- [ ] assertionHelpers.ts

---

**Dokument utworzony**: 2025-10-31  
**Autor**: Claude (Anthropic)  
**Status**: Planistyczny - gotowy do implementacji
