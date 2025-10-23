import { formatDate } from "@/types";

interface ExpensesDateGroupHeaderProps {
  date: Date;
}

export default function ExpensesDateGroupHeader({ date }: ExpensesDateGroupHeaderProps) {
  return (
    <div className="flex items-center mb-4">
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900">{formatDate(date)}</h3>
      </div>
      <div className="flex-1 border-t border-gray-200" />
    </div>
  );
}
