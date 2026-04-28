import oracledb from "oracledb";
import bcrypt from "bcryptjs";

// تفعيل الـ Thick Mode لضمان العمل مع الإصدارات القديمة من أوراكل (فقط في حالة عدم وجود Mock)
if (typeof window === "undefined" && process.env.MOCK_DB !== "true") {
  if (!global._oracleInitialized) {
    try {
      const oracleClientPath = "C:\\oracle\\instantclient_19_25";
      oracledb.initOracleClient({ libDir: oracleClientPath });
      console.log("🚀 Oracle Thick Mode initialized successfully!");
      global._oracleInitialized = true;
    } catch (err) {
      if (err.message.includes("already initialized")) {
        global._oracleInitialized = true;
      } else {
        console.warn("⚠️ Oracle Thick Mode Failed to initialize (Normal if client not installed):", err.message);
      }
    }
  }
}

// دالة محاكاة لتنفيذ الاستعلامات
const mockExecute = async (sql, params = []) => {
  console.log("🛠️ Mock SQL Execute:", sql);
  console.log("📦 Params:", params);

  const sqlUpper = sql.toUpperCase();

  // محاكاة استعلام تسجيل الدخول
  if (sqlUpper.includes("PASSWORD_HASH")) {
    const hashedPassword = await bcrypt.hash("123456", 10);
    return {
      rows: [[hashedPassword]],
      metaData: [{ name: "PASSWORD_HASH" }]
    };
  }

  // محاكاة استعلام الموظفين
  if ((sqlUpper.includes("MAIN_MAST") || sqlUpper.includes("EMP_NUM")) && !sqlUpper.includes("RECIP_GEHA_NEW")) {
    return {
      rows: [
        [1001, "محمد أحمد", 10, "قسم تقنية المعلومات", 1],
        [1002, "أحمد علي", 20, "قسم الموارد البشرية", 2],
        [1003, "سارة محمود", 10, "قسم تقنية المعلومات", 1]
      ],
      metaData: [
        { name: "EMP_NUM" },
        { name: "EMP_NAME" },
        { name: "SEC_NO" },
        { name: "SEC_N" },
        { name: "NMBER_DOC" }
      ]
    };
  }

  // محاكاة استعلام المكاتبات الواردة (Import API)
  if (sqlUpper.includes("RECIP_GEHA_NEW") && !sqlUpper.includes("INSERT") && !sqlUpper.includes("UPDATE")) {
    return {
      rows: [
        [
          "MOCK-DOC-2026", // DOC_NO
          0, // SEEN_FLAG
          "مكاتبة تجريبية للتعديل والنص", // SUBJECT
          "2026-04-28 10:00", // DOC_DATE_STR
          "لم يتم الرد", // ANSERED_DESC
          "جهة تجريبية", // PLACE_NAME
          "قطاع التجربة", // PLACE_SEC
          "جهة المرسل اليه", // GEHA_NAME
          "قطاع المرسل اليه", // GEHA_SEC
          "2026-04-28 10:05", // SEND_DATE_STR
          "للاتخاذ اللازم", // SITUATION_DESC
          "نوع تجريبي", // DOC_DESC_A
          "C:\\Archives\\test.docx", // FILE_NAME
          "", // FILE_ATTACH
          1, // DOC_TYPE
          0, // FLAG
          1, // DOC_STATUS
          "MOCK-DOC-2026", // NODE_ID
          "", // ALL_RECIPIENTS
          "", // MY_TRANSFERS
          0, // MY_TRANSFERS_COUNT
          "", // NOTIFS_SENT_STR
          "", // NOTIFS_RECEIVED_STR
          0, // ANSERED
          1001 // PLACE_C
        ]
      ],
      metaData: [
        { name: "DOC_NO" },
        { name: "SEEN_FLAG" },
        { name: "SUBJECT" },
        { name: "DOC_DATE_STR" },
        { name: "ANSERED_DESC" },
        { name: "PLACE_NAME" },
        { name: "PLACE_SEC" },
        { name: "GEHA_NAME" },
        { name: "GEHA_SEC" },
        { name: "SEND_DATE_STR" },
        { name: "SITUATION_DESC" },
        { name: "DOC_DESC_A" },
        { name: "FILE_NAME" },
        { name: "FILE_ATTACH" },
        { name: "DOC_TYPE" },
        { name: "FLAG" },
        { name: "DOC_STATUS" },
        { name: "NODE_ID" },
        { name: "ALL_RECIPIENTS" },
        { name: "MY_TRANSFERS" },
        { name: "MY_TRANSFERS_COUNT" },
        { name: "NOTIFS_SENT_STR" },
        { name: "NOTIFS_RECEIVED_STR" },
        { name: "ANSERED" },
        { name: "PLACE_C" }
      ]
    };
  }

  // رد افتراضي لأي استعلام آخر
  return {
    rows: [],
    metaData: []
  };
};

export async function getConnection() {
  if (process.env.MOCK_DB === "true") {
    console.log("🔄 Using Mock Database Connection");
    return {
      execute: mockExecute,
      close: async () => console.log("🔒 Mock Connection Closed"),
      commit: async () => console.log("✅ Mock Transaction Committed"),
      rollback: async () => console.log("🔙 Mock Transaction Rolled Back")
    };
  }

  try {
    return await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING
    });
  } catch (err) {
    console.error("❌ getConnection Error:", err.message);
    throw err;
  }
}

export async function getConnection2() {
  if (process.env.MOCK_DB === "true") {
    return getConnection();
  }

  try {
    return await oracledb.getConnection({
      user: process.env.ORACLE_USER2,
      password: process.env.ORACLE_PASSWORD2,
      connectString: process.env.ORACLE_CONNECT_STRING2 || process.env.ORACLE_CONNECT_STRING
    });
  } catch (err) {
    console.error("❌ getConnection2 Error:", err.message);
    throw err;
  }
}
