const fs = require('fs')
const { Service } = require('egg')
class mysqlService extends Service {
  async insertMessage(data) {
    let { roomTopic, contactName, messageType, messageText, mentionSelf, role } = data
    const result = await this.app.mysql.insert('messageRecord', {
      roomTopic,
      contactName,
      messageType,
      messageText,
      mentionSelf,
      role,
      sparkVersion: this.app.config.spark.version,
    })

    let res = result.affectedRows === 1 ? '成功插入一条数据' : '数据插入失败'
    fs.appendFileSync('sql.cbtlog', `${new Date().toLocaleString()} ${res}\n`)
  }

  async getNowVersion(model = 'spark') {
    let key = `${model}Version`
    const result = await this.app.mysql.query(`SELECT ${key} FROM messageRecord WHERE ${key} is not null ORDER BY createTime DESC LIMIT 0, 1`)

    fs.appendFileSync('sql.cbtlog', `${new Date().toLocaleString()} 从数据库获取了最新的${key}\n`)
    if (result[0]) return result[0][key]
    else return 0
  }

  async selectMessageFilter(filter = '') {
    if (filter) filter += ` and `
    filter += `sparkVersion = ${this.app.config.spark.version} and ( role = "user" || role = "assistant" )`
    if (1) filter += ` and mentionSelf = 1`
    const results = await this.app.mysql.query(`SELECT * FROM messageRecord WHERE ${filter}`)

    fs.appendFileSync('sql.cbtlog', `${new Date().toLocaleString()} 使用filter从数据库获取了数据\n`)
    return results
  }
}
module.exports = mysqlService
