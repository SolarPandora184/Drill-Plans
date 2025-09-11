import { 
  drillCommands, 
  drillPlans, 
  drillPlanFiles, 
  drillPlanNotes,
  commandExecutionHistory,
  users,
  type DrillCommand,
  type InsertDrillCommand,
  type DrillPlan,
  type InsertDrillPlan,
  type DrillPlanFile,
  type InsertDrillPlanFile,
  type DrillPlanNote,
  type InsertDrillPlanNote,
  type CommandExecutionHistory,
  type User,
  type InsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, lt } from "drizzle-orm";

export interface IStorage {
  // User methods (legacy)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Drill command methods
  getAllDrillCommands(): Promise<DrillCommand[]>;
  getDrillCommand(id: string): Promise<DrillCommand | undefined>;
  createDrillCommand(command: InsertDrillCommand): Promise<DrillCommand>;
  updateDrillCommand(id: string, command: Partial<InsertDrillCommand>): Promise<DrillCommand | undefined>;
  deleteDrillCommand(id: string): Promise<boolean>;

  // Drill plan methods
  getAllDrillPlans(): Promise<(DrillPlan & { command: DrillCommand })[]>;
  getDrillPlan(id: string): Promise<(DrillPlan & { command: DrillCommand; files: DrillPlanFile[]; notes: DrillPlanNote[] }) | undefined>;
  createDrillPlan(plan: InsertDrillPlan): Promise<DrillPlan>;
  updateDrillPlan(id: string, plan: Partial<InsertDrillPlan>): Promise<DrillPlan | undefined>;
  deleteDrillPlan(id: string): Promise<boolean>;
  duplicateDrillPlan(id: string, newDate: Date): Promise<DrillPlan | undefined>;

  // File methods
  createDrillPlanFile(file: InsertDrillPlanFile): Promise<DrillPlanFile>;
  getDrillPlanFiles(drillPlanId: string): Promise<DrillPlanFile[]>;
  getCommandFiles(commandId: string): Promise<DrillPlanFile[]>;
  deleteDrillPlanFile(id: string): Promise<boolean>;

  // Note methods
  createDrillPlanNote(note: InsertDrillPlanNote): Promise<DrillPlanNote>;
  getDrillPlanNotes(drillPlanId: string): Promise<DrillPlanNote[]>;
  deleteDrillPlanNote(id: string): Promise<boolean>;

  // Command execution history
  getCommandExecutionHistory(commandId: string): Promise<CommandExecutionHistory[]>;
  getLastExecutionByFlight(commandId: string, flight: 'alpha' | 'tango'): Promise<CommandExecutionHistory | undefined>;

  // Database management
  getDatabaseSize(): Promise<number>;
  pruneOldData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods (legacy)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Drill command methods
  async getAllDrillCommands(): Promise<DrillCommand[]> {
    return await db.select().from(drillCommands).orderBy(drillCommands.name);
  }

  async getDrillCommand(id: string): Promise<DrillCommand | undefined> {
    const [command] = await db.select().from(drillCommands).where(eq(drillCommands.id, id));
    return command || undefined;
  }

  async createDrillCommand(command: InsertDrillCommand): Promise<DrillCommand> {
    const [newCommand] = await db.insert(drillCommands).values(command).returning();
    return newCommand;
  }

  async updateDrillCommand(id: string, command: Partial<InsertDrillCommand>): Promise<DrillCommand | undefined> {
    const [updated] = await db.update(drillCommands).set(command).where(eq(drillCommands.id, id)).returning();
    return updated || undefined;
  }

  async deleteDrillCommand(id: string): Promise<boolean> {
    const result = await db.delete(drillCommands).where(eq(drillCommands.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Drill plan methods
  async getAllDrillPlans(): Promise<(DrillPlan & { command: DrillCommand })[]> {
    return await db.select({
      id: drillPlans.id,
      date: drillPlans.date,
      flightAssignment: drillPlans.flightAssignment,
      commandId: drillPlans.commandId,
      eventType: drillPlans.eventType,
      createdAt: drillPlans.createdAt,
      updatedAt: drillPlans.updatedAt,
      command: drillCommands,
    })
    .from(drillPlans)
    .innerJoin(drillCommands, eq(drillPlans.commandId, drillCommands.id))
    .orderBy(drillPlans.date);
  }

  async getDrillPlan(id: string): Promise<(DrillPlan & { command: DrillCommand; files: DrillPlanFile[]; notes: DrillPlanNote[] }) | undefined> {
    const [plan] = await db.select({
      id: drillPlans.id,
      date: drillPlans.date,
      flightAssignment: drillPlans.flightAssignment,
      commandId: drillPlans.commandId,
      eventType: drillPlans.eventType,
      createdAt: drillPlans.createdAt,
      updatedAt: drillPlans.updatedAt,
      command: drillCommands,
    })
    .from(drillPlans)
    .innerJoin(drillCommands, eq(drillPlans.commandId, drillCommands.id))
    .where(eq(drillPlans.id, id));

    if (!plan) return undefined;

    const files = await this.getDrillPlanFiles(id);
    const notes = await this.getDrillPlanNotes(id);

    return { ...plan, files, notes };
  }

  async createDrillPlan(plan: InsertDrillPlan): Promise<DrillPlan> {
    const [newPlan] = await db.insert(drillPlans).values({
      ...plan,
      updatedAt: new Date(),
    }).returning();

    // Create execution history entry
    await db.insert(commandExecutionHistory).values({
      commandId: plan.commandId,
      drillPlanId: newPlan.id,
      flightType: plan.flightAssignment === 'both' ? 'alpha' : plan.flightAssignment,
      executedAt: plan.date,
    });

    // If both flights, create second entry for tango
    if (plan.flightAssignment === 'both') {
      await db.insert(commandExecutionHistory).values({
        commandId: plan.commandId,
        drillPlanId: newPlan.id,
        flightType: 'tango',
        executedAt: plan.date,
      });
    }

    return newPlan;
  }

  async updateDrillPlan(id: string, plan: Partial<InsertDrillPlan>): Promise<DrillPlan | undefined> {
    const [updated] = await db.update(drillPlans).set({
      ...plan,
      updatedAt: new Date(),
    }).where(eq(drillPlans.id, id)).returning();
    return updated || undefined;
  }

  async deleteDrillPlan(id: string): Promise<boolean> {
    const result = await db.delete(drillPlans).where(eq(drillPlans.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async duplicateDrillPlan(id: string, newDate: Date): Promise<DrillPlan | undefined> {
    const originalPlan = await this.getDrillPlan(id);
    if (!originalPlan) return undefined;

    const newPlan = await this.createDrillPlan({
      date: newDate,
      flightAssignment: originalPlan.flightAssignment,
      commandId: originalPlan.commandId,
      eventType: originalPlan.eventType,
    });

    // Copy files
    for (const file of originalPlan.files) {
      await this.createDrillPlanFile({
        drillPlanId: newPlan.id,
        commandId: file.commandId,
        fileName: file.fileName,
        filePath: file.filePath,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
      });
    }

    // Copy notes
    for (const note of originalPlan.notes) {
      await this.createDrillPlanNote({
        drillPlanId: newPlan.id,
        content: note.content,
        authorName: note.authorName,
      });
    }

    return newPlan;
  }

  // File methods
  async createDrillPlanFile(file: InsertDrillPlanFile): Promise<DrillPlanFile> {
    const [newFile] = await db.insert(drillPlanFiles).values(file).returning();
    return newFile;
  }

  async getDrillPlanFiles(drillPlanId: string): Promise<DrillPlanFile[]> {
    return await db.select().from(drillPlanFiles).where(eq(drillPlanFiles.drillPlanId, drillPlanId));
  }

  async getCommandFiles(commandId: string): Promise<DrillPlanFile[]> {
    return await db.select().from(drillPlanFiles).where(eq(drillPlanFiles.commandId, commandId));
  }

  async deleteDrillPlanFile(id: string): Promise<boolean> {
    const result = await db.delete(drillPlanFiles).where(eq(drillPlanFiles.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Note methods
  async createDrillPlanNote(note: InsertDrillPlanNote): Promise<DrillPlanNote> {
    const [newNote] = await db.insert(drillPlanNotes).values(note).returning();
    return newNote;
  }

  async getDrillPlanNotes(drillPlanId: string): Promise<DrillPlanNote[]> {
    return await db.select().from(drillPlanNotes)
      .where(eq(drillPlanNotes.drillPlanId, drillPlanId))
      .orderBy(drillPlanNotes.createdAt);
  }

  async deleteDrillPlanNote(id: string): Promise<boolean> {
    const result = await db.delete(drillPlanNotes).where(eq(drillPlanNotes.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Command execution history
  async getCommandExecutionHistory(commandId: string): Promise<CommandExecutionHistory[]> {
    return await db.select().from(commandExecutionHistory)
      .where(eq(commandExecutionHistory.commandId, commandId))
      .orderBy(desc(commandExecutionHistory.executedAt));
  }

  async getLastExecutionByFlight(commandId: string, flight: 'alpha' | 'tango'): Promise<CommandExecutionHistory | undefined> {
    const [execution] = await db.select().from(commandExecutionHistory)
      .where(and(
        eq(commandExecutionHistory.commandId, commandId),
        eq(commandExecutionHistory.flightType, flight)
      ))
      .orderBy(desc(commandExecutionHistory.executedAt))
      .limit(1);
    return execution || undefined;
  }

  // Database management
  async getDatabaseSize(): Promise<number> {
    const result = await db.execute(sql`
      SELECT pg_database_size(current_database()) as size
    `);
    return (result.rows[0] as any).size as number;
  }

  async pruneOldData(): Promise<void> {
    const oneGBInBytes = 1024 * 1024 * 1024;
    const bufferSize = oneGBInBytes * 0.1; // 10% buffer
    const targetSize = oneGBInBytes - bufferSize;

    const currentSize = await this.getDatabaseSize();
    if (currentSize <= targetSize) return;

    // Get oldest drill plans, but preserve newest iteration of each command
    const oldestPlansResult = await db.execute(sql`
      WITH ranked_plans AS (
        SELECT 
          dp.id,
          dp.command_id,
          dp.date,
          ROW_NUMBER() OVER (
            PARTITION BY dp.command_id 
            ORDER BY dp.date DESC
          ) as rn
        FROM drill_plans dp
      )
      SELECT id FROM ranked_plans 
      WHERE rn > 1 
      ORDER BY date ASC
    `);

    // Delete old plans one by one until we're under the limit
    for (const plan of oldestPlansResult.rows) {
      await this.deleteDrillPlan((plan as any).id);
      
      const newSize = await this.getDatabaseSize();
      if (newSize <= targetSize) break;
    }
  }
}

export const storage = new DatabaseStorage();
