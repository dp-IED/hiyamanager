/**
 * Generates a random phone number in the format +1XXXXXXXXXX
 */
export function generatePhoneNumber(): string {
  return `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
}

