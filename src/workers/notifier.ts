// Notifier worker: sends digest via email/Slack
export async function sendDigest() {
  // TODO: Send daily digest via SMTP or Slack
  console.log('Sending digest...');
}

if (require.main === module) {
  sendDigest();
}