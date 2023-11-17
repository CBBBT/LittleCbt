const { WechatyBuilder, ScanStatus } = require('wechaty')
const wechaty = WechatyBuilder.build()
const qrcode = require('qrcode-terminal')
const fs = require('fs')

const onScan = (code, status) => {
  switch (status) {
    case ScanStatus.Cancel:
      // 取消登录
      break
    case ScanStatus.Confirmed:
      // 登录已确认
      break
    case ScanStatus.Scanned:
      fs.appendFileSync('sys.cbtlog', `${new Date().toLocaleString()} 已扫描微信登录二维码\n`)
      break
    case ScanStatus.Timeout:
      // 二维码超时
      break
    case ScanStatus.Waiting:
      let codeUrl = encodeURIComponent(code)
      fs.appendFileSync('sys.cbtlog', `${new Date().toLocaleString()} 等待扫描二维码登录微信\n`)
      console.log(`=================扫描二维码登录=================`)
      console.log(`==========或打开链接扫码：https://wechaty.js.org/qrcode/${codeUrl} ==========`)
      qrcode.generate(code, { small: true })
      break
    case ScanStatus.Unknown:
    default:
      // 未知
      break
  }
}
const onMessage = async (message) => {
  fs.appendFileSync('sys.cbtlog', `${new Date().toLocaleString()} 收到消息【${MessageTypeMap[message.type()]}(${message.type()})】\n\t\t${message}\n`)
  // 发送消息的用户
  const contact = message.talker()
  // 微信群
  const room = message.room()

  // 收到文字消息
  if (message.type() === wechaty.Message.Type.Text) {
    // 消息文本
    const text = message.text()

    // 在微信群里
    if (room) {
      const topic = await room.topic()
      console.log(`【群聊 ${topic}】${contact.name()}：${text}`)
      // 有人@我
      const beMentioned = await message.mentionSelf()
      if (beMentioned) {
        let answer = await ctx.service.spark.webSocketSend(text)
        room.say(answer, contact)
      }
    }
    // 私聊
    else {
      console.log(`${contact.name()}：${text}`)
      let answer = await ctx.service.spark.webSocketSend(text)
      message.say(answer)
    }
  }
}
const onLogin = async (user) => {
  fs.appendFileSync('sys.cbtlog', `${new Date().toLocaleString()} 微信用户《${user.name()}》登录成功\n`)
}

const MessageTypeMap = {
  0: '未知',
  1: '附件',
  2: '音频',
  3: '名片',
  4: '聊天记录',
  5: '表情',
  6: '图片',
  7: '文本',
  8: '定位',
  9: '小程序',
  10: '接龙',
  11: '转账',
  12: '红包',
  13: '撤回',
  14: '链接',
  15: '视频',
  16: 'Post',
}

const { Service } = require('egg')
let ctx
class WechatService extends Service {
  async start() {
    fs.appendFileSync('sys.cbtlog', `${new Date().toLocaleString()} 启动微信机器人\n`)
    ctx = this.ctx
    wechaty
      .on('scan', onScan)
      .on('login', onLogin)
      .on('logout', (user) => fs.appendFileSync('sys.cbtlog', `${new Date().toLocaleString()} 微信用户《${user.name()}》退出登录\n`))
      .on('error', (e) => fs.appendFileSync('sys.cbtlog', `${new Date().toLocaleString()} 微信机器人报错：${e}\n`))
      .on('message', onMessage)
    await wechaty.start()
  }
}
module.exports = WechatService
