import {
  only_obj_reg_split,
  obj_key_reg,
  pdf_header_start_tag,
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
  async parse() {
    this.content = (await this.fileData.text()) || "";
    try {
      await this.parseContent(this.content);
    } catch (error) {
      console.error(error);
      throw "解析失败";
    }
  }
  // todo 需要开启新进程，防止影响主线程
  async parseContent(content: string) {
    // 通过endobj分割对象
    const chunks = [];
    let start = 0;
    let tmp = "";
    while (start < content.length) {
      if (_debug(chunks.length > 10)) {
        break;
      }
      if (only_obj_reg_split.test(tmp)) {
        chunks.push(tmp.replace(only_obj_reg_split, ""));
        tmp = "";
      } else {
        tmp += content[start];
      }
      start += 1;
    }
    if (tmp) {
      chunks.push(tmp.replace(only_obj_reg_split, ""));
    }
    // 提取对象信息
    const objs: Record<string, any> = {
      otherObjs: [],
    };
    await Promise.all(
      chunks.map(async (chunk) => {
        const match = obj_key_reg.exec(chunk);
        if (match) {
          objs[match[2]] = await this.parseChunk(chunk.replace(match[0], ""));
        } else {
          objs.otherObjs.push(chunk);
        }
      })
    );
    this.objs = objs;
  }
  async parseChunk(chunk: string) {
    const result = {};
    if (pdf_header_start_tag.test(chunk)) {
      chunk = chunk.replace(pdf_header_start_tag, "");
    }
    chunk = chunk.match(/<<.*>>/)?.[0] ?? ("" as any);
    const chunkMap = await this.elementConstructionSerialization(chunk);
    console.log(chunkMap);
    return result;
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
    m = m && m !== true ? m : /\(([^\(\)]+)\)/.exec(chunk);
    // 数组
    key = m && m !== true ? key : `$$B__${index}__B$$`;
    m = m && m !== true ? m : /\[([^\[\]]+)\]/.exec(chunk);
    // 字典
    key = m && m !== true ? key : `$$C__${index}__C$$`;
    m = m && m !== true ? m : /<<([^<>]+)>>/.exec(chunk);
    if (m && m !== true) {
      results[key] = m[1];
      await this.elementConstructionSerialization(
        chunk.replace(m[0], ` ${key}`),
        results,
        index + 1
      );
    }
    return results;
  }
}
export default PdfExplorerParse;
