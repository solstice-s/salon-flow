import { useState } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { 
  useGetAdminStats, 
  useListBookings, 
  useUpdateBooking,
  getListBookingsQueryKey,
  getGetAdminStatsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Booking, UpdateBookingBodyStatus } from "@workspace/api-client-react";
import { UpdateBookingBodyStatus as UpdateBookingBodyStatusEnum } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateBookingBodyStatus>("pending");
  const [adminNotes, setAdminNotes] = useState("");

  // Check auth
  if (typeof window !== "undefined" && !localStorage.getItem("adminToken")) {
    setLocation("/admin/login");
    return null;
  }

  const { data: stats, isLoading: loadingStats } = useGetAdminStats();
  
  const queryStatus = statusFilter === "all" ? undefined : (statusFilter as any);
  const { data: bookings, isLoading: loadingBookings } = useListBookings(
    { status: queryStatus },
    { query: { queryKey: getListBookingsQueryKey({ status: queryStatus }) } }
  );

  const updateMutation = useUpdateBooking();

  const handleUpdate = () => {
    if (!selectedBooking) return;
    
    updateMutation.mutate(
      { 
        id: selectedBooking.id, 
        data: { status: updateStatus, adminNotes: adminNotes || null } 
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey({ status: queryStatus }) });
          queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
          setSelectedBooking(null);
        }
      }
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300";
      case "confirmed": return "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300";
      case "completed": return "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300";
      case "cancelled": return "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <h1 className="font-serif text-3xl font-medium">Dashboard</h1>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Today", value: stats?.todayBookings, format: "number" },
            { label: "Pending", value: stats?.pendingBookings, format: "number" },
            { label: "Confirmed", value: stats?.confirmedBookings, format: "number" },
            { label: "Completed", value: stats?.completedBookings, format: "number" },
            { label: "Total", value: stats?.totalBookings, format: "number" },
            { label: "Revenue", value: stats?.totalRevenue, format: "currency" },
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-sm bg-card">
              <CardContent className="p-4 sm:p-6">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                {loadingStats ? (
                  <Skeleton className="h-8 w-16 mt-2" />
                ) : (
                  <p className="text-2xl sm:text-3xl font-serif font-medium mt-1 text-foreground">
                    {stat.format === "currency" ? `${stat.value} SAR` : stat.value}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bookings Table */}
        <Card className="border-none shadow-sm bg-card overflow-hidden">
          <CardHeader className="border-b border-border/40 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="font-serif text-xl font-medium">Recent Bookings</CardTitle>
              <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
                <TabsList className="w-full sm:w-auto overflow-x-auto justify-start">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b-border/40">
                    <TableHead>Ref</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingBookings ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : bookings?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        No bookings found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    bookings?.map((booking) => (
                      <TableRow 
                        key={booking.id} 
                        className="cursor-pointer hover:bg-muted/50 border-b-border/40"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setUpdateStatus(booking.status as UpdateBookingBodyStatus);
                          setAdminNotes(booking.adminNotes || "");
                        }}
                      >
                        <TableCell className="font-mono text-xs">{booking.referenceNumber}</TableCell>
                        <TableCell className="font-medium text-foreground">{booking.customerName}</TableCell>
                        <TableCell>{booking.service?.name}</TableCell>
                        <TableCell>{booking.staff?.name || "Any Available"}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{format(new Date(booking.bookingDate), "MMM d, yyyy")}</span>
                            <span className="text-muted-foreground text-xs">{booking.bookingTime}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`border-transparent ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Update Booking Modal */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="sm:max-w-md bg-card rounded-2xl border-none shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-medium">Update Booking</DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-xl">
                <div>
                  <p className="text-muted-foreground mb-1">Customer</p>
                  <p className="font-medium text-foreground">{selectedBooking.customerName}</p>
                  <p className="text-muted-foreground">{selectedBooking.customerPhone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Date & Time</p>
                  <p className="font-medium text-foreground">{format(new Date(selectedBooking.bookingDate), "MMM d, yyyy")}</p>
                  <p className="text-muted-foreground">{selectedBooking.bookingTime}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground mb-1">Service & Staff</p>
                  <p className="font-medium text-foreground">{selectedBooking.service?.name}</p>
                  <p className="text-muted-foreground">with {selectedBooking.staff?.name || "Any Available"}</p>
                </div>
                {selectedBooking.customerNotes && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-1">Customer Notes</p>
                    <p className="bg-background border border-border p-3 rounded-lg">{selectedBooking.customerNotes}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Status</label>
                <Select value={updateStatus} onValueChange={(v: UpdateBookingBodyStatus) => setUpdateStatus(v)}>
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border">
                    <SelectItem value={UpdateBookingBodyStatusEnum.pending}>Pending</SelectItem>
                    <SelectItem value={UpdateBookingBodyStatusEnum.confirmed}>Confirmed</SelectItem>
                    <SelectItem value={UpdateBookingBodyStatusEnum.completed}>Completed</SelectItem>
                    <SelectItem value={UpdateBookingBodyStatusEnum.cancelled}>Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Admin Notes</label>
                <Textarea 
                  value={adminNotes} 
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add private notes (not visible to customer)"
                  className="rounded-xl resize-none min-h-[100px]"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" className="rounded-full px-6" onClick={() => setSelectedBooking(null)}>Cancel</Button>
            <Button className="rounded-full px-6" onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
