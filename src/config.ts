interface Config {
  MAINNET_GTCR_SUBGRAPH_URL: string
  MAINNET_LIST_ADDRESS: string
  XDAI_GTCR_SUBGRAPH_URL: string
  XDAI_LIST_ADDRESS: string
  NODE_ENV: string
  API_KEY: string
}

const getSanitizedConfig = (config: unknown): Config => {
  for (const [key, value] of Object.entries(
    config as { [value: string]: string | undefined },
  )) {
    if (value === undefined) {
      throw new Error(`Missing key ${key} in config.env`)
    }
  }
  return config as Config
}

const sanitizedConfig = getSanitizedConfig(process.env)

export default sanitizedConfig
