# REST API Plan for FlexiSplit

## 1. Resources

### Settlements Resource

- **Database Table**: `settlements`
- **Description**: Manages settlement entities which are the core containers for expense sharing calculations. Each settlement belongs to an owner and can have multiple participants and expenses.

### Participants Resource

- **Database Table**: `participants`
- **Description**: Manages participant entities within settlements. Participants can be payers or receivers of expenses.

### Expenses Resource

- **Database Table**: `expenses`
- **Description**: Manages expense entities within settlements. Each expense has a payer and can be shared among multiple participants.

### Expense Participants Resource

- **Database Table**: `expense_participants`
- **Description**: Junction table managing the many-to-many relationship between expenses and participants (who share the expense cost).

### Settlement Snapshots Resource

- **Database Table**: `settlement_snapshots`
- **Description**: Stores finalized calculation results (balances and transfers) for closed settlements.

### Events Resource

- **Database Table**: `events`
- **Description**: Tracks analytical events for user behavior analysis and funnel tracking.

## 2. Endpoints

### Settlements Endpoints

#### GET /settlements

- **Description**: Retrieve list of settlements for authenticated user with filtering and pagination
- **Query Parameters**:
  - `status` (optional): Filter by status ('open', 'closed')
  - `page` (optional): Page number for pagination (default: 1)
  - `limit` (optional): Items per page (default: 20, max: 50)
  - `sort_by` (optional): Sort field ('created_at', 'updated_at', 'title')
  - `sort_order` (optional): Sort order ('asc', 'desc')
- **Response Structure**:

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "string",
      "status": "open|closed",
      "currency": "PLN",
      "participants_count": 0,
      "expenses_count": 0,
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "closed_at": "timestamp|null",
      "last_edited_by": "uuid|null"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

- **Success Codes**: 200 OK
- **Error Codes**: 401 Unauthorized, 403 Forbidden

#### POST /settlements

- **Description**: Create a new settlement
- **Request Body**:

```json
{
  "title": "string (max 100 chars, required)"
}
```

- **Response Structure**: Same as GET /settlements item
- **Success Codes**: 201 Created
- **Error Codes**: 400 Bad Request (validation errors), 401 Unauthorized, 422 Unprocessable Entity (max 3 open settlements)

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

#### DELETE /settlements/{id}

- **Description**: Delete settlement (only if status='closed')
- **Response Structure**: Empty
- **Success Codes**: 204 No Content
- **Error Codes**: 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity (open settlement)

#### POST /settlements/{id}/close

- **Description**: Finalize settlement (calculate balances and transfers, set status to 'closed')
- **Response Structure**:

```json
{
  "id": "uuid",
  "status": "closed",
  "closed_at": "timestamp",
  "balances": {
    "participant_id": "bigint (amount in cents)"
  },
  "transfers": [
    {
      "from": "uuid",
      "to": "uuid",
      "amount_cents": "bigint"
    }
  ]
}
```

- **Success Codes**: 200 OK
- **Error Codes**: 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity (already closed)

### Participants Endpoints

#### GET /settlements/{settlement_id}/participants

- **Description**: Retrieve participants for a settlement
- **Query Parameters**:
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 50, max: 100)
- **Response Structure**:

```json
{
  "data": [
    {
      "id": "uuid",
      "nickname": "string",
      "is_owner": false,
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "last_edited_by": "uuid|null"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 10,
    "total_pages": 1
  }
}
```

- **Success Codes**: 200 OK
- **Error Codes**: 401 Unauthorized, 403 Forbidden, 404 Not Found

#### POST /settlements/{settlement_id}/participants

- **Description**: Add participant to settlement (only if status='open')
- **Request Body**:

```json
{
  "nickname": "string (3-30 chars, a-z0-9_- only, required)"
}
```

- **Response Structure**: Same as GET item
- **Success Codes**: 201 Created
- **Error Codes**: 400 Bad Request (validation), 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict (nickname exists), 422 Unprocessable Entity (max 10 participants or closed settlement)

#### GET /settlements/{settlement_id}/participants/{id}

- **Description**: Retrieve single participant
- **Response Structure**: Same as GET list item
- **Success Codes**: 200 OK
- **Error Codes**: 401 Unauthorized, 403 Forbidden, 404 Not Found

#### PUT /settlements/{settlement_id}/participants/{id}

- **Description**: Update participant (nickname only, only if settlement status='open')
- **Request Body**:

```json
{
  "nickname": "string (3-30 chars, a-z0-9_- only, required)"
}
```

- **Response Structure**: Same as GET item
- **Success Codes**: 200 OK
- **Error Codes**: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict (nickname exists), 422 Unprocessable Entity (closed settlement)

#### DELETE /settlements/{settlement_id}/participants/{id}

- **Description**: Remove participant (only if settlement status='open')
- **Response Structure**: Empty
- **Success Codes**: 204 No Content
- **Error Codes**: 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity (closed settlement)

### Expenses Endpoints

#### GET /settlements/{settlement_id}/expenses

- **Description**: Retrieve expenses for a settlement with filtering
- **Query Parameters**:
  - `participant_id` (optional): Filter by payer or participant
  - `date_from` (optional): Filter by expense date from (YYYY-MM-DD)
  - `date_to` (optional): Filter by expense date to (YYYY-MM-DD)
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 50, max: 100)
  - `sort_by` (optional): Sort field ('expense_date', 'created_at', 'amount_cents')
  - `sort_order` (optional): Sort order ('asc', 'desc')
- **Response Structure**:

```json
{
  "data": [
    {
      "id": "uuid",
      "payer_participant_id": "uuid",
      "amount_cents": "bigint",
      "expense_date": "date",
      "description": "string|null",
      "share_count": 0,
      "participants": [
        {
          "id": "uuid",
          "nickname": "string"
        }
      ],
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "last_edited_by": "uuid|null"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "total_pages": 1
  }
}
```

- **Success Codes**: 200 OK
- **Error Codes**: 401 Unauthorized, 403 Forbidden, 404 Not Found

#### POST /settlements/{settlement_id}/expenses

- **Description**: Create expense (only if settlement status='open')
- **Request Body**:

```json
{
  "payer_participant_id": "uuid (required, must exist in settlement)",
  "amount_cents": "bigint (>0, required)",
  "expense_date": "date (required)",
  "description": "string|null (max 140 chars)",
  "participant_ids": ["uuid array (required, min 1, all must exist in settlement)"]
}
```

- **Response Structure**: Same as GET item
- **Success Codes**: 201 Created
- **Error Codes**: 400 Bad Request (validation), 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity (closed settlement, invalid participants)

#### GET /settlements/{settlement_id}/expenses/{id}

- **Description**: Retrieve single expense with participants
- **Response Structure**: Same as GET list item
- **Success Codes**: 200 OK
- **Error Codes**: 401 Unauthorized, 403 Forbidden, 404 Not Found

#### PUT /settlements/{settlement_id}/expenses/{id}

- **Description**: Update expense (only if settlement status='open')
- **Request Body**: Same as POST
- **Response Structure**: Same as GET item
- **Success Codes**: 200 OK
- **Error Codes**: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity (closed settlement)

#### DELETE /settlements/{settlement_id}/expenses/{id}

- **Description**: Delete expense (only if settlement status='open')
- **Response Structure**: Empty
- **Success Codes**: 204 No Content
- **Error Codes**: 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity (closed settlement)

### Settlement Snapshots Endpoints

#### GET /settlements/{settlement_id}/snapshot

- **Description**: Get settlement calculation results (only for closed settlements)
- **Response Structure**:

```json
{
  "settlement_id": "uuid",
  "balances": {
    "participant_id": "bigint"
  },
  "transfers": [
    {
      "from": "uuid",
      "to": "uuid",
      "amount_cents": "bigint"
    }
  ],
  "algorithm_version": 1,
  "created_at": "timestamp"
}
```

- **Success Codes**: 200 OK
- **Error Codes**: 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity (settlement not closed)

### Events Endpoints

#### POST /events

- **Description**: Log analytical event
- **Request Body**:

```json
{
  "event_type": "settlement_created|participant_added|expense_added|settle_confirmed|settled|summary_copied|new_settlement_started",
  "settlement_id": "uuid|null",
  "payload": {
    "env": "dev|prod",
    "additional_data": "object (optional)"
  }
}
```

- **Response Structure**: Empty
- **Success Codes**: 201 Created
- **Error Codes**: 400 Bad Request, 401 Unauthorized

#### GET /events

- **Description**: Get user's events for analytics (admin/owner access)
- **Query Parameters**:
  - `settlement_id` (optional): Filter by settlement
  - `event_type` (optional): Filter by event type
  - `date_from` (optional): Filter from date
  - `date_to` (optional): Filter to date
  - `page` (optional): Page number
  - `limit` (optional): Items per page (max 100)
- **Response Structure**:

```json
{
  "data": [
    {
      "id": "uuid",
      "event_type": "string",
      "settlement_id": "uuid|null",
      "payload": "object",
      "created_at": "timestamp"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 50,
    "total_pages": 1
  }
}
```

- **Success Codes**: 200 OK
- **Error Codes**: 401 Unauthorized, 403 Forbidden

## 3. Authentication and Authorization

### Authentication Mechanism

- **Type**: Supabase Auth (JWT tokens via HTTP-only cookies)
- **Implementation**:
  - Login/Registration handled by Supabase Auth endpoints
  - Session tokens stored in HTTP-only cookies with 14-day expiration
  - Automatic token refresh within Supabase client
  - API routes validate `auth.uid()` against database RLS policies

### Authorization Rules

- **Settlement Access**: Only settlement owner can access/modify their settlements
- **Participant/Expense Access**: Only through settlement ownership (enforced by RLS)
- **Status-based Restrictions**: No modifications allowed on closed settlements
- **Rate Limiting**: Standard Supabase rate limiting (100 req/min for authenticated users)
- **Event Logging**: Automatic logging of business events for analytics

## 4. Validation and Business Logic

### Settlement Validation Rules

- Title: Required, max 100 characters
- Status: Only 'open' → 'closed' transitions allowed
- Owner: Cannot be changed after creation
- Max 3 open settlements per user
- Cannot delete open settlements

### Participant Validation Rules

- Nickname: Required, 3-30 chars, pattern `^[a-z0-9_-]+$`, case-insensitive unique per settlement
- Max 10 participants per settlement
- Exactly one owner participant per settlement
- Cannot modify/delete participants in closed settlements

### Expense Validation Rules

- Amount: Required, positive bigint (cents), minimum 1 cent
- Date: Required, valid date
- Description: Optional, max 140 characters
- Payer: Must be existing participant in settlement
- Participants: At least 1 participant must share the expense
- Max 500 expenses per settlement
- Cannot modify/delete expenses in closed settlements

### Business Logic Implementation

- **Settlement Closing**: Atomic transaction calculating balances using deterministic algorithm (residue distributed by normalized nickname sort)
- **Transfer Minimization**: Netting algorithm to minimize number of transactions while maintaining balance
- **Audit Trail**: Automatic `updated_at` and `last_edited_by` updates on modifications
- **Counter Updates**: Automatic maintenance of `participants_count`, `expenses_count`, and `share_count`
- **Event Emission**: Automatic logging of key user actions for funnel analysis
- **Snapshot Creation**: Final calculation results stored immutably on settlement closure
