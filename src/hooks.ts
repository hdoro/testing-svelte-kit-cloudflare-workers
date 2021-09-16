import cookie from 'cookie'
import type { Handle, GetSession } from '@sveltejs/kit'
import type { Session, User } from '@supabase/gotrue-js'

import supabase from '$lib/utils/supabaseClient'
import {
  getSessionCookies,
  COOKIE_REFRESH_KEY,
  COOKIE_ACCESS_KEY,
  COOKIE_EXPIRES_IN_KEY,
  COOKIE_UUID,
} from '$lib/utils/cookieUtils'
import sanityServerClient from '$lib/utils/sanityServerClient'
import type { SanityUserDocument, UserInSession } from '$lib/types'

const USER_QUERY = /* groq */ `*[_id == $id][0]{
  ...,
  "handle": handle.current,
}`

/**
 * Public paths the handle hook doesn't need to run in.
 * This will speed requests significantly as we don't need to hit Sanity & Supabase.
 */
const AUTHLESS_PATHS = [
  '/api/auth/login',
]

export const handle: Handle = async ({ request, resolve }) => {
  if (AUTHLESS_PATHS.includes(request.path)) {
    console.time(`Resolving request (${request.path} - no-auth)`)
    const response = await resolve(request)
    console.timeEnd(`Resolving request (${request.path} - no-auth)`)
    return response
  }

  const cookies = cookie.parse(request.headers.cookie || '')

  console.log(cookies)

  // TODO https://github.com/sveltejs/kit/issues/1046
  if (request.query.has('_method')) {
    request.method = request.query.get('_method').toUpperCase()
  }

  let supabaseUser: User | undefined
  let sanityUser: SanityUserDocument | undefined
  let renewedSession: Session | undefined
  if (cookies[COOKIE_ACCESS_KEY] || cookies[COOKIE_REFRESH_KEY]) {
    if (cookies[COOKIE_ACCESS_KEY]) {
      console.time(`Getting user data (${request.path})`)
      const userData = await Promise.all([
        supabase.auth.api.getUser(cookies[COOKIE_ACCESS_KEY]),
        sanityServerClient.fetch<SanityUserDocument>(USER_QUERY, {
          id: `user.${cookies[COOKIE_UUID] || ''}`,
        }),
      ])
      supabaseUser = userData[0]?.user
      sanityUser = userData[1]
      console.timeEnd(`Getting user data (${request.path})`)
    }

    if (!supabaseUser) {
      console.time(`Refreshing user token (${request.path})`)
      const renewData = await supabase.auth.api.refreshAccessToken(
        cookies[COOKIE_REFRESH_KEY],
      )
      // If no user, let's use refresh_key from cookies to refresh the token
      renewedSession = renewData.data
      console.timeEnd(`Refreshing user token (${request.path})`)

      if (renewedSession) {
        console.time(
          `Getting supabase data w/ renewed session (${request.path})`,
        )
        // If we have a renewed session, we can now get the user
        supabaseUser = await (
          await supabase.auth.api.getUser(renewedSession.access_token)
        ).user
        const userData = await Promise.all([
          supabase.auth.api.getUser(renewedSession.access_token),
          sanityServerClient.fetch<SanityUserDocument>(USER_QUERY, {
            id: `user.${cookies[COOKIE_UUID] || ''}`,
          }),
        ])
        supabaseUser = userData[0]?.user
        sanityUser = userData[1]

        console.timeEnd(
          `Getting supabase data w/ renewed session (${request.path})`,
        )
      }
    }
  }

  request.locals.user =
    supabaseUser && sanityUser
      ? ({
          name: sanityUser.name,
          gororobasBeta: sanityUser.gororobasBeta,
          handle: sanityUser.handle,
          email: supabaseUser.email,
          role: supabaseUser.role,
          created_at: supabaseUser.created_at,
          updated_at: supabaseUser.updated_at,
          id: supabaseUser.id,
        } as UserInSession)
      : undefined

  console.time(`Resolving request ${request.path}`)
  const response = await resolve(request)
  console.timeEnd(`Resolving request ${request.path}`)

  // As endpoints can set cookies, let's avoid re-writing them
  if (!response.headers['set-cookie']) {
    response.headers['set-cookie'] = getSessionCookies(
      request.locals.user
        ? renewedSession
          ? {
              ...renewedSession,
              uuid: cookies[COOKIE_UUID],
            }
          : {
              access_token: cookies[COOKIE_ACCESS_KEY],
              refresh_token: cookies[COOKIE_REFRESH_KEY],
              expires_in: cookies[COOKIE_EXPIRES_IN_KEY]
                ? Number.parseFloat(cookies[COOKIE_EXPIRES_IN_KEY])
                : undefined,
              uuid: cookies[COOKIE_UUID],
            }
        : // If no user found for token, clear session token
          undefined,
    ) as any
  }

  return response
}

export const getSession: GetSession = ({ locals }) => {
  return { user: locals.user }
}
