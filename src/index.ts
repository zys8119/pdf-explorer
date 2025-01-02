import { PdfExplorerParse } from "./parse";
export class PdfExplorer extends PdfExplorerParse {
  fileData: Blob = new Blob([]);
  constructor() {
    super();
  }
  async parse() {
    await super.parse();
  }
  async load(url: string | ArrayBuffer | Blob) {
    let content = new Blob([]);
    if (typeof url === "string") {
      url = await (await fetch(url)).arrayBuffer();
    } else if (url instanceof Blob) {
      url = await url.arrayBuffer();
    }
    this.fileData = new Blob([url]);
    await this.parse();
    return this;
  }
}
export default PdfExplorer;
