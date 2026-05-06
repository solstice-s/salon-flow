import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, bookingsTable, servicesTable, staffTable } from "@workspace/db";
import {
  CreateBookingBody,
  GetBookingParams,
  GetBookingResponse,
  UpdateBookingParams,
  UpdateBookingBody,
  UpdateBookingResponse,
  ListBookingsQueryParams,
  GetAvailableSlotsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generateReference(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let ref = "SF-";
  for (let i = 0; i < 8; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}

function serializeBooking(booking: Record<string, unknown>, service: Record<string, unknown> | null, staff: Record<string, unknown> | null) {
  return {
    id: booking.id,
    referenceNumber: booking.referenceNumber,
    serviceId: booking.serviceId,
    staffId: booking.staffId ?? null,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    customerNotes: booking.customerNotes ?? null,
    bookingDate: booking.bookingDate,
    bookingTime: booking.bookingTime,
    status: booking.status,
    adminNotes: booking.adminNotes ?? null,
    totalPrice: parseFloat(booking.totalPrice as string),
    createdAt: (booking.createdAt as Date).toISOString(),
    service: service
      ? {
          id: service.id,
          name: service.name,
          durationMinutes: service.durationMinutes,
          price: parseFloat(service.price as string),
          description: service.description ?? null,
          createdAt: (service.createdAt as Date).toISOString(),
        }
      : null,
    staff: staff
      ? {
          id: staff.id,
          name: staff.name,
          role: staff.role,
          createdAt: (staff.createdAt as Date).toISOString(),
        }
      : null,
  };
}

async function getBookingWithRelations(id: number) {
  const rows = await db
    .select({
      booking: bookingsTable,
      service: servicesTable,
      staff: staffTable,
    })
    .from(bookingsTable)
    .leftJoin(servicesTable, eq(bookingsTable.serviceId, servicesTable.id))
    .leftJoin(staffTable, eq(bookingsTable.staffId, staffTable.id))
    .where(eq(bookingsTable.id, id));
  return rows[0] || null;
}

router.get("/bookings/available-slots", async (req, res): Promise<void> => {
  const parsed = GetAvailableSlotsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { date, serviceId, staffId } = parsed.data;

  // Check if Friday (closed)
  const dateObj = new Date(date + "T00:00:00");
  const dayOfWeek = dateObj.getDay(); // 0=Sunday ... 5=Friday
  if (dayOfWeek === 5) {
    res.json({ date, slots: [], isClosed: true });
    return;
  }

  // Generate all 30-min slots 10:00–20:30
  const allSlots: string[] = [];
  for (let h = 10; h <= 20; h++) {
    allSlots.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 20 || false) allSlots.push(`${String(h).padStart(2, "0")}:30`);
  }
  // Add 20:30 explicitly
  allSlots.push("20:30");

  // Filter past slots if today
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  let filteredSlots = allSlots;
  if (date === todayStr) {
    const nowMinutes = today.getHours() * 60 + today.getMinutes();
    filteredSlots = allSlots.filter((slot) => {
      const [hh, mm] = slot.split(":").map(Number);
      return hh * 60 + mm > nowMinutes;
    });
  }

  // Find booked slots for this date + staff (or any staff if staffId provided)
  let bookedQuery = db
    .select({ time: bookingsTable.bookingTime })
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.bookingDate, date),
        sql`${bookingsTable.status} NOT IN ('cancelled')`
      )
    );

  const bookedRows = await bookedQuery;

  // If a specific staff is requested, also filter by staff
  let takenSlots: Set<string>;
  if (staffId) {
    const staffBookings = await db
      .select({ time: bookingsTable.bookingTime })
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.bookingDate, date),
          eq(bookingsTable.staffId, staffId),
          sql`${bookingsTable.status} NOT IN ('cancelled')`
        )
      );
    takenSlots = new Set(staffBookings.map((b) => b.time));
  } else {
    takenSlots = new Set<string>();
  }

  const availableSlots = filteredSlots.filter((slot) => !takenSlots.has(slot));

  res.json({ date, slots: availableSlots, isClosed: false });
});

router.get("/bookings", async (req, res): Promise<void> => {
  const parsed = ListBookingsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const whereClause =
    parsed.data.status
      ? and(eq(bookingsTable.status, parsed.data.status))
      : undefined;

  const rows = await db
    .select({
      booking: bookingsTable,
      service: servicesTable,
      staff: staffTable,
    })
    .from(bookingsTable)
    .leftJoin(servicesTable, eq(bookingsTable.serviceId, servicesTable.id))
    .leftJoin(staffTable, eq(bookingsTable.staffId, staffTable.id))
    .where(whereClause)
    .orderBy(bookingsTable.createdAt);

  const result = rows.map((r) =>
    serializeBooking(r.booking as unknown as Record<string, unknown>, r.service as unknown as Record<string, unknown> | null, r.staff as unknown as Record<string, unknown> | null)
  );
  res.json(result);
});

router.post("/bookings", async (req, res): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { serviceId, staffId, customerName, customerPhone, customerNotes, bookingDate, bookingTime } = parsed.data;

  // Check for duplicate booking (same staff, date, time) — skip if staffId is null (any staff)
  if (staffId) {
    const existing = await db
      .select()
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.staffId, staffId),
          eq(bookingsTable.bookingDate, bookingDate),
          eq(bookingsTable.bookingTime, bookingTime),
          sql`${bookingsTable.status} NOT IN ('cancelled')`
        )
      );
    if (existing.length > 0) {
      res.status(409).json({ error: "This time slot is already booked for the selected staff member." });
      return;
    }
  }

  // Get service to determine price
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, serviceId));
  if (!service) {
    res.status(400).json({ error: "Service not found" });
    return;
  }

  let ref = generateReference();
  // Ensure uniqueness
  let attempts = 0;
  while (attempts < 5) {
    const existing = await db.select().from(bookingsTable).where(eq(bookingsTable.referenceNumber, ref));
    if (existing.length === 0) break;
    ref = generateReference();
    attempts++;
  }

  const [booking] = await db
    .insert(bookingsTable)
    .values({
      referenceNumber: ref,
      serviceId,
      staffId: staffId ?? null,
      customerName,
      customerPhone,
      customerNotes: customerNotes ?? null,
      bookingDate,
      bookingTime,
      status: "pending",
      totalPrice: service.price,
    })
    .returning();

  const row = await getBookingWithRelations(booking.id);
  if (!row) {
    res.status(500).json({ error: "Failed to retrieve booking" });
    return;
  }

  res.status(201).json(
    serializeBooking(
      row.booking as unknown as Record<string, unknown>,
      row.service as unknown as Record<string, unknown> | null,
      row.staff as unknown as Record<string, unknown> | null
    )
  );
});

router.get("/bookings/:id", async (req, res): Promise<void> => {
  const params = GetBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const row = await getBookingWithRelations(params.data.id);
  if (!row) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  res.json(
    GetBookingResponse.parse(
      serializeBooking(
        row.booking as unknown as Record<string, unknown>,
        row.service as unknown as Record<string, unknown> | null,
        row.staff as unknown as Record<string, unknown> | null
      )
    )
  );
});

router.patch("/bookings/:id", async (req, res): Promise<void> => {
  const params = UpdateBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateBookingBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (body.data.status !== undefined) updates.status = body.data.status;
  if (body.data.adminNotes !== undefined) updates.adminNotes = body.data.adminNotes;

  const [updated] = await db
    .update(bookingsTable)
    .set(updates)
    .where(eq(bookingsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const row = await getBookingWithRelations(updated.id);
  if (!row) {
    res.status(500).json({ error: "Failed to retrieve booking" });
    return;
  }

  res.json(
    UpdateBookingResponse.parse(
      serializeBooking(
        row.booking as unknown as Record<string, unknown>,
        row.service as unknown as Record<string, unknown> | null,
        row.staff as unknown as Record<string, unknown> | null
      )
    )
  );
});

export default router;
