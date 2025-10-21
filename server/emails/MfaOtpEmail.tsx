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
} from '@react-email/components';
import * as React from 'react';

interface MfaOtpEmailProps {
  firstName?: string;
  otpCode: string;
  expiresInMinutes: number;
}

export const MfaOtpEmail = ({
  firstName = 'there',
  otpCode,
  expiresInMinutes = 5,
}: MfaOtpEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your Secure2Send verification code: {otpCode}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>🔒 Secure2Send</Heading>
          </Section>
          
          <Section style={content}>
            <Text style={greeting}>Hi {firstName},</Text>
            
            <Text style={paragraph}>
              You requested a verification code to sign in to your Secure2Send account.
            </Text>

            <Section style={otpContainer}>
              <Text style={otpLabel}>Your verification code is:</Text>
              <Heading style={otpCodeStyle}>{otpCode}</Heading>
              <Text style={otpExpiry}>
                This code will expire in <strong>{expiresInMinutes} minutes</strong>
              </Text>
            </Section>

            <Hr style={hr} />

            <Section style={securityNotice}>
              <Text style={securityTitle}>🛡️ Security Notice</Text>
              <Text style={paragraph}>
                • This code can only be used once
              </Text>
              <Text style={paragraph}>
                • Never share this code with anyone
              </Text>
              <Text style={paragraph}>
                • Secure2Send will never ask for this code via phone or email
              </Text>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              Didn't request this code? Please secure your account immediately by changing your password.
            </Text>
            
            <Text style={footer}>
              If you need assistance, contact our support team.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default MfaOtpEmail;

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
  backgroundColor: '#2563eb',
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

const otpContainer = {
  backgroundColor: '#f8fafc',
  border: '2px solid #e2e8f0',
  borderRadius: '12px',
  padding: '32px',
  textAlign: 'center' as const,
  margin: '32px 0',
};

const otpLabel = {
  fontSize: '14px',
  color: '#64748b',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  marginBottom: '8px',
};

const otpCodeStyle = {
  fontSize: '48px',
  fontWeight: 'bold',
  color: '#2563eb',
  letterSpacing: '8px',
  margin: '16px 0',
  fontFamily: 'monospace',
};

const otpExpiry = {
  fontSize: '14px',
  color: '#64748b',
  marginTop: '16px',
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 0',
};

const securityNotice = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const securityTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#78350f',
  marginBottom: '12px',
};

const footer = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#64748b',
  marginTop: '16px',
};

