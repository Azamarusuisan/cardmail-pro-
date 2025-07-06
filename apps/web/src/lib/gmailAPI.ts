// Gmail API client-side integration
// Requires Google OAuth2 authentication with Gmail scope

interface GmailSendOptions {
  to: string;
  subject: string;
  body: string;
  accessToken: string;
}

interface GmailSendResult {
  messageId: string;
  threadId?: string;
  success: boolean;
}

/**
 * Send email using Gmail API
 * @param options Email sending options
 * @returns Promise with send result
 */
export async function sendEmailViaGmail(options: GmailSendOptions): Promise<GmailSendResult> {
  const { to, subject, body, accessToken } = options;

  if (!accessToken) {
    throw new Error('Gmail access token is required');
  }

  try {
    // Create RFC 2822 email message
    const emailMessage = createEmailMessage({
      to,
      subject,
      body
    });

    // Encode message to base64url
    const encodedMessage = btoa(emailMessage)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send via Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`Gmail API error: ${response.status} ${response.statusText}${
        errorData?.error?.message ? ` - ${errorData.error.message}` : ''
      }`);
    }

    const result = await response.json();

    return {
      messageId: result.id,
      threadId: result.threadId,
      success: true
    };
  } catch (error) {
    console.error('Gmail send error:', error);
    throw error;
  }
}

/**
 * Create RFC 2822 formatted email message
 */
function createEmailMessage({ to, subject, body }: { to: string; subject: string; body: string }): string {
  const messageParts = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    body
  ];

  return messageParts.join('\r\n');
}

/**
 * Get user's Gmail profile information
 */
export async function getGmailProfile(accessToken: string) {
  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get Gmail profile: ${response.status}`);
    }

    const profile = await response.json();
    
    return {
      emailAddress: profile.emailAddress,
      messagesTotal: profile.messagesTotal,
      threadsTotal: profile.threadsTotal
    };
  } catch (error) {
    console.error('Gmail profile error:', error);
    throw error;
  }
}

/**
 * Initialize Google OAuth2 for Gmail access
 * This would typically be called from a Google Sign-In component
 */
export function initializeGoogleAuth() {
  return new Promise((resolve, reject) => {
    // Load Google APIs
    if (typeof window.gapi === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('auth2', () => {
          window.gapi.auth2.init({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly'
          }).then(resolve).catch(reject);
        });
      };
      script.onerror = reject;
      document.head.appendChild(script);
    } else {
      resolve(window.gapi.auth2.getAuthInstance());
    }
  });
}

/**
 * Sign in user and get access token
 */
export async function signInWithGoogle(): Promise<string> {
  try {
    await initializeGoogleAuth();
    const authInstance = window.gapi.auth2.getAuthInstance();
    
    if (!authInstance.isSignedIn.get()) {
      await authInstance.signIn();
    }
    
    const user = authInstance.currentUser.get();
    const authResponse = user.getAuthResponse();
    
    return authResponse.access_token;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw new Error('Failed to sign in with Google');
  }
}

/**
 * Sign out user
 */
export async function signOutFromGoogle(): Promise<void> {
  try {
    const authInstance = window.gapi.auth2.getAuthInstance();
    await authInstance.signOut();
  } catch (error) {
    console.error('Google sign-out error:', error);
    throw new Error('Failed to sign out from Google');
  }
}

/**
 * Check if user is currently signed in
 */
export function isSignedIn(): boolean {
  try {
    const authInstance = window.gapi.auth2.getAuthInstance();
    return authInstance && authInstance.isSignedIn.get();
  } catch (error) {
    return false;
  }
}

/**
 * Get current user's basic profile
 */
export function getCurrentUser() {
  try {
    const authInstance = window.gapi.auth2.getAuthInstance();
    if (authInstance && authInstance.isSignedIn.get()) {
      const user = authInstance.currentUser.get();
      const profile = user.getBasicProfile();
      
      return {
        id: profile.getId(),
        name: profile.getName(),
        email: profile.getEmail(),
        picture: profile.getImageUrl(),
        accessToken: user.getAuthResponse().access_token
      };
    }
    return null;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    gapi: any;
  }
}