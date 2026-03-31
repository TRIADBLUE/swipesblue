import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, Pencil, Trash2, DollarSign, Percent, History, Calculator, 
  Save, Search, Upload, CheckCircle, BarChart3, AlertCircle, 
  CheckCircle2, XCircle, ArrowRight
} from "lucide-react";

interface Rate {
  id: string;
  tierName: string;
  tierType: string;
  monthlyFee: string;
  transactionPercent: string;
  transactionFlat: string;
  description: string | null;
  features: string[] | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface DraftRate {
  tierName: string;
  tierType: string;
  monthlyFee: string;
  transactionPercent: string;
  transactionFlat: string;
  description: string | null;
  features: string[] | null;
  isActive: boolean;
  displayOrder: number;
}

interface CostBaseline {
  id: string;
  name: string;
  description: string | null;
  percentCost: string | null;
  flatCost: string | null;
  targetMarginPercent: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  tableName: string;
  recordId: string;
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  changedBy: string | null;
  reason: string | null;
  createdAt: string;
}

interface ResearchReport {
  timestamp: string;
  baseCosts: {
    interchangePlus: string;
    perTransaction: string;
    targetMargin: string;
    minimumRateNeeded: string;
  };
  tierAnalysis: Array<{
    tierName: string;
    tierType: string;
    yourRate: string;
    yourCost: string;
    margin: string;
    targetMargin: string;
    meetsTarget: boolean;
    status: "green" | "yellow" | "red";
    competitors: Array<{
      provider: string;
      rate: string;
      fee: string;
      savings: string;
      isLower: boolean;
    }>;
  }>;
  summary: {
    allMeetTarget: boolean;
    allCompetitive: boolean;
    readyToUpload: boolean;
    message: string;
  };
}

interface CompareData {
  active: Rate[];
  staged: Rate[];
  costs: CostBaseline[];
  competitors: Record<string, { percent: number; flat: number }>;
  timestamp: string;
}

export default function RateManagement() {
  const { toast } = useToast();
  const [editingRate, setEditingRate] = useState<Rate | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [draftRates, setDraftRates] = useState<DraftRate[]>([]);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [researchReport, setResearchReport] = useState<ResearchReport | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);

  const { data: rates = [], isLoading: ratesLoading } = useQuery<Rate[]>({
    queryKey: ["/api/admin/rates"],
  });

  const { data: stagedRates = [] } = useQuery<Rate[]>({
    queryKey: ["/api/admin/rates/staged"],
  });

  const { data: costs = [], isLoading: costsLoading } = useQuery<CostBaseline[]>({
    queryKey: ["/api/admin/costs"],
  });

  const { data: auditLogs = [] } = useQuery<AuditLog[]>({
    queryKey: ["/api/admin/rates/audit"],
  });

  const { data: compareData } = useQuery<CompareData>({
    queryKey: ["/api/admin/rates/compare"],
    enabled: showCompareDialog,
  });

  useEffect(() => {
    const savedDraft = localStorage.getItem("swipesblue_rate_draft");
    const savedTimestamp = localStorage.getItem("swipesblue_rate_draft_timestamp");
    if (savedDraft) {
      try {
        setDraftRates(JSON.parse(savedDraft));
        setDraftSavedAt(savedTimestamp);
      } catch (e) {
        console.error("Failed to load draft rates:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (rates.length > 0 && draftRates.length === 0) {
      setDraftRates(rates.map(r => ({
        tierName: r.tierName,
        tierType: r.tierType,
        monthlyFee: r.monthlyFee,
        transactionPercent: r.transactionPercent,
        transactionFlat: r.transactionFlat,
        description: r.description,
        features: r.features,
        isActive: r.isActive,
        displayOrder: r.displayOrder,
      })));
    }
  }, [rates]);

  const createRateMutation = useMutation({
    mutationFn: async (data: Partial<Rate>) => {
      return apiRequest("POST", "/api/admin/rates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rates/audit"] });
      toast({ title: "Rate created successfully" });
      setIsAddDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to create rate", variant: "destructive" });
    },
  });

  const updateRateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Rate> }) => {
      return apiRequest("PATCH", `/api/admin/rates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rates/audit"] });
      toast({ title: "Rate updated successfully" });
      setEditingRate(null);
    },
    onError: () => {
      toast({ title: "Failed to update rate", variant: "destructive" });
    },
  });

  const deleteRateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/rates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rates/audit"] });
      toast({ title: "Rate deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete rate", variant: "destructive" });
    },
  });

  const uploadStagedMutation = useMutation({
    mutationFn: async (rates: DraftRate[]) => {
      return apiRequest("POST", "/api/admin/rates/staged/bulk", { rates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rates/staged"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rates/audit"] });
      toast({ title: "Rates staged successfully", description: `Staged at ${new Date().toLocaleTimeString()}` });
    },
    onError: () => {
      toast({ title: "Failed to stage rates", variant: "destructive" });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/rates/staged/activate");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rates/staged"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rates/audit"] });
      toast({ title: "Rates activated!", description: `Live at ${new Date().toLocaleTimeString()}` });
      setShowActivateConfirm(false);
    },
    onError: () => {
      toast({ title: "Failed to activate rates", variant: "destructive" });
    },
  });

  const handleSaveDraft = () => {
    const timestamp = new Date().toISOString();
    localStorage.setItem("swipesblue_rate_draft", JSON.stringify(draftRates));
    localStorage.setItem("swipesblue_rate_draft_timestamp", timestamp);
    setDraftSavedAt(timestamp);
    toast({ title: "Draft saved", description: `Saved at ${new Date(timestamp).toLocaleTimeString()}` });
  };

  const handleResearch = async () => {
    setIsResearching(true);
    try {
      const response = await apiRequest("POST", "/api/admin/rates/research", { draftRates });
      if (!response.ok) throw new Error("Research failed");
      const report = await response.json();
      setResearchReport(report);
      toast({ title: "Research complete", description: report.summary.message });
    } catch (error) {
      toast({ title: "Research failed", variant: "destructive" });
    } finally {
      setIsResearching(false);
    }
  };

  const handleUpload = () => {
    uploadStagedMutation.mutate(draftRates);
  };

  const handleActivate = () => {
    activateMutation.mutate();
  };

  const updateDraftRate = (index: number, field: keyof DraftRate, value: string | boolean | number | null) => {
    setDraftRates(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const ecommerceRates = rates.filter(r => r.tierType === "ecommerce");
  const developerRates = rates.filter(r => r.tierType === "developer");
  const ecommerceDrafts = draftRates.filter(r => r.tierType === "ecommerce");
  const developerDrafts = draftRates.filter(r => r.tierType === "developer");

  const RateForm = ({ rate, onSubmit, onCancel, isNew = false }: {
    rate?: Rate | null;
    onSubmit: (data: Partial<Rate>) => void;
    onCancel: () => void;
    isNew?: boolean;
  }) => {
    const [formData, setFormData] = useState({
      tierName: rate?.tierName || "",
      tierType: rate?.tierType || "ecommerce",
      monthlyFee: rate?.monthlyFee || "0",
      transactionPercent: rate?.transactionPercent || "2.70",
      transactionFlat: rate?.transactionFlat || "0.30",
      description: rate?.description || "",
      features: rate?.features?.join("\n") || "",
      isActive: rate?.isActive ?? true,
      displayOrder: rate?.displayOrder || 0,
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit({
        tierName: formData.tierName,
        tierType: formData.tierType,
        monthlyFee: formData.monthlyFee,
        transactionPercent: formData.transactionPercent,
        transactionFlat: formData.transactionFlat,
        description: formData.description || null,
        features: formData.features ? formData.features.split("\n").filter(f => f.trim()) : null,
        isActive: formData.isActive,
        displayOrder: formData.displayOrder,
      });
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tierName">Tier Name</Label>
            <Input
              id="tierName"
              value={formData.tierName}
              onChange={(e) => setFormData({ ...formData, tierName: e.target.value })}
              placeholder="e.g., Free, Growth, Scale"
              required
              data-testid="input-tier-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tierType">Tier Type</Label>
            <Select
              value={formData.tierType}
              onValueChange={(v) => setFormData({ ...formData, tierType: v })}
            >
              <SelectTrigger data-testid="select-tier-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ecommerce">E-Commerce</SelectItem>
                <SelectItem value="developer">Developer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="monthlyFee">Monthly Fee ($)</Label>
            <Input
              id="monthlyFee"
              type="number"
              step="0.01"
              value={formData.monthlyFee}
              onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })}
              data-testid="input-monthly-fee"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transactionPercent">Transaction %</Label>
            <Input
              id="transactionPercent"
              type="number"
              step="0.001"
              value={formData.transactionPercent}
              onChange={(e) => setFormData({ ...formData, transactionPercent: e.target.value })}
              data-testid="input-transaction-percent"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transactionFlat">Per Transaction ($)</Label>
            <Input
              id="transactionFlat"
              type="number"
              step="0.01"
              value={formData.transactionFlat}
              onChange={(e) => setFormData({ ...formData, transactionFlat: e.target.value })}
              data-testid="input-transaction-flat"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of this tier"
            data-testid="input-description"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="features">Features (one per line)</Label>
          <Textarea
            id="features"
            value={formData.features}
            onChange={(e) => setFormData({ ...formData, features: e.target.value })}
            placeholder="Unlimited products&#10;Priority support&#10;Advanced analytics"
            rows={4}
            data-testid="textarea-features"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
              data-testid="switch-is-active"
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayOrder">Display Order</Label>
            <Input
              id="displayOrder"
              type="number"
              className="w-20"
              value={formData.displayOrder}
              onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
              data-testid="input-display-order"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" data-testid="button-save-rate">
            {isNew ? "Create Rate" : "Save Changes"}
          </Button>
        </DialogFooter>
      </form>
    );
  };

  const RateCard = ({ rate }: { rate: Rate }) => (
    <Card className="relative" data-testid={`card-rate-${rate.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{rate.tierName}</CardTitle>
            {!rate.isActive && (
              <Badge variant="secondary" className="text-xs">Inactive</Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Dialog open={editingRate?.id === rate.id} onOpenChange={(open) => !open && setEditingRate(null)}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingRate(rate)}
                  data-testid={`button-edit-rate-${rate.id}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Edit Rate: {rate.tierName}</DialogTitle>
                  <DialogDescription>
                    Update the pricing configuration for this tier.
                  </DialogDescription>
                </DialogHeader>
                <RateForm
                  rate={rate}
                  onSubmit={(data) => updateRateMutation.mutate({ id: rate.id, data })}
                  onCancel={() => setEditingRate(null)}
                />
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm(`Delete rate "${rate.tierName}"?`)) {
                  deleteRateMutation.mutate(rate.id);
                }
              }}
              data-testid={`button-delete-rate-${rate.id}`}
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        </div>
        <CardDescription>
          {rate.tierType === "ecommerce" ? "E-Commerce Suite" : "Developer API"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <DollarSign className="h-4 w-4" />
              Monthly Fee
            </div>
            <span className="font-semibold text-gray-900">
              ${parseFloat(rate.monthlyFee).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Percent className="h-4 w-4" />
              Transaction Rate
            </div>
            <span className="font-semibold text-gray-900">
              {parseFloat(rate.transactionPercent).toFixed(2)}% + ${parseFloat(rate.transactionFlat).toFixed(2)}
            </span>
          </div>
          {rate.description && (
            <p className="text-sm text-gray-500 mt-2 pt-2 border-t">
              {rate.description}
            </p>
          )}
          {rate.features && Array.isArray(rate.features) && rate.features.length > 0 && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs font-medium text-gray-500 mb-1">Features:</p>
              <ul className="text-xs text-gray-500 space-y-0.5">
                {rate.features.slice(0, 3).map((f, i) => (
                  <li key={i}>• {f}</li>
                ))}
                {rate.features.length > 3 && (
                  <li className="text-[#1844A6]">+{rate.features.length - 3} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (ratesLoading || costsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading rates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-rate-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Rate Management</h1>
          <p className="text-gray-500">Configure transaction rates and fees for all pricing tiers.</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-rate">
              <Plus className="h-4 w-4 mr-2" />
              Add Rate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Rate</DialogTitle>
              <DialogDescription>
                Add a new pricing tier for the platform.
              </DialogDescription>
            </DialogHeader>
            <RateForm
              isNew
              onSubmit={(data) => createRateMutation.mutate(data)}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* 5-Button Workflow Panel */}
      <Card className="border-[#1844A6]/20 bg-gradient-to-r from-[#1844A6]/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5 text-[#1844A6]" />
            Rate Workflow
          </CardTitle>
          <CardDescription>
            Save Draft → Research → Upload → Activate → Compare
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-center">
            {/* Button 1: Save Draft */}
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              className="group"
              data-testid="button-save-draft"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
              <span className="inline-flex w-0 opacity-0 group-hover:w-6 group-hover:opacity-100 transition-all duration-200 overflow-hidden">
                <ArrowRight className="h-4 w-4 ml-2" />
              </span>
            </Button>

            {/* Button 2: Research */}
            <Button
              variant="outline"
              onClick={handleResearch}
              disabled={isResearching || draftRates.length === 0}
              className="group"
              data-testid="button-research"
            >
              <Search className="h-4 w-4 mr-2" />
              {isResearching ? "Researching..." : "Research"}
              <span className="inline-flex w-0 opacity-0 group-hover:w-6 group-hover:opacity-100 transition-all duration-200 overflow-hidden">
                <ArrowRight className="h-4 w-4 ml-2" />
              </span>
            </Button>

            {/* Button 3: Upload */}
            <Button
              variant="outline"
              onClick={handleUpload}
              disabled={uploadStagedMutation.isPending || draftRates.length === 0}
              className="group"
              data-testid="button-upload"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploadStagedMutation.isPending ? "Uploading..." : "Upload"}
              <span className="inline-flex w-0 opacity-0 group-hover:w-6 group-hover:opacity-100 transition-all duration-200 overflow-hidden">
                <ArrowRight className="h-4 w-4 ml-2" />
              </span>
            </Button>

            {/* Button 4: Activate */}
            <Dialog open={showActivateConfirm} onOpenChange={setShowActivateConfirm}>
              <DialogTrigger asChild>
                <Button
                  className="bg-green-600 hover:bg-green-600/90 group"
                  disabled={stagedRates.length === 0}
                  data-testid="button-activate"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Activate
                  <span className="inline-flex w-0 opacity-0 group-hover:w-6 group-hover:opacity-100 transition-all duration-200 overflow-hidden">
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Activate Staged Rates?</DialogTitle>
                  <DialogDescription>
                    This will make {stagedRates.length} staged rates LIVE on the website. 
                    All pricing pages will immediately reflect the new rates.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button 
                    onClick={handleActivate}
                    disabled={activateMutation.isPending}
                    className="bg-green-600 hover:bg-green-600/90"
                    data-testid="button-confirm-activate"
                  >
                    {activateMutation.isPending ? "Activating..." : "Yes, Activate Now"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Button 5: Compare */}
            <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="group" data-testid="button-compare">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Compare
                  <span className="inline-flex w-0 opacity-0 group-hover:w-6 group-hover:opacity-100 transition-all duration-200 overflow-hidden">
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Rate Comparison</DialogTitle>
                  <DialogDescription>
                    Compare Active, Staged, Draft and Competitor Rates
                  </DialogDescription>
                </DialogHeader>
                {compareData && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-600" />
                            Active Rates ({compareData.active.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                          {compareData.active.map(r => (
                            <div key={r.id} className="flex justify-between">
                              <span>{r.tierName}</span>
                              <span className="font-mono">{r.transactionPercent}% + ${r.transactionFlat}</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            Staged Rates ({compareData.staged.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                          {compareData.staged.length === 0 ? (
                            <span className="text-gray-500">No staged rates</span>
                          ) : (
                            compareData.staged.map(r => (
                              <div key={r.id} className="flex justify-between">
                                <span>{r.tierName}</span>
                                <span className="font-mono">{r.transactionPercent}% + ${r.transactionFlat}</span>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#1844A6]" />
                            Draft Rates ({draftRates.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                          {draftRates.map((r, i) => (
                            <div key={i} className="flex justify-between">
                              <span>{r.tierName}</span>
                              <span className="font-mono">{r.transactionPercent}% + ${r.transactionFlat}</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Competitor Rates (on $100 sale)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Provider</th>
                              <th className="text-left py-2">Rate</th>
                              <th className="text-right py-2">Fee</th>
                              <th className="text-right py-2">You Keep</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="bg-[#1844A6]/5">
                              <td className="py-2 font-bold text-[#1844A6]">swipesblue</td>
                              <td className="py-2">2.70% + $0.30</td>
                              <td className="text-right py-2">$3.00</td>
                              <td className="text-right py-2 font-bold text-green-600">$97.00</td>
                            </tr>
                            <tr>
                              <td className="py-2 text-gray-500">Stripe</td>
                              <td className="py-2 text-gray-500">2.90% + $0.30</td>
                              <td className="text-right py-2 text-gray-500">$3.20</td>
                              <td className="text-right py-2 text-gray-500">$96.80</td>
                            </tr>
                            <tr>
                              <td className="py-2 text-gray-500">PayPal</td>
                              <td className="py-2 text-gray-500">2.99% + $0.49</td>
                              <td className="text-right py-2 text-gray-500">$3.48</td>
                              <td className="text-right py-2 text-gray-500">$96.52</td>
                            </tr>
                            <tr>
                              <td className="py-2 text-gray-500">Square</td>
                              <td className="py-2 text-gray-500">2.90% + $0.30</td>
                              <td className="text-right py-2 text-gray-500">$3.20</td>
                              <td className="text-right py-2 text-gray-500">$96.80</td>
                            </tr>
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Status indicators */}
            <div className="ml-auto flex items-center gap-4 text-xs text-gray-500">
              {draftSavedAt && (
                <span>Draft saved: {new Date(draftSavedAt).toLocaleTimeString()}</span>
              )}
              {stagedRates.length > 0 && (
                <Badge className="bg-yellow-500 text-black">{stagedRates.length} staged</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Research Report Display */}
      {researchReport && (
        <Card className="border-[#1844A6]/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5 text-[#1844A6]" />
                Rate Research Report
              </CardTitle>
              <span className="text-xs text-gray-500">
                Generated: {new Date(researchReport.timestamp).toLocaleString()}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Base Costs */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Your Costs</h4>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Interchange Plus:</span>
                  <p className="font-mono">{researchReport.baseCosts.interchangePlus}</p>
                </div>
                <div>
                  <span className="text-gray-500">Per Transaction:</span>
                  <p className="font-mono">{researchReport.baseCosts.perTransaction}</p>
                </div>
                <div>
                  <span className="text-gray-500">Target Margin:</span>
                  <p className="font-mono">{researchReport.baseCosts.targetMargin}</p>
                </div>
                <div>
                  <span className="text-gray-500">Minimum Rate:</span>
                  <p className="font-mono">{researchReport.baseCosts.minimumRateNeeded}</p>
                </div>
              </div>
            </div>

            {/* Tier Analysis */}
            <div className="space-y-3">
              <h4 className="font-medium">Margin Analysis by Tier</h4>
              {researchReport.tierAnalysis.map((tier, i) => (
                <div key={i} className="p-3 border rounded-lg flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {tier.status === "green" && <CheckCircle2 className="h-6 w-6 text-green-600" />}
                    {tier.status === "yellow" && <AlertCircle className="h-6 w-6 text-yellow-500" />}
                    {tier.status === "red" && <XCircle className="h-6 w-6 text-red-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tier.tierName}</span>
                      <Badge variant="secondary" className="text-xs">{tier.tierType}</Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      Rate: {tier.yourRate} | Margin: {tier.margin} | Target: {tier.targetMargin}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    {tier.meetsTarget ? (
                      <span className="text-green-600">Meets Target</span>
                    ) : (
                      <span className="text-red-600">Below Target</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className={`p-4 rounded-lg ${
              researchReport.summary.readyToUpload ? "bg-green-600/10" : "bg-red-600/10"
            }`}>
              <div className="flex items-center gap-2">
                {researchReport.summary.readyToUpload ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">{researchReport.summary.message}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="ecommerce" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="ecommerce" className="gap-2" data-testid="tab-ecommerce">
            <DollarSign className="h-4 w-4" />
            E-Commerce ({ecommerceRates.length})
          </TabsTrigger>
          <TabsTrigger value="developer" className="gap-2" data-testid="tab-developer">
            <Calculator className="h-4 w-4" />
            Developer ({developerRates.length})
          </TabsTrigger>
          <TabsTrigger value="draft" className="gap-2" data-testid="tab-draft">
            <Save className="h-4 w-4" />
            Draft Editor
          </TabsTrigger>
          <TabsTrigger value="costs" className="gap-2" data-testid="tab-costs">
            <Percent className="h-4 w-4" />
            Base Costs ({costs.length})
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2" data-testid="tab-audit">
            <History className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ecommerce">
          {ecommerceRates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No e-commerce rates configured. Click "Add Rate" to create one.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ecommerceRates.map((rate) => (
                <RateCard key={rate.id} rate={rate} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="developer">
          {developerRates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No developer rates configured. Click "Add Rate" to create one.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {developerRates.map((rate) => (
                <RateCard key={rate.id} rate={rate} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="draft">
          <Card>
            <CardHeader>
              <CardTitle>Draft Rate Editor</CardTitle>
              <CardDescription>
                Edit rates locally before uploading to staging. Changes here are saved to your browser only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {draftRates.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No draft rates. Active rates will be loaded automatically.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">Tier</th>
                          <th className="text-left py-2 px-2">Type</th>
                          <th className="text-left py-2 px-2">Monthly Fee</th>
                          <th className="text-left py-2 px-2">Transaction %</th>
                          <th className="text-left py-2 px-2">Flat Fee</th>
                          <th className="text-left py-2 px-2">Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {draftRates.map((draft, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-2 px-2">
                              <Input
                                value={draft.tierName}
                                onChange={(e) => updateDraftRate(index, "tierName", e.target.value)}
                                className="w-24"
                                data-testid={`draft-tier-name-${index}`}
                              />
                            </td>
                            <td className="py-2 px-2">
                              <Select
                                value={draft.tierType}
                                onValueChange={(v) => updateDraftRate(index, "tierType", v)}
                              >
                                <SelectTrigger className="w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ecommerce">E-Commerce</SelectItem>
                                  <SelectItem value="developer">Developer</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-2 px-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={draft.monthlyFee}
                                onChange={(e) => updateDraftRate(index, "monthlyFee", e.target.value)}
                                className="w-20"
                                data-testid={`draft-monthly-fee-${index}`}
                              />
                            </td>
                            <td className="py-2 px-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={draft.transactionPercent}
                                onChange={(e) => updateDraftRate(index, "transactionPercent", e.target.value)}
                                className="w-20"
                                data-testid={`draft-transaction-percent-${index}`}
                              />
                            </td>
                            <td className="py-2 px-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={draft.transactionFlat}
                                onChange={(e) => updateDraftRate(index, "transactionFlat", e.target.value)}
                                className="w-20"
                                data-testid={`draft-transaction-flat-${index}`}
                              />
                            </td>
                            <td className="py-2 px-2">
                              <Switch
                                checked={draft.isActive}
                                onCheckedChange={(v) => updateDraftRate(index, "isActive", v)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs">
          <Card>
            <CardHeader>
              <CardTitle>Base Cost Configuration</CardTitle>
              <CardDescription>
                These are your underlying costs from the payment processor (NMI). 
                Use these to calculate your profit margins.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {costs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No base costs configured yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {costs.map((cost) => (
                    <div key={cost.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{cost.name}</p>
                        {cost.description && (
                          <p className="text-sm text-gray-500">{cost.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {cost.percentCost && (
                          <p className="text-sm">{parseFloat(cost.percentCost).toFixed(3)}%</p>
                        )}
                        {cost.flatCost && (
                          <p className="text-sm">${parseFloat(cost.flatCost).toFixed(2)}</p>
                        )}
                        {cost.targetMarginPercent && (
                          <p className="text-xs text-green-600">
                            Target: {parseFloat(cost.targetMarginPercent).toFixed(2)}% margin
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Rate Change History</CardTitle>
              <CardDescription>
                All changes to pricing rates are logged here for compliance and auditing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No rate changes recorded yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg text-sm">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={log.action === "create" ? "default" : log.action === "delete" ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {log.action.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{log.tableName}</span>
                        </div>
                        <p className="text-gray-500 mt-1">
                          Record: {log.recordId.substring(0, 8)}...
                          {log.changedBy && ` by ${log.changedBy}`}
                        </p>
                        {log.reason && (
                          <p className="text-xs text-gray-500 mt-1">{log.reason}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
