'use server'

// Project logic shell
// Supports later expansion into full estimate planning and cost tracking

import { createClient } from '@/utils/supabase/server'
import { CAPABILITIES } from '../auth/capabilities'
import { requireCapability } from '../auth/requireCapability'

export async function getProjects() {
    const isAuthorized = await requireCapability(CAPABILITIES.VIEW_ALL_PROJECTS)
    if (!isAuthorized) throw new Error("Unauthorized to view all projects")

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('projects')
        .select(`
            id,
            name,
            status,
            client_id,
            clients (
                name
            )
        `)

    if (error) console.error("Error fetching projects:", error)
    return data || []
}
