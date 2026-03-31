import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Users,
  Clock,
  XCircle
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  loading,
  testId
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  trend?: { value: string; positive: boolean };
  loading?: boolean;
  testId: string;
}) {
  if (loading) {
    return (
      <Card data-testid={`${testId}-loading`}>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</CardTitle>
          <Icon className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</CardTitle>
        <Icon className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid={`${testId}-value`}>{value}</div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          {trend && (
            <span
              className={`text-xs font-medium ${
                trend.positive ? "text-green-600" : "text-red-600"
              }`}
              data-testid={`${testId}-trend`}
            >
              {trend.value}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/admin/metrics"],
  });

  const { data: recentTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/admin/transactions/recent"],
  });

  const { data: volumeData, isLoading: volumeLoading } = useQuery({
    queryKey: ["/api/admin/volume"],
  });

  const platformBreakdown = metrics?.platformBreakdown || [
    { name: "businessblueprint", value: 156000, color: "#3b82f6" },
    { name: "hostsblue", value: 124000, color: "#8b5cf6" },
  ];

  const merchantStats = metrics?.merchantStats || {
    active: 45,
    pending: 8,
    suspended: 2,
  };

  return (
    <div className="space-y-8" data-testid="admin-dashboard">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-page-title">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">Overview of your payment gateway performance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="stats-grid">
        <StatCard
          title="Total Processed"
          value={metrics?.totalProcessed || "$0"}
          subtitle="All time"
          icon={DollarSign}
          loading={metricsLoading}
          testId="stat-total-processed"
        />
        <StatCard
          title="This Month"
          value={metrics?.thisMonth || "$0"}
          subtitle="Current month revenue"
          icon={TrendingUp}
          trend={{ value: "+12.5%", positive: true }}
          loading={metricsLoading}
          testId="stat-this-month"
        />
        <StatCard
          title="Success Rate"
          value={metrics?.successRate || "0%"}
          subtitle="Last 30 days"
          icon={CheckCircle2}
          trend={{ value: "+2.1%", positive: true }}
          loading={metricsLoading}
          testId="stat-success-rate"
        />
        <StatCard
          title="Active Merchants"
          value={String(merchantStats.active)}
          subtitle={`${merchantStats.pending} pending approval`}
          icon={Users}
          loading={metricsLoading}
          testId="stat-active-merchants"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="chart-payment-volume">
          <CardHeader>
            <CardTitle>Payment Volume</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">Last 30 days</p>
          </CardHeader>
          <CardContent>
            {volumeLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={volumeData || []}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorAmount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-platform-breakdown">
          <CardHeader>
            <CardTitle>Platform Breakdown</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">Revenue by platform</p>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={platformBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {platformBreakdown.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) =>
                      `$${value.toLocaleString()}`
                    }
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-merchant-status">
          <CardHeader>
            <CardTitle>Merchant Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Active</span>
              </div>
              <span className="text-2xl font-bold" data-testid="text-merchants-active">{merchantStats.active}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Pending</span>
              </div>
              <span className="text-2xl font-bold" data-testid="text-merchants-pending">{merchantStats.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Suspended</span>
              </div>
              <span className="text-2xl font-bold" data-testid="text-merchants-suspended">{merchantStats.suspended}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2" data-testid="card-recent-transactions">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">Last 10 transactions</p>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(recentTransactions || []).slice(0, 10).map((transaction: any) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    data-testid={`row-transaction-${transaction.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm" data-testid={`text-customer-${transaction.id}`}>
                          {transaction.customerName || "Anonymous"}
                        </span>
                        <Badge
                          variant={
                            transaction.status === "success"
                              ? "default"
                              : transaction.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                          data-testid={`badge-status-${transaction.id}`}
                        >
                          {transaction.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {transaction.platform} • {new Date(transaction.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold" data-testid={`text-amount-${transaction.id}`}>
                        ${parseFloat(transaction.amount).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {transaction.cardBrand || "N/A"} •••• {transaction.cardLastFour || "****"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
