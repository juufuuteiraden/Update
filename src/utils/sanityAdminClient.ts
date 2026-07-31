// import { client } from '../sanityClient'


export async function sanityUpsertDocument(params: {
  dataset: string
  type: string
  id?: string
  // For new documents
  createPatch?: Record<string, unknown>
  // For updates
  patch?: Record<string, unknown>
}) {
  // Placeholder: this repo currently uses the Sanity client only for reads in the frontend.
  // Full CMS write support is handled in the AdminCmsPanel UI.
  // This helper is created to centralize future mutation logic.
  const { type, id, createPatch, patch } = params
  void patch

  if (!type) throw new Error('Missing sanity document type')
  if (!id) {
    // create
    void createPatch
    throw new Error('Sanity write support (client.create/client.patch) is not available in this frontend build.')
  }
  // update
  throw new Error('Sanity write support (client.patch) is not available in this frontend build.')
}

