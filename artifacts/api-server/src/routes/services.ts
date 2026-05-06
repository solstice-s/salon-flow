import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, servicesTable } from "@workspace/db";
import {
  CreateServiceBody,
  GetServiceParams,
  GetServiceResponse,
  UpdateServiceParams,
  UpdateServiceBody,
  UpdateServiceResponse,
  DeleteServiceParams,
  ListServicesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/services", async (_req, res): Promise<void> => {
  const services = await db.select().from(servicesTable).orderBy(servicesTable.id);
  const parsed = services.map((s) => ({
    ...s,
    price: parseFloat(s.price),
    createdAt: s.createdAt.toISOString(),
  }));
  res.json(ListServicesResponse.parse(parsed));
});

router.post("/services", async (req, res): Promise<void> => {
  const parsed = CreateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [service] = await db
    .insert(servicesTable)
    .values({
      name: parsed.data.name,
      durationMinutes: parsed.data.durationMinutes,
      price: String(parsed.data.price),
      description: parsed.data.description ?? null,
    })
    .returning();
  res.status(201).json(GetServiceResponse.parse({ ...service, price: parseFloat(service.price), createdAt: service.createdAt.toISOString() }));
});

router.get("/services/:id", async (req, res): Promise<void> => {
  const params = GetServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, params.data.id));
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  res.json(GetServiceResponse.parse({ ...service, price: parseFloat(service.price), createdAt: service.createdAt.toISOString() }));
});

router.put("/services/:id", async (req, res): Promise<void> => {
  const params = UpdateServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateServiceBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [service] = await db
    .update(servicesTable)
    .set({
      name: body.data.name,
      durationMinutes: body.data.durationMinutes,
      price: String(body.data.price),
      description: body.data.description ?? null,
    })
    .where(eq(servicesTable.id, params.data.id))
    .returning();
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  res.json(UpdateServiceResponse.parse({ ...service, price: parseFloat(service.price), createdAt: service.createdAt.toISOString() }));
});

router.delete("/services/:id", async (req, res): Promise<void> => {
  const params = DeleteServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db.delete(servicesTable).where(eq(servicesTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
