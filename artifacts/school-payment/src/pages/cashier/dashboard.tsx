import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  useGetMe, 
  useListPayments, 
  useApprovePayment, 
  useRejectPayment, 
  useGetDashboardStats,
  getListPaymentsQueryKey,
  getGetDashboardStatsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogOut, Check, X, Search, FileText, TrendingUp, Users, Clock, Activity } from "lucide-react";
import { useAuthStore } from "@/lib/auth";

export default function CashierDashboard() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");

  const { data: user, isLoading: isLoadingUser } = useGetMe({ query: { retry: false } });
  
  const { data: payments, isLoading: isLoadingPayments } = useListPayments({ status: "pending" }, {
    query: {
      enabled: !!user,
      queryKey: getListPaymentsQueryKey({ status: "pending" })
    }
  });

  const { data: stats } = useGetDashboardStats({
    query: {
      enabled: !!user,
      queryKey: getGetDashboardStatsQueryKey()
    }
  });

  const approveMutation = useApprovePayment();
  const rejectMutation = useRejectPayment();

  useEffect(() => {
    if (!isLoadingUser && (!user || user.role !== "cashier")) {
      setLocation("/");
    }
  }, [user, isLoadingUser, setLocation]);

  const handleLogout = () => {
    queryClient.clear();
    setToken(null);
    setLocation("/");
  };

  const handleApprove = (id: number) => {
    approveMutation.mutate(
      { id, data: {} },
      {
        onSuccess: () => {
          toast({ title: "Approved", description: "Payment has been approved." });
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey({ status: "pending" }) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        }
      }
    );
  };

  const handleReject = (id: number) => {
    rejectMutation.mutate(
      { id, data: {} },
      {
        onSuccess: () => {
          toast({ title: "Rejected", description: "Payment has been rejected." });
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey({ status: "pending" }) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        }
      }
    );
  };

  const filteredPayments = payments?.filter(p => 
    p.method === "manual" && 
    (p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (p.transactionRef && p.transactionRef.toLowerCase().includes(searchTerm.toLowerCase())))
  ) || [];

  if (isLoadingUser || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-primary text-primary-foreground py-4 px-6 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <h1 className="text-xl font-bold tracking-tight">Finance Office</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium opacity-90">Cashier: {user.name}</span>
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8 mt-4">
        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalStudents}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAmountCollected.toLocaleString()} ETB</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingPayments}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved Payments</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.approvedPayments}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between gap-4 md:items-end">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Pending Manual Transfers</h2>
            <p className="text-muted-foreground text-sm mt-1">Review and approve bank deposit slips</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by student or ref..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Card>
          {isLoadingPayments ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filteredPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reference No.</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{payment.studentName} <span className="text-xs text-muted-foreground block">G: {payment.studentGrade}</span></TableCell>
                      <TableCell className="font-semibold">{payment.amount.toLocaleString()} ETB</TableCell>
                      <TableCell className="font-mono text-xs">{payment.transactionRef}</TableCell>
                      <TableCell>
                        {payment.receiptImageUrl ? (
                          <a href={payment.receiptImageUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-medium">View Image</a>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Not provided</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200"
                            onClick={() => handleApprove(payment.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border-red-200"
                            onClick={() => handleReject(payment.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            <X className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <CardContent className="p-16 text-center text-muted-foreground flex flex-col items-center">
              <Check className="h-12 w-12 mb-4 text-green-500/20" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-sm">No pending manual payments to review.</p>
            </CardContent>
          )}
        </Card>
      </main>
    </div>
  );
}
