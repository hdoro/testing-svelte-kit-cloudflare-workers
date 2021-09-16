// import client, { ClientConfig } from '@sanity/client'
import client, { PicoSanity } from 'picosanity';
// import imageUrlBuilder from '@sanity/image-url'

type ClientConfig = PicoSanity['clientConfig'];

export const BASE_CONFIG = {
	projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
	dataset: import.meta.env.VITE_SANITY_DATASET,
	apiVersion: '2021-07-05',
	useCdn: true
} as ClientConfig;

/**
 * Simple base client
 */
const sanityClient = new client(BASE_CONFIG);

export default sanityClient;

/**
 * Used in the preview route for getting freshest data with the currently authenticated user's credentials
 */
export const browserClient = new client({
	...BASE_CONFIG,
	withCredentials: true,
	useCdn: false
});

// export const imageBuilder = imageUrlBuilder(browserClient)
