// src/utils/password.js - Even more browser-compatible version

// Convert string to ArrayBuffer
function str2ab(str) {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// Convert ArrayBuffer to hex string
function ab2hex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate a salt for password hashing
export function generateSalt() {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return ab2hex(array);
}

// Hash password with salt
export async function hashPassword(password, salt) {
  const data = str2ab(password + salt);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return ab2hex(hashBuffer);
}

// Verify password
export async function verifyPassword(password, hash, salt) {
  const candidateHash = await hashPassword(password, salt);
  return candidateHash === hash;
}


// Generate a cryptographically secure random password
export function generateTemporaryPassword() {
  const length = 12;
  
  // Character sets to ensure strong passwords
  const uppercaseChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed confusing chars like I,O
  const lowercaseChars = 'abcdefghijkmnpqrstuvwxyz'; // Removed confusing chars like l,o
  const numberChars = '23456789'; // Removed confusing chars like 0,1
  const specialChars = '!@#$%^&*-_=+';
  
  // Browser-compatible random number generation
  const getRandomInt = (max) => {
    const array = new Uint8Array(1);
    window.crypto.getRandomValues(array);
    return array[0] % max;
  };

  // Ensure at least one of each required character type
  let password = '';
  password += uppercaseChars.charAt(getRandomInt(uppercaseChars.length));
  password += lowercaseChars.charAt(getRandomInt(lowercaseChars.length));
  password += numberChars.charAt(getRandomInt(numberChars.length));
  password += specialChars.charAt(getRandomInt(specialChars.length));
  
  // Fill the rest randomly from all characters
  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
  for (let i = 4; i < length; i++) {
    password += allChars.charAt(getRandomInt(allChars.length));
  }
  
  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}