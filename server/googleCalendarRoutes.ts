import type { Express, Request, Response } from "express";
import {
  connectGoogleCalendar,
  verifyGoogleCalendarState,
} from "./googleCalendar";

function getOrigin(req: Request) {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  return `${protocol}://${req.get("host")}`;
}

export function registerGoogleCalendarRoutes(app: Express) {
  app.get("/api/google-calendar/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    const oauthError = typeof req.query.error === "string" ? req.query.error : undefined;

    if (oauthError) {
      res.redirect(302, "/perfil?googleCalendar=cancelled");
      return;
    }
    if (!code || !state) {
      res.redirect(302, "/perfil?googleCalendar=error");
      return;
    }

    try {
      const userId = await verifyGoogleCalendarState(state);
      await connectGoogleCalendar(userId, code, getOrigin(req));
      res.redirect(302, "/perfil?googleCalendar=connected");
    } catch (error) {
      console.error("[Google Calendar] OAuth callback failed", error);
      res.redirect(302, "/perfil?googleCalendar=error");
    }
  });
}
