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

interface AllDocumentsApprovedEmailProps {
  firstName: string;
  companyName: string;
  appUrl: string;
}

export const AllDocumentsApprovedEmail = ({
  firstName,
  companyName,
  appUrl,
}: AllDocumentsApprovedEmailProps) => {
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
            <Text style={celebrationEmoji}>🎉</Text>
            <Text style={title}>Congratulations!</Text>
            <Text style={subtitle}>All Documents Approved</Text>
            
            <Text style={greeting}>
              Hi {firstName},
            </Text>
            
            <Text style={paragraph}>
              Fantastic news! All of your compliance documents have been reviewed and approved by our team. 
              {companyName ? ` ${companyName} is now fully compliant and ready to move forward.` : ' You are now fully compliant and ready to move forward.'}
            </Text>

            <Section style={successBox}>
              <Text style={successIcon}>✅</Text>
              <Text style={successTitle}>Compliance Complete!</Text>
              <Text style={successText}>
                Your cannabis compliance documentation package is now complete and approved.
              </Text>
              <Text style={completedDate}>
                Completed on {new Date().toLocaleDateString()}
              </Text>
            </Section>

            <Text style={paragraph}>
              <strong>What you can do now:</strong>
            </Text>

            <ul style={list}>
              <li style={listItem}>Download your complete compliance package</li>
              <li style={listItem}>Access all approved documents anytime from your dashboard</li>
              <li style={listItem}>Use your documents for regulatory submissions</li>
              <li style={listItem}>Keep copies for your business records</li>
            </ul>

            <Section style={buttonContainer}>
              <Button style={primaryButton} href={`${appUrl}/documents`}>
                Download All Documents
              </Button>
            </Section>

            <Text style={paragraph}>
              Thank you for choosing Secure2Send for your cannabis compliance needs. We're proud to have helped you achieve full compliance.
            </Text>

            <Section style={nextStepsBox}>
              <Text style={nextStepsTitle}>Need Help Going Forward?</Text>
              <Text style={nextStepsText}>
                Our team is always here to assist with future compliance needs, document updates, or any questions you may have.
              </Text>
            </Section>

            <Text style={signature}>
              Congratulations again, and best wishes for your continued success!<br /><br />
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

const celebrationEmoji = {
  fontSize: '64px',
  textAlign: 'center' as const,
  margin: '0 0 16px',
};

const title = {
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#059669',
  margin: '0 0 8px',
  textAlign: 'center' as const,
};

const subtitle = {
  fontSize: '20px',
  color: '#047857',
  margin: '0 0 32px',
  textAlign: 'center' as const,
  fontWeight: '600',
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

const successBox = {
  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
  border: '2px solid #22c55e',
  borderRadius: '16px',
  padding: '32px 24px',
  margin: '32px 0',
  textAlign: 'center' as const,
};

const successIcon = {
  fontSize: '48px',
  margin: '0 0 16px',
};

const successTitle = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#059669',
  margin: '0 0 12px',
};

const successText = {
  fontSize: '18px',
  color: '#047857',
  margin: '0 0 16px',
  lineHeight: '1.5',
};

const completedDate = {
  fontSize: '16px',
  color: '#065f46',
  fontWeight: '600',
  margin: '0',
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

const primaryButton = {
  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  borderRadius: '12px',
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
  border: 'none',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
};

const nextStepsBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '20px',
  margin: '32px 0',
};

const nextStepsTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#475569',
  margin: '0 0 12px',
};

const nextStepsText = {
  fontSize: '16px',
  color: '#64748b',
  lineHeight: '1.6',
  margin: '0',
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

export default AllDocumentsApprovedEmail;
