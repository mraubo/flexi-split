## Specyfikacja architektury modułu autentykacji (US‑001 – US‑005)

### Założenia
- Tech stack: Astro 5 (SSR, output: server), React 19 dla komponentów klienckich, TypeScript 5, Tailwind 4, shadcn/ui, Supabase Auth.
- Zgodność z istniejącą architekturą: middleware `src/middleware/index.ts` tworzy klienta Supabase SSR i umieszcza `supabase` i `user` w `context.locals`. Frontend i API muszą używać tego klienta (nie globalnego).
- Sesja: 14 dni (httpOnly cookies zarządzane przez `@supabase/ssr`).
- Brak trybu anonimowego w MVP; dostęp do rozliczeń wymaga zalogowania (zgodnie z PRD 3.1).
- Język UI i komunikaty błędów: PL, zgodnie z istniejącymi utilami w `src/lib/errorMessages.ts`.

---

## 1) Architektura interfejsu użytkownika

### 1.1 Strony i layouty
- Layouty (Astro):
  - `src/layouts/Layout.astro`
    - Rozszerzenie: dodać tryb auth/non‑auth przez dostęp do `Astro.locals.user`.
    - Pasek nawigacyjny: jeśli `user != null` → pokaż nawigację rozliczeń i akcję „Wyloguj”; jeśli `user == null` → linki „Zaloguj”/„Zarejestruj”.
    - Wymagane sloty: header (globalny), main (zawartość strony), footer.

- Strony auth (Astro pages):
  - `src/pages/auth/login.astro` (US‑002)
  - `src/pages/auth/register.astro` (US‑001)
  - `src/pages/auth/forgot-password.astro` (US‑005 - inicjacja resetu)
  - `src/pages/auth/reset-password.astro` (US‑005 - ustawienie nowego hasła – obsługa linku z Supabase)

  Każda strona:
  - Renderowana SSR przez Astro (szybki TTFB, lepsze SEO/ogólna spójność).
  - W treści montuje dedykowany komponent React (form) do interakcji i walidacji klienta.
  - Dostępna tylko dla non‑auth (gdy `Astro.locals.user` istnieje → redirect 302 do `/settlements`).

- Strony aplikacji (już istniejące):
  - `src/pages/index.astro`, `src/pages/settlements.astro`, `src/pages/settlements/[id].astro`, itd. 
  - Dla nieautoryzowanych użytkowników: middleware i/lub guard strony powinien przekierowywać do `/auth/login` (US‑002/US‑003). Widoki błędów `401.astro` i `403.astro` zostają bez zmian, ale flow defaultowo redirectuje na login.

### 1.2 Komponenty React (client‑side)
- Formulary (w `src/components/auth/`):
  - `LoginForm.tsx` (email, password)
  - `RegisterForm.tsx` (email, password, confirmPassword, optional: acceptTerms)
  - `ForgotPasswordForm.tsx` (email)
  - `ResetPasswordForm.tsx` (password, confirmPassword)
  - `LogoutButton.tsx` (akcja wylogowania w headerze)

- Zasady odpowiedzialności:
  - Komponenty React zajmują się:
    - lokalną walidacją (Zod) i UX (focusy, disabled, loading, shadcn/ui inputs/buttons, komunikaty inline),
    - wywołaniem akcji do API (fetch do `/api/auth/*`) lub bezpośrednio `supabase.auth.*` wyłącznie gdy przepływ wymaga kontekstu przeglądarkowego (np. handle link z maila),
    - obsługą komunikatów błędów (mapowanie przez `src/lib/errorMessages.ts`).
  - Strony Astro odpowiadają za:
    - SSR layout i redirecty zależne od `Astro.locals.user`,
    - przekazanie minimalnego kontekstu/propsów do komponentu React,
    - bezpośredni dostęp do `locals.supabase` tylko po stronie serwera (np. akcje API/server actions).

### 1.3 Integracja nawigacji i akcji
- Po sukcesie:
  - Register → automatyczne zalogowanie (Supabase może zwrócić sesję jeśli `email_confirm` nie jest wymagane) lub komunikat „Sprawdź e‑mail” jeśli włączona weryfikacja; redirect do `/settlements`.
  - Login → redirect do `/settlements`.
  - Forgot password → komunikat potwierdzenia „Jeśli adres istnieje, wysłaliśmy link resetu”.
  - Reset password → komunikat sukcesu i redirect do `/auth/login` lub automatyczny login zależnie od polityki Supabase (zachowujemy bezpieczny wariant: redirect do loginu).
  - Logout → redirect do `/auth/login`.

- Scenariusze błędów (UI):
  - Walidacja klienta (Zod) wyświetla inline messages pod polami.
  - Błędy uwierzytelniania (401) i walidacji (400/422) mapowane do czytelnych komunikatów PL.
  - Błędy serwera (5xx) → ogólny komunikat + retry.
  - Próba edycji przez niewłaściciela → komunikat o braku uprawnień (403), bez ujawniania szczegółów.
  - Próba edycji zamkniętego rozliczenia → komunikat o blokadzie edycji (409, read‑only).

### 1.4 Walidacja formularzy i komunikaty
- Schematy Zod (wspólne): `src/lib/validation/auth.ts`
  - `loginSchema`: { email: email, password: min 8, max 128 }
  - `registerSchema`: { email: email, password: polityka hasła, confirmPassword: equals password }
  - `forgotPasswordSchema`: { email: email }
  - `resetPasswordSchema`: { password: polityka, confirmPassword: equals password }

- Komunikaty PL zgodne z `getValidationErrorMessage` oraz spójny styling shadcn/ui.

### 1.5 Najważniejsze scenariusze (happy path + edge cases)
- Happy paths: rejestracja, logowanie, wylogowanie, reset hasła z linku.
- Edge cases:
  - Niepoprawny link resetu (wygaśnięty/zużyty) → czytelny komunikat i link do „Wyślij ponownie”.
  - Próba wejścia na strony auth będąc zalogowanym → redirect do `/settlements`.
  - Próba wejścia na strony aplikacji bez auth → redirect do `/auth/login`.
  - Błędne poświadczenia → neutralny komunikat („Nieprawidłowy e‑mail lub hasło”).
  - Rate limiting/brute force → generować ogólny błąd i logować zdarzenia.

---

## 2) Logika backendowa

### 2.1 Endpointy API (Astro server routes)
- Katalog: `src/pages/api/auth/`
  - `login.ts` (POST): body `LoginDto`; działanie: walidacja Zod → `locals.supabase.auth.signInWithPassword({ email, password })` → set cookies przez `@supabase/ssr` (obsłuży middleware) → zwraca 200 + minimalny profil sesji; błędy: 400/401/429/5xx.
  - `register.ts` (POST): body `RegisterDto`; działanie: walidacja → `locals.supabase.auth.signUp({ email, password, options })`; jeśli środowisko wymaga potwierdzenia e‑mail, zwróć 202 (Accepted) z komunikatem „Sprawdź e‑mail”; w przeciwnym razie 201 + sesja.
  - `logout.ts` (POST): bez body; działanie: `locals.supabase.auth.signOut()` → 200; bezpiecznie ignorować brak sesji.
  - `forgot-password.ts` (POST): body `ForgotPasswordDto`; działanie: `locals.supabase.auth.resetPasswordForEmail(email, { redirectTo: <origin>/auth/reset-password })` → 202.
  - `reset-password.ts` (POST): body `ResetPasswordDto`; działanie: tylko jeśli Supabase wymaga kończenia resetu po stronie serwera — w standardzie reset kończy się po przekierowaniu i ustawieniu nowego hasła przez front; zachowujemy endpoint jako „adapter” na przyszłość (obecnie może zwracać 501 Not Implemented jeśli nie używany, lub przyjąć token z URL i przekazać do Supabase Admin w trybie serwerowym w środowiskach zamkniętych).

- DTO i schematy walidacji (TS + Zod): `src/types.ts` i `src/lib/validation/auth.ts`
  - `LoginDto` { email: string; password: string }
  - `RegisterDto` { email: string; password: string }
  - `ForgotPasswordDto` { email: string }
  - `ResetPasswordDto` { password: string }

- Zasada: w Astro routes zawsze używać `locals.supabase` (z middleware) i zwracać JSON z odpowiednimi kodami HTTP, bez wycieków wrażliwych treści (np. czy email istnieje).

### 2.2 Mechanizm walidacji
- Na wejściu: Zod parse → w przypadku błędu 400 z listą pól (do UI inline).
- Na wyjściu: standaryzowane błędy z `src/lib/errorMessages.ts` (mapowane po stronie frontu).
- Dodatkowe zabezpieczenia:
  - Normalizacja e‑mail (trim, lower‑case) przed wysłaniem do Supabase.
  - Minimalne logowanie zdarzeń (bez PII) do tabeli `events` gdy to zasadne: `event_type`: `user_registered`, `user_login_failed`, `password_reset_requested` (opcjonalnie w MVP, zgodnie z PRD sekcją analityki po stronie rozliczeń – nie naruszać obecnej logiki zdarzeń, traktować jako rozszerzalne w przyszłości).

### 2.3 Obsługa wyjątków
- Mapowanie kategorii błędów Supabase/Auth:
  - invalid_credentials → 401 z neutralnym komunikatem,
  - email_already_registered → 409,
  - rate_limited → 429,
  - internal → 500.
- Nigdy nie ujawniać, czy e‑mail istnieje w systemie (forgot password).
- Zwracać spójny `ApiError` shape: `{ status, code?, message?, details? }`.

### 2.4 SSR i renderowanie stron
- `astro.config.mjs` pozostaje spójny: `output: "server"`, adapter node standalone; nie wymaga zmian.
- Middleware już inicjuje `@supabase/ssr` i cookie jar — wykorzystujemy to bez modyfikacji.
- Guardy stron (Astro):
  - W stronach wrażliwych (rozliczenia) w `get` handlerze sprawdzać `Astro.locals.user` i redirectować 302 do `/auth/login` przy braku sesji.
  - W stronach auth odwrotnie: redirect 302 do `/settlements` gdy sesja istnieje.

### 2.5 Autoryzacja właścicielska i stan zamknięty
- W API dotyczących rozliczeń/uczestników/wydatków należy egzekwować uprawnienia zgodnie z PRD (US‑006, US‑070):
  - Wymagaj zalogowanego użytkownika (`Astro.locals.user`). Żądania bez sesji → 401/302 do `/auth/login` na poziomie guardów.
  - Weryfikuj dostęp właścicielski do rozliczenia po stronie bazy (np. funkcje `check_settlement_access`, `check_settlement_participation` oraz odpowiednie RLS/polityki, jeśli dostępne w migracjach).
  - Próby edycji przez niewłaściciela → zwracaj 403 (Forbidden) z neutralnym komunikatem.
  - Próby edycji, gdy `status = 'closed'` → zwracaj 409 (Conflict) z komunikatem o zablokowanej edycji; widoki pozostają tylko do odczytu.
- UI powinien mapować 403/409 na polskie komunikaty w `src/lib/errorMessages.ts` i oferować guidance (np. „Rozliczenie jest zamknięte – edycja niedostępna”).

---

## 3) System autentykacji (Supabase Auth + Astro)

### 3.1 Rejestracja (US‑001)
- Front: `RegisterForm.tsx` → POST `/api/auth/register`.
- Back: `signUp` z Supabase SSR klienta (`locals.supabase`). Opcje:
  - `emailRedirectTo`: URL do `/auth/login` (jeśli e‑mail confirm jest aktywny) lub bezpośrednie zalogowanie zależnie od polityki projektu/środowiska.
- Sesja: zarządzana cookie przez `@supabase/ssr` (httpOnly). Czas życia 14 dni (konfiguracja po stronie Supabase – refresh token policy; frontend nie wymusza własnego timera).

### 3.2 Logowanie (US‑002)
- Front: `LoginForm.tsx` → POST `/api/auth/login`.
- Back: `signInWithPassword`. Po sukcesie middleware wyciąga usera i ustawia `locals.user` w kolejnych requestach.

### 3.3 Utrzymanie sesji 14 dni (US‑003)
- Supabase SSR i refresh tokeny w httpOnly cookies.
- Middleware wywołuje `supabase.auth.getUser()` na każde żądanie i w razie ważnej sesji ustawia `locals.user`.
- Strony korzystają z `locals.user` do ochrony tras i kondycji UI.

### 3.4 Wylogowanie (US‑004)
- Front: `LogoutButton.tsx` → POST `/api/auth/logout` → redirect do `/auth/login`.
- Back: `locals.supabase.auth.signOut()` i czyszczenie cookies przez mechanizm SSR.

### 3.5 Reset hasła (US‑005)
- Front: `ForgotPasswordForm.tsx` → POST `/api/auth/forgot-password`.
- Back: `resetPasswordForEmail(email, { redirectTo })` gdzie `redirectTo` wskazuje na `/auth/reset-password`.
- Widok `reset-password.astro` montuje `ResetPasswordForm.tsx`:
  - Supabase w standardzie po kliknięciu linku ustawia „recovery mode” i pozwala zakończyć reset wywołaniem `supabase.auth.updateUser({ password })` po stronie klienta. Alternatywnie można zakończyć reset po stronie serwera (opcjonalny endpoint jak wyżej).
- Komunikaty neutralne („Jeśli adres istnieje…”) by nie ujawniać kont.

---

## 4) Moduły, serwisy, kontrakty

### 4.1 Struktura plików (dodatkowa)
- `src/components/auth/`
  - `LoginForm.tsx`, `RegisterForm.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`, `LogoutButton.tsx`
- `src/pages/auth/`
  - `login.astro`, `register.astro`, `forgot-password.astro`, `reset-password.astro`
- `src/pages/api/auth/`
  - `login.ts`, `register.ts`, `logout.ts`, `forgot-password.ts`, `reset-password.ts` (opcjonalny)
- `src/lib/validation/auth.ts`
  - Zod schematy i helpery formatowania błędów.

### 4.2 Kontrakty (DTO)
- `LoginDto`, `RegisterDto`, `ForgotPasswordDto`, `ResetPasswordDto` w `src/types.ts` (lub wydzielone `src/types.auth.ts` jeśli preferowane; wówczas zaktualizować `always_applied_workspace_rules`).

### 4.3 UI/UX wytyczne
- shadcn/ui: `Input`, `Label`, `Button`, `Form`, `FormField`, `FormMessage`, `Alert`.
- Tailwind 4: spójne odstępy, stany disabled/loading, focus states pod WCAG AA.
- Komunikaty błędów po polsku, neutralne dla bezpieczeństwa.

---

## 5) Zgodność z resztą aplikacji
- Nie zmieniamy istniejących endpointów rozliczeń ani schematu bazy.
- Używamy `locals.supabase` w API routes oraz guardów stron.
- Middleware pozostaje źródłem prawdy o sesji; `PUBLIC_DEFAULT_USER_ID` nadal wspiera dev tryb.
- Nie wprowadzamy globalnego klienta auth poza już istniejącym `src/db/supabase.client.ts` (tylko do usage na kliencie, np. w `ResetPasswordForm.tsx` dla `updateUser`).

---

## 6) Scenariusze testowe (akceptacyjne)
- US‑001: Rejestracja poprawna → (zależnie od polityki) zalogowanie lub komunikat o potwierdzeniu; próba rejestracji istniejącego e‑maila → 409; walidacja haseł.
- US‑002: Logowanie poprawne → redirect do `/settlements`; błędne dane → neutralny błąd.
- US‑003: Sesja utrzymana 14 dni → powrót po czasie krótszym niż TTL nie wymaga loginu.
- US‑004: Logout → usunięte cookies, redirect do loginu; idempotencja.
- US‑005: Forgot password → zawsze 202; Reset password z niepoprawnym linkiem → komunikat; poprawny reset → możliwość logowania nowym hasłem.
 - US‑006: Próba edycji przez niewłaściciela → 403; widok pozostaje read‑only; komunikat PL.
 - US‑070: Próba edycji zamkniętego rozliczenia → 409; akcje edycji ukryte/zablokowane w UI; widoki prezentują bilans.

### 6.1) Testy E2E (Playwright)

#### Testy formularza logowania (US‑002)
- **Ścieżka**: `tests/e2e/specs/auth.login.spec.ts` → sekcja: `Authentication - Login`
- **Zaimplementowane testy** (11 testów):
  1. `should display login form with all required fields` – weryfikacja widoczności wszystkich elementów formularza.
  2. `should display helper links on login page` – sprawdzenie linków do resetowania hasła i rejestracji.
  3. `should accept valid credentials in form fields` – test akceptacji poprawnych danych bez submisji.
  4. `should validate email format on form submission` – walidacja emaila (puste pole).
  5. `should display error message with empty password field` – walidacja hasła (puste pole).
  6. `should display error message with invalid credentials` – obsługa błędów logowania (401).
  7. `should show loading state on submit button` – sprawdzenie stanu buttona przed submisją.
  8. `should navigate to register page via link` – nawigacja do strony rejestracji.
  9. `should navigate to forgot password page via link` – nawigacja do resetowania hasła.
  10. `should persist email field value after password input` – trwałość wartości pola email.
  11. `should clear email field when backspaced` – czyszczenie pola email.

- **Warunki wstępne**: 
  - Formularz logowania dostępny na `/auth/login`.
  - Dane testowe: `E2E_USERNAME` i `E2E_PASSWORD` pobierane z `.env.test`.
  - LoginPage POM w `tests/e2e/pages/auth/LoginPage.ts`.

- **Wykonanie**: `bun run test:e2e -- auth.login.spec.ts`

#### Testy dostępu do strony settlements (US‑002/US‑003)
- **Ścieżka**: `tests/e2e/specs/auth.login.spec.ts` → sekcja: `Authentication - Settlements Page Access`
- **Zaimplementowane testy** (3 testy):
  1. `should redirect to login when accessing settlements without authentication` – weryfikacja przekierowania na login dla niezalogowanego użytkownika.
  2. `should show settlements list page structure` – sprawdzenie struktury strony settlements.
  3. `should have settlements list page with proper data-testid attributes` – weryfikacja obecności elementów do testowania.

- **Warunki wstępne**:
  - Strona settlements na `/settlements` (wymaga autentykacji).
  - SettlementsListPage POM w `tests/e2e/pages/settlements/SettlementsListPage.ts`.

- **Oczekiwane rezultaty**:
  - Niezalogowany użytkownik jest przekierowany na `/auth/login`.
  - Zalogowany użytkownik widzi stronę settlements z listą rozliczeń lub komunikatem o braku.
  - Strona zawiera elementy z `data-testid` dla automatyzacji testów.

- **Notatka**: Testy weryfikują zarówno security (auth guards) jak i strukturę UI. Pełna integracja logowania z rzeczywistą bazą wymagałaby aktywnego użytkownika testowego w Supabase.

---

## 7) Konfiguracja i bezpieczeństwo
- Zmienne środowiskowe: `SUPABASE_URL`, `SUPABASE_KEY` (już używane), `PUBLIC_DEFAULT_USER_ID` tylko w dev.
- `redirectTo` dla resetu musi wskazywać pełny origin (produkcyjny i dev) – pobierany z nagłówków/requestu lub `PUBLIC_SITE_URL`.
- Cookies httpOnly, Secure (prod), SameSite=Lax/Strict w zależności od domeny.
- Brak ujawniania istnienia kont w odpowiedziach API.

---

## 8) Wpływ na nawigację i middleware
- Layout i strony auth korzystają z `locals.user` do warunkowania UI i redirectów.
- `astro.config.mjs` bez zmian; SSR i adapter node zostają.
- Wybrane strony (np. `src/pages/index.astro`) mogą pozostać publiczne, ale linki do aplikacji prowadzą do loginu jeśli brak sesji.
