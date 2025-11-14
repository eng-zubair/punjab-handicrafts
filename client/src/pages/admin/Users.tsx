import { AdminDashboard } from "./AdminDashboard";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users as UsersIcon } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  createdAt: string;
}

export default function AdminUsers() {
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest('PUT', `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
      toast({
        title: "Role updated",
        description: "User role has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user role.",
        variant: "destructive",
      });
    },
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'vendor':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <AdminDashboard>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-users">Users Management</h1>
          <p className="text-muted-foreground">View and manage platform users</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5" />
              All Users ({users?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading users...</p>
            ) : users && users.length > 0 ? (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium" data-testid={`text-user-email-${user.id}`}>
                          {user.email}
                        </TableCell>
                        <TableCell data-testid={`text-user-name-${user.id}`}>
                          {user.firstName || user.lastName
                            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getRoleBadgeVariant(user.role)}
                            data-testid={`badge-user-role-${user.id}`}
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-user-joined-${user.id}`}>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Select
                            value={user.role}
                            onValueChange={(newRole) =>
                              updateRoleMutation.mutate({ userId: user.id, role: newRole })
                            }
                            disabled={updateRoleMutation.isPending}
                          >
                            <SelectTrigger
                              className="w-32 ml-auto"
                              data-testid={`select-role-${user.id}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="buyer">Buyer</SelectItem>
                              <SelectItem value="vendor">Vendor</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <UsersIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No users found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminDashboard>
  );
}
