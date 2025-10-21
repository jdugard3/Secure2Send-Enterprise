import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Link,
} from '@react-email/components';

interface NewDocumentNotificationEmailProps {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  documentType: string;
  documentName: string;
  uploadDate: string;
  appUrl: string;
}

export const NewDocumentNotificationEmail = ({
  firstName,
  lastName,
  email,
  companyName,
  documentType,
  documentName,
  uploadDate,
  appUrl,
}: NewDocumentNotificationEmailProps) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>🔒 Secure2Send</Text>
            <Text style={tagline}>Admin Notification</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={title}>New Document for Review</Text>
            
            <Text style={greeting}>
              Hello Admin,
            </Text>
            
            <Text style={paragraph}>
              A new compliance document has been uploaded and is waiting for your review.
            </Text>

            <Section style={userBox}>
              <Text style={userTitle}>User Information</Text>
              <Text style={userDetail}>
                <strong>Name:</strong> {firstName} {lastName}
              </Text>
              <Text style={userDetail}>
                <strong>Email:</strong> {email}
              </Text>
              <Text style={userDetail}>
                <strong>Company:</strong> {companyName}
              </Text>
            </Section>

            <Section style={documentBox}>
              <Text style={documentTitle}>Document Details</Text>
              <Text style={documentDetail}>
                <strong>Type:</strong> {documentType}
              </Text>
              <Text style={documentDetail}>
                <strong>File Name:</strong> {documentName}
              </Text>
              <Text style={documentDetail}>
                <strong>Upload Date:</strong> {uploadDate}
              </Text>
              <Text style={documentDetail}>
                <strong>Status:</strong> <span style={pendingStatus}>Pending Review</span>
              </Text>
            </Section>

            <Text style={paragraph}>
              <strong>Required Actions:</strong>
            </Text>

            <ul style={list}>
              <li style={listItem}>Review the uploaded document for compliance</li>
              <li style={listItem}>Verify all required information is present</li>
              <li style={listItem}>Approve the document or provide feedback for revision</li>
              <li style={listItem}>Update the document status in the system</li>
            </ul>

            <Text style={urgentNote}>
              <strong>⏰ Review Priority:</strong> Documents are reviewed in the order they are received. 
              Please process this document within 2-3 business days to maintain service quality.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={`${appUrl}/admin`}>
                Review Document Now
              </Button>
            </Section>

            <Text style={paragraph}>
              You can access the document and manage its status through the admin dashboard.
            </Text>

            <Text style={signature}>
              Secure2Send System<br />
              Automated Notification
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This is an automated notification from Secure2Send admin system.
            </Text>
            <Text style={footerText}>
              <Link href={appUrl} style={footerLink}>Visit Secure2Send</Link> | 
              <Link href={`${appUrl}/admin`} style={footerLink}> Admin Dashboard</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 24px 0',
  textAlign: 'center' as const,
};

const logo = {
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#2563eb',
  margin: '0 0 8px',
};

const tagline = {
  fontSize: '16px',
  color: '#6b7280',
  margin: '0 0 32px',
  fontWeight: '600',
};

const content = {
  padding: '0 24px',
};

const title = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#111827',
  margin: '0 0 24px',
  textAlign: 'center' as const,
};

const greeting = {
  fontSize: '16px',
  color: '#374151',
  margin: '0 0 16px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#374151',
  margin: '0 0 16px',
};

const userBox = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #0ea5e9',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0 16px',
};

const userTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#0c4a6e',
  margin: '0 0 12px',
};

const userDetail = {
  fontSize: '16px',
  color: '#0c4a6e',
  margin: '0 0 8px',
};

const documentBox = {
  backgroundColor: '#fef3c7',
  border: '2px solid #f59e0b',
  borderRadius: '12px',
  padding: '24px',
  margin: '16px 0 24px',
};

const documentTitle = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#92400e',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const documentDetail = {
  fontSize: '16px',
  color: '#92400e',
  margin: '0 0 8px',
};

const pendingStatus = {
  color: '#f59e0b',
  fontWeight: 'bold',
};

const urgentNote = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fca5a5',
  borderRadius: '8px',
  padding: '16px',
  fontSize: '16px',
  color: '#991b1b',
  margin: '24px 0',
  lineHeight: '1.6',
};

const list = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#374151',
  margin: '0 0 24px',
  paddingLeft: '20px',
};

const listItem = {
  margin: '0 0 8px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#dc2626',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  border: 'none',
};

const signature = {
  fontSize: '16px',
  color: '#6b7280',
  margin: '24px 0 0',
  lineHeight: '1.6',
  fontStyle: 'italic',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
};

const footer = {
  padding: '0 24px',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0 0 8px',
  lineHeight: '1.5',
};

const footerLink = {
  color: '#2563eb',
  textDecoration: 'none',
  margin: '0 8px',
};

export default NewDocumentNotificationEmail;
