import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminDashboard } from "./AdminDashboard";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Trash2, Edit } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { SanatzarCenter, Category } from "@shared/schema";

const centerSchema = z.object({
    name: z.string().min(1, "Name is required"),
    district: z.string().min(1, "District is required"),
    city: z.string().min(1, "City is required"),
    address: z.string().min(1, "Address is required"),
    phone: z.string().optional(),
    managerName: z.string().optional(),
    capacity: z.string().transform(v => parseInt(v)).pipe(z.number().min(0)).optional(),
    imageUrl: z.string().optional(),
    description: z.string().optional(),
});

export default function AdminCenters() {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const { data: centers = [], isLoading } = useQuery<SanatzarCenter[]>({
        queryKey: ["/api/sanatzar-centers"],
    });

    const { data: districts = [] } = useQuery<Category[]>({
        queryKey: ["/api/categories"],
    });

    const form = useForm({
        resolver: zodResolver(centerSchema),
        defaultValues: {
            name: "",
            district: "",
            city: "",
            address: "",
            phone: "",
            managerName: "",
            capacity: "0",
            imageUrl: "",
            description: "",
        },
    });

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            if (editingId) {
                const res = await apiRequest("PUT", `/api/admin/sanatzar-centers/${editingId}`, data);
                return res.json();
            } else {
                const res = await apiRequest("POST", "/api/admin/sanatzar-centers", data);
                return res.json();
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/sanatzar-centers"] });
            toast({
                title: editingId ? "Center Updated" : "Center Created",
                description: `Successfully ${editingId ? "updated" : "added"} center.`,
            });
            setIsDialogOpen(false);
            setEditingId(null);
            form.reset();
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/admin/sanatzar-centers/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/sanatzar-centers"] });
            toast({ title: "Center Deleted", description: "Center has been removed." });
        },
    });

    const handleEdit = (center: SanatzarCenter) => {
        setEditingId(center.id);
        form.reset({
            name: center.name,
            district: center.district,
            city: center.city,
            address: center.address,
            phone: center.phone || "",
            managerName: center.managerName || "",
            capacity: center.capacity?.toString() || "0",
            imageUrl: center.imageUrl || "",
            description: center.description || "",
        });
        setIsDialogOpen(true);
    };

    const handleAdd = () => {
        setEditingId(null);
        form.reset({
            name: "",
            district: "",
            city: "",
            address: "",
            phone: "",
            managerName: "",
            capacity: "0",
            imageUrl: "",
            description: "",
        });
        setIsDialogOpen(true);
    };

    return (
        <AdminDashboard>
            <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Sanatzar Centers</h1>
                        <p className="text-muted-foreground mt-2">
                            Manage training centers and facilities
                        </p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={handleAdd}><Plus className="mr-2 h-4 w-4" /> Add Center</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{editingId ? "Edit Center" : "Add Center"}</DialogTitle>
                                <DialogDescription>
                                    Add details for a Sanatzar training facility.
                                </DialogDescription>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem><FormLabel>Center Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="district" render={({ field }) => (
                                            <FormItem><FormLabel>District</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {districts.map(d => <SelectItem key={d.id} value={d.district}>{d.district}</SelectItem>)}
                                                    </SelectContent>
                                                </Select><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="city" render={({ field }) => (
                                            <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <FormField control={form.control} name="address" render={({ field }) => (
                                        <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="phone" render={({ field }) => (
                                            <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="managerName" render={({ field }) => (
                                            <FormItem><FormLabel>Manager Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="capacity" render={({ field }) => (
                                            <FormItem><FormLabel>Capacity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="imageUrl" render={({ field }) => (
                                            <FormItem><FormLabel>Image URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <FormField control={form.control} name="description" render={({ field }) => (
                                        <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <DialogFooter>
                                        <Button type="submit" disabled={mutation.isPending}>
                                            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {editingId ? "Update" : "Create"}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Manager</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                            ) : (
                                centers.map((center) => (
                                    <TableRow key={center.id}>
                                        <TableCell className="font-medium">{center.name}</TableCell>
                                        <TableCell>{center.city}, {center.district}</TableCell>
                                        <TableCell>{center.managerName || "-"}</TableCell>
                                        <TableCell>{center.phone || "-"}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(center)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => deleteMutation.mutate(center.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AdminDashboard>
    );
}
