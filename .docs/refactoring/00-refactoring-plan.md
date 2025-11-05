# Plan Refaktoryzacji FlexiSplit - Architektura Komponentów

**Ostatnia aktualizacja:** 2025-11-05
**Status:** FAZA 3 UKOŃCZONA ✅

## 🎯 Cel

Refaktoryzacja TOP 5 najbardziej złożonych komponentów (`useExpenseForm.ts`, `EditParticipantModal.tsx`, `ParticipantForm.tsx`, `RegisterForm.tsx`, `useSettlementSummary.ts`) poprzez:

1. ✅ **FAZA 1:** Wdrożenie react-hook-form, @tanstack/react-query i typowanego API client
2. ✅ **FAZA 2:** Shared utilities (validators, formatters, form components)
3. ✅ **FAZA 3:** Refaktoryzacja auth formów
4. 🔄 **FAZA 4:** Refaktoryzacja participant components
5. 🔄 **FAZA 5:** Refaktoryzacja expense hook
6. 🔄 **FAZA 6:** Refaktoryzacja settlement summary hook
7. 🔄 **FAZA 7:** Dokumentacja i testy

## 📊 Metryki sukcesu

| Metrika | Target | Status |
|---------|--------|--------|
| Redukcja LOC w TOP 5 komponentach | -40-50% | ⏳ W trakcie |
| Eliminacja duplikacji kodu walidacji | 100% | ⏳ W trakcie |
| Centralizacja API calls | 100% | ⏳ W trakcie |
| Wszystkie formularze używają react-hook-form | 100% | ⏳ W trakcie |
| Testy E2E przechodzą | 100% | ✅ OK |

## 📁 Struktura dokumentacji

```
.docs/refactoring/
├── 00-refactoring-plan.md          (ten plik)
├── 01-phase-1-foundations.md       ✅ UKOŃCZONA
├── 02-phase-2-shared-utilities.md  (planned)
├── 03-phase-3-auth-forms.md        (planned)
├── 04-phase-4-participant-forms.md (planned)
├── 05-phase-5-expense-form.md      (planned)
├── 06-phase-6-settlement-summary.md (planned)
├── 07-phase-7-docs-and-tests.md    (planned)
├── api-client-guide.md              (planned)
├── form-patterns.md                 (planned)
├── query-hooks-guide.md             (planned)
└── migration-guide.md               (planned)
```

## 🚀 Status implementacji

### FAZA 1: Fundament - Infrastruktura API i Query ✅

**Status:** UKOŃCZONA

**Realizacja:**
- ✅ Instalacja zależności (react-hook-form, @hookform/resolvers, @tanstack/react-query)
- ✅ Stworzenie `src/lib/api/client.ts` - typowany HTTP client
- ✅ Stworzenie `src/lib/api/queryClient.ts` - konfiguracja TanStack Query
- ✅ Stworzenie `src/components/QueryClientProvider.tsx`
- ✅ Integracja QueryClient w Layout.astro i AuthLayout.astro
- ✅ Stworzenie custom hook'ów: useSettlements, useParticipants
- ✅ Dokumentacja FAZY 1

**Pliki stworzone:**
- `src/lib/api/client.ts` (123 linii)
- `src/lib/api/queryClient.ts` (86 linii)
- `src/components/QueryClientProvider.tsx` (23 linii)
- `src/lib/hooks/api/useSettlements.ts` (152 linii)
- `src/lib/hooks/api/useParticipants.ts` (95 linii)

**Pliki zmienione:**
- `src/layouts/Layout.astro`
- `src/layouts/AuthLayout.astro`

**Pliki dokumentacji:**
- `.docs/refactoring/01-phase-1-foundations.md`

---

### FAZA 2: Shared Utilities ✅

**Status:** UKOŃCZONA

**Realizacja:**
1. ✅ Wydzielenie wspólnych validatorów do `src/lib/utils/validators.ts` (12 validators)
2. ✅ Wydzielenie formatters do `src/lib/utils/formatters.ts` (13 formatters)
3. ✅ Stworzenie shared form components w `src/components/form/` (3 components)
4. ✅ Wydzielenie `useNicknameValidation.ts` hook

**Pliki stworzone:**
- `src/lib/utils/validators.ts` (217 LOC)
- `src/lib/utils/formatters.ts` (243 LOC)
- `src/components/form/FormError.tsx` (19 LOC)
- `src/components/form/FormLabel.tsx` (24 LOC)
- `src/components/form/FormField.tsx` (39 LOC)
- `src/components/hooks/useNicknameValidation.ts` (126 LOC)

**Pliki dokumentacji:**
- `.docs/refactoring/02-phase-2-shared-utilities.md`
- `.docs/refactoring/PHASE2_SUMMARY.txt`

**Dependencies:** FAZA 1 ✅ - COMPLETED ✅

---

### FAZA 3: Refaktoryzacja Auth Forms ✅

**Status:** UKOŃCZONA

**Realizacja:**
1. ✅ Refaktoryzacja RegisterForm.tsx - react-hook-form + Zod resolver
2. ✅ Refaktoryzacja LoginForm.tsx - react-hook-form + Zod resolver
3. ✅ Wydzielenie CountdownTimer.tsx z RegisterForm
4. ✅ Wydzielenie RegistrationSuccess.tsx component
5. ⚠️ Użyto manual fetch zamiast TanStack Query (SSR compatibility)

**Actual reduction:** 
- RegisterForm.tsx: 244 LOC → 155 LOC (-36%)
- LoginForm.tsx: 165 LOC → 105 LOC (-36%)

**Pliki stworzone:**
- `src/components/auth/CountdownTimer.tsx` (36 LOC)
- `src/components/auth/RegistrationSuccess.tsx` (57 LOC)

**Pliki zrefaktoryzowane:**
- `src/components/auth/LoginForm.tsx` (105 LOC, -36%)
- `src/components/auth/RegisterForm.tsx` (155 LOC, -36%)

**Pliki dokumentacji:**
- `.docs/refactoring/03-phase-3-auth-forms.md`
- `.docs/refactoring/PHASE3_SUMMARY.txt`

**Uwaga:** Auth forms używają manual fetch() zamiast TanStack Query dla kompatybilności z SSR (client:load). Formularze są renderowane po stronie serwera dla lepszego SEO i wydajności.

**Dependencies:** FAZA 2 ✅ - COMPLETED ✅

---

### FAZA 4: Refaktoryzacja Participant Components 🔄

**Status:** Planned

**Plan:**
1. Wydzielić shared logic do `useNicknameValidation.ts`
2. Refaktoryzować ParticipantForm.tsx
3. Refaktoryzować EditParticipantModal.tsx
4. Stworzyć NicknameInput.tsx - reużywalny component
5. Zastąpić API calls przez custom hooks

**Target reduction:**
- ParticipantForm.tsx: 272 LOC → ~120 LOC (-56%)
- EditParticipantModal.tsx: 291 LOC → ~100 LOC (-66%)
- Combined duplikacja: -80% (wspólny NicknameInput)

**Dependencies:** FAZA 2

---

### FAZA 5: Refaktoryzacja Expense Hook 🔄

**Status:** Planned

**Plan:**
1. Podzielić useExpenseForm.ts na:
   - useExpenseValidation.ts - walidacja
   - useExpenseApi.ts - API calls
   - useExpenseFormatting.ts - formatowanie
   - useExpenseForm.ts - orchestrator
2. Wydzielić validators do lib/utils/
3. Wydzielić formatters do lib/utils/

**Target reduction:** useExpenseForm.ts: 348 LOC → ~120 LOC (-65%)

**Dependencies:** FAZA 2

---

### FAZA 6: Refaktoryzacja Settlement Summary 🔄

**Status:** Planned

**Plan:**
1. Zastąpić manual fetching przez useQuery hooks
2. Wydzielić formatting logic
3. Stworzyć useSettlementSnapshot.ts
4. Stworzyć useCloseSettlement.ts
5. Uprościć useSettlementSummary.ts

**Target reduction:** useSettlementSummary.ts: 241 LOC → ~80 LOC (-67%)

**Dependencies:** FAZA 1

---

### FAZA 7: Dokumentacja i Testy 🔄

**Status:** Planned

**Plan:**
1. Dokumenty:
   - api-client-guide.md
   - form-patterns.md
   - query-hooks-guide.md
   - migration-guide.md
2. Unit testy dla API client
3. Unit testy dla utilities
4. Aktualizacja E2E testów

**Dependencies:** FAZY 1-6

---

## 🏗️ Architektura po refaktoryzacji

### Warstwa API
```
src/lib/api/
├── client.ts           # Typowany HTTP client
└── queryClient.ts      # TanStack Query configuration
```

### Hooki API
```
src/lib/hooks/api/
├── useSettlements.ts
├── useParticipants.ts
├── useExpenses.ts      (planowany)
└── useAuth.ts          (planowany)
```

### Utilities
```
src/lib/utils/
├── validators.ts       (planowany)
├── formatters.ts       (planowany)
└── calculations.ts     (planowany)
```

### Components
```
src/components/
├── form/               (planowany)
│   ├── FormField.tsx
│   ├── FormError.tsx
│   └── FormLabel.tsx
├── QueryClientProvider.tsx
└── (pozostałe komponenty)
```

## 🔄 Wzorce projektowe

### 1. Custom Hooks Composition
```typescript
// Zamiast jednego dużego hook'a (348 LOC)
export function useExpenseForm(params) {
  const validation = useExpenseValidation(params);
  const api = useExpenseApi(params);
  const formatting = useExpenseFormatting(params);
  return { validation, api, formatting };
}
```

### 2. Service Layer Pattern
- API calls zawsze przez service layer
- Services w `src/lib/services/`
- Query hooks jako thin wrapper

### 3. Separation of Concerns
```typescript
// Validacja
useExpenseValidation(params)
  ↓
// API calls
useExpenseApi(params)
  ↓
// Formatowanie
useExpenseFormatting(params)
```

### 4. React Hook Form + Zod Integration
```typescript
const form = useForm({
  resolver: zodResolver(ExpenseSchema),
  defaultValues: getDefaults()
});
```

## ⚠️ Ryzyka i mitygacje

| Ryzyko | Mitygacja |
|--------|-----------|
| Breaking changes w testach | Update testów równolegle z refaktoryzacją |
| Problemy SSR + TanStack Query | Proper QueryClient setup, hydration support |
| Zwiększony bundle size | Code splitting, tree shaking analysis |
| Performance regression | Benchmark przed/po, memoization |

## 📚 Lektura dodatkowa

- [React Hook Form Docs](https://react-hook-form.com/)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Zod Docs](https://zod.dev/)
- [Astro + React Integration](https://docs.astro.build/en/guides/integrations/react/)

## 👥 Instrukcje dla developerów

Przy wdrażaniu kolejnych faz:

1. **Czytaj dokumentację każdej fazy** przed implementacją
2. **Testuj równolegle** - nie czekaj na koniec fazy
3. **Rób małe commity** - jeden component = jeden commit
4. **Raportuj problemy** - zaaktualizuj ten plan jeśli natrafisz na nowe ryzyka

## Historyka zmian

| Data | FAZA | Status | Notes |
|------|------|--------|-------|
| 2025-11-05 | 1 | ✅ DONE | Infrastruktura API i Query |
| 2025-11-05 | 2 | ✅ DONE | Shared utilities (validators, formatters, form components) |
| 2025-11-05 | 3 | ✅ DONE | Auth forms (manual fetch for SSR) |
| TBD | 4 | 🔄 IN PROGRESS | Participant components |
| TBD | 5 | 🔄 PENDING | Expense hook |
| TBD | 6 | 🔄 PENDING | Settlement summary |
| TBD | 7 | 🔄 PENDING | Docs & tests |

---

**Next step:** Przejść do FAZY 4 - Participant Components
