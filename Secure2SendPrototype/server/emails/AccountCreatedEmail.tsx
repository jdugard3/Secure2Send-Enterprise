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

interface AccountCreatedEmailProps {
  firstName: string;
  companyName: string;
  email: string;
  temporaryPassword: string;
  appUrl: string;
}

export const AccountCreatedEmail = ({
  firstName,
  companyName,
  email,
  temporaryPassword,
  appUrl,
}: AccountCreatedEmailProps) => {
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
            <Text style={title}>Your Account Has Been Created</Text>
            
            <Text style={greeting}>
              Hi {firstName},
            </Text>
            
            <Text style={paragraph}>
              Your Secure2Send account has been created by our admin team. You can now access the platform to manage your cannabis compliance documents.
            </Text>

            {companyName && (
              <Text style={paragraph}>
                This account has been set up for <strong>{companyName}</strong>.
              </Text>
            )}

            <Section style={credentialsBox}>
              <Text style={credentialsTitle}>Your Login Credentials:</Text>
              <Text style={credentialItem}>
                <strong>Email:</strong> {email}
              </Text>
              <Text style={credentialItem}>
                <strong>Temporary Password:</strong> {temporaryPassword}
              </Text>
            </Section>

            <Text style={importantNote}>
              <strong>Important:</strong> Please change your password after your first login for security purposes.
            </Text>

            <Text style={paragraph}>
              Once logged in, you'll be able to:
            </Text>

            <ul style={list}>
              <li style={listItem}>Upload your required compliance documents</li>
              <li style={listItem}>Track your document approval status</li>
              <li style={listItem}>Receive notifications when documents are reviewed</li>
              <li style={listItem}>Download approved documents when ready</li>
            </ul>

            <Section style={buttonContainer}>
              <Button style={button} href={`${appUrl}/login`}>
                Log In to Your Account
              </Button>
            </Section>

            <Text style={paragraph}>
              If you have any questions or need assistance, please contact our support team.
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

const credentialsBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const credentialsTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: '0 0 12px',
};

const credentialItem = {
  fontSize: '16px',
  color: '#374151',
  margin: '0 0 8px',
  fontFamily: 'monospace',
};

const importantNote = {
  backgroundColor: '#fef3c7',
  border: '1px solid #f59e0b',
  borderRadius: '8px',
  padding: '16px',
  fontSize: '16px',
  color: '#92400e',
  margin: '24px 0',
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

export default AccountCreatedEmail;
