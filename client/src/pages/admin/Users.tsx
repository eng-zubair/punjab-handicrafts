import * as React from "react";
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
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  createdAt: string;
  isActive?: boolean;
  lastLogin?: string | null;
  phone?: string | null;
  emailVerified?: boolean;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [profileUserId, setProfileUserId] = React.useState<string | null>(null);
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);
  const [confirmResetId, setConfirmResetId] = React.useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = React.useState<{ id: string; next: boolean } | null>(null);

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

  const updateActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      return apiRequest('PUT', `/api/admin/users/${userId}/active`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'Status updated' });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/reset-password`, {});
      const data = await res.json();
      return data.tempPassword as string;
    },
    onSuccess: (pw) => {
      setTempPassword(pw);
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'Password reset', description: 'Temporary password generated.' });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
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
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5" />
              All Users ({users?.length || 0})
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">Selected: {Object.values(selected).filter(Boolean).length}</div>
              <Button variant="outline" size="sm" onClick={async () => {
                const ids = Object.entries(selected).filter(([, v]) => v).map(([id]) => id);
                for (const id of ids) await updateActiveMutation.mutateAsync({ userId: id, isActive: true });
              }} disabled={updateActiveMutation.isPending}>Activate Selected</Button>
              <Button variant="destructive" size="sm" onClick={async () => {
                const ids = Object.entries(selected).filter(([, v]) => v).map(([id]) => id);
                for (const id of ids) await updateActiveMutation.mutateAsync({ userId: id, isActive: false });
              }} disabled={updateActiveMutation.isPending}>Deactivate Selected</Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading users...</p>
            ) : users && users.length > 0 ? (
              <div className="border rounded-md overflow-x-auto">
                <Table className="min-w-[920px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <input
                          type="checkbox"
                          aria-label="Select all"
                          onChange={(e) => {
                            const checked = e.currentTarget.checked;
                            const next: Record<string, boolean> = {};
                            users.forEach(u => next[u.id] = checked);
                            setSelected(next);
                          }}
                        />
                      </TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            aria-label={`Select ${user.email}`}
                            checked={!!selected[user.id]}
                            onChange={(e) => setSelected({ ...selected, [user.id]: e.currentTarget.checked })}
                          />
                        </TableCell>
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
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Switch
                                  className="rounded-full border-2"
                                  style={{
                                    backgroundColor: user.isActive ? 'rgb(22 163 74)' : 'rgb(239 68 68)',
                                    borderColor: user.isActive ? 'rgb(21 128 61)' : 'rgb(185 28 28)'
                                  }}
                                  checked={!!user.isActive}
                                  onCheckedChange={(checked) => setConfirmToggle({ id: user.id, next: !!checked })}
                                  disabled={updateActiveMutation.isPending}
                                  aria-label="Toggle active"
                                />
                              </TooltipTrigger>
                              <TooltipContent>{user.isActive ? 'Active' : 'Inactive'}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
                          <div className="mt-2 flex gap-2 justify-end">
                            <Button variant="secondary" size="sm" onClick={() => setProfileUserId(user.id)}>View Profile</Button>
                            <Button variant="outline" size="sm" onClick={() => setConfirmResetId(user.id)} disabled={resetPasswordMutation.isPending}>Reset Password</Button>
                          </div>
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

        <Dialog open={!!profileUserId} onOpenChange={(open) => !open && setProfileUserId(null)}>
          <DialogContent className="sm:max-w-[800px] w-[95vw] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Profile</DialogTitle>
            </DialogHeader>
            {!profileUserId ? null : (
              <ProfileContent userId={profileUserId} onClose={() => setProfileUserId(null)} />
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!confirmResetId} onOpenChange={(open) => !open && setConfirmResetId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset password?</AlertDialogTitle>
              <AlertDialogDescription>This will generate a temporary password for the user.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                if (!confirmResetId) return;
                await resetPasswordMutation.mutateAsync(confirmResetId);
                setConfirmResetId(null);
              }}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!confirmToggle} onOpenChange={(open) => !open && setConfirmToggle(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Change user status?</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to set this user {confirmToggle?.next ? 'active' : 'inactive'}?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                if (!confirmToggle) return;
                await updateActiveMutation.mutateAsync({ userId: confirmToggle.id, isActive: confirmToggle.next });
                setConfirmToggle(null);
              }}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {tempPassword && (
          <div className="fixed bottom-4 right-4 bg-card border rounded-md shadow p-3">
            <div className="text-sm font-medium">Temporary password</div>
            <div className="font-mono text-lg">{tempPassword}</div>
            <div className="mt-2 flex gap-2 justify-end">
              <Button size="sm" onClick={() => {
                const blob = new Blob([`User temp password: ${tempPassword}`], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'temp-password.txt';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}>Download</Button>
              <Button variant="outline" size="sm" onClick={() => setTempPassword(null)}>Close</Button>
            </div>
          </div>
        )}
      </div>
    </AdminDashboard>
  );
}

function ProfileContent({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data: user } = useQuery<any>({
    queryKey: ['/api/admin/users', userId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${userId}`, { credentials: 'include' });
      return res.json();
    }
  });
  if (!user) return <p className="text-muted-foreground">Loading profile...</p>;
  const lines = [
    `<h1>${user.firstName || ''} ${user.lastName || ''}</h1>`,
    `<div>Email: ${user.email}</div>`,
    `<div>Phone: ${user.phone || 'n/a'}</div>`,
    `<div>Status: ${user.isActive ? 'Active' : 'Inactive'}</div>`,
    `<div>Role: ${user.role}</div>`,
    `<div>Created: ${new Date(user.createdAt).toLocaleString()}</div>`,
    `<div>Last login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'n/a'}</div>`,
    `<div>Email verified: ${user.emailVerified ? 'Yes' : 'No'}</div>`,
    `<div>Permissions: ${(user.permissions || []).join(', ')}</div>`,
  ].join('');
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Name</div>
          <div className="text-base">{(user.firstName || '') + ' ' + (user.lastName || '')}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Email</div>
          <div className="text-base">{user.email}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Phone</div>
          <div className="text-base">{user.phone || 'n/a'}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Status</div>
          <div className="text-base">{user.isActive ? 'Active' : 'Inactive'}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Role</div>
          <div className="text-base">{user.role}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Created</div>
          <div className="text-base">{new Date(user.createdAt).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Last login</div>
          <div className="text-base">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'n/a'}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Email verified</div>
          <div className="text-base">{user.emailVerified ? 'Yes' : 'No'}</div>
        </div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">Permissions</div>
        <div className="text-base">{(user.permissions || []).join(', ') || 'None'}</div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button onClick={() => {
          const w = window.open('', 'profilePrint');
          if (!w) return;
          w.document.write(`<!doctype html><meta charset="utf-8"><body>${lines}</body>`);
          w.document.close();
          w.focus();
          w.print();
        }}>Print</Button>
        <Button variant="outline" onClick={() => {
          const blob = new Blob([`<!doctype html><meta charset="utf-8"><body>${lines}</body>`], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `user-profile-${user.id.slice(0,8)}.html`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }}>Download</Button>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
