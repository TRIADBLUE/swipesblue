import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Copy, Eye, EyeOff, Trash2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ApiKey {
  id: string;
  platform: string;
  name: string;
  apiKey: string;
  isActive: boolean;
  permissions: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

interface NewApiKey extends ApiKey {
  apiSecret: string;
}

export default function ApiKeys() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<NewApiKey | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [platform, setPlatform] = useState("businessblueprint");
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);

  const availablePermissions = [
    { id: "process_payments", label: "Process Payments" },
    { id: "process_refunds", label: "Process Refunds" },
    { id: "view_transactions", label: "View Transactions" },
    { id: "manage_merchants", label: "Manage Merchants" },
  ];

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ["/api/v1/api-keys"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { platform: string; name: string; permissions: string[] }) => {
      const response = await apiRequest("POST", "/api/v1/api-keys/create", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/api-keys"] });
      setNewKeyResult(data);
      setCreateDialogOpen(false);
      setPlatform("businessblueprint");
      setName("");
      setPermissions([]);
      toast({
        title: "Success",
        description: "API key created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create API key",
        variant: "destructive",
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/v1/api-keys/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/api-keys"] });
      toast({
        title: "Success",
        description: "API key deactivated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate API key",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a name for the API key",
        variant: "destructive",
      });
      return;
    }

    if (permissions.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one permission",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({ platform, name, permissions });
  };

  const togglePermission = (permissionId: string) => {
    setPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const maskKey = (key: string) => {
    if (!key) return "••••••••••••";
    if (key.length <= 12) return key;
    return `${key.slice(0, 12)}${"•".repeat(20)}`;
  };

  const toggleShowSecret = (id: string) => {
    setShowSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6" data-testid="api-keys-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-page-title">API Keys</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Manage API keys for partner platform authentication</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-key">
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </Button>
      </div>

      <Card data-testid="card-api-keys-table">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-12 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (apiKeys || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500" data-testid="text-no-keys">
                      No API keys found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  (apiKeys || []).map((key: ApiKey) => (
                    <TableRow key={key.id} data-testid={`row-key-${key.id}`}>
                      <TableCell className="font-medium" data-testid={`text-name-${key.id}`}>{key.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-platform-${key.id}`}>{key.platform}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono">
                            {showSecrets[key.id] ? key.apiKey : maskKey(key.apiKey)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleShowSecret(key.id)}
                            data-testid={`button-toggle-${key.id}`}
                          >
                            {showSecrets[key.id] ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(key.apiKey, "API Key")}
                            data-testid={`button-copy-${key.id}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(key.permissions || []).map((perm: string) => (
                            <Badge key={perm} variant="secondary" className="text-xs" data-testid={`badge-permission-${key.id}-${perm}`}>
                              {perm.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                        {key.lastUsedAt
                          ? new Date(key.lastUsedAt).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={key.isActive ? "default" : "secondary"} data-testid={`badge-status-${key.id}`}>
                          {key.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {key.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deactivateMutation.mutate(key.id)}
                            disabled={deactivateMutation.isPending}
                            data-testid={`button-deactivate-${key.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-key">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key for partner platform authentication
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Production API Key"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
                data-testid="input-key-name"
              />
            </div>

            <div>
              <Label htmlFor="platform">Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="mt-1" data-testid="select-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="businessblueprint">businessblueprint</SelectItem>
                  <SelectItem value="hostsblue">hostsblue</SelectItem>
                  <SelectItem value="swipesblue">swipesblue</SelectItem>
                  <SelectItem value="scansblue">scansblue</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Permissions</Label>
              <div className="space-y-2 mt-2">
                {availablePermissions.map((perm) => (
                  <div key={perm.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={perm.id}
                      checked={permissions.includes(perm.id)}
                      onCheckedChange={() => togglePermission(perm.id)}
                      data-testid={`checkbox-${perm.id}`}
                    />
                    <Label htmlFor={perm.id} className="cursor-pointer">
                      {perm.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-submit">
              {createMutation.isPending ? "Creating..." : "Create API Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!newKeyResult} onOpenChange={() => setNewKeyResult(null)}>
        <DialogContent data-testid="dialog-key-created">
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Save these credentials securely. The secret will not be shown again.
            </DialogDescription>
          </DialogHeader>

          {newKeyResult && (
            <div className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="text-sm text-gray-900 dark:text-white">
                    <p className="font-medium">Important: Save these credentials now</p>
                    <p className="mt-1">
                      The API secret will only be shown once. Store it securely.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label>API Key</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded" data-testid="text-new-api-key">
                    {newKeyResult.apiKey}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(newKeyResult.apiKey, "API Key")}
                    data-testid="button-copy-new-key"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>API Secret</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded" data-testid="text-new-api-secret">
                    {newKeyResult.apiSecret}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(newKeyResult.apiSecret, "API Secret")}
                    data-testid="button-copy-new-secret"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setNewKeyResult(null)} data-testid="button-done">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
