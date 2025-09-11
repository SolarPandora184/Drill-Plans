import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Download, Plus } from "lucide-react";
import CalendarView from "@/components/calendar-view";
import DrillPlanModal from "@/components/drill-plan-modal";
import CommandModal from "@/components/command-modal";
import DrillDetailModal from "@/components/drill-detail-modal";
import { useQuery } from "@tanstack/react-query";
import type { DrillPlan, DrillCommand } from "@shared/schema";

interface CommandWithHistory extends DrillCommand {
  lastAlphaExecution?: string | null;
  lastTangoExecution?: string | null;
}

export default function Dashboard() {
  const [showDrillPlanModal, setShowDrillPlanModal] = useState(false);
  const [showCommandModal, setShowCommandModal] = useState(false);
  const [selectedDrillPlan, setSelectedDrillPlan] = useState<string | null>(null);

  const { data: drillPlans = [], isLoading: plansLoading } = useQuery<(DrillPlan & { command: DrillCommand })[]>({
    queryKey: ["/api/drill-plans"],
  });

  const { data: commands = [] } = useQuery<CommandWithHistory[]>({
    queryKey: ["/api/commands"],
  });

  const handleExportToExcel = async () => {
    try {
      const response = await fetch("/api/export/excel");
      const data = await response.json();
      
      // Create CSV content for download
      const csvContent = Object.entries(data)
        .map(([sheet, plans]) => {
          const planArray = plans as any[];
          const headers = Object.keys(planArray[0] || {});
          const rows = planArray.map(plan => headers.map(h => plan[h]).join(','));
          return `${sheet}\n${headers.join(',')}\n${rows.join('\n')}`;
        })
        .join('\n\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'drill-plans-export.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Calendar className="h-6 w-6 text-primary" data-testid="icon-calendar" />
              <h1 className="text-xl font-semibold text-foreground" data-testid="text-app-title">
                Drill Plan Management
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="secondary" 
                onClick={handleExportToExcel}
                data-testid="button-export"
              >
                <Download className="mr-2 h-4 w-4" />
                Export to Excel
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCommandModal(true)}
                data-testid="button-new-command"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Command
              </Button>
              <Button 
                onClick={() => setShowDrillPlanModal(true)}
                data-testid="button-new-drill-plan"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Drill Plan
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {plansLoading ? (
          <div className="flex items-center justify-center h-64" data-testid="loading-state">
            <div className="text-muted-foreground">Loading calendar...</div>
          </div>
        ) : (
          <CalendarView 
            drillPlans={drillPlans} 
            onPlanClick={setSelectedDrillPlan}
            data-testid="calendar-view"
          />
        )}
      </main>

      {/* Modals */}
      <DrillPlanModal
        open={showDrillPlanModal}
        onOpenChange={setShowDrillPlanModal}
        commands={commands}
      />

      <CommandModal
        open={showCommandModal}
        onOpenChange={setShowCommandModal}
      />

      {selectedDrillPlan && (
        <DrillDetailModal
          drillPlanId={selectedDrillPlan}
          open={!!selectedDrillPlan}
          onOpenChange={() => setSelectedDrillPlan(null)}
        />
      )}
    </div>
  );
}
