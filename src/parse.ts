export class PdfExplorerParse {
  fileData: Blob = new Blob([]);
  constructor() {}
  async parse() {
    console.log("parse", this.fileData);
  }
}
export default PdfExplorerParse;
