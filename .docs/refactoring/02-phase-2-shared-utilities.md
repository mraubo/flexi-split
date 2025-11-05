# FAZA 2: Shared Utilities

## Status: ✅ UKOŃCZONA

Czas realizacji: ~2 godziny

## Wprowadzone zmiany

### 1. Shared Validators - `src/lib/utils/validators.ts`

**Zawartość:**
- `validateNickname()` - walidacja nickname'u (3-30 znaków, pattern)
- `validateNicknameUniqueness()` - walidacja unikalności (case-insensitive)
- `generateNicknameSuggestion()` - generowanie sugestii
- `validateAmount()` - walidacja kwoty wydatku
- `validateDate()` - walidacja daty (YYYY-MM-DD)
- `validateDescription()` - walidacja opisu (max 140 znaków)
- `validateParticipant()` - wymagany uczestnik
- `validateParticipants()` - co najmniej 1 uczestnik
- `validateSettlementTitle()` - walidacja nazwy rozliczenia
- `validateEmail()` - walidacja emaila
- `validatePassword()` - walidacja hasła (min 8 znaków, litery + cyfry)
- `validatePasswordsMatch()` - porównanie haseł

**Użycie:**

```typescript
import { validateNickname, validateAmount } from "@/lib/utils/validators";

const nicknameResult = validateNickname("john_doe");
if (!nicknameResult.valid) {
  console.error(nicknameResult.error);
}

const amountResult = validateAmount(2500); // cents
if (amountResult.valid) {
  // Amount is OK
}
```

### 2. Shared Formatters - `src/lib/utils/formatters.ts`

**Zawartość:**
- `formatCentsToAmount()` - cents → "25,00" (bez waluty)
- `parseAmountToCents()` - "25,50" → 2550 (cents)
- `formatCurrency()` - cents → "25,00 zł" (z walutą)
- `formatDate()` - Date → "5 lis 2025"
- `formatDateTime()` - Date → "5 lis 2025, 10:54"
- `formatISODate()` - "2025-11-05" → "5 lis 2025"
- `formatDateForInput()` - Date → "2025-11-05" (dla input type="date")
- `calculateShareInfo()` - dzielenie wydatku na osoby
- `truncateText()` - ucięcie tekstu z "..."
- `formatParticipantCount()` - "5 uczestników" (z poprawną formą gramatyczną)
- `formatExpenseCount()` - "5 wydatków" (z poprawną formą gramatyczną)
- `capitalize()` - "hello" → "Hello"
- `formatStatus()` - "open" → "Otwarty"

**Użycie:**

```typescript
import { formatCurrency, parseAmountToCents, formatDate } from "@/lib/utils/formatters";

const cents = parseAmountToCents("25,50"); // 2550
const display = formatCurrency(cents); // "25,50 zł"

const userInput = "30,00";
const parsed = parseAmountToCents(userInput); // handles both comma and dot
```

### 3. Shared Form Components - `src/components/form/`

#### FormError.tsx
```typescript
<FormError 
  id="nickname-error" 
  message="Nazwa jest już używana"
/>
```

**Cechy:**
- Obsługa ARIA live regions
- Zmienialny role attribute
- Conditional rendering (nie wyświetla się jeśli brak message)

#### FormLabel.tsx
```typescript
<FormLabel 
  id="nickname"
  label="Nazwa użytkownika"
  required={true}
  helpText="3-30 znaków, małe litery i cyfry"
/>
```

**Cechy:**
- Wskaźnik wymaganych pól (*)
- Help text dla dodatkowych informacji
- Spójny styling z shadcn/ui

#### FormField.tsx
```typescript
<FormField
  id="nickname"
  label="Nazwa"
  error={validationError}
  required={true}
  helpText="3-30 znaków"
>
  <Input 
    type="text"
    placeholder="np. john_doe"
  />
</FormField>
```

**Cechy:**
- Kombinuje label + input + error message
- Automatyczne ARIA atrybuty
- Flexibilny - działa z dowolnym input elementem
- Clone element pattern dla ARIA attributes

### 4. Reusable Hook - `useNicknameValidation.ts`

**Funkcjonalność:**
- Walidacja pattern'u i długości
- Walidacja unikalności (local + remote)
- Generowanie sugestii
- Obsługa konfliktu z servera (409 error)

**API:**

```typescript
const {
  validation,           // Validation state
  updateValidation,     // Update based on input
  getValidationMessage, // Get human-readable message
  isValid,              // Check if nickname is valid
  handleRemoteConflict, // Handle 409 error
  clearRemoteConflict,  // Clear conflict flag
  reset,                // Reset validation
} = useNicknameValidation(existingNicknames, currentNickname);
```

**Użycie:**

```typescript
const { validation, updateValidation, isValid, getValidationMessage } = 
  useNicknameValidation(existingNicknames);

const handleChange = (value: string) => {
  updateValidation(value);
};

const handleSubmit = async () => {
  if (!isValid(nickname)) return;
  
  try {
    await updateParticipant(nickname);
  } catch (error) {
    if (error.status === 409) {
      handleRemoteConflict(nickname);
    }
  }
};
```

## Struktura katalogów po FAZIE 2

```
src/lib/utils/
├── validators.ts       ✨ NOWY - Shared validators
└── formatters.ts       ✨ NOWY - Shared formatters

src/components/
├── form/               ✨ NOWY folder
│   ├── FormError.tsx
│   ├── FormLabel.tsx
│   └── FormField.tsx
├── hooks/
│   └── useNicknameValidation.ts  ✨ NOWY
└── (pozostałe komponenty)
```

## Wzorce implementacyjne

### 1. Walidacja w dwóch warstwach

**Local validation:**
- Pattern, length, uniqueness check
- Błędy wyświetlane od razu

**Remote validation:**
- Sprawdzenie na serwerze (409 Conflict)
- Sugestia alternatywna w error handler'ze

```typescript
try {
  await api.post(...);
} catch (error) {
  if (error.status === 409) {
    handleRemoteConflict(value);
  }
}
```

### 2. Formatowanie - Input vs Display

**Input field:**
```typescript
<Input 
  value={formatCentsToAmount(amount)}
  onChange={(e) => setAmount(parseAmountToCents(e.target.value))}
/>
```

**Display:**
```typescript
<span>{formatCurrency(amountCents)}</span>
```

### 3. Custom Hook Composition

**Zamiast:**
```typescript
// Duży hook z wszystkim
useExpenseForm({ ... }) // 348 LOC
```

**Teraz:**
```typescript
// Małe, focused hooki
useNicknameValidation(existingNicknames)
useAmountInput(initialValue)
```

## Integracja z FAZĄ 1

FAZA 2 utilities mogą być używane natychmiast z FAZĄ 1:

```typescript
// Użycie validators + API hooks
const { data: participants } = useParticipants(settlementId);
const nicknameError = validateNickname(input);

// Użycie formatters + query hooks
const { data: settlements } = useSettlements();
return settlements.map(s => ({
  title: s.title,
  amount: formatCurrency(s.total_expenses_amount_cents)
}));
```

## Następne kroki

FAZA 3: Refaktoryzacja Auth Forms
- Użycie react-hook-form
- Integracja z validators
- Zastosowanie nowych form components

## Potencjalne problemy

### Problem: Validator nie obsługuje mojego use case
**Rozwiązanie:** Dodaj nowy validator do `validators.ts` i zdokumentuj go

### Problem: Formatter daje zły format
**Rozwiązanie:** Sprawdź locale i currency w parametrach

### Problem: FormField nie działa z moim custom input'em
**Rozwiązanie:** Upewnij się, że input element akceptuje `id`, `aria-invalid`, `aria-describedby`

## Metryki po FAZIE 2

- ✅ 2 utility files (validators.ts, formatters.ts) - 460+ linii
- ✅ 3 form components (FormField, FormLabel, FormError)
- ✅ 1 custom hook (useNicknameValidation.ts)
- ✅ Kompletna dokumentacja

## Reusability

Te utilities mogą być reużywane:
- W nowych formach (FAZA 3, 4, 5)
- W custom componentach
- W API endpoints (server-side validation)
- W test'ach
