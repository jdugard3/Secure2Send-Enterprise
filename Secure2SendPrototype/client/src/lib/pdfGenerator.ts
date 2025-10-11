import { MerchantApplicationForm } from "./merchantApplicationSchemas";

// Simple PDF generation utility using the browser's print functionality
export class PDFGenerator {
  static generateMerchantApplicationPDF(application: MerchantApplicationForm, applicationId: string) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window. Please check popup blockers.');
    }

    const html = this.generateApplicationHTML(application, applicationId);
    
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for content to load then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  }

  private static generateApplicationHTML(application: MerchantApplicationForm, applicationId: string): string {
    const currentDate = new Date().toLocaleDateString();
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Merchant Application - ${application.legalBusinessName || 'Draft'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.4;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: bold;
            }
            .header p {
              margin: 5px 0;
              color: #666;
            }
            .section {
              margin-bottom: 30px;
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              background: #f5f5f5;
              padding: 10px;
              margin-bottom: 15px;
              border-left: 4px solid #007bff;
            }
            .field-group {
              display: flex;
              flex-wrap: wrap;
              gap: 20px;
              margin-bottom: 15px;
            }
            .field {
              flex: 1;
              min-width: 200px;
            }
            .field-label {
              font-weight: bold;
              margin-bottom: 3px;
              font-size: 12px;
              color: #555;
            }
            .field-value {
              border-bottom: 1px solid #ccc;
              padding: 5px 0;
              min-height: 20px;
            }
            .checkbox-group {
              display: flex;
              flex-wrap: wrap;
              gap: 15px;
            }
            .checkbox-item {
              display: flex;
              align-items: center;
              gap: 5px;
            }
            .table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            .table th,
            .table td {
              border: 1px solid #ccc;
              padding: 8px;
              text-align: left;
            }
            .table th {
              background: #f5f5f5;
              font-weight: bold;
            }
            .signature-section {
              margin-top: 40px;
              display: flex;
              justify-content: space-between;
            }
            .signature-block {
              width: 45%;
            }
            .signature-line {
              border-bottom: 1px solid #000;
              height: 40px;
              margin-bottom: 5px;
            }
            @media print {
              body { margin: 0; }
              .page-break { page-break-before: always; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Corduro Merchant Application - CRB</h1>
            <p>550 Reserve Street, STE 190, Southlake, Texas 76092</p>
            <p>Application ID: ${applicationId}</p>
            <p>Generated: ${currentDate}</p>
          </div>

          <!-- Business Information -->
          <div class="section">
            <div class="section-title">Business Information</div>
            <div class="field-group">
              <div class="field">
                <div class="field-label">Legal Name of Business</div>
                <div class="field-value">${application.legalBusinessName || ''}</div>
              </div>
              <div class="field">
                <div class="field-label">DBA (Doing Business As)</div>
                <div class="field-value">${application.dbaBusinessName || ''}</div>
              </div>
            </div>
            <div class="field-group">
              <div class="field">
                <div class="field-label">Billing Address</div>
                <div class="field-value">${application.billingAddress || ''}</div>
              </div>
              <div class="field">
                <div class="field-label">Location Address</div>
                <div class="field-value">${application.locationAddress || ''}</div>
              </div>
            </div>
            <div class="field-group">
              <div class="field">
                <div class="field-label">City</div>
                <div class="field-value">${application.city || ''}</div>
              </div>
              <div class="field">
                <div class="field-label">State</div>
                <div class="field-value">${application.state || ''}</div>
              </div>
              <div class="field">
                <div class="field-label">ZIP Code</div>
                <div class="field-value">${application.zip || ''}</div>
              </div>
            </div>
            <div class="field-group">
              <div class="field">
                <div class="field-label">Business Phone</div>
                <div class="field-value">${application.businessPhone || ''}</div>
              </div>
              <div class="field">
                <div class="field-label">Business Fax</div>
                <div class="field-value">${application.businessFaxNumber || ''}</div>
              </div>
              <div class="field">
                <div class="field-label">Customer Service Phone</div>
                <div class="field-value">${application.customerServicePhone || ''}</div>
              </div>
            </div>
            <div class="field-group">
              <div class="field">
                <div class="field-label">Federal Tax ID Number</div>
                <div class="field-value">${application.federalTaxIdNumber || ''}</div>
              </div>
              <div class="field">
                <div class="field-label">Website Address</div>
                <div class="field-value">${application.websiteAddress || ''}</div>
              </div>
            </div>
            <div class="field-group">
              <div class="field">
                <div class="field-label">Contact Name</div>
                <div class="field-value">${application.contactName || ''}</div>
              </div>
              <div class="field">
                <div class="field-label">Contact Phone</div>
                <div class="field-value">${application.contactPhoneNumber || ''}</div>
              </div>
              <div class="field">
                <div class="field-label">Contact Email</div>
                <div class="field-value">${application.contactEmail || ''}</div>
              </div>
            </div>
          </div>

          <!-- Business Description -->
          <div class="section">
            <div class="section-title">Business Description</div>
            <div class="field">
              <div class="field-label">Processing Categories</div>
              <div class="checkbox-group">
                ${this.renderProcessingCategories(application.processingCategories || [])}
              </div>
            </div>
            <div class="field">
              <div class="field-label">Type of Ownership</div>
              <div class="field-value">${application.ownershipType || ''}</div>
            </div>
          </div>

          <!-- Principal Officers -->
          <div class="section">
            <div class="section-title">Owner/Principal Officers</div>
            ${this.renderPrincipalOfficers(application.principalOfficers || [])}
          </div>

          <!-- Settlement/Banking -->
          <div class="section">
            <div class="section-title">Settlement Information</div>
            <div class="field-group">
              <div class="field">
                <div class="field-label">Bank Name</div>
                <div class="field-value">${application.bankName || ''}</div>
              </div>
              <div class="field">
                <div class="field-label">ABA/Routing Number</div>
                <div class="field-value">${application.abaRoutingNumber || ''}</div>
              </div>
            </div>
            <div class="field-group">
              <div class="field">
                <div class="field-label">Account Name</div>
                <div class="field-value">${application.accountName || ''}</div>
              </div>
              <div class="field">
                <div class="field-label">DDA Number</div>
                <div class="field-value">${application.ddaNumber || ''}</div>
              </div>
            </div>
          </div>

          <!-- Beneficial Owners -->
          <div class="section page-break">
            <div class="section-title">Beneficial Ownership Information</div>
            ${this.renderBeneficialOwners(application.beneficialOwners || [])}
          </div>

          <!-- Corporate Resolution -->
          <div class="section">
            <div class="section-title">Corporate Resolution</div>
            <div class="field">
              <div class="field-label">Corporate Resolution Text</div>
              <div class="field-value" style="min-height: 100px; white-space: pre-wrap;">${application.corporateResolution || ''}</div>
            </div>
          </div>

          <!-- Signatures -->
          <div class="signature-section">
            <div class="signature-block">
              <h4>Merchant</h4>
              <div class="field">
                <div class="field-label">Name</div>
                <div class="field-value">${application.merchantName || ''}</div>
              </div>
              <div class="field">
                <div class="field-label">Title</div>
                <div class="field-value">${application.merchantTitle || ''}</div>
              </div>
              <div class="field">
                <div class="field-label">Date</div>
                <div class="field-value">${application.merchantDate || ''}</div>
              </div>
              <div style="margin-top: 20px;">
                <div class="field-label">Signature:</div>
                <div class="signature-line"></div>
              </div>
            </div>
            
            <div class="signature-block">
              <h4>Corduro</h4>
              <div class="field">
                <div class="field-label">Name</div>
                <div class="field-value">_______________________</div>
              </div>
              <div class="field">
                <div class="field-label">Title</div>
                <div class="field-value">_______________________</div>
              </div>
              <div class="field">
                <div class="field-label">Date</div>
                <div class="field-value">_______________________</div>
              </div>
              <div style="margin-top: 20px;">
                <div class="field-label">Signature:</div>
                <div class="signature-line"></div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private static renderProcessingCategories(categories: string[]): string {
    const categoryLabels: Record<string, string> = {
      MOBILE: 'Mobile',
      CARD_NOT_PRESENT_E_COMMERCE: 'Card Not Present (E-Commerce)',
      CARD_PRESENT_RETAIL: 'Card Present (Retail)',
      MAIL_ORDER_TELEPHONE_MOTO: 'Mail Order / Telephone (MOTO)',
      OTHER: 'Other'
    };

    return Object.entries(categoryLabels)
      .map(([key, label]) => 
        `<div class="checkbox-item">
          <input type="checkbox" ${categories.includes(key) ? 'checked' : ''} disabled>
          <span>${label}</span>
        </div>`
      ).join('');
  }

  private static renderPrincipalOfficers(officers: any[]): string {
    return officers.map((officer, index) => `
      <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd;">
        <h4>Principal Officer #${index + 1}</h4>
        <div class="field-group">
          <div class="field">
            <div class="field-label">Name</div>
            <div class="field-value">${officer.name || ''}</div>
          </div>
          <div class="field">
            <div class="field-label">Title</div>
            <div class="field-value">${officer.title || ''}</div>
          </div>
          <div class="field">
            <div class="field-label">SSN</div>
            <div class="field-value">${officer.ssn || ''}</div>
          </div>
        </div>
        <div class="field-group">
          <div class="field">
            <div class="field-label">Date of Birth</div>
            <div class="field-value">${officer.dob || ''}</div>
          </div>
          <div class="field">
            <div class="field-label">Equity %</div>
            <div class="field-value">${officer.equityPercentage || ''}%</div>
          </div>
        </div>
        <div class="field">
          <div class="field-label">Residential Address</div>
          <div class="field-value">${officer.residentialAddress || ''}</div>
        </div>
        <div class="field-group">
          <div class="field">
            <div class="field-label">City</div>
            <div class="field-value">${officer.city || ''}</div>
          </div>
          <div class="field">
            <div class="field-label">State</div>
            <div class="field-value">${officer.state || ''}</div>
          </div>
          <div class="field">
            <div class="field-label">ZIP</div>
            <div class="field-value">${officer.zip || ''}</div>
          </div>
          <div class="field">
            <div class="field-label">Phone</div>
            <div class="field-value">${officer.phoneNumber || ''}</div>
          </div>
        </div>
      </div>
    `).join('');
  }

  private static renderBeneficialOwners(owners: any[]): string {
    return owners.map((owner, index) => `
      <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd;">
        <h4>Beneficial Owner #${index + 1}</h4>
        <div class="field-group">
          <div class="field">
            <div class="field-label">Name</div>
            <div class="field-value">${owner.name || ''}</div>
          </div>
          <div class="field">
            <div class="field-label">SSN</div>
            <div class="field-value">${owner.ssn || ''}</div>
          </div>
          <div class="field">
            <div class="field-label">Ownership %</div>
            <div class="field-value">${owner.ownershipPercentage || ''}%</div>
          </div>
        </div>
        <div class="field-group">
          <div class="field">
            <div class="field-label">Date of Birth</div>
            <div class="field-value">${owner.dob || ''}</div>
          </div>
          <div class="field">
            <div class="field-label">Title</div>
            <div class="field-value">${owner.title || ''}</div>
          </div>
          <div class="field">
            <div class="field-label">Email</div>
            <div class="field-value">${owner.email || ''}</div>
          </div>
        </div>
        <div class="field">
          <div class="field-label">Residential Address</div>
          <div class="field-value">${owner.residentialAddress || ''}</div>
        </div>
        <div class="field-group">
          <div class="field">
            <div class="field-label">City</div>
            <div class="field-value">${owner.city || ''}</div>
          </div>
          <div class="field">
            <div class="field-label">State</div>
            <div class="field-value">${owner.state || ''}</div>
          </div>
          <div class="field">
            <div class="field-label">ZIP</div>
            <div class="field-value">${owner.zip || ''}</div>
          </div>
          <div class="field">
            <div class="field-label">Phone</div>
            <div class="field-value">${owner.phoneNumber || ''}</div>
          </div>
        </div>
        <div class="field-group">
          <div class="field">
            <div class="field-label">ID Type</div>
            <div class="field-value">${owner.idType || ''}</div>
          </div>
          <div class="field">
            <div class="field-label">ID Number</div>
            <div class="field-value">${owner.idNumber || ''}</div>
          </div>
          <div class="field">
            <div class="field-label">ID State</div>
            <div class="field-value">${owner.idState || ''}</div>
          </div>
          <div class="field">
            <div class="field-label">ID Exp Date</div>
            <div class="field-value">${owner.idExpDate || ''}</div>
          </div>
        </div>
      </div>
    `).join('');
  }
}
