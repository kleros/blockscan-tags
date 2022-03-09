/**
 * Will be ran to migrate from the previous non-dupe format to the new one
 * Get all addresses in lowerCase to make sure there are no dupe addresses
 * Get all nameTags as well to avoid dupe name tags
 * This assumes that never a tag passed and then was removed
 */

import { open } from 'lmdb' // or require
import conf from './config'
import tagsFromEndpoint from './tagsFromEndpoint'
import { Tag } from './types'

const blockscanDB = open({
  path: `db-1`,
})

const nameTagDB = open({
  path: `db-tag-1`,
})

const migrateDb = async () => {
  let registeredTags: Tag[] = []
  try {
    console.info(`Fetching registered tags from mainnet subgraph...`)
    const mainnetTags = await tagsFromEndpoint(
      conf.MAINNET_GTCR_SUBGRAPH_URL,
      conf.MAINNET_LIST_ADDRESS,
    )
    registeredTags = registeredTags.concat(mainnetTags)
    console.info(`Got ${registeredTags.length} registered tags.`)
  } catch (error) {
    console.error(`Failed to fetch items`, error)
    return
  }

  for (const tag of registeredTags) {
    const { props } = tag
    const [addressObj, publicNameTagObj] = props
    const address = addressObj.value
    let publicNameTag = publicNameTagObj.value || ``

    publicNameTag = publicNameTag.slice(0, 35)

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) continue // Not an ETH address.
    if (publicNameTag.length > 35) continue // Exceeds max length.
    // if (publicNote.length === 0) continue // Usually mandatory, but
    // in the first list some addresses were submitted without it.

    console.info('putting in db:', { address, publicNameTag })
    blockscanDB.putSync(address.toLowerCase(), true)
    nameTagDB.putSync(publicNameTag.toLowerCase(), true)
  }
}

migrateDb()
