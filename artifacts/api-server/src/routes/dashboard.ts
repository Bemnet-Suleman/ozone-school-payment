import { Router } from "express";
import { db, paymentsTable, studentsTable } from "@workspace/db";
import { eq, count, sum, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as typeof req & { user: { id: number; role: string } };

  const [studentCount] = await db.select({ count: count() }).from(studentsTable);

  let paymentQuery = db
    .select({
      id: paymentsTable.id,
      studentId: paymentsTable.studentId,
      studentName: studentsTable.name,
      studentGrade: studentsTable.grade,
      userId: paymentsTable.userId,
      amount: paymentsTable.amount,
      method: paymentsTable.method,
      status: paymentsTable.status,
      transactionRef: paymentsTable.transactionRef,
      receiptImageUrl: paymentsTable.receiptImageUrl,
      notes: paymentsTable.notes,
      paidAt: paymentsTable.paidAt,
      createdAt: paymentsTable.createdAt,
    })
    .from(paymentsTable)
    .leftJoin(studentsTable, eq(paymentsTable.studentId, studentsTable.id))
    .$dynamic();

  if (authReq.user.role === "parent") {
    paymentQuery = paymentQuery.where(eq(paymentsTable.userId, authReq.user.id));
  }

  const allPayments = await paymentQuery.orderBy(desc(paymentsTable.createdAt));

  const totalPayments = allPayments.length;
  const pendingPayments = allPayments.filter((p) => p.status === "pending").length;
  const approvedPayments = allPayments.filter((p) => p.status === "approved").length;
  const totalAmountCollected = allPayments
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);

  const recentPayments = allPayments.slice(0, 5).map((r) => ({
    id: r.id,
    studentId: r.studentId,
    studentName: r.studentName ?? "",
    studentGrade: r.studentGrade ?? "",
    userId: r.userId,
    amount: parseFloat(String(r.amount)),
    method: r.method,
    status: r.status,
    transactionRef: r.transactionRef ?? null,
    receiptImageUrl: r.receiptImageUrl ?? null,
    notes: r.notes ?? null,
    paidAt: r.paidAt ? r.paidAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  res.json({
    totalStudents: studentCount.count,
    totalPayments,
    pendingPayments,
    approvedPayments,
    totalAmountCollected,
    recentPayments,
  });
});

export default router;
