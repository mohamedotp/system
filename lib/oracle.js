import oracledb from "oracledb";

// تفعيل الـ Thick Mode لضمان العمل مع الإصدارات القديمة من أوراكل
if (typeof window === "undefined") {
  if (!global._oracleInitialized) {
    try {
      // المسار يجب أن يكون صحيحاً وموجوداً على الجهاز
      const oracleClientPath = "C:\\oracle\\instantclient_19_25";

      oracledb.initOracleClient({ libDir: oracleClientPath });
      console.log("🚀 Oracle Thick Mode initialized successfully!");
      global._oracleInitialized = true;
    } catch (err) {
      if (err.message.includes("already initialized")) {
        global._oracleInitialized = true;
      } else {
        console.error("❌ Oracle Thick Mode Failed to initialize:", err.message);
        // لا نوقف البرنامج هنا، سنترك محاولة الاتصال تفشل لاحقاً برسالة واضحة
      }
    }
  }
}

export async function getConnection() {
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
  try {
    return await oracledb.getConnection({
      user: process.env.ORACLE_USER2,
      password: process.env.ORACLE_PASSWORD2,
      connectString: process.env.ORACLE_CONNECT_STRING
    });
  } catch (err) {
    console.error("❌ getConnection2 Error:", err.message);
    throw err;
  }
}
