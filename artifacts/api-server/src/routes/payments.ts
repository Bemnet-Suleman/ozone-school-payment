import { Router } from "express";
import { db, paymentsTable, studentsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import {
  CreatePaymentBody,
  SubmitManualPaymentBody,
  ApprovePaymentBody,
  RejectPaymentBody,
  ListPaymentsQueryParams,
} from "@workspace/api-zod";

const router = Router();

function formatPayment(row: {
  id: number;
  studentId: number;
  studentName: string | null;
  studentGrade: string | null;
  userId: number;
  amount: string;
  method: string;
  status: string;
  transactionRef: string | null;
  receiptImageUrl: string | null;
  notes: string | null;
  paidAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    studentId: row.studentId,
    studentName: row.studentName ?? "",
    studentGrade: row.studentGrade ?? "",
    userId: row.userId,
    amount: parseFloat(row.amount),
    method: row.method,
    status: row.status,
    transactionRef: row.transactionRef ?? null,
    receiptImageUrl: row.receiptImageUrl ?? null,
    notes: row.notes ?? null,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function getPaymentsQuery(filters: { userId?: number; studentId?: number; status?: string }) {
  const conditions = [];
  if (filters.userId !== undefined) {
    conditions.push(eq(paymentsTable.userId, filters.userId));
  }
  if (filters.studentId !== undefined) {
    conditions.push(eq(paymentsTable.studentId, filters.studentId));
  }
  if (filters.status !== undefined) {
    conditions.push(eq(paymentsTable.status, filters.status as "pending" | "approved" | "rejected"));
  }

  const query = db
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
    .leftJoin(studentsTable, eq(paymentsTable.studentId, studentsTable.id));

  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(desc(paymentsTable.createdAt));
  }
  return query.orderBy(desc(paymentsTable.createdAt));
}

router.get("/payments", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as typeof req & { user: { id: number; role: string } };
  const parsed = ListPaymentsQueryParams.safeParse(req.query);

  const filters: { userId?: number; studentId?: number; status?: string } = {};

  if (authReq.user.role === "parent") {
    filters.userId = authReq.user.id;
  }
  if (parsed.success && parsed.data.studentId) {
    filters.studentId = parsed.data.studentId;
  }
  if (parsed.success && parsed.data.status) {
    filters.status = parsed.data.status;
  }

  const rows = await getPaymentsQuery(filters);
  res.json(rows.map(formatPayment));
});

router.post("/payments/manual", requireAuth, requireRole("parent"), async (req, res): Promise<void> => {
  const authReq = req as typeof req & { user: { id: number } };
  const parsed = SubmitManualPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { studentId, amount, transactionRef, receiptImageUrl } = parsed.data;

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const [payment] = await db
    .insert(paymentsTable)
    .values({
      studentId,
      userId: authReq.user.id,
      amount: String(amount),
      method: "manual",
      status: "pending",
      transactionRef,
      receiptImageUrl: receiptImageUrl ?? null,
    })
    .returning();

  const rows = await getPaymentsQuery({ studentId: payment.studentId });
  const row = rows.find((r) => r.id === payment.id);
  if (!row) {
    res.status(500).json({ error: "Failed to fetch payment" });
    return;
  }
  res.status(201).json(formatPayment(row));
});

router.post("/payments", requireAuth, requireRole("parent"), async (req, res): Promise<void> => {
  const authReq = req as typeof req & { user: { id: number; email: string; role: string } };
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { studentId, amount } = parsed.data;

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const txRef = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const [payment] = await db
    .insert(paymentsTable)
    .values({
      studentId,
      userId: authReq.user.id,
      amount: String(amount),
      method: "chapa",
      status: "pending",
      transactionRef: txRef,
    })
    .returning();

  const mockCheckoutUrl = `/payment-success?txRef=${txRef}`;

  res.status(201).json({
    checkoutUrl: mockCheckoutUrl,
    txRef,
    paymentId: payment.id,
  });
});

router.get("/payments/chapa/verify/:txRef", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.txRef) ? req.params.txRef[0] : req.params.txRef;

  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.transactionRef, raw));

  if (!payment) {
    res.status(404).json({ error: "Payment not found for this transaction reference" });
    return;
  }

  if (payment.status === "pending") {
    await db
      .update(paymentsTable)
      .set({ status: "approved", paidAt: new Date() })
      .where(eq(paymentsTable.id, payment.id));
  }

  const rows = await getPaymentsQuery({ studentId: payment.studentId });
  const row = rows.find((r) => r.transactionRef === raw);
  if (!row) {
    res.status(500).json({ error: "Failed to fetch payment" });
    return;
  }
  res.json(formatPayment(row));
});

router.get("/payments/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid payment id" });
    return;
  }

  const rows = await db
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
    .where(eq(paymentsTable.id, id));

  if (!rows[0]) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  res.json(formatPayment(rows[0]));
});

router.patch("/payments/:id/approve", requireAuth, requireRole("cashier", "admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid payment id" });
    return;
  }

  const parsed = ApprovePaymentBody.safeParse(req.body);
  const notes = parsed.success ? parsed.data.notes ?? null : null;

  const [existing] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  await db
    .update(paymentsTable)
    .set({ status: "approved", paidAt: new Date(), notes })
    .where(eq(paymentsTable.id, id));

  const rows = await db
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
    .where(eq(paymentsTable.id, id));

  res.json(formatPayment(rows[0]));
});

router.patch("/payments/:id/reject", requireAuth, requireRole("cashier", "admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid payment id" });
    return;
  }

  const parsed = RejectPaymentBody.safeParse(req.body);
  const notes = parsed.success ? parsed.data.notes ?? null : null;

  const [existing] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  await db
    .update(paymentsTable)
    .set({ status: "rejected", notes })
    .where(eq(paymentsTable.id, id));

  const rows = await db
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
    .where(eq(paymentsTable.id, id));

  res.json(formatPayment(rows[0]));
});

export default router;
