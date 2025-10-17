import { Users, Receipt, Calendar, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CardActionsMenu from "./CardActionsMenu";
import type { SettlementCardVM } from "@/types";
import { formatDate } from "@/types";

interface SettlementCardProps {
  item: SettlementCardVM;
  onDelete: (id: string, title: string) => void;
}

export default function SettlementCard({ item, onDelete }: SettlementCardProps) {
  const handleCardClick = () => {
    // TODO: Navigate to settlement details
    window.location.href = item.href;
  };

  const handleDelete = () => {
    onDelete(item.id, item.title);
  };

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleCardClick}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="font-semibold text-lg truncate">{item.title}</h3>
              <Badge variant={item.status === "open" ? "default" : "secondary"} className="shrink-0">
                {item.status === "open" ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Aktywne
                  </>
                ) : (
                  "Zamknięte"
                )}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{item.participantsCount} uczestników</span>
              </div>
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                <span>{item.expensesCount} wydatków</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                <span>Utworzone: {formatDate(item.createdAt)}</span>
              </div>
              {item.closedAt && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" />
                  <span>Zamknięte: {formatDate(item.closedAt)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
            >
              Zobacz
            </Button>
            <CardActionsMenu canDelete={item.isDeletable} onRequestDelete={handleDelete} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
