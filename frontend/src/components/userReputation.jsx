const UserReputation = ({ reputation, size = 'small', showLabel = false }) => {
    let color = 'text-gray-600';
    let bgColor = 'bg-gray-100';
    let fontSize = 'text-sm';
    let iconSize = 'w-4 h-4';
    let label = '';

    if (size === 'large') {
        fontSize = 'text-lg';
        iconSize = 'w-6 h-6';
    } else if (size === 'small') {
        fontSize = 'text-xs';
        iconSize = 'w-3 h-3';
    } else if (size === 'medium') {
        fontSize = 'text-sm';
        iconSize = 'w-4 h-4';
    }

    // Color coding based on reputation score
    if (reputation >= 100) {
        color = 'text-yellow-700';
        bgColor = 'bg-yellow-50';
        label = 'Gold Contributor';
    } else if (reputation >= 50) {
        color = 'text-gray-600';
        bgColor = 'bg-gray-100';
        label = 'Silver Contributor';
    } else if (reputation >= 20) {
        color = 'text-orange-700';
        bgColor = 'bg-orange-50';
        label = 'Bronze Contributor';
    } else if (reputation >= 10) {
        color = 'text-blue-700';
        bgColor = 'bg-blue-50';
        label = 'Active Member';
    } else if (reputation >= 0) {
        color = 'text-green-700';
        bgColor = 'bg-green-50';
        label = 'New Member';
    } else {
        color = 'text-red-700';
        bgColor = 'bg-red-50';
        label = 'Needs Improvement';
    }

    return (
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${bgColor}`}>
            <svg className={`${iconSize} ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span className={`font-medium ${fontSize} ${color}`}>
                {reputation}
            </span>
            {showLabel && label && (
                <span className={`text-xs ${color} ml-1 hidden sm:inline`}>
                    ({label})
                </span>
            )}
        </div>
    );
};

export default UserReputation;