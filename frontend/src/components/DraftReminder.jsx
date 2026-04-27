// frontend/src/components/DraftReminder.jsx
const DraftReminder = ({ onLoad, onDismiss }) => {
    return (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Continue where you left off?</h3>
                <p className="text-gray-600 mb-6">You have an unsaved draft from your last session.</p>
                <div className="flex gap-3">
                    <button
                        onClick={onLoad}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        Load Draft
                    </button>
                    <button
                        onClick={onDismiss}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                        Start Fresh
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DraftReminder;