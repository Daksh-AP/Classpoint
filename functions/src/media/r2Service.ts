import * as functions from 'firebase-functions';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Cloudflare R2 Client Configuration
 * Uses S3-compatible API with zero outbound egress fees.
 */
function getR2Client(): S3Client | null {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
        return null;
    }

    return new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });
}

/**
 * Generates a pre-signed PUT URL for direct client-to-R2 uploads.
 * Decouples heavy binary transfer from Firebase/servers completely.
 */
export const getR2UploadUrl = functions.https.onCall(async (data: {
    fileName: string;
    mimeType: string;
    schoolId: string;
    folder?: string;
}, context: functions.https.CallableContext) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { fileName, mimeType, schoolId, folder } = data;
    if (!fileName || !mimeType || !schoolId) {
        throw new functions.https.HttpsError('invalid-argument', 'fileName, mimeType, and schoolId are required.');
    }

    const s3Client = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME || 'classora-media';
    const publicDomain = process.env.R2_PUBLIC_DOMAIN; // e.g. "cdn.classora.com" or "pub-xxx.r2.dev"

    if (!s3Client || !publicDomain) {
        throw new functions.https.HttpsError(
            'failed-precondition',
            'Cloudflare R2 is not fully configured on server. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_DOMAIN in functions environment.'
        );
    }

    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folderPath = folder ? `${folder}/` : '';
    const fileKey = `schools/${schoolId}/${folderPath}${Date.now()}_${sanitizedName}`;

    try {
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
            ContentType: mimeType,
        });

        // 5-minute expiry for client upload
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
        const publicUrl = `https://${publicDomain.replace(/\/$/, '')}/${fileKey}`;

        return {
            uploadUrl,
            publicUrl,
            fileKey,
            bucket: bucketName,
        };
    } catch (err: any) {
        console.error('Failed to generate R2 pre-signed URL:', err);
        throw new functions.https.HttpsError('internal', err.message || 'Failed to generate R2 upload URL.');
    }
});

/**
 * Deletes an object from Cloudflare R2 when removed from Class Cloud
 */
export const deleteR2Media = functions.https.onCall(async (data: {
    fileKey: string;
}, context: functions.https.CallableContext) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { fileKey } = data;
    if (!fileKey) {
        throw new functions.https.HttpsError('invalid-argument', 'fileKey is required.');
    }

    const s3Client = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME || 'classora-media';

    if (!s3Client) {
        throw new functions.https.HttpsError('failed-precondition', 'Cloudflare R2 is not configured.');
    }

    try {
        await s3Client.send(new DeleteObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
        }));
        return { success: true };
    } catch (err: any) {
        console.error('Failed to delete R2 media:', err);
        throw new functions.https.HttpsError('internal', err.message || 'Failed to delete R2 media.');
    }
});
