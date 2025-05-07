// save this as generateHash.js
async function generateNewHash() {
    // Simple salt generation
    function generateSalt() {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
  
    // Hash password with the new algorithm
    async function hashPassword(password, salt) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + salt);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
  
    const password = "Admin123!"; // Choose a strong password
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);
  
    console.log("Password:", password);
    console.log("Salt:", salt);
    console.log("Hash:", hash);
  }
  
  generateNewHash();