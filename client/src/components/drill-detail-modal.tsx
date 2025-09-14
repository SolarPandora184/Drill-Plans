import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, ChevronLeft, ChevronRight, Copy, Download, Edit, Eye, FileText, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { DrillPlan, DrillCommand, DrillPlanFile, DrillPlanNote } from "@shared/firebase-schema";

interface DrillDetailModalProps {
  drillPlanId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DrillDetailModal({ drillPlanId, open, onOpenChange }: DrillDetailModalProps) {
  const [newNote, setNewNote] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [duplicateDate, setDuplicateDate] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: drillPlan, isLoading } = useQuery<DrillPlan & { 
    command: DrillCommand; 
    files: DrillPlanFile[]; 
    notes: DrillPlanNote[] 
  }>({
    queryKey: ['/api/drill-plans', drillPlanId],
    enabled: !!drillPlanId && open,
  });

  // Fetch command files automatically when drill plan is loaded
  const { data: commandFiles = [] } = useQuery<DrillPlanFile[]>({
    queryKey: ['/api/commands', drillPlan?.command.id, 'files'],
    queryFn: async () => {
      if (!drillPlan?.command.id) return [];
      const response = await fetch(`/api/commands/${drillPlan.command.id}`);
      const commandData = await response.json();
      return commandData.files || [];
    },
    enabled: !!drillPlan?.command.id && open,
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!newNote.trim() || !authorName.trim()) return;
      
      return apiRequest('POST', `/api/drill-plans/${drillPlanId}/notes`, {
        content: newNote,
        authorName: authorName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drill-plans', drillPlanId] });
      setNewNote('');
      setAuthorName('');
      toast({ title: "Success", description: "Note added successfully" });
    },
  });

  const duplicatePlanMutation = useMutation({
    mutationFn: async () => {
      if (!duplicateDate) return;
      
      return apiRequest('POST', `/api/drill-plans/${drillPlanId}/duplicate`, {
        date: duplicateDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drill-plans'] });
      setDuplicateDate('');
      toast({ title: "Success", description: "Drill plan duplicated successfully" });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/drill-plans/${drillPlanId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drill-plans'] });
      onOpenChange(false);
      toast({ title: "Success", description: "Drill plan deleted successfully" });
    },
  });

  const handleFileDownload = async (fileId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}/download`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({ 
        title: "Success", 
        description: `Downloaded ${fileName}` 
      });
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to download file",
        variant: "destructive" 
      });
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading Drill Plan</DialogTitle>
            <DialogDescription>Please wait while we load the drill plan details</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center h-32" data-testid="loading-drill-detail">
            <div className="text-muted-foreground">Loading drill plan details...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!drillPlan) {
    return null;
  }

  const getFlightBadgeVariant = (flight: string) => {
    switch (flight) {
      case 'alpha': return 'default';
      case 'tango': return 'secondary';
      case 'both': return 'outline';
      default: return 'default';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl" data-testid="text-drill-plan-title">
                {drillPlan.command.name}
              </DialogTitle>
              <DialogDescription>
                Drill plan details for {format(new Date(drillPlan.date), 'MMMM d, yyyy')}
              </DialogDescription>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  {format(new Date(drillPlan.date), 'MMMM d, yyyy')}
                </span>
                <Badge variant={getFlightBadgeVariant(drillPlan.flightAssignment)}>
                  {drillPlan.flightAssignment === 'alpha' ? 'Alpha Flight' :
                   drillPlan.flightAssignment === 'tango' ? 'Tango Flight' : 'Both Flights'}
                </Badge>
                <Badge variant="outline">
                  {drillPlan.eventType === 'drill' ? 'Drill Movement' : 'Class'}
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                data-testid="button-edit-plan"
              >
                <Edit className="mr-1 h-4 w-4" />
                Edit
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Command History */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-foreground">Command History</h4>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  data-testid="button-previous-command"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  data-testid="button-next-command"
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>Command: {drillPlan.command.name}</div>
              <div>Type: {drillPlan.command.type}</div>
              {drillPlan.command.metadata && (
                <div>Description: {drillPlan.command.metadata}</div>
              )}
            </div>
          </div>

          {/* Associated Documents from Command */}
          {commandFiles.length > 0 && (
            <div>
              <h4 className="font-medium text-foreground mb-3">Associated Documents</h4>
              <div className="space-y-2">
                {commandFiles.map((file) => (
                  <div 
                    key={file.id} 
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    data-testid={`command-file-item-${file.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium text-foreground">{file.fileName}</div>
                        <div className="text-xs text-muted-foreground">
                          Command Document • {(file.fileSize / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        data-testid={`button-preview-command-file-${file.id}`}
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleFileDownload(file.id, file.fileName)}
                        data-testid={`button-download-command-file-${file.id}`}
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duplicate Section */}
          <div className="bg-muted rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-3">Duplicate Plan</h4>
            <div className="flex items-center space-x-2">
              <Label htmlFor="duplicateDate" className="text-sm">New Date:</Label>
              <Input
                id="duplicateDate"
                type="date"
                value={duplicateDate}
                onChange={(e) => setDuplicateDate(e.target.value)}
                className="w-auto"
                data-testid="input-duplicate-date"
              />
              <Button 
                onClick={() => duplicatePlanMutation.mutate()}
                disabled={!duplicateDate || duplicatePlanMutation.isPending}
                size="sm"
                data-testid="button-duplicate-plan"
              >
                <Copy className="mr-1 h-4 w-4" />
                Duplicate
              </Button>
            </div>
          </div>

          {/* Files */}
          {drillPlan.files.length > 0 && (
            <div>
              <h4 className="font-medium text-foreground mb-3">Uploaded Files</h4>
              <div className="space-y-2">
                {drillPlan.files.map((file) => (
                  <div 
                    key={file.id} 
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    data-testid={`file-item-${file.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium text-foreground">{file.fileName}</div>
                        <div className="text-xs text-muted-foreground">
                          {(file.fileSize / 1024).toFixed(1)} KB • {format(new Date(file.uploadedAt), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        data-testid={`button-preview-file-${file.id}`}
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleFileDownload(file.id, file.fileName)}
                        data-testid={`button-download-file-${file.id}`}
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <h4 className="font-medium text-foreground mb-3">Notes History</h4>
            <div className="space-y-3">
              {drillPlan.notes.map((note) => (
                <div 
                  key={note.id} 
                  className="border border-border rounded-lg p-4"
                  data-testid={`note-item-${note.id}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-medium text-foreground">{note.authorName}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(note.createdAt), 'MMM d, yyyy • h:mm a')}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{note.content}</p>
                </div>
              ))}

              {drillPlan.notes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No notes yet. Add the first note below.
                </div>
              )}
            </div>

            {/* Add New Note */}
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <Label className="block text-sm font-medium text-foreground mb-2">Add New Note</Label>
              <div className="space-y-3">
                <Input
                  placeholder="Your name"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  data-testid="input-note-author"
                />
                <Textarea
                  placeholder="Add a new note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                  data-testid="textarea-new-note"
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={() => addNoteMutation.mutate()}
                    disabled={!newNote.trim() || !authorName.trim() || addNoteMutation.isPending}
                    size="sm"
                    data-testid="button-add-note"
                  >
                    {addNoteMutation.isPending ? 'Adding...' : 'Add Note'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-between items-center pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="button-close-detail"
            >
              Close
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deletePlanMutation.mutate()}
              disabled={deletePlanMutation.isPending}
              data-testid="button-delete-plan"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              {deletePlanMutation.isPending ? 'Deleting...' : 'Delete Plan'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
