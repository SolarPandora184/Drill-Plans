import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, getDay, startOfWeek, endOfWeek, addDays } from "date-fns";
import type { DrillPlan, DrillCommand } from "@shared/schema";
import { cn } from "@/lib/utils";

interface CalendarViewProps {
  drillPlans: (DrillPlan & { command: DrillCommand })[];
  onPlanClick: (planId: string) => void;
}

export default function CalendarView({ drillPlans, onPlanClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getPlansForDay = (day: Date) => {
    return drillPlans.filter(plan => isSameDay(new Date(plan.date), day));
  };

  const isCurrentMonth = (day: Date) => {
    return day.getMonth() === currentDate.getMonth();
  };

  const getFlightClass = (flightAssignment: string) => {
    switch (flightAssignment) {
      case 'alpha':
        return 'alpha-flight';
      case 'tango':
        return 'tango-flight';
      case 'both':
        return 'both-flights';
      default:
        return '';
    }
  };

  const isPastEvent = (date: Date) => {
    return isBefore(date, new Date());
  };

  return (
    <Card className="bg-card rounded-lg shadow-sm border border-border">
      <CardContent className="p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goToPreviousMonth}
              data-testid="button-previous-month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-semibold text-foreground" data-testid="text-current-month">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goToNextMonth}
              data-testid="button-next-month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Legend */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-3 h-3 bg-blue-200 rounded" data-testid="legend-alpha"></div>
              <span className="text-muted-foreground">Alpha Flight</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-3 h-3 bg-amber-200 rounded" data-testid="legend-tango"></div>
              <span className="text-muted-foreground">Tango Flight</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-3 h-3 bg-green-200 rounded" data-testid="legend-both"></div>
              <span className="text-muted-foreground">Both Flights</span>
            </div>
          </div>
        </div>

        {/* Horizontal Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {/* Header Days */}
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
            <div key={day} className="bg-muted p-4 text-center font-medium text-foreground border-b border-border">
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {days.map((day) => {
            const dayPlans = getPlansForDay(day);
            
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[120px] p-2 bg-background border-r border-b border-border",
                  !isCurrentMonth(day) && "bg-muted/30 text-muted-foreground"
                )}
                data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
              >
                <div className={cn(
                  "text-sm font-medium mb-2",
                  !isCurrentMonth(day) && "text-muted-foreground"
                )}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1">
                  {dayPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className={cn(
                        "drill-event cursor-pointer text-xs p-2 rounded border transition-colors hover:shadow-sm",
                        plan.flightAssignment === 'alpha' 
                          ? "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100" 
                          : plan.flightAssignment === 'tango'
                          ? "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
                          : "bg-green-50 border-green-200 text-green-800 hover:bg-green-100",
                        isPastEvent(new Date(plan.date)) && "opacity-60"
                      )}
                      onClick={() => onPlanClick(plan.id)}
                      data-testid={`drill-event-${plan.id}`}
                    >
                      <div className="font-medium truncate" title={plan.command.name}>
                        {plan.command.name}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs">
                          {plan.flightAssignment === 'alpha' ? 'Alpha' : 
                           plan.flightAssignment === 'tango' ? 'Tango' : 'Both'}
                        </span>
                        <span className={cn(
                          "px-1 py-0.5 rounded text-xs",
                          plan.eventType === 'drill' 
                            ? "bg-white/50" 
                            : "bg-white/70 font-medium"
                        )}>
                          {plan.eventType === 'drill' ? 'Drill' : 'Class'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
