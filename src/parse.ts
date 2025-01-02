import { only_obj_reg_split, obj_key_reg } from "./regexpConfig";
export class PdfExplorerParse {
  fileData: Blob = new Blob([]);
  private content = "";
  constructor() {}
  private get version() {
    return /%PDF-(.*)/.exec(this.content)?.[1] || "";
  }
  async parse() {
    this.content = (await this.fileData.text()) || "";
    const content = this.content;
    // todo 需要开启新进程，防止影响主线程
    // 通过endobj分割对象
    const chunks = [];
    let start = 0;
    let tmp = "";
    while (start < content.length) {
      if (only_obj_reg_split.test(tmp)) {
        chunks.push(tmp);
        tmp = "";
      } else {
        tmp += content[start];
      }
      start += 1;
    }
    if (tmp) {
      chunks.push(tmp);
    }
    // 提取对象信息
    const objs: Record<string, any> = {
      otherObjs: [],
    };
    chunks.forEach((chunk) => {
      const match = obj_key_reg.exec(chunk);
      if (match) {
        objs[match[2]] = chunk.replace(match[0], "");
        console.log(match);
      } else {
        objs.otherObjs.push(chunk);
      }
    });
    console.log(objs);
  }
}
export default PdfExplorerParse;
