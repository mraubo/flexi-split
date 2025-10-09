<conversation_summary>

<decisions>
1. Mobile‑first dla grup znajomych/rodziny używających aplikacji przy wyjazdach i eventach.
2. Uczestnicy: miks kont i „offline"; właściciel może dodać uczestników po imieniu/ksywie.
3. Zaproszenia: jednorazowe tokeny per uczestnik, TTL 72h; dołączanie opcjonalne; właściciel może unieważnić/regenerować.
4. Przy tworzeniu rozliczenia właściciel definiuje liczbę i nazwy uczestników; pierwszy raz dołączający może zmienić swoją nazwę.
5. Unikalność nazw w ramach rozliczenia; tożsamość po participantId; historia zmian nazw w logu.
6. Podział kosztów równy na wybranych uczestników; jeden płacący per wydatek; możliwość wykluczeń z wydatku.
7. Uprawnienia edycji: autor edytuje/usuwa swoje wydatki, właściciel wszystkie; prosty log zmian (kto/co/kiedy).
8. Współbieżność: optymistyczne blokowanie wersją rekordu; przy konflikcie informacja i ponowna próba zapisu.
9. Zamknięcie: deterministyczny Minimum Cash Flow (sortowanie po |saldo|, potem participantId), obliczenia w groszach, remisy rozwiązywane stabilnie; brak korekt po zamknięciu; widok tylko do odczytu; rozliczenie trafia do archiwum.
10. Waluta PLN; zaokrąglanie do 0,01; rozdzielanie reszt po największych częściach ułamkowych; dokumentacja reguł w podsumowaniu.
11. Eksport: tekst z przyciskiem „Kopiuj do schowka”.
12. Analityka: eventy settlement_created, member_joined, expense_added, settlement_closed; KPI: ≥60% created→closed, mediana 5 wydatków/rozliczenie, time_to_close ≤ 9 dni; parametry minimalizujące PII (pseud. settlement_id, member_count, expense_count, device_type).
13. Prywatność: minimalizacja PII (imię/pseudonim), linki z krótkim TTL i jednorazowością; rozliczenia po zamknięciu archiwizowane.
14. Harmonogram: 1 tydz. discovery/UX, 3 tyg. build, 1–2 tyg. QA/hardening; E2E na iOS Safari i Android Chrome dla ścieżki create→invite/assign names→add expenses/exclusions→close→export.
</decisions>

<matched_recommendations>
1. Mechanizm merge uczestnika „offline" z kontem po weryfikacji, zachowując participantId i historię zmian.
2. Tokeny zaproszeń jednorazowe z TTL 72h; możliwość unieważnienia/regeneracji przez właściciela (z logiem).
3. Unikalność nazw per rozliczenie; nazwy jako atrybut prezentacyjny, tożsamość po participantId; log historii nazw.
4. Deterministyczny algorytm Minimum Cash Flow; obliczenia w groszach; stabilne rozstrzyganie remisów.
5. Reguły zaokrągleń: liczenie w groszach, rozdział reszt po największych częściach ułamkowych; jawne raportowanie.
6. Optymistyczne blokowanie i obsługa konfliktów zapisu.
7. Brak reopen w MVP; po zamknięciu tylko do odczytu i archiwizacja.
8. Eksport jako tekst + przycisk „Kopiuj do schowka” (doprecyzowanie: bez CSV w MVP).
9. KPI i eventy analityczne z minimalizacją PII; doprecyzowane wartości celów i parametry zdarzeń.
10. Plan 1+3+1–2 tyg. i zakres E2E na mobile (iOS/Android).
</matched_recommendations>

<prd_planning_summary>
• Główne wymagania funkcjonalne produktu:
  - Tworzenie pojedynczego, aktywnego rozliczenia z rolą właściciela.
  - Zarządzanie uczestnikami: dodawanie kont/„offline”, unikalne nazwy, tokeny zaproszeń (jednorazowe, TTL 72h), możliwość unieważniania/regeneracji, opcjonalne dołączanie.
  - Wydatki: jeden płacący, równy podział na wybranych uczestników, możliwość wykluczeń; waluta PLN; rozliczenia w groszach; zasady zaokrągleń i rozdziału reszt.
  - Uprawnienia i audyt: autor vs właściciel; prosty log zmian (kto/co/kiedy) oraz historia zmian nazw.
  - Współbieżność: optymistyczne blokowanie wersją rekordu i bezpieczna obsługa konfliktów.
  - Zamknięcie: blokada edycji, deterministyczny Minimum Cash Flow, stabilne remisy, przeniesienie do archiwum; widok tylko do odczytu.
  - Eksport: podsumowanie tekstowe do schowka (Copy to clipboard).
  - Prywatność: minimalizacja PII; pseudonimizacja identyfikatorów; bez wrażliwych danych.
  - Analityka: eventy settlement_created/member_joined/expense_added/settlement_closed; parametry: pseud. settlement_id, member_count, expense_count, device_type.

• Kluczowe historie użytkownika i ścieżki korzystania:
  1) Właściciel tworzy rozliczenie → definiuje uczestników i nazwy → generuje/udostępnia linki (opcjonalne) → uczestnicy dołączają (lub pozostają „offline").
  2) Uczestnik dołącza po raz pierwszy → może zmienić swoją nazwę (unikalność wymagana) → widzi listę wydatków i może dodać własne.
  3) Dodanie wydatku → wybór płacącego → wybór uczestników biorących udział → równy podział, zapis w groszach, log zmian.
  4) Równoczesna edycja → konflikt wersji → informacja i ponowienie zapisu po odświeżeniu.
  5) Zamknięcie rozliczenia przez właściciela → obliczenie sald i minimalizacja przelewów (MCF) → zablokowanie edycji → przeniesienie do archiwum → eksport tekstowy (kopiuj).
  6) Po zamknięciu uczestnicy mają dostęp tylko do odczytu do podsumowania i historii.

• Ważne kryteria sukcesu i sposoby ich mierzenia:
  - KPI: ≥60% stosunek created→closed; mediana 5 wydatków/rozliczenie; time_to_close ≤ 9 dni.
  - Eventy: settlement_created, member_joined, expense_added, settlement_closed; parametry bez PII.
  - Jakość: E2E na iOS Safari i Android Chrome dla ścieżki end‑to‑end; brak błędów krytycznych blokujących zamknięcie i eksport.

• Ograniczenia projektowe i wpływ:
  - Brak integracji płatności, brak reopen, brak CSV/PDF w MVP → upraszcza zakres i skraca czas.
  - Mobile‑first → priorytet przeglądarek mobilnych i prostego UI.
  - Minimalizacja PII i jednorazowe tokeny → wymogi bezpieczeństwa i projekt zaproszeń.
  - Deterministyczny algorytm MCF i zasady zaokrągleń → przewidywalne wyniki i spójne podsumowania.
</prd_planning_summary>

<unresolved_issues>
1. Retencja danych i polityka usuwania/anonymizacji (np. okres archiwizacji, trwałość logów zmian).
2. Limity skali (max liczba uczestników/wydatków na rozliczenie) i zachowanie przy bardzo dużych rozliczeniach.
3. Dostępność/A11y oraz minimalne wymagania wydajności (np. słabsze urządzenia, offline/PWA – czy wchodzi w zakres?).
4. Szczegóły treści eksportu tekstowego (format, kolejność sekcji, lokalizacja liczb – kropka/przecinek).
5. Zasady modyfikacji listy uczestników po rozpoczęciu dodawania wydatków (dodanie/usunięcie a historia i spójność podziałów).
6. Określenie ról poza administratorem (czy potrzebny jest moderator/współadmin w przyszłości – poza MVP?).
</unresolved_issues>

</conversation_summary>


