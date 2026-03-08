/**
 * Synchronous helper to check if a specific capability exists in a user's capability list.
 */
export function hasCapability(userCapabilities: string[], capability: string): boolean {
    return userCapabilities.includes(capability) || userCapabilities.includes('admin'); // Admin fallback if not explicitly mapped
}
