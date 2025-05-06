import { getSession } from './auth';

export async function sendTeacherEmail(template, data) {
  try {
    const { session } = getSession();
    if (!session) {
      throw new Error('No active session');
    }

    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.token}` // Add this line
      },
      body: JSON.stringify({
        template,
        to: data.email,
        data
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send email');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}