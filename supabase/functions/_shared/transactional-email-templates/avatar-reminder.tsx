import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'MirrorMe'
const APP_URL = 'https://mirrormebyfitvision.lovable.app'

interface AvatarReminderProps {
  name?: string
}

const AvatarReminderEmail = ({ name }: AvatarReminderProps) => {
  const greeting = name ? `Hi ${name},` : 'Hey there,'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your digital twin is one photo away ✨</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Did you finish your avatar?</Heading>
          </Section>

          <Text style={text}>{greeting}</Text>

          <Text style={text}>
            You signed up for {SITE_NAME} yesterday — but it looks like you
            haven't created your digital twin yet. It only takes 30 seconds
            and one full-body photo.
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightText}>
              ✨ Your photorealistic 3D avatar
              <br />
              👕 Try on real clothes virtually
              <br />
              🛍️ See exactly how outfits look on you
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button href={`${APP_URL}/`} style={button}>
              Finish My Avatar
            </Button>
          </Section>

          <Text style={smallText}>
            Takes less than a minute. Your photo stays private — used only to
            build your avatar.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            — The {SITE_NAME} Team
            <br />
            <span style={footerLight}>by FitVision (Pty) Ltd</span>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AvatarReminderEmail,
  subject: 'Did you finish your avatar? ✨',
  displayName: 'Avatar reminder (24h)',
  previewData: { name: 'Jane' },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}
const container = {
  margin: '0 auto',
  padding: '32px 24px',
  maxWidth: '560px',
}
const header = { marginBottom: '24px' }
const h1 = {
  fontSize: '26px',
  fontWeight: 700,
  color: '#0F172A',
  margin: '0 0 8px',
  lineHeight: '1.25',
}
const text = {
  fontSize: '15px',
  color: '#334155',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const smallText = {
  fontSize: '13px',
  color: '#64748B',
  lineHeight: '1.5',
  margin: '12px 0 0',
  textAlign: 'center' as const,
}
const highlightBox = {
  backgroundColor: '#F1F5F9',
  borderRadius: '12px',
  padding: '20px 24px',
  margin: '20px 0',
  borderLeft: '3px solid #06B6D4',
}
const highlightText = {
  fontSize: '15px',
  color: '#0F172A',
  lineHeight: '2',
  margin: 0,
}
const buttonContainer = {
  textAlign: 'center' as const,
  margin: '28px 0 12px',
}
const button = {
  backgroundColor: '#06B6D4',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 600,
  padding: '14px 32px',
  borderRadius: '12px',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = {
  borderColor: '#E2E8F0',
  margin: '32px 0 20px',
}
const footer = {
  fontSize: '13px',
  color: '#64748B',
  lineHeight: '1.5',
  margin: 0,
}
const footerLight = { color: '#94A3B8', fontSize: '12px' }
