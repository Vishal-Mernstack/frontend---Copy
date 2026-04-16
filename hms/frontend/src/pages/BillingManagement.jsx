import { useState, useMemo } from "react";
import { format, addDays, differenceInDays, startOfMonth, endOfMonth } from "date-fns";
import { 
  Receipt, 
  DollarSign, 
  CreditCard, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Calendar,
  User,
  Building
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";

const INVOICE_STATUS = {
  DRAFT: "Draft",
  SENT: "Sent",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
  PARTIAL: "Partially Paid",
};

const PAYMENT_METHODS = {
  CASH: "Cash",
  CARD: "Credit/Debit Card",
  INSURANCE: "Insurance",
  BANK_TRANSFER: "Bank Transfer",
  ONLINE: "Online Payment",
};

const INSURANCE_STATUS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
};

const STATUS_COLORS = {
  [INVOICE_STATUS.DRAFT]: "bg-gray-100 text-gray-800 border-gray-200",
  [INVOICE_STATUS.SENT]: "bg-blue-100 text-blue-800 border-blue-200",
  [INVOICE_STATUS.PAID]: "bg-green-100 text-green-800 border-green-200",
  [INVOICE_STATUS.OVERDUE]: "bg-red-100 text-red-800 border-red-200",
  [INVOICE_STATUS.CANCELLED]: "bg-gray-100 text-gray-800 border-gray-200",
  [INVOICE_STATUS.PARTIAL]: "bg-amber-100 text-amber-800 border-amber-200",
};

const SAMPLE_INVOICES = [
  {
    id: 1,
    invoiceNumber: "INV-2024-001",
    patientName: "John Doe",
    patientId: "P001",
    amount: 1250.00,
    paidAmount: 1250.00,
    dueAmount: 0.00,
    status: "PAID",
    issueDate: "2024-12-01",
    dueDate: "2024-12-15",
    paidDate: "2024-12-14",
    services: [
      { name: "Consultation Fee", quantity: 1, rate: 150.00, amount: 150.00 },
      { name: "Blood Tests", quantity: 3, rate: 45.00, amount: 135.00 },
      { name: "X-Ray", quantity: 1, rate: 200.00, amount: 200.00 },
      { name: "Medicines", quantity: 5, rate: 153.00, amount: 765.00 },
    ],
    taxes: { gst: 125.00, service: 25.00 },
    discounts: { senior: 0.00, insurance: 0.00 },
    paymentMethod: "CARD",
    insuranceProvider: "HealthPlus Insurance",
    policyNumber: "HP-123456",
    claimStatus: "COMPLETED",
    claimAmount: 1000.00,
    notes: "Regular checkup with preventive care",
  },
  {
    id: 2,
    invoiceNumber: "INV-2024-002",
    patientName: "Jane Smith",
    patientId: "P002",
    amount: 2800.00,
    paidAmount: 1400.00,
    dueAmount: 1400.00,
    status: "PARTIAL",
    issueDate: "2024-12-05",
    dueDate: "2024-12-20",
    paidDate: "2024-12-10",
    services: [
      { name: "Emergency Room Visit", quantity: 1, rate: 500.00, amount: 500.00 },
      { name: "ICU Stay (2 days)", quantity: 2, rate: 800.00, amount: 1600.00 },
      { name: "Surgery Charges", quantity: 1, rate: 700.00, amount: 700.00 },
    ],
    taxes: { gst: 280.00, service: 56.00 },
    discounts: { insurance: 200.00, senior: 0.00 },
    paymentMethod: "INSURANCE",
    insuranceProvider: "MediCare Plus",
    policyNumber: "MC-789012",
    claimStatus: "PROCESSING",
    claimAmount: 2240.00,
    notes: "Emergency appendectomy surgery",
  },
  {
    id: 3,
    invoiceNumber: "INV-2024-003",
    patientName: "Robert Johnson",
    patientId: "P003",
    amount: 450.00,
    paidAmount: 0.00,
    dueAmount: 450.00,
    status: "OVERDUE",
    issueDate: "2024-11-20",
    dueDate: "2024-12-05",
    paidDate: null,
    services: [
      { name: "Dental Cleaning", quantity: 1, rate: 120.00, amount: 120.00 },
      { name: "Filling", quantity: 2, rate: 165.00, amount: 330.00 },
    ],
    taxes: { gst: 45.00, service: 9.00 },
    discounts: { senior: 22.50, insurance: 0.00 },
    paymentMethod: null,
    insuranceProvider: null,
    policyNumber: null,
    claimStatus: null,
    claimAmount: 0.00,
    notes: "Dental treatment - overdue payment",
  },
];

export default function BillingManagement() {
  const [invoices, setInvoices] = useState(SAMPLE_INVOICES);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [activeTab, setActiveTab] = useState("invoices");

  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
                          invoice.patientName.toLowerCase().includes(search.toLowerCase()) ||
                          (invoice.insuranceProvider && invoice.insuranceProvider.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      
      let matchesDate = true;
      if (dateFilter !== "all") {
        const invoiceDate = new Date(invoice.issueDate);
        const today = new Date();
        
        switch (dateFilter) {
          case "today":
            matchesDate = invoiceDate.toDateString() === today.toDateString();
            break;
          case "week":
            const weekAgo = addDays(today, -7);
            matchesDate = invoiceDate >= weekAgo;
            break;
          case "month":
            matchesDate = invoiceDate >= startOfMonth(today) && invoiceDate <= endOfMonth(today);
            break;
          case "overdue":
            matchesDate = invoice.status === INVOICE_STATUS.OVERDUE;
            break;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [invoices, search, statusFilter, dateFilter]);

  const stats = useMemo(() => {
    const total = invoices.length;
    const paid = invoices.filter(inv => inv.status === INVOICE_STATUS.PAID).length;
    const overdue = invoices.filter(inv => inv.status === INVOICE_STATUS.OVERDUE).length;
    const partial = invoices.filter(inv => inv.status === INVOICE_STATUS.PARTIAL).length;
    const draft = invoices.filter(inv => inv.status === INVOICE_STATUS.DRAFT).length;
    
    const totalRevenue = invoices
      .filter(inv => inv.status === INVOICE_STATUS.PAID)
      .reduce((sum, inv) => sum + inv.paidAmount, 0);
    
    const outstandingAmount = invoices
      .filter(inv => inv.status !== INVOICE_STATUS.PAID && inv.status !== INVOICE_STATUS.CANCELLED)
      .reduce((sum, inv) => sum + inv.dueAmount, 0);

    const insuranceClaims = invoices
      .filter(inv => inv.insuranceProvider)
      .reduce((sum, inv) => sum + inv.claimAmount, 0);

    return {
      total,
      paid,
      overdue,
      partial,
      draft,
      totalRevenue,
      outstandingAmount,
      insuranceClaims,
    };
  }, [invoices]);

  const handleStatusUpdate = (invoiceId, newStatus) => {
    const updatedInvoices = invoices.map(invoice => 
      invoice.id === invoiceId ? { 
        ...invoice, 
        status: newStatus,
        paidDate: newStatus === INVOICE_STATUS.PAID ? format(new Date(), 'yyyy-MM-dd') : invoice.paidDate
      } : invoice
    );
    setInvoices(updatedInvoices);
  };

  const handlePayment = (invoiceId, paymentAmount) => {
    const updatedInvoices = invoices.map(invoice => {
      if (invoice.id === invoiceId) {
        const newPaidAmount = invoice.paidAmount + paymentAmount;
        const newDueAmount = invoice.amount - newPaidAmount;
        const newStatus = newDueAmount <= 0 ? INVOICE_STATUS.PAID : 
                        newDueAmount < invoice.amount ? INVOICE_STATUS.PARTIAL : invoice.status;
        
        return {
          ...invoice,
          paidAmount: newPaidAmount,
          dueAmount: Math.max(0, newDueAmount),
          status: newStatus,
          paidDate: newStatus === INVOICE_STATUS.PAID ? format(new Date(), 'yyyy-MM-dd') : invoice.paidDate
        };
      }
      return invoice;
    });
    setInvoices(updatedInvoices);
  };

  const getDaysOverdue = (dueDate) => {
    return differenceInDays(new Date(), new Date(dueDate));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Billing & Payments</h1>
          <p className="text-sm text-slate-500">Manage invoices, payments, and insurance claims.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setOpenDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-8 w-8 text-slate-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.paid}</p>
                <p className="text-xs text-slate-500">Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.overdue}</p>
                <p className="text-xs text-slate-500">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">${stats.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">${stats.outstandingAmount.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Outstanding</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">${stats.insuranceClaims.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Insurance Claims</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.values(INVOICE_STATUS).map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="overdue">Overdue Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Invoice List */}
          <div className="space-y-3">
            {filteredInvoices.map((invoice) => {
              const daysOverdue = getDaysOverdue(invoice.dueDate);
              const isOverdue = invoice.status === INVOICE_STATUS.OVERDUE;
              
              return (
                <Card key={invoice.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {invoice.invoiceNumber}
                          </h3>
                          <Badge className={STATUS_COLORS[invoice.status]}>
                            {invoice.status}
                          </Badge>
                        </div>
                        
                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="text-sm">
                            <span className="font-medium text-slate-700">Patient:</span>
                            <span className="text-slate-600 ml-2">{invoice.patientName}</span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-slate-700">Issue Date:</span>
                            <span className="text-slate-600 ml-2">{format(new Date(invoice.issueDate), 'MMM d, yyyy')}</span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-slate-700">Due Date:</span>
                            <span className={`ml-2 ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>
                              {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                              {isOverdue && ` (${daysOverdue} days overdue)`}
                            </span>
                          </div>
                          {invoice.paidDate && (
                            <div className="text-sm">
                              <span className="font-medium text-slate-700">Paid Date:</span>
                              <span className="text-slate-600 ml-2">{format(new Date(invoice.paidDate), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                        </div>

                        <div className="grid gap-2 md:grid-cols-3">
                          <div className="text-sm">
                            <span className="font-medium text-slate-700">Total:</span>
                            <span className="text-slate-900 font-semibold ml-2">${invoice.amount.toFixed(2)}</span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-slate-700">Paid:</span>
                            <span className="text-green-600 font-semibold ml-2">${invoice.paidAmount.toFixed(2)}</span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-slate-700">Due:</span>
                            <span className={`font-semibold ml-2 ${isOverdue ? 'text-red-600' : 'text-slate-900'}`}>
                              ${invoice.dueAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {invoice.insuranceProvider && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <div className="text-sm text-blue-800">
                              <p className="font-medium">Insurance Provider: {invoice.insuranceProvider}</p>
                              <p>Policy: {invoice.policyNumber}</p>
                              <p>Claim Amount: ${invoice.claimAmount.toFixed(2)}</p>
                              <p>Status: {invoice.claimStatus}</p>
                            </div>
                          </div>
                        )}

                        <div className="text-sm text-slate-500">
                          <p>Payment Method: {invoice.paymentMethod || 'Pending'}</p>
                          {invoice.notes && <p>Notes: {invoice.notes}</p>}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(invoice)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="mr-2 h-4 w-4" />
                          PDF
                        </Button>
                        {invoice.status !== INVOICE_STATUS.PAID && (
                          <Button 
                            size="sm"
                            onClick={() => {
                              const paymentAmount = prompt('Enter payment amount:', invoice.dueAmount.toFixed(2));
                              if (paymentAmount && !isNaN(paymentAmount)) {
                                handlePayment(invoice.id, parseFloat(paymentAmount));
                              }
                            }}
                          >
                            <DollarSign className="mr-2 h-4 w-4" />
                            Payment
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Payment Processing</h3>
              <p className="mt-2 text-sm text-slate-500">
                Track and process all payment methods with automatic receipt generation.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance" className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Building className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Insurance Claims Management</h3>
              <p className="mt-2 text-sm text-slate-500">
                Submit and track insurance claims with real-time status updates.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Financial Reports</h3>
              <p className="mt-2 text-sm text-slate-500">
                Generate comprehensive financial reports including revenue analysis and tax summaries.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invoice Detail Dialog */}
      <Dialog open={Boolean(selectedInvoice)} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details - {selectedInvoice?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Patient and Invoice Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Patient Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Name:</span> {selectedInvoice.patientName}</p>
                      <p><span className="font-medium">ID:</span> {selectedInvoice.patientId}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Invoice Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Invoice:</span> {selectedInvoice.invoiceNumber}</p>
                      <p><span className="font-medium">Status:</span> 
                        <Badge className={`ml-2 ${STATUS_COLORS[selectedInvoice.status]}`}>
                          {selectedInvoice.status}
                        </Badge>
                      </p>
                      <p><span className="font-medium">Issue Date:</span> {format(new Date(selectedInvoice.issueDate), 'MMM d, yyyy')}</p>
                      <p><span className="font-medium">Due Date:</span> {format(new Date(selectedInvoice.dueDate), 'MMM d, yyyy')}</p>
                      {selectedInvoice.paidDate && (
                        <p><span className="font-medium">Paid Date:</span> {format(new Date(selectedInvoice.paidDate), 'MMM d, yyyy')}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Services Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Services & Charges</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-2 text-sm font-medium border-b pb-2">
                      <div>Service</div>
                      <div>Quantity</div>
                      <div>Rate</div>
                      <div className="text-right">Amount</div>
                    </div>
                    {selectedInvoice.services.map((service, index) => (
                      <div key={index} className="grid grid-cols-4 gap-2 text-sm">
                        <div>{service.name}</div>
                        <div>{service.quantity}</div>
                        <div>${service.rate.toFixed(2)}</div>
                        <div className="text-right font-medium">${service.amount.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Financial Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${selectedInvoice.amount.toFixed(2)}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Taxes:</div>
                      {Object.entries(selectedInvoice.taxes).map(([key, amount]) => (
                        <div key={key} className="flex justify-between text-sm ml-4">
                          <span className="capitalize">{key}:</span>
                          <span>${amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Discounts:</div>
                      {Object.entries(selectedInvoice.discounts).map(([key, amount]) => (
                        <div key={key} className="flex justify-between text-sm ml-4">
                          <span className="capitalize">{key}:</span>
                          <span>-${amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t pt-3">
                      <div className="flex justify-between">
                        <span className="font-semibold">Total Amount:</span>
                        <span className="font-bold text-lg">${selectedInvoice.amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Paid Amount:</span>
                        <span className="text-green-600 font-medium">${selectedInvoice.paidAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Due Amount:</span>
                        <span className={`font-medium ${selectedInvoice.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${selectedInvoice.dueAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {selectedInvoice.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600">{selectedInvoice.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
              Close
            </Button>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
