"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
    FileText,
    Plus,
    Trash2,
    ArrowRight,
    Send,
    CheckCircle2,
    AlertCircle,
    Copy,
    Share2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { createEZcountDoc } from "@/lib/ezcount";

export default function ProformaInvoicePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <InvoiceFormContent />
        </Suspense>
    );
}

function InvoiceFormContent() {
    const searchParams = useSearchParams();
    const [step, setStep] = useState<"form" | "preview">("form");
    const [customerName, setCustomerName] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [description, setDescription] = useState("");
    const [currentDate, setCurrentDate] = useState("");
    const [deadlineDate, setDeadlineDate] = useState("");

    // Set dates and initial customer on client only
    useEffect(() => {
        const nameFromUrl = searchParams.get("customer") || "";
        if (nameFromUrl) setCustomerName(nameFromUrl);

        const now = new Date();
        setCurrentDate(now.toLocaleDateString('he-IL'));

        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 14);
        setDeadlineDate(deadline.toLocaleDateString('he-IL'));
    }, [searchParams]);

    const [items, setItems] = useState<any[]>([
        { details: "מספר טיפולים", amount: 0, price: 180, comment: "", type: "regular" },
        { details: "מספר ביטולים", amount: 0, price: 90, comment: "", type: "regular" },
        { details: "נסיעות", amount: 0, price: 1.4, comment: "", type: "special_travel" }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [response, setResponse] = useState<any>(null);

    const addItem = () => {
        setItems([...items, { details: "", amount: 1, price: 0, comment: "", type: "regular" }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const calculateItemTotal = (item: any) => {
        if (item.type === "special_travel") {
            // Calculation: Days (amount) * 104 (52 weeks * 2) * price
            return (item.amount || 0) * 104 * (item.price || 0);
        }
        return (item.amount || 0) * (item.price || 0);
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    };

    const getProcessedItems = () => {
        return items
            .filter(item => {
                if (item.type === "special_travel") return (item.amount || 0) > 0;
                return (item.amount || 0) > 0 || (item.price || 0) > 0;
            })
            .map(item => {
                if (item.type === "special_travel") {
                    return {
                        details: item.details,
                        amount: (item.amount || 0) * 104, // Quantity is Days * 104
                        price: item.price,
                        vat: 0,
                        vat_type: 'INC' as const,
                        comment: item.comment
                    };
                }
                return {
                    details: item.details,
                    amount: item.amount,
                    price: item.price,
                    vat: 0,
                    vat_type: 'INC' as const,
                    comment: item.comment
                };
            });
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setResponse(null);

        try {
            const processedItems = getProcessedItems();

            if (processedItems.length === 0) {
                setResponse({ success: false, errMsg: "יש למלא לפחות פריט אחד עם כמות ומחיר" });
                setIsSubmitting(false);
                setStep("form");
                return;
            }

            const paymentNote = `פרטי ח-ן:\nבנק מזרחי, סניף 532 פארק המדע\nמס' ח-ן 117789\nמיטל ואלעד כרמל קליפשוט\n\nלתשלום עד: ${deadlineDate}`;

            const res = await createEZcountDoc({
                customer_name: customerName,
                customer_email: customerEmail,
                description: description,
                item: processedItems,
                comment: paymentNote,
                vat: 0,
                type: 300,
            });

            setResponse(res);
            if (res.success) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (err) {
            console.error("Error creating invoice:", err);
            setResponse({ success: false, errMsg: "שגיאה בתקשורת עם השרת" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleShareWhatsApp = () => {
        if (!response?.pdf_link) return;
        const text = `שלום, מצורפת חשבונית עסקה עבורכם: ${response.pdf_link}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    // Success State
    if (response?.success) {
        return (
            <div className="min-h-screen bg-[var(--background)] p-4 md:p-6 flex items-center justify-center" dir="rtl">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card max-w-lg w-full p-8 text-center"
                >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                        <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">החשבונית נוצרה בהצלחה!</h2>
                    <p className="text-[var(--text-secondary)] mb-8 font-medium">מספר מסמך: {response.doc_number}</p>

                    <div className="space-y-4">
                        <a
                            href={response.pdf_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="primary-button w-full flex items-center justify-center gap-2 py-4 shadow-lg shadow-[var(--primary)]/20"
                        >
                            <FileText size={18} />
                            צפייה בחשבונית (PDF)
                        </a>

                        <button
                            onClick={handleShareWhatsApp}
                            className="w-full py-4 px-6 rounded-2xl border-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366]/5 transition-all font-bold flex items-center justify-center gap-2"
                        >
                            <Share2 size={18} />
                            שליחה בוואטסאפ
                        </button>

                        <div className="pt-4 space-y-3">
                            <button
                                onClick={() => {
                                    setResponse(null);
                                    setStep("form");
                                    setItems([
                                        { details: "מספר טיפולים", amount: 0, price: 180, comment: "", type: "regular" },
                                        { details: "מספר ביטולים", amount: 0, price: 90, comment: "", type: "regular" },
                                        { details: "נסיעות", amount: 0, price: 1.4, comment: "", type: "special_travel" }
                                    ]);
                                }}
                                className="w-full py-3 px-6 rounded-xl border border-[var(--surface-variant)] hover:bg-[var(--surface-variant)] transition-all font-medium text-[var(--text-primary)]"
                            >
                                יצירת חשבונית חדשה
                            </button>
                            <Link
                                href="/"
                                className="block text-[var(--primary)] font-medium hover:underline text-sm"
                            >
                                חזרה ללוח הבקרה
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Preview Step
    if (step === "preview") {
        return (
            <div className="min-h-screen bg-[var(--background)] p-4 md:p-6 pb-20 text-right" dir="rtl">
                <header className="max-w-4xl mx-auto flex items-center gap-4 mb-8">
                    <button onClick={() => setStep("form")} className="p-2 hover:bg-[var(--surface-variant)] rounded-xl transition-all text-[var(--outline)]">
                        <ArrowRight size={20} />
                    </button>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">תצוגה מקדימה לפני הנפקה</h1>
                </header>

                <main className="max-w-3xl mx-auto">
                    <section className="glass-card overflow-hidden shadow-2xl border border-[var(--primary)]/10">
                        <div className="bg-[var(--primary-container)] p-5 md:p-8 border-b border-[var(--primary)]/10">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-3xl font-black text-[var(--primary)] mb-1">חשבונית עסקה</h2>
                                    <p className="text-[var(--text-secondary)] font-bold">טיוטה בתצוגה מקדימה</p>
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-[var(--text-primary)] text-lg">מיטל - טיפול רגשי</p>
                                    <p className="text-sm text-[var(--text-secondary)]">דוח סיכום תקופתי</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 mt-10">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-[var(--primary)] uppercase tracking-wider mb-2">לכבוד:</p>
                                    <p className="text-xl font-bold text-[var(--text-primary)]">{customerName}</p>
                                    <p className="text-[var(--text-secondary)] text-sm">{customerEmail}</p>
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-[var(--primary)] uppercase tracking-wider mb-2">תאריך המסמך:</p>
                                    <p className="font-bold text-[var(--text-primary)]">{currentDate}</p>
                                    {description && (
                                        <div className="mt-4">
                                            <p className="text-[10px] font-black text-[var(--primary)] uppercase tracking-wider mb-1">תיאור נוסף:</p>
                                            <p className="text-sm text-[var(--text-secondary)]">{description}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-5 md:p-8">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right min-w-[500px]">
                                    <thead>
                                        <tr className="border-b-2 border-[var(--surface-variant)]">
                                            <th className="py-4 font-bold text-[var(--text-secondary)] text-right text-xs">תיאור הפריט</th>
                                            <th className="py-4 font-bold text-[var(--text-secondary)] text-center text-xs">כמות</th>
                                            <th className="py-4 font-bold text-[var(--text-secondary)] text-center text-xs">מחיר ליח'</th>
                                            <th className="py-4 font-bold text-[var(--text-primary)] text-left text-xs">סה"כ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--surface-variant)]/50">
                                        {getProcessedItems().map((item, idx) => (
                                            <tr key={idx} className="group hover:bg-[var(--surface-variant)]/20 transition-colors">
                                                <td className="py-5">
                                                    <p className="font-bold text-[var(--text-primary)]">{item.details}</p>
                                                    {item.comment && <p className="text-[11px] text-[var(--text-secondary)] mt-1 italic leading-relaxed">{item.comment}</p>}
                                                </td>
                                                <td className="py-5 text-center text-[var(--text-primary)] font-medium">{item.amount.toLocaleString()}</td>
                                                <td className="py-5 text-center text-[var(--text-primary)]">₪{item.price.toLocaleString()}</td>
                                                <td className="py-5 text-left font-bold text-[var(--text-primary)]">₪{(item.amount * item.price).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-[var(--primary)]/30">
                                            <td colSpan={3} className="py-8 text-xl font-bold text-[var(--text-secondary)]">סה"כ לתשלום:</td>
                                            <td className="py-8 text-4xl font-black text-[var(--primary)] text-left">₪{calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                        <button
                            onClick={() => setStep("form")}
                            className="py-4 px-6 rounded-2xl border-2 border-[var(--surface-variant)] text-[var(--text-secondary)] font-bold hover:bg-[var(--surface-variant)] transition-all flex items-center justify-center gap-2"
                        >
                            חזרה לעריכה
                        </button>
                        <button
                            disabled={isSubmitting}
                            onClick={handleSubmit}
                            className="primary-button py-4 px-6 flex items-center justify-center gap-3 text-xl shadow-xl shadow-[var(--primary)]/20"
                        >
                            {isSubmitting ? (
                                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Send size={22} />
                            )}
                            {isSubmitting ? "מייצר מסמך..." : "אשר והנפק חשבונית"}
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // Default: Form Step
    return (
        <div className="min-h-screen bg-[var(--background)] p-4 md:p-6 pb-20 text-right" dir="rtl">
            <header className="max-w-4xl mx-auto flex items-center gap-4 mb-8">
                <Link href="/" className="p-2 hover:bg-[var(--surface-variant)] rounded-xl transition-all text-[var(--outline)]">
                    <ArrowRight size={20} />
                </Link>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">יצירת חשבונית עסקה</h1>
            </header>

            <main className="max-w-4xl mx-auto text-right">
                <div className="space-y-6">
                    <AnimatePresence>
                        {response && !response.success && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3"
                            >
                                <AlertCircle size={20} />
                                <p className="text-sm font-medium">{response.errMsg || "אירעה שגיאה ביצירת החשבונית"}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Customer Info */}
                    <section className="glass-card p-6 md:p-8 space-y-6 shadow-lg border border-white/40">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-[var(--text-primary)]">
                            <div className="w-8 h-8 bg-[var(--primary-container)] text-[var(--primary)] rounded-lg flex items-center justify-center">
                                <FileText size={16} />
                            </div>
                            פרטי הלקוח
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[var(--text-secondary)]">שם הלקוח *</label>
                                <input
                                    required
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="למשל: ישראל ישראלי"
                                    className="w-full bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--surface-variant)] rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[var(--text-secondary)]">אימייל למשלוח</label>
                                <input
                                    type="email"
                                    value={customerEmail}
                                    onChange={(e) => setCustomerEmail(e.target.value)}
                                    placeholder="email@example.com"
                                    className="w-full bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--surface-variant)] rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-bold text-[var(--text-secondary)]">תיאור כללי למסמך</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="למשל: סיכום טיפולים עבור שנת 2025"
                                    className="w-full bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--surface-variant)] rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Items */}
                    <section className="glass-card p-6 md:p-8 space-y-6 shadow-lg border border-white/40">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-[var(--text-primary)]">
                                <div className="w-8 h-8 bg-[var(--primary-container)] text-[var(--primary)] rounded-lg flex items-center justify-center">
                                    <Plus size={16} />
                                </div>
                                פירוט פריטים
                            </h2>
                            <button
                                type="button"
                                onClick={addItem}
                                className="text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary)]/10 px-3 py-2 rounded-xl transition-all flex items-center gap-1 border border-[var(--primary)]/20"
                            >
                                <Plus size={14} />
                                הוספת שורה
                            </button>
                        </div>

                        <div className="space-y-6">
                            {items.map((item, index) => (
                                <motion.div
                                    key={index}
                                    layout
                                    className="bg-[var(--surface)]/40 p-5 rounded-2xl border border-[var(--surface-variant)]/50 space-y-4 relative group"
                                >
                                    <div className="grid grid-cols-12 gap-4 items-end">
                                        <div className="col-span-12 md:col-span-4 space-y-1.5">
                                            <label className="text-[11px] font-black text-[var(--text-secondary)]">שם הפריט / שירות</label>
                                            <input
                                                required
                                                type="text"
                                                value={item.details}
                                                onChange={(e) => updateItem(index, "details", e.target.value)}
                                                className="w-full bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--surface-variant)] rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all font-medium"
                                            />
                                        </div>
                                        <div className="col-span-6 md:col-span-2 space-y-1.5">
                                            <label className="text-[11px] font-black text-[var(--text-secondary)]">
                                                {item.type === "special_travel" ? "מספר ימים" : "כמות"}
                                            </label>
                                            <input
                                                required
                                                type="number"
                                                min="0"
                                                value={item.amount}
                                                onChange={(e) => updateItem(index, "amount", parseFloat(e.target.value) || 0)}
                                                className="w-full bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--surface-variant)] rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all font-bold text-center"
                                            />
                                        </div>
                                        <div className="col-span-6 md:col-span-3 space-y-1.5 text-right">
                                            <label className="text-[11px] font-black text-[var(--text-secondary)]">מחיר ליחידה</label>
                                            <div className="relative">
                                                <input
                                                    required
                                                    type="number"
                                                    step="0.1"
                                                    value={item.price}
                                                    onChange={(e) => updateItem(index, "price", parseFloat(e.target.value) || 0)}
                                                    className="w-full bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--surface-variant)] rounded-lg py-2.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all font-bold text-left"
                                                />
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-xs font-bold">₪</span>
                                            </div>
                                        </div>
                                        <div className="col-span-9 md:col-span-2 flex flex-col items-end pb-1 pr-2">
                                            <span className="text-[10px] font-black text-[var(--text-secondary)] mb-1">סה"כ בשורה</span>
                                            <span className="text-lg font-black text-[var(--primary)]">
                                                ₪{calculateItemTotal(item).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="col-span-3 md:col-span-1 flex justify-center pb-2">
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 pt-2">
                                        <label className="text-[10px] font-bold text-[var(--text-secondary)]">תיאור נוסף / הערה בשורה</label>
                                        <input
                                            type="text"
                                            value={item.comment || ""}
                                            onChange={(e) => updateItem(index, "comment", e.target.value)}
                                            placeholder="הערה שתופיע מתחת לשם הפריט..."
                                            className="w-full bg-white/30 text-[var(--text-primary)] border border-dashed border-[var(--surface-variant)] rounded-lg py-2 px-3 text-[11px] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-all italic"
                                        />
                                        {item.type === "special_travel" && item.amount > 0 && (
                                            <div className="bg-[var(--primary-container)]/30 p-2 rounded-lg mt-2 inline-block">
                                                <p className="text-[10px] text-[var(--primary)] font-bold">
                                                    אופן החישוב: {item.amount} ימים × 104 (52 שבועות × 2) × {item.price}₪ = {calculateItemTotal(item).toLocaleString()}₪
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="pt-8 border-t border-[var(--surface-variant)] flex flex-col items-end gap-1">
                            <p className="text-[var(--text-secondary)] font-bold text-xs">סה"כ לתשלום:</p>
                            <p className="text-4xl font-black text-[var(--text-primary)]">
                                ₪{calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </section>

                    <button
                        type="button"
                        onClick={() => {
                            if (customerName) {
                                setStep("preview");
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            } else {
                                setResponse({ success: false, errMsg: "יש להזין שם לקוח" });
                            }
                        }}
                        className="primary-button w-full py-5 flex items-center justify-center gap-3 text-xl shadow-xl shadow-[var(--primary)]/30 group"
                    >
                        <span>תצוגה מקדימה ואישור סופי</span>
                        <ArrowRight size={20} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
                    </button>

                    <div className="pt-4 border-t border-[var(--surface-variant)]/30 space-y-4">
                        <div className="bg-[var(--primary-container)]/20 p-4 rounded-2xl border border-[var(--primary)]/10">
                            <h3 className="text-xs font-bold text-[var(--primary)] mb-2">פרטי תשלום:</h3>
                            <div className="space-y-1 text-[11px] text-[var(--text-secondary)] font-medium leading-relaxed">
                                <p>פרטי ח-ן:</p>
                                <p>בנק מזרחי, סניף 532 פארק המדע</p>
                                <p>מס' ח-ן 117789</p>
                                <p>מיטל ואלעד כרמל קליפשוט</p>
                                <p className="mt-3 pt-2 border-t border-[var(--primary)]/10 font-bold text-[var(--text-primary)]">
                                    לתשלום עד: {deadlineDate}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
