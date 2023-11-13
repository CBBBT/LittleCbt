const { WechatyBuilder, ScanStatus } = require('wechaty')
const wechaty = WechatyBuilder.build()
const qrcode = require('qrcode-terminal')
const onScan = (code, status) => {
  switch (status) {
    case ScanStatus.Cancel:
      console.log(`=================取消登录=================`)
      break
    case ScanStatus.Confirmed:
      console.log(`=================登录已确认=================`)
      break
    case ScanStatus.Scanned:
      console.log(`=================已扫描二维码=================`)
      break
    case ScanStatus.Timeout:
      console.log(`=================二维码超时=================`)
      break
    case ScanStatus.Waiting:
      let codeUrl = encodeURIComponent(code)
      console.log(`=================扫描二维码登录=================`)
      console.log(
        `==========或打开链接扫码：https://wechaty.js.org/qrcode/${codeUrl} ==========`
      )
      qrcode.generate(code, { small: true })
      break
    case ScanStatus.Unknown:
    default:
      console.log(`=================未知=================`)
      break
  }
}
const onMessage = async (message) => {
  console.log(`=================收到消息=================`)
  console.log(`消息: ${message}`)
  console.log(`类型：${MessageTypeMap[message.type()]}（${message.type()}）`)
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
        room.say(`@我干啥啊？`, contact)
      }
    }
    // 私聊
    else {
      console.log(`${contact.name()}：${text}`)
      // message.say(`收到消息: ${ text }`)
    }
  }

  // 撤回的消息
  if (message.type() === wechaty.Message.Type.Recalled) {
    // 在微信群里
    if (room) {
      const topic = await room.topic()
      console.log(`【群聊 ${topic}】${contact.name()}撤回了一条消息}`)
    }
    // 私聊
    else {
      console.log(`${contact.name()}撤回了一条消息`)
    }
  }
}
const onLogin = async (user) => {
  console.log(`用户 ${user} 登录成功`)
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
  16: 'Post'
}

const { Service } = require('egg')
class WechatService extends Service {
  async start() {
    wechaty
      .on('scan', onScan)
      .on('login', onLogin)
      .on('logout', (user) => console.log(`用户 ${user} 退出登录`))
      .on('error', (e) => console.error(e))
      .on('message', onMessage)

    await wechaty.start()
  }
}
module.exports = WechatService
