import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  CreditCard,
  Banknote,
  Building2,
  ArrowRightLeft,
  CheckCircle,
  Clock,
  Copy,
  RefreshCw,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import useBilling from "../../hooks/useBilling";
import { formatCurrency } from "../../utils/helpers";

const PAYMENT_METHODS = [
  { value: "Cash", label: "Cash", icon: Banknote },
  { value: "Card", label: "Credit/Debit Card", icon: CreditCard },
  { value: "UPI", label: "UPI (QR Code)", icon: QrCode },
  { value: "Insurance", label: "Insurance", icon: Building2 },
  { value: "Bank Transfer", label: "Bank Transfer", icon: ArrowRightLeft },
];

export default function PaymentDialog({ open, onOpenChange, invoice, onSuccess }) {
  const [method, setMethod] = useState("Cash");
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [upiReference, setUpiReference] = useState("");
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState("select"); // select | qr | confirm

  const { generateQR, isGeneratingQR, recordPayment, isRecordingPayment, useTransactions } = useBilling();
  const { data: transactions } = useTransactions(invoice?.id);

  const invoiceTotal = Number(invoice?.total || invoice?.amount || 0);
  const alreadyPaid = transactions?.reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;
  const dueAmount = Math.max(0, invoiceTotal - alreadyPaid);
  const [payAmount, setPayAmount] = useState("");

  useEffect(() => {
    if (open) {
      setMethod("Cash");
      setQrDataUrl(null);
      setUpiReference("");
      setNotes("");
      setStep("select");
      setPayAmount(String(dueAmount));
    }
  }, [open, dueAmount]);

  const handleGenerateQR = useCallback(async () => {
    setQrLoading(true);
    try {
      const amount = Number(payAmount) || dueAmount;
      const result = await generateQR({
        amount,
        invoice_id: invoice?.invoice_id || invoice?.id,
        patient_name: invoice?.patient_name || "",
      });
      if (result?.qr_data) {
        const dataUrl = await QRCode.toDataURL(result.qr_data, {
          width: 256,
          margin: 2,
          color: { dark: "#000", light: "#fff" },
        });
        setQrDataUrl(dataUrl);
        setStep("qr");
      }
    } catch {
      // error handled by mutation
    } finally {
      setQrLoading(false);
    }
  }, [generateQR, invoice, payAmount, dueAmount]);

  const handleCopyUpiLink = useCallback(() => {
    if (qrDataUrl) {
      // Extract UPI URL from the QR data stored in the generateQR result
      navigator.clipboard.writeText(qrDataUrl).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [qrDataUrl]);

  const handleConfirmPayment = useCallback(async () => {
    try {
      const amount = Number(payAmount) || dueAmount;
      await recordPayment({
        invoice_id: invoice?.id,
        amount,
        payment_method: method,
        upi_reference: method === "UPI" ? upiReference : undefined,
        notes,
      });
      setStep("confirm");
      if (onSuccess) onSuccess();
    } catch {
      // error handled by mutation
    }
  }, [recordPayment, invoice, method, payAmount, dueAmount, upiReference, notes, onSuccess]);

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {step === "confirm" ? "Payment Confirmed" : "Process Payment"}
          </DialogTitle>
        </DialogHeader>

        {step === "confirm" ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="rounded-full bg-emerald-100 p-4">
              <CheckCircle className="h-12 w-12 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Payment Recorded</h3>
            <p className="text-sm text-slate-500">
              Invoice {invoice?.invoice_id || invoice?.id} — {formatCurrency(Number(payAmount) || dueAmount)} via {method}
            </p>
          </div>
        ) : step === "qr" ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-slate-600">
                Scan QR code to pay <span className="font-semibold">{formatCurrency(Number(payAmount) || dueAmount)}</span>
              </p>
              {qrDataUrl && (
                <div className="rounded-lg border bg-white p-3">
                  <img src={qrDataUrl} alt="UPI QR Code" className="h-56 w-56" />
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyUpiLink}
                className="gap-2"
              >
                <Copy className="h-3 w-3" />
                {copied ? "Copied!" : "Copy UPI Link"}
              </Button>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">UPI Reference / Transaction ID</label>
              <Input
                placeholder="Enter UPI transaction reference..."
                value={upiReference}
                onChange={(e) => setUpiReference(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <Textarea
                placeholder="Optional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md bg-slate-50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice</span>
                <span className="font-medium">{invoice?.invoice_id || invoice?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Patient</span>
                <span className="font-medium">{invoice?.patient_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total</span>
                <span className="font-medium">{formatCurrency(invoiceTotal)}</span>
              </div>
              {alreadyPaid > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Already Paid</span>
                  <span className="font-medium text-emerald-600">{formatCurrency(alreadyPaid)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-slate-700 font-semibold">Amount Due</span>
                <span className="font-bold text-rose-600">{formatCurrency(dueAmount)}</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Payment Amount</label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                min={0}
                max={dueAmount}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Payment Method</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((pm) => {
                  const Icon = pm.icon;
                  return (
                    <button
                      key={pm.value}
                      type="button"
                      onClick={() => setMethod(pm.value)}
                      className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                        method === pm.value
                          ? "border-sky-500 bg-sky-50 text-sky-700"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {pm.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {method !== "UPI" && (
              <div>
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <Textarea
                  placeholder="Optional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "confirm" ? (
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={handleClose}>
              Done
            </Button>
          ) : step === "qr" ? (
            <>
              <Button variant="outline" onClick={() => setStep("select")}>
                Back
              </Button>
              <Button
                className="bg-sky-600 hover:bg-sky-700"
                onClick={handleConfirmPayment}
                disabled={isRecordingPayment}
              >
                {isRecordingPayment ? "Recording..." : "Confirm Payment"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              {method === "UPI" ? (
                <Button
                  className="bg-sky-600 hover:bg-sky-700"
                  onClick={handleGenerateQR}
                  disabled={isGeneratingQR || qrLoading}
                >
                  {isGeneratingQR || qrLoading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" /> Generating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <QrCode className="h-4 w-4" /> Generate QR Code
                    </span>
                  )}
                </Button>
              ) : (
                <Button
                  className="bg-sky-600 hover:bg-sky-700"
                  onClick={handleConfirmPayment}
                  disabled={isRecordingPayment}
                >
                  {isRecordingPayment ? "Processing..." : "Record Payment"}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
