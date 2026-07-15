import { generateJson, MODERATION_SYSTEM_PROMPT } from './gemini.js';
import { serviceDb } from './db.js';
import { notifyModerationDown } from './notify.js';

export type Label = 'clean' | 'abusive' | 'spam' | 'incitement';

const SCHEMA = {
    type: 'object',
    properties: {
        label: { type: 'string', enum: ['clean', 'abusive', 'spam', 'incitement'] },
    },
    required: ['label'],
};

export function statusForLabel(label: Label | null): 'approved' | 'held' | 'pending' {
    if (label === null) {
        return 'pending';
    }
    return label === 'clean' ? 'approved' : 'held';
}

export async function classify(text: string): Promise<Label | null> {
    const prompt = `Classify this comment:
"""${text}"""`;
    try {
        const out = await generateJson<{ label: Label }>(prompt, SCHEMA, MODERATION_SYSTEM_PROMPT, 6000);
        if (out.label === 'clean' || out.label === 'abusive' || out.label === 'spam' || out.label === 'incitement') {
            return out.label;
        }
        return null;
    } catch (err) {
        console.warn('moderation classify failed:', String(err));
        await notifyModerationDown(String(err));
        return null;
    }
}

export async function sweepPending(limit = 20): Promise<{ checked: number; resolved: number }> {
    const db = serviceDb();
    const { data: rows, error } = await db
        .from('poll_comments')
        .select('id, comment_text')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(limit);

    if (error || !rows || rows.length === 0) {
        return { checked: 0, resolved: 0 };
    }

    let resolved = 0;
    for (const row of rows) {
        const label = await classify(String(row.comment_text));
        if (label === null) {
            continue;
        }
        const status = statusForLabel(label);
        const { error: updateError } = await db
            .from('poll_comments')
            .update({ status, moderation_label: label })
            .eq('id', row.id);
        if (!updateError) {
            resolved++;
        }
    }
    return { checked: rows.length, resolved };
}
