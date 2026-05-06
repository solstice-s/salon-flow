import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useListServices, 
  useCreateService, 
  useUpdateService, 
  useDeleteService,
  getListServicesQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2 } from "lucide-react";

const serviceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  durationMinutes: z.coerce.number().min(1, "Duration must be positive"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  description: z.string().optional(),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

export default function AdminServices() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  if (typeof window !== "undefined" && !localStorage.getItem("adminToken")) {
    setLocation("/admin/login");
    return null;
  }

  const { data: services, isLoading } = useListServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      durationMinutes: 30,
      price: 0,
      description: "",
    },
  });

  const openCreateModal = () => {
    setEditingId(null);
    form.reset({
      name: "",
      durationMinutes: 30,
      price: 0,
      description: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (service: any) => {
    setEditingId(service.id);
    form.reset({
      name: service.name,
      durationMinutes: service.durationMinutes,
      price: service.price,
      description: service.description || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this service?")) {
      deleteService.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
        }
      });
    }
  };

  const onSubmit = (values: ServiceFormValues) => {
    if (editingId) {
      updateService.mutate(
        { id: editingId, data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
            setIsModalOpen(false);
          }
        }
      );
    } else {
      createService.mutate(
        { data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
            setIsModalOpen(false);
          }
        }
      );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="font-serif text-3xl font-medium">Services</h1>
          <Button onClick={openCreateModal} className="rounded-full px-6">
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </Button>
        </div>

        <Card className="border-none shadow-sm bg-card overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b-border/40">
                    <TableHead>Name</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(4)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                      </TableRow>
                    ))
                  ) : services?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                        No services found. Add one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    services?.map((service) => (
                      <TableRow key={service.id} className="hover:bg-muted/50 border-b-border/40">
                        <TableCell className="font-medium text-foreground">
                          {service.name}
                          {service.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs mt-1">{service.description}</p>
                          )}
                        </TableCell>
                        <TableCell>{service.durationMinutes} mins</TableCell>
                        <TableCell>{service.price} SAR</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditModal(service)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(service.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-card rounded-2xl border-none shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-medium">
              {editingId ? "Edit Service" : "Add Service"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Classic Manicure" {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="durationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (mins)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (SAR)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} className="rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe the service..." {...field} className="rounded-xl resize-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" className="rounded-full px-6" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="rounded-full px-6" disabled={createService.isPending || updateService.isPending}>
                  {createService.isPending || updateService.isPending ? "Saving..." : "Save Service"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
