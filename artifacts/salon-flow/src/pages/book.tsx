import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, ChevronRight, User } from "lucide-react";
import { 
  useListServices, 
  useListStaff, 
  useGetAvailableSlots, 
  useCreateBooking,
  getGetAvailableSlotsQueryKey
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone number is required"),
  notes: z.string().optional(),
});

export default function Book() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialServiceId = params.get("serviceId") ? parseInt(params.get("serviceId")!, 10) : null;

  const [step, setStep] = useState(1);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(initialServiceId);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const { data: services, isLoading: loadingServices } = useListServices();
  const { data: staffList, isLoading: loadingStaff } = useListStaff();
  
  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const { data: slotsData, isLoading: loadingSlots } = useGetAvailableSlots(
    { date: formattedDate, serviceId: selectedServiceId!, staffId: selectedStaffId || undefined },
    { query: { enabled: !!selectedDate && !!selectedServiceId, queryKey: getGetAvailableSlotsQueryKey({ date: formattedDate, serviceId: selectedServiceId!, staffId: selectedStaffId || undefined }) } }
  );

  const createBooking = useCreateBooking();

  const customerForm = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: "",
      notes: "",
    },
  });

  const onSubmit = (values: z.infer<typeof customerSchema>) => {
    if (!selectedServiceId || !selectedDate || !selectedTime) return;

    createBooking.mutate({
      data: {
        serviceId: selectedServiceId,
        staffId: selectedStaffId,
        bookingDate: format(selectedDate, "yyyy-MM-dd"),
        bookingTime: selectedTime,
        customerName: values.name,
        customerPhone: values.phone,
        customerNotes: values.notes,
      }
    }, {
      onSuccess: (booking) => {
        setLocation(`/confirmation?ref=${booking.referenceNumber}`);
      }
    });
  };

  const steps = [
    { num: 1, title: "Service" },
    { num: 2, title: "Staff" },
    { num: 3, title: "Time" },
    { num: 4, title: "Details" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-card">
        <div className="container max-w-3xl mx-auto flex h-16 items-center px-4">
          <Link href="/" className="font-serif text-xl font-medium tracking-tight text-foreground">SalonFlow</Link>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-medium mb-6 text-foreground">Book Appointment</h1>
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-secondary z-0"></div>
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-primary z-0 transition-all duration-300"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            ></div>
            {steps.map((s) => (
              <div key={s.num} className="relative z-10 flex flex-col items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  step > s.num ? "bg-primary text-primary-foreground" : 
                  step === s.num ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : 
                  "bg-card text-muted-foreground border-2 border-secondary"
                )}>
                  {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span className={cn(
                  "text-xs font-medium hidden sm:block",
                  step >= s.num ? "text-foreground" : "text-muted-foreground"
                )}>{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        <Card className="border-none shadow-sm rounded-2xl bg-card overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="font-serif text-xl font-medium mb-4">Select a Service</h2>
                {loadingServices ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse"></div>)}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {services?.map(service => (
                      <button
                        key={service.id}
                        onClick={() => {
                          setSelectedServiceId(service.id);
                          setStep(2);
                        }}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border transition-all text-left group",
                          selectedServiceId === service.id 
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                            : "border-border hover:border-primary/50 hover:bg-secondary/50"
                        )}
                      >
                        <div>
                          <p className="font-medium text-foreground">{service.name}</p>
                          <p className="text-sm text-muted-foreground">{service.durationMinutes} mins</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-medium text-primary">{service.price} SAR</span>
                          <ChevronRight className={cn(
                            "w-5 h-5 text-muted-foreground transition-transform",
                            selectedServiceId === service.id ? "text-primary translate-x-1" : "group-hover:translate-x-1"
                          )} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <h2 className="font-serif text-xl font-medium mb-4">Select Staff</h2>
                {loadingStaff ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse"></div>)}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <button
                      onClick={() => {
                        setSelectedStaffId(null);
                        setStep(3);
                      }}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                        selectedStaffId === null
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                          : "border-border hover:border-primary/50 hover:bg-secondary/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                          <User className="w-5 h-5" />
                        </div>
                        <p className="font-medium text-foreground">Any Available Staff</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </button>
                    {staffList?.map(staff => (
                      <button
                        key={staff.id}
                        onClick={() => {
                          setSelectedStaffId(staff.id);
                          setStep(3);
                        }}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                          selectedStaffId === staff.id 
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                            : "border-border hover:border-primary/50 hover:bg-secondary/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-serif text-lg">
                            {staff.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{staff.name}</p>
                            <p className="text-sm text-muted-foreground">{staff.role}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="pt-4">
                  <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <h2 className="font-serif text-xl font-medium mb-4">Select Date & Time</h2>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal h-12 rounded-xl border-border",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setSelectedTime(null);
                        }}
                        disabled={(date) => {
                          const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                          const isFriday = date.getDay() === 5;
                          return isPast || isFriday;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {selectedDate && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">Time</label>
                    {loadingSlots ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-muted/50 rounded-lg animate-pulse"></div>)}
                      </div>
                    ) : slotsData?.isClosed ? (
                      <div className="p-4 bg-muted/50 rounded-xl text-center text-muted-foreground">
                        Closed on this date.
                      </div>
                    ) : slotsData?.slots.length === 0 ? (
                      <div className="p-4 bg-muted/50 rounded-xl text-center text-muted-foreground">
                        No available slots for this date.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {slotsData?.slots.map(time => (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={cn(
                              "py-2.5 px-3 rounded-lg text-sm font-medium transition-colors border",
                              selectedTime === time
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-secondary/30"
                            )}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4 flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                  <Button 
                    className="rounded-full px-8" 
                    disabled={!selectedDate || !selectedTime}
                    onClick={() => setStep(4)}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <h2 className="font-serif text-xl font-medium mb-4">Your Details</h2>
                
                <Form {...customerForm}>
                  <form onSubmit={customerForm.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={customerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Sarah Ahmad" {...field} className="h-12 rounded-xl" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={customerForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="05XXXXXXXX" {...field} className="h-12 rounded-xl" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={customerForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Any special requests?" {...field} className="rounded-xl resize-none" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="bg-secondary/30 p-4 rounded-xl mb-6 text-sm space-y-2 mt-6">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date & Time:</span>
                        <span className="font-medium text-foreground">{selectedDate && format(selectedDate, "MMM d, yyyy")} at {selectedTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service:</span>
                        <span className="font-medium text-foreground">{services?.find(s => s.id === selectedServiceId)?.name}</span>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-between">
                      <Button type="button" variant="ghost" onClick={() => setStep(3)}>Back</Button>
                      <Button 
                        type="submit" 
                        className="rounded-full px-8"
                        disabled={createBooking.isPending}
                      >
                        {createBooking.isPending ? "Confirming..." : "Confirm Booking"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
