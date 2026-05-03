import { useState } from 'react';
import API from '../services/api';

const ShareModal = ({ isOpen, onClose, issueId, issueTitle }) => {
    const [copied, setCopied] = useState(false);
    const [shareLoading, setShareLoading] = useState(false);

    if (!isOpen) return null;

    const shareUrl = `${window.location.origin}/shared-issue/${issueId}`;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);

            // Track share
            await trackShare('copy_link');
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const trackShare = async (platform) => {
        try {
            const token = localStorage.getItem('token');
            await API.post(
                `/search/public/${issueId}/share`,
                { platform },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error) {
            console.error('Share tracking error:', error);
        }
    };

    const handleSocialShare = async (platform) => {
        setShareLoading(true);
        await trackShare(platform);

        let shareLink = '';
        const encodedUrl = encodeURIComponent(shareUrl);
        const encodedTitle = encodeURIComponent(`Check out this issue: ${issueTitle}`);

        switch (platform) {
            case 'facebook':
                shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
                break;
            case 'twitter':
                shareLink = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
                break;
            case 'whatsapp':
                shareLink = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
                break;
            case 'linkedin':
                shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
                break;
            case 'telegram':
                shareLink = `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;
                break;
        }

        window.open(shareLink, '_blank', 'width=600,height=400');
        setShareLoading(false);
        onClose();
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: issueTitle,
                    text: 'Check out this issue reported on Abar Nosto!',
                    url: shareUrl,
                });
                await trackShare('native');
                onClose();
            } catch (err) {
                console.error('Share failed:', err);
            }
        } else {
            handleCopyLink();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-5 border-b">
                    <h3 className="text-xl font-semibold text-gray-900">Share Issue</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5">
                    {/* Share Link */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Share Link</label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="text"
                                value={shareUrl}
                                readOnly
                                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600"
                            />
                            <button
                                onClick={handleCopyLink}
                                className="px-4 py-2 bg-[#1B2D57] text-white rounded-lg hover:bg-[#0F172A] transition"
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </div>

                    {/* Social Share Options */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Share on Social Media</label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => handleSocialShare('facebook')}
                                className="flex flex-col items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                            >
                                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                                </svg>
                                <span className="text-xs mt-1 text-gray-600">Facebook</span>
                            </button>
                            <button
                                onClick={() => handleSocialShare('twitter')}
                                className="flex flex-col items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                            >
                                <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                                </svg>
                                <span className="text-xs mt-1 text-gray-600">Twitter</span>
                            </button>
                            <button
                                onClick={() => handleSocialShare('whatsapp')}
                                className="flex flex-col items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition"
                            >
                                <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12.032 2.003c-5.518 0-10 4.482-10 10 0 1.834.495 3.546 1.357 5.012l-1.357 4.985 5.148-1.33c1.43.785 3.05 1.233 4.852 1.233 5.518 0 10-4.482 10-10s-4.482-10-10-10zm0 18.5c-1.543 0-2.993-.42-4.242-1.148l-.308-.184-3.11.802.85-3.06-.197-.32c-.79-1.267-1.243-2.74-1.243-4.29 0-4.554 3.706-8.26 8.26-8.26s8.26 3.706 8.26 8.26-3.706 8.26-8.26 8.26z" />
                                    <path d="M16.6 13.82c-.253-.126-1.5-.74-1.734-.826-.232-.085-.402-.127-.572.127-.17.253-.66.826-.81.995-.148.17-.297.192-.55.064-.253-.127-1.07-.395-2.037-1.257-.753-.672-1.26-1.5-1.41-1.754-.148-.253-.017-.39.112-.516.116-.116.254-.296.38-.445.127-.148.17-.254.254-.423.085-.17.042-.317-.022-.444-.063-.127-.573-1.38-.785-1.89-.208-.5-.416-.414-.572-.422-.148-.008-.318-.008-.488-.008s-.446.064-.678.317c-.233.254-.89.87-.89 2.122 0 1.252.91 2.462 1.038 2.632.127.17 1.79 2.736 4.34 3.836 2.55 1.1 2.55.733 3.01.687.46-.045 1.485-.607 1.694-1.193.21-.586.21-1.088.148-1.193-.064-.106-.233-.17-.487-.297z" />
                                </svg>
                                <span className="text-xs mt-1 text-gray-600">WhatsApp</span>
                            </button>
                        </div>
                    </div>

                    {/* Native Share Button (Mobile) */}
                    {navigator.share && (
                        <button
                            onClick={handleNativeShare}
                            className="w-full mt-2 py-3 bg-[#1B2D57] text-white rounded-lg font-medium hover:from-blue-700 hover:bg-[#0F172A] transition"
                        >
                            Share via Native Share
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShareModal;