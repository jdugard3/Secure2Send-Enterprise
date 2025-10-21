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

interface DocumentRejectedEmailProps {
  firstName: string;
  documentType: string;
  documentName: string;
  rejectionReason: string;
  appUrl: string;
}

export const DocumentRejectedEmail = ({
  firstName,
  documentType,
  documentName,
  rejectionReason,
  appUrl,
}: DocumentRejectedEmailProps) => {
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
            <Text style={title}>Document Requires Attention</Text>
            
            <Text style={greeting}>
              Hi {firstName},
            </Text>
            
            <Text style={paragraph}>
              We've reviewed your document submission and need some adjustments before we can approve it.
            </Text>

            <Section style={rejectedBox}>
              <Text style={rejectedIcon}>⚠️</Text>
              <Text style={rejectedTitle}>Action Required</Text>
              <Text style={documentDetail}>
                <strong>Type:</strong> {documentType}
              </Text>
              <Text style={documentDetail}>
                <strong>File:</strong> {documentName}
              </Text>
              <Text style={documentDetail}>
                <strong>Status:</strong> <span style={rejectedStatus}>Needs Revision</span>
              </Text>
              <Text style={documentDetail}>
                <strong>Reviewed:</strong> {new Date().toLocaleDateString()}
              </Text>
            </Section>

            <Section style={reasonBox}>
              <Text style={reasonTitle}>Feedback from our compliance team:</Text>
              <Text style={reasonText}>{rejectionReason}</Text>
            </Section>

            <Text style={paragraph}>
              <strong>Next steps:</strong>
            </Text>

            <ul style={list}>
              <li style={listItem}>Review the feedback above carefully</li>
              <li style={listItem}>Make the necessary corrections to your document</li>
              <li style={listItem}>Upload the revised document through your dashboard</li>
              <li style={listItem}>Our team will review it again promptly</li>
            </ul>

            <Text style={paragraph}>
              Don't worry - this is a normal part of the compliance process. Our team is here to help ensure your documents meet all requirements.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={`${appUrl}/documents`}>
                Upload Revised Document
              </Button>
            </Section>

            <Text style={paragraph}>
              If you have questions about the feedback or need assistance, please don't hesitate to contact our support team.
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
  color: '#dc2626',
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

const rejectedBox = {
  backgroundColor: '#fef2f2',
  border: '2px solid #f87171',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const rejectedIcon = {
  fontSize: '48px',
  margin: '0 0 16px',
};

const rejectedTitle = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#dc2626',
  margin: '0 0 16px',
};

const documentDetail = {
  fontSize: '16px',
  color: '#991b1b',
  margin: '0 0 8px',
  textAlign: 'left' as const,
};

const rejectedStatus = {
  color: '#dc2626',
  fontWeight: 'bold',
};

const reasonBox = {
  backgroundColor: '#fffbeb',
  border: '1px solid #f59e0b',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const reasonTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#92400e',
  margin: '0 0 12px',
};

const reasonText = {
  fontSize: '16px',
  color: '#92400e',
  lineHeight: '1.6',
  fontStyle: 'italic',
  margin: '0',
  padding: '12px',
  backgroundColor: '#ffffff',
  borderRadius: '6px',
  border: '1px solid #fbbf24',
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

export default DocumentRejectedEmail;
