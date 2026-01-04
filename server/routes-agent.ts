import type { Express, Response } from "express";
import { storage } from "./storage.js";
import { requireAgent } from "./auth.js";

/**
 * Agent-specific routes for merchant onboarding assistance
 * Agents can: create invitation codes, create users, track merchants,
 * add notes, and view analytics
 */
export function registerAgentRoutes(app: Express) {
  
  // ============================================================
  // AGENT NOTES - For tracking merchant interactions
  // ============================================================
  
  // Create note for a merchant
  app.post('/api/agent/notes', requireAgent, async (req: any, res: Response) => {
    try {
      const agentId = req.user.id;
      const { merchantId, noteText, isPriority } = req.body;
      
      if (!merchantId || !noteText) {
        return res.status(400).json({ message: "Merchant ID and note text are required" });
      }
      
      // Verify merchant belongs to this agent
      const client = await storage.getClientByUserId(merchantId);
      if (!client || client.agentId !== agentId) {
        return res.status(403).json({ message: "You can only add notes to your merchants" });
      }
      
      const note = await storage.createAgentNote({
        agentId,
        merchantId,
        noteText,
        isPriority: isPriority || false,
      });
      
      res.status(201).json(note);
    } catch (error) {
      console.error("Error creating agent note:", error);
      res.status(500).json({ message: "Failed to create note" });
    }
  });
  
  // Get notes for a specific merchant
  app.get('/api/agent/notes/:merchantId', requireAgent, async (req: any, res: Response) => {
    try {
      const agentId = req.user.id;
      const { merchantId } = req.params;
      
      // Verify merchant belongs to this agent
      const client = await storage.getClientByUserId(merchantId);
      if (!client || client.agentId !== agentId) {
        return res.status(403).json({ message: "You can only view notes for your merchants" });
      }
      
      const notes = await storage.getAgentNotesByMerchant(merchantId, agentId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching agent notes:", error);
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });
  
  // Update a note
  app.put('/api/agent/notes/:noteId', requireAgent, async (req: any, res: Response) => {
    try {
      const agentId = req.user.id;
      const { noteId } = req.params;
      const { noteText, isPriority } = req.body;
      
      if (!noteText) {
        return res.status(400).json({ message: "Note text is required" });
      }
      
      const note = await storage.updateAgentNote(noteId, noteText, isPriority);
      res.json(note);
    } catch (error) {
      console.error("Error updating agent note:", error);
      res.status(500).json({ message: "Failed to update note" });
    }
  });
  
  // Delete a note
  app.delete('/api/agent/notes/:noteId', requireAgent, async (req: any, res: Response) => {
    try {
      const agentId = req.user.id;
      const { noteId } = req.params;
      
      await storage.deleteAgentNote(noteId, agentId);
      res.json({ message: "Note deleted successfully" });
    } catch (error) {
      console.error("Error deleting agent note:", error);
      res.status(500).json({ message: "Failed to delete note" });
    }
  });
  
  // ============================================================
  // AGENT ANALYTICS - Conversion tracking & performance metrics
  // ============================================================
  
  // Get agent analytics dashboard data
  app.get('/api/agent/analytics', requireAgent, async (req: any, res: Response) => {
    try {
      const agentId = req.user.id;
      
      // Get all merchants for this agent
      const clients = await storage.getClientsByAgentId(agentId);
      
      // Get invitation codes for this agent
      const allCodes = await storage.getAllInvitationCodes();
      const agentCodes = allCodes.filter(code => code.createdBy === agentId);
      
      // Calculate metrics
      const totalInvitationCodes = agentCodes.length;
      const usedCodes = agentCodes.filter(code => code.status === 'USED').length;
      const signupConversionRate = totalInvitationCodes > 0 
        ? (usedCodes / totalInvitationCodes) * 100 
        : 0;
      
      // Onboarding completion metrics
      const totalSignups = clients.length;
      const completedOnboarding = clients.filter(c => c.user.onboardingStep === 'COMPLETE').length;
      const onboardingCompletionRate = totalSignups > 0 
        ? (completedOnboarding / totalSignups) * 100 
        : 0;
      
      // Get application statuses
      const merchantsWithApps = await Promise.all(
        clients.map(async (client) => {
          const apps = await storage.getMerchantApplicationsByClientId(client.id);
          return apps.length > 0 ? apps[apps.length - 1] : null;
        })
      );
      
      const submittedApps = merchantsWithApps.filter(app => 
        app && (app.status === 'SUBMITTED' || app.status === 'APPROVED')
      ).length;
      
      const applicationCompletionRate = totalSignups > 0 
        ? (submittedApps / totalSignups) * 100 
        : 0;
      
      // Time-based metrics (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentSignups = clients.filter(c => 
        c.createdAt && new Date(c.createdAt) >= thirtyDaysAgo
      ).length;
      
      // Priority merchants (needs attention)
      const priorityMerchants = clients.filter(c => {
        const daysSinceCreation = c.createdAt 
          ? Math.floor((Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        return c.user.onboardingStep !== 'COMPLETE' && daysSinceCreation > 3;
      }).length;
      
      res.json({
        overview: {
          totalMerchants: totalSignups,
          completedOnboarding,
          inProgress: totalSignups - completedOnboarding,
          needsAttention: priorityMerchants,
        },
        conversionFunnel: {
          invitationsSent: totalInvitationCodes,
          signups: usedCodes,
          startedApplication: merchantsWithApps.filter(app => app !== null).length,
          submittedApplication: submittedApps,
          signupConversionRate: Math.round(signupConversionRate * 10) / 10,
          onboardingCompletionRate: Math.round(onboardingCompletionRate * 10) / 10,
          applicationCompletionRate: Math.round(applicationCompletionRate * 10) / 10,
        },
        recentActivity: {
          last30Days: recentSignups,
          averageTimeToComplete: null, // Will be calculated when we have completion timestamps
        },
        topPerformers: clients
          .filter(c => c.user.onboardingStep === 'COMPLETE')
          .slice(0, 5)
          .map(c => ({
            merchantId: c.user.id,
            companyName: c.user.companyName || `${c.user.firstName} ${c.user.lastName}`,
            completedAt: c.updatedAt,
          })),
      });
    } catch (error) {
      console.error("Error fetching agent analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });
  
  // ============================================================
  // MERCHANT ACTIVITY TIMELINE
  // ============================================================
  
  // Get activity timeline for a merchant
  app.get('/api/agent/merchants/:merchantId/timeline', requireAgent, async (req: any, res: Response) => {
    try {
      const agentId = req.user.id;
      const { merchantId } = req.params;
      
      // Verify merchant belongs to this agent
      const client = await storage.getClientByUserId(merchantId);
      if (!client || client.agentId !== agentId) {
        return res.status(403).json({ message: "You can only view your merchants" });
      }
      
      // Get merchant user
      const merchant = await storage.getUser(merchantId);
      if (!merchant) {
        return res.status(404).json({ message: "Merchant not found" });
      }
      
      // Build timeline from various sources
      const timeline: any[] = [];
      
      // Account creation
      if (merchant.createdAt) {
        timeline.push({
          type: 'ACCOUNT_CREATED',
          timestamp: merchant.createdAt,
          description: 'Account created',
          icon: 'user-plus',
        });
      }
      
      // Documents
      const documents = await storage.getDocumentsByClientId(client.id);
      documents.forEach(doc => {
        timeline.push({
          type: 'DOCUMENT_UPLOADED',
          timestamp: doc.uploadedAt,
          description: `Uploaded ${doc.documentType.replace(/_/g, ' ')}`,
          icon: 'file-text',
          status: doc.status,
        });
        
        if (doc.reviewedAt) {
          timeline.push({
            type: 'DOCUMENT_REVIEWED',
            timestamp: doc.reviewedAt,
            description: `Document ${doc.status.toLowerCase()}`,
            icon: doc.status === 'APPROVED' ? 'check-circle' : 'x-circle',
            status: doc.status,
          });
        }
      });
      
      // Applications
      const applications = await storage.getMerchantApplicationsByClientId(client.id);
      applications.forEach(app => {
        timeline.push({
          type: 'APPLICATION_CREATED',
          timestamp: app.createdAt,
          description: 'Started merchant application',
          icon: 'credit-card',
        });
        
        if (app.submittedAt) {
          timeline.push({
            type: 'APPLICATION_SUBMITTED',
            timestamp: app.submittedAt,
            description: 'Application submitted for review',
            icon: 'send',
          });
        }
      });
      
      // Agent notes
      const notes = await storage.getAgentNotesByMerchant(merchantId, agentId);
      notes.forEach(note => {
        timeline.push({
          type: 'AGENT_NOTE',
          timestamp: note.createdAt,
          description: note.noteText,
          icon: 'message-square',
          isPriority: note.isPriority,
        });
      });
      
      // Sort by timestamp (most recent first)
      timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      res.json(timeline);
    } catch (error) {
      console.error("Error fetching merchant timeline:", error);
      res.status(500).json({ message: "Failed to fetch timeline" });
    }
  });
  
  // ============================================================
  // CSV EXPORT
  // ============================================================
  
  // Export merchants to CSV
  app.get('/api/agent/merchants/export/csv', requireAgent, async (req: any, res: Response) => {
    try {
      const agentId = req.user.id;
      
      // Get all merchants for this agent
      const clients = await storage.getClientsByAgentId(agentId);
      
      // Build CSV data
      const csvRows = ['Company Name,Contact Name,Email,Onboarding Step,Status,Created Date,Days Since Signup'];
      
      for (const client of clients) {
        const daysSinceSignup = client.createdAt 
          ? Math.floor((Date.now() - new Date(client.createdAt).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
          
        const row = [
          client.user.companyName || '',
          `${client.user.firstName || ''} ${client.user.lastName || ''}`.trim(),
          client.user.email,
          client.user.onboardingStep || 'PART1',
          client.status || 'PENDING',
          client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '',
          daysSinceSignup.toString(),
        ];
        
        csvRows.push(row.map(field => `"${field}"`).join(','));
      }
      
      const csv = csvRows.join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="merchants-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting merchants:", error);
      res.status(500).json({ message: "Failed to export merchants" });
    }
  });
}

