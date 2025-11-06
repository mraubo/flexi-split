# PHASE 6: Refactor Settlement Summary Hook

**Status**: ✅ Complete  
**Duration**: ~45 minutes  
**LOC Reduction**: useSettlementSummary.ts -25% (241→180)

## Overview

PHASE 6 refactors the settlement summary hook (`useSettlementSummary.ts`) to eliminate code duplication by extracting formatting and calculation logic to shared utilities. This phase also creates TanStack Query hooks for settlement snapshots and closure operations, though the main hook maintains manual `fetch()` calls for SSR compatibility.

### Key Changes

1. **Created Settlement Formatters** (`src/lib/utils/settlementFormatters.ts`)
   - Extracted balance formatting logic
   - Extracted transfer formatting logic  
   - Extracted balance totals calculation logic
   - Type definitions for formatted data

2. **Extended API Hooks** (`src/lib/hooks/api/useSettlements.ts`)
   - Added `useSettlementSnapshot()` - query hook for fetching snapshots
   - Updated `useCloseSettlement()` - already existed, improved cache invalidation
   - Query key factory updated with snapshot keys

3. **Refactored useSettlementSummary.ts**
   - Replaced inline formatting functions with shared utilities
   - Maintained manual `fetch()` for SSR compatibility
   - Removed inline formatCurrency implementation
   - All formatting logic now delegated to utilities

## File Structure

### New Files Created

#### `src/lib/utils/settlementFormatters.ts` (136 LOC)

Settlement-specific formatting utilities for balances, transfers, and totals.

**Exports:**

```typescript
// Type definitions
export interface FormattedBalance {
  participantId: UUID;
  nickname: string;
  amountCents: AmountCents;
  formattedAmount: string;
  sign: "+" | "-" | "0";
}

export interface FormattedTransfer {
  fromId: UUID;
  fromNickname: string;
  toId: UUID;
  toNickname: string;
  amountCents: AmountCents;
  formattedAmount: string;
}

export interface BalanceTotals {
  sumPayable: number;
  sumReceivable: number;
  isBalanced: boolean;
}

export interface Transfer {
  from: UUID;
  to: UUID;
  amount_cents: AmountCents;
}

// Functions
export function formatBalances(
  balances: Record<UUID, AmountCents> | undefined | null,
  participantsMap: Record<UUID, string>
): FormattedBalance[]

export function formatTransfers(
  transfers: Transfer[] | undefined | null,
  participantsMap: Record<UUID, string>
): FormattedTransfer[]

export function calculateBalanceTotals(
  balances: Record<UUID, AmountCents> | undefined | null
): BalanceTotals
```

**Features:**

- **formatBalances()** - Converts raw balance data to display format
  - Maps participant IDs to nicknames
  - Calculates absolute amounts and signs (+/-)
  - Sorts by amount (debtors first, then creditors)
  - Falls back to "Nieznany uczestnik" for missing participants

- **formatTransfers()** - Converts raw transfer data to display format
  - Maps participant IDs to nicknames for both sender and receiver
  - Formats amounts using shared formatCurrency
  - Sorts by sender nickname, then receiver nickname

- **calculateBalanceTotals()** - Calculates control sum for verification
  - Sums all negative balances (payables)
  - Sums all positive balances (receivables)
  - Checks if balanced (allows for floating point tolerance)

**Usage Example:**

```typescript
import { formatBalances, formatTransfers, calculateBalanceTotals } from '@/lib/utils/settlementFormatters';

const participantsMap = { 'uuid-1': 'Alice', 'uuid-2': 'Bob' };
const balances = { 'uuid-1': -5000, 'uuid-2': 5000 }; // cents

const formattedBalances = formatBalances(balances, participantsMap);
// [
//   { participantId: 'uuid-1', nickname: 'Alice', amountCents: -5000, 
//     formattedAmount: '50,00 zł', sign: '-' },
//   { participantId: 'uuid-2', nickname: 'Bob', amountCents: 5000,
//     formattedAmount: '50,00 zł', sign: '+' }
// ]

const totals = calculateBalanceTotals(balances);
// { sumPayable: 5000, sumReceivable: 5000, isBalanced: true }
```

### Modified Files

#### `src/lib/hooks/api/useSettlements.ts` (+16 LOC)

**Added:**

```typescript
// Query key factory - added snapshot keys
export const settlementsQueryKeys = {
  // ... existing keys
  snapshots: () => [...settlementsQueryKeys.all(), "snapshot"],
  snapshot: (id: UUID) => [...settlementsQueryKeys.snapshots(), id],
};

/**
 * Hook to fetch a settlement snapshot (only for closed settlements)
 */
export function useSettlementSnapshot(id: UUID, enabled = true) {
  return useQuery({
    queryKey: settlementsQueryKeys.snapshot(id),
    queryFn: () => apiClient.get<SettlementSnapshotDTO>(`/api/settlements/${id}/snapshot`),
    enabled: enabled && !!id,
  });
}
```

**Updated:**

```typescript
// useCloseSettlement - improved cache invalidation
onSuccess: (data) => {
  // ... existing invalidations
  queryClient.invalidateQueries({
    queryKey: settlementsQueryKeys.snapshot(id), // Now uses query key factory
  });
}
```

**Purpose:** Provides TanStack Query hooks for snapshot operations, ready for future use in components that can fully leverage query caching.

#### `src/components/hooks/useSettlementSummary.ts` (241→180 LOC, -25%)

**Before:**

```typescript
// Inline formatting functions (~60 LOC)
const formattedBalances = useMemo((): FormattedBalance[] => {
  if (!settlementSnapshot?.balances) return [];

  return Object.entries(settlementSnapshot.balances)
    .map(([participantId, amountCents]) => ({
      participantId: participantId as UUID,
      nickname: participantsMap[participantId] || "Nieznany uczestnik",
      amountCents: amountCents as AmountCents,
      formattedAmount: formatCurrency(Math.abs(amountCents)),
      sign: (amountCents > 0 ? "+" : amountCents < 0 ? "-" : "0") as "+" | "-" | "0",
    }))
    .sort((a, b) => {
      if (a.amountCents !== b.amountCents) {
        return a.amountCents - b.amountCents;
      }
      return a.nickname.localeCompare(b.nickname, "pl");
    });
}, [settlementSnapshot?.balances, participantsMap]);

// Similar inline logic for transfers and totals...

// Inline formatCurrency function (~8 LOC)
function formatCurrency(amountCents: number, currency = "PLN"): string {
  const amount = amountCents / 100;
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
  }).format(amount);
}
```

**After:**

```typescript
import {
  formatBalances,
  formatTransfers,
  calculateBalanceTotals,
  type FormattedBalance,
  type FormattedTransfer,
  type BalanceTotals,
} from "@/lib/utils/settlementFormatters";

// Simplified formatting using shared utilities
const formattedBalances = useMemo(
  () => formatBalances(settlementSnapshot?.balances, participantsMap),
  [settlementSnapshot?.balances, participantsMap]
);

const formattedTransfers = useMemo(
  () => formatTransfers(settlementSnapshot?.transfers, participantsMap),
  [settlementSnapshot?.transfers, participantsMap]
);

const totals = useMemo(
  () => calculateBalanceTotals(settlementSnapshot?.balances),
  [settlementSnapshot?.balances]
);
```

**Changes:**

- ❌ Removed inline `formatBalances` logic (~25 LOC)
- ❌ Removed inline `formatTransfers` logic (~20 LOC)
- ❌ Removed inline `calculateBalanceTotals` logic (~15 LOC)
- ❌ Removed inline `formatCurrency` function (~8 LOC)
- ✅ Uses shared formatters from `lib/utils/settlementFormatters.ts`
- ✅ Maintains manual `fetch()` for SSR compatibility
- ✅ All useEffect hooks and state management preserved
- ✅ All error handling preserved

## Code Quality Metrics

### Before vs After

| Metric                      | Before | After | Change  |
| --------------------------- | ------ | ----- | ------- |
| useSettlementSummary.ts LOC | 241    | 180   | -25%    |
| Inline formatting functions | 3      | 0     | -100%   |
| Inline formatCurrency       | 1      | 0     | -100%   |
| Code duplication            | High   | None  | -100%   |
| Shared formatters           | No     | Yes   | ✅      |
| API hooks available         | No     | Yes   | ✅      |
| E2E Tests                   | 43/43  | 43/43  | ✅ Pass |

### Lines Eliminated

- Balance formatting logic: ~25 LOC (moved to settlementFormatters.ts)
- Transfer formatting logic: ~20 LOC (moved to settlementFormatters.ts)
- Totals calculation logic: ~15 LOC (moved to settlementFormatters.ts)
- Inline formatCurrency: ~8 LOC (uses existing shared formatter)
- **Total duplication eliminated:** ~68 LOC
- **Net LOC reduction in hook:** 61 LOC (25%)

## Testing Results

✅ **All 43 E2E tests pass**  
✅ **No regressions introduced**  
✅ **Test Duration:** 38.9s

**Key test coverage:**
- Settlement closure flow (`happy-path-complete-flow.spec.ts` - STEP 5)
- Balance calculations and display
- Transfer calculations and display
- Control sum verification
- Read-only mode after closure

## Build Status

✅ **TypeScript compilation successful**  
✅ **Zero build errors or warnings**  
✅ **All imports resolved correctly**

## Architecture Benefits

### 1. **Code Reusability**

Formatting utilities can now be reused across:
- Different summary views
- Export/print functionality
- Email notifications with settlement summaries
- API documentation examples
- Unit tests

### 2. **Maintainability**

- Single source of truth for balance/transfer formatting
- Changes to formatting logic only need updating in one place
- Consistent display across all settlement summary views
- Easier to add new summary formats (PDF, CSV, etc.)

### 3. **Testability**

- Formatters can be unit tested independently
- No need to mount React components to test formatting
- Easy to test edge cases (empty balances, single participant, etc.)
- Control sum calculation can be verified in isolation

### 4. **API Layer Ready**

The `useSettlementSnapshot` hook provides a foundation for:
- Future real-time settlement updates
- Optimistic UI updates when closing settlements
- Better cache management for closed settlements
- Consistent snapshot fetching patterns

### 5. **Type Safety**

- Clear interfaces for formatted data structures
- Transfer types explicitly defined
- Compiler catches formatting inconsistencies
- Better IDE autocomplete and type hints

## SSR Compatibility Note

Similar to Phase 5 (Expense Hook), `useSettlementSummary` maintains manual `fetch()` calls for SSR compatibility:

**Why manual fetch?**
1. **Component hydration** - SettlementDetailsPage uses `client:idle`
2. **QueryClient context** - May not be available during SSR/hydration
3. **Consistency** - Matches pattern from auth, participant, and expense hooks
4. **Reliability** - Manual `fetch()` is more predictable in Astro SSR context

**When to use TanStack Query hooks?**
- Components that are always client-rendered (`client:load`)
- Read operations in components with guaranteed QueryClient context
- Future features that can leverage automatic refetching
- Optimistic UI implementations

The `useSettlementSnapshot()` hook is available but not used in the main flow - it's ready for future enhancements where full TanStack Query capabilities are beneficial.

## Migration Guide

If creating new settlement summary views or components:

```typescript
// 1. Import formatters
import { 
  formatBalances, 
  formatTransfers, 
  calculateBalanceTotals 
} from '@/lib/utils/settlementFormatters';

// 2. For read operations (when QueryClient is available)
import { useSettlementSnapshot } from '@/lib/hooks/api/useSettlements';

// 3. Use formatters with any balance/transfer data
const participantsMap = { /* ... */ };
const balances = { /* ... */ };

const formatted = formatBalances(balances, participantsMap);
const totals = calculateBalanceTotals(balances);

// 4. For closing settlements, use manual fetch in forms
const response = await fetch(`/api/settlements/${id}/close`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
});
```

## Files Changed Summary

**New Files:** 1
- `src/lib/utils/settlementFormatters.ts` (136 LOC)

**Modified Files:** 2
- `src/lib/hooks/api/useSettlements.ts` (+16 LOC)
- `src/components/hooks/useSettlementSummary.ts` (-61 LOC, -25%)

**Total LOC Change:** -45 LOC net (excluding new formatters file)

## Comparison to Target

**Original Target:** -50% LOC reduction (241→~120 LOC)  
**Achieved:** -25% LOC reduction (241→180 LOC)

**Why the difference?**
1. Manual `fetch()` pattern requires similar LOC to original implementation
2. State management logic cannot be eliminated (required for UX)
3. useEffect hooks for data fetching are essential
4. Error handling and loading states are necessary

**What we achieved:**
- ✅ 100% elimination of formatting code duplication
- ✅ Created reusable settlement formatters
- ✅ Created TanStack Query hooks for future use
- ✅ Better code organization and maintainability
- ✅ All tests pass with no regressions
- ✅ SSR compatibility maintained

## Lessons Learned

1. **SSR Architecture Matters** - Astro's island architecture affects how TanStack Query can be used
2. **Pattern Consistency** - Following established patterns (from Phases 3-5) ensures architectural coherence
3. **Utilities First** - Moving formatters to shared utilities provides immediate value
4. **API Hooks Still Valuable** - Even when not used immediately, they're useful for future features
5. **Test Coverage Critical** - Comprehensive E2E tests caught the QueryClient context issue immediately

## Next Steps

With PHASE 6 complete, the project can proceed to:

1. **PHASE 7:** Final documentation and polish
   - Comprehensive architecture documentation
   - API client usage guide
   - Form patterns guide
   - Query hooks guide
   - Migration guide for developers
   - Performance benchmarks
   - Final metrics report

2. **Future Enhancements:**
   - Optimistic UI updates for settlement closure
   - Real-time balance updates using TanStack Query
   - Export summaries to PDF/CSV using shared formatters
   - Email notifications with formatted summaries

## Conclusion

PHASE 6 successfully refactors the settlement summary hook to eliminate code duplication and improve maintainability, while maintaining 100% backward compatibility, SSR support, and test coverage. The foundation is now in place for consistent settlement summary formatting throughout the application.
