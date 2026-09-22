'use client';
import PageHeader from '@/components/PageHeader';
import WritingReviewPanel from '@/components/WritingReviewPanel';

/**
 * Munli's writing tool. A surface of its own, which is the whole reason the
 * Word/Passage toggle does not come back with it.
 *
 * ⚠️ **The tab used to drop you straight into the panel with no guidance**, and
 * the thing worth telling someone — that the passage can be as broken as it
 * comes out, and a word you do not have can go in in your own language — is not
 * visible anywhere on the screen. It is behind the "?" rather than on the page:
 * pull, not push.
 */
export default function MunliWritingPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader
        titleKey="munliToolWriting"
        helpTitleKey="helpWritingTitle"
        helpLeadKey="helpWritingLead"
        helpPointsKey="helpWritingPoints"
      />
      <WritingReviewPanel />
    </div>
  );
}
