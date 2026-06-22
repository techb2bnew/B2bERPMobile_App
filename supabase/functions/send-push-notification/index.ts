import { createClient } from 'jsr:@supabase/supabase-js@2';
import { JWT } from 'npm:google-auth-library@9';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getFirebaseAccessToken = async () => {
  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');

  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT secret is not configured');
  }

  const serviceAccount = JSON.parse(raw);
  const client = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });

  const credentials = await client.authorize();
  return credentials.access_token;
};

const sendFcmMessage = async ({ token, title, body, data, badgeCount }) => {
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID') || 'b2berp-f45e0';
  const accessToken = await getFirebaseAccessToken();
  const badge = Math.max(0, Number(badgeCount) || 0);

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title,
            body,
          },
          data: Object.fromEntries(
            Object.entries(data || {}).map(([key, value]) => [key, String(value)]),
          ),
          android: {
            priority: 'HIGH',
            notification: {
              channel_id: 'b2b_erp_default',
              sound: 'default',
              notification_count: badge,
            },
          },
          apns: {
            headers: {
              'apns-priority': '10',
            },
            payload: {
              aps: {
                sound: 'default',
                badge,
              },
            },
          },
        },
      }),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error?.message || 'FCM send failed');
  }

  return result;
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { recipientUserId, title, body, data, badgeCount: clientBadgeCount } = await req.json();

    if (!recipientUserId || !title || !body) {
      return new Response(
        JSON.stringify({ success: false, reason: 'missing_fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: profile, error: profileError } = await supabase
      .from('employee_profiles')
      .select('fcm_token')
      .eq('id', recipientUserId)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    const fcmToken = profile?.fcm_token?.trim();

    if (!fcmToken) {
      return new Response(
        JSON.stringify({ success: false, reason: 'no_fcm_token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const parsedClientBadge = Number(clientBadgeCount);
    let badgeCount = Number.isFinite(parsedClientBadge) && parsedClientBadge >= 0
      ? parsedClientBadge
      : null;

    if (badgeCount === null) {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', recipientUserId)
        .eq('is_read', false);

      badgeCount = count || 0;
    }

    const fcmResult = await sendFcmMessage({
      token: fcmToken,
      title,
      body,
      data,
      badgeCount,
    });

    return new Response(
      JSON.stringify({ success: true, fcm: fcmResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        reason: error?.message || 'unknown_error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
