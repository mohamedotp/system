// import { NextResponse } from "next/server";
// import { getConnection, getConnection2 } from "@/lib/oracle";
// import { getSession } from "@/lib/auth";

// export async function POST(req) {
//     const session = await getSession();
//     if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//     const subscription = await req.json();
//     const empNum = String(session.empNum);
//     const endpoint = subscription.endpoint;
//     const subJson = JSON.stringify(subscription);

//     let conn;
//     try {
//         // محاولة الاتصال بحساب SALARY أولاً، ثم المكاتبات كبديل
//         try {
//             conn = await getConnection();
//         } catch (connErr) {
//             console.warn("⚠️ Subscribe: Falling back to getConnection2:", connErr.message);
//             conn = await getConnection2();
//         }

//         // DELETE + INSERT بدلاً من MERGE لتجنب ORA-38104
//         // (Oracle لا يسمح بتحديث الأعمدة المستخدمة في ON clause)
//         await conn.execute(
//             `DELETE FROM SYSTEM_PUSH_SUBS WHERE ENDPOINT = :endpoint`,
//             { endpoint },
//             { autoCommit: false }
//         );

//         await conn.execute(
//             `INSERT INTO SYSTEM_PUSH_SUBS (EMP_NUM, SUBSCRIPTION_JSON, ENDPOINT, CREATED_AT)
//              VALUES (:empNum, :subJson, :endpoint, CURRENT_TIMESTAMP)`,
//             { empNum, subJson, endpoint },
//             { autoCommit: false }
//         );

//         await conn.commit();
//         return NextResponse.json({ success: true });
//     } catch (err) {
//         console.error("Subscription Error:", err);
//         if (conn) await conn.rollback().catch(() => {});
//         return NextResponse.json({ error: err.message }, { status: 500 });
//     } finally {
//         if (conn) await conn.close().catch(() => {});
//     }
// }
