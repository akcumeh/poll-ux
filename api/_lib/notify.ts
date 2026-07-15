import nodemailer from 'nodemailer';
import { serviceDb } from './db.js';

const ALERT_KEY = 'moderation_down';
const ALERT_COOLDOWN_MS = 60 * 60 * 1000;

function looksLikeOutage(errText: string): boolean {
    const t = errText.toLowerCase();
    return t.includes('401') || t.includes('403') || t.includes('unauthorized') ||
        t.includes('permission_denied') || t.includes('resource_exhausted') ||
        t.includes('quota') || t.includes('api key');
}

async function shouldSend(): Promise<boolean> {
    const db = serviceDb();
    const { data } = await db
        .from('poll_system_alerts')
        .select('last_sent_at')
        .eq('alert_key', ALERT_KEY)
        .maybeSingle();

    if (data?.last_sent_at) {
        const age = Date.now() - new Date(data.last_sent_at).getTime();
        if (age < ALERT_COOLDOWN_MS) {
            return false;
        }
    }

    await db.from('poll_system_alerts').upsert({
        alert_key: ALERT_KEY,
        last_sent_at: new Date().toISOString(),
    });
    return true;
}

async function sendEmail(subject: string, body: string): Promise<void> {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    const to = process.env.ALERT_EMAIL_TO;
    if (!user || !pass || !to) {
        return;
    }
    const transport = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user, pass },
    });
    await transport.sendMail({ from: user, to, subject, text: body });
}

async function sendTelegram(text: string): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
        return;
    }
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
    });
}

export async function notifyModerationDown(errText: string): Promise<void> {
    if (!looksLikeOutage(errText)) {
        return;
    }
    try {
        const send = await shouldSend();
        if (!send) {
            return;
        }
        const subject = 'Pollux: comment moderation is failing';
        const body = `Gemini calls for comment moderation are erroring on Pollux.\n\nError: ${errText}\n\nComments are being held as pending until this clears. Check the Gemini API key and quota.`;
        await Promise.all([sendEmail(subject, body), sendTelegram(`${subject}\n\n${errText}`)]);
    } catch (err) {
        console.warn('notify failed:', String(err));
    }
}
