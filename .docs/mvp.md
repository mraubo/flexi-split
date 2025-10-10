# Aplikacja - FlexiSplit (MVP)

### Główny problem

Aplikacja rozwiązuje problem skomplikowanego i podatnego na błędy ręcznego rozliczania wspólnych kosztów po jednorazowych wydarzeniach, minimalizując nieporozumienia i poczucie niesprawiedliwości.

### Najmniejszy zestaw funkcjonalności

- Tworzenie pojedynczego rozliczenia: Użytkownik zakłada jedno aktywne rozliczenie i staje się jego właścicielem.
- Dodawanie uczestników offline (tylko właściciel): Formularz „imię/nick”, nazwy unikalne w ramach rozliczenia.
- Rejestrowanie kosztów: Podczas dodawania wydatku wybierana jest osoba płacąca, domyślnie wszyscy uczestnicy biorą udział w podziale w równych częściach, możliwe odznaczenie osób wyłączonych z danego kosztu, edycja i usunięcie wydatku przed zamknięciem.
- Zamknięcie i podsumowanie: Tylko właściciel klika „Rozlicz”, co zamyka edycję i generuje bilans „kto komu ile”, po czym rozliczenie trafia do archiwum.

### Co NIE wchodzi w zakres MVP

- Zapraszanie uczestników i dołączanie przez linki, e‑mail lub kody.
- Rozliczenia cykliczne lub miesięczne.
- Przekazanie roli właściciela.
- Integracje płatności, wiele walut i automatyczne kursy.
- Zaawansowane statystyki, raporty i eksporty.
- Powiadomienia push oraz rejestracja i logowanie.
- Dodawanie zdjęć paragonów.
- Edycja zamkniętych rozliczeń.
- Niestandardowe podziały kosztów i wielu płacących w jednym wydatku.

### Kryteria sukcesu

- Aktywne użytkowanie: Minimum 50 zakończonych rozliczeń w pierwszym miesiącu.
- Pozytywny feedback: Opinie o prostocie i skuteczności procesu rozliczeń.
- Powracalność: Co najmniej 20% użytkowników tworzy kolejne rozliczenie w ciągu następnych 3 miesięcy.

### Wskazówki produktowe i projektowe

- Formularz kosztu: Preselekcja ostatnio używanego płacącego, domyślna selekcja „wszyscy” z szybkim odznaczaniem pojedynczych osób, podpowiedzi kategorii typu „transport”, „nocleg”, „jedzenie”.
- Klarowność udziału: Pokazuj udział jednostkowy kosztu przy edycji i w szczegółach wydatku, prezentuj ile płaci każdy i jaka część przypada na osobę.
- Podsumowanie bilansu: Generuj skróconą listę przelewów minimalizującą liczbę transakcji między uczestnikami, wskazuj kwoty do zapłaty i otrzymania.
- Stany i uprawnienia: Oznacz rozliczenie jako otwarte lub zamknięte, blokuj wszystkie edycje po zamknięciu, wyświetl badge „Właściciel” przy nicku.
- Walidacje nazw: Waliduj unikalność „imię/nick” na etapie wpisywania, informuj o kolizji i proponuj alternatywę z sufiksem.
- Edge cases: Obsłuż koszt z jedną osobą w podziale.
- Czytelność list: Grupuj koszty po dacie, pokazuj płacącego, kwotę, liczbę osób w podziale i skrót opisu, udostępnij szybkie filtrowanie po osobie lub kategorii.
- Zamknięcie rozliczenia: Dodaj ekran potwierdzenia z liczbą kosztów i datą, poinformuj, że czynność jest nieodwracalna w MVP, pokaż przycisk „Kopia podsumowania” po zamknięciu.
- Dostępność i mobile: Duże pola dotykowe, kontrast czytelny, fokus klawiatury na kolejne pole, wsparcie dla wprowadzania liczb z separatorem dziesiętnym.
- Spójność kwot: Przechowuj wartości w najmniejszych jednostkach waluty, zaokrąglaj dopiero na prezentacji, pokazuj sumę kontrolną wszystkich kosztów i sumę udziałów.
- Puste stany: Dodaj komunikaty zachęcające do pierwszego działania, np. po utworzeniu rozliczenia przycisk „Dodaj pierwszego uczestnika” i „Dodaj pierwszy koszt”.
- Nazewnictwo: Utrzymuj proste etykiety „Uczestnicy”, „Koszty”, „Podsumowanie”, „Rozlicz”, unikaj żargonu księgowego.
