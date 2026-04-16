import React, { useState, useMemo } from "react";
import { format, addMinutes, isBefore, isAfter, startOfDay, endOfDay } from "date-fns";
import { Clock, Plus, Trash2, Users } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const DEFAULT_SLOTS = [
  { start: "09:00", end: "09:30", duration: 30 },
  { start: "09:30", end: "10:00", duration: 30 },
  { start: "10:00", end: "10:30", duration: 30 },
  { start: "10:30", end: "11:00", duration: 30 },
  { start: "11:00", end: "11:30", duration: 30 },
  { start: "11:30", end: "12:00", duration: 30 },
  { start: "14:00", end: "14:30", duration: 30 },
  { start: "14:30", end: "15:00", duration: 30 },
  { start: "15:00", end: "15:30", duration: 30 },
  { start: "15:30", end: "16:00", duration: 30 },
  { start: "16:00", end: "16:30", duration: 30 },
  { start: "16:30", end: "17:00", duration: 30 },
];

export default function SlotManager({ doctorId, existingSlots = [], onSlotsChange }) {
  const [slots, setSlots] = useState(existingSlots.length > 0 ? existingSlots : DEFAULT_SLOTS);
  const [newSlot, setNewSlot] = useState({ start: "", end: "", duration: 30 });
  const [isAddingSlot, setIsAddingSlot] = useState(false);

  const availableSlots = useMemo(() => {
    const today = new Date();
    return slots.map((slot, index) => {
      const startTime = new Date(`${format(today, 'yyyy-MM-dd')}T${slot.start}`);
      const endTime = new Date(`${format(today, 'yyyy-MM-dd')}T${slot.end}`);
      
      return {
        ...slot,
        index,
        startTime,
        endTime,
        isAvailable: isAfter(startTime, new Date()) || format(startTime, 'HH:mm') > format(new Date(), 'HH:mm'),
        timeRange: `${slot.start} - ${slot.end}`,
      };
    });
  }, [slots]);

  const handleAddSlot = () => {
    if (newSlot.start && newSlot.end) {
      const slotToAdd = {
        start: newSlot.start,
        end: newSlot.end,
        duration: newSlot.duration,
      };
      
      const updatedSlots = [...slots, slotToAdd].sort((a, b) => a.start.localeCompare(b.start));
      setSlots(updatedSlots);
      onSlotsChange(updatedSlots);
      
      setNewSlot({ start: "", end: "", duration: 30 });
      setIsAddingSlot(false);
    }
  };

  const handleDeleteSlot = (indexToDelete) => {
    const updatedSlots = slots.filter((_, index) => index !== indexToDelete);
    setSlots(updatedSlots);
    onSlotsChange(updatedSlots);
  };

  const handleGenerateDefaultSlots = () => {
    setSlots(DEFAULT_SLOTS);
    onSlotsChange(DEFAULT_SLOTS);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-sky-600" />
          <h3 className="text-lg font-semibold text-slate-900">Time Slot Management</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerateDefaultSlots}>
            Reset to Default
          </Button>
          <Button onClick={() => setIsAddingSlot(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Slot
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {availableSlots.map((slot) => (
          <Card key={slot.index} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-900">
                  {slot.timeRange}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={slot.isAvailable ? "secondary" : "outline"}>
                    {slot.isAvailable ? "Available" : "Past"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSlot(slot.index)}
                    className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="h-4 w-4" />
                  <span>{slot.duration} minutes</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users className="h-4 w-4" />
                  <span>Max 1 patient</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isAddingSlot && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-900">
              Add New Time Slot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Start Time</label>
                <Input
                  type="time"
                  value={newSlot.start}
                  onChange={(e) => setNewSlot({ ...newSlot, start: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">End Time</label>
                <Input
                  type="time"
                  value={newSlot.end}
                  onChange={(e) => setNewSlot({ ...newSlot, end: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Duration (min)</label>
                <Select
                  value={String(newSlot.duration)}
                  onValueChange={(value) => setNewSlot({ ...newSlot, duration: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="45">45</SelectItem>
                    <SelectItem value="60">60</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleAddSlot} className="flex-1">
                  Add Slot
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingSlot(false);
                    setNewSlot({ start: "", end: "", duration: 30 });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
