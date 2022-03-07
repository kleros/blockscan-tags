import fetch from 'node-fetch'
import { open } from 'lmdb' // or require

interface Prop {
  value: string
}
interface Tag {
  props: Prop[]
}

const blockscanDB = open({
  path: `db-${process.env.CHAIN_ID as string}`,
})

async function init() {
  const subgraphQuery = {
    query: `
      {
        registered: litems(where: { registryAddress: "${(
          process.env.LIST_ADDRESS as string
        ).toLowerCase()}", status:  Registered }) {
          props {
            value
          }
        }
        clearingRequested: litems(where: { registryAddress: "${(
          process.env.LIST_ADDRESS as string
        ).toLowerCase()}", status:  ClearingRequested }) {
          props {
            value
          }
        }
      }

    `,
  }

  let registeredTags: Tag[] = []
  try {
    console.info(`Fetching registered tags from subgraph...`)
    const response = await fetch(process.env.GTCR_SUBGRAPH_URL as string, {
      method: 'POST',
      body: JSON.stringify(subgraphQuery),
    })
    console.info('Done.')

    const { data } = await response.json()

    const { clearingRequested, registered } = data
    registeredTags = registeredTags.concat(clearingRequested).concat(registered)
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

    publicNameTag = publicNameTag.slice(0, 33)

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) continue // Not an ETH address.
    if (blockscanDB.get(address)) continue // Tag already posted to API.
    if (publicNameTag.length > 33) continue // Exceeds max length.
    if (publicNote.length === 0) continue // Mandatory field.

    const duplicateQuery = `
      {
        itemSearch(text: "${process.env.LIST_ADDRESS} & '${publicNameTag
      .trim()
      .replace(' ', ' & ')}':*", status:  Registered) {
          id
        }
      }
    `
    const response = await (
      await fetch(process.env.GTCR_SUBGRAPH_URL as string, {
        method: 'POST',
        body: JSON.stringify({
          query: duplicateQuery,
        }),
      })
    ).json()

    const { data } = response
    const { itemSearch: items } = data

    if (items.length > 1) continue // Duplicate, ignore.

    try {
      const query = `
          https://repaddr.blockscan.com/reportaddressapi?apikey=${process.env.API_KEY}&address=${address}&chain=ETH&actiontype=1&customname=${publicNameTag}&comment=${publicNote}&infourl=${website}        `

      const resp = await fetch(query)
      console.info(await resp.json())
      blockscanDB.put(address, true)
    } catch (error) {
      console.error(`Failed to post tag for ${address}.`, error)
    }
  }

  console.info(`Done processing tags.`)
}

init()
