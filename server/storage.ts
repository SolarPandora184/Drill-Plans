import type {
  DrillCommand,
  InsertDrillCommand,
  DrillPlan,
  InsertDrillPlan,
  DrillPlanFile,
  InsertDrillPlanFile,
  DrillPlanNote,
  InsertDrillPlanNote,
  CommandExecutionHistory,
  User,
  InsertUser
} from "@shared/firebase-schema";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;

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
  getFileById(id: string): Promise<DrillPlanFile | undefined>;
  deleteDrillPlanFile(id: string): Promise<boolean>;

  // Note methods
  createCommandNote(note: InsertDrillPlanNote): Promise<DrillPlanNote>;
  getCommandNotes(commandId: string): Promise<DrillPlanNote[]>;
  deleteCommandNote(id: string): Promise<boolean>;

  // Command execution history
  getCommandExecutionHistory(commandId: string): Promise<CommandExecutionHistory[]>;
  getLastExecutionByFlight(commandId: string, flight: 'alpha' | 'tango'): Promise<CommandExecutionHistory | undefined>;

  // Database management
  getDatabaseSize(): Promise<number>;
  pruneOldData(): Promise<void>;
}