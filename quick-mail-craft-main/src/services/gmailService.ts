
import { gapi } from 'gapi-script';

// Replace this with your actual Google Client ID from Google Cloud Console
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID_HERE';
const API_KEY = 'YOUR_API_KEY_HERE'; // Optional, for better quota management
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';
const SCOPES = 'https://www.googleapis.com/auth/gmail.send';

class GmailService {
  private isInitialized = false;
  private isSignedIn = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      await gapi.load('client:auth2', async () => {
        await gapi.client.init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          discoveryDocs: [DISCOVERY_DOC],
          scope: SCOPES
        });
        
        this.isInitialized = true;
        this.isSignedIn = gapi.auth2.getAuthInstance().isSignedIn.get();
        console.log('Gmail API initialized successfully');
      });
    } catch (error) {
      console.error('Error initializing Gmail API:', error);
      throw error;
    }
  }

  async signIn() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const authInstance = gapi.auth2.getAuthInstance();
      await authInstance.signIn();
      this.isSignedIn = true;
      return true;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  async signOut() {
    try {
      const authInstance = gapi.auth2.getAuthInstance();
      await authInstance.signOut();
      this.isSignedIn = false;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  isUserSignedIn() {
    return this.isSignedIn;
  }

  getCurrentUserEmail() {
    if (!this.isSignedIn) return null;
    const profile = gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile();
    return profile.getEmail();
  }

  async sendEmail(to: string, subject: string, body: string) {
    if (!this.isSignedIn) {
      throw new Error('User must be signed in to send emails');
    }

    try {
      // Create the email message in RFC 2822 format
      const email = [
        'Content-Type: text/plain; charset="UTF-8"\n',
        'MIME-Version: 1.0\n',
        'Content-Transfer-Encoding: 7bit\n',
        `to: ${to}\n`,
        `subject: ${subject}\n\n`,
        body
      ].join('');

      // Encode the email in base64url format
      const encodedEmail = btoa(email)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send the email using Gmail API
      const response = await gapi.client.gmail.users.messages.send({
        userId: 'me',
        resource: {
          raw: encodedEmail
        }
      });

      return response.result;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}

export const gmailService = new GmailService();
