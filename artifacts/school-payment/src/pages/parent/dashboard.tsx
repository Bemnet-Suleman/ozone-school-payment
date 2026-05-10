import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  useGetMe, 
  useListStudents, 
  useListPayments, 
  useGetDashboardStats,
  getListStudentsQueryKey, 
  getListPaymentsQueryKey,
  getGetDashboardStatsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut, Wallet, GraduationCap, Clock, CheckCircle, XCircle, TrendingUp, Users, Activity } from "lucide-react";
import { useAuthStore } from "@/lib/auth";

export default function ParentDashboard() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: user, isLoading: isLoadingUser } = useGetMe({ query: { retry: false } });
  
  const { data: students, isLoading: isLoadingStudents } = useListStudents({
    query: {
      enabled: !!user,
      queryKey: getListStudentsQueryKey()
    }
  });

  const { data: payments, isLoading: isLoadingPayments } = useListPayments(undefined, {
    query: {
      enabled: !!user,
      queryKey: getListPaymentsQueryKey()
    }
  });

  const { data: stats } = useGetDashboardStats({
    query: {
      enabled: !!user,
      queryKey: getGetDashboardStatsQueryKey()
    }
  });

  useEffect(() => {
    if (!isLoadingUser && (!user || user.role !== "parent")) {
      setLocation("/");
    }
  }, [user, isLoadingUser, setLocation]);

  const handleLogout = () => {
    queryClient.clear();
    setToken(null);
    setLocation("/");
  };

  if (isLoadingUser || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-primary text-primary-foreground py-4 px-6 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            <h1 className="text-xl font-bold tracking-tight">Ozone High School</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium opacity-90">Parent Portal: {user.name}</span>
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8 mt-4">
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

        <div>
          <h2 className="text-2xl font-semibold mb-4 text-foreground flex items-center gap-2">
            My Students
          </h2>
          {isLoadingStudents ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : students && students.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {students.map((student) => (
                <Card key={student.id} className="border-border hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{student.name}</CardTitle>
                    <CardDescription>Grade {student.grade} - Section {student.section}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/parent/pay/${student.id}`}>
                      <Button className="w-full">
                        <Wallet className="h-4 w-4 mr-2" />
                        Pay Fees
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-10 text-center text-muted-foreground">
                <GraduationCap className="h-12 w-12 mb-4 opacity-20" />
                <p>No students linked to your account.</p>
                <p className="text-sm">Please contact the school administration.</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4 text-foreground">Payment History</h2>
          <Card>
            {isLoadingPayments ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : payments && payments.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{payment.studentName}</TableCell>
                        <TableCell>{payment.amount.toLocaleString()} ETB</TableCell>
                        <TableCell className="capitalize">{payment.method}</TableCell>
                        <TableCell>
                          {payment.status === "approved" && <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white"><CheckCircle className="w-3 h-3 mr-1"/> Approved</Badge>}
                          {payment.status === "pending" && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200"><Clock className="w-3 h-3 mr-1"/> Pending</Badge>}
                          {payment.status === "rejected" && <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1"/> Rejected</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <CardContent className="p-8 text-center text-muted-foreground">
                No payments found.
              </CardContent>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
