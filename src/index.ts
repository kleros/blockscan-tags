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

  let newTags: Tag[] = []
  try {
    console.info(`Fetching registered tags from subgraph...`)
    const response = await fetch(process.env.GTCR_SUBGRAPH_URL as string, {
      method: 'POST',
      body: JSON.stringify(subgraphQuery),
    })
    console.info('Done.')

    const { data } = await response.json()

    const { clearingRequested, registered } = data
    newTags = newTags.concat(clearingRequested).concat(registered)
    console.info(`Got ${newTags.length} registered tags.`)
  } catch (error) {
    console.error(`Failed to fetch items`, error)
    return
  }

  for (const tag of newTags) {
    const { props } = tag
    const [addressObj, publicNameTagObj, publicNoteObj, websiteObj] = props
    const address = addressObj.value || ``
    const website = websiteObj.value || ``
    const publicNote = publicNoteObj.value || ``
    let publicNameTag = publicNameTagObj.value || ``

    publicNameTag = publicNameTag.slice(0, 19)

    if (blockscanDB.get(address)) {
      return // Tag already posted to API.
    }

    try {
      const query = `
          https://repaddr.blockscan.com/reportaddressapi?apikey=${process.env.API_KEY}&address=${address}&chain=ETH&actiontype=1&customname=${publicNameTag}&comment=${publicNote}&infourl=${website}
        `
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
