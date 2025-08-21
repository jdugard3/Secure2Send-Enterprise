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

interface DocumentUploadedEmailProps {
  firstName: string;
  documentType: string;
  documentName: string;
  appUrl: string;
}

export const DocumentUploadedEmail = ({
  firstName,
  documentType,
  documentName,
  appUrl,
}: DocumentUploadedEmailProps) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>🔒 Secure2Send</Text>
            <Text style={tagline}>Cannabis Compliance Made Simple</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={title}>Document Uploaded Successfully</Text>
            
            <Text style={greeting}>
              Hi {firstName},
            </Text>
            
            <Text style={paragraph}>
              Your document has been successfully uploaded to Secure2Send and is now in the review queue.
            </Text>

            <Section style={documentBox}>
              <Text style={documentTitle}>Document Details:</Text>
              <Text style={documentDetail}>
                <strong>Type:</strong> {documentType}
              </Text>
              <Text style={documentDetail}>
                <strong>File:</strong> {documentName}
              </Text>
              <Text style={documentDetail}>
                <strong>Status:</strong> Pending Review
              </Text>
              <Text style={documentDetail}>
                <strong>Uploaded:</strong> {new Date().toLocaleDateString()}
              </Text>
            </Section>

            <Text style={paragraph}>
              <strong>What happens next?</strong>
            </Text>

            <ul style={list}>
              <li style={listItem}>Our compliance team will review your document</li>
              <li style={listItem}>You'll receive an email notification once the review is complete</li>
              <li style={listItem}>If approved, the document will be marked as completed</li>
              <li style={listItem}>If changes are needed, we'll provide specific feedback</li>
            </ul>

            <Text style={paragraph}>
              You can track the status of all your documents in your dashboard at any time.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={`${appUrl}/documents`}>
                View Document Status
              </Button>
            </Section>

            <Text style={paragraph}>
              Thank you for using Secure2Send to manage your compliance documentation.
            </Text>

            <Text style={signature}>
              Best regards,<br />
              The Secure2Send Team
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This email was sent from Secure2Send. If you have questions, please contact our support team.
            </Text>
            <Text style={footerText}>
              <Link href={appUrl} style={footerLink}>Visit Secure2Send</Link> | 
              <Link href={`${appUrl}/support`} style={footerLink}> Support</Link>
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

const documentBox = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #0ea5e9',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const documentTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#0c4a6e',
  margin: '0 0 12px',
};

const documentDetail = {
  fontSize: '16px',
  color: '#0c4a6e',
  margin: '0 0 8px',
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
  backgroundColor: '#2563eb',
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
  color: '#374151',
  margin: '24px 0 0',
  lineHeight: '1.6',
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

export default DocumentUploadedEmail;
