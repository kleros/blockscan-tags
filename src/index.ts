import fetch from 'node-fetch'
import { open } from 'lmdb' // or require
import conf from './config'
import tagsFromEndpoint from './tagsFromEndpoint'
import { Tag } from './types'

// CHAIN_ID === 1: production, else staging.
const blockscanDB = open({
  path: `db-${conf.CHAIN_ID}`,
})

const nameTagDB = open({
  path: `db-tag-${conf.CHAIN_ID}`,
})

const init = async () => {
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
    if (blockscanDB.get(address.toLowerCase())) continue // Address already posted to API.
    if (publicNameTag.length > 35) continue // Exceeds max length.
    if (publicNote.length === 0) continue // Mandatory field.
    if (nameTagDB.get(publicNameTag.toLowerCase())) continue // Exact name tag already posted.

    try {
      const query = `
          https://repaddr.blockscan.com/reportaddressapi?apikey=${conf.API_KEY}&address=${address}&chain=ETH&actiontype=1&customname=${publicNameTag}&comment=${publicNote}&infourl=${website}`
      if (conf.CHAIN_ID === '1') {
        const resp = await fetch(query)
        console.info(await resp.json())
        blockscanDB.putSync(address.toLowerCase(), true)
        nameTagDB.putSync(publicNameTag.toLowerCase(), true)
      } else {
        console.info(
          "Staging. Query, address, and nameTag saved would've been:",
        )
        console.info(query)
        console.info(address.toLowerCase())
        console.info(publicNameTag.toLowerCase())
      }
    } catch (error) {
      console.error(`Failed to post tag for ${address}.`, error)
    }
  }

  console.info(`Done processing tags.`)
}

init()
