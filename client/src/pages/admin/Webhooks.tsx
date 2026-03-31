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
import { Plus, Copy, Trash2, PlayCircle, Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WebhookEndpoint {
  id: string;
  platform: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NewWebhook extends WebhookEndpoint {
  secret: string;
}

interface WebhookDelivery {
  id: string;
  event: string;
  status: string;
  attempts: number;
  responseStatus: number | null;
  errorMessage: string | null;
  createdAt: string;
}

export default function Webhooks() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWebhookResult, setNewWebhookResult] = useState<NewWebhook | null>(null);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookEndpoint | null>(null);
  const [deliveriesDialogOpen, setDeliveriesDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [platform, setPlatform] = useState("businessblueprint");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const availableEvents = [
    { id: "payment.success", label: "Payment Success" },
    { id: "payment.failed", label: "Payment Failed" },
    { id: "payment.refunded", label: "Payment Refunded" },
    { id: "merchant.created", label: "Merchant Created" },
    { id: "merchant.approved", label: "Merchant Approved" },
    { id: "merchant.suspended", label: "Merchant Suspended" },
  ];

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ["/api/admin/webhooks"],
  });

  const { data: deliveries, isLoading: deliveriesLoading } = useQuery({
    queryKey: ["/api/admin/webhook-deliveries", selectedWebhook?.id],
    queryFn: async () => {
      if (!selectedWebhook) return [];
      const response = await fetch(`/api/admin/webhooks/${selectedWebhook.id}/deliveries`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch deliveries");
      return response.json();
    },
    enabled: !!selectedWebhook && deliveriesDialogOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { platform: string; url: string; events: string[] }) => {
      const response = await apiRequest("POST", "/api/admin/webhooks/register", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/webhooks"] });
      setNewWebhookResult(data);
      setCreateDialogOpen(false);
      setPlatform("businessblueprint");
      setUrl("");
      setSelectedEvents([]);
      toast({
        title: "Success",
        description: "Webhook registered successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create webhook",
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/admin/webhooks/${id}/test`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Success" : "Test Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to test webhook",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/webhooks/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/webhooks"] });
      toast({
        title: "Success",
        description: "Webhook deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete webhook",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!url.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a webhook URL",
        variant: "destructive",
      });
      return;
    }

    try {
      new URL(url);
    } catch {
      toast({
        title: "Validation Error",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    if (selectedEvents.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one event type",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({ platform, url, events: selectedEvents });
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((e) => e !== eventId)
        : [...prev, eventId]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Secret copied to clipboard",
    });
  };

  const getDeliveryStatusBadge = (status: string, deliveryId?: string) => {
    const config: Record<string, { variant: any; icon: any }> = {
      success: { variant: "default", icon: CheckCircle },
      failed: { variant: "destructive", icon: XCircle },
      pending: { variant: "secondary", icon: Clock },
    };

    const { variant, icon: Icon } = config[status] || config.pending;

    return (
      <Badge variant={variant} className="flex items-center gap-1 w-fit" data-testid={deliveryId ? `badge-status-${deliveryId}` : undefined}>
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6" data-testid="webhooks-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-page-title">Webhooks</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Manage webhook endpoints for real-time event notifications</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-register-webhook">
          <Plus className="h-4 w-4 mr-2" />
          Register Webhook
        </Button>
      </div>

      <Card data-testid="card-webhooks-table">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-12 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (webhooks || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500" data-testid="text-no-webhooks">
                      No webhooks registered. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  (webhooks || []).map((webhook: WebhookEndpoint) => (
                    <TableRow key={webhook.id} data-testid={`row-webhook-${webhook.id}`}>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-platform-${webhook.id}`}>{webhook.platform}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-xs truncate" data-testid={`text-url-${webhook.id}`}>
                        {webhook.url}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {webhook.events.map((event: string) => (
                            <Badge key={event} variant="secondary" className="text-xs" data-testid={`badge-event-${webhook.id}-${event.replace('.', '-')}`}>
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={webhook.isActive ? "default" : "secondary"} data-testid={`badge-status-${webhook.id}`}>
                          {webhook.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                        {new Date(webhook.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => testMutation.mutate(webhook.id)}
                            disabled={testMutation.isPending}
                            data-testid={`button-test-${webhook.id}`}
                          >
                            <PlayCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedWebhook(webhook);
                              setDeliveriesDialogOpen(true);
                            }}
                            data-testid={`button-deliveries-${webhook.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(webhook.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${webhook.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
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
        <DialogContent data-testid="dialog-register-webhook">
          <DialogHeader>
            <DialogTitle>Register Webhook</DialogTitle>
            <DialogDescription>
              Create a new webhook endpoint to receive event notifications
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="url">Webhook URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://your-domain.com/webhooks/swipesblue"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mt-1"
                data-testid="input-webhook-url"
              />
            </div>

            <div>
              <Label>Event Types</Label>
              <div className="space-y-2 mt-2">
                {availableEvents.map((event) => (
                  <div key={event.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={event.id}
                      checked={selectedEvents.includes(event.id)}
                      onCheckedChange={() => toggleEvent(event.id)}
                      data-testid={`checkbox-${event.id}`}
                    />
                    <Label htmlFor={event.id} className="cursor-pointer">
                      {event.label}
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
              {createMutation.isPending ? "Registering..." : "Register Webhook"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!newWebhookResult} onOpenChange={() => setNewWebhookResult(null)}>
        <DialogContent data-testid="dialog-webhook-created">
          <DialogHeader>
            <DialogTitle>Webhook Registered</DialogTitle>
            <DialogDescription>
              Save this secret securely. It will not be shown again.
            </DialogDescription>
          </DialogHeader>

          {newWebhookResult && (
            <div className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="text-sm text-gray-900 dark:text-white">
                    <p className="font-medium">Important: Save this secret now</p>
                    <p className="mt-1">
                      Use this secret to verify webhook signatures. It will only be shown once.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label>Webhook Secret</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded break-all" data-testid="text-webhook-secret">
                    {newWebhookResult.secret}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(newWebhookResult.secret)}
                    data-testid="button-copy-secret"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-300">
                <p className="font-medium mb-2">Webhook Details:</p>
                <dl className="space-y-1">
                  <div className="flex justify-between">
                    <dt>URL:</dt>
                    <dd className="font-mono text-xs">{newWebhookResult.url}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Platform:</dt>
                    <dd>{newWebhookResult.platform}</dd>
                  </div>
                  <div>
                    <dt className="mb-1">Events:</dt>
                    <dd className="flex flex-wrap gap-1">
                      {newWebhookResult.events.map((event: string) => (
                        <Badge key={event} variant="secondary" className="text-xs" data-testid={`badge-new-event-${event.replace('.', '-')}`}>
                          {event}
                        </Badge>
                      ))}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setNewWebhookResult(null)} data-testid="button-done">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deliveriesDialogOpen} onOpenChange={setDeliveriesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-deliveries">
          <DialogHeader>
            <DialogTitle>Webhook Deliveries</DialogTitle>
            <DialogDescription>
              View delivery attempts for this webhook endpoint
            </DialogDescription>
          </DialogHeader>

          {selectedWebhook && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-sm">
                <div className="font-medium mb-1">{selectedWebhook.url}</div>
                <div className="text-gray-600 dark:text-gray-300">{selectedWebhook.platform}</div>
              </div>

              <div>
                {deliveriesLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (deliveries || []).length === 0 ? (
                  <div className="text-center py-8 text-gray-500" data-testid="text-no-deliveries">
                    No deliveries yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(deliveries || []).map((delivery: WebhookDelivery) => (
                      <div
                        key={delivery.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                        data-testid={`row-delivery-${delivery.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" data-testid={`badge-event-delivery-${delivery.id}`}>{delivery.event}</Badge>
                            {getDeliveryStatusBadge(delivery.status, delivery.id)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(delivery.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 grid grid-cols-2 gap-2">
                          <div>
                            Attempts: <span className="font-medium" data-testid={`text-attempts-${delivery.id}`}>{delivery.attempts}</span>
                          </div>
                          {delivery.responseStatus && (
                            <div>
                              Status: <span className="font-medium" data-testid={`text-response-status-${delivery.id}`}>{delivery.responseStatus}</span>
                            </div>
                          )}
                        </div>
                        {delivery.errorMessage && (
                          <div className="mt-2 text-xs text-red-600" data-testid={`text-error-${delivery.id}`}>
                            {delivery.errorMessage}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
