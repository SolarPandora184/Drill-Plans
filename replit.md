# Overview

This is a web application for managing military drill plans. The system allows users to create, schedule, and track drill plans for Alpha Flight and Tango Flight. It features a calendar-based interface for visualizing scheduled drills, comprehensive drill command management with execution history tracking, file upload capabilities, and note-taking functionality. The application is built with a modern full-stack architecture using React, TypeScript, Express, and PostgreSQL.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **UI Library**: Shadcn/ui components built on top of Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

## Backend Architecture
- **Runtime**: Node.js with Express.js web framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **File Uploads**: Multer middleware for handling multipart form data
- **Development**: Vite development server with hot module replacement

## Data Storage
- **Primary Database**: PostgreSQL with Neon serverless database
- **ORM**: Drizzle with schema-first approach using PostgreSQL dialect
- **File Storage**: Local file system storage in uploads directory
- **Schema Management**: Drizzle Kit for migrations and schema management

## Database Schema Design
- **drill_commands**: Core command templates with metadata
- **drill_plans**: Scheduled instances of commands with date/flight assignments
- **drill_plan_files**: File attachments linked to plans or commands
- **drill_plan_notes**: Timestamped notes with author tracking
- **command_execution_history**: Flight-specific execution tracking
- **users**: User management (legacy support)

## API Architecture
- **Pattern**: RESTful API with Express routes
- **Validation**: Zod schemas for request/response validation
- **Error Handling**: Centralized error middleware
- **File Handling**: Multipart form data support for file uploads
- **CRUD Operations**: Full create, read, update, delete operations for all entities

## Key Features
- **Calendar View**: Tuesday-focused calendar showing drill schedules
- **Command Management**: Reusable drill command templates with history
- **Flight Tracking**: Separate tracking for Alpha and Tango flight executions
- **File Management**: Upload, preview, and download capabilities
- **Notes System**: Collaborative note-taking with history
- **Duplication**: Ability to copy drill plans to new dates
- **Export**: Excel/CSV export functionality

# External Dependencies

## Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database ORM
- **drizzle-zod**: Schema validation integration
- **express**: Web application framework
- **vite**: Build tool and development server

## UI and Styling
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **clsx**: Conditional className utility

## Form and Data Management
- **@tanstack/react-query**: Server state management and caching
- **react-hook-form**: Form handling and validation
- **@hookform/resolvers**: Form validation resolvers
- **zod**: Schema validation library

## File and Date Handling
- **multer**: File upload middleware
- **date-fns**: Date manipulation and formatting
- **@types/multer**: TypeScript definitions for multer

## Development Tools
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production
- **@replit/vite-plugin-runtime-error-modal**: Development error handling
- **@replit/vite-plugin-cartographer**: Replit-specific development tools