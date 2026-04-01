"use client";

export default function IncomeModal({
  employee,
  open,
  onClose,
  incomeFields,
  totalVar
}) {
  if (!open || !employee) return null;

  // تقسيم الإيرادات لصفوف (كل صف عنصرين)
  const rows = [];
  for (let i = 0; i < incomeFields.length; i += 2) {
    rows.push(incomeFields.slice(i, i + 2));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-bold text-slate-800">
            تفاصيل الإيرادات
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-red-500 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <table className="w-full border-collapse">
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="even:bg-slate-50">
                  {row.map((field) => {
                    const value = field.calc
                      ? field.calc(employee)
                      : employee[field.key] || 0;

                    return (
                      <td
                        key={field.key}
                        className="w-1/2 p-3 border-b border-r-4 border-green-400"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 text-sm">
                            {field.label}
                          </span>
                          <span className="font-bold text-green-600">
                            {Number(value).toLocaleString("ar-EG")} ج.م
                          </span>
                        </div>
                      </td>
                    );
                  })}

                  {/* لو الصف فيه عنصر واحد بس */}
                  {row.length === 1 && <td className="w-1/2 border-b" />}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-between items-center bg-slate-50 rounded-b-2xl">
          <span className="font-bold text-slate-700">الإجمالي</span>
          <span className="font-bold text-green-700 text-lg">
            {totalVar?.calc(employee).toLocaleString("ar-EG") || 0} ج.م
          </span>
        </div>
      </div>
    </div>
  );
}
