export interface ApiErrorBody {
    error?: string;
    retryAfterSeconds?: number;
    message?: string;
}

export interface ApiResult<T> {
    ok: boolean;
    status: number;
    data: T | null;
    error: ApiErrorBody | null;
}

export async function callApi<T>(name: string, body: unknown): Promise<ApiResult<T>> {
    let res: Response;
    try {
        res = await fetch(`/api/${name}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    } catch (err) {
        return { ok: false, status: 0, data: null, error: { error: 'network' } };
    }

    let json: unknown = null;
    try {
        json = await res.json();
    } catch (err) {
        json = null;
    }

    if (!res.ok) {
        return { ok: false, status: res.status, data: null, error: (json as ApiErrorBody) ?? { error: 'unknown' } };
    }
    return { ok: true, status: res.status, data: json as T, error: null };
}
