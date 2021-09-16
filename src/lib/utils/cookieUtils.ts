import cookie from 'cookie'
import type { Session } from '@supabase/gotrue-js'

const SHARED_OPTIONS: cookie.CookieSerializeOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: true,
  path: '/',
}

export const COOKIE_ACCESS_KEY = 'gororobasAccessToken'
export const COOKIE_REFRESH_KEY = 'gororobasRefreshToken'
export const COOKIE_EXPIRES_IN_KEY = 'gororobasExpiresIn'
export const COOKIE_UUID = 'gororobasUuid'

export function getSessionCookies(
  session?: Pick<
    Partial<Session>,
    'access_token' | 'refresh_token' | 'expires_in'
  > & { uuid?: string },
): string[] {
  if (!session?.access_token) {
    return [
      cookie.serialize(COOKIE_ACCESS_KEY, '', {
        ...SHARED_OPTIONS,
        maxAge: 0,
      }),
      cookie.serialize(COOKIE_REFRESH_KEY, '', {
        ...SHARED_OPTIONS,
        maxAge: 0,
      }),
      cookie.serialize(COOKIE_EXPIRES_IN_KEY, '', {
        ...SHARED_OPTIONS,
        maxAge: 0,
      }),
      cookie.serialize(COOKIE_UUID, '', {
        ...SHARED_OPTIONS,
        maxAge: 0,
      }),
    ]
  }

  // Refresh token should last ~180 days
  const renewMaxAge = 60 * 60 * 24 * 180
  return [
    cookie.serialize(COOKIE_ACCESS_KEY, session.access_token, {
      ...SHARED_OPTIONS,
      maxAge: session.expires_in || renewMaxAge,
    }),
    cookie.serialize(COOKIE_REFRESH_KEY, session.refresh_token, {
      ...SHARED_OPTIONS,
      maxAge: renewMaxAge,
    }),
    // Store expires_at info for future use by getSessionCookies itself (see access key above)
    // This is needed to avoid fetching sessions at every load and speed up hooks>handler
    ...(session.expires_in
      ? [
          cookie.serialize(
            COOKIE_EXPIRES_IN_KEY,
            session.expires_in?.toString(),
            {
              ...SHARED_OPTIONS,
              maxAge: renewMaxAge,
            },
          ),
        ]
      : []),
    // To speed up fetching user data from Sanity & Supabase in one request, let's also set the uuid to cookies
    ...(session.uuid
      ? [
          cookie.serialize(COOKIE_UUID, session.uuid, {
            ...SHARED_OPTIONS,
            maxAge: renewMaxAge,
          }),
        ]
      : []),
  ]
}
