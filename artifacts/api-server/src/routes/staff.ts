import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, staffTable } from "@workspace/db";
import {
  CreateStaffBody,
  GetStaffParams,
  GetStaffResponse,
  UpdateStaffParams,
  UpdateStaffBody,
  UpdateStaffResponse,
  DeleteStaffParams,
  ListStaffResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/staff", async (_req, res): Promise<void> => {
  const staff = await db.select().from(staffTable).orderBy(staffTable.id);
  const parsed = staff.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }));
  res.json(ListStaffResponse.parse(parsed));
});

router.post("/staff", async (req, res): Promise<void> => {
  const parsed = CreateStaffBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [member] = await db.insert(staffTable).values(parsed.data).returning();
  res.status(201).json(GetStaffResponse.parse({ ...member, createdAt: member.createdAt.toISOString() }));
});

router.get("/staff/:id", async (req, res): Promise<void> => {
  const params = GetStaffParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [member] = await db.select().from(staffTable).where(eq(staffTable.id, params.data.id));
  if (!member) {
    res.status(404).json({ error: "Staff not found" });
    return;
  }
  res.json(GetStaffResponse.parse({ ...member, createdAt: member.createdAt.toISOString() }));
});

router.put("/staff/:id", async (req, res): Promise<void> => {
  const params = UpdateStaffParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateStaffBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [member] = await db
    .update(staffTable)
    .set(body.data)
    .where(eq(staffTable.id, params.data.id))
    .returning();
  if (!member) {
    res.status(404).json({ error: "Staff not found" });
    return;
  }
  res.json(UpdateStaffResponse.parse({ ...member, createdAt: member.createdAt.toISOString() }));
});

router.delete("/staff/:id", async (req, res): Promise<void> => {
  const params = DeleteStaffParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db.delete(staffTable).where(eq(staffTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Staff not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
