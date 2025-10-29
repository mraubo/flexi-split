# Plan testów dla projektu Flex Spliter

## 1. Wprowadzenie i cele testowania

- Celem testów jest potwierdzenie jakości, poprawności obliczeń oraz bezpieczeństwa aplikacji opartej o Astro 5, React 19, TypeScript 5 i Supabase.
- Szczególny nacisk kładziemy na: poprawność obliczeń sald i transferów, bezpieczeństwo dostępu (RLS/Potr, middleware), stabilność procesów zamykania/finalizacji rozliczeń, niezawodność API (Astro API routes), dostępność (a11y) i wydajność.

## 2. Zakres testów

- Frontend:
  - Komponenty React w `src/components/**` (w tym auth, expenses, settlements, summary).
  - Strony Astro w `src/pages/**` i układy w `src/layouts/**`.
  - Middleware w `src/middleware/index.ts` (nawigacja/ochrona tras).
  - Stylowanie i interfejs (Tailwind 4, Shadcn/ui), dostępność i responsywność.
- Backend/API:
  - Endpointy w `src/pages/api/**` (13 plików).
  - Integracja z Supabase (`src/db/**`, `src/types.ts`).
  - Funkcje i polityki w migracjach `supabase/migrations/**` (RLS, transakcje, soft-delete, finalizacja, kalkulacje).
- Narzędzia i konfiguracje:
  - Konfiguracje Astro, TypeScript, ESLint.
  - Skrypty uruchomieniowe (bun, nvm) i pipeline CI.

Poza zakresem: testy przeglądarek legacy (IE), testy manualne lokalizacji (jeśli brak i18n).

## 3. Typy testów

- Testy jednostkowe:
  - Logika obliczeń (suma kosztów, udziały, salda, transfery, kontrola sumy).
  - Funkcje utili z `src/lib/**`.
  - Komponenty React z czystą logiką (render i interakcje).
- Testy integracyjne:
  - Komponenty React + stan + wywołania API (mock MSW).
  - API routes (wejście/wyjście), kontrakty DTO z `src/types.ts`.
  - Middleware (scenariusze autoryzacji/redirect).
- Testy end-to-end (E2E):
  - Krytyczne ścieżki: rejestracja/logowanie, tworzenie rozliczenia, dodawanie uczestników i wydatków, kalkulacje, finalizacja, stany read-only, kopiowanie podsumowania.
- Testy wydajnościowe:
  - Czasy odpowiedzi API, budżety LCP/FID/INP na kluczowych stronach.
  - Obciążenie funkcji finalizacji i kalkulacji (k6).
- Testy bezpieczeństwa:
  - Wymuszenie RLS, brak eskalacji uprawnień (dostęp do cudzych rozliczeń).
  - OWASP top 10 (XSS, CSRF gdzie dotyczy, IDOR).
- Testy dostępności:
  - Axe i Lighthouse (kontrast, role, aria, nawigacja klawiaturą).
- Testy regresji wizualnej (opcjonalnie):
  - Krytyczne widoki (lista rozliczeń, szczegóły, podsumowanie).
- Testy kompatybilności/responsywności:
  - Widoki mobilne i desktopowe, najnowsze Chrome/Firefox/Safari.

## 4. Scenariusze testowe dla kluczowych funkcjonalności

- Autentykacja i autoryzacja:
  - Rejestracja, logowanie, wylogowanie, przypomnienie/zmiana hasła (`src/components/auth/**`, `src/pages/auth/**`).
  - Wejście na strony chronione bez tokenu → przekierowanie/401/403 (`src/middleware/index.ts`, `src/pages/401.astro`, `403.astro`).
  - Próba dostępu do rozliczenia niebędącego użytkownika → 403 (RLS + middleware).
- Rozliczenia:
  - Lista rozliczeń (`SettlementsPage`, `SettlementsList`): pusta lista, lista z elementami, paginacja/ładowanie (jeśli istnieją).
  - Tworzenie rozliczenia (`NewSettlementButton`/dialog): walidacje pól, błędy serwera, komunikaty.
  - Karta rozliczenia (`SettlementCard`): poprawne metadane, akcje (menu/kasowanie, potwierdzenia `ConfirmDeleteDialog`).
  - Szczegóły rozliczenia (`SettlementDetailsPage`): sekcje uczestników, wydatków, transferów; banery (lock/read-only).
  - Finalizacja rozliczenia: stany przejściowe, transakcyjność, blokady edycji po finalizacji.
- Uczestnicy:
  - Dodawanie/edycja/usuwanie uczestnika (`ParticipantForm`, `EditParticipantModal`, `DeleteParticipantConfirm`).
  - Efekt uboczny: aktualizacja rozliczenia po zmianach uczestników (migracja `add_create_participant_with_settlement_update_function.sql`).
  - Walidacje (unikalność nazw w obrębie rozliczenia, puste pola).
- Wydatki:
  - Dodawanie/edycja/usuwanie wydatku (`src/components/expenses/**`): podział równy/niestandardowy, walidacje kwot.
  - Aktualizacja z uczestnikami (`add_update_expense_with_participants_function.sql`, `add_create_expense_with_participants_function.sql`).
  - Ograniczenia aktualizacji (`add_expense_update_constraints.sql`): np. edycja po zamknięciu.
- Obliczenia i podsumowania:
  - Balances i transfers (`BalancesSection`, `TransfersSection`, `SummaryPage`).
  - Kontrola sumy (`ControlSumNote`): suma wydatków = suma udziałów; tolerancja zaokrągleń.
  - Kopiowanie podsumowania (`CopySummaryButton`): poprawna treść w schowku.
- Stany błędów i puste stany:
  - Strony `401/403/404`, komponenty `ErrorPage`, `ErrorState`, `EmptyState`, `ParticipantsEmptyState`, `LoadingSkeleton`.
  - Zrywanie połączeń (MSW → network error), błędy walidacji, brak uprawnień (RLS).
- API:
  - Każdy endpoint w `src/pages/api/**`: statusy, treści, błędy, walidacje DTO (`src/types.ts` zgodność).
  - Wymuszenie RLS: wywołania z tokenem innego użytkownika → 403/404, bez tokenu → 401/403.
- UI/UX:
  - Komponenty Shadcn/ui: focus states, aria-* zgodnie z wytycznymi.
  - Tailwind: dark mode, responsywność siatek/list, dostępność kontrastów.
- Migracje i DB:
  - Aplikowanie migracji na czystej bazie (CI).
  - Idempotencja: wielokrotne uruchomienie bez błędów.
  - Funkcje obliczeniowe i transakcyjne: wyniki zgodne z oczekiwaniami dla danych testowych.

## 5. Środowisko testowe

- Runtime:
  - Node zgodny z projektem: `nvm use`.
  - Menedżer: bun (uruchamianie testów i dev servera).
- Baza danych:
  - Supabase lokalnie (Docker/supabase CLI) z osobnym schematem testowym i dedykowanymi kluczami (service-role dla migracji; użytkownik końcowy dla E2E).
  - Automatyczne aplikowanie migracji z `supabase/migrations/**` przed testami integracyjnymi/E2E.
- Konfiguracja:
  - Pliki `.env.test` i sekrety CI (bezpieczne przechowywanie).
  - Build testowy Astro (SSR tam, gdzie potrzebne).
- Przeglądarki:
  - Headless Chromium/Firefox/WebKit (Playwright), plus sanity na natywnych przeglądarkach developerskich.

## 6. Narzędzia do testowania

- Jednostkowe/integracyjne:
  - Vitest + React Testing Library.
  - MSW do mockowania sieci.
  - Supertest do testów API routes (bez wystawiania sieci).
- End-to-end:
  - Playwright (scenariusze krytyczne; testy na dev/build).
- Wydajność i jakość:
  - k6 (obciążenie API), Lighthouse CI (wydajność i a11y), axe-core/Playwright-axe (a11y).
- Statyka:
  - TypeScript `--noEmit` (typy), ESLint (styl i błędy).
- Pokrycie:
  - c8/istanbul do generowania coverage.
- Bezpieczeństwo:
  - OWASP ZAP (DAST), skrypty wymuszające RLS (negative tests).
- CI:
  - GitHub Actions (joby: lint, typecheck, unit, integration, e2e, lighthouse, k6 wybrane).

## 7. Harmonogram testów

- Na każdy PR:
  - Lint + typecheck + testy jednostkowe i integracyjne + wybrane E2E smoke.
- Dziennie (nightly):
  - Pełne E2E, Lighthouse, część testów obciążeniowych lekkich.
- Tygodniowo:
  - Scenariusze k6 (peak), pełen zestaw bezpieczeństwa (skan), regresja wizualna.
- Przed releasem:
  - Pełny zestaw E2E na buildzie produkcyjnym, sanity dla RLS i finalizacji rozliczeń, UAT.
- Po migracjach DB:
  - Re-run testów integracyjnych/E2E na czystej bazie.

## 8. Kryteria akceptacji testów

- Funkcjonalność:
  - 0 błędów P0/P1, brak regresji w krytycznych ścieżkach (auth, tworzenie/edycja wydatków, finalizacja).
- Pokrycie:
  - Jednostkowe ≥ 80% logicznych modułów (lib/utils/obliczenia), integracyjne kluczowych przepływów ≥ 70%.
- Wydajność:
  - Lighthouse: Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 90.
  - API P95 < 300 ms dla operacji odczytu; finalizacja < 2 s dla średniego rozmiaru rozliczenia.
- Bezpieczeństwo:
  - Brak niezaliczonych testów RLS; brak IDOR; brak krytycznych/major z ZAP.
- A11y:
  - 0 krytycznych/poważnych naruszeń axe na krytycznych widokach.
- Migracje:
  - Migracje idempotentne, przechodzą na czystej i istniejącej bazie.

## 9. Role i odpowiedzialności

- QA Lead:
  - Definiuje strategię, priorytety, akceptuje kryteria, nadzoruje raportowanie i metryki.
- QA Engineer:
  - Implementuje testy (unit/integration/E2E), utrzymuje dane testowe/fixtures, automatyzuje scenariusze.
- Developer:
  - Dostarcza testy jednostkowe do własnych zmian, wspiera integracyjne i naprawia wykryte defekty.
- DevOps:
  - Utrzymuje środowiska CI, sekrety, obrazy Supabase, pipeline testowy.
- Product Owner/Analityk:
  - Akceptuje wyniki UAT, priorytetyzuje defekty.

## 10. Procedury raportowania błędów

- Zgłoszenie:
  - Tytuł, opis, środowisko, wersja commit (`git sha`), kroki odtworzenia, oczekiwany vs rzeczywisty wynik, zrzuty ekranu/logi (frontend konsola, odpowiedzi API), zrzut danych testowych (ID rozliczenia/uczestników), severity (P0–P3), komponent/obszar.
- Triage:
  - QA Lead + Developer przypisują priorytet i właściciela; weryfikacja duplikatów; decyzja o hotfixie vs sprint.
- Cykl życia:
  - Open → In Progress → In Review (z testami odtworzenia) → Resolved → Verified (E2E/Integration) → Closed.
- Reprodukcja i regresja:
  - Każdy błąd krytyczny dostaje test automatyczny zapobiegający regresji (unit/integration/E2E).
- Komunikacja:
  - Raporty dzienne/nocne z CI (statusy jobów, flaki, metryki pokrycia i Lighthouse), tablica defektów z SLA: P0 < 24h, P1 < 72h, P2 w sprincie, P3 zależnie od priorytetów.

### Załączniki operacyjne (skrót)

- Konwencje uruchamiania:
  - `nvm use`, następnie bun: uruchamianie testów/unit/integration, dev server do E2E.
- Dane testowe:
  - Seed dla Supabase (fixtures) per suite; izolacja testów (transakcje/tearDown).
- Traceability:
  - Mapowanie funkcji → testy (lista w repo w `.docs` lub `tests/README.md`).
- Definicje „gotowości do testów”:
  - API z dokumentacją DTO (`src/types.ts`), migracje zaktualizowane, mocki MSW gotowe, feature za flagą z domyślną konfiguracją.
