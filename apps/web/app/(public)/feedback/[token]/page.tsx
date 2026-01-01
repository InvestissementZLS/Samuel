"use client";

import { useEffect, useState } from "react";
import { getReviewRequest, markRedirectedToGoogle, submitInternalFeedback } from "@/app/actions/review-actions";
import { Star } from "lucide-react";
import { toast } from "sonner";

// Placeholder - User should update this
const GOOGLE_REVIEW_URL = "https://g.page/r/YOUR_GOOGLE_ID/review";

export default function FeedbackPage({ params }: { params: { token: string } }) {
    const [loading, setLoading] = useState(true);
    const [request, setRequest] = useState<any>(null);
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState("");
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        getReviewRequest(params.token).then(data => {
            if (data) setRequest(data);
            setLoading(false);
        });
    }, [params.token]);

    const handleStarClick = (rating: number) => {
        setScore(rating);
    };

    const handleGoogleRedirect = async () => {
        await markRedirectedToGoogle(params.token);
        window.location.href = GOOGLE_REVIEW_URL;
    };

    const handleSubmitInternal = async () => {
        if (!feedback) return;
        await submitInternalFeedback(params.token, score, feedback);
        setSubmitted(true);
        toast.success("Thank you for your feedback!");
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!request) return <div className="p-8 text-center text-red-500">Invalid or Expired Link</div>;

    if (submitted) {
        return (
            <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow text-center">
                <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
                <p className="text-gray-600">Your feedback helps us improve.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                <h1 className="text-2xl font-bold mb-2">How was your service?</h1>
                <p className="text-gray-500 mb-6">Job #{request.job?.number} for {request.job?.client?.name}</p>

                <div className="flex justify-center gap-2 mb-8">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => handleStarClick(star)}
                            className={`transition-colors text-3xl ${score >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                        >
                            <Star size={40} fill={score >= star ? "currentColor" : "none"} />
                        </button>
                    ))}
                </div>

                {score === 5 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <p className="text-lg font-medium mb-4">Awesome! We're glad to hear that.</p>
                        <p className="text-gray-500 mb-6 text-sm">Would you mind sharing your experience on Google? It helps us a lot.</p>
                        <button
                            onClick={handleGoogleRedirect}
                            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                        >
                            Rate us on Google
                        </button>
                    </div>
                )}

                {score > 0 && score < 5 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 text-left">
                        <p className="font-medium mb-2 text-center">We're sorry it wasn't perfect.</p>
                        <label className="block text-sm text-gray-600 mb-2">How can we allow you to reach 5 stars next time?</label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            className="w-full p-3 border rounded-lg mb-4"
                            rows={4}
                            placeholder="Tell us what went wrong..."
                        />
                        <button
                            onClick={handleSubmitInternal}
                            className="w-full py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition"
                        >
                            Submit Feedback
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
