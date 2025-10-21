import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Link,
} from '@react-email/components';
import * as React from 'react';

interface MfaMethodChangedEmailProps {
  firstName?: string;
  action: 'enabled' | 'disabled';
  method: 'email' | 'authenticator';
  timestamp: Date;
  appUrl: string;
}

export const MfaMethodChangedEmail = ({
  firstName = 'there',
  action,
  method,
  timestamp,
  appUrl = 'https://secure2send.fly.dev',
}: MfaMethodChangedEmailProps) => {
  const methodName = method === 'email' ? 'Email Verification' : 'Authenticator App';
  const actionText = action === 'enabled' ? 'enabled' : 'disabled';
  const formattedDate = timestamp.toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'long',
  });

  return (
    <Html>
      <Head />
      <Preview>Security Alert: MFA method {actionText} on your Secure2Send account</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>🔒 Security Alert</Heading>
          </Section>
          
          <Section style={content}>
            <Text style={greeting}>Hi {firstName},</Text>
            
            <Section style={alertBox}>
              <Text style={alertText}>
                Your multi-factor authentication settings have been changed.
              </Text>
            </Section>

            <Text style={paragraph}>
              <strong>What changed:</strong>
            </Text>
            <Text style={detailText}>
              {methodName} was <strong>{actionText}</strong>
            </Text>

            <Text style={paragraph}>
              <strong>When:</strong>
            </Text>
            <Text style={detailText}>
              {formattedDate}
            </Text>

            <Hr style={hr} />

            <Section style={actionBox}>
              <Text style={actionTitle}>Was this you?</Text>
              <Text style={paragraph}>
                If you made this change, you can safely ignore this email. Your account security is important to us.
              </Text>
              <Text style={paragraph}>
                If you <strong>did not make this change</strong>, your account may be compromised. Please take immediate action:
              </Text>
              <ul style={list}>
                <li style={listItem}>Change your password immediately</li>
                <li style={listItem}>Review your MFA settings</li>
                <li style={listItem}>Contact our support team</li>
              </ul>
              <Link href={`${appUrl}/settings`} style={button}>
                Review Security Settings
              </Link>
            </Section>

            <Hr style={hr} />

            <Section style={tipsSection}>
              <Text style={tipsTitle}>🛡️ Security Best Practices</Text>
              <Text style={paragraph}>
                • Enable both TOTP and Email MFA for maximum security
              </Text>
              <Text style={paragraph}>
                • Keep your backup codes in a safe place
              </Text>
              <Text style={paragraph}>
                • Never share your verification codes with anyone
              </Text>
              <Text style={paragraph}>
                • Use a strong, unique password
              </Text>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              This is an automated security notification from Secure2Send. For assistance, contact our support team.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default MfaMethodChangedEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  backgroundColor: '#dc2626',
  padding: '32px',
  textAlign: 'center' as const,
};

const h1 = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
  lineHeight: '1.4',
};

const content = {
  padding: '0 48px',
};

const greeting = {
  fontSize: '18px',
  lineHeight: '1.4',
  color: '#484848',
  marginTop: '32px',
  marginBottom: '16px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#484848',
  marginTop: '8px',
  marginBottom: '8px',
};

const detailText = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#484848',
  marginTop: '4px',
  marginBottom: '16px',
  paddingLeft: '16px',
};

const alertBox = {
  backgroundColor: '#fef2f2',
  border: '2px solid #dc2626',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const alertText = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#991b1b',
  textAlign: 'center' as const,
  margin: '0',
};

const actionBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const actionTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#1e293b',
  marginBottom: '12px',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: 'bold',
  padding: '12px 24px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  marginTop: '16px',
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 0',
};

const tipsSection = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #86efac',
  borderRadius: '8px',
  padding: '24px',
};

const tipsTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#166534',
  marginBottom: '12px',
};

const list = {
  paddingLeft: '24px',
  margin: '12px 0',
};

const listItem = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#484848',
  marginBottom: '8px',
};

const footer = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#64748b',
  marginTop: '32px',
};

