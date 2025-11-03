Wykonano analizę wymagań i przygotowano kompletny, technicznie szczegółowy plan wdrożenia endpointu POST /settlements/{settlement_id}/participants, gotowy do zapisania jako .ai/view-implementation-plan.md i realizacji w stacku Astro + Supabase + TypeScript + Zod + Cloudflare.

<analysis>
1) Kluczowe punkty specyfikacji API: Endpoint POST /settlements/{settlement_id}/participants dodaje uczestnika do rozliczenia wyłącznie, gdy status rozliczenia to open, przyjmuje JSON z polem nickname o długości 3–30 i wzorcu ^[a-z0-9_-]+$, zwraca 201 Created i strukturę jak GET item, a błędy: 400/401/403/404/409 (duplikat nicku)/422 (limit 10 uczestników lub settlement zamknięty).
2) Parametry: Wymagane path param settlement_id (UUID) oraz body.nickname (string 3–30, regex ^[a-z0-9_-]+$), brak parametrów opcjonalnych i brak query params.
3) Niezbędne typy: ParticipantDTO (id, nickname, is_owner, created_at, updated_at, last_edited_by) oraz CreateParticipantCommand { nickname: string }, a także ewentualnie SettlementDetailsDTO, jeśli odpowiedź jest „jak GET item” uczestnika w kontekście rozliczenia.
4) Ekstrakcja logiki do service: Utworzyć participantsService z metodą addParticipant(settlementId, nickname, userId) realizującą walidację, kontrolę uprawnień/RLS, sprawdzanie statusu open, limitu 10, unikalności case‑insensitive (nickname_norm = lower(nickname)), transakcję insertu i aktualizację liczników oraz emisję eventu participant_added.
5) Walidacja danych: Na wejściu Zod schema dla body.nickname (min 3, max 30, regex ^[a-z0-9_-]+$), walidacja Content-Type application/json, a na poziomie DB wykorzystanie unikalności (settlement_id, nickname_norm) z nickname_norm jako kolumna GENERATED ALWAYS AS lower(nickname) STORED oraz constrainty statusu open/RLS; rozróżnić 400 (zła składnia/format) i 422 (stan nie pozwala na przetworzenie: zamknięte/limit).
6) Rejestrowanie błędów: Jeśli istnieje tabela logów, zapisywać tam kontekst błędu z kodem statusu, użytkownikiem, settlement_id i payloadem; w przeciwnym razie użyć observability (np. Cloudflare Workers logs) i structured logging w endpointzie.
7) Zagrożenia bezpieczeństwa: BOLA (kontrola dostępu do settlement po ID), błędna autoryzacja funkcji, niepoprawne RLS, nadmierne dane w odpowiedzi, brak limitowania zasobów (rate limiting) i konfiguracja platformy (security misconfiguration), wszystkie opisane w OWASP API Top 10 2023.
8) Scenariusze błędów i statusy: 400 dla nieprawidłowego JSON/niezgodnego schematu, 401 dla braku sesji, 403 dla braku uprawnień do settlement, 404 gdy settlement nie istnieje, 409 dla duplikatu nickname (konflikt stanu), 422 dla zamkniętego settlement lub przekroczonego limitu 10 uczestników, 500 dla błędów serwera/nieoczekiwanych wyjątków.
</analysis>

# .ai/view-implementation-plan.md

### Przegląd punktu końcowego

- Cel: Dodanie uczestnika do istniejącego rozliczenia, wyłącznie gdy rozliczenie ma status open, z walidacją nicku i pełną kontrolą dostępu na poziomie aplikacji i bazy (RLS).
- Metoda i ścieżka: POST /settlements/{settlement_id}/participants z obsługą 201 Created i nagłówka Location wskazującego nowo utworzony zasób lub jego opis w treści odpowiedzi, zgodnie z semantyką HTTP.
- Kontekst platformowy: Endpoint jako Astro Server Endpoint w src/pages/api z SSR włączonym i bez prerenderingu dla tras API.

### Szczegóły żądania

- Path params: settlement_id (UUID) jako element ścieżki /settlements/{settlement_id}/participants.
- Body: application/json z polem nickname: string, długość 3–30, regex ^[a-z0-9_-]+$, walidowane Zodem po stronie serwera.
- Autoryzacja: Wymagana sesja Supabase; endpoint musi korzystać z Supabase klienta po stronie serwera (locals) i egzekwować RLS przez identyfikację użytkownika.

### Szczegóły odpowiedzi

- Sukces 201: Zwraca ParticipantDTO nowo utworzonego uczestnika (id, nickname, is_owner, created_at, updated_at, last_edited_by) i ustawia Location na URL zasobu uczestnika; 201 może zawierać reprezentację nowego zasobu lub link do niego.
- Treść: application/json; struktura jak GET item uczestnika, spójna z ParticipantDTO ze wspólnych typów.
- Nagłówki: Location: /settlements/{settlement_id}/participants/{participant_id} zgodnie z semantyką 201 Created.

### Przepływ danych

- Wejście: Żądanie POST trafia do src/pages/api/settlements/[settlement_id]/participants.ts, gdzie parsowany jest JSON i walidowany Zodem pod kątem nickname (min 3, max 30, regex).
- Autentykacja: Pobranie klienta Supabase z kontekstu serwera i wymuszenie obecności sesji; w razie jej braku zwrot 401.
- Autoryzacja: Sprawdzenie, czy użytkownik ma prawo modyfikować dane rozliczenia (np. właściciel lub dopuszczony aktor), z wykorzystaniem RLS i ewentualnej kontroli aplikacyjnej, aby uniknąć BOLA.
- Walidacje stanu: Odczyt settlements.status i odrzucenie żądania, jeśli status != 'open' (zwrócenie 422 jako semantycznie nieprzetwarzalne w danym stanie biznesowym).
- Walidacje limitów: Zliczenie uczestników rozliczenia i odrzucenie w 422 po przekroczeniu 10 (reguła biznesowa), przed próbą insertu.
- Unikalność i normalizacja: Sprawdzenie unikalności case-insensitive poprzez kolumnę nickname_norm = lower(nickname) (GENERATED ALWAYS AS ... STORED) i indeks UNIQUE(settlement_id, nickname_norm) w bazie, co daje bezpieczeństwo wyścigów i spójność.
- Zapis: Transakcja: insert uczestnika, aktualizacja participants_count w settlements, ustawienie last_edited_by, emisja eventu participant_added w tabeli events.
- Wyjście: 201 Created z ParticipantDTO i Location nagłówkiem na nowy zasób, zgodnie z RFC 9110.

### Względy bezpieczeństwa

- BOLA: W każdym miejscu, gdzie używany jest identifier settlement_id, wymusić kontrolę obiektową uprawnień, aby zapobiec eskalacji dostępu do cudzych rozliczeń.
- RLS: Włączenie i egzekwowanie RLS dla participants i settlements z politykami SELECT/INSERT/UPDATE/DELETE zależnymi od powiązania użytkownika i statusu open, zapewniając defense‑in‑depth.
- Walidacja wejścia: Twarde walidacje Zod po stronie serwera, restrykcyjne regex i długości, oraz poprawny Content-Type.
- Ograniczanie zasobów: Rate‑limiting/abonent na poziomie edge (Cloudflare Workers/Pages) oraz limity rozmiarów requestu i timeouts, aby przeciwdziałać API4:2023 Unrestricted Resource Consumption.
- Konfiguracja: Unikanie debugowania/stack traces w odpowiedziach produkcyjnych oraz odpowiednia konfiguracja adaptera Cloudflare dla SSR.

### Obsługa błędów

- 400 Bad Request: Nieprawidłowy JSON, brak wymaganych pól, błędny regex/długości w Zod (błędy syntaktyczne/formatu żądania).
- 401 Unauthorized: Brak lub wygaśnięta sesja użytkownika Supabase.
- 403 Forbidden: Użytkownik zalogowany, ale bez uprawnień do modyfikacji danego rozliczenia (polityka RLS lub kontrola aplikacyjna).
- 404 Not Found: Nieistniejący settlement_id lub zasób niedostępny w kontekście użytkownika.
- 409 Conflict: Nickname już istnieje w danym settlement (unikalność naruszona), konflikt ze stanem zasobu zgodnie z semantyką 409.
- 422 Unprocessable Entity: settlement zamknięty (status != 'open') lub osiągnięto limit 10 uczestników, czyli błąd semantyczny mimo poprawnego formatu żądania.
- 500 Internal Server Error: Nieoczekiwany błąd serwera/transakcji; logowanie szczegółów i zwrot ogólnego komunikatu.

### Wydajność

- Indeksy: Wykorzystanie istniejących BTREE po settlement_id i unikalności (settlement_id, nickname_norm) zapewnia szybkie sprawdzenia i wstawienia przy rosnącej liczbie uczestników.
- Zminimalizowane round‑trips: Transakcja łącząca walidację stanu i insert redukuje ryzyko wyścigów oraz liczbę zapytań; unikalność w DB zapewnia ostateczną barierę spójności.
- Edge hosting: Cloudflare Workers/Pages skraca TTFB i upraszcza wprowadzenie limitów oraz logów na krawędzi.

### Kroki implementacji

- Pliki i struktura: Utwórz endpoint w ./src/pages/api/settlements/[settlement_id]/participants.ts z export async function POST oraz export const prerender = false dla tras API w Astro.
- Walidacja: Dodaj ./src/lib/validation/participants.ts z Zod schema: nickname: z.string().min(3).max(30).regex(/^[a-z0-9_-]+$/) i użyj parse w handlerze.
- Serwis: Dodaj ./src/lib/services/participants.service.ts z metodą addParticipant, która 1) sprawdza uprawnienia i status open, 2) liczy uczestników, 3) próbuje insert z nickname i last_edited_by, 4) aktualizuje participants_count, 5) emituje event participant_added, wszystko w jednej transakcji.
- DB i RLS: Zapewnij kolumnę nickname_norm GENERATED ALWAYS AS lower(nickname) STORED oraz UNIQUE(settlement_id, nickname_norm), a polityki RLS definiujące kto może INSERT/SELECT w participants dla settlement ze statusem open.
- Odpowiedź: Po sukcesie ustaw Location na URL nowego uczestnika i zwróć ParticipantDTO ze statusem 201 Created zgodnie z RFC 9110.
- Błędy: Mapuj naruszenie unikalności na 409, zamknięte/limit na 422, walidację Zod/Content-Type na 400, brak sesji 401, brak uprawnień 403, brak settlement 404, pozostałe 500, z ustrukturyzowanym logowaniem.
- CI/CD i hosting: Upewnij się, że projekt ma adapter @astrojs/cloudflare i pipeline do wrangler deploy; w Cloudflare Pages/Workers skonfiguruj build i deploy zgodnie z dokumentacją.

### Przykładowe szkielety plików

- src/pages/api/settlements/[settlement_id]/participants.ts :

```ts
export const prerender = false; // API route [SSR] [ref]
export async function POST(context: APIContext) {
  const { params, request, locals } = context;
  const supabase = locals.supabase; // server-side client [ref]
  // 1) parse/validate JSON (Zod)
  // 2) auth check -> 401
  // 3) call participantsService.addParticipant(...)
  // 4) return 201 with Location and ParticipantDTO
}
```

- src/lib/validation/participants.ts :

```ts
import { z } from "zod";
export const createParticipantSchema = z.object({
  nickname: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_-]+$/),
});
```

- Polityki RLS – szkic (SQL) :

```sql
-- enable RLS
alter table public.participants enable row level security;

-- example policies (adjust to your auth schema/claims)
create policy ins_participants_on_open
on public.participants
for insert
to authenticated
using (
  exists (
    select 1 from public.settlements s
    where s.id = participants.settlement_id
      and s.status = 'open'
      -- and s.owner_id = auth.uid() -- or your rule
  )
)
with check (
  exists (
    select 1 from public.settlements s
    where s.id = participants.settlement_id
      and s.status = 'open'
      -- and s.owner_id = auth.uid()
  )
);
```

- Kolumna generowana i unikalność :

```sql
alter table public.participants
  add column nickname_norm text generated always as (lower(nickname)) stored;

create unique index participants_unique_nick
on public.participants (settlement_id, nickname_norm);
```

W powyższym planie uwzględniono semantykę statusów HTTP, wzorce Astro API Routes, walidację Zod, zasady RLS Supabase/Postgres oraz wdrożenie na Cloudflare, tak aby implementacja była spójna, bezpieczna i zgodna z dobrą praktyką REST.
