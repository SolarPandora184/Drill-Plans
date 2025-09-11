import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertDrillCommandSchema, 
  insertDrillPlanSchema,
  insertDrillPlanNoteSchema
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { z } from "zod";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
const upload = multer({ 
  dest: uploadDir,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Ensure upload directory exists
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Drill Commands
  app.get("/api/commands", async (req, res) => {
    try {
      const commands = await storage.getAllDrillCommands();
      
      // Add execution history for each command
      const commandsWithHistory = await Promise.all(
        commands.map(async (command) => {
          const [alphaExecution, tangoExecution] = await Promise.all([
            storage.getLastExecutionByFlight(command.id, 'alpha'),
            storage.getLastExecutionByFlight(command.id, 'tango')
          ]);
          
          return {
            ...command,
            lastAlphaExecution: alphaExecution?.executedAt || null,
            lastTangoExecution: tangoExecution?.executedAt || null,
          };
        })
      );
      
      res.json(commandsWithHistory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch commands" });
    }
  });

  app.get("/api/commands/:id", async (req, res) => {
    try {
      const command = await storage.getDrillCommand(req.params.id);
      if (!command) {
        return res.status(404).json({ message: "Command not found" });
      }
      
      const files = await storage.getCommandFiles(command.id);
      const history = await storage.getCommandExecutionHistory(command.id);
      
      res.json({ ...command, files, history });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch command" });
    }
  });

  app.post("/api/commands", upload.array('files'), async (req, res) => {
    try {
      const commandData = insertDrillCommandSchema.parse(req.body);
      const command = await storage.createDrillCommand(commandData);
      
      // Handle file uploads
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          const finalPath = path.join(uploadDir, `${command.id}_${file.originalname}`);
          await fs.rename(file.path, finalPath);
          
          await storage.createDrillPlanFile({
            commandId: command.id,
            drillPlanId: null,
            fileName: file.originalname,
            filePath: finalPath,
            fileSize: file.size,
            mimeType: file.mimetype,
          });
        }
      }
      
      res.json(command);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid command data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create command" });
    }
  });

  app.put("/api/commands/:id", async (req, res) => {
    try {
      const commandData = insertDrillCommandSchema.partial().parse(req.body);
      const command = await storage.updateDrillCommand(req.params.id, commandData);
      
      if (!command) {
        return res.status(404).json({ message: "Command not found" });
      }
      
      res.json(command);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid command data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update command" });
    }
  });

  app.delete("/api/commands/:id", async (req, res) => {
    try {
      const success = await storage.deleteDrillCommand(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Command not found" });
      }
      res.json({ message: "Command deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete command" });
    }
  });

  // Drill Plans
  app.get("/api/drill-plans", async (req, res) => {
    try {
      const plans = await storage.getAllDrillPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch drill plans" });
    }
  });

  app.get("/api/drill-plans/:id", async (req, res) => {
    try {
      const plan = await storage.getDrillPlan(req.params.id);
      if (!plan) {
        return res.status(404).json({ message: "Drill plan not found" });
      }
      res.json(plan);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch drill plan" });
    }
  });

  app.post("/api/drill-plans", upload.array('files'), async (req, res) => {
    try {
      const planData = insertDrillPlanSchema.parse({
        ...req.body,
        date: new Date(req.body.date),
      });
      
      const plan = await storage.createDrillPlan(planData);
      
      // Handle file uploads
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          const finalPath = path.join(uploadDir, `${plan.id}_${file.originalname}`);
          await fs.rename(file.path, finalPath);
          
          await storage.createDrillPlanFile({
            drillPlanId: plan.id,
            commandId: planData.commandId,
            fileName: file.originalname,
            filePath: finalPath,
            fileSize: file.size,
            mimeType: file.mimetype,
          });
        }
      }
      
      res.json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid drill plan data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create drill plan" });
    }
  });

  app.put("/api/drill-plans/:id", async (req, res) => {
    try {
      const planData = insertDrillPlanSchema.partial().parse({
        ...req.body,
        ...(req.body.date && { date: new Date(req.body.date) }),
      });
      
      const plan = await storage.updateDrillPlan(req.params.id, planData);
      if (!plan) {
        return res.status(404).json({ message: "Drill plan not found" });
      }
      
      res.json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid drill plan data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update drill plan" });
    }
  });

  app.delete("/api/drill-plans/:id", async (req, res) => {
    try {
      const success = await storage.deleteDrillPlan(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Drill plan not found" });
      }
      res.json({ message: "Drill plan deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete drill plan" });
    }
  });

  app.post("/api/drill-plans/:id/duplicate", async (req, res) => {
    try {
      const { date } = req.body;
      if (!date) {
        return res.status(400).json({ message: "New date is required" });
      }
      
      const newPlan = await storage.duplicateDrillPlan(req.params.id, new Date(date));
      if (!newPlan) {
        return res.status(404).json({ message: "Drill plan not found" });
      }
      
      res.json(newPlan);
    } catch (error) {
      res.status(500).json({ message: "Failed to duplicate drill plan" });
    }
  });

  // Notes
  app.post("/api/drill-plans/:id/notes", async (req, res) => {
    try {
      const noteData = insertDrillPlanNoteSchema.parse({
        ...req.body,
        drillPlanId: req.params.id,
      });
      
      const note = await storage.createDrillPlanNote(noteData);
      res.json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid note data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create note" });
    }
  });

  app.delete("/api/notes/:id", async (req, res) => {
    try {
      const success = await storage.deleteDrillPlanNote(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Note not found" });
      }
      res.json({ message: "Note deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete note" });
    }
  });

  // File operations
  app.get("/api/files/:id/download", async (req, res) => {
    try {
      const [file] = await storage.getDrillPlanFiles(req.params.id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      res.download(file.filePath, file.fileName);
    } catch (error) {
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  app.delete("/api/files/:id", async (req, res) => {
    try {
      const success = await storage.deleteDrillPlanFile(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "File not found" });
      }
      res.json({ message: "File deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // Export to Excel
  app.get("/api/export/excel", async (req, res) => {
    try {
      const plans = await storage.getAllDrillPlans();
      
      // Group plans by flight
      const alphaPlans = plans.filter(p => 
        p.flightAssignment === 'alpha' || p.flightAssignment === 'both'
      );
      const tangoPlans = plans.filter(p => 
        p.flightAssignment === 'tango' || p.flightAssignment === 'both'
      );
      
      const today = new Date();
      
      const formatPlansForExport = (planList: typeof plans) => {
        return planList.map(plan => ({
          Date: plan.date.toISOString().split('T')[0],
          'Command Name': plan.command.name,
          Type: plan.eventType,
          'Flight Assignment': plan.flightAssignment,
          Status: plan.date < today ? 'Past' : 'Upcoming',
          'Created': plan.createdAt.toISOString().split('T')[0],
        }));
      };
      
      const exportData = {
        'Alpha Flight': formatPlansForExport(alphaPlans),
        'Tango Flight': formatPlansForExport(tangoPlans),
      };
      
      res.json(exportData);
    } catch (error) {
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Database management
  app.get("/api/database/size", async (req, res) => {
    try {
      const size = await storage.getDatabaseSize();
      res.json({ size, limit: 1024 * 1024 * 1024 }); // 1GB limit
    } catch (error) {
      res.status(500).json({ message: "Failed to get database size" });
    }
  });

  app.post("/api/database/prune", async (req, res) => {
    try {
      await storage.pruneOldData();
      const newSize = await storage.getDatabaseSize();
      res.json({ message: "Data pruned successfully", newSize });
    } catch (error) {
      res.status(500).json({ message: "Failed to prune data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
