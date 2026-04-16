import React, { useState } from "react";
import { Mail, MessageSquare, Bell, Send, Copy, Eye } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const NOTIFICATION_TYPES = {
  APPOINTMENT_BOOKED: "Appointment Booked",
  APPOINTMENT_REMINDER: "Appointment Reminder", 
  APPOINTMENT_CANCELLED: "Appointment Cancelled",
  APPOINTMENT_COMPLETED: "Appointment Completed",
  PRESCRIPTION_READY: "Prescription Ready",
  LAB_RESULTS: "Lab Results Available",
  PAYMENT_DUE: "Payment Due",
  PAYMENT_CONFIRMED: "Payment Confirmed",
  ADMISSION_CONFIRMED: "Admission Confirmed",
  DISCHARGE_SUMMARY: "Discharge Summary",
};

const TEMPLATES = {
  [NOTIFICATION_TYPES.APPOINTMENT_BOOKED]: {
    sms: `Dear {{patientName}}, your appointment with Dr. {{doctorName}} is confirmed for {{appointmentDate}} at {{appointmentTime}}. Please arrive 15 minutes early. Reply CANCEL to reschedule.`,
    email: {
      subject: "Appointment Confirmation - {{appointmentDate}}",
      body: `Dear {{patientName}},

This is to confirm your appointment:

📅 Date: {{appointmentDate}}
⏰ Time: {{appointmentTime}}
👨‍⚕️ Doctor: Dr. {{doctorName}}
🏥 Department: {{department}}
📍 Location: {{hospitalName}}, {{address}}

Important Information:
• Please arrive 15 minutes before your appointment
• Bring your ID and insurance card
• Bring any previous medical records
• Take your regular medications as prescribed

If you need to reschedule or cancel, please call us at {{phoneNumber}} or reply CANCEL to this message.

We look forward to seeing you!

Best regards,
{{hospitalName}} Team`,
    },
  },
  [NOTIFICATION_TYPES.APPOINTMENT_REMINDER]: {
    sms: `Reminder: Your appointment with Dr. {{doctorName}} is tomorrow at {{appointmentTime}}. {{hospitalName}} - {{phoneNumber}}`,
    email: {
      subject: "Appointment Reminder - Tomorrow at {{appointmentTime}}",
      body: `Dear {{patientName}},

This is a friendly reminder about your appointment tomorrow:

📅 Date: {{appointmentDate}}
⏰ Time: {{appointmentTime}}
👨‍⚕️ Doctor: Dr. {{doctorName}}
🏥 Department: {{department}}

Please remember:
• Arrive 15 minutes early
• Bring your insurance card and ID
• Bring list of current medications
• Write down any questions you may have

If you need to reschedule, please call {{phoneNumber}}.

See you tomorrow!

{{hospitalName}} Team`,
    },
  },
  [NOTIFICATION_TYPES.APPOINTMENT_CANCELLED]: {
    sms: `Your appointment with Dr. {{doctorName}} on {{appointmentDate}} has been cancelled. We apologize for any inconvenience. To reschedule, call {{phoneNumber}}.`,
    email: {
      subject: "Appointment Cancelled - {{appointmentDate}}",
      body: `Dear {{patientName}},

Your appointment scheduled for {{appointmentDate}} at {{appointmentTime}} with Dr. {{doctorName}} has been cancelled.

If you did not request this cancellation, please contact us immediately at {{phoneNumber}}.

To reschedule your appointment:
• Call us at {{phoneNumber}}
• Visit our website: {{website}}
• Use our patient portal

We apologize for any inconvenience and look forward to assisting you with a new appointment.

Best regards,
{{hospitalName}} Team`,
    },
  },
  [NOTIFICATION_TYPES.PRESCRIPTION_READY]: {
    sms: `Your prescription is ready for pickup at {{hospitalName}} pharmacy. Hours: {{pharmacyHours}}. Bring ID and insurance card.`,
    email: {
      subject: "Prescription Ready for Pickup",
      body: `Dear {{patientName}},

Good news! Your prescription is ready for pickup:

🏥 Pharmacy: {{hospitalName}} Pharmacy
📍 Address: {{address}}
⏰ Hours: {{pharmacyHours}}
💊 Prescription: {{prescriptionDetails}}

What to bring:
• Valid photo ID
• Insurance card
• Payment method (if applicable)

If you have any questions about your medication, our pharmacists are here to help:
📞 Phone: {{phoneNumber}}
💬 Email: {{pharmacyEmail}}

Important: Please pick up your prescription within {{pickupDays}} days.

{{hospitalName}} Pharmacy Team`,
    },
  },
  [NOTIFICATION_TYPES.LAB_RESULTS]: {
    sms: `Your lab results are ready. Log in to patient portal or call {{phoneNumber}} to discuss with Dr. {{doctorName}}.`,
    email: {
      subject: "Lab Results Available",
      body: `Dear {{patientName},

Your lab results from {{testDate}} are now available.

📋 Test(s): {{testNames}}
👨‍⚕️ Ordering Doctor: Dr. {{doctorName}}
📅 Test Date: {{testDate}}

How to access your results:
• Log in to patient portal: {{portalUrl}}
• Call our office: {{phoneNumber}}
• Visit us in person

Important Notes:
• Some results may require follow-up with your doctor
• Contact us if you have any questions
• Keep your results for your records

If you need assistance accessing your results, please don't hesitate to contact us.

Best regards,
{{hospitalName}} Medical Team`,
    },
  },
};

export default function NotificationTemplates() {
  const [selectedType, setSelectedType] = useState(NOTIFICATION_TYPES.APPOINTMENT_BOOKED);
  const [activeTab, setActiveTab] = useState("sms");
  const [variables, setVariables] = useState({
    patientName: "John Doe",
    doctorName: "Dr. Smith",
    appointmentDate: "Dec 15, 2024",
    appointmentTime: "10:30 AM",
    department: "General Medicine",
    hospitalName: "Medicare Hospital",
    address: "123 Medical Center Dr, City, State 12345",
    phoneNumber: "(555) 123-4567",
    website: "www.medicarehospital.com",
    pharmacyHours: "8:00 AM - 8:00 PM",
    prescriptionDetails: "Amoxicillin 500mg - 30 tablets",
    pickupDays: "7",
    testNames: "Blood Count, Basic Metabolic Panel",
    testDate: "Dec 10, 2024",
    portalUrl: "portal.medicarehospital.com",
    pharmacyEmail: "pharmacy@medicarehospital.com",
  });

  const currentTemplate = TEMPLATES[selectedType];
  const previewText = activeTab === "sms" 
    ? currentTemplate?.sms || ""
    : currentTemplate?.email?.body || "";

  const replaceVariables = (text) => {
    let replaced = text;
    Object.entries(variables).forEach(([key, value]) => {
      replaced = replaced.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return replaced;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const sendTestNotification = () => {
    // This would integrate with your notification service
    console.log("Sending test notification:", {
      type: selectedType,
      channel: activeTab,
      content: replaceVariables(previewText),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-sky-600" />
        <h3 className="text-lg font-semibold text-slate-900">Notification Templates</h3>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Template Selection */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-700">Select Template</h4>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(NOTIFICATION_TYPES).map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-700">Variables</h4>
            {Object.entries(variables).map(([key, value]) => (
              <div key={key}>
                <label className="text-xs font-medium text-slate-600 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </label>
                <Input
                  value={value}
                  onChange={(e) => setVariables({ ...variables, [key]: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Template Editor */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sms" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                SMS Template
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Template
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sms" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-900">
                    SMS Template
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={currentTemplate?.sms || ""}
                    onChange={(e) => {
                      // Update template logic here
                    }}
                    className="min-h-[100px]"
                    placeholder="Enter SMS template..."
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <Badge variant="secondary">
                      {replaceVariables(currentTemplate?.sms || "").length}/160 characters
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(replaceVariables(currentTemplate?.sms || ""))}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-900">
                    Email Subject
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    value={currentTemplate?.email?.subject || ""}
                    onChange={(e) => {
                      // Update template logic here
                    }}
                    placeholder="Enter email subject..."
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-900">
                    Email Body
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={currentTemplate?.email?.body || ""}
                    onChange={(e) => {
                      // Update template logic here
                    }}
                    className="min-h-[200px]"
                    placeholder="Enter email body..."
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(replaceVariables(currentTemplate?.email?.body || ""))}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                    <Button size="sm" onClick={sendTestNotification}>
                      <Send className="mr-2 h-4 w-4" />
                      Send Test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-900 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-slate-50 p-4">
                <div className="text-sm text-slate-700 whitespace-pre-wrap">
                  {replaceVariables(previewText)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
