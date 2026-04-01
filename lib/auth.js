import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || "aoi-system-secret-key-12345"
);

export async function createSession(empNum) {
    const token = await new SignJWT({ empNum })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(secret);

    (await cookies()).set("session", token, {
        httpOnly: true,
        secure: false, // تم التغيير لـ false للسماح بالعمل على HTTP في النتورك
        sameSite: "lax",
        path: "/",
    });
}

export async function getSession() {
    const session = (await cookies()).get("session")?.value;
    if (!session) return null;

    try {
        const { payload } = await jwtVerify(session, secret);
        return payload;
    } catch  {
        return null;
    }
}

export async function deleteSession() {
    (await cookies()).delete("session");
}
