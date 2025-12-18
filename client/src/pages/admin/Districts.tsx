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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Trash2, Edit } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Category } from "@shared/schema";

const districtSchema = z.object({
    district: z.string().min(1, "District name is required"),
    giBrand: z.string().min(1, "GI Brand is required"),
    crafts: z.string().min(1, "At least one craft is required"),
});

export default function AdminDistricts() {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const { data: districts = [], isLoading } = useQuery<Category[]>({
        queryKey: ["/api/categories"],
    });

    const form = useForm({
        resolver: zodResolver(districtSchema),
        defaultValues: {
            district: "",
            giBrand: "",
            crafts: "",
        },
    });

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const formattedData = {
                ...data,
                crafts: data.crafts.split(",").map((c: string) => c.trim()).filter(Boolean),
            };

            if (editingId) {
                const res = await apiRequest("PUT", `/api/admin/categories/${editingId}`, formattedData);
                return res.json();
            } else {
                const res = await apiRequest("POST", "/api/admin/categories", formattedData);
                return res.json();
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
            toast({
                title: editingId ? "District Updated" : "District Created",
                description: `Successfully ${editingId ? "updated" : "added"} district.`,
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
            await apiRequest("DELETE", `/api/admin/categories/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
            toast({ title: "District Deleted", description: "District has been removed." });
        },
    });

    const handleEdit = (district: Category) => {
        setEditingId(district.id);
        form.reset({
            district: district.district,
            giBrand: district.giBrand,
            crafts: district.crafts.join(", "),
        });
        setIsDialogOpen(true);
    };

    const handleAdd = () => {
        setEditingId(null);
        form.reset({
            district: "",
            giBrand: "",
            crafts: "",
        });
        setIsDialogOpen(true);
    };

    return (
        <AdminDashboard>
            <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Districts</h1>
                        <p className="text-muted-foreground mt-2">
                            Manage qualified districts and their GI brands
                        </p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={handleAdd}><Plus className="mr-2 h-4 w-4" /> Add District</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>{editingId ? "Edit District" : "Add District"}</DialogTitle>
                                <DialogDescription>
                                    Add a new district with its recognized crafts.
                                </DialogDescription>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                                    <FormField control={form.control} name="district" render={({ field }) => (
                                        <FormItem><FormLabel>District Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="giBrand" render={({ field }) => (
                                        <FormItem><FormLabel>GI Brand Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="crafts" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Crafts</FormLabel>
                                            <FormControl><Input {...field} placeholder="Woodwork, Pottery (comma separated)" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
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
                                <TableHead>District</TableHead>
                                <TableHead>GI Brand</TableHead>
                                <TableHead>Crafts</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                            ) : (
                                districts.map((d) => (
                                    <TableRow key={d.id}>
                                        <TableCell className="font-medium">{d.district}</TableCell>
                                        <TableCell>{d.giBrand}</TableCell>
                                        <TableCell>{d.crafts.join(", ")}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(d)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => deleteMutation.mutate(d.id)}>
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
