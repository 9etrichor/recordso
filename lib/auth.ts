// lib/auth.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { z } from "zod";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login", // 自訂登入頁面路由
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // 驗證輸入格式
        const parsed = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Dynamic import to avoid edge runtime issues
        const { prisma } = await import("@/lib/prisma");

        // 從資料庫找使用者
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) return null;

        // 比對密碼
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return null;

        // 回傳使用者資訊 (不含密碼)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    // 將使用者 ID 加到 JWT 中
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // 將 JWT 中的資訊映射到 Session
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

// 擴充 NextAuth 的型別，讓 session.user 包含 id
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
    };
  }
}