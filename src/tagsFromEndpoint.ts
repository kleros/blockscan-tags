import { Tag } from './types'
import fetch from 'node-fetch'

const tagsFromEndpoint = async (
  subgraphEndpoint: string,
  list: string,
): Promise<Tag[]> => {
  const subgraphQuery = {
    query: `
      {
        registered: litems(where: { registryAddress: "${list.toLowerCase()}", status:  Registered }) {
          id
          props {
            value
          }
        }
        clearingRequested: litems(where: { registryAddress: "${list.toLowerCase()}", status:  ClearingRequested }) {
          id
          props {
            value
          }
        }
      }
    `,
  }

  const response = await fetch(subgraphEndpoint, {
    method: 'POST',
    body: JSON.stringify(subgraphQuery),
  })

  const { data } = await response.json()
  const { clearingRequested, registered } = data
  const registeredTags: Tag[] = clearingRequested.concat(registered)
  return registeredTags
}

export default tagsFromEndpoint
