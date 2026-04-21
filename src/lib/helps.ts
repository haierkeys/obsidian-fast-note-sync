import { Notice, moment } from "obsidian";


/**
 * timestampToDate
 * 将时间戳转换为格式化的日期字符串（YYYY-MM-DD HH:mm:ss）
 * @param timestamp - 时间戳（以毫秒为单位）
 * @returns 格式化的日期字符串
 */
export const timestampToDate = function (timestamp: number): string {
  return moment(timestamp).format("YYYY-MM-DD HH:mm:ss")
}

/**
 * stringToDate
 * 将日期字符串转换为格式化的日期字符串（YYYY-MM-DD HH:mm:ss）
 * 如果输入的日期字符串为空，则使用默认日期 "1970-01-01 00:00:00"
 * @param date - 日期字符串
 * @returns 格式化的日期字符串
 */
export const stringToDate = function (date: string): string {
  if (!date || date == "") {
    date = "1970-01-01 00:00:00"
  }
  return moment(date).format("YYYY-MM-DD HH:mm:ss")
}

/**
 * hashContent
 * 使用简单的哈希函数生成输入字符串的哈希值
 * @param content - 要哈希的字符串内容
 * @returns 字符串内容的哈希值
 */
export const hashContent = function (content: string): string {
  // 使用简单的哈希函数生成哈希值
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash &= hash
  }
  return String(hash)
}

/**
 * showErrorDialog
 * 显示一个错误对话框，内容为传入的消息
 * @param message - 要显示的错误消息
 */
export const showErrorDialog = function (message: string): void {
  new Notice(message)
}

/**
 * dump
 * 将传入的消息打印到控制台
 * @param message - 要打印的消息，可以是多个参数
 */
export const dump = function (...message: unknown[]): void {
  //console.log(...message)
}




export function isHttpUrl(url: string): boolean {
  return /^https?:\/\/.+/i.test(url);
}

export function isWsUrl(url: string): boolean {
  return /^wss?:\/\/.+/i.test(url);
}