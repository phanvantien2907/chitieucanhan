import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const expenses = [
  {
    id: "1",
    date: "26/03/2025",
    category: "Ăn uống",
    note: "Cà phê & bữa trưa",
    amount: "185.000 ₫",
    status: "posted" as const,
  },
  {
    id: "2",
    date: "25/03/2025",
    category: "Di chuyển",
    note: "Xăng xe",
    amount: "420.000 ₫",
    status: "posted" as const,
  },
  {
    id: "3",
    date: "24/03/2025",
    category: "Hóa đơn",
    note: "Điện tháng 3",
    amount: "612.000 ₫",
    status: "posted" as const,
  },
  {
    id: "4",
    date: "23/03/2025",
    category: "Giải trí",
    note: "Phim & streaming",
    amount: "99.000 ₫",
    status: "pending" as const,
  },
  {
    id: "5",
    date: "22/03/2025",
    category: "Sức khỏe",
    note: "Khám định kỳ",
    amount: "350.000 ₫",
    status: "posted" as const,
  },
] as const;

function StatusBadge({
  status,
}: {
  status: (typeof expenses)[number]["status"];
}) {
  const label = status === "posted" ? "Đã ghi" : "Chờ duyệt";
  const variant = status === "posted" ? "secondary" : "outline";
  return (
    <Badge variant={variant} className="font-normal">
      {label}
    </Badge>
  );
}

export function RecentExpensesTable() {
  return (
    <Card className="border-border/80 shadow-sm transition-shadow duration-200 hover:shadow-sm">
      <CardHeader>
        <CardTitle>Chi tiêu gần đây</CardTitle>
        <CardDescription>
          Các khoản đã ghi nhận trong tài khoản của bạn.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Ngày</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead className="hidden sm:table-cell">Ghi chú</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="pr-6 text-right">Số tiền</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((row) => (
              <TableRow
                key={row.id}
                className="group transition-colors duration-150"
              >
                <TableCell className="text-muted-foreground group-hover:text-foreground pl-6 text-xs font-medium whitespace-nowrap sm:text-sm">
                  {row.date}
                </TableCell>
                <TableCell className="font-medium">{row.category}</TableCell>
                <TableCell className="text-muted-foreground hidden max-w-[140px] truncate sm:table-cell">
                  {row.note}
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="pr-6 text-right font-medium tabular-nums">
                  {row.amount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
