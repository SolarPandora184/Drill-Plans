import { sql, relations } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  timestamp, 
  uuid, 
  pgEnum,
  integer,
  boolean
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const flightTypeEnum = pgEnum('flight_type', ['alpha', 'tango', 'both']);
export const eventTypeEnum = pgEnum('event_type', ['drill', 'class']);

// Tables
export const drillCommands = pgTable("drill_commands", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: eventTypeEnum("type").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const drillPlans = pgTable("drill_plans", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  flightAssignment: flightTypeEnum("flight_assignment").notNull(),
  commandId: uuid("command_id").notNull().references(() => drillCommands.id),
  eventType: eventTypeEnum("event_type").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const drillPlanFiles = pgTable("drill_plan_files", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  drillPlanId: uuid("drill_plan_id").references(() => drillPlans.id, { onDelete: 'cascade' }),
  commandId: uuid("command_id").references(() => drillCommands.id, { onDelete: 'cascade' }),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().default(sql`now()`),
});

export const drillPlanNotes = pgTable("drill_plan_notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  commandId: uuid("command_id").notNull().references(() => drillCommands.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  authorName: text("author_name").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const commandExecutionHistory = pgTable("command_execution_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  commandId: uuid("command_id").notNull().references(() => drillCommands.id, { onDelete: 'cascade' }),
  drillPlanId: uuid("drill_plan_id").notNull().references(() => drillPlans.id, { onDelete: 'cascade' }),
  flightType: flightTypeEnum("flight_type").notNull(),
  executedAt: timestamp("executed_at").notNull(),
});

// Relations
export const drillCommandsRelations = relations(drillCommands, ({ many }) => ({
  drillPlans: many(drillPlans),
  files: many(drillPlanFiles),
  notes: many(drillPlanNotes),
  executionHistory: many(commandExecutionHistory),
}));

export const drillPlansRelations = relations(drillPlans, ({ one, many }) => ({
  command: one(drillCommands, {
    fields: [drillPlans.commandId],
    references: [drillCommands.id],
  }),
  files: many(drillPlanFiles),
  executionHistory: many(commandExecutionHistory),
}));

export const drillPlanFilesRelations = relations(drillPlanFiles, ({ one }) => ({
  drillPlan: one(drillPlans, {
    fields: [drillPlanFiles.drillPlanId],
    references: [drillPlans.id],
  }),
  command: one(drillCommands, {
    fields: [drillPlanFiles.commandId],
    references: [drillCommands.id],
  }),
}));

export const drillPlanNotesRelations = relations(drillPlanNotes, ({ one }) => ({
  command: one(drillCommands, {
    fields: [drillPlanNotes.commandId],
    references: [drillCommands.id],
  }),
}));

export const commandExecutionHistoryRelations = relations(commandExecutionHistory, ({ one }) => ({
  command: one(drillCommands, {
    fields: [commandExecutionHistory.commandId],
    references: [drillCommands.id],
  }),
  drillPlan: one(drillPlans, {
    fields: [commandExecutionHistory.drillPlanId],
    references: [drillPlans.id],
  }),
}));

// Insert schemas
export const insertDrillCommandSchema = createInsertSchema(drillCommands).omit({
  id: true,
  createdAt: true,
});

export const insertDrillPlanSchema = createInsertSchema(drillPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDrillPlanFileSchema = createInsertSchema(drillPlanFiles).omit({
  id: true,
  uploadedAt: true,
});

export const insertDrillPlanNoteSchema = createInsertSchema(drillPlanNotes).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertDrillCommand = z.infer<typeof insertDrillCommandSchema>;
export type DrillCommand = typeof drillCommands.$inferSelect;

export type InsertDrillPlan = z.infer<typeof insertDrillPlanSchema>;
export type DrillPlan = typeof drillPlans.$inferSelect;

export type InsertDrillPlanFile = z.infer<typeof insertDrillPlanFileSchema>;
export type DrillPlanFile = typeof drillPlanFiles.$inferSelect;

export type InsertDrillPlanNote = z.infer<typeof insertDrillPlanNoteSchema>;
export type DrillPlanNote = typeof drillPlanNotes.$inferSelect;

export type CommandExecutionHistory = typeof commandExecutionHistory.$inferSelect;

// Legacy user types for compatibility
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
