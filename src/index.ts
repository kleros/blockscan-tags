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

  await Promise.all(
    newTags.map(async function postTag(tag) {
      const { props } = tag
      const [addressObj, publicNameTagObj, , websiteObj] = props
      const address = addressObj.value
      const publicNameTag = publicNameTagObj.value
      const website = websiteObj.value

      if (blockscanDB.get(address)) return // Tag already posted to API.

      console.info(`Posting ${address} tag to endpoint.`)
      try {
        await fetch(`
          https://repaddr.blockscan.com/reportaddressapi?apikey=${process.env.API_KEY}
          &address=${address}
          &chain=ETH
          &actiontype=1
          &comment=${publicNameTag}
          &infourl=${website}
        `)
        blockscanDB.put(address, true)
        console.info(`Tag for ${address} posted.`)
      } catch (error) {
        console.error(`Failed to post tag for ${address}.`, error)
      }
    }),
  )

  console.info(`Done processing tags.`)
}

init()
