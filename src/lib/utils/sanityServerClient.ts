// import client from '@sanity/client'
import client from 'picosanity';
import { BASE_CONFIG } from './sanityClient'

console.log(`Write token: ${process.env['SANITY_WRITE_TOKEN']}`)

const sanityServerClient = new client({
  ...BASE_CONFIG,
  token: process.env['SANITY_WRITE_TOKEN'],
  // Tokens don't work the CDN and we want the freshest data possible
  useCdn: false,
})

export default sanityServerClient
