import crypto from 'crypto';

// Generate a salt for password hashing
export function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

// Hash password with salt
export function hashPassword(password, salt) {
  return crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');
}

// Verify password
export function verifyPassword(password, hash, salt) {
  const candidateHash = hashPassword(password, salt);
  return candidateHash === hash;
}

// Generate a random password
export function generateTemporaryPassword() {
  // Generate a password that meets common requirements
  const length = 10;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  
  // Fallback to browser-compatible random generation
  const getRandomInt = (max) => Math.floor(Math.random() * max);

  // Ensure at least one of each required character type
  const mustHaveChars = [
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ', // uppercase
    'abcdefghijklmnopqrstuvwxyz', // lowercase
    '0123456789',                 // number
    '!@#$%^&*'                    // special character
  ];

  // Start with required characters
  let password = mustHaveChars.map(chars => 
    chars[getRandomInt(chars.length)]
  ).join('');

  // Fill the rest randomly
  while (password.length < length) {
    const randomIndex = getRandomInt(charset.length);
    password += charset[randomIndex];
  }

  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}