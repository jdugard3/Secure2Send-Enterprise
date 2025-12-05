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

interface AllDocumentsCompletedNotificationEmailProps {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  appUrl: string;
  completionDate: string;
}

export const AllDocumentsCompletedNotificationEmail = ({
  firstName,
  lastName,
  email,
  companyName,
  appUrl,
  completionDate,
}: AllDocumentsCompletedNotificationEmailProps) => {
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
            <Text style={title}>🎉 All Required Documents Completed!</Text>

            <Text style={greeting}>
              Hello Admin,
            </Text>

            <Text style={paragraph}>
              Great news! A merchant has successfully uploaded all required compliance documents and is ready for final review and approval.
            </Text>

            <Section style={userBox}>
              <Text style={userTitle}>Merchant Information</Text>
              <Text style={userDetail}>
                <strong>Name:</strong> {firstName} {lastName}
              </Text>
              <Text style={userDetail}>
                <strong>Email:</strong> {email}
              </Text>
              <Text style={userDetail}>
                <strong>Company:</strong> {companyName}
              </Text>
              <Text style={userDetail}>
                <strong>Completion Date:</strong> {completionDate}
              </Text>
            </Section>

            <Section style={successBox}>
              <Text style={successTitle}>✅ Document Status</Text>
              <Text style={successDetail}>
                <strong>All Required Documents:</strong> <span style={completedStatus}>Uploaded & Ready for Review</span>
              </Text>
              <Text style={successDetail}>
                <strong>Next Step:</strong> Final compliance review and approval
              </Text>
            </Section>

            <Text style={paragraph}>
              <strong>Required Actions:</strong>
            </Text>

            <ul style={list}>
              <li style={listItem}>Review all uploaded documents for compliance</li>
              <li style={listItem}>Verify all required information is present and accurate</li>
              <li style={listItem}>Check document quality and completeness</li>
              <li style={listItem}>Approve or reject documents as appropriate</li>
              <li style={listItem}>Process the merchant application for final approval</li>
            </ul>

            <Text style={urgentNote}>
              <strong>🚀 Priority Action Required:</strong> This merchant has completed their document submission and is ready for your final review.
              Please process their application within 2-3 business days.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={`${appUrl}/admin`}>
                Review Complete Application
              </Button>
            </Section>

            <Text style={paragraph}>
              You can access the complete application and all documents through the admin dashboard.
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

const successBox = {
  backgroundColor: '#f0fdf4',
  border: '2px solid #16a34a',
  borderRadius: '12px',
  padding: '24px',
  margin: '16px 0 24px',
};

const successTitle = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#166534',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const successDetail = {
  fontSize: '16px',
  color: '#166534',
  margin: '0 0 8px',
};

const completedStatus = {
  color: '#16a34a',
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
  backgroundColor: '#16a34a',
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

export default AllDocumentsCompletedNotificationEmail;
