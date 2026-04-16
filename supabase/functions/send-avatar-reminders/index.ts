import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

/**
 * Cron-driven job that sends a one-time reminder email to users who:
 *  - signed up between 24 and 48 hours ago
 *  - still have NOT created an avatar
 *  - have not already received this reminder (deduped via email_send_log)
 *
 * One recipient per call to send-transactional-email — never bulk loops.
 * Each invocation handles exactly one user; recipients filtered upstream.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    // Window: signed up between 48h and 24h ago
    const now = new Date()
    const windowEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24h ago
    const windowStart = new Date(now.getTime() - 48 * 60 * 60 * 1000) // 48h ago

    // Fetch auth users in the window via admin API
    const { data: usersData, error: usersErr } =
      await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (usersErr) throw usersErr

    const candidates = (usersData?.users ?? []).filter((u) => {
      if (!u.email) return false
      const created = new Date(u.created_at).getTime()
      return created >= windowStart.getTime() && created <= windowEnd.getTime()
    })

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ checked: 0, sent: 0, message: 'No candidates' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const userIds = candidates.map((u) => u.id)

    // Filter out users who already have an avatar
    const { data: avatars } = await supabase
      .from('saved_avatars')
      .select('user_id')
      .in('user_id', userIds)

    const usersWithAvatar = new Set((avatars ?? []).map((a) => a.user_id))

    // Filter out users who already received the reminder (any status)
    const emails = candidates.map((u) => u.email!.toLowerCase())
    const { data: alreadySent } = await supabase
      .from('email_send_log')
      .select('recipient_email')
      .eq('template_name', 'avatar-reminder')
      .in('recipient_email', emails)

    const alreadySentSet = new Set(
      (alreadySent ?? []).map((r) => r.recipient_email.toLowerCase()),
    )

    const toSend = candidates.filter(
      (u) =>
        !usersWithAvatar.has(u.id) &&
        !alreadySentSet.has(u.email!.toLowerCase()),
    )

    let sent = 0
    let failed = 0

    // One send per recipient — sequential, idempotent
    for (const user of toSend) {
      const displayName =
        (user.user_metadata as Record<string, any> | undefined)?.display_name ??
        null

      const { error } = await supabase.functions.invoke(
        'send-transactional-email',
        {
          body: {
            templateName: 'avatar-reminder',
            recipientEmail: user.email,
            idempotencyKey: `avatar-reminder-${user.id}`,
            templateData: { name: displayName },
          },
        },
      )

      if (error) {
        console.error('Failed to send reminder', {
          user_id: user.id,
          error: error.message,
        })
        failed += 1
      } else {
        sent += 1
      }
    }

    return new Response(
      JSON.stringify({
        checked: candidates.length,
        eligible: toSend.length,
        sent,
        failed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('send-avatar-reminders error', err)
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
