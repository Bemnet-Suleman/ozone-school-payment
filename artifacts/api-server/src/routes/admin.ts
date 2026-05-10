import { Router } from "express";
import { db, usersTable, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { CreateStudentBody, LinkStudentToParentBody } from "@workspace/api-zod";

const router = Router();

router.get("/admin/users", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.id);
  res.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
    }))
  );
});

router.post("/admin/students", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, grade, section, parentId } = parsed.data;

  const [student] = await db
    .insert(studentsTable)
    .values({ name, grade, section, parentId: parentId ?? null })
    .returning();

  let parentName: string | null = null;
  if (student.parentId) {
    const [parent] = await db.select().from(usersTable).where(eq(usersTable.id, student.parentId));
    parentName = parent?.name ?? null;
  }

  res.status(201).json({
    id: student.id,
    name: student.name,
    grade: student.grade,
    section: student.section,
    parentId: student.parentId ?? null,
    parentName,
    createdAt: student.createdAt.toISOString(),
  });
});

router.post("/admin/link-student", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = LinkStudentToParentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { studentId, parentId } = parsed.data;

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const [parent] = await db.select().from(usersTable).where(eq(usersTable.id, parentId));
  if (!parent) {
    res.status(404).json({ error: "Parent not found" });
    return;
  }
  if (parent.role !== "parent") {
    res.status(400).json({ error: "Target user is not a parent" });
    return;
  }

  const [updated] = await db
    .update(studentsTable)
    .set({ parentId })
    .where(eq(studentsTable.id, studentId))
    .returning();

  res.json({
    id: updated.id,
    name: updated.name,
    grade: updated.grade,
    section: updated.section,
    parentId: updated.parentId ?? null,
    parentName: parent.name,
    createdAt: updated.createdAt.toISOString(),
  });
});

export default router;
