/* eslint valid-jsdoc: "off" */

'use strict'

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = (appInfo) => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = (exports = {})

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1699427592904_7412'

  // add your middleware config here
  config.middleware = []

  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
    spark: {
      APPID: '7d3e2caa',
      API_SECRET: 'MzQxNmNhNmE2MTdmMTA1Mzc1MWQ0Y2Q2',
      API_KEY: 'cd6ba4028ad317c83824912db0d1c8db',
      WS_URL: 'wss://spark-api.xf-yun.com/v3.1/chat'
    }
  }

  return {
    ...config,
    ...userConfig
  }
}
