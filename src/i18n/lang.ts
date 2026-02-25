import zhTW from "src/i18n/locales/zh-tw";
import zhCN from "src/i18n/locales/zh-cn";
import ptBR from "src/i18n/locales/pt-br";
import vi from "src/i18n/locales/vi";
import uk from "src/i18n/locales/uk";
import tr from "src/i18n/locales/tr";
import th from "src/i18n/locales/th";
import ru from "src/i18n/locales/ru";
import pt from "src/i18n/locales/pt";
import pl from "src/i18n/locales/pl";
import ko from "src/i18n/locales/ko";
import ja from "src/i18n/locales/ja";
import it from "src/i18n/locales/it";
import id from "src/i18n/locales/id";
//import fa from "src/lang/locale/fa";
import fr from "src/i18n/locales/fr";
import es from "src/i18n/locales/es";
import en from "src/i18n/locales/en";
import de from "src/i18n/locales/de";
import ar from "src/i18n/locales/ar";
import { moment } from "obsidian";


/**
 * Locale object type.
 * 假设每个 locale 文件都是键 => 字符串（常见情形），使用更严格的类型。
 */
export type LangMap = Record<string, string>;

export const localeMap: { [k: string]: Partial<typeof en> } = {
    ar,
    de,
    en,
    es,
    // fa,
    fr,
    // hu,
    id,
    it,
    ja,
    ko,
    //  ne,
    pl,
    pt,
    "pt-br": ptBR,
    ru,
    th,
    tr,
    uk,
    vi,
    "zh-cn": zhCN,
    "zh-tw": zhTW,
};

const locale = localeMap[moment.locale()] as Partial<LangMap> | undefined;


function getValueFromPath(root: Record<string, unknown>, path: string): unknown {
    const normalized = path
        .replace(/\[(?:'([^']*)'|"([^"]*)"|([^'\]"[\]]+))\]/g, (_m, g1, g2, g3) => {
            const key = g1 ?? g2 ?? g3;
            return "." + key;
        })
        .replace(/^\./, "");

    if (normalized === "") return undefined;

    const parts = normalized.split(".");
    let cur: unknown = root;
    for (const part of parts) {
        if (cur == null) return undefined;
        if (part === "") return undefined;
        if (typeof cur === "object") {
            cur = (cur as Record<string, unknown>)[part];
        } else {
            return undefined;
        }
    }
    return cur;
}


function interpolate(str: string, params: Record<string, unknown>): string {
    if (!str || typeof str !== "string") return String(str ?? "");
    return str.replace(/\$\{([^}]+)\}/g, (_match, expression) => {
        const path = expression.trim();
        if (!/^[A-Za-z0-9_.[\]'"\s-]+$/.test(path)) {
            return "";
        }
        const val = getValueFromPath(params, path);
        if (val === undefined || val === null) return "";
        if (typeof val === "string") return val;
        if (typeof val === "number" || typeof val === "boolean" || typeof val === "bigint") {
            return String(val);
        }
        try {
            return JSON.stringify(val);
        } catch {
            return "";
        }
    });
}


export function $(
    str: Extract<keyof typeof en, string>,
    params?: Record<string, unknown>
): string {
    // str 的类型现在必为 string，安全用于索引
    const key = str;
    const fallback = en[key];
    const result = (locale && (locale[key] as string)) ?? fallback ?? key;

    if (params) {
        return interpolate(result, params);
    }

    return result;
}


//   // CARD_TYPES_SUMMARY: "总卡片数: ${totalCardsCount}",
//   t("CARD_TYPES_SUMMARY", { totalCardsCount }),
/**

通过AI 进行多语言翻译

我提供一段typescript的代码，键的部分保持简体中文,你帮我把值的部分翻译成英文。


键的部分保持简体中文,再帮我把值的部分翻译成繁体中文


键的部分保持简体中文,再帮我把值的部分翻译成阿拉伯语 ar
//键的部分保持简体中文,再帮我把值的部分翻译成白俄罗斯语 be
//键的部分保持简体中文,再帮我把值的部分翻译成加泰罗尼亚语 ca
//键的部分保持简体中文,再帮我把值的部分翻译成丹麦语 da
键的部分保持简体中文,再帮我把值的部分翻译成德语 de
键的部分保持简体中文,再帮我把值的部分翻译成西班牙语   es
键的部分保持简体中文,再帮我把值的部分翻译成法语   fr
//键的部分保持简体中文,再帮我把值的部分翻译成希伯来语 he
//键的部分保持简体中文,再帮我把值的部分翻译成匈牙利语 hu
键的部分保持简体中文,再帮我把值的部分翻译成印度尼西亚语 id
键的部分保持简体中文,再帮我把值的部分翻译成意大利语   it
键的部分保持简体中文,再帮我把值的部分翻译成日语   ja
键的部分保持简体中文,再帮我把值的部分翻译成韩语   ko
//键的部分保持简体中文,再帮我把值的部分翻译成马来语 ms
键的部分保持简体中文,再帮我把值的部分翻译成挪威语 nb
//键的部分保持简体中文,再帮我把值的部分翻译成尼泊尔语 ne
键的部分保持简体中文,再帮我把值的部分翻译成荷兰语 nl
键的部分保持简体中文,再帮我把值的部分翻译成波兰语   pl
键的部分保持简体中文,再帮我把值的部分翻译成葡萄牙语  pt-br
键的部分保持简体中文,再帮我把值的部分翻译成葡萄牙语 pt
键的部分保持简体中文,再帮我把值的部分翻译成罗马尼亚语 ro
键的部分保持简体中文,再帮我把值的部分翻译成俄语 ru
//键的部分保持简体中文,再帮我把值的部分翻译成阿尔巴尼亚语 sq
键的部分保持简体中文,再帮我把值的部分翻译成泰语 th
键的部分保持简体中文,再帮我把值的部分翻译成土耳其语 tr
键的部分保持简体中文,再帮我把值的部分翻译成乌克兰语 uk
键的部分保持简体中文,再帮我把值的部分翻译成越南语 vi

语言对照表
am አማርኛ
ar اَلْعَرَبِيَّةُ
be беларуская мова
ca català
cs čeština
da Dansk
de Deutsch
en English
en-GB English (GB)
es Español
fa فارسی
fr Français
he עברית
hu Magyar
id Bahasa Indonesia
it Italiano
ja 日本語
kh ខ្មែរ
ko 한국어
ms Bahasa Melayu
ne नेपाली
nl Nederlands
no Norsk
pl Polski
pt Português
pt-BR Português do Brasil
ro Română
ru Pусский
sq Shqip
th ไทย
tr Türkçe
uk Українська
vi Tiếng Việt
zh 简体中文
zh-TW 繁體中文

*/