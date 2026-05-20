import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { TicketItem, TicketStatus } from "./types"
import { BoardCard } from "./components"

interface TicketBoardProps {
  boardColumns: { status: TicketStatus; label: string; color: string; tickets: TicketItem[] }[]
  navigateToTicket: (id: string) => void
}

export function TicketBoard({ boardColumns, navigateToTicket }: TicketBoardProps) {
  return (
    <ScrollArea className="h-full">
      <div className="flex gap-4 pb-4 overflow-x-auto min-w-max h-full">
        {boardColumns.map((col) => (
          <div key={col.status} className="w-[280px] shrink-0 flex flex-col">
            <div className="flex items-center justify-between mb-3 px-1 sticky top-0 bg-background/95 z-10 py-1">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${col.color}`} />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{col.label}</span>
              </div>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold">
                {col.tickets.length}
              </Badge>
            </div>
            <div className="space-y-2 flex-1">
              {col.tickets.map((ticket) => (
                <BoardCard
                  key={ticket.id}
                  ticket={ticket}
                  onClick={() => navigateToTicket(ticket.id)}
                />
              ))}
              {col.tickets.length === 0 && (
                <div className="rounded-lg border border-dashed p-8 text-center bg-muted/20">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Empty</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
