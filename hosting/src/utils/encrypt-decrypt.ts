export function simpleEncrypt(str: string | null | undefined, key: string | null | undefined = 'tiendeptrainhattrencuocdoinay'): string | null {
  // Basic input validation
  if (!str || !key) {
    console.error('String and key must be provided and non-empty.');
    return null;
  }

  let xorResult = '';
  try {
    for (let i = 0; i < str.length; i++) {
      // Get character codes
      const strCharCode = str.charCodeAt(i);
      // Cycle through key characters using modulo
      const keyCharCode = key.charCodeAt(i % key.length);

      // Perform XOR operation
      const xorCharCode = strCharCode ^ keyCharCode;

      // Convert the resulting character code back to a character
      xorResult += String.fromCharCode(xorCharCode);
    }

    // Base64 encode the result to make it easily transmissible.
    // NOTE: btoa can throw an error if xorResult contains characters
    // outside the Latin-1 range (character codes 0-255).
    return btoa(xorResult);

  } catch (e) {
    if (e instanceof Error && e.message.includes('InvalidCharacterError')) {
      console.error('Error during Base64 encoding (btoa): The result of the XOR operation likely contains characters not representable in Latin-1. Consider using only ASCII or Latin1 input, or a more robust encoding/encryption method.', e);
    } else {
      console.error('An unexpected error occurred during encryption:', e);
    }
    return null; // Indicate failure
  }
}

export function simpleDecrypt(base64Str: string | null | undefined, key: string | null | undefined = 'tiendeptrainhattrencuocdoinay'): string | null {
  // Basic input validation
  if (!base64Str || !key) {
    console.error('Base64 string and key must be provided and non-empty.');
    return null;
  }

  try {
    // Base64 decode the input string.
    // NOTE: atob can throw an error if the input is not valid Base64.
    const xorResult = atob(base64Str);

    let originalStr = '';
    for (let i = 0; i < xorResult.length; i++) {
      // Get character codes
      const xorCharCode = xorResult.charCodeAt(i);
      // Cycle through key characters using modulo
      const keyCharCode = key.charCodeAt(i % key.length);

      // Perform XOR operation (the same operation decrypts)
      const strCharCode = xorCharCode ^ keyCharCode;

      // Convert the resulting character code back to a character
      originalStr += String.fromCharCode(strCharCode);
    }
    return originalStr;

  } catch (e) {
    if (e instanceof Error && e.message.includes('InvalidCharacterError') || e instanceof DOMException && e.name === 'InvalidCharacterError') {
      console.error('Error during Base64 decoding (atob): The input string is likely not valid Base64, or the key might be incorrect.', e);
    } else {
      console.error('An unexpected error occurred during decryption:', e);
    }
    return null; // Indicate failure
  }
}