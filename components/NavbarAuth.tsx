import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionSubject, verifySession } from "@/lib/jwt";
import { revokeSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE_NAME, isValidAdminKey } from "@/lib/adminAuth";

const SESSION_COOKIE_NAME = "sn_auth";

type AuthRole = "guest" | "user" | "admin";
type NavItem = {
  href: string;
  label: string;
};

const ROLE_NAV_ITEMS: Record<AuthRole, NavItem[]> = {
  guest: [
    { href: "/about", label: "ABOUT" },
    { href: "/support", label: "SUPPORT" },
    { href: "/register", label: "CREATE ACCOUNT" },
  ],
  user: [
    { href: "/dashboard", label: "DASHBOARD" },
    { href: "/dashboard/settings", label: "PROFILE" },
  ],
  admin: [
    { href: "/admin/dashboard", label: "ADMIN" },
    { href: "/dashboard/settings", label: "PROFILE" },
  ],
};

function navLinkClassName() {
  return "relative text-[#C6E65A] font-semibold text-[16px] px-4 py-2 rounded-3xl transition-all duration-300 hover:-translate-y-[2px]";
}

async function hasValidUserSession(sessionToken: string | null | undefined) {
  const token = typeof sessionToken === "string" ? sessionToken.trim() : "";
  if (!token) return false;

  const payload = verifySession(token);
  const subject = getSessionSubject(payload);
  if (!subject) return false;

  try {
    const session = await prisma.session.findUnique({
      where: { token },
      select: { userId: true, expiresAt: true },
    });

    return Boolean(
      session &&
      session.expiresAt >= new Date() &&
      session.userId === subject
    );
  } catch (error) {
    console.error("[NavbarAuth] Failed to validate user session", error);
    return false;
  }
}

export async function getNavbarRole(): Promise<AuthRole> {
  noStore();

  const cookieStore = await cookies();
  const adminCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const adminKey = typeof adminCookie === "string" ? adminCookie.trim() : "";
  if (adminKey && isValidAdminKey(adminKey)) {
    return "admin";
  }

  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (await hasValidUserSession(sessionToken)) return "user";

  return "guest";
}

type NavbarAuthProps = {
  forceGuest?: boolean;
};

export default async function NavbarAuth({ forceGuest = false }: NavbarAuthProps) {
  const role = forceGuest ? "guest" : await getNavbarRole();
  const navItems = ROLE_NAV_ITEMS[role];

  async function logoutUser() {
    "use server";

    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await revokeSession(token);
    }

    cookieStore.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    cookieStore.set({
      name: ADMIN_COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    redirect("/");
  }

  async function logoutAdmin() {
    "use server";

    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await revokeSession(token);
    }

    cookieStore.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    cookieStore.set({
      name: ADMIN_COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    redirect("/");
  }

  if (role === "guest") {
    return (
      <>
        <div className="flex gap-8 justify-center">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={navLinkClassName()}>
              <span className="relative z-10">{item.label}</span>
              <span className="absolute inset-x-3 -bottom-1 h-[2px] bg-gradient-to-r from-transparent via-[#C6E65A] to-transparent opacity-0 scale-x-0 origin-center transition duration-300 group-hover:scale-x-100 group-hover:opacity-80" />
            </Link>
          ))}
        </div>

        <div className="justify-self-end">
          <Link
            href="/login"
            className="text-[#C6E65A] font-semibold text-[15px] px-6 py-3 border border-[#C6E65A]/60 rounded-full transition-all duration-300 hover:-translate-y-[2px] hover:bg-[#C6E65A]/10 hover:shadow-[0_0_18px_rgba(198,230,90,0.45)]"
          >
            LOGIN
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex gap-8 justify-center">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={navLinkClassName()}>
            <span className="relative z-10">{item.label}</span>
            <span className="absolute inset-x-3 -bottom-1 h-[2px] bg-gradient-to-r from-transparent via-[#C6E65A] to-transparent opacity-0 scale-x-0 origin-center transition duration-300 group-hover:scale-x-100 group-hover:opacity-80" />
          </Link>
        ))}
      </div>

      <div className="justify-self-end">
        <form action={role === "admin" ? logoutAdmin : logoutUser}>
          <button
            type="submit"
            className="text-[#C6E65A] font-semibold text-[15px] px-6 py-3 border border-[#C6E65A]/60 rounded-full transition-all duration-300 hover:-translate-y-[2px] hover:bg-[#C6E65A]/10 hover:shadow-[0_0_18px_rgba(198,230,90,0.45)]"
          >
            LOGOUT
          </button>
        </form>
      </div>
    </>
  );
}
