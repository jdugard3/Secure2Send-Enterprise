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

interface DocumentApprovedEmailProps {
  firstName: string;
  documentType: string;
  documentName: string;
  appUrl: string;
}

export const DocumentApprovedEmail = ({
  firstName,
  documentType,
  documentName,
  appUrl,
}: DocumentApprovedEmailProps) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>🔒 Secure2Send</Text>
            <Text style={tagline}>Professional Compliance Made Simple</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={title}>✅ Document Approved!</Text>
            
            <Text style={greeting}>
              Hi {firstName},
            </Text>
            
            <Text style={paragraph}>
              Great news! Your document has been reviewed and <strong>approved</strong> by our compliance team.
            </Text>

            <Section style={approvedBox}>
              <Text style={approvedIcon}>✅</Text>
              <Text style={approvedTitle}>Document Approved</Text>
              <Text style={documentDetail}>
                <strong>Type:</strong> {documentType}
              </Text>
              <Text style={documentDetail}>
                <strong>File:</strong> {documentName}
              </Text>
              <Text style={documentDetail}>
                <strong>Status:</strong> <span style={approvedStatus}>Approved</span>
              </Text>
              <Text style={documentDetail}>
                <strong>Approved:</strong> {new Date().toLocaleDateString()}
              </Text>
            </Section>

            <Text style={paragraph}>
              This document is now part of your complete compliance package. You can download it at any time from your dashboard.
            </Text>

            <Text style={paragraph}>
              <strong>What's next?</strong>
            </Text>

            <ul style={list}>
              <li style={listItem}>Continue uploading any remaining required documents</li>
              <li style={listItem}>Track your overall compliance progress</li>
              <li style={listItem}>Download approved documents when needed</li>
              <li style={listItem}>You'll be notified when all documents are complete</li>
            </ul>

            <Section style={buttonContainer}>
              <Button style={button} href={`${appUrl}/documents`}>
                View All Documents
              </Button>
            </Section>

            <Text style={paragraph}>
              Thank you for using Secure2Send. We're here to help you stay compliant every step of the way.
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
  color: '#059669',
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

const approvedBox = {
  backgroundColor: '#f0fdf4',
  border: '2px solid #22c55e',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const approvedIcon = {
  fontSize: '48px',
  margin: '0 0 16px',
};

const approvedTitle = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#059669',
  margin: '0 0 16px',
};

const documentDetail = {
  fontSize: '16px',
  color: '#166534',
  margin: '0 0 8px',
  textAlign: 'left' as const,
};

const approvedStatus = {
  color: '#059669',
  fontWeight: 'bold',
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

export default DocumentApprovedEmail;
