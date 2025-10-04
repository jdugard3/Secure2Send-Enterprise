import React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface MfaEnabledEmailProps {
  firstName: string;
  appUrl: string;
}

export function MfaEnabledEmail({ firstName, appUrl }: MfaEnabledEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Multi-Factor Authentication Enabled - Secure2Send</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>🔐 MFA Enabled Successfully</Heading>
          </Section>
          
          <Section style={content}>
            <Text style={text}>Hi {firstName},</Text>
            
            <Text style={text}>
              Multi-Factor Authentication (MFA) has been successfully enabled on your Secure2Send account. 
              Your account is now more secure with an additional layer of protection.
            </Text>

            <Section style={infoBox}>
              <Text style={infoText}>
                <strong>What this means:</strong>
              </Text>
              <Text style={infoText}>
                • You'll need your authenticator app code when logging in<br/>
                • Your backup codes can be used if you lose access to your authenticator<br/>
                • Keep your backup codes in a safe place
              </Text>
            </Section>

            <Text style={text}>
              If you didn't enable MFA or believe this was done in error, please contact our support team immediately.
            </Text>

            <Text style={text}>
              <Link href={`${appUrl}/settings`} style={button}>
                Manage Security Settings
              </Link>
            </Text>

            <Text style={text}>
              Best regards,<br />
              The Secure2Send Team
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              This is a security notification from Secure2Send Enterprise.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const header = {
  padding: '32px 24px',
  textAlign: 'center' as const,
};

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
};

const content = {
  padding: '0 24px',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const infoBox = {
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
};

const infoText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: 'bold',
  padding: '12px 24px',
  textDecoration: 'none',
  textAlign: 'center' as const,
};

const footer = {
  borderTop: '1px solid #e5e7eb',
  padding: '24px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '0',
};
