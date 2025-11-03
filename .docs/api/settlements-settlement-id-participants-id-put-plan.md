<analysis>
1) Kluczowe punkty specyfikacji: Endpoint PUT aktualizuje wyłącznie pole nickname uczestnika w ramach danego settlementu i działa wyłącznie, gdy settlement ma status open. Body: { nickname } z walidacją 3–30 znaków oraz regex ^[a-z0-9_-]+$, respons ma strukturę jak GET item, sukces 200, błędy: 400/401/403/404/409 (duplikat nicku)/422 (zamknięte rozliczenie).

2. Parametry: Wymagane path params: settlement_id (UUID), id (UUID); wymagane body: nickname (string spełniający długość i regex); brak opcjonalnych parametrów. Brak query params; autoryzacja wymagana cookie/JWT Supabase; operacja dostępna tylko przy statusie settlement='open'.

3. DTO/Command: Wejście UpdateParticipantCommand { nickname: string }; Wyjście ParticipantDTO { id, nickname, is_owner, created_at, updated_at, last_edited_by } zgodnie z typami; odpowiedź 200 zwraca aktualny ParticipantDTO.

4. Ekstrakcja logiki do service: Utworzyć ParticipantService z metodą updateNickname(settlementId, participantId, nickname, editorUserId) realizującą: walidację biznesową, sprawdzenie statusu settlement, unikalność nickname_norm per settlement, aktualizację i mapowanie do DTO; endpoint powinien delegować wyłącznie kontrolę I/O i mapowanie kodów błędów.

5. Walidacja: Zod dla body (regex i długość), walidacja UUID path params, odrzucenie pustych/nieznanych pól, po stronie DB wymusić unikalność przez UNIQUE(settlement_id, nickname_norm) i generowany lower(nickname); przy kolizji zwrócić 409; gdy settlement.status!='open' zwrócić 422; brak autoryzacji 401; brak uprawnień 403; brak rekordu 404.

6. Rejestrowanie błędów: Jeśli brak centralnej tabeli, wprowadzić api_errors z polami: id, route, method, user_id (nullable), status, code, message, request_id, payload_excerpt, created_at; logować w middleware na 4xx/5xx oraz w catch endpointu.

7. Zagrożenia bezpieczeństwa: Użycie service key w runtime klienta grozi obejściem RLS; endpoint musi używać kontekstu supabase powiązanego z żetonem użytkownika i stosować RLS na tabelach participants/settlements; walidować i normalizować nickname by zapobiec bypassowi unikalności; rate limiting po IP/user; unikać wycieków szczegółów DB w treści błędów.

8. Scenariusze błędów i statusy: 400 dla niepoprawnych UUID/body; 401 przy braku sesji; 403 przy braku uprawnień RLS; 404 gdy participant lub settlement nie istnieje/nieosiągalny; 409 dla istniejącego nickname w danym settlement; 422 dla settlement zamkniętych; 500 dla nieoczekiwanych błędów.
   </analysis>

### Przegląd punktu końcowegoCelem endpointu jest zmiana pola nickname uczestnika danego rozliczenia z wymuszeniem walidacji, autoryzacji i spójności biznesowej wyłącznie dla settlementów w statusie open. Implementacja zostanie wykonana jako Astro SSR API route, z wyłączonym prerenderingiem i wykorzystaniem kontekstowego klienta Supabase z RLS.

- Metoda i ścieżka: PUT /settlements/{settlement_id}/participants/{id}.
- Warunki biznesowe: dozwolone tylko gdy settlement.status='open' oraz nickname jest unikalny w ramach settlementu (case-insensitive przez nickname_norm).

### Szczegóły żądania- Path params: settlement_id: UUID (wymagany), id: UUID (wymagany), walidowane po stronie endpointu, błąd 400 przy niepoprawnym UUID.

- Body JSON: { nickname: string } z ograniczeniami: długość 3–30, regex ^[a-z0-9_-]+$, błąd 400 przy niezgodności lub brakujących/nadmiarowych polach.
- Autoryzacja: wymagana sesja użytkownika Supabase; brak sesji skutkuje 401, a brak uprawnień do rekordu 403 (egzekwowane przez RLS).

### Szczegóły odpowiedzi- 200 OK: Zwraca ParticipantDTO: id, nickname, is_owner, created_at, updated_at, last_edited_by, zgodny z GET item.

- Kody błędów: 400, 401, 403, 404, 409, 422 oraz 500 dla błędów nieoczekiwanych, zgodnie z wymaganiami.

### Przepływ danych- Wejście: Request PUT trafia do pliku src/pages/api/settlements/[settlement_id]/participants/[id].ts z export const prerender = false i funkcją PUT/ALL.

- Kontrola: Endpoint parsuje i waliduje params/body, uwierzytelnia usera, deleguje do ParticipantService.updateNickname, mapuje wyjątki na kody HTTP i body.
- DB: Service wykonuje SELECT uczestnika i settlementu, sprawdza status open, sprawdza unikalność nickname_norm, UPDATE uczestnika, zwraca DTO.

### Względy bezpieczeństwa- RLS: Tabele participants i settlements muszą mieć włączone RLS z politykami ograniczającymi dostęp do rekordów powiązanych z użytkownikiem; endpoint nie może używać service key i musi działać na kontekście zalogowanego użytkownika.

- Autoryzacja w SSR: Użyć kontekstowego klienta Supabase w handlerze Astro SSR, aby request był mapowany do roli authenticated/anon i RLS egzekwował zasady; brak sesji daje auth.uid() = null, co blokuje dostęp.
- Walidacja wejścia: Zod i ścisłe schematy minimalizują ryzyko wstrzyknięć; normalize nickname do lower(nickname) do porównań biznesowych.
- Ograniczanie nadużyć: Rate limiting na poziomie middleware, logowanie prób kolizji 409, brak ujawniania szczegółów constraintów w treści błędów.

### Obsługa błędów- 400 Bad Request: Nieprawidłowe UUID, niezgodność schematu body, puste body, nieobsługiwane pola.

- 401 Unauthorized: Brak sesji (brak JWT/cookies).
- 403 Forbidden: Sesja istnieje, ale RLS/polityki uniemożliwiają dostęp do participants/settlements.
- 404 Not Found: Nie znaleziono participant dla (settlement_id, id) albo settlement zniknął w wyścigu.
- 409 Conflict: nickname zajęty w tym settlement (unikalność po nickname_norm, z pominięciem bieżącego id).
- 422 Unprocessable Entity: settlement.status!='open'.
- 500 Internal Server Error: Niespodziewane błędy; loguj w api_errors i zwróć ogólny komunikat.

### Wydajność- Indeksy: Unikalny indeks po (settlement_id, nickname_norm) oraz BTREE po (settlement_id, created_at) przyspieszają sprawdzenie konfliktu i dostęp do rekordów.

- RLS performance: Upewnić się, że kolumny używane w politykach są zindeksowane i dublować filtry w zapytaniach aplikacji, co rekomendują praktyki Supabase dla RLS.
- Minimalizacja I/O: SELECT tylko niezbędnych kolumn i pojedyncze UPDATE z RETURNING; brak dodatkowych joinów w ścieżce szczęśliwej.

### Kroki implementacji- Struktura pliku: utworzyć src/pages/api/settlements/[settlement_id]/participants/[id].ts i export const prerender = false; handler PUT pobiera params i body, buduje supabase z locals i wywołuje service.

- Zod schemat: UpdateParticipantCommand z regex ^[a-z0-9_-]+$ i min/max długości; walidacja UUID path params; odrzucić nadmiarowe pola body (strip).
- Service: src/lib/services/participants.service.ts z metodą updateNickname realizującą: pobranie participant, weryfikację RLS przez selekcję w roli użytkownika, sprawdzenie settlement.status, sprawdzenie unikalności nickname_norm, aktualizację i mapowanie do ParticipantDTO.
- Mapowanie błędów: Przy walidacji rzucać typed errors: BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, UnprocessableEntityError; endpoint mapuje na statusy i JSON { error, code }.

- Deploy: Upewnić się, że endpoint SSR ma wyłączony prerender i działa na infrastrukturze serwerowej; pamiętać o użyciu kontekstu supabase z żetonem użytkownika, nie service key.

### Przykładowe szkice implementacji- Handler Astro (szkic):

```ts
// src/pages/api/settlements/[settlement_id]/participants/[id].ts
export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";
import { participantsService } from "@/lib/services/participants.service";

const ParamsSchema = z.object({
  settlement_id: z.string().uuid(),
  id: z.string().uuid(),
});

const BodySchema = z
  .object({
    nickname: z
      .string()
      .min(3)
      .max(30)
      .regex(/^[a-z0-9_-]+$/),
  })
  .strict();

export const PUT: APIRoute = async (ctx) => {
  const { locals, params, request } = ctx;
  const supabase = locals.supabase; // kontekstowy klient powiązany z user session

  try {
    const { settlement_id, id } = ParamsSchema.parse(params);
    const body = BodySchema.parse(await request.json());

    const session = await supabase.auth.getUser();
    if (!session?.data.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    }

    const dto = await participantsService.updateNickname({
      supabase,
      settlementId: settlement_id,
      participantId: id,
      nickname: body.nickname,
      editorUserId: session.data.user.id,
    });

    return new Response(JSON.stringify(dto), { status: 200 });
  } catch (err: any) {
    // mapowanie błędów (skrót)
    // ... zwróć odpowiedni status 400/403/404/409/422/500
    return new Response(JSON.stringify({ error: "internal_error" }), { status: 500 });
  }
};
```

- Szkic service:

```ts
// src/lib/services/participants.service.ts
import type { SupabaseClient } from "@/db/supabase.client";

export const participantsService = {
  async updateNickname(input: {
    supabase: SupabaseClient;
    settlementId: string;
    participantId: string;
    nickname: string;
    editorUserId: string;
  }) {
    const { supabase, settlementId, participantId, nickname, editorUserId } = input;

    // 1) Pobierz participant w kontekście RLS (404 jeśli brak widoczności)
    const { data: participant, error: pErr } = await supabase
      .from("participants")
      .select("id, settlement_id")
      .eq("settlement_id", settlementId)
      .eq("id", participantId)
      .single();
    if (pErr || !participant) throw new NotFoundError("participant_not_found");

    // 2) Pobierz settlement i sprawdź status
    const { data: settlement, error: sErr } = await supabase
      .from("settlements")
      .select("id, status")
      .eq("id", settlementId)
      .single();
    if (sErr || !settlement) throw new NotFoundError("settlement_not_found");
    if (settlement.status !== "open") throw new UnprocessableEntityError("settlement_closed");

    // 3) Sprawdź konflikt nickname_norm
    const nicknameNorm = nickname.toLowerCase();
    const { data: conflict } = await supabase
      .from("participants")
      .select("id")
      .eq("settlement_id", settlementId)
      .eq("nickname_norm", nicknameNorm)
      .neq("id", participantId)
      .maybeSingle();
    if (conflict) throw new ConflictError("nickname_exists");

    // 4) Aktualizuj
    const { data: updated, error: uErr } = await supabase
      .from("participants")
      .update({
        nickname,
        last_edited_by: editorUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("settlement_id", settlementId)
      .eq("id", participantId)
      .select("id, nickname, is_owner, created_at, updated_at, last_edited_by")
      .single();
    if (uErr || !updated) throw new InternalError("update_failed");

    return updated; // ParticipantDTO
  },
};
```

Dodatkowe uwagi implementacyjne

- Zaimplementować mapowanie wyjątków na kody HTTP i spójne kody błędów w JSON, zgodnie z tabelą statusów dla 400/401/403/404/409/422/500.
