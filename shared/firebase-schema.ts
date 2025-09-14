import { z } from "zod";
import { Timestamp } from "firebase/firestore";

// Enums (same as PostgreSQL schema)
export const flightTypeEnum = z.enum(['alpha', 'tango', 'both']);
export const eventTypeEnum = z.enum(['drill', 'class']);

// Firebase Firestore types (using string IDs and Timestamps)
export interface FirebaseDrillCommand {
  id: string;
  name: string;
  type: z.infer<typeof eventTypeEnum>;
  metadata?: string;
  createdAt: Timestamp;
}

export interface FirebaseDrillPlan {
  id: string;
  date: Timestamp;
  flightAssignment: z.infer<typeof flightTypeEnum>;
  commandId: string;
  eventType: z.infer<typeof eventTypeEnum>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirebaseDrillPlanFile {
  id: string;
  drillPlanId?: string;
  commandId?: string;
  fileName: string;
  filePath: string; // Firebase Storage path
  downloadUrl?: string; // Firebase Storage download URL
  fileSize: number;
  mimeType: string;
  uploadedAt: Timestamp;
}

export interface FirebaseDrillPlanNote {
  id: string;
  commandId: string;
  content: string;
  authorName: string;
  createdAt: Timestamp;
}

export interface FirebaseCommandExecutionHistory {
  id: string;
  commandId: string;
  drillPlanId: string;
  flightType: z.infer<typeof flightTypeEnum>;
  executedAt: Timestamp;
}

// Compatible types that can be used with existing code (converted to Date objects)
export interface DrillCommand {
  id: string;
  name: string;
  type: z.infer<typeof eventTypeEnum>;
  metadata: string | null;
  createdAt: Date;
}

export interface DrillPlan {
  id: string;
  date: Date;
  flightAssignment: z.infer<typeof flightTypeEnum>;
  commandId: string;
  eventType: z.infer<typeof eventTypeEnum>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DrillPlanFile {
  id: string;
  drillPlanId: string | null;
  commandId: string | null;
  fileName: string;
  filePath: string;
  downloadUrl?: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface DrillPlanNote {
  id: string;
  commandId: string;
  content: string;
  authorName: string;
  createdAt: Date;
}

export interface CommandExecutionHistory {
  id: string;
  commandId: string;
  drillPlanId: string;
  flightType: z.infer<typeof flightTypeEnum>;
  executedAt: Date;
}

// Insert schemas for validation (without id and timestamps)
export const insertDrillCommandSchema = z.object({
  name: z.string().min(1),
  type: eventTypeEnum,
  metadata: z.string().optional().nullable(),
});

export const insertDrillPlanSchema = z.object({
  date: z.date(),
  flightAssignment: flightTypeEnum,
  commandId: z.string().min(1),
  eventType: eventTypeEnum,
});

export const insertDrillPlanFileSchema = z.object({
  drillPlanId: z.string().optional().nullable(),
  commandId: z.string().optional().nullable(),
  fileName: z.string().min(1),
  filePath: z.string().min(1),
  fileSize: z.number().min(0),
  mimeType: z.string().min(1),
});

export const insertDrillPlanNoteSchema = z.object({
  commandId: z.string().min(1),
  content: z.string().min(1),
  authorName: z.string().min(1),
});

// Types for inserts
export type InsertDrillCommand = z.infer<typeof insertDrillCommandSchema>;
export type InsertDrillPlan = z.infer<typeof insertDrillPlanSchema>;
export type InsertDrillPlanFile = z.infer<typeof insertDrillPlanFileSchema>;
export type InsertDrillPlanNote = z.infer<typeof insertDrillPlanNoteSchema>;

// Legacy user types for compatibility (not migrating users to Firebase Auth yet)
export interface User {
  id: string;
  username: string;
  password: string;
}

export const insertUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

// Collection names for Firestore
export const COLLECTIONS = {
  DRILL_COMMANDS: 'drillCommands',
  DRILL_PLANS: 'drillPlans',
  DRILL_PLAN_FILES: 'drillPlanFiles',
  DRILL_PLAN_NOTES: 'drillPlanNotes',
  COMMAND_EXECUTION_HISTORY: 'commandExecutionHistory',
  USERS: 'users',
} as const;