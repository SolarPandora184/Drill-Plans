import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, getDay, addDays } from "date-fns";
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

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getTuesdaysInMonth = (monthStart: Date, monthEnd: Date) => {
    const tuesdays: Date[] = [];
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Find all Tuesdays (getDay() returns 2 for Tuesday)
    allDays.forEach(day => {
      if (getDay(day) === 2) {
        tuesdays.push(day);
      }
    });
    
    return tuesdays;
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

        {/* Tuesday Calendar */}
        <div className="space-y-4">
          {getTuesdaysInMonth(monthStart, monthEnd).map((tuesday, index) => {
            const dayPlans = getPlansForDay(tuesday);
            const ordinalNumbers = ['1st', '2nd', '3rd', '4th', '5th'];
            
            return (
              <Card key={tuesday.toISOString()} className="bg-muted/30 border border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {ordinalNumbers[index]} Tuesday
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {format(tuesday, 'MMMM d, yyyy')}
                      </p>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium",
                      isPastEvent(tuesday) 
                        ? "bg-gray-200 text-gray-600" 
                        : "bg-blue-100 text-blue-700"
                    )}>
                      {isPastEvent(tuesday) ? 'Past' : 'Upcoming'}
                    </div>
                  </div>
                  
                  {dayPlans.length > 0 ? (
                    <div className="space-y-2">
                      {dayPlans.map((plan) => (
                        <div
                          key={plan.id}
                          className={cn(
                            "drill-event cursor-pointer p-3 rounded-lg border transition-colors hover:bg-background",
                            getFlightClass(plan.flightAssignment),
                            isPastEvent(new Date(plan.date)) ? "past-event" : "upcoming-event"
                          )}
                          onClick={() => onPlanClick(plan.id)}
                          data-testid={`drill-event-${plan.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-foreground">{plan.command.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {plan.flightAssignment === 'alpha' ? 'Alpha Flight' : 
                                 plan.flightAssignment === 'tango' ? 'Tango Flight' : 'Both Flights'} • {plan.eventType === 'drill' ? 'Drill Movement' : 'Class'}
                              </div>
                            </div>
                            <div className={cn(
                              "px-2 py-1 rounded text-xs font-medium",
                              plan.flightAssignment === 'alpha' 
                                ? "bg-blue-100 text-blue-700" 
                                : plan.flightAssignment === 'tango'
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700"
                            )}>
                              {plan.flightAssignment === 'alpha' ? 'Alpha' : 
                               plan.flightAssignment === 'tango' ? 'Tango' : 'Both'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      No drill plans scheduled for this Tuesday
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          
          {getTuesdaysInMonth(monthStart, monthEnd).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No Tuesdays found in this month
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
