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

interface NewUserNotificationEmailProps {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  registrationDate: string;
  appUrl: string;
}

export const NewUserNotificationEmail = ({
  firstName,
  lastName,
  email,
  companyName,
  registrationDate,
  appUrl,
}: NewUserNotificationEmailProps) => {
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
            <Text style={title}>New User Registration</Text>
            
            <Text style={greeting}>
              Hello Admin,
            </Text>
            
            <Text style={paragraph}>
              A new user has registered on the Secure2Send platform and requires your attention.
            </Text>

            <Section style={userBox}>
              <Text style={userTitle}>New User Details</Text>
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
                <strong>Registration Date:</strong> {registrationDate}
              </Text>
              <Text style={userDetail}>
                <strong>Status:</strong> <span style={pendingStatus}>Pending Review</span>
              </Text>
            </Section>

            <Text style={paragraph}>
              <strong>Required Actions:</strong>
            </Text>

            <ul style={list}>
              <li style={listItem}>Review the user's registration information</li>
              <li style={listItem}>Verify company details and compliance requirements</li>
              <li style={listItem}>Approve or take necessary action on the account</li>
              <li style={listItem}>Monitor their document submission progress</li>
            </ul>

            <Section style={buttonContainer}>
              <Button style={button} href={`${appUrl}/admin`}>
                Review in Admin Dashboard
              </Button>
            </Section>

            <Text style={paragraph}>
              You can manage this user and view their progress in the admin dashboard.
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
  backgroundColor: '#f8fafc',
  border: '2px solid #3b82f6',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
};

const userTitle = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#1e40af',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const userDetail = {
  fontSize: '16px',
  color: '#1e40af',
  margin: '0 0 8px',
};

const pendingStatus = {
  color: '#f59e0b',
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

export default NewUserNotificationEmail;
