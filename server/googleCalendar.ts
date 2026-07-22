import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { SignJWT, jwtVerify } from "jose";
import type { Agendamento } from "../drizzle/schema";
import { toISODateString } from "../shared/dateUtils";
import {
  getUserById,
  removeGoogleCalendarConnection,
  saveGoogleCalendarConnection,
  updateAgendamentoGoogleCalendarSync,
} from "./db";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const TIME_ZONE = "America/Sao_Paulo";
const JWT_SECRET = process.env.JWT_SECRET ?? "wedding-secret-key";
const STATE_SECRET = new TextEncoder().encode(JWT_SECRET);

function getOAuthConfig() {
  return {
    clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID ?? process.env.VITE_GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET ?? "",
  };
}

export function isGoogleCalendarConfigured() {
  const config = getOAuthConfig();
  return Boolean(config.clientId && config.clientSecret);
}

export function getGoogleCalendarRedirectUri(origin: string) {
  return (
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ??
    `${(process.env.APP_URL ?? origin).replace(/\/$/, "")}/api/google-calendar/callback`
  );
}

function createOAuthClient(redirectUri: string) {
  const config = getOAuthConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new Error("Integração com Google Agenda não configurada no servidor.");
  }
  return new OAuth2Client(config.clientId, config.clientSecret, redirectUri);
}

export async function createGoogleCalendarAuthorizationUrl(userId: number, origin: string) {
  const redirectUri = getGoogleCalendarRedirectUri(origin);
  const client = createOAuthClient(redirectUri);
  const state = await new SignJWT({ userId, integration: "google-calendar" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(STATE_SECRET);

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: [CALENDAR_SCOPE],
    state,
  });
}

export async function verifyGoogleCalendarState(state: string) {
  const { payload } = await jwtVerify(state, STATE_SECRET);
  if (payload.integration !== "google-calendar") throw new Error("Estado OAuth inválido.");
  const userId = Number(payload.userId);
  if (!Number.isInteger(userId) || userId <= 0) throw new Error("Usuário OAuth inválido.");
  return userId;
}

function getEncryptionKey() {
  return createHash("sha256")
    .update(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ?? JWT_SECRET)
    .digest();
}

function encryptRefreshToken(refreshToken: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(refreshToken, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

function decryptRefreshToken(value: string) {
  const [version, ivValue, tagValue, encryptedValue] = value.split(":");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Token do Google Agenda inválido.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivValue, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function connectGoogleCalendar(userId: number, code: string, origin: string) {
  const redirectUri = getGoogleCalendarRedirectUri(origin);
  const client = createOAuthClient(redirectUri);
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("O Google não retornou uma autorização permanente. Tente conectar novamente.");
  }
  await saveGoogleCalendarConnection(userId, encryptRefreshToken(tokens.refresh_token));
}

function getEventDateTimes(agendamento: Agendamento) {
  const date = toISODateString(agendamento.dataEvento);
  const time = String(agendamento.horario).slice(0, 5);
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const end = new Date(Date.UTC(year, month - 1, day, hour, minute));
  end.setUTCHours(end.getUTCHours() + 2);
  const endDate = [
    end.getUTCFullYear(),
    String(end.getUTCMonth() + 1).padStart(2, "0"),
    String(end.getUTCDate()).padStart(2, "0"),
  ].join("-");
  const endTime = `${String(end.getUTCHours()).padStart(2, "0")}:${String(
    end.getUTCMinutes()
  ).padStart(2, "0")}:00`;
  return {
    start: `${date}T${time}:00`,
    end: `${endDate}T${endTime}`,
  };
}

function getEventId(agendamento: Agendamento) {
  return `sga${agendamento.userId.toString(32)}a${agendamento.id.toString(32)}`;
}

async function requestCalendarEvent(
  accessToken: string,
  eventId: string,
  event: Record<string, unknown>,
  method: "POST" | "PUT"
) {
  const suffix = method === "PUT" ? `/${encodeURIComponent(eventId)}` : "";
  return fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events${suffix}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(method === "POST" ? { id: eventId, ...event } : event),
    }
  );
}

export async function syncAgendamentoToGoogleCalendar(agendamento: Agendamento) {
  const user = await getUserById(agendamento.userId);
  if (!user?.googleCalendarRefreshToken || !isGoogleCalendarConfigured()) {
    return { status: "skipped" as const };
  }

  const eventId = agendamento.googleCalendarEventId ?? getEventId(agendamento);
  try {
    const redirectUri = getGoogleCalendarRedirectUri(process.env.APP_URL ?? "http://localhost:3000");
    const client = createOAuthClient(redirectUri);
    client.setCredentials({
      refresh_token: decryptRefreshToken(user.googleCalendarRefreshToken),
    });
    const accessTokenResult = await client.getAccessToken();
    const accessToken =
      typeof accessTokenResult === "string" ? accessTokenResult : accessTokenResult?.token;
    if (!accessToken) throw new Error("Não foi possível renovar o acesso ao Google Agenda.");

    const dateTimes = getEventDateTimes(agendamento);
    const event = {
      summary: agendamento.descricao,
      location: agendamento.enderecoCerimonia,
      description: [
        `Agendamento SGA #${agendamento.id}`,
        `Valor do serviço: R$ ${Number(agendamento.valorServico).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        })}`,
        agendamento.observacoes ? `Observações: ${agendamento.observacoes}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      start: { dateTime: dateTimes.start, timeZone: TIME_ZONE },
      end: { dateTime: dateTimes.end, timeZone: TIME_ZONE },
      extendedProperties: {
        private: { sgaAgendamentoId: String(agendamento.id) },
      },
    };

    let response = await requestCalendarEvent(accessToken, eventId, event, "POST");
    if (response.status === 409) {
      response = await requestCalendarEvent(accessToken, eventId, event, "PUT");
    }
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Google Agenda respondeu ${response.status}: ${details.slice(0, 300)}`);
    }

    await updateAgendamentoGoogleCalendarSync(agendamento.id, {
      eventId,
      syncedAt: new Date(),
      error: null,
    });
    return { status: "synced" as const, eventId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido na sincronização";
    await updateAgendamentoGoogleCalendarSync(agendamento.id, {
      eventId,
      syncedAt: null,
      error: message,
    });
    throw error;
  }
}

export async function disconnectGoogleCalendar(userId: number) {
  await removeGoogleCalendarConnection(userId);
}
