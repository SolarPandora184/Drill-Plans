import { 
  ref, 
  set, 
  get, 
  push, 
  update, 
  remove,
  query,
  orderByChild,
  orderByKey,
  limitToLast,
  equalTo,
  child
} from "firebase/database";
import { 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  getMetadata
} from "firebase/storage";
import { db, storage as firebaseStorage } from "./firebase-config";
import type { IStorage } from "./storage";
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

// Helper function to generate unique IDs
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Helper function to convert Firebase snapshot data
const snapshotToArray = (snapshot: any): any[] => {
  const data = snapshot.val();
  if (!data) return [];
  return Object.keys(data).map(key => ({
    id: key,
    ...data[key]
  }));
};

export class FirebaseStorage implements IStorage {
  // User methods (legacy)
  async getUser(id: string): Promise<User | undefined> {
    const userRef = ref(db, `users/${id}`);
    const snapshot = await get(userRef);
    return snapshot.exists() ? { id, ...snapshot.val() } as User : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const usersRef = ref(db, 'users');
    const usersQuery = query(usersRef, orderByChild('username'), equalTo(username), limitToLast(1));
    const snapshot = await get(usersQuery);
    
    if (!snapshot.exists()) return undefined;
    
    const data = snapshot.val();
    const userId = Object.keys(data)[0];
    return { id: userId, ...data[userId] } as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = generateId();
    const userRef = ref(db, `users/${id}`);
    await set(userRef, insertUser);
    return { id, ...insertUser } as User;
  }

  // Drill command methods
  async getAllDrillCommands(): Promise<DrillCommand[]> {
    const commandsRef = ref(db, 'drillCommands');
    const snapshot = await get(commandsRef);
    const commands = snapshotToArray(snapshot);
    
    return commands.map(cmd => ({
      ...cmd,
      createdAt: new Date(cmd.createdAt)
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getDrillCommand(id: string): Promise<DrillCommand | undefined> {
    try {
      const commandRef = ref(db, `drillCommands/${id}`);
      const snapshot = await get(commandRef);
      
      if (!snapshot.exists()) return undefined;
      
      const data = snapshot.val();
      return {
        id,
        ...data,
        metadata: data.metadata ?? null,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
      };
    } catch (error) {
      console.error('Error getting drill command:', error);
      return undefined;
    }
  }

  async createDrillCommand(command: InsertDrillCommand): Promise<DrillCommand> {
    const id = generateId();
    const commandRef = ref(db, `drillCommands/${id}`);
    const commandData = {
      ...command,
      createdAt: new Date().toISOString()
    };
    
    await set(commandRef, commandData);
    
    return {
      id,
      ...command,
      metadata: command.metadata ?? null,
      createdAt: new Date()
    };
  }

  async updateDrillCommand(id: string, command: Partial<InsertDrillCommand>): Promise<DrillCommand | undefined> {
    const commandRef = ref(db, `drillCommands/${id}`);
    await update(commandRef, command);
    return await this.getDrillCommand(id);
  }

  async deleteDrillCommand(id: string): Promise<boolean> {
    try {
      const commandRef = ref(db, `drillCommands/${id}`);
      await remove(commandRef);
      return true;
    } catch {
      return false;
    }
  }

  // Drill plan methods
  async getAllDrillPlans(): Promise<(DrillPlan & { command: DrillCommand })[]> {
    const plansRef = ref(db, 'drillPlans');
    const snapshot = await get(plansRef);
    const plans = snapshotToArray(snapshot);
    
    const plansWithCommands = await Promise.all(
      plans.map(async plan => {
        const command = await this.getDrillCommand(plan.commandId);
        return {
          ...plan,
          date: new Date(plan.date),
          createdAt: new Date(plan.createdAt),
          updatedAt: new Date(plan.updatedAt),
          command: command!
        };
      })
    );
    
    return plansWithCommands.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async getDrillPlan(id: string): Promise<(DrillPlan & { command: DrillCommand; files: DrillPlanFile[]; notes: DrillPlanNote[] }) | undefined> {
    try {
      const planRef = ref(db, `drillPlans/${id}`);
      const snapshot = await get(planRef);
      
      if (!snapshot.exists()) return undefined;
      
      const planData = snapshot.val();
      const plan = {
        id,
        ...planData,
        date: planData.date ? new Date(planData.date) : new Date(),
        createdAt: planData.createdAt ? new Date(planData.createdAt) : new Date(),
        updatedAt: planData.updatedAt ? new Date(planData.updatedAt) : new Date()
      };
      
      const [command, files, notes] = await Promise.all([
        this.getDrillCommand(plan.commandId),
        this.getDrillPlanFiles(id),
        this.getCommandNotes(plan.commandId)
      ]);
      
      if (!command) {
        console.error(`Command ${plan.commandId} not found for drill plan ${id}`);
        return undefined;
      }
      
      return {
        ...plan,
        command,
        files,
        notes
      };
    } catch (error) {
      console.error('Error getting drill plan:', error);
      return undefined;
    }
  }

  async createDrillPlan(plan: InsertDrillPlan): Promise<DrillPlan> {
    const id = generateId();
    const now = new Date().toISOString();
    const planRef = ref(db, `drillPlans/${id}`);
    const planData = {
      ...plan,
      date: plan.date.toISOString(),
      createdAt: now,
      updatedAt: now
    };
    
    await set(planRef, planData);
    
    // Create execution history entry
    const historyId = generateId();
    const historyRef = ref(db, `commandExecutionHistory/${historyId}`);
    await set(historyRef, {
      commandId: plan.commandId,
      drillPlanId: id,
      flightType: plan.flightAssignment === 'both' ? 'alpha' : plan.flightAssignment,
      executedAt: plan.date.toISOString()
    });
    
    // If both flights, create second entry for tango
    if (plan.flightAssignment === 'both') {
      const historyId2 = generateId();
      const historyRef2 = ref(db, `commandExecutionHistory/${historyId2}`);
      await set(historyRef2, {
        commandId: plan.commandId,
        drillPlanId: id,
        flightType: 'tango',
        executedAt: plan.date.toISOString()
      });
    }
    
    return {
      id,
      ...plan,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async updateDrillPlan(id: string, plan: Partial<InsertDrillPlan>): Promise<DrillPlan | undefined> {
    const planRef = ref(db, `drillPlans/${id}`);
    const updateData: any = { 
      ...plan,
      updatedAt: new Date().toISOString()
    };
    
    if (plan.date) {
      updateData.date = plan.date.toISOString();
    }
    
    await update(planRef, updateData);
    const updated = await this.getDrillPlan(id);
    return updated ? updated : undefined;
  }

  async deleteDrillPlan(id: string): Promise<boolean> {
    try {
      const planRef = ref(db, `drillPlans/${id}`);
      await remove(planRef);
      return true;
    } catch {
      return false;
    }
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

    // Copy files (metadata only, files stay in Firebase Storage)
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

    return newPlan;
  }

  // File methods
  async createDrillPlanFile(file: InsertDrillPlanFile): Promise<DrillPlanFile> {
    const id = generateId();
    const fileRef = ref(db, `drillPlanFiles/${id}`);
    const fileData = {
      ...file,
      uploadedAt: new Date().toISOString()
    };
    
    await set(fileRef, fileData);
    
    return {
      id,
      ...file,
      drillPlanId: file.drillPlanId ?? null,
      commandId: file.commandId ?? null,
      uploadedAt: new Date()
    };
  }

  async getDrillPlanFiles(drillPlanId: string): Promise<DrillPlanFile[]> {
    try {
      const filesRef = ref(db, 'drillPlanFiles');
      const snapshot = await get(filesRef);
      
      const files = snapshotToArray(snapshot)
        .filter(file => file.drillPlanId === drillPlanId);
        
      return files.map(file => ({
        ...file,
        uploadedAt: new Date(file.uploadedAt)
      }));
    } catch (error) {
      console.error('Error getting drill plan files:', error);
      return [];
    }
  }

  async getCommandFiles(commandId: string): Promise<DrillPlanFile[]> {
    try {
      const filesRef = ref(db, 'drillPlanFiles');
      const snapshot = await get(filesRef);
      
      const files = snapshotToArray(snapshot)
        .filter(file => file.commandId === commandId);
        
      return files.map(file => ({
        ...file,
        uploadedAt: new Date(file.uploadedAt)
      }));
    } catch (error) {
      console.error('Error getting command files:', error);
      return [];
    }
  }

  async getFileById(id: string): Promise<DrillPlanFile | undefined> {
    const fileRef = ref(db, `drillPlanFiles/${id}`);
    const snapshot = await get(fileRef);
    
    return snapshot.exists() 
      ? { id, ...snapshot.val(), uploadedAt: new Date(snapshot.val().uploadedAt) }
      : undefined;
  }

  async deleteDrillPlanFile(id: string): Promise<boolean> {
    try {
      const file = await this.getFileById(id);
      if (file && file.filePath) {
        // Delete from Firebase Storage
        const fileRef = storageRef(firebaseStorage, file.filePath);
        await deleteObject(fileRef);
      }
      
      const dbFileRef = ref(db, `drillPlanFiles/${id}`);
      await remove(dbFileRef);
      return true;
    } catch {
      return false;
    }
  }

  // Note methods
  async createCommandNote(note: InsertDrillPlanNote): Promise<DrillPlanNote> {
    const id = generateId();
    const noteRef = ref(db, `drillPlanNotes/${id}`);
    const noteData = {
      ...note,
      createdAt: new Date().toISOString()
    };
    
    await set(noteRef, noteData);
    
    return {
      id,
      ...note,
      createdAt: new Date()
    };
  }

  async getCommandNotes(commandId: string): Promise<DrillPlanNote[]> {
    try {
      const notesRef = ref(db, 'drillPlanNotes');
      const snapshot = await get(notesRef);
      
      const notes = snapshotToArray(snapshot)
        .filter(note => note.commandId === commandId);
        
      return notes.map(note => ({
        ...note,
        createdAt: new Date(note.createdAt)
      })).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } catch (error) {
      console.error('Error getting command notes:', error);
      return [];
    }
  }

  async deleteCommandNote(id: string): Promise<boolean> {
    try {
      const noteRef = ref(db, `drillPlanNotes/${id}`);
      await remove(noteRef);
      return true;
    } catch {
      return false;
    }
  }

  // Command execution history
  async getCommandExecutionHistory(commandId: string): Promise<CommandExecutionHistory[]> {
    try {
      const historyRef = ref(db, 'commandExecutionHistory');
      const snapshot = await get(historyRef);
      
      const history = snapshotToArray(snapshot)
        .filter(item => item.commandId === commandId);
        
      return history.map(item => ({
        ...item,
        executedAt: new Date(item.executedAt)
      })).sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
    } catch (error) {
      console.error('Error getting command execution history:', error);
      return [];
    }
  }

  async getLastExecutionByFlight(commandId: string, flight: 'alpha' | 'tango'): Promise<CommandExecutionHistory | undefined> {
    try {
      const historyRef = ref(db, 'commandExecutionHistory');
      const snapshot = await get(historyRef);
      const history = snapshotToArray(snapshot);
      
      const filtered = history
        .filter(item => item.commandId === commandId && item.flightType === flight)
        .map(item => ({
          ...item,
          executedAt: new Date(item.executedAt)
        }))
        .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
      
      return filtered.length > 0 ? filtered[0] : undefined;
    } catch (error) {
      console.error('Error getting last execution by flight:', error);
      return undefined;
    }
  }

  // Database management (adapted for Realtime Database)
  async getDatabaseSize(): Promise<number> {
    // For Realtime Database, we'll estimate size based on total records
    const collections = [
      'drillCommands',
      'drillPlans', 
      'drillPlanFiles',
      'drillPlanNotes',
      'commandExecutionHistory'
    ];
    
    let totalRecords = 0;
    for (const collection of collections) {
      const collectionRef = ref(db, collection);
      const snapshot = await get(collectionRef);
      const data = snapshot.val();
      if (data) {
        totalRecords += Object.keys(data).length;
      }
    }
    
    // Estimate: 1KB average per record
    return totalRecords * 1024;
  }

  async pruneOldData(): Promise<void> {
    // For Realtime Database, implement simple pruning strategy
    // Keep only the latest drill plan for each command
    const plans = await this.getAllDrillPlans();
    const commandPlanMap = new Map<string, DrillPlan[]>();
    
    // Group plans by command
    plans.forEach(plan => {
      if (!commandPlanMap.has(plan.commandId)) {
        commandPlanMap.set(plan.commandId, []);
      }
      commandPlanMap.get(plan.commandId)!.push(plan);
    });
    
    // For each command, keep only the latest plan
    for (const [commandId, commandPlans] of Array.from(commandPlanMap.entries())) {
      if (commandPlans.length > 1) {
        const sortedPlans = commandPlans.sort((a: DrillPlan, b: DrillPlan) => b.date.getTime() - a.date.getTime());
        const plansToDelete = sortedPlans.slice(1); // Keep the first (latest), delete the rest
        
        for (const plan of plansToDelete) {
          await this.deleteDrillPlan(plan.id);
        }
      }
    }
  }
}