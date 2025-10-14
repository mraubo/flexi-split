Jesteś generatorem Proof of Concept. Zbuduj absolutnie minimalny PoC aplikacji FlexiSplit, wyłącznie w React + TypeScript (bez Astro, bez backendu, bez Supabase, bez Tailwind/shadcn). Celem PoC jest wyłącznie weryfikacja podstawowego przepływu:

1. Utworzenie rozliczenia (Settlement) z nazwą
2. Dodanie uczestnika offline (Participant) z unikalną nazwą
3. Dodanie wydatku (Expense) z równym podziałem między aktualnych uczestników
4. Zamknięcie rozliczenia i wyliczenie listy przelewów minimalizujących liczbę płatności (Minimum Cash Flow)

Najpierw przygotuj i pokaż do akceptacji krótki plan (nie twórz jeszcze kodu). Plan ma zawierać:

- Architektura i foldery (np. src/components, src/models, src/state)
- Model danych (TS interfaces): Settlement, Participant, Expense, Transfer
- Zakres UI i nawigacja (jedna prosta strona + proste formularze)
- Opis algorytmu: liczenie sald w groszach i MCF (deterministyczne)
- Lista ekranów/komponentów i zdarzeń (minimalna)
- Prosty scenariusz testu manualnego E2E (kroki kliknięć)
- Szacowany czas wykonania (krótko)
  Po mojej akceptacji dopiero przejdź do implementacji.

Zakres funkcjonalny (TYLKO to):

- Utworzenie rozliczenia: formularz z nazwą; po utworzeniu pokazuj widok rozliczenia
- Dodanie uczestnika offline: formularz „imię/nick”, nazwy unikalne w ramach rozliczenia
- Dodanie wydatku: pola „płacący (select z uczestników)”, „kwota (PLN)”, „opis (tekst)”; równy podział na wszystkich aktualnych uczestników; brak wykluczeń
- Zamknięcie rozliczenia: przycisk, który:
  - blokuje dalsze edycje
  - liczy salda w groszach: kwota → int (np. 12.34 PLN → 1234)
  - liczy listę przelewów algorytmem Minimum Cash Flow:
    - baza: klasyczny greedy: wybierz max wierzyciela i max dłużnika, przelej min(|saldo|), aktualizuj, powtarzaj aż do wyzerowania
    - deterministyczność: sortuj po malejącym |saldo|, a przy remisach po participantId (rosnąco)
- Widok podsumowania po zamknięciu: lista sald uczestników oraz lista przelewów (kto → komu, kwota)

Poza zakresem (wyklucz w całości):

- Zaproszenia/tokeny, TTL, logi zmian, analityka, archiwum, współbieżność/wersjonowanie, uprawnienia, eksport/kopiowanie do schowka, i18n/format liczb PL, edycje/usuwanie wydatków po zamknięciu, wykluczenia uczestników z wydatku, jakiekolwiek backendy/SDK/CI/CD/testy automatyczne. Zero zewnętrznych UI bibliotek.

Wymagania implementacyjne:

- Technologia: React 19 + TypeScript 5; bundler: Vite; Node LTS
- Styl: minimalny CSS (inline lub prosta globalna), mobile‑first
- Stan: in-memory (useState/useReducer + React Context), bez localStorage
- Walidacja: kwota > 0; nazwy uczestników unikalne
- Obliczenia wyłącznie w groszach (int). Zaokrąglenia: parsuj kwotę do dwóch miejsc i przeliczaj na grosze; podział równy, suma części = kwota (możesz rozdać grosze nadwyżki po indeksie uczestnika)
- Teksty UI po polsku, proste i krótkie
- Brak routera – wszystko na jednej stronie

Deliverables po akceptacji planu:

- Struktura projektu (Vite), gotowe do uruchomienia: npm run dev
- Komponenty:
  - SettlementCreateForm
  - ParticipantAddForm
  - ExpenseAddForm
  - SummaryView (widok sald i przelewów po zamknięciu)
- Logika:
  - utils/money.ts (konwersje PLN↔grosze)
  - utils/mcf.ts (MCF z deterministycznymi remisami)
  - state/store.tsx (prosty Context + reducer)
- Instrukcja uruchomienia w README (3–4 linie)

Scenariusz testu manualnego (do wykonania w przeglądarce):

1. Utwórz rozliczenie „Wyjazd weekendowy”
2. Dodaj uczestników: „Ala”, „Bartek”
3. Dodaj wydatek: płacący „Ala”, kwota 120.00, opis „Zakupy”
4. Dodaj uczestnika „Celina”
5. Dodaj wydatek: płacący „Bartek”, kwota 60.00, opis „Bilety”
6. Zamknij rozliczenie; sprawdź listę sald i minimalnych przelewów
7. Spróbuj dodać kolejny wydatek – powinno być zablokowane

Bardzo ważne:

- Najpierw pokaż plan i zapytaj o akceptację. Nie generuj kodu przed moim „OK”.
- Po akceptacji wygeneruj kod w jednym przebiegu, trzymając się powyższych ograniczeń.
