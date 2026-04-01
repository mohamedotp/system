import XLSX from 'xlsx';
import path from 'path';

const filePath = path.join(__dirname, 'TV_prices_2026_v1-1 (2) 3.csv اسعار المنافس.xlsx');
try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log("Headers:", data[0]);
    console.log("First 3 rows of data:");
    console.log(data.slice(1, 4));
} catch (error) {
    console.error("Error reading excel file:", error);
}
