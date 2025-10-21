# Overview

This is a full-stack web application for business compliance document management called "Secure2Send". The application provides a streamlined platform for businesses to submit compliance documents and for administrators to review and approve them. It features separate client and admin dashboards with comprehensive document management capabilities including upload, review, approval/rejection workflows, and progress tracking.

## Current Status (January 2025)
✅ **COMPLETE AND FUNCTIONAL** - Custom authentication system implemented
- Professional Secure2Send branding and UI implemented
- **Custom authentication with email/password login system**
- Client and Admin dashboards fully functional
- Document upload system with drag & drop interface operational
- 17 compliance document types supported
- Admin review and approval system working
- Progress tracking for clients implemented
- Database schema deployed and running
- Secure password hashing with bcrypt
- Session-based authentication with PostgreSQL storage

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client-side is built as a React Single Page Application (SPA) using Vite as the build tool. The frontend follows a component-based architecture with:
- **Component Library**: shadcn/ui components built on Radix UI primitives for consistent, accessible UI elements
- **Styling**: Tailwind CSS with CSS custom properties for theming support
- **State Management**: TanStack Query (React Query) for server state management with optimistic updates
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form for form state management with validation
- **File Upload**: React Dropzone for drag-and-drop file upload interfaces

## Backend Architecture
The server follows an Express.js REST API architecture with:
- **Web Framework**: Express.js with TypeScript for type safety
- **Database Layer**: Drizzle ORM for type-safe database operations with PostgreSQL
- **File Upload**: Multer middleware for handling multipart form data and file uploads
- **Session Management**: Express sessions with PostgreSQL storage for persistence
- **API Design**: RESTful endpoints with consistent error handling and JSON responses

## Authentication System
Authentication is implemented using a custom email/password system:
- **Provider**: Custom authentication with secure password hashing (bcrypt)
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple and Passport.js
- **Authorization**: Role-based access control with CLIENT and ADMIN roles
- **Middleware**: Passport.js LocalStrategy with custom authentication middleware
- **Security**: Secure password hashing with salt, session-based auth, CSRF protection

## Database Design
The PostgreSQL database uses Drizzle ORM with a normalized schema:
- **Users Table**: Stores user profiles with roles (CLIENT/ADMIN)
- **Clients Table**: Business information and approval status
- **Documents Table**: File metadata, types, and review status
- **Sessions Table**: Server-side session storage for authentication
- **Enums**: Strongly typed status enums for consistency

## File Storage Strategy
Files are stored locally on the server filesystem:
- **Upload Directory**: Dedicated uploads folder with security restrictions
- **File Validation**: MIME type checking and size limits (50MB)
- **Supported Formats**: PDF, JPG, PNG for document uploads
- **Security**: File type validation and secure file serving

# External Dependencies

## Database Infrastructure
- **Neon Database**: PostgreSQL database service via @neondatabase/serverless
- **Connection Pooling**: Built-in connection pooling for scalability

## UI Component System
- **Radix UI**: Comprehensive set of unstyled, accessible UI primitives
- **Shadcn/ui**: Pre-built components with Tailwind CSS styling
- **Tailwind CSS**: Utility-first CSS framework for rapid styling

## Development Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Static type checking across the entire application
- **Drizzle Kit**: Database migration and schema management tools

## File Processing
- **Multer**: Express middleware for handling file uploads
- **React Dropzone**: Drag-and-drop file upload component

## Authentication Provider
- **Custom Auth**: Email/password authentication with bcrypt password hashing
- **Passport.js**: Authentication middleware with LocalStrategy for email/password login

## Session Management
- **Connect PG Simple**: PostgreSQL session store for Express sessions
- **Express Session**: Server-side session management

## Development Environment
- **Replit**: Cloud-based development environment with integrated deployment
- **Replit Cartographer**: Development tooling for Replit environment
- **Replit Runtime Error Modal**: Enhanced error reporting during development