<conversation_summary>
<decisions>

1. W MVP stosujemy prosty, jednokrokowy route z widokiem szczegółów rozliczenia prowadzonym przez stepper/zakładki (Uczestnicy → Koszty → Podsumowanie) z progresywnym odsłanianiem treści dla redukcji złożoności poznawczej.
2. Używamy wyłącznie prostych rozwiązań opartych na hookach React (Context + useContext) bez dodatkowych bibliotek do stanu, cache lub realtime.
3. Po dodaniu pierwszego wydatku blokujemy możliwość dodawania/edycji/usuwania uczestników na poziomie UI i egzekwujemy to także przez backend.
4. Wykorzystujemy istniejący system design tokenów i mapujemy je na stany semantyczne, zachowując progi kontrastu WCAG AA.
5. Nie implementujemy service workerów, trybu offline, pamięci podręcznej ani złożonych strategii synchronizacji; zakładamy stałe połączenie z internetem i proste odświeżanie przez hooki.
6. Lista rozliczeń jest ujęta w jednym widoku z przełącznikiem „Aktywne/Archiwum” zamiast rozbudowanej nawigacji, by ograniczyć złożoność wizualną.
7. Funkcja „Kopia podsumowania” używa navigator.clipboard.writeText z tostem potwierdzającym oraz opcjonalnie Web Share API na wspieranych urządzeniach.
8. Status „Zamknięte” wyłącza wszystkie akcje edycyjne w UI, a ostateczna kontrola dostępu i stanu odbywa się po stronie API.
9. Formularze stosują wzorce natywne (pattern, minlength) i minimalne asynchroniczne sprawdzenia po stronie API, unikając ciężkich warstw walidacji.
10. Obsługa sesji polega na przechwytywaniu 401 i przekierowaniu na ekran logowania z zachowaniem celu powrotu, w zgodzie z mechanizmami sesji Supabase.
    </decisions>
    <matched_recommendations>
11. Progresywne odsłanianie i prosty stepper dla procesu trzystopniowego, aby zbalansować moc funkcji i prostotę interfejsu.
12. React Context + useContext jako lekki mechanizm współdzielenia stanu rozliczenia zamiast dedykowanych bibliotek do zarządzania stanem.
13. Twarda blokada zarządzania uczestnikami po pierwszym wydatku dla spójności danych oraz minimalizacji ryzyk błędów uprawnień.
14. Reużycie istniejących design tokenów i weryfikacja kontrastu tekstu i elementów względem WCAG 1.4.3 AA.
15. Brak workerów i cache; proste hooki i odpytywanie endpointów jako domyślna ścieżka integracji w stałym połączeniu.
16. Jeden widok listy rozliczeń z segmentacją „Aktywne/Archiwum” w celu ograniczenia złożoności i poprawy przewidywalności.
17. Clipboard API do kopiowania podsumowania i Web Share API jako opcjonalny mechanizm udostępniania.
18. Synchronizacja statusu „Zamknięte” między UI i backendem z zasadą „zawsze egzekwuj po stronie serwera”.
19. Natywne wzorce HTML dla walidacji oraz minimalistyczne sprawdzanie asynchroniczne zamiast rozbudowanych schematów.
20. Proste przechwytywanie 401 i redirect w oparciu o sesje opisane w dokumentacji Supabase.
    </matched_recommendations>
    <ui_architecture_planning_summary>
    a. Główne wymagania dotyczące architektury UI: Interfejs prowadzi użytkownika przez trzy kroki w jednym route z czytelnym stepperem i progresywnym odsłanianiem sekcji, aby utrzymać niski koszt poznawczy na mobile i desktopie. Edycje są zarezerwowane dla właściciela, a zamknięcie rozliczenia przełącza cały widok w tryb tylko do odczytu z wyraźnym oznaczeniem statusu. Formularze wykorzystują natywne mechanizmy HTML i minimalny asynchroniczny check po stronie API, z komunikatami przyjaznymi i zrozumiałymi. Zachowujemy istniejące design tokeny i progi kontrastu WCAG AA, aby zapewnić dostępność i spójność.
    b. Kluczowe widoki, ekrany i przepływy użytkownika: Ekran logowania/rejestracji oraz przekierowanie po wygaśnięciu sesji i odpowiedzi 401. Widok listy rozliczeń z przełącznikiem „Aktywne/Archiwum” i prostymi akcjami tworzenia/usuwania zamkniętych rozliczeń. Widok szczegółów rozliczenia zawiera kroki: Uczestnicy (dodawanie/edycja/usunięcie do czasu pierwszego wydatku), Koszty (lista, dodawanie, edycja, filtr po osobie), Podsumowanie (salda, minimalna lista przelewów, zamknięcie, kopiowanie/udostępnianie). Po pierwszym wydatku sekcja Uczestnicy jest zablokowana, a po zamknięciu całe rozliczenie przechodzi w stan nieedytowalny.
    c. Strategia integracji z API i zarządzania stanem: Stan bieżącego rozliczenia oraz listy uczestników i kosztów utrzymywany jest w React Context z prostymi hookami do pobierania i odświeżania na żądanie, bez cache’owania i bez realtime. Obsługa błędów obejmuje przechwycenie 401 i przekierowanie na logowanie, a dla walidacji używamy natywnych atrybutów HTML i lekkich wywołań sprawdzających unikalność, pozostawiając ostateczną weryfikację backendowi. Brak optymistycznych aktualizacji w MVP; UI odświeża dane po sukcesie requestu, co upraszcza spójność z regułami uprawnień.
    d. Responsywność, dostępność i bezpieczeństwo: Layout jest mobile‑first z prostym stepperem i czytelną hierarchią informacji, aby redukować złożoność wizualną. Stosujemy wytyczne kontrastu WCAG 1.4.3 oraz czytelne stany fokusu i komunikaty błędów. Kontrole dostępu są egzekwowane po stronie serwera, a UI jedynie odzwierciedla stan uprawnień i status rozliczenia, aby zapobiec scenariuszom broken access control.
    e. Interakcje specyficzne: „Kopia podsumowania” działa przez navigator.clipboard.writeText z tostem potwierdzającym i opcjonalnie Web Share API na urządzeniach wspierających, co minimalizuje złożoność i zwiększa użyteczność na mobile. Pola formularzy pozostają natywne i proste, a formatowanie kwot i prezentacji pozostaje po stronie widoków bez buforowania wyników.
    </ui_architecture_planning_summary>
    <unresolved_issues>
21. Ustalenie ostatecznego szablonu i tonu komunikatów błędów oraz walidacji w kontekście wymagań dostępności (np. kolejność, aria‑live, czytelność).
22. Doprecyzowanie zachowania przy próbie edycji w stanie „Zamknięte” i po pierwszym wydatku (treść komunikatów, wzorce modali, ewentualne linki do dokumentacji).
23. Ustalenie prostych reguł odświeżania danych po operacjach (np. odświeżenie całej listy vs. selektywne re-fetch sekcji) przy braku cache warstw.
24. Zdefiniowanie minimalnego UX dla wygaśnięcia sesji: komunikat, ścieżka powrotu i zachowanie formularzy po redirect.
25. Uzgodnienie, czy Web Share API będzie domyślnie proponowane po sukcesie kopii, czy dostępne jako dodatkowy przycisk w podsumowaniu.</unresolved_issues>
    </conversation_summary>
