import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useListStaff, 
  useCreateStaff, 
  useUpdateStaff, 
  useDeleteStaff,
  getListStaffQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2 } from "lucide-react";

const staffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
});

type StaffFormValues = z.infer<typeof staffSchema>;

export default function AdminStaff() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  if (typeof window !== "undefined" && !localStorage.getItem("adminToken")) {
    setLocation("/admin/login");
    return null;
  }

  const { data: staffList, isLoading } = useListStaff();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: "",
      role: "",
    },
  });

  const openCreateModal = () => {
    setEditingId(null);
    form.reset({
      name: "",
      role: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (staff: any) => {
    setEditingId(staff.id);
    form.reset({
      name: staff.name,
      role: staff.role,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this staff member?")) {
      deleteStaff.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
        }
      });
    }
  };

  const onSubmit = (values: StaffFormValues) => {
    if (editingId) {
      updateStaff.mutate(
        { id: editingId, data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
            setIsModalOpen(false);
          }
        }
      );
    } else {
      createStaff.mutate(
        { data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
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
          <h1 className="font-serif text-3xl font-medium">Staff Members</h1>
          <Button onClick={openCreateModal} className="rounded-full px-6">
            <Plus className="w-4 h-4 mr-2" />
            Add Staff
          </Button>
        </div>

        <Card className="border-none shadow-sm bg-card overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b-border/40">
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(4)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-8 h-8 rounded-full" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                      </TableRow>
                    ))
                  ) : staffList?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                        No staff members found. Add one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    staffList?.map((staff) => (
                      <TableRow key={staff.id} className="hover:bg-muted/50 border-b-border/40">
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-serif">
                              {staff.name.charAt(0)}
                            </div>
                            {staff.name}
                          </div>
                        </TableCell>
                        <TableCell>{staff.role}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditModal(staff)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(staff.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
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
              {editingId ? "Edit Staff" : "Add Staff"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Sarah Ahmad" {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Senior Stylist" {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" className="rounded-full px-6" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="rounded-full px-6" disabled={createStaff.isPending || updateStaff.isPending}>
                  {createStaff.isPending || updateStaff.isPending ? "Saving..." : "Save Staff"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
