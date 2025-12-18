
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MoreHorizontal, Plus, Loader2, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { TrainingProgram, TrainingApplication } from "@shared/schema";
import { format } from "date-fns";

const programSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    centerId: z.string().min(1, "Center is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    batchSize: z.string().transform(v => parseInt(v)).pipe(z.number().min(1)),
    status: z.enum(["upcoming", "active", "completed", "cancelled"]),
});

export default function AdminTraining() {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { data: programs = [], isLoading: isLoadingPrograms } = useQuery<TrainingProgram[]>({
        queryKey: ["/api/training-programs"],
    });

    const { data: applications = [], isLoading: isLoadingApps } = useQuery<TrainingApplication[]>({
        queryKey: ["/api/admin/training-applications"],
    });

    const { data: centers = [] } = useQuery<any[]>({
        queryKey: ["/api/sanatzar-centers"],
    });

    const form = useForm({
        resolver: zodResolver(programSchema),
        defaultValues: {
            title: "",
            description: "",
            centerId: "",
            startDate: "",
            endDate: "",
            batchSize: "20",
            status: "upcoming",
        },
    });

    const createProgramMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/admin/training-programs", {
                ...data,
                startDate: new Date(data.startDate).toISOString(),
                endDate: new Date(data.endDate).toISOString(),
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/training-programs"] });
            toast({ title: "Program Created", description: "New training program added successfully" });
            setIsDialogOpen(false);
            form.reset();
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const updateAppStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const res = await apiRequest("PUT", `/api/admin/training-applications/${id}`, { status });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/training-applications"] });
            toast({ title: "Status Updated", description: "Application status updated" });
        },
    });

    return (
        <AdminDashboard>
            <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Training Management</h1>
                        <p className="text-muted-foreground mt-2">
                            Manage training programs and trainee applications
                        </p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button><Plus className="mr-2 h-4 w-4" /> Add Program</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Add Training Program</DialogTitle>
                                <DialogDescription>Create a new training course at a Sanatzar center.</DialogDescription>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit((data) => createProgramMutation.mutate(data))} className="space-y-4">
                                    <FormField control={form.control} name="title" render={({ field }) => (
                                        <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="centerId" render={({ field }) => (
                                        <FormItem><FormLabel>Center</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select center" /></SelectTrigger></FormControl>
                                                <SelectContent>{centers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                            </Select><FormMessage /></FormItem>
                                    )} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="startDate" render={({ field }) => (
                                            <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="endDate" render={({ field }) => (
                                            <FormItem><FormLabel>End Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <FormField control={form.control} name="batchSize" render={({ field }) => (
                                        <FormItem><FormLabel>Batch Size</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="description" render={({ field }) => (
                                        <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <DialogFooter>
                                        <Button type="submit" disabled={createProgramMutation.isPending}>
                                            {createProgramMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>

                <Tabs defaultValue="programs" className="w-full">
                    <TabsList>
                        <TabsTrigger value="programs">Training Programs</TabsTrigger>
                        <TabsTrigger value="applications">Applications</TabsTrigger>
                    </TabsList>

                    <TabsContent value="programs" className="mt-6">
                        <div className="rounded-md border bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Center</TableHead>
                                        <TableHead>Dates</TableHead>
                                        <TableHead>Capacity</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingPrograms ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                                    ) : (
                                        programs.map((program) => (
                                            <TableRow key={program.id}>
                                                <TableCell className="font-medium">{program.title}</TableCell>
                                                <TableCell>{centers.find(c => c.id === program.centerId)?.name || 'Unknown'}</TableCell>
                                                <TableCell>
                                                    <div className="text-xs text-muted-foreground">
                                                        {program.startDate ? format(new Date(program.startDate), "MMM d") : "TBD"} - {program.endDate ? format(new Date(program.endDate), "MMM d, yyyy") : "TBD"}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{program.batchSize}</TableCell>
                                                <TableCell><Badge variant="outline">{program.status}</Badge></TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="applications" className="mt-6">
                        <div className="rounded-md border bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Applicant</TableHead>
                                        <TableHead>Program</TableHead>
                                        <TableHead>Date Applied</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingApps ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                                    ) : (
                                        applications.map((app) => (
                                            <TableRow key={app.id}>
                                                <TableCell>
                                                    <div className="font-medium">{app.fullName}</div>
                                                    <div className="text-xs text-muted-foreground">{app.email}</div>
                                                </TableCell>
                                                <TableCell>{programs.find(p => p.id === app.programId)?.title || 'Unknown Program'}</TableCell>
                                                <TableCell>{format(new Date(app.appliedAt), "MMM d, yyyy")}</TableCell>
                                                <TableCell>
                                                    <Badge variant={app.status === 'approved' ? 'default' : app.status === 'rejected' ? 'destructive' : 'secondary'}>
                                                        {app.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button size="sm" variant="ghost">View</Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                                                <DialogHeader>
                                                                    <DialogTitle>Application Details</DialogTitle>
                                                                </DialogHeader>
                                                                <div className="grid grid-cols-2 gap-4 py-4">
                                                                    <div><label className="text-sm font-medium">Full Name</label><p>{app.fullName}</p></div>
                                                                    <div><label className="text-sm font-medium">Email</label><p>{app.email}</p></div>
                                                                    <div><label className="text-sm font-medium">Phone</label><p>{app.phone}</p></div>
                                                                    <div><label className="text-sm font-medium">CNIC</label><p>{app.cnic || '-'}</p></div>
                                                                    <div className="col-span-2"><label className="text-sm font-medium">Address</label><p>{app.address}, {app.city}, {app.district}</p></div>
                                                                    <div className="col-span-2"><label className="text-sm font-medium">Education</label><p>{app.education || '-'}</p></div>
                                                                    <div className="col-span-2"><label className="text-sm font-medium">Prior Experience</label><p>{app.priorCraftExperience || 'None'}</p></div>
                                                                    <div className="col-span-2"><label className="text-sm font-medium">Motivation</label><p>{app.motivation || '-'}</p></div>
                                                                    {!!app.surveyResponses && Object.keys(app.surveyResponses as object).length > 0 && (
                                                                        <div className="col-span-2 border-t pt-4 mt-2">
                                                                            <h4 className="font-medium mb-2">Survey Responses</h4>
                                                                            <pre className="text-sm whitespace-pre-wrap bg-muted p-2 rounded">{JSON.stringify(app.surveyResponses, null, 2)}</pre>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                        <Button size="sm" variant="outline" className="h-8 text-green-600"
                                                            disabled={app.status === 'approved'}
                                                            onClick={() => updateAppStatusMutation.mutate({ id: app.id, status: 'approved' })}>
                                                            Approve
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="h-8 text-red-600"
                                                            disabled={app.status === 'rejected'}
                                                            onClick={() => updateAppStatusMutation.mutate({ id: app.id, status: 'rejected' })}>
                                                            Reject
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </AdminDashboard>
    );
}
