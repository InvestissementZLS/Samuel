"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Assumes there's still a reset auth action, but we will use the fetch api route we created!
function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setError("Le lien de réinitialisation est manquant ou invalide.");
        }
    }, [token]);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        if (!token) {
            setError("Jeton de sécurité manquant. Veuillez utiliser le lien de votre courriel.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }

        if (password.length < 8) {
            setError("Le mot de passe doit contenir au moins 8 caractères.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, token, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Une erreur est survenue.");
            } else {
                setSuccess(true);
            }
        } catch (err) {
            setError("Erreur de connexion avec le serveur.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border-t-4 border-indigo-500">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Mot de passe modifié !</h1>
                <p className="text-gray-600 mb-8">Votre mot de passe a été réinitialisé avec succès.</p>
                <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm mb-6">
                    Vous pouvez maintenant retourner sur l'application mobile ou le tableau de bord et vous connecter avec votre nouveau mot de passe.
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border-t-4 border-indigo-500">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Réinitialisation</h1>
                <p className="text-gray-500 mt-2 text-sm">Créez votre nouveau mot de passe</p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 font-medium border border-red-100">
                    {error}
                </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Courriel associé à votre compte
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                        placeholder="votre@courriel.com"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nouveau mot de passe
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                        placeholder="••••••••"
                        required
                        minLength={8}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirmer le mot de passe
                    </label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                        placeholder="••••••••"
                        required
                        minLength={8}
                    />
                </div>

                <div className="pt-4">
                    <button 
                        type="submit" 
                        className="w-full h-12 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading || !token}
                    >
                        {loading ? "Réinitialisation..." : "Changer le mot de passe"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Suspense fallback={<div className="animate-pulse w-full max-w-md h-96 bg-white rounded-2xl shadow-xl"></div>}>
                <ResetPasswordForm />
            </Suspense>
        </div>
    );
}
