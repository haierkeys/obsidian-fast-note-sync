import { Notice, moment, Menu, MenuItem } from "obsidian";

import { CONFIG_ROOT_FILES_TO_WATCH } from './config_operator';
import { $ } from "../lang/lang";
import FastSync from "../main";


export const getFileName = function (path: string, includeExt: boolean = true): string {
  const base = path.split(/[\\/]/).pop() || ""
  const lastDotIndex = base.lastIndexOf(".")

  // 如果没有点，或者点在字符串末尾（即没有实际后缀内容），视为不含后缀
  if (lastDotIndex === -1) return ""

  if (includeExt) return base
  return base.substring(0, lastDotIndex)
}

export const getDirName = function (path: string): string {
  // 1. 统一将 Windows 分隔符 \ 替换为 /，方便统一处理
  // 2. 找到最后一个斜杠的位置
  const lastSlashIndex = path.replace(/\\/g, "/").lastIndexOf("/");

  // 如果找不到斜杠，说明路径只包含文件名（在当前目录下），返回空字符串
  if (lastSlashIndex === -1) return "";

  const parts = path.split("/");
  return parts[0] || "";
};

export const getDirNameOrEmpty = function (path: string): string {
  return path != undefined && path.includes(".") ? "" : path;
};




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
 * hashArrayBuffer
 * 使用简单的哈希函数生成 ArrayBuffer 的哈希值
 * @param buffer - 要哈希的 ArrayBuffer
 * @returns 内容的哈希值
 */
export const hashArrayBuffer = function (buffer: ArrayBuffer): string {
  let hash = 0
  const view = new Uint8Array(buffer)
  for (let i = 0; i < view.length; i++) {
    const byte = view[i]
    hash = (hash << 5) - hash + byte
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

// 默认开启日志
let isLogEnabled = false

export const setLogEnabled = (enabled: boolean) => {
  isLogEnabled = enabled
}

/**
 * dump
 * 将传入的消息打印到控制台
 * @param message - 要打印的消息，可以是多个参数
 */
export const dump = function (...message: unknown[]): void {
  if (isLogEnabled) {
    console.log(...message)
  }
}

export const dumpTable = function (message: any): void {
  if (isLogEnabled) {
    console.table(message)
  }
}

export function isHttpUrl(url: string): boolean {
  return /^https?:\/\/.+/i.test(url)
}

export function isWsUrl(url: string): boolean {
  return /^wss?:\/\/.+/i.test(url)
}

/**
 * 为 URL 增加随机参数以防止缓存
 */
export function addRandomParam(url: string): string {
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}_t=${Date.now()}`
}

/**
 * 延迟执行（让出主线程）
 * @param ms 毫秒
 */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
