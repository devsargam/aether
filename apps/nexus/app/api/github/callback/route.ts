import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../db";
import { account } from "../../../../db/schema";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // This is the user ID

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/new?error=missing_params`
    );
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_APP_CLIENT_ID!,
          client_secret: process.env.GITHUB_APP_CLIENT_SECRET!,
          code,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    // Check if GitHub account already exists for this user
    const existingAccount = await db.query.account.findFirst({
      where: and(eq(account.userId, state), eq(account.providerId, "github")),
    });

    if (existingAccount) {
      // Update existing account
      await db
        .update(account)
        .set({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          accessTokenExpiresAt: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000)
            : null,
        })
        .where(eq(account.id, existingAccount.id));
    } else {
      // Create new account entry
      await db.insert(account).values({
        id: `github_${state}_${Date.now()}`,
        userId: state,
        providerId: "github",
        accountId: tokenData.access_token, // We'll update this with actual GitHub user ID
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        accessTokenExpiresAt: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : null,
      });
    }

    // Redirect back to new page with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/new?success=true`
    );
  } catch (error) {
    console.error("GitHub OAuth error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/new?error=oauth_failed`
    );
  }
}
