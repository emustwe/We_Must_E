// 20 characters from an unambiguous alphabet, e.g. "Kq7m-Xw2p-Rt9v-Hn4c".
// Uses Web Crypto, so it works in the browser and on the server.
export function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(16));
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join("")).join("-");
}
