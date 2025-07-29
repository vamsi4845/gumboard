export function getEmailFrom() {
  return process.env.EMAIL_FROM || "noreply@gumboard.com";
}
