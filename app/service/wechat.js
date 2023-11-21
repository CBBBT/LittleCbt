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
  const messageType = `${MessageTypeMap[message.type()]}(${message.type()})`
  fs.appendFileSync('sys.cbtlog', `${new Date().toLocaleString()} 收到消息【${messageType}】\n\t\t${message}\n`)
  // 发送消息的用户
  const contact = message.talker()
  const contactName = contact.name()
  // 微信群
  const room = message.room()
  // 消息文本
  const text = message.text()
  const messageText = text.replace(new RegExp(`@${myWeChatName}`, 'g'), '').trim()

  // 清空上下文
  if (messageText === '清空上下文') {
    await ctx.service.mysql.insertMessage({ role: 'command', contactName, messageType: '命令', messageText, mentionSelf: 1 })
    app.config.spark.version++
    message.say(`好的捏，当前为会话${app.config.spark.version}`)
    return
  }

  // 切换大模型
  // todo

  // 收到文字消息
  if (message.type() === wechaty.Message.Type.Text) {
    // 在微信群里，仅记录被@消息
    if (room) {
      const topic = await room.topic()
      // 有人@我
      const beMentioned = await message.mentionSelf()
      if (beMentioned) {
        // 插入用户消息记录
        await ctx.service.mysql.insertMessage({ role: 'user', roomTopic: topic, contactName, messageType, messageText, mentionSelf: 1 })
        // 获取聊天记录上下文发起提问，生成回答并发送到微信
        let history = await ctx.service.mysql.selectMessageFilter(`roomTopic = "${topic}"`)
        let answer = await ctx.service.spark.getAiAnswer(text, history)
        room.say(answer)
        // room.say(answer, contact)
        // 插入 AI 回答记录
        await ctx.service.mysql.insertMessage({
          role: 'assistant',
          roomTopic: topic,
          contactName,
          messageType: '文本(7)',
          messageText: answer,
          mentionSelf: 1,
        })
      }
    }
    // 私聊
    else {
      // 插入用户消息记录
      await ctx.service.mysql.insertMessage({ role: 'user', contactName, messageType, messageText, mentionSelf: 1 })
      // 获取聊天记录上下文发起提问，生成回答并发送到微信
      let history = await ctx.service.mysql.selectMessageFilter(`roomTopic is null AND contactName = "${contactName}"`)
      let answer = await ctx.service.spark.getAiAnswer(text, history)
      message.say(answer)
      // 插入 AI 回答记录
      await ctx.service.mysql.insertMessage({
        role: 'assistant',
        contactName,
        messageText: answer,
        messageType: '文本(7)',
        mentionSelf: 1,
      })
    }
  }
}
const onLogin = async (user) => {
  myWeChatName = user.name()
  fs.appendFileSync('sys.cbtlog', `${new Date().toLocaleString()} 微信用户《${myWeChatName}》登录成功\n`)
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
let app
let ctx
let myWeChatName = ''
class WechatService extends Service {
  async start() {
    fs.appendFileSync('sys.cbtlog', `${new Date().toLocaleString()} 启动微信机器人\n`)
    app = this.app
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
