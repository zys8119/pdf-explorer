import {
  only_obj_reg_split,
  obj_key_reg,
  pdf_header_start_tag,
  obj_stream_reg,
} from "./regexpConfig";
import { _debug } from "./utils";
export class PdfExplorerParse {
  fileData: Blob = new Blob([]);
  objs: Record<string, any> = {};
  private content = "";
  constructor() {}
  private get version() {
    return pdf_header_start_tag.exec(this.content)?.[1] || "";
  }
  private heades: string[] = [];
  get rootHeader(): string {
    return this.heades.find((e) => /\/Root/.test(e)) || "";
  }
  async parse() {
    this.content = (await this.fileData.text()) || "";
    this.heades = (this.content.match(/<<.*>>/g) as string[]) || [];
    try {
      await this.parseContent();
    } catch (error) {
      console.error(error);
      throw "解析失败";
    }
  }
  rootInfo: Record<string, any> = {};
  async parseRootInfo() {
    const info = await this.getObjHeaderInfo(this.rootHeader);
    const _this = this;
    const _Cache = new Map();
    await (async function run(info: any, index = 0) {
      for (const keyName in info) {
        if (
          info.hasOwnProperty(keyName) &&
          /\d+\s*\d+\s*R/.test(info[keyName])
        ) {
          const obj = info[keyName].trim().replace("R", "obj");
          if (_Cache.has(obj)) {
            console.log(111);
            info[keyName] = _Cache.get(obj);
            continue;
          }
          const reg = new RegExp(`${obj}(.*?)endobj`, "s");
          const match = reg.exec(_this.content);
          const data = await _this.getObjHeaderInfo(match?.[1] ?? "");
          if (index < 10) {
            await run(data, index + 1);
          }
          info[keyName] = data;
          _Cache.set(obj, data);
        }
      }
    })(info);
    this.rootInfo = info;
  }
  // todo 需要开启新进程，防止影响主线程
  async parseContent() {
    await this.parseRootInfo();
    // 通过endobj分割对象
    // const chunks = [];
    // let start = 0;
    // let tmp = "";
    // while (start < content.length) {
    //   // if (_debug(chunks.length > 5)) {
    //   // break;
    //   // }
    //   if (only_obj_reg_split.test(tmp)) {
    //     chunks.push(tmp.replace(only_obj_reg_split, ""));
    //     tmp = "";
    //   } else {
    //     tmp += content[start];
    //   }
    //   start += 1;
    // }
    // if (tmp) {
    //   chunks.push(tmp.replace(only_obj_reg_split, ""));
    // }
    // // 提取对象信息
    // const objs: Record<string, any> = {
    //   otherObjs: [],
    // };
    // await Promise.all(
    //   chunks.map(async (chunk) => {
    //     const match = obj_key_reg.exec(chunk);
    //     if (match) {
    //       objs[match[2]] = {
    //         info: await this.parseChunk(chunk.replace(match[0], "")),
    //         stream: /endstream/.test(chunk)
    //           ? chunk
    //               .replace(/endstream(.|\n)*/, "")
    //               .replace(/(.|\n)*stream/, "")
    //           : null,
    //         chunk,
    //       };
    //     } else {
    //       objs.otherObjs.push(chunk);
    //     }
    //   })
    // );
    // this.objs = objs;
  }

  async parseChunk(chunk: string) {
    if (pdf_header_start_tag.test(chunk)) {
      chunk = chunk.replace(pdf_header_start_tag, "");
    }
    chunk = chunk.match(/<<.*>>/)?.[0] ?? ("" as any);
    const chunkMap = await this.elementConstructionSerialization(chunk);
    return await this.chunkMapToObj(chunkMap);
  }
  async getObjHeaderInfo(headerStr: string) {
    const map = await this.elementConstructionSerialization(headerStr);
    const obj = await this.chunkMapToObj(map);
    return obj;
  }
  async chunkMapToObj(chunkMap: Record<any, any>) {
    chunkMap = JSON.parse(JSON.stringify(chunkMap));
    const arr = Object.keys(chunkMap)
      .map((key) => {
        const m = /\$\$(.)__(\d+)/.exec(key);
        return {
          key,
          type: m?.[1],
          number: Number(m?.[2]),
        };
      })
      .sort((a, b) => b.number - a.number);
    if (arr.length === 0) {
      return {};
    }
    let index = 0;
    while (index < arr.length) {
      let obj: any = {};
      const { key, type } = arr[index];
      if (type === "A") {
        obj = "";
      } else if (type === "B") {
        obj = [];
      } else if (type === "C") {
        obj = {};
      }
      chunkMap[key]
        .split("/")
        .filter(Boolean)
        .forEach((e: any) => {
          if (type === "A") {
            obj += e;
          } else if (type === "B") {
            obj.push(
              ...e
                .split("R")
                .map((e: any, k: number) => e.trim())
                .filter(Boolean)
            );
          } else if (type === "C") {
            const [k, ...v] = e.split(" ");
            obj[k] = v.join(" ");
          }
        });
      chunkMap[key] = obj;
      index += 1;
    }

    for (const k in chunkMap[arr[0].key]) {
      const item = chunkMap[arr[0].key][k]?.trim();
      if (chunkMap[item]) {
        chunkMap[arr[0].key][k] = (function run(value: any): any {
          const type = Object.prototype.toString.call(value);
          if (type === "[object Object]") {
            return Object.fromEntries(
              Object.entries(value).map(([k, v]) => [k, run(v)])
            );
          } else if (type === "[object Array]") {
            return value.map(run);
          } else {
            if (chunkMap[value.trim()]) {
              return run(chunkMap[value.trim()]);
            }
            if (/\$\$\w__\d+__\w\$\$/.test(value)) {
              (value.match(/\$\$\w__\d+__\w\$\$/g) || []).forEach((e: any) => {
                value = value.replace(e, chunkMap[e]);
              });
            }
            return value;
          }
        })(chunkMap[item]);
      }
    }
    return chunkMap[arr[0].key];
  }

  async elementConstructionSerialization(
    chunk: string,
    results: Record<any, any> = {},
    index: number = 0
  ) {
    let key = "";
    let m: any = true;
    // 字符串
    key = m && m !== true ? key : `$$A__${index}__A$$`;
    m = m && m !== true ? m : /\(([^\(\)]*)\)/.exec(chunk);
    // 数组
    key = m && m !== true ? key : `$$B__${index}__B$$`;
    m = m && m !== true ? m : /\[([^\[\]]*)\]/.exec(chunk);
    // 字典
    key = m && m !== true ? key : `$$C__${index}__C$$`;
    m = m && m !== true ? m : /<<((.|\n)*)>>/.exec(chunk);
    if (m && m !== true) {
      results[key] = m[1];
      await this.elementConstructionSerialization(
        chunk.replace(m[0], ` $${key}$ `),
        results,
        index + 1
      );
    }
    return results;
  }
}
export default PdfExplorerParse;
