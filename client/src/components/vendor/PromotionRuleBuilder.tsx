import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { PromotionRule } from "@shared/schema";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PromotionRuleBuilderProps {
    promotionId: string;
}

export function PromotionRuleBuilder({ promotionId }: PromotionRuleBuilderProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [newRule, setNewRule] = useState({
        type: 'min_order_value',
        operator: 'gte',
        value: '',
    });

    // Fetch Logic
    const { data: rules = [], isLoading } = useQuery<PromotionRule[]>({
        queryKey: ['/api/vendor/promotions', promotionId, 'rules'],
        queryFn: async () => {
            const res = await apiRequest('GET', `/api/vendor/promotions/${promotionId}/rules`);
            return res.json();
        }
    });

    // Create Mutation
    const createRuleMutation = useMutation({
        mutationFn: async () => {
            return apiRequest('POST', `/api/vendor/promotions/${promotionId}/rules`, {
                ...newRule,
                value: newRule.value // Send as string/mixed, schema handles it
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/vendor/promotions', promotionId, 'rules'] });
            setNewRule({ ...newRule, value: '' });
            toast({ title: "Rule added" });
        },
        onError: () => toast({ title: "Failed to add rule", variant: "destructive" })
    });

    // Delete Mutation
    const deleteRuleMutation = useMutation({
        mutationFn: async (id: string) => {
            return apiRequest('DELETE', `/api/vendor/promotions/rules/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/vendor/promotions', promotionId, 'rules'] });
            toast({ title: "Rule deleted" });
        }
    });

    const ruleTypes = [
        { value: 'min_order_value', label: 'Minimum Order Value' },
        { value: 'min_quantity', label: 'Minimum Quantity' },
        { value: 'specific_product', label: 'Specific Product (ID)' },
        { value: 'customer_group', label: 'Customer Group' },
    ];

    const operators = [
        { value: 'eq', label: 'Equals' },
        { value: 'gt', label: 'Greater Than' },
        { value: 'gte', label: 'Greater/Equal' },
        { value: 'lt', label: 'Less Than' },
        { value: 'lte', label: 'Less/Equal' },
    ];

    return (
        <div className="space-y-4">
            <div className="flex gap-2 items-end border p-4 rounded-md bg-slate-50">
                <div className="space-y-2 flex-1">
                    <label className="text-sm font-medium">Type</label>
                    <Select
                        value={newRule.type}
                        onValueChange={(val) => setNewRule({ ...newRule, type: val })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ruleTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 w-32">
                    <label className="text-sm font-medium">Operator</label>
                    <Select
                        value={newRule.operator}
                        onValueChange={(val) => setNewRule({ ...newRule, operator: val })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {operators.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 flex-1">
                    <label className="text-sm font-medium">Value</label>
                    <Input
                        value={newRule.value}
                        onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
                        placeholder="e.g. 5000"
                    />
                </div>

                <Button
                    onClick={() => createRuleMutation.mutate()}
                    disabled={createRuleMutation.isPending || !newRule.value}
                >
                    <Plus className="w-4 h-4 mr-2" /> Add
                </Button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Operator</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? <TableRow><TableCell colSpan={4}>Loading...</TableCell></TableRow> :
                            rules.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No rules defined (Applies to all)</TableCell></TableRow> :
                                rules.map((rule) => (
                                    <TableRow key={rule.id}>
                                        <TableCell>{ruleTypes.find(t => t.value === rule.type)?.label || rule.type}</TableCell>
                                        <TableCell>{rule.operator}</TableCell>
                                        <TableCell>{String(rule.value)}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => deleteRuleMutation.mutate(rule.id)}>
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
