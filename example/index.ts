import { PdfExplorer } from "pdf-explorer";
(async () => {
  const pdfExplorer = new PdfExplorer();
  const pdf = await pdfExplorer.load("http://localhost:3000/test1.pdf");
  console.log(pdf);
})();
