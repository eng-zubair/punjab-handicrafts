import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { PromotionAction } from "@shared/schema";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PromotionActionBuilderProps {
    promotionId: string;
}

export function PromotionActionBuilder({ promotionId }: PromotionActionBuilderProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [newAction, setNewAction] = useState({
        type: 'percentage_discount',
        value: '',
        target: 'order_total',
    });

    // Fetch Logic
    const { data: actions = [], isLoading } = useQuery<PromotionAction[]>({
        queryKey: ['/api/vendor/promotions', promotionId, 'actions'],
        queryFn: async () => {
            const res = await apiRequest('GET', `/api/vendor/promotions/${promotionId}/actions`);
            return res.json();
        }
    });

    // Create Mutation
    const createActionMutation = useMutation({
        mutationFn: async () => {
            return apiRequest('POST', `/api/vendor/promotions/${promotionId}/actions`, {
                ...newAction,
                value: newAction.value ? String(newAction.value) : undefined
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/vendor/promotions', promotionId, 'actions'] });
            setNewAction({ ...newAction, value: '' });
            toast({ title: "Action added" });
        },
        onError: () => toast({ title: "Failed to add action", variant: "destructive" })
    });

    // Delete Mutation
    const deleteActionMutation = useMutation({
        mutationFn: async (id: string) => {
            return apiRequest('DELETE', `/api/vendor/promotions/actions/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/vendor/promotions', promotionId, 'actions'] });
            toast({ title: "Action deleted" });
        }
    });

    const actionTypes = [
        { value: 'percentage_discount', label: 'Percentage Discount' },
        { value: 'fixed_amount', label: 'Fixed Amount Off' },
        { value: 'free_shipping', label: 'Free Shipping' },
    ];

    const targets = [
        { value: 'order_total', label: 'Order Total' },
        { value: 'shipping', label: 'Shipping Cost' },
    ];

    return (
        <div className="space-y-4">
            <div className="flex gap-2 items-end border p-4 rounded-md bg-slate-50">
                <div className="space-y-2 flex-1">
                    <label className="text-sm font-medium">Type</label>
                    <Select
                        value={newAction.type}
                        onValueChange={(val) => setNewAction({ ...newAction, type: val })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {actionTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                {newAction.type !== 'free_shipping' && (
                    <div className="space-y-2 flex-1">
                        <label className="text-sm font-medium">Value</label>
                        <Input
                            value={newAction.value}
                            onChange={(e) => setNewAction({ ...newAction, value: e.target.value })}
                            placeholder={newAction.type === 'percentage_discount' ? "%" : "Amount"}
                        />
                    </div>
                )}

                <div className="space-y-2 w-40">
                    <label className="text-sm font-medium">Target</label>
                    <Select
                        value={newAction.target}
                        onValueChange={(val) => setNewAction({ ...newAction, target: val })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {targets.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <Button
                    onClick={() => createActionMutation.mutate()}
                    disabled={createActionMutation.isPending || (newAction.type !== 'free_shipping' && !newAction.value)}
                >
                    <Plus className="w-4 h-4 mr-2" /> Add
                </Button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? <TableRow><TableCell colSpan={4}>Loading...</TableCell></TableRow> :
                            actions.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No actions defined (Legacy mode)</TableCell></TableRow> :
                                actions.map((action) => (
                                    <TableRow key={action.id}>
                                        <TableCell>{actionTypes.find(t => t.value === action.type)?.label || action.type}</TableCell>
                                        <TableCell>{action.value ?? '-'}</TableCell>
                                        <TableCell>{action.target}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => deleteActionMutation.mutate(action.id)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
