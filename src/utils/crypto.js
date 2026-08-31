import crypto from "node:crypto";
import { env } from "../config/env.js";
export function generateSecureToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString("hex");
}
export function generateState() {
    return generateSecureToken(16);
}
export function generateSessionId() {
    const random = generateSecureToken(32);
    return crypto.createHmac("sha256", env.sessionSecret).update(random).digest("hex");
}
export function verifySessionId(sessionId) {
    const match = sessionId.match(/^[a-f0-9]{64}$/i);
    if (!match) {
        return false;
    }
    const hash = match[0];
    // Ensure it's lowercase for consistent comparison
    const normalizedHash = hash.toLowerCase();
    // Re-generate the hash from the original token to verify authenticity
    return crypto
        .createHmac("sha256", env.sessionSecret)
        .update(normalizedHash)
        .digest("hex") === normalizedHash;
}
//# sourceMappingURL=crypto.js.map