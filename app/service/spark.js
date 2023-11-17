// 讯飞星火大模型API文档：https://www.xfyun.cn/doc/spark/Web.html#_1-%E6%8E%A5%E5%8F%A3%E8%AF%B4%E6%98%8E
// 讯飞开放平台：https://console.xfyun.cn/services/cbm
const { Service } = require('egg')
const CryptoJS = require('crypto-js')
const ws = require('ws')
const fs = require('fs')

class SparkService extends Service {
  getWebsocketUrl() {
    // 获取 APIKey 和 APISecret 参数
    const { API_KEY, API_SECRET, WS_URL } = this.ctx.app.config.spark
    // 鉴权参数
    let host = 'spark-api.xf-yun.com'
    let path = '/v3.1/chat'
    let date = new Date().toGMTString()

    // 生成signature
    let temp = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`
    let signatureSha = CryptoJS.HmacSHA256(temp, API_SECRET)
    let signature = CryptoJS.enc.Base64.stringify(signatureSha)

    // 转为base64，生成authorization
    let authorizationOrigin = `api_key="${API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`
    let authorization = btoa(authorizationOrigin)

    // 拼接URL
    return `${WS_URL}?authorization=${authorization}&date=${date}&host=${host}`
  }
  async connect() {
    fs.appendFileSync('spark.cbtlog', `${new Date().toLocaleString()} 开始连接《星火大模型》\n`)
    return new Promise((resolve, reject) => {
      const wsUrl = this.getWebsocketUrl()
      fs.appendFileSync('spark.cbtlog', `${new Date().toLocaleString()} socket地址创建成功\n\t\t${wsUrl}\n`)
      const socket = new ws(wsUrl)
      socket.on('open', () => {
        fs.appendFileSync('spark.cbtlog', `${new Date().toLocaleString()} socket连接已打开(${socket.readyState})\n`)
        resolve({ socket })
      })
      socket.on('error', (e) => {
        fs.appendFileSync('spark.cbtlog', `${new Date().toLocaleString()} socket连接失败(${socket.readyState})\n\t\t${e}\n`)
        reject({ error: e })
      })
      socket.on('close', (code) => {
        fs.appendFileSync('spark.cbtlog', `${new Date().toLocaleString()} socket连接关闭(${socket.readyState})\n`)
      })
    })
  }

  // websocket发送数据
  async webSocketSend(text) {
    let { socket, error } = await this.connect()
    if (!socket) return error

    return new Promise((resolve, reject) => {
      let params = {
        header: {
          app_id: this.ctx.app.config.spark.APPID,
          uid: 'little-cbt',
        },
        parameter: {
          chat: {
            domain: 'generalv3',
            temperature: 0.8,
            max_tokens: 2048,
          },
        },
        payload: {
          message: {
            text: [
              {
                role: 'user',
                content: text,
              },
            ],
          },
        },
      }
      let answerOfAI = ''

      socket.on('message', (data) => {
        fs.appendFileSync('spark.cbtlog', `${new Date().toLocaleString()} socket接收数据\n`)
        let jsonData = JSON.parse(data)
        // 提问失败
        if (jsonData.header.code !== 0) {
          answerOfAI = `提问失败：${jsonData.header.message}`
          socket.close()
        } else {
          answerOfAI += jsonData.payload.choices.text.map((x) => x.content).join('')
          if (jsonData.header.status === 2) {
            socket.close()
            resolve(answerOfAI)
          }
        }
      })

      fs.appendFileSync('spark.cbtlog', `${new Date().toLocaleString()} socket发送数据\n`)
      socket.send(JSON.stringify(params))
    })
  }
}

module.exports = SparkService
