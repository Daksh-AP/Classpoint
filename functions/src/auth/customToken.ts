import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface PinData {
    pin: string;
}

export const verifyPinAndMintToken = functions.https.onCall(async (data: PinData, context: functions.https.CallableContext) => {
    const { pin } = data;
    if (!pin) {
        throw new functions.https.HttpsError('invalid-argument', 'PIN is required');
    }

    const db = admin.firestore();
    const pinRef = db.collection('one_time_pins').doc(pin);

    try {
        const uid = await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
            const pinDoc = await transaction.get(pinRef);

            if (!pinDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Invalid PIN');
            }

            const pinData = pinDoc.data();
            if (!pinData) {
                throw new functions.https.HttpsError('internal', 'PIN data is corrupt');
            }

            if (Date.now() > pinData.expiresAt) {
                transaction.delete(pinRef);
                throw new functions.https.HttpsError('failed-precondition', 'PIN has expired');
            }

            transaction.delete(pinRef);
            return pinData.uid as string;
        });

        const token = await admin.auth().createCustomToken(uid);
        return { token };

    } catch (error: any) {
// /* console.error */ ("Error verifying PIN:", error);
        if (error.code && error.message) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Internal error validating PIN');
    }
});
