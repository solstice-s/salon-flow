import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { servicesTable } from "./services";
import { staffTable } from "./staff";

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  referenceNumber: text("reference_number").notNull().unique(),
  serviceId: integer("service_id").notNull().references(() => servicesTable.id),
  staffId: integer("staff_id").references(() => staffTable.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerNotes: text("customer_notes"),
  bookingDate: text("booking_date").notNull(),
  bookingTime: text("booking_time").notNull(),
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
