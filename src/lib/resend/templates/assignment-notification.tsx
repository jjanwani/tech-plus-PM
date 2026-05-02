import {
  Body, Button, Container, Head, Heading, Html,
  Preview, Text,
} from '@react-email/components'

interface AssignmentNotificationProps {
  assignedByName: string
  issueKey: string
  issueTitle: string
  priority: string
  dueDate: string | null
  issueUrl: string
}

export function AssignmentNotificationEmail({
  assignedByName,
  issueKey,
  issueTitle,
  priority,
  dueDate,
  issueUrl,
}: AssignmentNotificationProps) {
  return (
    <Html>
      <Head />
      <Preview>{assignedByName} assigned you to {issueKey}</Preview>
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', padding: '24px', backgroundColor: '#fff', borderRadius: '8px' }}>
          <Heading style={{ color: '#1e3a5f', fontSize: '20px' }}>
            You've been assigned an issue
          </Heading>
          <Text style={{ color: '#374151' }}>
            <strong>{assignedByName}</strong> assigned you to{' '}
            <strong>[{issueKey}] {issueTitle}</strong>
          </Text>
          <Text style={{ color: '#374151' }}>
            Priority: <strong>{priority}</strong>
            {dueDate && <> · Due: <strong>{dueDate}</strong></>}
          </Text>
          <Button
            href={issueUrl}
            style={{ backgroundColor: '#1e3a5f', color: '#fff', padding: '12px 24px', borderRadius: '6px', marginTop: '16px', display: 'inline-block', textDecoration: 'none' }}
          >
            View Issue
          </Button>
          <Text style={{ color: '#9ca3af', fontSize: '12px', marginTop: '32px' }}>
            Tech Plus Consulting · University of Michigan
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
