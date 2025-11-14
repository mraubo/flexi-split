import type { ExpenseGroupVM } from "@/types";
import ExpensesDateGroupHeader from "./ExpensesDateGroupHeader";
import ExpensesExpenseCard from "./ExpensesExpenseCard";

interface ExpensesDateGroupListProps {
  groups: ExpenseGroupVM[];
  settlementId: string;
  onExpenseDeleted: () => void;
  isReadOnly: boolean;
}

export default function ExpensesDateGroupList({
  groups,
  settlementId,
  onExpenseDeleted,
  isReadOnly,
}: ExpensesDateGroupListProps) {
  return (
    <div className="space-y-8 md:space-y-6">
      {groups.map((group) => (
        <div key={group.date.toISOString()}>
          <ExpensesDateGroupHeader date={group.date} />

          <div className="space-y-3">
            {group.items.map((expense) => (
              <ExpensesExpenseCard
                key={expense.id}
                expense={expense}
                settlementId={settlementId}
                onDeleted={onExpenseDeleted}
                isReadOnly={isReadOnly}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
