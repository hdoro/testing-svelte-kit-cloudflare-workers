import type { RequestHandler } from '@sveltejs/kit';
import supabase from '$lib/utils/supabaseClient';
import { getSessionCookies } from '$lib/utils/cookieUtils';
import { parse } from 'query-string';
import type { ServerRequest } from '@sveltejs/kit/types/hooks';

export const getLoginRedirect = (request: ServerRequest): string | undefined => {
	// Get the page the login was sent from
	const referer = request.headers?.referer;
	// Parse its query params
	const params = parse(referer?.split('?')[1] || '');
	// And get the `redirect` param
	const redirect = params
		? decodeURIComponent(
				Array.isArray(params.redirect) ? params.redirect[0] : params.redirect || ''
		  )
		: undefined;

	return redirect;
};

export const post: RequestHandler = async (request) => {
	const email = request.body.get('email');
	const password = request.body.get('password');

	const redirect = getLoginRedirect(request);

	if (typeof email !== 'string' || !email || !email.includes('@')) {
		return {
			status: 400,
			body: 'missing-email'
		};
	}

	if (typeof password !== 'string' || !password || password.length < 6) {
		return {
			status: 400,
			body: 'missing-password'
		};
	}

	console.log({
		email,
		password,
		body: request.body,
		redirect
	});

	const { session, error, user } = await supabase.auth.signIn({
		email,
		password
	});

	console.log({ user });

	if (error) {
		console.log({ error });
		return {
			status: 302,
			headers: {
				location: `/entrar?error=${error.message}${
					redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''
				}`
			}
		};
	}

	return {
		status: 302,
		headers: {
			location: redirect?.startsWith('/') ? redirect : '/',
			'set-cookie': getSessionCookies({
				...session,
				uuid: user.id
			}) as any
		}
	};
};
