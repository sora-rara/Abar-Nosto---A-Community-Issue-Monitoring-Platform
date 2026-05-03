import { useState, useEffect } from 'react';
import API from '../services/api';

const ActivityFeed = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActivities();
        // Poll for new activities every 10 seconds
        const interval = setInterval(fetchActivities, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchActivities = async () => {
        try {
            // FIX: Change from 'activity-feed' to 'activities/feed'
            const response = await API.get('issues/activities/feed');
            setActivities(response.data.data || []);
        } catch (error) {
            console.error('Error fetching activities:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActivityIcon = (type) => {
        switch (type) {
            case 'new_issue':
                return '🆕';
            case 'new_comment':
                return '💬';
            case 'status_update':
                return '📊';
            case 'upvote':
                return '👍';
            case 'downvote':
                return '👎';
            default:
                return '📌';
        }
    };

    const getActivityColor = (type) => {
        switch (type) {
            case 'new_issue':
                return 'border-blue-500 bg-blue-50';
            case 'new_comment':
                return 'border-green-500 bg-green-50';
            case 'status_update':
                return 'border-purple-500 bg-purple-50';
            case 'upvote':
                return 'border-green-500 bg-green-50';
            case 'downvote':
                return 'border-red-500 bg-red-50';
            default:
                return 'border-gray-500 bg-gray-50';
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-4">
                <h2 className="text-lg font-semibold mb-4">Live Activity Feed</h2>
                <div className="text-center text-gray-500">Loading activities...</div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-4">Live Activity Feed</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
                {activities.length === 0 ? (
                    <p className="text-gray-500 text-center">No recent activities</p>
                ) : (
                    activities.map((activity) => (
                        <div
                            key={activity._id}
                            className={`p-3 rounded border-l-4 ${getActivityColor(activity.type)}`}
                        >
                            <div className="flex items-start space-x-2">
                                <span className="text-xl">{getActivityIcon(activity.type)}</span>
                                <div className="flex-1">
                                    <p className="text-sm text-gray-800">
                                        <span className="font-semibold">{activity.userName}</span>{' '}
                                        {activity.type === 'new_issue' && 'reported a new issue'}
                                        {activity.type === 'new_comment' && 'commented on'}
                                        {activity.type === 'status_update' && 'updated status of'}
                                        {activity.type === 'upvote' && 'upvoted'}
                                        {activity.type === 'downvote' && 'downvoted'}{' '}
                                        <span className="font-medium text-blue-600">
                                            {activity.issueTitle}
                                        </span>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {new Date(activity.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ActivityFeed;