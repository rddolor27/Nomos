const MIN_TOKEN_LETTERS = 3;

const TOKEN = new RegExp(`^[a-z]{${MIN_TOKEN_LETTERS},}$`);

export function foldName(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

// A word holding any letter outside a to z is dropped whole: cutting it at that letter would leave a stub nobody wrote.
export function nameTokens(text: string): string[] {
  return foldName(text)
    .split(/[^\p{L}]+/u)
    .filter((word) => TOKEN.test(word));
}
