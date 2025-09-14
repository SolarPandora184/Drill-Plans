import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDrillCommandSchema } from "@shared/firebase-schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { InsertDrillCommand } from "@shared/firebase-schema";

interface CommandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommandModal({ open, onOpenChange }: CommandModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertDrillCommand>({
    resolver: zodResolver(insertDrillCommandSchema),
    defaultValues: {
      name: '',
      type: undefined,
      metadata: '',
    },
  });

  const createCommandMutation = useMutation({
    mutationFn: async (data: InsertDrillCommand) => {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('type', data.type);
      if (data.metadata) {
        formData.append('metadata', data.metadata);
      }

      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/commands', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to create command');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commands'] });
      toast({ title: "Success", description: "Command created successfully" });
      onOpenChange(false);
      form.reset();
      setFiles([]);
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to create command",
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

  const onSubmit = (data: InsertDrillCommand) => {
    createCommandMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle data-testid="text-command-modal-title">Create New Command</DialogTitle>
          <DialogDescription>
            Create a new drill command that can be used in drill plans
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="name">Command Name *</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="e.g., Advanced Formation Flying"
              data-testid="input-command-name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="type">Type *</Label>
            <Select 
              onValueChange={(value) => form.setValue('type', value as any)}
              data-testid="select-command-type"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="drill">Drill Movement</SelectItem>
                <SelectItem value="class">Class</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.type && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.type.message}
              </p>
            )}
          </div>

          <div>
            <Label>Associated Files</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="commandFileInput"
                data-testid="input-command-files"
              />
              <label htmlFor="commandFileInput" className="cursor-pointer">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Upload reference materials, procedures, etc.</p>
              </label>
            </div>

            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-2 bg-muted rounded"
                    data-testid={`command-file-item-${index}`}
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
                      data-testid={`button-remove-command-file-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="metadata">Metadata</Label>
            <Textarea
              id="metadata"
              {...form.register('metadata')}
              placeholder="Add any metadata, requirements, or description..."
              rows={3}
              data-testid="textarea-command-metadata"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="button-command-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createCommandMutation.isPending}
              data-testid="button-command-submit"
            >
              {createCommandMutation.isPending ? 'Creating...' : 'Create Command'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
