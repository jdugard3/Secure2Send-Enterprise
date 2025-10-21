import { relations } from "drizzle-orm/relations";
import { users, auditLogs, clients, documents, sensitiveData, merchantApplications } from "./schema";

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	user: one(users, {
		fields: [auditLogs.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	auditLogs: many(auditLogs),
	sensitiveData: many(sensitiveData),
	clients: many(clients),
	merchantApplications: many(merchantApplications),
}));

export const documentsRelations = relations(documents, ({one}) => ({
	client: one(clients, {
		fields: [documents.clientId],
		references: [clients.id]
	}),
}));

export const clientsRelations = relations(clients, ({one, many}) => ({
	documents: many(documents),
	sensitiveData: many(sensitiveData),
	user: one(users, {
		fields: [clients.userId],
		references: [users.id]
	}),
	merchantApplications: many(merchantApplications),
}));

export const sensitiveDataRelations = relations(sensitiveData, ({one}) => ({
	user: one(users, {
		fields: [sensitiveData.userId],
		references: [users.id]
	}),
	client: one(clients, {
		fields: [sensitiveData.clientId],
		references: [clients.id]
	}),
}));

export const merchantApplicationsRelations = relations(merchantApplications, ({one}) => ({
	client: one(clients, {
		fields: [merchantApplications.clientId],
		references: [clients.id]
	}),
	user: one(users, {
		fields: [merchantApplications.reviewedBy],
		references: [users.id]
	}),
}));