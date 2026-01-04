/**
 * Auto-Apply Extracted Data Service
 * 
 * Automatically applies extracted OCR data to merchant applications
 * regardless of confidence score. User reviews all data before submission.
 */

import { storage } from "../storage";
import { PIIProtectionService } from "./piiProtectionService";
import { AuditService } from "./auditService";
import type { Request } from "express";
import type { InsertMerchantApplication } from "../../shared/schema";

/**
 * Apply extracted data to merchant application automatically
 * Applies all data regardless of confidence score (user reviews before submission)
 */
export async function autoApplyExtractedData(
  extractedDataId: string,
  merchantApplicationId: string,
  userId: string,
  confidenceScore: number | undefined,
  req?: Request
): Promise<boolean> {
  try {
    // Apply all extracted data regardless of confidence score
    // User will review and verify all data in Step 3 (Review) before submission
    console.log(`📝 Auto-applying extracted data with confidence score: ${confidenceScore || 'unknown'} (no threshold - user reviews before submission)`);

    // Get extracted data
    const extractedData = await storage.getExtractedDocumentDataById(extractedDataId);
    if (!extractedData) {
      console.error(`❌ Extracted data not found: ${extractedDataId}`);
      return false;
    }

    // Verify it belongs to the merchant application
    if (extractedData.merchantApplicationId !== merchantApplicationId) {
      console.error(`❌ Extracted data does not belong to merchant application: ${merchantApplicationId}`);
      return false;
    }

    // Get user for audit logging
    const user = await storage.getUser(userId);
    if (!user) {
      console.error(`❌ User not found: ${userId}`);
      return false;
    }

    // Decrypt sensitive fields to get full data
    const publicData = extractedData.extractedDataPublic as Record<string, any>;
    const encryptedFields = extractedData.encryptedFields as Record<string, string>;
    const fullData = PIIProtectionService.decryptAndMerge(publicData, encryptedFields);

    // Get merchant application
    const merchantApplication = await storage.getMerchantApplicationById(merchantApplicationId);
    if (!merchantApplication) {
      console.error(`❌ Merchant application not found: ${merchantApplicationId}`);
      return false;
    }

    // Map extracted fields to merchant application fields
    // Only include fields that have values and are not already set
    const updateData: Partial<InsertMerchantApplication> = {};
    const appliedFields: string[] = [];

    // Business Information
    if (fullData.legalBusinessName && !merchantApplication.legalBusinessName) {
      updateData.legalBusinessName = fullData.legalBusinessName;
      appliedFields.push('legalBusinessName');
    }
    if (fullData.dbaBusinessName && !merchantApplication.dbaBusinessName) {
      updateData.dbaBusinessName = fullData.dbaBusinessName;
      appliedFields.push('dbaBusinessName');
    }
    if (fullData.businessAddress && !merchantApplication.billingAddress) {
      updateData.billingAddress = fullData.businessAddress;
      appliedFields.push('billingAddress');
    }
    if ((fullData.locationAddress || fullData.businessAddress) && !merchantApplication.locationAddress) {
      updateData.locationAddress = fullData.locationAddress || fullData.businessAddress;
      appliedFields.push('locationAddress');
    }
    if (fullData.city && !merchantApplication.city) {
      updateData.city = fullData.city;
      appliedFields.push('city');
    }
    if (fullData.state && !merchantApplication.state) {
      updateData.state = fullData.state;
      appliedFields.push('state');
    }
    if (fullData.zip && !merchantApplication.zip) {
      updateData.zip = fullData.zip;
      appliedFields.push('zip');
    }
    if (fullData.federalTaxIdNumber && !merchantApplication.federalTaxIdNumber) {
      updateData.federalTaxIdNumber = fullData.federalTaxIdNumber;
      appliedFields.push('federalTaxIdNumber');
    }

    // Banking Information
    if (fullData.bankName && !merchantApplication.bankName) {
      updateData.bankName = fullData.bankName;
      appliedFields.push('bankName');
    }
    if (fullData.routingNumber && !merchantApplication.abaRoutingNumber) {
      updateData.abaRoutingNumber = fullData.routingNumber;
      appliedFields.push('abaRoutingNumber');
    }
    if (fullData.accountNumber && !merchantApplication.ddaNumber) {
      updateData.ddaNumber = fullData.accountNumber;
      appliedFields.push('ddaNumber');
    }
    if (fullData.accountHolderName && !merchantApplication.accountName) {
      updateData.accountName = fullData.accountHolderName;
      updateData.nameOnBankAccount = fullData.accountHolderName;
      appliedFields.push('accountName');
    }

    // Business Metrics (from bank statements)
    if (fullData.monthlySalesVolume && !merchantApplication.monthlySalesVolume) {
      updateData.monthlySalesVolume = fullData.monthlySalesVolume?.toString() || null;
      appliedFields.push('monthlySalesVolume');
    }
    if (fullData.averageTicket && !merchantApplication.averageTicket) {
      updateData.averageTicket = fullData.averageTicket?.toString() || null;
      appliedFields.push('averageTicket');
    }
    if (fullData.highTicket && !merchantApplication.highTicket) {
      updateData.highTicket = fullData.highTicket?.toString() || null;
      appliedFields.push('highTicket');
    }

    // Incorporation Information
    if (fullData.incorporationState && !merchantApplication.incorporationState) {
      updateData.incorporationState = fullData.incorporationState;
      appliedFields.push('incorporationState');
    }
    if (fullData.incorporationDate && !merchantApplication.entityStartDate) {
      updateData.entityStartDate = new Date(fullData.incorporationDate);
      appliedFields.push('entityStartDate');
    }
    if (fullData.ownershipType && !merchantApplication.ownershipType) {
      updateData.ownershipType = fullData.ownershipType;
      appliedFields.push('ownershipType');
    }

    // Only update if there are fields to apply
    if (appliedFields.length === 0) {
      console.log(`⏭️  No new fields to auto-apply for extracted data: ${extractedDataId}`);
      // Still mark as reviewed even if no fields were applied
      await storage.updateExtractedDocumentDataReviewed(extractedDataId, true);
      return false;
    }

    // Update merchant application
    await storage.updateMerchantApplication(merchantApplicationId, updateData);

    // Mark extracted data as reviewed and applied
    await storage.updateExtractedDocumentDataReviewed(extractedDataId, true);
    await storage.updateExtractedDocumentDataApplied(extractedDataId, true);

    console.log(`✅ Auto-applied ${appliedFields.length} fields to merchant application: ${merchantApplicationId}`);

    // Audit log auto-application
    if (req) {
      try {
        await AuditService.logAction(user, 'OCR_DATA_APPLIED', req, {
          resourceType: 'merchant_application',
          resourceId: merchantApplicationId,
          metadata: {
            extractedDataId,
            fieldsApplied: appliedFields,
            autoApplied: true,
            confidenceScore,
          },
        });
      } catch (auditError) {
        console.error('Failed to log auto-apply audit:', auditError);
      }
    }

    return true;
  } catch (error) {
    console.error(`❌ Failed to auto-apply extracted data ${extractedDataId}:`, error);
    // Don't throw - auto-apply failures should be silent
    return false;
  }
}

