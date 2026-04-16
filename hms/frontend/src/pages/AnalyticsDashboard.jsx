import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, subMonths, addDays } from "date-fns";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  DollarSign, 
  Activity,
  Bed,
  Pill,
  TestTube,
  Receipt,
  Filter,
  Download,
  Calendar as CalendarIcon
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

const TIME_RANGES = {
  TODAY: "Today",
  WEEK: "This Week",
  MONTH: "This Month",
  QUARTER: "This Quarter",
  YEAR: "This Year",
  CUSTOM: "Custom Range",
};

const CHART_TYPES = {
  LINE: "Line Chart",
  BAR: "Bar Chart",
  PIE: "Pie Chart",
  AREA: "Area Chart",
};

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("month");
  const [chartType, setChartType] = useState("bar");
  const [activeTab, setActiveTab] = useState("overview");

  // Sample data - in real app, this would come from API
  const analyticsData = useMemo(() => {
    const today = new Date();
    const startDate = timeRange === "today" ? today :
                   timeRange === "week" ? addDays(today, -7) :
                   timeRange === "month" ? startOfMonth(today) :
                   timeRange === "quarter" ? addDays(today, -90) :
                   timeRange === "year" ? addDays(today, -365) :
                   startOfMonth(today);

    return {
      overview: {
        totalPatients: 15420,
        newPatients: 245,
        totalAppointments: 8750,
        completedAppointments: 8230,
        totalRevenue: 1250000,
        occupiedBeds: 85,
        totalBeds: 120,
        labTests: 3420,
        prescriptions: 2150,
      },
      patientMetrics: {
        demographics: {
          ageGroups: {
            "0-18": 15,
            "19-35": 25,
            "36-50": 30,
            "51-65": 20,
            "65+": 10,
          },
          genders: {
            male: 55,
            female: 45,
          },
          newVsReturning: {
            new: 30,
            returning: 70,
          },
        },
        visitFrequency: [
          { month: "Jan", visits: 1200 },
          { month: "Feb", visits: 1350 },
          { month: "Mar", visits: 1100 },
          { month: "Apr", visits: 1450 },
          { month: "May", visits: 1600 },
          { month: "Jun", visits: 1550 },
        ],
      },
      revenueMetrics: {
        monthly: [
          { month: "Jan", revenue: 95000 },
          { month: "Feb", revenue: 105000 },
          { month: "Mar", revenue: 89000 },
          { month: "Apr", revenue: 115000 },
          { month: "May", revenue: 125000 },
          { month: "Jun", revenue: 118000 },
        ],
        departmentBreakdown: [
          { department: "Consultations", revenue: 450000 },
          { department: "Lab Tests", revenue: 280000 },
          { department: "Pharmacy", revenue: 320000 },
          { department: "Inpatient Care", revenue: 200000 },
        ],
        paymentMethods: {
          cash: 25,
          card: 45,
          insurance: 30,
        },
      },
      operationalMetrics: {
        bedOccupancy: [
          { date: "Mon", occupancy: 85 },
          { date: "Tue", occupancy: 88 },
          { date: "Wed", occupancy: 92 },
          { date: "Thu", occupancy: 87 },
          { date: "Fri", occupancy: 90 },
          { date: "Sat", occupancy: 75 },
          { date: "Sun", occupancy: 70 },
        ],
        appointmentTrends: [
          { month: "Jan", scheduled: 1200, completed: 1150, cancelled: 50 },
          { month: "Feb", scheduled: 1350, completed: 1280, cancelled: 70 },
          { month: "Mar", scheduled: 1100, completed: 1050, cancelled: 50 },
          { month: "Apr", scheduled: 1450, completed: 1380, cancelled: 70 },
        ],
        labEfficiency: {
          averageTurnaround: 2.5, // hours
          testsCompleted: 3420,
          pendingTests: 45,
          urgentTests: 120,
        },
      },
    };
  }, [timeRange]);

  const calculateGrowth = (current, previous) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const MetricCard = ({ title, value, change, icon: Icon, color = "blue" }) => {
    const isPositive = change >= 0;
    const ChangeIcon = isPositive ? TrendingUp : TrendingDown;
    const changeColor = isPositive ? "text-green-600" : "text-red-600";
    
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Icon className={`h-8 w-8 text-${color}-600`} />
            <div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500">{title}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <ChangeIcon className={`h-4 w-4 ${changeColor}`} />
            <span className={`text-sm font-medium ${changeColor}`}>
              {change > 0 ? '+' : ''}{change.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500">vs last period</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Analytics Dashboard</h1>
          <p className="text-sm text-slate-500">Comprehensive hospital operations analytics and insights.</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TIME_RANGES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Advanced Filters
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patients">Patients</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Patients"
              value={analyticsData.overview.totalPatients.toLocaleString()}
              change={12.5}
              icon={Users}
              color="blue"
            />
            <MetricCard
              title="New Patients"
              value={analyticsData.overview.newPatients}
              change={8.2}
              icon={TrendingUp}
              color="green"
            />
            <MetricCard
              title="Total Revenue"
              value={`$${(analyticsData.overview.totalRevenue / 1000).toFixed(1)}K`}
              change={15.3}
              icon={DollarSign}
              color="emerald"
            />
            <MetricCard
              title="Bed Occupancy"
              value={`${analyticsData.overview.occupiedBeds}/${analyticsData.overview.totalBeds}`}
              change={-2.1}
              icon={Bed}
              color="amber"
            />
          </div>

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Completed:</span>
                    <span className="font-medium">{analyticsData.overview.completedAppointments}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Pending:</span>
                    <span className="font-medium">{analyticsData.overview.totalAppointments - analyticsData.overview.completedAppointments}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Completion Rate:</span>
                    <span className="font-medium">
                      {((analyticsData.overview.completedAppointments / analyticsData.overview.totalAppointments) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lab Tests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Completed:</span>
                    <span className="font-medium">{analyticsData.overview.labTests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Avg Turnaround:</span>
                    <span className="font-medium">{analyticsData.operationalMetrics.labEfficiency.averageTurnaround}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Urgent Tests:</span>
                    <span className="font-medium">{analyticsData.operationalMetrics.labEfficiency.urgentTests}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Prescriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Total Prescribed:</span>
                    <span className="font-medium">{analyticsData.overview.prescriptions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Avg per Patient:</span>
                    <span className="font-medium">
                      {(analyticsData.overview.prescriptions / analyticsData.overview.totalPatients).toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Growth:</span>
                    <span className="font-medium text-green-600">+18.2%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patients" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Patient Demographics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Age Distribution</h4>
                    <div className="space-y-2">
                      {Object.entries(analyticsData.patientMetrics.demographics.ageGroups).map(([age, percentage]) => (
                        <div key={age} className="flex items-center gap-2">
                          <span className="text-sm text-slate-600 w-12">{age}:</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8">{percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Gender Distribution</h4>
                    <div className="space-y-2">
                      {Object.entries(analyticsData.patientMetrics.demographics.genders).map(([gender, percentage]) => (
                        <div key={gender} className="flex items-center gap-2">
                          <span className="text-sm text-slate-600 w-12 capitalize">{gender}:</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8">{percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Visit Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-700">Monthly Patient Visits</h4>
                  <div className="space-y-2">
                    {analyticsData.patientMetrics.visitFrequency.map((data) => (
                      <div key={data.month} className="flex items-center gap-2">
                        <span className="text-sm text-slate-600 w-12">{data.month}:</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${(data.visits / 1600) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12">{data.visits}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-700">Monthly Revenue</h4>
                  <div className="space-y-2">
                    {analyticsData.revenueMetrics.monthly.map((data) => (
                      <div key={data.month} className="flex items-center gap-2">
                        <span className="text-sm text-slate-600 w-12">{data.month}:</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-emerald-600 h-2 rounded-full"
                            style={{ width: `${(data.revenue / 125000) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-16">${(data.revenue / 1000).toFixed(1)}K</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-700">Revenue by Department</h4>
                  <div className="space-y-2">
                    {analyticsData.revenueMetrics.departmentBreakdown.map((data) => (
                      <div key={data.department} className="flex items-center gap-2">
                        <span className="text-sm text-slate-600 flex-1">{data.department}</span>
                        <span className="text-sm font-medium">${(data.revenue / 1000).toFixed(1)}K</span>
                      </div>
                    ))}
                  </div>
                  
                  <h4 className="text-sm font-medium text-slate-700 mt-4">Payment Methods</h4>
                  <div className="space-y-2">
                    {Object.entries(analyticsData.revenueMetrics.paymentMethods).map(([method, percentage]) => (
                      <div key={method} className="flex items-center gap-2">
                        <span className="text-sm text-slate-600 capitalize">{method}:</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Bed Occupancy Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-700">Weekly Occupancy Rate</h4>
                  <div className="space-y-2">
                    {analyticsData.operationalMetrics.bedOccupancy.map((data) => (
                      <div key={data.date} className="flex items-center gap-2">
                        <span className="text-sm text-slate-600 w-8">{data.date}:</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-amber-600 h-2 rounded-full"
                            style={{ width: `${data.occupancy}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{data.occupancy}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Appointment Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-700">Monthly Appointment Trends</h4>
                  <div className="space-y-3">
                    {analyticsData.operationalMetrics.appointmentTrends.slice(0, 4).map((data) => (
                      <div key={data.month} className="text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{data.month}</span>
                          <span className="text-slate-600">
                            {data.completed}/{data.scheduled} completed
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${(data.completed / data.scheduled) * 100}%` }}
                            />
                          </div>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-red-600 h-2 rounded-full"
                              style={{ width: `${(data.cancelled / data.scheduled) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
