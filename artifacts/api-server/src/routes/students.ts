import { Router } from "express";
import { db, studentsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/students", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as typeof req & { user: { id: number; role: string } };

  let rows;
  if (authReq.user.role === "parent") {
    rows = await db
      .select({
        id: studentsTable.id,
        name: studentsTable.name,
        grade: studentsTable.grade,
        section: studentsTable.section,
        parentId: studentsTable.parentId,
        parentName: usersTable.name,
        createdAt: studentsTable.createdAt,
      })
      .from(studentsTable)
      .leftJoin(usersTable, eq(studentsTable.parentId, usersTable.id))
      .where(eq(studentsTable.parentId, authReq.user.id));
  } else {
    rows = await db
      .select({
        id: studentsTable.id,
        name: studentsTable.name,
        grade: studentsTable.grade,
        section: studentsTable.section,
        parentId: studentsTable.parentId,
        parentName: usersTable.name,
        createdAt: studentsTable.createdAt,
      })
      .from(studentsTable)
      .leftJoin(usersTable, eq(studentsTable.parentId, usersTable.id));
  }

  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      grade: r.grade,
      section: r.section,
      parentId: r.parentId ?? null,
      parentName: r.parentName ?? null,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

router.get("/students/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid student id" });
    return;
  }

  const [row] = await db
    .select({
      id: studentsTable.id,
      name: studentsTable.name,
      grade: studentsTable.grade,
      section: studentsTable.section,
      parentId: studentsTable.parentId,
      parentName: usersTable.name,
      createdAt: studentsTable.createdAt,
    })
    .from(studentsTable)
    .leftJoin(usersTable, eq(studentsTable.parentId, usersTable.id))
    .where(eq(studentsTable.id, id));

  if (!row) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.json({
    id: row.id,
    name: row.name,
    grade: row.grade,
    section: row.section,
    parentId: row.parentId ?? null,
    parentName: row.parentName ?? null,
    createdAt: row.createdAt.toISOString(),
  });
});

export default router;
