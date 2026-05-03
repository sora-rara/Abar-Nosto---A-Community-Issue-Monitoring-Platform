/**
 * fixStatusSync.js
 * Run once: node backend/scripts/fixStatusSync.js
 *
 * What it does:
 *  1. Backfills status:'reported' on any Report that has no status field
 *     (these were silently stripped by Mongoose strict mode before the schema fix)
 *  2. Re-syncs every AdminIssue.status to match its paired Report.status
 *     (fixes the archive tab showing stale data)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Report = require('../models/Report');
const AdminIssue = require('../models/AdminIssue');

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Backfill missing status on Report documents
    const backfillResult = await Report.updateMany(
        { status: { $exists: false } },
        { $set: { status: 'reported' } }
    );
    console.log(`✅ Backfilled status on ${backfillResult.modifiedCount} Report documents`);

    // 2. Re-sync AdminIssue.status from Report.status for all pairs
    const adminIssues = await AdminIssue.find({}).lean();
    let synced = 0;
    let mismatches = 0;

    for (const ai of adminIssues) {
        const report = await Report.findById(ai.originalReportId).lean();
        if (!report) continue;

        if (ai.status !== report.status) {
            mismatches++;
            await AdminIssue.findByIdAndUpdate(ai._id, { $set: { status: report.status } });
            console.log(`  🔄 AdminIssue ${ai._id}: '${ai.status}' → '${report.status}' (title: ${ai.title})`);
        }
        synced++;
    }

    console.log(`\n✅ Checked ${synced} AdminIssue docs, fixed ${mismatches} mismatches`);
    await mongoose.disconnect();
    console.log('Done.');
}

run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});