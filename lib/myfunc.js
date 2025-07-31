/**
 * Utility functions for WhatsApp Bot
 */

const { proto, delay, getContentType } = require('@fizzxydev/baileys-pro')
const chalk = require('chalk')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const { fileTypeFromBuffer } = require('file-type')

const unixTimestampSeconds = (date = new Date()) => Math.floor(date.getTime() / 1000)

exports.unixTimestampSeconds = unixTimestampSeconds

exports.sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

exports.isUrl = (url) => {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi))
}

exports.getBuffer = async (url, options) => {
    try {
        options = options || {}
        const res = await axios({
            method: "get",
            url,
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Request': 1
            },
            ...options,
            responseType: 'arraybuffer'
        })
        return res.data
    } catch (err) {
        console.log(`Error getting buffer: ${err}`)
        return null
    }
}

/**
 * Parse message content into a more usable format
 */
exports.smsg = (conn, m, store) => {
    if (!m) return m
    let M = proto.WebMessageInfo
    if (m.key) {
        m.id = m.key.id
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = conn.decodeJid(m.fromMe && conn.user.id || m.participant || m.key.participant || m.chat || '')
    }
    if (m.message) {
        m.mtype = getContentType(m.message)
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype])
        try {
            m.body = m.message.conversation || m.msg.caption || m.msg.text || (m.mtype == 'listResponseMessage') && m.msg.singleSelectReply.selectedRowId || (m.mtype == 'buttonsResponseMessage') && m.msg.selectedButtonId || (m.mtype == 'viewOnceMessage') && m.msg.caption || m.text
        } catch {
            m.body = ''
        }
        m.text = m.body

        // --- BEGIN: Quoted message extraction ---
        let quoted = null;
        let contextInfo = m.msg && m.msg.contextInfo ? m.msg.contextInfo : null;
        if (contextInfo && contextInfo.quotedMessage) {
            quoted = {
                key: {
                    id: contextInfo.stanzaId,
                    fromMe: contextInfo.participant === conn.user.id,
                    remoteJid: contextInfo.remoteJid || m.chat,
                    participant: contextInfo.participant
                },
                message: contextInfo.quotedMessage,
                mtype: getContentType(contextInfo.quotedMessage),
                sender: conn.decodeJid(contextInfo.participant || ''),
                isGroup: m.isGroup,
                chat: m.chat
            };
            // Extract text from quoted message
            quoted.body = quoted.message.conversation || quoted.message.text || quoted.message.caption || quoted.message.selectedButtonId || quoted.message.singleSelectReply?.selectedRowId || '';
            quoted.text = quoted.body;
            m.quoted = quoted;
        }
        // --- END: Quoted message extraction ---
    }
    m.reply = (text, chatId = m.chat, options = {}) => conn.sendMessage(chatId, { text: text }, { quoted: m, ...options })
    
    return m
}

// Auto reload on file change
let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.greenBright(`Updated ${__filename}`))
    delete require.cache[file]
    require(file)
})