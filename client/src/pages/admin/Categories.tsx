import { AdminDashboard } from "./AdminDashboard";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tag } from "lucide-react";
import { useEffect, useState } from "react";

interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
}

export default function AdminCategories() {
  const { toast } = useToast();
  const { data: categories = [], isLoading } = useQuery<ProductCategory[]>({
    queryKey: ["/api/product-categories"],
  });

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<ProductCategory | null>(null);

  useEffect(() => {
    if (editOpen && selected) {
      setName(selected.name);
      setDescription(selected.description || "");
    } else if (!editOpen) {
      setName("");
      setDescription("");
    }
  }, [editOpen, selected]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/product-categories", { name, description: description || null });
      return res.json();
    },
    onSuccess: async () => {
      setAddOpen(false);
      setName("");
      setDescription("");
      await queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
      toast({ title: "Category added" });
    },
    onError: (err: any) => toast({ title: "Add failed", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const res = await apiRequest("PUT", `/api/admin/product-categories/${selected.id}`, { name, description: description || null });
      return res.json();
    },
    onSuccess: async () => {
      setEditOpen(false);
      setSelected(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
      toast({ title: "Category updated" });
    },
    onError: (err: any) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const res = await apiRequest("DELETE", `/api/admin/product-categories/${selected.id}`);
      return res.json();
    },
    onSuccess: async () => {
      setDeleteOpen(false);
      setSelected(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
      toast({ title: "Category deleted" });
    },
    onError: (err: any) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  return (
    <AdminDashboard>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-admin-categories">Product Categories</h1>
          <p className="text-muted-foreground">Add, edit, and remove product categories</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Categories ({categories.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end mb-4">
              <Button onClick={() => setAddOpen(true)} data-testid="button-add-category">Add Category</Button>
            </div>
            {isLoading ? (
              <p className="text-muted-foreground">Loading categories...</p>
            ) : categories.length > 0 ? (
              <div className="border rounded-md overflow-x-auto">
                <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium" data-testid={`text-category-name-${cat.id}`}>{cat.name}</TableCell>
                        <TableCell data-testid={`text-category-slug-${cat.id}`}>{cat.slug}</TableCell>
                        <TableCell data-testid={`text-category-desc-${cat.id}`}>{cat.description || '-'}</TableCell>
                        <TableCell data-testid={`text-category-created-${cat.id}`}>{new Date(cat.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="secondary" size="sm" onClick={() => { setSelected(cat); setEditOpen(true); }} data-testid={`button-edit-category-${cat.id}`}>Edit</Button>
                            <Button variant="destructive" size="sm" onClick={() => { setSelected(cat); setDeleteOpen(true); }} data-testid={`button-delete-category-${cat.id}`}>Delete</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Tag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No categories found</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Category</DialogTitle>
              <DialogDescription>Define a new product category.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-category-name" />
              <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-category-description" />
            </div>
            <DialogFooter>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} data-testid="button-save-category">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>Update name or description.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-edit-category-name" />
              <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-edit-category-description" />
            </div>
            <DialogFooter>
              <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !selected} data-testid="button-update-category">Update</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Category</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the category.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate()} data-testid="button-confirm-delete-category">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminDashboard>
  );
}

