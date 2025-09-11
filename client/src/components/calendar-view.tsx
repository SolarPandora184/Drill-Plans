import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore } from "date-fns";
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
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getPlansForDay = (day: Date) => {
    return drillPlans.filter(plan => isSameDay(new Date(plan.date), day));
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

        {/* Calendar Grid */}
        <div className="calendar-grid rounded-lg overflow-hidden">
          {/* Header Days */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="bg-muted p-3 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {days.map((day) => {
            const dayPlans = getPlansForDay(day);
            
            return (
              <div
                key={day.toISOString()}
                className="calendar-day p-2"
                data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
              >
                <div className="text-sm text-muted-foreground mb-1">
                  {format(day, 'd')}
                </div>
                
                {dayPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={cn(
                      "drill-event cursor-pointer text-xs p-1 mb-1 rounded",
                      getFlightClass(plan.flightAssignment),
                      isPastEvent(new Date(plan.date)) ? "past-event" : "upcoming-event"
                    )}
                    onClick={() => onPlanClick(plan.id)}
                    data-testid={`drill-event-${plan.id}`}
                  >
                    <div className="font-medium">{plan.command.name}</div>
                    <div className="text-xs">
                      {plan.flightAssignment === 'alpha' ? 'Alpha' : 
                       plan.flightAssignment === 'tango' ? 'Tango' : 'Both'} • {plan.eventType}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
