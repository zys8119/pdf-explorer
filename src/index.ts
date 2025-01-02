export class PdfExplorer {
  constructor() {}
  async load(url: string | ArrayBuffer | Blob) {
    if (typeof url === "string") {
      url = await (await fetch(url)).arrayBuffer();
    } else if (url instanceof Blob) {
      url = await url.arrayBuffer();
    }
    console.log(url);
  }
}
export default PdfExplorer;
