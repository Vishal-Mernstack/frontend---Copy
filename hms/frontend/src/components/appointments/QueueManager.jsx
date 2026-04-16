import React, { useState, useMemo } from "react";
import { format, addMinutes, differenceInMinutes, isBefore, isAfter } from "date-fns";
import { Clock, Users, AlertCircle, CheckCircle, Calendar, User, Stethoscope } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";

const QUEUE_STATUS = {
  WAITING: "Waiting",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  NO_SHOW: "No Show",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS = {
  [QUEUE_STATUS.WAITING]: "bg-amber-100 text-amber-800 border-amber-200",
  [QUEUE_STATUS.IN_PROGRESS]: "bg-blue-100 text-blue-800 border-blue-200",
  [QUEUE_STATUS.COMPLETED]: "bg-green-100 text-green-800 border-green-200",
  [QUEUE_STATUS.NO_SHOW]: "bg-red-100 text-red-800 border-red-200",
  [QUEUE_STATUS.CANCELLED]: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function QueueManager({ appointments = [], onUpdateAppointment }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const queueData = useMemo(() => {
    const todayAppointments = appointments.filter(appt => {
      const apptDate = new Date(appt.appointment_date);
      return apptDate.toDateString() === selectedDate.toDateString();
    });

    const sortedAppointments = todayAppointments.sort((a, b) => 
      new Date(a.appointment_date) - new Date(b.appointment_date)
    );

    const queue = sortedAppointments.map((appt, index) => {
      const now = new Date();
      const apptTime = new Date(appt.appointment_date);
      const waitTime = differenceInMinutes(now, apptTime);
      const status = appt.status === 'Scheduled' && isBefore(apptTime, now) 
        ? QUEUE_STATUS.IN_PROGRESS 
        : appt.status === 'Scheduled' 
        ? QUEUE_STATUS.WAITING 
        : appt.status === 'Completed'
        ? QUEUE_STATUS.COMPLETED
        : appt.status === 'Cancelled'
        ? QUEUE_STATUS.CANCELLED
        : QUEUE_STATUS.NO_SHOW;

      return {
        ...appt,
        queuePosition: index + 1,
        status,
        waitTime: Math.max(0, waitTime),
        estimatedTime: index > 0 
          ? addMinutes(new Date(sortedAppointments[index - 1].appointment_date), 30)
          : apptTime,
      };
    });

    const stats = {
      total: queue.length,
      waiting: queue.filter(q => q.status === QUEUE_STATUS.WAITING).length,
      inProgress: queue.filter(q => q.status === QUEUE_STATUS.IN_PROGRESS).length,
      completed: queue.filter(q => q.status === QUEUE_STATUS.COMPLETED).length,
      noShow: queue.filter(q => q.status === QUEUE_STATUS.NO_SHOW).length,
    };

    return { queue, stats };
  }, [appointments, selectedDate]);

  const handleStatusUpdate = (appointmentId, newStatus) => {
    onUpdateAppointment(appointmentId, { status: newStatus });
  };

  const handleCallNext = () => {
    const nextPatient = queueData.queue.find(q => q.status === QUEUE_STATUS.WAITING);
    if (nextPatient) {
      handleStatusUpdate(nextPatient.id, QUEUE_STATUS.IN_PROGRESS);
    }
  };

  const handleComplete = (appointmentId) => {
    handleStatusUpdate(appointmentId, QUEUE_STATUS.COMPLETED);
  };

  const averageWaitTime = useMemo(() => {
    const waitingPatients = queueData.queue.filter(q => q.status === QUEUE_STATUS.WAITING);
    if (waitingPatients.length === 0) return 0;
    const totalWait = waitingPatients.reduce((sum, p) => sum + p.waitTime, 0);
    return Math.round(totalWait / waitingPatients.length);
  }, [queueData.queue]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-sky-600" />
          <h3 className="text-lg font-semibold text-slate-900">Queue Management</h3>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-600">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </span>
        </div>
      </div>

      {/* Queue Statistics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-sky-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{queueData.stats.total}</p>
                <p className="text-xs text-slate-500">Total Patients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{queueData.stats.waiting}</p>
                <p className="text-xs text-slate-500">Waiting</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{queueData.stats.inProgress}</p>
                <p className="text-xs text-slate-500">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{queueData.stats.completed}</p>
                <p className="text-xs text-slate-500">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{averageWaitTime}m</p>
                <p className="text-xs text-slate-500">Avg Wait Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Actions */}
      <div className="flex gap-2">
        <Button onClick={handleCallNext} disabled={queueData.stats.waiting === 0}>
          Call Next Patient
        </Button>
        <Button variant="outline" onClick={() => setSelectedDate(new Date())}>
          Today's Queue
        </Button>
      </div>

      {/* Queue List */}
      <div className="space-y-3">
        {queueData.queue.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">No patients in queue</h3>
              <p className="mt-2 text-sm text-slate-500">
                No appointments scheduled for {format(selectedDate, 'MMMM d, yyyy')}
              </p>
            </CardContent>
          </Card>
        ) : (
          queueData.queue.map((appointment) => (
            <Card key={appointment.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-sky-100 text-sky-700 font-bold text-lg">
                      {appointment.queuePosition}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-500" />
                        <span className="font-medium text-slate-900">
                          {appointment.patient_name || appointment.patient}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-slate-500" />
                        <span className="text-sm text-slate-600">
                          Dr. {appointment.doctor_name || appointment.doctor}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-500" />
                        <span className="text-sm text-slate-600">
                          {format(new Date(appointment.appointment_date), 'h:mm a')}
                        </span>
                        {appointment.waitTime > 0 && (
                          <span className="text-xs text-amber-600">
                            (+{appointment.waitTime}m wait)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right space-y-1">
                      <Badge className={STATUS_COLORS[appointment.status]}>
                        {appointment.status}
                      </Badge>
                      {appointment.status === QUEUE_STATUS.WAITING && (
                        <p className="text-xs text-slate-500">
                          Est. {format(appointment.estimatedTime, 'h:mm a')}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-1">
                      {appointment.status === QUEUE_STATUS.WAITING && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(appointment.id, QUEUE_STATUS.IN_PROGRESS)}
                        >
                          Start
                        </Button>
                      )}
                      {appointment.status === QUEUE_STATUS.IN_PROGRESS && (
                        <Button
                          size="sm"
                          onClick={() => handleComplete(appointment.id)}
                        >
                          Complete
                        </Button>
                      )}
                      {appointment.status === QUEUE_STATUS.WAITING && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(appointment.id, QUEUE_STATUS.NO_SHOW)}
                        >
                          No Show
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
