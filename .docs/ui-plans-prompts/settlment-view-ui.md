Jako starszy programista frontendu Twoim zadaniem jest stworzenie szczegółowego planu wdrożenia nowego widoku w aplikacji internetowej. Plan ten powinien być kompleksowy i wystarczająco jasny dla innego programisty frontendowego, aby mógł poprawnie i wydajnie wdrożyć widok.

Najpierw przejrzyj następujące informacje:

1. Product Requirements Document (PRD):
<prd>
# Dokument wymagań produktu (PRD) - FlexiSplit

## 1. Przegląd produktu

FlexiSplit to prosta aplikacja webowa do sprawnego rozliczania wspólnych kosztów po jednorazowych wydarzeniach (np. wyjazdy, imprezy rodzinne). Umożliwia właścicielowi rozliczenia dodawanie uczestników (offline, bez kont), rejestrowanie wydatków z wyborem płacącego, automatyczny równy podział kosztów oraz wygenerowanie bilansu i listy przelewów minimalizującej liczbę transakcji. Po zamknięciu rozliczenie trafia do archiwum, a edycja jest zablokowana.

Założenia MVP obejmują:

- Logowanie wymagane dla właściciela (konto e‑mail + hasło, sesja 14 dni).
- Jeden właściciel na rozliczenie, tylko właściciel może edytować.
- Uczestnicy jako byty offline (nick w ramach rozliczenia, bez kont).
- Waluta PLN; wartości przechowywane w groszach; prezentacja zgodnie z pl‑PL.
- 3‑etapowy przepływ: Uczestnicy → Koszty → Podsumowanie → Zamknięcie.

## 2. Problem użytkownika

Ręczne rozliczanie wspólnych kosztów jest skomplikowane i podatne na błędy, co prowadzi do nieporozumień oraz poczucia niesprawiedliwości. Użytkownicy potrzebują prostego, jednoznacznego i sprawiedliwego sposobu na podział kosztów po jednorazowych wydarzeniach, który:

- redukuje ryzyko błędów i sporów,
- jest szybki i czytelny na urządzeniach mobilnych,
- jasno pokazuje, kto komu ile powinien zapłacić,
- uniemożliwia modyfikacje po finalizacji, chroniąc integralność rozliczenia.

## 3. Wymagania funkcjonalne

3.1 Konta i sesje

- Rejestracja i logowanie e‑mail + hasło przez Supabase Auth; sesja ważna 14 dni.
- Możliwość wylogowania; opcjonalny reset hasła.
- Brak trybu anonimowego w MVP.

  3.2 Rozliczenia

- Tworzenie i listowanie rozliczeń; maks. 3 aktywne rozliczenia na użytkownika.
- Statusy: open/closed; zamknięcie przenosi do archiwum i blokuje edycję.
- Usuwanie wyłącznie rozliczeń archiwalnych; brak przywracania.

  3.3 Uczestnicy

- Dodawanie/edycja/usuwanie uczestników offline w ramach rozliczenia.
- Unikalne nicki (case‑insensitive, a‑z, 0‑9, „-”, „\_”) w obrębie rozliczenia.
- Limit: do 10 uczestników.
- Widoczna etykieta „Właściciel” przy nicku właściciela.

  3.4 Wydatki

- Dodawanie/edycja/usuwanie wydatków przez właściciela do momentu zamknięcia.
- Wybór płacącego z listy uczestników; domyślnie wszyscy biorą udział w podziale z możliwością odznaczania.
- Opis wydatku opcjonalny, do 140 znaków.
- Limit: do 500 wydatków na rozliczenie.
- Lista wydatków grupowana po dacie; na pozycji: płacący, kwota, liczba osób w podziale, skrót opisu.
- Filtrowanie listy po osobie.
- Wartości w groszach, wprowadzanie z separatorem dziesiętnym, prezentacja w pl‑PL.

  3.5 Rozliczanie i bilans

- Podział na równe części; reszta groszy przydzielana deterministycznie pierwszym N osobom wg znormalizowanego nicku.
- Generowanie bilansu „kto komu ile” minimalizującego liczbę przelewów; stabilne sortowanie wyników.
- Podgląd sald per osoba oraz lista przelewów.
- Funkcja „Kopia podsumowania” (nagłówek, saldo per osoba, lista przelewów) kopiująca tekst do schowka po zamknięciu.

  3.6 Uprawnienia i audyt

- Edycje dozwolone wyłącznie dla właściciela rozliczenia.
- Pola audytowe: updated_at i last_edited_by.

  3.7 Analityka

- Logowanie zdarzeń po stronie serwera w Supabase: settlement_created, participant_added, expense_added, settle_confirmed, settled, summary_copied, new_settlement_started.
- Środowiska: dev/lokalne i prod.

  3.8 Dostępność i UX

- Mobile‑first; klawiatura numeryczna dla kwot; puste stany z jasnymi wezwaniami do działania; zgodność z WCAG AA.

## 4. Granice produktu

- Brak zapraszania uczestników, dołączania przez link/e‑mail/kod (uczestnicy offline).
- Brak rozliczeń cyklicznych lub miesięcznych.
- Brak przekazania roli właściciela.
- Brak integracji płatności, wielu walut i automatycznych kursów (PLN only).
- Brak zaawansowanych statystyk, raportów i eksportów poza podstawowym podsumowaniem.
- Brak powiadomień push.
- Brak dodawania zdjęć paragonów.
- Brak edycji zamkniętych rozliczeń (zamknięcie jest nieodwracalne w MVP).
- Brak niestandardowych podziałów kosztów i wielu płacących w jednym wydatku (zawsze równy podział i pojedynczy płacący).
- Brak szkiców rozliczeń; statusy wyłącznie open/closed.
- Weryfikacja e‑mail podczas rejestracji do potwierdzenia; polityki rate‑limiting i blokad logowania do doprecyzowania poza MVP.
- Concurrency: w MVP domyślnie ostatni zapis wygrywa; mechanizmy blokad do rozważenia poza MVP.

## 5. Historyjki użytkowników

US‑001

Tytuł: Rejestracja konta

Opis: Jako nowy użytkownik chcę zarejestrować konto e‑mail + hasło, aby móc tworzyć i zarządzać rozliczeniami.

Kryteria akceptacji:

- Formularz rejestracji wymaga poprawnego e‑maila i hasła zgodnego z polityką.
- Po sukcesie użytkownik jest zalogowany i widzi listę rozliczeń.
- W przypadku błędów walidacji użytkownik otrzymuje czytelne komunikaty.

US‑002

Tytuł: Logowanie

Opis: Jako zarejestrowany użytkownik chcę się zalogować e‑mail + hasło, aby uzyskać dostęp do moich rozliczeń.

Kryteria akceptacji:

- Poprawne dane logują i przekierowują do listy rozliczeń.
- Błędne dane zwracają komunikat o niepowodzeniu bez ujawniania, które pole jest niepoprawne.
- Włączona jest pamięć sesji przez 14 dni.

US‑003

Tytuł: Utrzymanie sesji 14 dni

Opis: Jako zalogowany użytkownik chcę pozostać zalogowany przez 14 dni bez ponownego logowania.

Kryteria akceptacji:

- Tokeny sesyjne są odświeżane zgodnie z polityką i działają 14 dni.
- Sesja jest przechowywana w bezpiecznych httpOnly cookie.
- Po upływie 14 dni wymagana jest ponowna autoryzacja.

US‑004

Tytuł: Wylogowanie

Opis: Jako użytkownik chcę się wylogować, aby zakończyć bieżącą sesję na tym urządzeniu.

Kryteria akceptacji:

- Akcja wylogowania usuwa tokeny i przekierowuje do ekranu logowania.
- Po wylogowaniu dostęp do widoków zabezpieczonych jest zablokowany.

US‑005

Tytuł: Reset hasła

Opis: Jako użytkownik chcę zresetować hasło, gdy je zapomnę.

Kryteria akceptacji:

- Formularz resetu weryfikuje e‑mail i wysyła link resetu (jeśli mechanizm dostępny w środowisku).
- Po ustawieniu nowego hasła możliwe jest standardowe logowanie.

US‑006

Tytuł: Autoryzacja właścicielska

Opis: Jako właściciel rozliczenia chcę mieć wyłączne prawo edycji, aby zachować spójność danych.

Kryteria akceptacji:

- Edycje uczestników i wydatków są dostępne tylko dla właściciela.
- Użytkownicy niebędący właścicielem widzą dane w trybie tylko do odczytu.
- Próby edycji przez niewłaściciela zwracają błąd autoryzacji.

US‑010

Tytuł: Utworzenie rozliczenia

Opis: Jako właściciel chcę utworzyć nowe rozliczenie, aby rozpocząć podział kosztów.

Kryteria akceptacji:

- Utworzenie zwiększa licznik aktywnych; jeśli osiągnięto limit 3, akcja jest blokowana z komunikatem.
- Nowe rozliczenie ma status open i jest widoczne na liście aktywnych.

US‑011

Tytuł: Lista rozliczeń

Opis: Jako właściciel chcę widzieć listę moich rozliczeń (aktywne i archiwalne).

Kryteria akceptacji:

- Lista pokazuje min. nazwę, status, liczbę uczestników i wydatków.
- Dostępne są zakładki/filtry: Aktywne, Archiwum.

US‑012

Tytuł: Szczegóły rozliczenia

Opis: Jako właściciel chcę wejść w szczegóły rozliczenia, aby zarządzać uczestnikami i wydatkami.

Kryteria akceptacji:

- Widok zawiera 3 kroki: Uczestnicy → Koszty → Podsumowanie.
- Dostępne są akcje odpowiednie do statusu open/closed.

US‑013

Tytuł: Zamknięcie rozliczenia

Opis: Jako właściciel chcę zamknąć rozliczenie po akceptacji, aby zablokować edycję i wygenerować bilans.

Kryteria akceptacji:

- Przed zamknięciem wyświetla się modal potwierdzenia z liczbą kosztów i datą oraz informacją o nieodwracalności.
- Po zamknięciu status zmienia się na closed, edycja jest zablokowana, rozliczenie trafia do archiwum.

US‑014

Tytuł: Usunięcie rozliczenia archiwalnego

Opis: Jako właściciel chcę móc usunąć rozliczenie z archiwum, gdy nie jest już potrzebne.

Kryteria akceptacji:

- Usunięcie dostępne wyłącznie dla closed; akcja nieodwracalna.
- Po usunięciu rozliczenie znika z listy i nie jest dostępne przez UI.

US‑020

Tytuł: Dodanie uczestnika

Opis: Jako właściciel chcę dodać uczestnika (nick), aby uwzględnić go w podziale kosztów.

Kryteria akceptacji:

- Walidacja unikalności nicka w ramach rozliczenia (case‑insensitive).
- Dozwolone znaki: a‑z, 0‑9, „-”, „\_”.
- Po przekroczeniu limitu 10 dodawanie jest zablokowane z komunikatem.

US‑021

Tytuł: Edycja uczestnika

Opis: Jako właściciel chcę edytować nick uczestnika przed zamknięciem rozliczenia.

Kryteria akceptacji:

- Zmiana nicka przestrzega walidacji unikalności i wzorca znaków.
- Aktualizacje są widoczne w listach i w istniejących wydatkach.

US‑022

Tytuł: Usunięcie uczestnika

Opis: Jako właściciel chcę usunąć uczestnika przed zamknięciem, jeśli to konieczne.

Kryteria akceptacji:

- Usuwanie dostępne tylko dla statusu open.
- System zapobiega stanom niespójnym (np. usuwa udział w niezależnych wydatkach lub blokuje akcję z komunikatem, zgodnie z przyjętą implementacją).

US‑023

Tytuł: Walidacja i podpowiedź nicka

Opis: Jako właściciel chcę widzieć informację o kolizji nicka i otrzymać proponowaną alternatywę z sufiksem.

Kryteria akceptacji:

- Podczas wpisywania system sygnalizuje kolizję i proponuje wolny wariant.

US‑025

Tytuł: Widoczność roli właściciela

Opis: Jako uczestnik chcę wiedzieć, kto jest właścicielem rozliczenia.

Kryteria akceptacji:

- Przy nicku właściciela widoczny jest badge „Właściciel”.

US‑030

Tytuł: Dodanie wydatku

Opis: Jako właściciel chcę dodać wydatek z wyborem płacącego i domyślnym udziałem wszystkich.

Kryteria akceptacji:

- Formularz zawiera: kwotę, płacącego, listę uczestników z checkboxami, opcjonalny opis (≤140 znaków), datę.
- Domyślnie zaznaczeni są wszyscy uczestnicy; można odznaczać pojedyncze osoby.
- Po zapisie wydatek pojawia się na liście grupowanej po dacie.

US‑031

Tytuł: Edycja wydatku

Opis: Jako właściciel chcę edytować istniejący wydatek przed zamknięciem rozliczenia.

Kryteria akceptacji:

- Edycja dostępna dla open; pola walidowane jak przy dodawaniu.
- Zmiany aktualizują bilans w podsumowaniu.

US‑032

Tytuł: Usunięcie wydatku

Opis: Jako właściciel chcę usunąć wydatek przed zamknięciem rozliczenia.

Kryteria akceptacji:

- Usuwanie dostępne dla open; po usunięciu bilans i lista są aktualizowane.

US‑033

Tytuł: Opis wydatku i ograniczenia

Opis: Jako właściciel chcę dodać krótki opis, aby ułatwić identyfikację wydatku.

Kryteria akceptacji:

- Opis jest opcjonalny i ograniczony do 140 znaków; walidacja działa w formularzu.

US‑034

Tytuł: Filtrowanie po osobie

Opis: Jako właściciel chcę przefiltrować listę wydatków po wybranej osobie.

Kryteria akceptacji:

- Filtr ogranicza listę do wydatków, w których osoba była płacącym lub uczestnikiem podziału.

US‑035

Tytuł: Wejście w szczegóły wydatku

Opis: Jako właściciel chcę wejść w szczegóły wydatku, aby zobaczyć pełny udział i opis.

Kryteria akceptacji:

- Widok zawiera: płacącego, kwotę, listę uczestników w podziale, jednostkową część kosztu, opis.

US‑036

Tytuł: Edge case – wydatek jednoosobowy

Opis: Jako właściciel chcę móc zarejestrować wydatek z udziałem tylko jednej osoby.

Kryteria akceptacji:

- System poprawnie rejestruje wydatek i nie dzieli kwoty.

US‑037

Tytuł: Wprowadzanie i prezentacja kwot

Opis: Jako użytkownik chcę wprowadzać kwoty wygodnie na mobile, a system ma przechowywać wartości w groszach.

Kryteria akceptacji:

- Pole kwoty używa klawiatury numerycznej i akceptuje separator dziesiętny.
- Wartości są przechowywane w groszach; prezentacja zgodna z locale pl‑PL.

US‑040

Tytuł: Obliczanie podziału i reszt groszy

Opis: Jako właściciel chcę, aby podział był równy, a reszta groszy przydzielana deterministycznie wg znormalizowanych nicków.

Kryteria akceptacji:

- Algorytm dzieli koszt na równe części w groszach i przydziela resztę pierwszym N osobom zgodnie z deterministyczną kolejnością.
- Wynik jest stabilny i powtarzalny dla tych samych danych wejściowych.

US‑041

Tytuł: Minimalizacja liczby przelewów

Opis: Jako właściciel chcę skróconą listę przelewów minimalizującą liczbę transakcji.

Kryteria akceptacji:

- Algorytm nettingu redukuje liczbę transakcji i zwraca listę posortowaną stabilnie.
- Suma kwot do zapłaty równa się sumie kwot do otrzymania (kontrola sum).

US‑042

Tytuł: Salda per osoba

Opis: Jako uczestnik chcę zobaczyć swoje saldo po zamknięciu rozliczenia.

Kryteria akceptacji:

- Widok prezentuje salda każdej osoby w PLN z dokładnością do grosza.

US‑043

Tytuł: Kopia podsumowania do schowka

Opis: Jako właściciel chcę skopiować podsumowanie po zamknięciu, aby łatwo udostępnić je uczestnikom.

Kryteria akceptacji:

- Kliknięcie „Kopia podsumowania” kopiuje tekst zawierający nagłówek, salda per osoba i listę przelewów do schowka.

US‑050

Tytuł: Archiwum rozliczeń

Opis: Jako właściciel chcę przeglądać zakończone rozliczenia i ich bilans.

Kryteria akceptacji:

- Archiwum prezentuje listę closed; wejście w szczegóły pokazuje bilans i listę przelewów.

US‑060

Tytuł: Audyt edycji

Opis: Jako właściciel chcę, aby system rejestrował updated_at i last_edited_by przy każdej zmianie.

Kryteria akceptacji:

- Pola audytowe aktualizują się przy dodawaniu/edycji/usuwaniu danych.

US‑061

Tytuł: Zdarzenia analityczne

Opis: Jako właściciel produktu chcę śledzić kluczowe zdarzenia, aby mierzyć lejek aktywacji i sukces produktu.

Kryteria akceptacji:

- Emisja zdarzeń po stronie serwera: settlement_created, participant_added, expense_added, settle_confirmed, settled, summary_copied, new_settlement_started.
- Zdarzenia zawierają minimalny kontekst (ID rozliczenia, liczebności, timestamp).

US‑070

Tytuł: Blokada edycji po zamknięciu

Opis: Jako właściciel chcę mieć pewność, że zamknięte rozliczenie jest tylko do odczytu.

Kryteria akceptacji:

- Wszystkie akcje edycji uczestników i wydatków są niedostępne dla closed.
- Próby modyfikacji zwracają komunikat o blokadzie.

US‑071

Tytuł: Walidacja kwot

Opis: Jako właściciel chcę, aby kwoty były walidowane jako dodatnie i poprawnie sformatowane.

Kryteria akceptacji:

- Minimalna jednostka to 0,01 PLN; kwoty ujemne lub 0 są odrzucane.
- Prezentacja kwot zgodna z locale pl‑PL.

US‑072

Tytuł: Puste stany i przewodnictwo

Opis: Jako użytkownik chcę widzieć jasne komunikaty w pustych stanach, aby wiedzieć, co robić dalej.

Kryteria akceptacji:

- Po utworzeniu rozliczenia widoczne są CTA: „Dodaj pierwszego uczestnika” i „Dodaj pierwszy koszt”.

US‑073

Tytuł: Dostępność i mobile

Opis: Jako użytkownik mobilny chcę wygodnej obsługi formularzy i czytelnych kontrastów.

Kryteria akceptacji:

- Duże pola dotykowe, fokus klawiatury na kolejne pole, kontrast czytelny.
- Pola kwot oferują klawiaturę numeryczną.

US‑074

Tytuł: Filtrowanie i sortowanie stabilne

Opis: Jako użytkownik chcę przewidywalnego sortowania list i filtrów.

Kryteria akceptacji:

- Listy wydatków są grupowane po dacie i sortowane stabilnie; filtry nie zmieniają kolejności w ramach grupy.

US‑075

Tytuł: Obsługa błędów i komunikaty

Opis: Jako użytkownik chcę jasnych, przyjaznych komunikatów błędów.

Kryteria akceptacji:

- Błędy walidacji i uprawnień są komunikowane po polsku, bez żargonu księgowego.

## 6. Metryki sukcesu

- 50 zakończonych rozliczeń (unikalne) w pierwszym miesiącu produkcyjnym; źródło: liczba zdarzeń settled.
- Co najmniej 20% użytkowników tworzy kolejne rozliczenie w ciągu 3 miesięcy; źródło: cohorty z ≥2 zdarzeniami settled.
- Pozytywny feedback o prostocie: ankiety NPS/PMF po settled oraz medianowy czas do pierwszego rozliczenia.
- Lejek aktywacji: settlement_created → participant_added → expense_added → settle_confirmed → settled; monitorowane drop‑off i mediany czasu między etapami.
  -- Jakość danych: średnia liczba wydatków/rozliczenie, średnia liczba uczestników, użycie filtra po osobie, użycie „summary_copied”.

</prd>

2. Opis widoku:
<view_description>
- Nazwa widoku: Szczegóły rozliczenia (route kontener)
- Ścieżka widoku: /settlements/:id
- Główny cel: Prowadzić przez kroki Uczestnicy → Koszty → Podsumowanie i prezentować status open/closed (US‑012, US‑070).
- Kluczowe informacje do wyświetlenia: tytuł rozliczenia, status, stepper/zakładki, badge „Właściciel” przy odpowiednim nicku, stan blokady edycji.
- Kluczowe komponenty widoku: nagłówek z tytułem i statusem, stepper/zakładki, toast center, banner read‑only po zamknięciu; połączenia API: GET /settlements/{id}, PUT /settlements/{id}.
- UX, dostępność i względy bezpieczeństwa: stepper jako nawigacja z aria‑current, wyłączenie akcji dla closed, informacja o braku uprawnień dla niewłaściciela.
</view_description>

3. User Stories:
<user_stories>
US‑012

Tytuł: Szczegóły rozliczenia

Opis: Jako właściciel chcę wejść w szczegóły rozliczenia, aby zarządzać uczestnikami i wydatkami.

Kryteria akceptacji:

- Widok zawiera 3 kroki: Uczestnicy → Koszty → Podsumowanie.
- Dostępne są akcje odpowiednie do statusu open/closed.

US‑070

Tytuł: Blokada edycji po zamknięciu

Opis: Jako właściciel chcę mieć pewność, że zamknięte rozliczenie jest tylko do odczytu.

Kryteria akceptacji:

- Wszystkie akcje edycji uczestników i wydatków są niedostępne dla closed.
- Próby modyfikacji zwracają komunikat o blokadzie.
</user_stories>

4. Endpoint Description:
<endpoint_description>
#### GET /settlements/{id}

- **Description**: Retrieve single settlement details
- **Response Structure**: Same as GET /settlements item
- **Success Codes**: 200 OK
- **Error Codes**: 401 Unauthorized, 403 Forbidden, 404 Not Found

#### PUT /settlements/{id}

- **Description**: Update settlement (only title, only if status='open')
- **Request Body**:

```json
{
  "title": "string (max 100 chars, required)"
}
```

- **Response Structure**: Same as GET /settlements item
- **Success Codes**: 200 OK
- **Error Codes**: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity (closed settlement)
</endpoint_description>

5. Endpoint Implementation:
<endpoint_implementation>
import type { APIRoute } from "astro";
import { UUIDSchema, UpdateSettlementSchema } from "@/lib/validation/settlements.ts";
import {
  deleteSettlementSoft,
  getSettlementById,
  checkAccessOrExistence,
  updateSettlementTitle,
} from "@/lib/services/settlements.service.ts";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    // Get supabase client and user from context
    const { supabase, user } = context.locals;

    // Check authentication
    if (!user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "unauthorized",
            message: "authentication required",
          },
        }),
        {
          status: 401,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Get and validate the settlement ID from path parameters
    const { id } = context.params;
    if (!id) {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_request",
            message: "settlement ID is required",
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Validate UUID format
    const uuidValidation = UUIDSchema.safeParse(id);
    if (!uuidValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_uuid",
            message: "invalid settlement ID format",
            details: uuidValidation.error.issues,
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Check access and existence to properly distinguish 403 vs 404
    const accessCheck = await checkAccessOrExistence(supabase, id, user.id);

    if (!accessCheck.exists) {
      // Settlement doesn't exist - return 404
      return new Response(
        JSON.stringify({
          error: {
            code: "not_found",
            message: "settlement not found",
          },
        }),
        {
          status: 404,
          headers: { "content-type": "application/json" },
        }
      );
    }

    if (!accessCheck.accessible) {
      // Settlement exists but user doesn't have access - return 403
      return new Response(
        JSON.stringify({
          error: {
            code: "forbidden",
            message: "insufficient permissions",
          },
        }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // User has access, fetch the settlement details
    const settlement = await getSettlementById(supabase, id);

    return new Response(JSON.stringify(settlement), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error: unknown) {
    // Map service errors to appropriate HTTP status codes
    let status = 500;
    let code = "server_error";
    let message = "An unexpected error occurred";

    const errorMessage = error instanceof Error ? error.message : "";

    if (errorMessage.includes("Settlement not found")) {
      status = 404;
      code = "not_found";
      message = "settlement not found";
    } else if (errorMessage.includes("Forbidden")) {
      status = 403;
      code = "forbidden";
      message = "insufficient permissions";
    }

    return new Response(
      JSON.stringify({
        error: {
          code,
          message,
        },
      }),
      {
        status,
        headers: { "content-type": "application/json" },
      }
    );
  }
};

export const DELETE: APIRoute = async (context) => {
  try {
    // Get supabase client and user from context
    const { supabase, user } = context.locals;

    // Check authentication
    if (!user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "unauthorized",
            message: "authentication required",
          },
        }),
        {
          status: 401,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Get and validate the settlement ID from path parameters
    const { id } = context.params;
    if (!id) {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_request",
            message: "settlement ID is required",
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Validate UUID format
    const uuidValidation = UUIDSchema.safeParse(id);
    if (!uuidValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_uuid",
            message: "invalid settlement ID format",
            details: uuidValidation.error.issues,
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Call service to perform soft delete
    await deleteSettlementSoft(supabase, id, user.id);

    // Return 204 No Content on success (no body, no Content-Length header)
    return new Response(null, {
      status: 204,
      headers: {},
    });
  } catch (error: unknown) {
    // Map service errors to appropriate HTTP status codes
    let status = 500;
    let code = "server_error";
    let message = "An unexpected error occurred";

    const errorMessage = error instanceof Error ? error.message : "";

    if (errorMessage.includes("Settlement not found")) {
      status = 404;
      code = "not_found";
      message = "settlement not found";
    } else if (errorMessage.includes("Forbidden")) {
      status = 403;
      code = "forbidden";
      message = "insufficient permissions";
    } else if (errorMessage.includes("Unprocessable Content")) {
      status = 422;
      code = "unprocessable_content";
      message = "settlement is not closed";
    }

    return new Response(
      JSON.stringify({
        error: {
          code,
          message,
        },
      }),
      {
        status,
        headers: { "content-type": "application/json" },
      }
    );
  }
};

export const PUT: APIRoute = async (context) => {
  try {
    // Get supabase client and user from context
    const { supabase, user } = context.locals;

    // Check authentication
    if (!user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "unauthorized",
            message: "authentication required",
          },
        }),
        {
          status: 401,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Get and validate the settlement ID from path parameters
    const { id } = context.params;
    if (!id) {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_request",
            message: "settlement ID is required",
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Validate UUID format
    const uuidValidation = UUIDSchema.safeParse(id);
    if (!uuidValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_uuid",
            message: "invalid settlement ID format",
            details: uuidValidation.error.issues,
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_json",
            message: "invalid JSON in request body",
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Validate the request body against the schema
    const bodyValidation = UpdateSettlementSchema.safeParse(requestBody);
    if (!bodyValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "request body validation failed",
            details: bodyValidation.error.issues,
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Update the settlement title
    const updatedSettlement = await updateSettlementTitle(supabase, id, bodyValidation.data.title, user.id);

    return new Response(JSON.stringify(updatedSettlement), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error: unknown) {
    // Map service errors to appropriate HTTP status codes
    let status = 500;
    let code = "server_error";
    let message = "An unexpected error occurred";

    const errorMessage = error instanceof Error ? error.message : "";

    if (errorMessage.includes("Settlement not found")) {
      status = 404;
      code = "not_found";
      message = "settlement not found";
    } else if (errorMessage.includes("Forbidden")) {
      status = 403;
      code = "forbidden";
      message = "insufficient permissions";
    } else if (errorMessage.includes("Unprocessable Entity")) {
      status = 422;
      code = "unprocessable_entity";
      message = "settlement is not open";
    }

    return new Response(
      JSON.stringify({
        error: {
          code,
          message,
        },
      }),
      {
        status,
        headers: { "content-type": "application/json" },
      }
    );
  }
};

</endpoint_implementation>

6. Type Definitions:
<type_definitions>
import type { Tables } from "@/db/database.types";

// Shared foundational scalar aliases. These align with DB column types but
// provide semantic meaning across DTOs and command models.
export type UUID = string;
export type TimestampString = string;
export type DateString = string;
export type AmountCents = number;

export type SortOrder = "asc" | "desc";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PagedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// Base DB row bindings for derivation. These keep DTOs connected to entities.
type SettlementRow = Tables<"settlements">;
type ParticipantRow = Tables<"participants">;
type ExpenseRow = Tables<"expenses">;
type SettlementSnapshotRow = Tables<"settlement_snapshots">;
type EventRow = Tables<"events">;

// -----------------------------
// Settlements - DTOs
// -----------------------------

// Shared fields used by multiple Settlement DTOs
type SettlementBaseFields = Pick<
  SettlementRow,
  | "id"
  | "title"
  | "status"
  | "currency"
  | "participants_count"
  | "expenses_count"
  | "created_at"
  | "updated_at"
  | "closed_at"
  | "last_edited_by"
  | "deleted_at"
>;

// Raw Supabase response with expenses for internal processing
export type SettlementWithExpenses = SettlementBaseFields & {
  expenses: { amount_cents: number }[] | null;
};

// Summary DTO returned by list/detail endpoints
export type SettlementSummaryDTO = SettlementBaseFields & {
  total_expenses_amount_cents: number;
};

// Detail is the same structure per API plan
export type SettlementDetailsDTO = SettlementSummaryDTO;

// -----------------------------
// Participants - DTOs
// -----------------------------

export type ParticipantDTO = Pick<
  ParticipantRow,
  "id" | "nickname" | "is_owner" | "created_at" | "updated_at" | "last_edited_by"
>;

// -----------------------------
// Expenses - DTOs
// -----------------------------

export type ExpenseParticipantMiniDTO = Pick<ParticipantRow, "id" | "nickname">;

export type ExpenseDTO = Pick<
  ExpenseRow,
  | "id"
  | "payer_participant_id"
  | "amount_cents"
  | "expense_date"
  | "description"
  | "share_count"
  | "created_at"
  | "updated_at"
  | "last_edited_by"
> & {
  participants: ExpenseParticipantMiniDTO[];
};

export type ExpenseDetailsDTO = ExpenseDTO;

// -----------------------------
// Settlement Snapshots - DTOs
// -----------------------------

export type BalancesMap = Record<UUID, AmountCents>;

export interface TransferDTO {
  from: UUID;
  to: UUID;
  amount_cents: AmountCents;
}

// The snapshot row stores balances/transfers as JSON; in the API they are
// exposed as strongly typed structures below.
export type SettlementSnapshotDTO = Pick<
  SettlementSnapshotRow,
  "settlement_id" | "algorithm_version" | "created_at"
> & {
  balances: BalancesMap;
  transfers: TransferDTO[];
};

// -----------------------------
// Events - DTOs
// -----------------------------

export type EventType =
  | "settlement_created"
  | "participant_added"
  | "expense_added"
  | "settle_confirmed"
  | "settled"
  | "summary_copied"
  | "new_settlement_started";

export type EventEnv = "dev" | "prod";

export interface EventPayload {
  env: EventEnv;
  additional_data?: Record<string, unknown>;
  // Allow future extensibility without breaking consumers
  [key: string]: unknown;
}

export type EventDTO = Pick<EventRow, "id" | "event_type" | "settlement_id" | "created_at"> & {
  payload: EventPayload;
};

// -----------------------------
// Command and Query Models
// -----------------------------

export type SettlementSortBy = "created_at" | "updated_at" | "title";

// Settlements
export interface GetSettlementsQuery {
  status?: "open" | "closed";
  page?: number;
  limit?: number;
  sort_by?: SettlementSortBy;
  sort_order?: SortOrder;
}

export interface CreateSettlementCommand {
  title: string; // validated: required, max 100 chars
}

export interface UpdateSettlementCommand {
  title: string; // validated: required, max 100 chars
}

export type CloseSettlementCommand = Record<string, never>; // empty body

// Participants (scoped to a settlement via path params)
export interface GetParticipantsQuery {
  page?: number;
  limit?: number;
}

export interface CreateParticipantCommand {
  nickname: string; // validated: 3-30 chars, ^[a-z0-9_-]+$, case-insensitive unique per settlement
}

export interface UpdateParticipantCommand {
  nickname: string; // same validation as create
}

export type ExpenseSortBy = "expense_date" | "created_at" | "amount_cents";

// Expenses (scoped to a settlement via path params)
export interface GetExpensesQuery {
  participant_id?: UUID; // filter by payer or participant
  date_from?: DateString; // YYYY-MM-DD
  date_to?: DateString; // YYYY-MM-DD
  page?: number;
  limit?: number;
  sort_by?: ExpenseSortBy;
  sort_order?: SortOrder;
}

type ExpenseCreateBase = Pick<ExpenseRow, "payer_participant_id" | "amount_cents" | "expense_date"> & {
  // Optional per API, nullable in DB
  description?: ExpenseRow["description"];
};

export type CreateExpenseCommand = ExpenseCreateBase & {
  participant_ids: UUID[]; // required, min 1, all must exist in settlement
};

export type UpdateExpenseCommand = CreateExpenseCommand; // same shape as POST

// Settlement Snapshots
export type GetSettlementSnapshotQuery = Record<string, never>; // no query params

// Events
export interface CreateEventCommand {
  event_type: EventType;
  settlement_id: UUID | null;
  payload: EventPayload;
}

export interface GetEventsQuery {
  settlement_id?: UUID;
  event_type?: EventType;
  date_from?: DateString;
  date_to?: DateString;
  page?: number;
  limit?: number; // max 100
}

// -----------------------------
// Response wrappers per endpoint families (for convenience)
// -----------------------------

export type SettlementsListResponse = PagedResponse<SettlementSummaryDTO>;
export type ParticipantsListResponse = PagedResponse<ParticipantDTO>;
export type ExpensesListResponse = PagedResponse<ExpenseDTO>;
export type EventsListResponse = PagedResponse<EventDTO>;

// -----------------------------
// Frontend-specific types for Settlements view
// -----------------------------

export type SettlementsTab = "active" | "archive";

export interface SettlementsQueryState {
  status: "open" | "closed";
  page: number;
  limit: number;
  sort_by: "updated_at";
  sort_order: "desc";
}

export interface SettlementCardVM {
  id: string;
  title: string;
  status: string;
  participantsCount: number;
  expensesCount: number;
  totalExpensesAmountCents: number;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date | null;
  isDeletable: boolean; // status === "closed"
  href: string; // /settlements/{id}
}

export interface AggregatedCountsVM {
  activeCount: number;
  archiveCount: number;
}

export interface ApiError {
  status: number;
  code?: string;
  message?: string;
  details?: unknown;
}

export interface CreateExpenseRpcResult {
  id: string;
  settlement_id: string;
  payer_participant_id: string;
  amount_cents: number;
  expense_date: string;
  description: string | null;
  share_count: number;
  created_at: string;
  updated_at: string;
  last_edited_by: string | null;
}

export interface ExpenseParticipantQueryResult {
  participants: {
    id: string;
    nickname: string;
  };
}

// Utility functions

export function mapSettlementToVM(dto: SettlementSummaryDTO): SettlementCardVM {
  return {
    id: dto.id,
    title: dto.title,
    status: dto.status,
    participantsCount: dto.participants_count,
    expensesCount: dto.expenses_count,
    totalExpensesAmountCents: dto.total_expenses_amount_cents,
    createdAt: new Date(dto.created_at),
    updatedAt: new Date(dto.updated_at),
    closedAt: dto.closed_at ? new Date(dto.closed_at) : null,
    isDeletable: dto.status === "closed",
    href: `/settlements/${dto.id}`,
  };
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString("pl-PL", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(amountCents: number, currency = "PLN"): string {
  const amount = amountCents / 100;
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
  }).format(amount);
}

</type_definitions>

7. Tech Stack:
<tech_stack>
Frontend - Astro z React dla komponentów interaktywnych:

- Astro 5 pozwala na tworzenie szybkich, wydajnych stron i aplikacji z minimalną ilością JavaScript
- Vue 3 zapewni interaktywność tam, gdzie jest potrzebna
- TypeScript 5 dla statycznego typowania kodu i lepszego wsparcia IDE
- Tailwind 4 pozwala na wygodne stylowanie aplikacji
- Shadcn/ui zapewnia bibliotekę dostępnych komponentów React, na których oprzemy UI

Backend - Supabase jako kompleksowe rozwiązanie backendowe:

- Zapewnia bazę danych PostgreSQL
- Zapewnia SDK w wielu językach, które posłużą jako Backend-as-a-Service
- Jest rozwiązaniem open source, które można hostować lokalnie lub na własnym serwerze
- Posiada wbudowaną autentykację użytkowników

AI - Komunikacja z modelami z rodziny OpenAi:

- Dostęp do szerokiej gamy modeli , które pozwolą nam znaleźć rozwiązanie zapewniające wysoką efektywność i niskie koszta
- Pozwala na ustawianie limitów finansowych na klucze API

CI/CD i Hosting:

- Github Actions do tworzenia pipeline’ów CI/CD
- CludeFlare dla hostowania JS stacku aplikacji

</tech_stack>

Przed utworzeniem ostatecznego planu wdrożenia przeprowadź analizę i planowanie wewnątrz tagów <implementation_breakdown> w swoim bloku myślenia. Ta sekcja może być dość długa, ponieważ ważne jest, aby być dokładnym.

W swoim podziale implementacji wykonaj następujące kroki:
1. Dla każdej sekcji wejściowej (PRD, User Stories, Endpoint Description, Endpoint Implementation, Type Definitions, Tech Stack):
  - Podsumuj kluczowe punkty
 - Wymień wszelkie wymagania lub ograniczenia
 - Zwróć uwagę na wszelkie potencjalne wyzwania lub ważne kwestie
2. Wyodrębnienie i wypisanie kluczowych wymagań z PRD
3. Wypisanie wszystkich potrzebnych głównych komponentów, wraz z krótkim opisem ich opisu, potrzebnych typów, obsługiwanych zdarzeń i warunków walidacji
4. Stworzenie wysokopoziomowego diagramu drzewa komponentów
5. Zidentyfikuj wymagane DTO i niestandardowe typy ViewModel dla każdego komponentu widoku. Szczegółowo wyjaśnij te nowe typy, dzieląc ich pola i powiązane typy.
6. Zidentyfikuj potencjalne zmienne stanu i niestandardowe hooki, wyjaśniając ich cel i sposób ich użycia
7. Wymień wymagane wywołania API i odpowiadające im akcje frontendowe
8. Zmapuj każdej historii użytkownika do konkretnych szczegółów implementacji, komponentów lub funkcji
9. Wymień interakcje użytkownika i ich oczekiwane wyniki
10. Wymień warunki wymagane przez API i jak je weryfikować na poziomie komponentów
11. Zidentyfikuj potencjalne scenariusze błędów i zasugeruj, jak sobie z nimi poradzić
12. Wymień potencjalne wyzwania związane z wdrożeniem tego widoku i zasugeruj możliwe rozwiązania

Po przeprowadzeniu analizy dostarcz plan wdrożenia w formacie Markdown z następującymi sekcjami:

1. Przegląd: Krótkie podsumowanie widoku i jego celu.
2. Routing widoku: Określenie ścieżki, na której widok powinien być dostępny.
3. Struktura komponentów: Zarys głównych komponentów i ich hierarchii.
4. Szczegóły komponentu: Dla każdego komponentu należy opisać:
 - Opis komponentu, jego przeznaczenie i z czego się składa
 - Główne elementy HTML i komponenty dzieci, które budują komponent
 - Obsługiwane zdarzenia
 - Warunki walidacji (szczegółowe warunki, zgodnie z API)
 - Typy (DTO i ViewModel) wymagane przez komponent
 - Propsy, które komponent przyjmuje od rodzica (interfejs komponentu)
5. Typy: Szczegółowy opis typów wymaganych do implementacji widoku, w tym dokładny podział wszelkich nowych typów lub modeli widoku według pól i typów.
6. Zarządzanie stanem: Szczegółowy opis sposobu zarządzania stanem w widoku, określenie, czy wymagany jest customowy hook.
7. Integracja API: Wyjaśnienie sposobu integracji z dostarczonym punktem końcowym. Precyzyjnie wskazuje typy żądania i odpowiedzi.
8. Interakcje użytkownika: Szczegółowy opis interakcji użytkownika i sposobu ich obsługi.
9. Warunki i walidacja: Opisz jakie warunki są weryfikowane przez interfejs, których komponentów dotyczą i jak wpływają one na stan interfejsu
10. Obsługa błędów: Opis sposobu obsługi potencjalnych błędów lub przypadków brzegowych.
11. Kroki implementacji: Przewodnik krok po kroku dotyczący implementacji widoku.

Upewnij się, że Twój plan jest zgodny z PRD, historyjkami użytkownika i uwzględnia dostarczony stack technologiczny.

Ostateczne wyniki powinny być w języku polskim i zapisane w pliku o nazwie .ai/{view-name}-view-implementation-plan.md. Nie uwzględniaj żadnej analizy i planowania w końcowym wyniku.

Oto przykład tego, jak powinien wyglądać plik wyjściowy (treść jest do zastąpienia):

```markdown
# Plan implementacji widoku [Nazwa widoku]

## 1. Przegląd
[Krótki opis widoku i jego celu]

## 2. Routing widoku
[Ścieżka, na której widok powinien być dostępny]

## 3. Struktura komponentów
[Zarys głównych komponentów i ich hierarchii]

## 4. Szczegóły komponentów
### [Nazwa komponentu 1]
- Opis komponentu [opis]
- Główne elementy: [opis]
- Obsługiwane interakcje: [lista]
- Obsługiwana walidacja: [lista, szczegółowa]
- Typy: [lista]
- Propsy: [lista]

### [Nazwa komponentu 2]
[...]

## 5. Typy
[Szczegółowy opis wymaganych typów]

## 6. Zarządzanie stanem
[Opis zarządzania stanem w widoku]

## 7. Integracja API
[Wyjaśnienie integracji z dostarczonym endpointem, wskazanie typów żądania i odpowiedzi]

## 8. Interakcje użytkownika
[Szczegółowy opis interakcji użytkownika]

## 9. Warunki i walidacja
[Szczegółowy opis warunków i ich walidacji]

## 10. Obsługa błędów
[Opis obsługi potencjalnych błędów]

## 11. Kroki implementacji
1. [Krok 1]
2. [Krok 2]
3. [...]
```

Rozpocznij analizę i planowanie już teraz. Twój ostateczny wynik powinien składać się wyłącznie z planu wdrożenia w języku polskim w formacie markdown, który zapiszesz w pliku .ai/{view-name}-view-implementation-plan.md i nie powinien powielać ani powtarzać żadnej pracy wykonanej w podziale implementacji.