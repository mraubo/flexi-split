<conversation_summary>
<decisions>

1. Docelowi użytkownicy: grupy znajomych i rodziny; konteksty: wyjazdy i jednorazowe wydarzenia.
2. Logowanie wymagane; Supabase Auth; metoda e‑mail + hasło; ważność sesji 14 dni.
3. Dane przechowywane w bazie (Supabase); brak trybu anonimowego w MVP.
4. Limit: maks. 3 aktywne rozliczenia na użytkownika; brak szkiców; statusy „open/closed”, archiwizacja po zamknięciu.
5. Waluta w MVP: PLN; wartości przechowywane w groszach; prezentacja w locale pl‑PL.
6. Brak kategorii w MVP; opis wydatku opcjonalny; filtr po osobie dostępny.
7. Limity i walidacje: do 10 uczestników i 500 wydatków/rozliczenie; unikalne nicki (case‑insensitive, a‑z, 0‑9, „-”, „\_”); opis do 140 znaków.
8. Uprawnienia: edytuje tylko właściciel; audyt: updated_at i last_edited_by; brak historii zmian w UI.
9. Podział i zaokrąglenia: równe części; reszta groszy przydzielana deterministycznie pierwszym N osobom wg znormalizowanego nicku.
10. Bilans i przelewy: minimalizacja liczby transakcji, stabilne sortowanie; próg mikro‑płatności praktycznie nie dotyczy (jednostka = 0,01 PLN).
11. UX: mobile‑first; 3‑krokowy flow (Uczestnicy → Koszty → Podsumowanie); klawiatura numeryczna; modal potwierdzenia „Rozlicz” (nieodwracalne); badge „Właściciel”; puste stany; WCAG AA.
12. „Kopia podsumowania”: nagłówek, saldo per osoba i lista przelewów; dostępne po zamknięciu i w archiwum; zgodnie z locale.
13. Analityka: eventy (settlement_created, participant_added, expense_added, settle_confirmed, settled, summary_copied, new_settlement_started) logowane w Supabase (server‑side); środowiska: dev/lokalne i prod.
14. Usuwanie: wyłącznie rozliczenia archiwalne; tylko właściciel; brak przywracania.
    </decisions>

<matched_recommendations>

1. Przechowywanie wartości w najmniejszych jednostkach (grosze) i deterministyczne zaokrąglenia.
2. Algorytm nettingu minimalizujący liczbę przelewów, stabilne sortowanie, wyjaśnialność wyniku.
3. 3‑etapowy przepływ UX z pustymi stanami, potwierdzeniem „Rozlicz” i akcentem mobile‑first.
4. Zestaw eventów produktowych do pomiaru kryteriów sukcesu i lejka.
5. Model uprawnień: właściciel edytuje, pola audytowe; brak historii w UI w MVP.
6. Sesje 14 dni, bezpieczne tokeny (httpOnly), opcja „wyloguj wszędzie” (do rozważenia).
7. Walidacje i limity (10 uczestników, 500 wydatków, 140 znaków opisu, unikalny nick).
8. Locale pl‑PL dla formatowania kwot; brak kategorii, opis tekstowy.
9. „Kopia podsumowania” jako zwięzły tekst gotowy do skopiowania po zamknięciu.
10. Środowiska dev/lokalne i prod; logowanie zdarzeń w Supabase; opcjonalnie Plausible bez cookies (poza MVP).
    </matched_recommendations>

<prd_planning_summary>
a. Główne wymagania funkcjonalne

- Konta i sesje: rejestracja/logowanie e‑mail+hasło; sesja 14 dni; reset hasła; (weryfikacja e‑mail do potwierdzenia).
- Rozliczenia: tworzenie/listowanie; max 3 aktywne; zamknięcie generuje bilans i przenosi do archiwum; usuwanie tylko archiwalnych.
- Uczestnicy: dodawanie/edycja/usuwanie offline w ramach rozliczenia; unikalne nicki (case‑insensitive) w ramach rozliczenia; limit 10.
- Wydatki: dodawanie/edycja/usuwanie przez właściciela; płacący wybierany z listy; domyślnie wszyscy w podziale z możliwością odznaczania; opis (≤140 znaków); limit 500; grupowanie po dacie; filtr po osobie.
- Rozliczanie: równe części, grosze; reszta przydzielana deterministycznie wg nicku; waluta PLN.
- Bilans i przelewy: algorytm minimalizujący liczbę transakcji; stabilne sortowanie; ignorowanie kwot < 0,01 PLN nie dotyczy (jednostka grosz).
- Kopia podsumowania: tekst do schowka (nagłówek, saldo per osoba, lista przelewów), po zamknięciu i w archiwum.
- Analityka: eventy produktowe zapisane w Supabase.
- Uprawnienia i audyt: tylko właściciel edytuje; updated_at, last_edited_by; brak wersjonowania w UI.

b. Kluczowe historie użytkownika i ścieżki

- Rejestracja/logowanie (e‑mail+hasło) → wejście do listy rozliczeń.
- Utworzenie rozliczenia (sprawdzenie limitu 3) → dodanie uczestników → dodanie pierwszego wydatku (wszyscy w podziale, możliwość odznaczania, wybór płacącego) → kolejne wydatki.
- Przegląd listy wydatków (grupowanie po dacie) → filtr po osobie → wejście w szczegóły wydatku.
- Zamknięcie rozliczenia (modal potwierdzenia, nieodwracalne) → wygenerowanie bilansu i listy przelewów → „Kopia podsumowania”.
- Archiwum: przegląd zakończonych rozliczeń → podgląd bilansu → ewentualne usunięcie archiwalnego.
- Zarządzanie sesją: pozostanie zalogowanym 14 dni, wylogowanie (lokalne i ewentualnie globalne).

c. Kryteria sukcesu i pomiar

- 50 zakończonych rozliczeń w pierwszym miesiącu: liczba eventów „settled” (unikalne rozliczenia).
- Pozytywny feedback o prostocie: jakościowe ankiety NPS/PMF po „settled” + analiza czasu do pierwszego rozliczenia.
- Powracalność 20% w 3 mies.: cohorty użytkowników z ≥2 eventami „settled”.
- Lejek aktywacji: settlement_created → participant_added → expense_added → settle_confirmed → settled; mierniki drop‑off i mediany czasu między etapami.
- Jakość danych: średnia liczba wydatków/rozliczenie, średnia liczba uczestników, użycie filtra po osobie, użycie „summary_copied”.

d. Nierozwiązane kwestie/obszary do doprecyzowania

- Czy wymagamy weryfikacji e‑mail przy rejestracji?
- Polityka resetu hasła i blokady konta (rate‑limiting, anty‑brute‑force).
- Concurrency: co w przypadku jednoczesnej edycji na wielu urządzeniach tego samego właściciela (ostatni zapis wygrywa vs. blokady)?
- Język interfejsu (PL‑only vs. i18n w przyszłości) i format czasu/strefy.
- Retencja i backup danych (okres przechowywania, usuwanie konta/RODO).
- Zakres i treść „pustych stanów” i komunikatów błędów (final copy).
- Granice walidacji: maks. długość nicku, znaki diakrytyczne, normalizacja.
- Ewentualna przyszła migracja uczestników offline do powiązań z kontami (strategia i migracje schematu).
  </prd_planning_summary>

<unresolved_issues>

1. Wymóg weryfikacji e‑mail i polityka zabezpieczeń logowania.
2. Strategie współbieżności przy edycji (konflikty zapisów).
3. Retencja/backup oraz polityka usuwania danych (RODO).
4. Zakres docelowego języka UI (PL‑only vs. i18n).
5. Finalne reguły walidacji nicku (długość, diakrytyka).
6. Szczegółowe treści komunikatów (puste stany, błędy, modal „Rozlicz”).
   </unresolved_issues>
   </conversation_summary>
