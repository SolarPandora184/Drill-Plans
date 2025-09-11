import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Upload, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDrillPlanSchema } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DrillCommand } from "@shared/schema";

interface CommandWithHistory extends DrillCommand {
  lastAlphaExecution?: string | null;
  lastTangoExecution?: string | null;
}
import { z } from "zod";

const formSchema = insertDrillPlanSchema.extend({
  notes: z.string().optional(),
  authorName: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DrillPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: CommandWithHistory[];
}

export default function DrillPlanModal({ open, onOpenChange, commands }: DrillPlanModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      flightAssignment: undefined,
      commandId: '',
      eventType: undefined,
      notes: '',
      authorName: '',
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const formData = new FormData();
      formData.append('date', data.date.toISOString());
      formData.append('flightAssignment', data.flightAssignment);
      formData.append('commandId', data.commandId);
      formData.append('eventType', data.eventType);

      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/drill-plans', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to create drill plan');
      }

      const plan = await response.json();

      // Add note if provided
      if (data.notes && data.authorName) {
        await apiRequest('POST', `/api/drill-plans/${plan.id}/notes`, {
          content: data.notes,
          authorName: data.authorName,
        });
      }

      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drill-plans'] });
      toast({ title: "Success", description: "Drill plan created successfully" });
      onOpenChange(false);
      form.reset();
      setFiles([]);
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to create drill plan",
        variant: "destructive" 
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data: FormData) => {
    createPlanMutation.mutate(data);
  };

  const selectedCommand = commands.find(c => c.id === form.watch('commandId'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="text-modal-title">Create New Drill Plan</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                {...form.register('date', {
                  setValueAs: (value) => new Date(value),
                })}
                data-testid="input-date"
              />
              {form.formState.errors.date && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.date.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="flightAssignment">Flight Assignment *</Label>
              <Select 
                onValueChange={(value) => form.setValue('flightAssignment', value as any)}
                data-testid="select-flight"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Flight" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alpha">Alpha Flight</SelectItem>
                  <SelectItem value="tango">Tango Flight</SelectItem>
                  <SelectItem value="both">Both Flights</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.flightAssignment && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.flightAssignment.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="commandId">Drill Command *</Label>
              <div className="flex space-x-2">
                <Select 
                  onValueChange={(value) => form.setValue('commandId', value)}
                  data-testid="select-command"
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select Command" />
                  </SelectTrigger>
                  <SelectContent>
                    {commands.map((command) => (
                      <SelectItem key={command.id} value={command.id}>
                        {command.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  data-testid="button-add-command"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {selectedCommand && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <div>Last Alpha: {selectedCommand.lastAlphaExecution ? 
                    new Date(selectedCommand.lastAlphaExecution).toLocaleDateString() : 'Never'}</div>
                  <div>Last Tango: {selectedCommand.lastTangoExecution ? 
                    new Date(selectedCommand.lastTangoExecution).toLocaleDateString() : 'Never'}</div>
                </div>
              )}
              {form.formState.errors.commandId && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.commandId.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="eventType">Event Type *</Label>
              <Select 
                onValueChange={(value) => form.setValue('eventType', value as any)}
                data-testid="select-event-type"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="drill">Drill Movement</SelectItem>
                  <SelectItem value="class">Class</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.eventType && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.eventType.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label>File Uploads</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="fileInput"
                data-testid="input-files"
              />
              <label htmlFor="fileInput" className="cursor-pointer">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Click to upload files or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-1">Multiple files supported</p>
              </label>
            </div>

            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-2 bg-muted rounded"
                    data-testid={`file-item-${index}`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      data-testid={`button-remove-file-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register('notes')}
              placeholder="Add any relevant notes or instructions..."
              rows={4}
              data-testid="textarea-notes"
            />
          </div>

          <div>
            <Label htmlFor="authorName">Author Name</Label>
            <Input
              id="authorName"
              {...form.register('authorName')}
              placeholder="Your name"
              data-testid="input-author"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createPlanMutation.isPending}
              data-testid="button-submit"
            >
              {createPlanMutation.isPending ? 'Creating...' : 'Create Drill Plan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
