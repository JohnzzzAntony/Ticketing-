import { formatDistanceToNow } from "date-fns"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { PriorityBadge, StatusBadge, UserAvatar } from "./components"
import type { TicketItem } from "./types"

interface TicketTableProps {
  tickets: TicketItem[]
  mounted: boolean
  navigateToTicket: (id: string) => void
  renderPagination: () => React.ReactNode
}

export function TicketTable({ tickets, mounted, navigateToTicket, renderPagination }: TicketTableProps) {
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Dept</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Assignee</TableHead>
            <TableHead className="hidden md:table-cell text-right">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow
              key={ticket.id}
              className="cursor-pointer group"
              onClick={() => navigateToTicket(ticket.id)}
            >
              <TableCell className="font-mono text-[10px] font-bold text-muted-foreground uppercase">
                {ticket.ticketId}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium text-sm group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {ticket.title}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px] px-1 h-5 uppercase border-slate-300 dark:border-slate-700">
                  {ticket.department.code}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <span className="text-xs text-muted-foreground">{ticket.category.name}</span>
              </TableCell>
              <TableCell><PriorityBadge priority={ticket.priority} /></TableCell>
              <TableCell><StatusBadge status={ticket.status} /></TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="flex items-center gap-2">
                  <UserAvatar user={ticket.assignee} />
                  <span className="text-xs text-muted-foreground">
                    {ticket.assignee?.name || 'Unassigned'}
                  </span>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell text-right">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {mounted ? formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true }) : '...'}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Separator />
      <div className="px-4 py-3">{renderPagination()}</div>
    </>
  )
}
