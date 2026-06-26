import type { SupabaseClient } from '@supabase/supabase-js';

export const TIME_CLOCK_EVENT_TYPES = [
    'clock_in_attempt',
    'clock_in_success',
    'clock_in_failed',
    'clock_out_attempt',
    'clock_out_success',
    'clock_out_failed'
] as const;

export type TimeClockEventType = (typeof TIME_CLOCK_EVENT_TYPES)[number];

export type TimeClockEventSource = 'crew_self' | 'admin' | 'bulk';

export type TimeClockEventRecord = {
    id: string;
    employee_id: string;
    user_id: string | null;
    time_entry_id: string | null;
    event_type: TimeClockEventType;
    source: TimeClockEventSource | null;
    error_message: string | null;
    created_at: string;
    employees?: { display_name: string } | null;
};

export const TIME_CLOCK_EVENT_LABELS: Record<TimeClockEventType, string> = {
    clock_in_attempt: 'Clock-in attempt',
    clock_in_success: 'Clock-in success',
    clock_in_failed: 'Clock-in failed',
    clock_out_attempt: 'Clock-out attempt',
    clock_out_success: 'Clock-out success',
    clock_out_failed: 'Clock-out failed'
};

export const TIME_CLOCK_SOURCE_LABELS: Record<TimeClockEventSource, string> = {
    crew_self: 'Crew (self)',
    admin: 'Admin',
    bulk: 'Bulk action'
};

type LogParams = {
    employeeId: string;
    userId: string | null;
    timeEntryId?: string | null;
    eventType: TimeClockEventType;
    source: TimeClockEventSource;
    errorMessage?: string | null;
};

/** Best-effort audit write — never throws; safe before migration 020 is applied. */
export async function logTimeClockEvent(
    supabase: SupabaseClient,
    params: LogParams
): Promise<void> {
    try {
        const { error } = await supabase.from('time_clock_events').insert([{
            employee_id: params.employeeId,
            user_id: params.userId,
            time_entry_id: params.timeEntryId ?? null,
            event_type: params.eventType,
            source: params.source,
            error_message: params.errorMessage?.trim() || null
        }]);

        if (error) {
            console.error('logTimeClockEvent insert failed:', {
                eventType: params.eventType,
                employeeId: params.employeeId,
                error
            });
        }
    } catch (err) {
        console.error('logTimeClockEvent unexpected error:', err);
    }
}

export async function resolveClockEventSource(
    supabase: SupabaseClient,
    employeeId: string,
    explicit?: TimeClockEventSource
): Promise<TimeClockEventSource> {
    if (explicit) {
        return explicit;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return 'crew_self';
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        return 'crew_self';
    }

    const { data: employee } = await supabase
        .from('employees')
        .select('user_id')
        .eq('id', employeeId)
        .maybeSingle();

    return employee?.user_id === user.id ? 'crew_self' : 'admin';
}

export async function getActorUserId(supabase: SupabaseClient): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
}
