import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { DocumentSnapshot } from 'firebase-admin/firestore';
import { EventContext } from 'firebase-functions';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * Sends a multicast push notification to all matching registered devices in schools/{schoolId}/push_tokens.
 * Free, zero-cost notification layer powered by Firebase Cloud Messaging (FCM).
 */
async function dispatchMulticastToSchool(
    schoolId: string,
    payload: {
        title: string;
        body: string;
        data?: Record<string, string>;
        roleFilter?: 'parent' | 'teacher' | 'all';
    }
) {
    if (!schoolId) return;

    let tokensQuery: admin.firestore.Query = db.collection(`schools/${schoolId}/push_tokens`);
    if (payload.roleFilter && payload.roleFilter !== 'all') {
        tokensQuery = tokensQuery.where('role', '==', payload.roleFilter);
    }

    const tokensSnap = await tokensQuery.get();
    if (tokensSnap.empty) {
        return { successCount: 0, failureCount: 0 };
    }

    const tokenDocs = tokensSnap.docs;
    const tokens = tokenDocs.map(d => d.data().token).filter(Boolean);

    if (tokens.length === 0) return { successCount: 0, failureCount: 0 };

    // Batch send in chunks of 500 (FCM multicast limit)
    let totalSuccess = 0;
    let totalFailure = 0;
    const deadTokenRefs: admin.firestore.DocumentReference[] = [];

    for (let i = 0; i < tokens.length; i += 500) {
        const chunkTokens = tokens.slice(i, i + 500);
        const chunkDocs = tokenDocs.slice(i, i + 500);

        try {
            const response = await admin.messaging().sendEachForMulticast({
                tokens: chunkTokens,
                notification: {
                    title: payload.title,
                    body: payload.body,
                },
                data: payload.data || {},
                android: {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                        channelId: 'school_alerts',
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                        }
                    }
                }
            });

            totalSuccess += response.successCount;
            totalFailure += response.failureCount;

            // Prune invalid or expired tokens
            response.responses.forEach((res, idx) => {
                if (!res.success && res.error) {
                    const code = res.error.code;
                    if (
                        code === 'messaging/invalid-registration-token' ||
                        code === 'messaging/registration-token-not-registered'
                    ) {
                        deadTokenRefs.push(chunkDocs[idx].ref);
                    }
                }
            });
        } catch (error) {
            console.error('[FCM Dispatcher] Chunk send error:', error);
        }
    }

    // Clean up dead tokens in batch
    if (deadTokenRefs.length > 0) {
        const deleteBatch = db.batch();
        deadTokenRefs.forEach(ref => deleteBatch.delete(ref));
        await deleteBatch.commit().catch(e => console.warn('Failed to prune dead tokens:', e));
    }

    return { successCount: totalSuccess, failureCount: totalFailure };
}

/**
 * 1. Automatic Push Dispatch on Emergency Alerts
 * Triggered on new document created in schools/{schoolId}/alerts/{alertId}
 */
export const onEmergencyAlertCreated = functions.firestore
    .document('schools/{schoolId}/alerts/{alertId}')
    .onCreate(async (snap: DocumentSnapshot, context: EventContext) => {
        const { schoolId, alertId } = context.params;
        const data = snap.data();
        if (!data || !data.active) return;

        const title = `?? ${data.title || 'EMERGENCY ALERT'}`;
        const body = data.message || 'Important alert broadcasted from administration.';

        await dispatchMulticastToSchool(schoolId, {
            title,
            body,
            roleFilter: 'all',
            data: {
                type: 'emergency_alert',
                alertId,
                alertType: String(data.type || 'alert'),
            }
        });
    });

/**
 * 2. Automatic Push Dispatch on School Announcements
 * Triggered on new document created in schools/{schoolId}/announcements/{announcementId}
 */
export const onAnnouncementCreated = functions.firestore
    .document('schools/{schoolId}/announcements/{announcementId}')
    .onCreate(async (snap: DocumentSnapshot, context: EventContext) => {
        const { schoolId, announcementId } = context.params;
        const data = snap.data();
        if (!data) return;

        const title = `?? ${data.title || 'School Announcement'}`;
        const body = data.content || 'A new announcement has been posted.';

        await dispatchMulticastToSchool(schoolId, {
            title,
            body,
            roleFilter: 'parent',
            data: {
                type: 'announcement',
                announcementId,
                senderName: String(data.senderName || 'School'),
            }
        });
    });

/**
 * 3. Callable Push Dispatcher for manual administrative blasts at $0 cost
 */
export const sendSchoolNotification = functions.https.onCall(async (data: {
    schoolId: string;
    title: string;
    body: string;
    roleFilter?: 'parent' | 'teacher' | 'all';
    dataPayload?: Record<string, string>;
}, context: functions.https.CallableContext) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { schoolId, title, body, roleFilter, dataPayload } = data;
    if (!schoolId || !title || !body) {
        throw new functions.https.HttpsError('invalid-argument', 'schoolId, title, and body are required.');
    }

    return await dispatchMulticastToSchool(schoolId, {
        title,
        body,
        roleFilter: roleFilter || 'all',
        data: dataPayload || {},
    });
});
