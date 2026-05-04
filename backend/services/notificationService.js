const Notification = require('../models/Notification');
const Follow = require('../models/Follow');
const NotificationPreference = require('../models/NotificationPreference');
const Report = require('../models/Report');

let io = null;
function setSocketInstance(socketInstance) { io = socketInstance; }

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function notifyUser(userId, data) {
    console.log(`📢 notifyUser called for user ${userId}, type: ${data.type}`);
    const prefs = await NotificationPreference.findOne({ user: userId });
    if (prefs && prefs.enableAll === false) return null;

    let allowed = true;
    if (prefs) {
        switch (data.type) {
            case 'followed_issue_update': allowed = prefs.onFollowedUpdate; break;
            case 'nearby_issue': allowed = prefs.onNearbyIssue; break;
            case 'status_change': allowed = prefs.onStatusChange; break;
            case 'new_comment': allowed = prefs.onNewComment; break;
            case 'upvote_received': allowed = prefs.onUpvoteReceived; break;
            case 'issue_archived': allowed = prefs.onIssueArchived; break;      // ✅ new
            case 'issue_reactivated': allowed = prefs.onIssueReactivated; break;
        }
        if (!allowed) return null;
    }

    if (data.type === 'nearby_issue') {
        const recent = await Notification.findOne({
            user: userId,
            type: 'nearby_issue',
            relatedIssue: data.relatedIssue,
            createdAt: { $gt: new Date(Date.now() - 30 * 1000) }
        });
        if (recent) return null;
    }

    const notification = new Notification({ user: userId, ...data });
    await notification.save();
    console.log(`✅ Notification saved for user ${userId}`);

    if (io) {
        console.log(`📡 Emitting to user_${userId}`);
        io.to(`user_${userId}`).emit('notification', notification);
    } else {
        console.error('❌ io is null, cannot emit notification');
    }
    return notification;
}

async function notifyFollowers(issueId, excludeUserId, data) {
    console.log(`🔔 notifyFollowers called for issue ${issueId}, type: ${data.type}`);
    const followers = await Follow.find({ issue: issueId }).distinct('user');
    console.log(`📊 Found ${followers.length} followers`);
    const usersToNotify = followers.filter(id => id.toString() !== excludeUserId?.toString());
    const results = await Promise.allSettled(
        usersToNotify.map(userId => notifyUser(userId, data))
    );
    return results
        .filter(r => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value);
}

async function notifyAuthor(issueId, excludeUserId, data) {
    try {
        const issue = await Report.findById(issueId).select('user');
        if (!issue) {
            console.log(`⚠️ Issue ${issueId} not found, cannot notify author`);
            return null;
        }
        const authorId = issue.user?.toString();
        if (!authorId) {
            console.log(`⚠️ Issue ${issueId} has no author`);
            return null;
        }
        if (authorId === excludeUserId?.toString()) {
            console.log(`ℹ️ Author is the actor, skipping notification`);
            return null;
        }
        console.log(`📢 Notifying author ${authorId} about ${data.type}`);
        return notifyUser(authorId, data);
    } catch (error) {
        console.error(`❌ Error in notifyAuthor:`, error);
        return null;
    }
}

async function findNearbyUsers(lat, lng, globalMaxRadiusMeters = 5000) {
    console.log(`🔍 Searching for users near (${lat}, ${lng}) within ${globalMaxRadiusMeters}m`);

    const candidates = await NotificationPreference.find({
        savedLocation: {
            $near: {
                $geometry: { type: "Point", coordinates: [lng, lat] },
                $maxDistance: globalMaxRadiusMeters
            }
        }
    }).lean();

    console.log(`📍 Found ${candidates.length} candidates within ${globalMaxRadiusMeters}m (before per-user radius filter)`);

    const eligible = candidates.filter(pref => {
        if (!pref.savedLocation?.coordinates) {
            console.log(`⚠️ User ${pref.user} has no coordinates`);
            return false;
        }
        const distance = getDistanceFromLatLonInMeters(
            lat, lng,
            pref.savedLocation.coordinates[1],
            pref.savedLocation.coordinates[0]
        );
        const userRadius = pref.nearbyRadius || 1000;
        const isWithin = distance <= userRadius;
        console.log(`User ${pref.user} distance: ${Math.round(distance)}m, radius: ${userRadius}m -> ${isWithin ? '✅' : '❌'}`);
        return isWithin;
    });

    console.log(`✅ ${eligible.length} users eligible after radius filter`);
    return eligible.map(pref => ({ userId: pref.user, preference: pref }));
}

async function notifyAdmins(data) {
    if (!io) {
        console.error('❌ io is null, cannot notify admins');
        return;
    }
    console.log(`📢 Broadcasting to admins: ${data.type}`);
    io.to('admins').emit('notification', data);
}

module.exports = {
    notifyUser,
    notifyFollowers,
    notifyAuthor,
    findNearbyUsers,
    getDistanceFromLatLonInMeters,
    setSocketInstance,
    notifyAdmins
};