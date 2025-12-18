
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
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { MoreHorizontal, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import type { RegisteredArtisan } from "@shared/schema";
import { format } from "date-fns";

export default function AdminArtisans() {
    const { toast } = useToast();
    const { data: artisans = [], isLoading } = useQuery<RegisteredArtisan[]>({
        queryKey: ["/api/admin/registered-artisans"],
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const res = await apiRequest("PUT", `/api/admin/registered-artisans/${id}`, { status });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/registered-artisans"] });
            toast({
                title: "Status Updated",
                description: "Artisan status has been updated successfully.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update status",
                variant: "destructive",
            });
        },
    });

    return (
        <AdminDashboard>
            <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Artisans</h1>
                        <p className="text-muted-foreground mt-2">
                            Manage artisan registrations and approvals
                        </p>
                    </div>
                </div>

                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Primary Craft</TableHead>
                                <TableHead>District</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Applied At</TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                    </TableCell>
                                </TableRow>
                            ) : artisans.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No artisans registered yet
                                    </TableCell>
                                </TableRow>
                            ) : (
                                artisans.map((artisan) => (
                                    <TableRow key={artisan.id}>
                                        <TableCell>
                                            <div className="font-medium">{artisan.fullName}</div>
                                            <div className="text-sm text-muted-foreground">{artisan.email}</div>
                                        </TableCell>
                                        <TableCell>{artisan.primaryCraft}</TableCell>
                                        <TableCell>{artisan.district}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                artisan.status === "active" ? "default" :
                                                    artisan.status === "rejected" ? "destructive" : "secondary"
                                            }>
                                                {artisan.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(artisan.registeredAt), "PP")}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => updateStatusMutation.mutate({ id: artisan.id, status: "active" })}
                                                        disabled={artisan.status === "active"}
                                                    >
                                                        <ShieldCheck className="mr-2 h-4 w-4" /> Approve
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => updateStatusMutation.mutate({ id: artisan.id, status: "rejected" })}
                                                        disabled={artisan.status === "rejected"}
                                                        className="text-destructive"
                                                    >
                                                        <ShieldAlert className="mr-2 h-4 w-4" /> Reject
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
