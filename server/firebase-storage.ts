import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { 
  ref, 
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

// Firebase types (adjusting for Firestore's string IDs and timestamp handling)
type FirebaseDrillCommand = Omit<DrillCommand, 'id' | 'createdAt'> & {
  id: string;
  createdAt: Timestamp;
};

type FirebaseDrillPlan = Omit<DrillPlan, 'id' | 'createdAt' | 'updatedAt'> & {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

type FirebaseDrillPlanFile = Omit<DrillPlanFile, 'id' | 'uploadedAt'> & {
  id: string;
  uploadedAt: Timestamp;
  downloadUrl?: string; // Firebase Storage download URL
};

type FirebaseDrillPlanNote = Omit<DrillPlanNote, 'id' | 'createdAt'> & {
  id: string;
  createdAt: Timestamp;
};

type FirebaseCommandExecutionHistory = Omit<CommandExecutionHistory, 'id' | 'executedAt'> & {
  id: string;
  executedAt: Timestamp;
};

// Helper function to convert Firestore Timestamp to Date
const timestampToDate = (timestamp: Timestamp): Date => timestamp.toDate();

// Helper function to convert Firebase objects to expected types
const convertFirebaseCommand = (doc: any): DrillCommand => ({
  ...doc,
  createdAt: timestampToDate(doc.createdAt)
});

const convertFirebasePlan = (doc: any): DrillPlan => ({
  ...doc,
  date: timestampToDate(doc.date),
  createdAt: timestampToDate(doc.createdAt),
  updatedAt: timestampToDate(doc.updatedAt)
});

const convertFirebaseFile = (doc: any): DrillPlanFile => ({
  ...doc,
  uploadedAt: timestampToDate(doc.uploadedAt)
});

const convertFirebaseNote = (doc: any): DrillPlanNote => ({
  ...doc,
  createdAt: timestampToDate(doc.createdAt)
});

const convertFirebaseHistory = (doc: any): CommandExecutionHistory => ({
  ...doc,
  executedAt: timestampToDate(doc.executedAt)
});

export class FirebaseStorage implements IStorage {
  // Collections
  private commandsCollection = collection(db, 'drillCommands');
  private plansCollection = collection(db, 'drillPlans');
  private filesCollection = collection(db, 'drillPlanFiles');
  private notesCollection = collection(db, 'drillPlanNotes');
  private historyCollection = collection(db, 'commandExecutionHistory');
  private usersCollection = collection(db, 'users');

  // User methods (legacy)
  async getUser(id: string): Promise<User | undefined> {
    const userDoc = doc(this.usersCollection, id);
    const docSnap = await getDoc(userDoc);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as User : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const q = query(this.usersCollection, where("username", "==", username), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return undefined;
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const docRef = await addDoc(this.usersCollection, insertUser);
    return { id: docRef.id, ...insertUser } as User;
  }

  // Drill command methods
  async getAllDrillCommands(): Promise<DrillCommand[]> {
    const q = query(this.commandsCollection, orderBy("name"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => 
      convertFirebaseCommand({ id: doc.id, ...doc.data() })
    );
  }

  async getDrillCommand(id: string): Promise<DrillCommand | undefined> {
    const commandDoc = doc(this.commandsCollection, id);
    const docSnap = await getDoc(commandDoc);
    
    return docSnap.exists() 
      ? convertFirebaseCommand({ id: docSnap.id, ...docSnap.data() })
      : undefined;
  }

  async createDrillCommand(command: InsertDrillCommand): Promise<DrillCommand> {
    const docRef = await addDoc(this.commandsCollection, {
      ...command,
      createdAt: serverTimestamp()
    });
    
    return convertFirebaseCommand({
      id: docRef.id,
      ...command,
      createdAt: Timestamp.now()
    });
  }

  async updateDrillCommand(id: string, command: Partial<InsertDrillCommand>): Promise<DrillCommand | undefined> {
    const commandDoc = doc(this.commandsCollection, id);
    await updateDoc(commandDoc, command);
    
    const updated = await this.getDrillCommand(id);
    return updated;
  }

  async deleteDrillCommand(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(this.commandsCollection, id));
      return true;
    } catch {
      return false;
    }
  }

  // Drill plan methods
  async getAllDrillPlans(): Promise<(DrillPlan & { command: DrillCommand })[]> {
    const q = query(this.plansCollection, orderBy("date"));
    const querySnapshot = await getDocs(q);
    
    const plans = await Promise.all(
      querySnapshot.docs.map(async planDoc => {
        const planData = { id: planDoc.id, ...planDoc.data() } as any;
        const command = await this.getDrillCommand(planData.commandId);
        
        return {
          ...convertFirebasePlan(planData),
          command: command!
        };
      })
    );
    
    return plans;
  }

  async getDrillPlan(id: string): Promise<(DrillPlan & { command: DrillCommand; files: DrillPlanFile[]; notes: DrillPlanNote[] }) | undefined> {
    const planDoc = doc(this.plansCollection, id);
    const docSnap = await getDoc(planDoc);
    
    if (!docSnap.exists()) return undefined;
    
    const planData = { id: docSnap.id, ...docSnap.data() };
    const plan = convertFirebasePlan(planData);
    
    const [command, files, notes] = await Promise.all([
      this.getDrillCommand(plan.commandId),
      this.getDrillPlanFiles(id),
      this.getCommandNotes(plan.commandId)
    ]);
    
    return {
      ...plan,
      command: command!,
      files,
      notes
    };
  }

  async createDrillPlan(plan: InsertDrillPlan): Promise<DrillPlan> {
    const now = serverTimestamp();
    const docRef = await addDoc(this.plansCollection, {
      ...plan,
      date: Timestamp.fromDate(plan.date),
      createdAt: now,
      updatedAt: now
    });
    
    // Create execution history entry
    await addDoc(this.historyCollection, {
      commandId: plan.commandId,
      drillPlanId: docRef.id,
      flightType: plan.flightAssignment === 'both' ? 'alpha' : plan.flightAssignment,
      executedAt: Timestamp.fromDate(plan.date)
    });
    
    // If both flights, create second entry for tango
    if (plan.flightAssignment === 'both') {
      await addDoc(this.historyCollection, {
        commandId: plan.commandId,
        drillPlanId: docRef.id,
        flightType: 'tango',
        executedAt: Timestamp.fromDate(plan.date)
      });
    }
    
    return convertFirebasePlan({
      id: docRef.id,
      ...plan,
      date: Timestamp.fromDate(plan.date),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }

  async updateDrillPlan(id: string, plan: Partial<InsertDrillPlan>): Promise<DrillPlan | undefined> {
    const planDoc = doc(this.plansCollection, id);
    const updateData: any = { 
      ...plan,
      updatedAt: serverTimestamp()
    };
    
    if (plan.date) {
      updateData.date = Timestamp.fromDate(plan.date);
    }
    
    await updateDoc(planDoc, updateData);
    return await this.getDrillPlan(id).then(result => result ? result : undefined);
  }

  async deleteDrillPlan(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(this.plansCollection, id));
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
    const docRef = await addDoc(this.filesCollection, {
      ...file,
      uploadedAt: serverTimestamp()
    });
    
    return convertFirebaseFile({
      id: docRef.id,
      ...file,
      uploadedAt: Timestamp.now()
    });
  }

  async getDrillPlanFiles(drillPlanId: string): Promise<DrillPlanFile[]> {
    const q = query(this.filesCollection, where("drillPlanId", "==", drillPlanId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => 
      convertFirebaseFile({ id: doc.id, ...doc.data() })
    );
  }

  async getCommandFiles(commandId: string): Promise<DrillPlanFile[]> {
    const q = query(this.filesCollection, where("commandId", "==", commandId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => 
      convertFirebaseFile({ id: doc.id, ...doc.data() })
    );
  }

  async getFileById(id: string): Promise<DrillPlanFile | undefined> {
    const fileDoc = doc(this.filesCollection, id);
    const docSnap = await getDoc(fileDoc);
    
    return docSnap.exists() 
      ? convertFirebaseFile({ id: docSnap.id, ...docSnap.data() })
      : undefined;
  }

  async deleteDrillPlanFile(id: string): Promise<boolean> {
    try {
      const file = await this.getFileById(id);
      if (file && file.filePath) {
        // Delete from Firebase Storage
        const fileRef = ref(firebaseStorage, file.filePath);
        await deleteObject(fileRef);
      }
      
      await deleteDoc(doc(this.filesCollection, id));
      return true;
    } catch {
      return false;
    }
  }

  // Note methods
  async createCommandNote(note: InsertDrillPlanNote): Promise<DrillPlanNote> {
    const docRef = await addDoc(this.notesCollection, {
      ...note,
      createdAt: serverTimestamp()
    });
    
    return convertFirebaseNote({
      id: docRef.id,
      ...note,
      createdAt: Timestamp.now()
    });
  }

  async getCommandNotes(commandId: string): Promise<DrillPlanNote[]> {
    const q = query(
      this.notesCollection, 
      where("commandId", "==", commandId),
      orderBy("createdAt")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => 
      convertFirebaseNote({ id: doc.id, ...doc.data() })
    );
  }

  async deleteCommandNote(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(this.notesCollection, id));
      return true;
    } catch {
      return false;
    }
  }

  // Command execution history
  async getCommandExecutionHistory(commandId: string): Promise<CommandExecutionHistory[]> {
    const q = query(
      this.historyCollection,
      where("commandId", "==", commandId),
      orderBy("executedAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => 
      convertFirebaseHistory({ id: doc.id, ...doc.data() })
    );
  }

  async getLastExecutionByFlight(commandId: string, flight: 'alpha' | 'tango'): Promise<CommandExecutionHistory | undefined> {
    const q = query(
      this.historyCollection,
      where("commandId", "==", commandId),
      where("flightType", "==", flight),
      orderBy("executedAt", "desc"),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return undefined;
    
    const doc = querySnapshot.docs[0];
    return convertFirebaseHistory({ id: doc.id, ...doc.data() });
  }

  // Database management (adapted for Firestore)
  async getDatabaseSize(): Promise<number> {
    // Firestore doesn't have direct size queries, return estimated size
    const collections = [
      this.commandsCollection,
      this.plansCollection,
      this.filesCollection,
      this.notesCollection,
      this.historyCollection
    ];
    
    let totalDocs = 0;
    for (const collection of collections) {
      const snapshot = await getDocs(collection);
      totalDocs += snapshot.size;
    }
    
    // Estimate: 1KB average per document
    return totalDocs * 1024;
  }

  async pruneOldData(): Promise<void> {
    // For Firestore, we'll implement a simple pruning strategy
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