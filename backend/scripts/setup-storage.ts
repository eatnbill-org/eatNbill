
import { supabaseAdmin } from '../src/utils/supabase';
import { STORAGE_BUCKETS } from '../src/utils/storage';

async function setupStorage() {
    console.log('Initializing Storage Buckets...');

    const { data: existingBuckets, error: listError } = await supabaseAdmin.storage.listBuckets();

    if (listError) {
        console.error('Error listing buckets:', listError);
        process.exit(1);
    }

    const existingBucketNames = new Set(existingBuckets.map(b => b.name));
    const requiredBuckets = Object.values(STORAGE_BUCKETS);

    for (const bucketName of requiredBuckets) {
        if (existingBucketNames.has(bucketName)) {
            console.log(`✅ Bucket '${bucketName}' already exists.`);
            continue;
        }

        console.log(`⚠️ Bucket '${bucketName}' missing. Creating...`);

        // Create bucket (Private by default as code uses signed URLs)
        // allowing common image types
        const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
            public: false,
            fileSizeLimit: 5242880, // 5MB limit
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/x-icon', 'image/svg+xml']
        });

        if (createError) {
            console.error(`❌ Failed to create bucket '${bucketName}':`, createError);
        } else {
            console.log(`✅ Bucket '${bucketName}' created successfully.`);
        }
    }
}

setupStorage();
