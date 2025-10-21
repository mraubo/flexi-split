Aby wdrożyć punkt końcowy DELETE do usuwania uczestnika rozliczenia, należy przygotować walidację parametrów, kontrolę autoryzacji i reguł biznesowych (status='open') oraz zwracać 204 No Content w przypadku sukcesu, z mapowaniem błędów na 401/403/404/422 zgodnie z semantyką HTTP i dobrymi praktykami Astro/Supabase RLS w środowisku SSR. Implementacja powinna działać w jednej transakcji, korzystać z Zod do walidacji danych, polityk RLS Supabase do egzekwowania dostępu oraz pre-checków integralności referencyjnej, aby uniknąć naruszeń kluczy obcych i zwracać właściwe kody statusu.

<analysis>
1) Kluczowe punkty specyfikacji API: Endpoint to DELETE /settlements/{settlement_id}/participants/{id}, działania dozwolone tylko gdy settlement.status='open', sukces 204 No Content, błędy 401/403/404/422, odpowiedź pusta bez ciała.

2) Parametry: Wymagane path params to settlement_id (UUID) i id (UUID), brak body, wymagany nagłówek Authorization Bearer dla uwierzytelnienia i autoryzacji prowadzący do 401 przy braku sesji lub nieważnych poświadczeniach.

3) Niezbędne typy DTO/Command: Brak body dla DELETE, więc nie ma Command modelu; do odpowiedzi nie zwracamy DTO (204), natomiast w warstwie serwisowej korzystamy z ParticipantDTO i identyfikatorów UUID zgodnie z ogólną praktyką i walidacją schematów z Zod.

4) Ekstrakcja logiki do service: Utworzyć participants.service z metodą removeParticipant(settlementId, participantId, actorUserId) wywoływaną z pliku endpointu Astro, separując HTTP od logiki domenowej, co ułatwia testy i spójność z routingiem Astro endpoints.

5) Walidacja wejścia: Zod do walidacji UUID w path params, weryfikacja autoryzacji SSR przez Supabase server client, sprawdzenie istnienia rozliczenia/uczestnika, sprawdzenie statusu 'open' (inaczej 422), pre-check referencji w expenses/expense_participants aby uniknąć naruszeń FK, całość w transakcji.

6) Rejestrowanie błędów: Logowanie na serwerze (console/error logger) oraz mapowanie znanych błędów na 4xx/5xx; w razie rozbudowy można dodać dedykowane logi lub APM, natomiast minimalnie SSR endpoint powinien rejestrować błędy i zwracać odpowiednią odpowiedź HTTP.

7) Zagrożenia bezpieczeństwa: IDOR na UUID, obejście reguł przez brak RLS, CSRF przy metodach modyfikujących bez poprawnej polityki cookie/sameSite, wycieki informacji przy różnicowaniu 403/404—należy użyć RLS i spójnych komunikatów oraz SSR autentykacji.

8) Scenariusze błędów i kody: 401 gdy brak sesji, 403 gdy autoryzacja odmawia operacji, 404 gdy nie znaleziono zasobu w danym zakresie, 422 gdy settlement zamknięty lub uczestnik ma powiązane wydatki (naruszenie reguł biznesowych), 500 dla nieoczekiwanych wyjątków serwera.
</analysis>

### Przegląd punktu końcowego
- Cel: usunięcie uczestnika rozliczenia wyłącznie wtedy, gdy rozliczenie ma status 'open', bez treści w odpowiedzi, co zgodne jest z semantyką HTTP 204 dla operacji DELETE.
- Ścieżka: DELETE /settlements/{settlement_id}/participants/{id}, ze ścisłą kontrolą dostępu po stronie bazy przez RLS oraz walidacją SSR po stronie Astro.

### Szczegóły żądania
- Metoda i ścieżka: DELETE /settlements/{settlement_id}/participants/{id}, gdzie oba parametry są UUID walidowane po stronie serwera przed wykonaniem logiki biznesowej.
- Nagłówki: Authorization: Bearer <token>, w przeciwnym razie 401 Unauthorized zgodnie z definicją MDN.
- Body: brak, ponieważ operacja DELETE z powodzeniem powinna zwracać 204 No Content bez ciała.

### Szczegóły odpowiedzi
- Sukces: 204 No Content, bez body i bez Content-Length, co spełnia wymogi semantyki HTTP.
- Błędy: 401 Unauthorized (brak/nieprawidłowa autentykacja), 403 Forbidden (brak uprawnień), 404 Not Found (brak zasobu w kontekście użytkownika), 422 Unprocessable Content (settlement zamknięty lub uczestnik nie może być usunięty ze względu na reguły biznesowe), 500 dla błędów serwera.

### Przepływ danych
- SSR i klient Supabase: w handlerze Astro utworzyć serwerowy klient Supabase powiązany z ciasteczkami, odczytać sesję i identyfikator użytkownika do dalszej autoryzacji, co jest zgodne z zaleceniami SSR Supabase.
- Walidacja wejścia: zweryfikować settlement_id i id (UUID) przez Zod, oraz wstępnie zakończyć żądanie odpowiednimi statusami przy błędach walidacji lub braku sesji.
- Autoryzacja: potwierdzić, że aktor ma prawo modyfikacji rozliczenia/uczestników (RLS i kontrola aplikacyjna), tak aby uniknąć IDOR i naruszeń uprawnień.
- Reguły biznesowe: sprawdzić, czy rozliczenie ma status 'open', w przeciwnym razie zwrócić 422 Unprocessable Content, zgodnie z semantyką, że polecenie jest zrozumiałe, lecz niedozwolone w aktualnym stanie.
- Integralność referencyjna: przed usunięciem sprawdzić, czy uczestnik nie jest płatnikiem w expenses ani uczestnikiem w expense_participants, aby uniknąć błędów FK, gdyż domyślnie ON DELETE NO ACTION/RESTRICT zablokuje operację, jeśli istnieją zależne wiersze.
- Transakcja: wykonać operację w pojedynczej transakcji (SELECT… FOR UPDATE na uczestniku/rozliczeniu → weryfikacje → DELETE uczestnika → ewentualna aktualizacja liczników), a następnie zwrócić 204.

### Względy bezpieczeństwa
- RLS i auth.uid(): włączyć i egzekwować RLS na tabelach związanych z rozliczeniami/uczestnikami, stosując polityki z auth.uid() oraz warunki logiczne TO authenticated, tak aby operacje były możliwe tylko przez uprawnionych użytkowników.
- SSR sesji: użyć serwerowego klienta Supabase w Astro i polityki cookie SameSite/HttpOnly, aby minimalizować ryzyko CSRF i wycieków sesji.
- Unikanie ujawniania informacji: rozważyć jednolite komunikaty dla 403/404, aby nie ujawniać, czy dany zasób istnieje przy braku uprawnień, zgodnie z praktykami ograniczania informacji.
- Spójność metod i idempotencja: DELETE powinien być idempotentny z punktu widzenia klienta, zwracając 204, jeśli usunięcie zakończyło się sukcesem, bez dodatkowych treści.

### Obsługa błędów
- 400 Bad Request: błędne UUID lub niepoprawny format parametrów—zwracane po walidacji Zod, gdy żądanie nie spełnia wymagań syntaktycznych.
- 401 Unauthorized: brak ważnej sesji użytkownika, wykryte w SSR kliencie Supabase.
- 403 Forbidden: użytkownik uwierzytelniony, ale bez uprawnień do modyfikacji rozliczenia/uczestnika w RLS/politykach dostępu.
- 404 Not Found: brak rozliczenia lub uczestnika dostępnego w kontekście użytkownika (po RLS).
- 422 Unprocessable Content: rozliczenie zamknięte lub uczestnik ma powiązane wydatki uniemożliwiające usunięcie, co jest błędem semantyki biznesowej mimo poprawnej składni.
- 500 Internal Server Error: nieoczekiwane wyjątki bazy/serwera, z rejestrowaniem błędów po stronie SSR.

### Wydajność
- Zapytania ukierunkowane: wykorzystać selektywne zapytania po kluczach głównych z ograniczeniami w RLS, aby zminimalizować skanowanie i dostęp do danych, co współgra z indeksami i ograniczeniami kluczy obcych.
- Transakcje krótkie: ograniczyć zakres transakcji do niezbędnych kroków weryfikacji i usunięcia, co zmniejsza czas blokad i podnosi przepustowość.
- Brak ciała odpowiedzi: 204 ogranicza transfer danych i przyspiesza odpowiedź klientowi.

### Kroki implementacji
1) Routing: dodaj plik endpointu Astro w ścieżce src/pages/api/settlements/[settlement_id]/participants/[id].ts z eksportem handlera DELETE zgodnie z konwencją Astro endpoints.
2) SSR Supabase: w handlerze utwórz serwerowy klient Supabase na podstawie kontekstu (cookies/headers) i pobierz sesję użytkownika, kończąc 401 przy jej braku.
3) Walidacja parametrów: użyj Zod do walidacji settlement_id i id jako UUID; w razie błędu zwróć 400.
4) Autoryzacja i RLS: potwierdź dostęp aktora do rozliczenia/uczestnika; przy braku uprawnień zwróć 403, pozostając spójnym z politykami RLS.
5) Weryfikacja reguł biznesowych: sprawdź, czy status rozliczenia to 'open'; jeśli nie, zwróć 422, ponieważ żądanie jest semantycznie nieakceptowalne w aktualnym stanie.
6) Pre-check integralności: policz zależności w expenses i expense_participants dla danego participant_id, aby uniknąć naruszeń FK (domyślnie NO ACTION/RESTRICT blokuje usunięcie przy powiązaniach) i zwróć 422, jeśli istnieją.
7) Transakcja: rozpocznij transakcję, zablokuj wiersz uczestnika/rozliczenia, wykonaj usunięcie uczestnika i ewentualne aktualizacje pochodnych, zatwierdź transakcję i zwróć 204 bez treści.
8) Obsługa wyjątków: mapuj znane błędy na 4xx, nieznane—na 500; rejestruj błędy na serwerze (SSR) i nie ujawniaj szczegółów implementacyjnych w treści odpowiedzi.