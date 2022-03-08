import fetch from 'node-fetch'
import { open } from 'lmdb' // or require
import conf from './config'

interface Prop {
  value: string
}
interface Tag {
  props: Prop[]
}

// CHAIN_ID === 1: production, else staging.
const blockscanDB = open({
  path: `db-${conf.CHAIN_ID}`,
})

const tagsFromEndpoint = async (
  subgraphEndpoint: string,
  list: string,
): Promise<Tag[]> => {
  const subgraphQuery = {
    query: `
      {
        registered: litems(where: { registryAddress: "${list.toLowerCase()}", status:  Registered }) {
          props {
            value
          }
        }
        clearingRequested: litems(where: { registryAddress: "${list.toLowerCase()}", status:  ClearingRequested }) {
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

const textDuplicates = async (
  publicNameTag: string,
  listAddress: string,
  subgraphEndpoint: string,
) => {
  const duplicateQuery = `
    {
      itemSearch(text: "${listAddress} & '${publicNameTag
    .trim()
    .replace(' ', ' & ')}':*", status:  Registered) {
        id
      }
    }
  `
  const response = await (
    await fetch(subgraphEndpoint, {
      method: 'POST',
      body: JSON.stringify({
        query: duplicateQuery,
      }),
    })
  ).json()

  const { data } = response
  const { itemSearch: items } = data
  return items
}

async function init() {
  let registeredTags: Tag[] = []
  try {
    console.info(`Fetching registered tags from mainnet subgraph...`)
    const mainnetTags = await tagsFromEndpoint(
      conf.MAINNET_GTCR_SUBGRAPH_URL,
      conf.MAINNET_LIST_ADDRESS,
    )
    console.info(`Fetching registered tags from xdai subgraph...`)
    const xdaiTags = await tagsFromEndpoint(
      conf.XDAI_GTCR_SUBGRAPH_URL,
      conf.XDAI_LIST_ADDRESS,
    )
    registeredTags = registeredTags.concat(mainnetTags).concat(xdaiTags)
    console.info(`Got ${registeredTags.length} registered tags.`)
  } catch (error) {
    console.error(`Failed to fetch items`, error)
    return
  }

  for (const tag of registeredTags) {
    const { props } = tag
    const [addressObj, publicNameTagObj, publicNoteObj, websiteObj] = props
    const address = addressObj.value
    const website = websiteObj.value || ``
    const publicNote = publicNoteObj.value || ``
    let publicNameTag = publicNameTagObj.value || ``

    publicNameTag = publicNameTag.slice(0, 35)

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) continue // Not an ETH address.
    if (blockscanDB.get(address) || blockscanDB.get(address.toLowerCase()))
      continue // Tag already posted to API.
    if (publicNameTag.length > 35) continue // Exceeds max length.
    if (publicNote.length === 0) continue // Mandatory field.

    try {
      const mainnetDupes = await textDuplicates(
        publicNameTag,
        conf.MAINNET_GTCR_SUBGRAPH_URL,
        conf.MAINNET_LIST_ADDRESS,
      )
      const xdaiDupes = await textDuplicates(
        publicNameTag,
        conf.XDAI_GTCR_SUBGRAPH_URL,
        conf.XDAI_LIST_ADDRESS,
      )

      if (mainnetDupes.length + xdaiDupes.length > 1) continue // Duplicate, ignore.
    } catch (error) {
      console.error(
        `Failed to check dupes for name tag ${publicNameTag}`,
        error,
      )
      continue
    }

    /**
     * You can't check if an address is dupe, because it's saved as string
     * It could have a different lower case and upper case combo
     */

    try {
      const query = `
          https://repaddr.blockscan.com/reportaddressapi?apikey=${conf.API_KEY}&address=${address}&chain=ETH&actiontype=1&customname=${publicNameTag}&comment=${publicNote}&infourl=${website}`
      if (conf.CHAIN_ID === '1') {
        const resp = await fetch(query)
        console.info(await resp.json())
        blockscanDB.put(address.toLowerCase(), true)
      } else {
        console.info(
          `CHAIN_ID is ${conf.CHAIN_ID} so we're staging. Query and address saved would've been:`,
        )
        console.info(query)
        console.info(address.toLowerCase())
      }
    } catch (error) {
      console.error(`Failed to post tag for ${address}.`, error)
    }
  }

  console.info(`Done processing tags.`)
}

init()
