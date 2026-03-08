import { getUserCapabilities } from './getUserCapabilities';
import { hasCapability } from './hasCapability';

/**
 * Asynchronous server-side guard.
 * Returns true if the current user has the required capability, false otherwise.
 * Use this in server components or server actions to protect routes/logic.
 */
export async function requireCapability(capability: string): Promise<boolean> {
    const caps = await getUserCapabilities();
    return hasCapability(caps, capability);
}
