"use client";

export default function DeductionModal({
  employee,
  open,
  onClose,
  totalDeduction,
  deductionFields
}) {
  if (!open || !employee) return null;

  // دمج الخصومات الثابتة + المتغيرة في Array واحد
  const allDeductions = [
    ...deductionFields.map((field) => ({
      key: field.key,
      label: field.label,
      value: field.calc
        ? field.calc(employee)
        : employee[field.key] || 0
    })),
    ...(employee.deductions || []).map((item, idx) => ({
      key: `var-${idx}`,
      label: `استقطاع :- ${item.DEDUCTION_NAME.trim()}`,
      value: item.DEDUCTION_VALUE,
      stay: (item.DEDUCTION_STAY - item.DEDUCTION_VALUE === 0)
        ? 0
        : Math.max(0, item.DEDUCTION_STAY - item.DEDUCTION_VALUE)
    }))
  ];

// تقسيمهم لصفوف (كل صف عنصرين)
const rows = [];
for (let i = 0; i < allDeductions.length; i += 2) {
  rows.push(allDeductions.slice(i, i + 2));
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
          تفاصيل الخصومات
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
                {row.map((item) => (
                  <td
                    key={item.key}
                    className="w-1/2 p-3 border-b border-r-4 border-red-400"
                  >
                    <div className="flex justify-between items-center">
                      <div className="text-slate-600 text-sm">
                        {item.label}
                        {item.stay !== undefined && (
                          <span className="block text-xs text-slate-400">
                            متبقي: {Number(item.stay).toLocaleString("ar-EG")} ج.م
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-red-600">
                        {Number(item.value).toLocaleString("ar-EG")} ج.م
                      </span>
                    </div>

                  </td>

                ))}

                {/* لو الصف فيه عنصر واحد */}
                {row.length === 1 && <td className="w-1/2 border-b" />}
              </tr>

            ))}

          </tbody>
          <tfoot>
            <tr>
              <td
                colSpan={2}
                className="p-4 bg-red-50 border-t-2 border-red-400"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-600">
                    جملة الاستقطاعات المتنوعة
                  </span>
                  <span className="text-lg font-bold text-red-700">
                    {Number(employee.TOT_VAR_DED).toLocaleString("ar-EG")} ج.م
                  </span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t flex justify-between items-center bg-slate-50 rounded-b-2xl">
        <span className="font-bold text-slate-700">الإجمالي النهائي</span>
        <span className="font-bold text-red-700 text-lg">
          {totalDeduction?.calc(employee).toLocaleString("ar-EG")} ج.م
        </span>
      </div>
    </div>
  </div>
);
}
