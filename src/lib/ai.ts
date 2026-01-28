export const OPENROUTER_URL = 'https://openrouter.ai/api/v1';

export interface AIResponse {
    text: string;
    error?: string;
}

export async function transcribeAudio(audioBlob: Blob): Promise<AIResponse> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');
    formData.append('model', 'openai/whisper-1');

    try {
        const response = await fetch(`${OPENROUTER_URL}/audio/transcriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
            },
            body: formData,
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message || 'תמלול נכשל');
        return { text: data.text };
    } catch (error: any) {
        console.error("Transcription error:", error);
        return { text: '', error: "שגיאה בתמלול האודיו. אנא וודאי שקוד ה-API תקין." };
    }
}

export async function generateSummary(transcript: string): Promise<AIResponse> {
    const systemPrompt = `אתה עוזר מקצועי למטפלת באומנות (Art Therapist). 
עליך לנסח סיכום טיפולי מקצועי, תמציתי וברור על בסיס תמלול חופשי של המטפלת לאחר טיפול.

כללים קריטיים:
- כתוב בעברית תקנית, רהוטה ומקצועית.
- השתמש במושגים רלוונטיים מתחום הטיפול באומנות (למשל: ויסות רגשי, עבודה עם חומרים, מרחב בטוח).
- אל תמציא מידע שאינו מופיע בתמלול.
- שמור על ניסוח ניטרלי, אמפתי ולא שיפוטי.
- אין אזכור להיותך AI.
- זהו מסמך פנימי לתיק מטופל.

מבנה הסיכום:
1. מטרת המפגש: (מה ניסינו להשיג היום)
2. תכנים מרכזיים: (נושאים שעלו בשיחה או ביצירה)
3. תהליכים רגשיים ויצירתיים: (איך המטופל הגיב לחומרים, מה היה התהליך)
4. התרשמות מקצועית: (תובנות שלך כמטפלת)
5. כיווני המשך: (נקודות למחשבה למפגש הבא)`;

    try {
        const response = await fetch(`${OPENROUTER_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://meytalog.vercel.app',
                'X-Title': 'MeytaLog',
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: transcript },
                ],
                temperature: 0.3, // Lower temperature for more consistent clinical summaries
            }),
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message || 'סיכום נכשל');
        return { text: data.choices[0].message.content };
    } catch (error: any) {
        console.error("Summarization error:", error);
        return { text: '', error: "שגיאה ביצירת הסיכום. אנא וודאי שקוד ה-API תקין." };
    }
}
