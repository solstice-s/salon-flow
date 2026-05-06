import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, bookingsTable } from "@workspace/db";
import { AdminLoginBody, AdminLoginResponse, GetAdminStatsResponse } from "@workspace/api-zod";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";
const ADMIN_TOKEN = "salonflow-admin-token-2024";

const router: IRouter = Router();

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.username !== ADMIN_USERNAME || parsed.data.password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  res.json(AdminLoginResponse.parse({ success: true, token: ADMIN_TOKEN }));
});

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const rows = await db
    .select({
      status: bookingsTable.status,
      totalPrice: bookingsTable.totalPrice,
      bookingDate: bookingsTable.bookingDate,
    })
    .from(bookingsTable);

  let totalBookings = 0;
  let pendingBookings = 0;
  let confirmedBookings = 0;
  let completedBookings = 0;
  let cancelledBookings = 0;
  let todayBookings = 0;
  let totalRevenue = 0;

  for (const row of rows) {
    totalBookings++;
    if (row.status === "pending") pendingBookings++;
    if (row.status === "confirmed") confirmedBookings++;
    if (row.status === "completed") completedBookings++;
    if (row.status === "cancelled") cancelledBookings++;
    if (row.bookingDate === today) todayBookings++;
    if (row.status !== "cancelled") totalRevenue += parseFloat(row.totalPrice);
  }

  res.json(
    GetAdminStatsResponse.parse({
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      todayBookings,
      totalRevenue,
    })
  );
});

export default router;
