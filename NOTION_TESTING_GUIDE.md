# Notion Integration Testing Guide

This guide helps you test the Notion integration end-to-end.

---

## Prerequisites

### 1. Create Notion Integration
1. Go to https://www.notion.so/my-integrations
2. Click **"+ New integration"**
3. Name it: `RSS Agent Digest`
4. Select your workspace
5. Click **"Submit"**
6. Copy the **"Internal Integration Token"**
7. Add to `.env` as `NOTION_API_KEY`

### 2. Create Notion Database
1. Open Notion
2. Create a new page
3. Add a **Database - Table** block
4. Name it: `Daily Digests`

### 3. Configure Database Properties
Add these properties to your database:

| Property Name | Type | Description |
|--------------|------|-------------|
| Title | Title | Digest title (default) |
| Generated | Date | When digest was created |
| Window | Select | Time window (24h, 7d, etc.) |
| Topics | Number | Number of clusters |
| Articles | Number | Total articles |
| Quality | Number | Silhouette score |

**To add properties**:
1. Click **"+"** in the table header
2. Select property type
3. Name the property exactly as shown above

### 4. Share Database with Integration
1. Click **"Share"** button (top right of database)
2. Click **"Invite"**
3. Search for your integration name: `RSS Agent Digest`
4. Click **"Invite"**

### 5. Get Database ID
1. Open the database as a full page
2. Copy the URL: `https://notion.so/workspace/DATABASE_ID?v=...`
3. Extract the `DATABASE_ID` (32 characters with dashes)
4. Add to `.env` as `NOTION_DATABASE_ID`

**Example**:
```
URL: https://notion.so/myworkspace/2bf5bef662568085949700c203ec0aa?v=...
ID:  2bf5bef6-6256-8085-9497-00c203ec0aa
```

---

## Running Tests

### Test 1: Basic Notion Posting
```bash
npm run test:notion-posting
```

**Expected Output**:
```
✅ Environment check passes
✅ Mock digest created
✅ Successfully posted to Notion!
📄 Page URL: https://notion.so/...
```

### Test 2: End-to-End with All Formats
```bash
npm run test:notion-e2e
```

**Expected Output**:
```
✅ Test 1/4: Full Featured - Success
✅ Test 2/4: Collapsed Articles - Success
✅ Test 3/4: No TOC - Success
✅ Test 4/4: Minimal - Success

🎉 All tests passed!
```

This creates **4 test pages** in your Notion database.

### Test 3: CLI Dry-Run
```bash
npm run digest -- --dry-run
```

**Expected Output**:
```
🔍 Dry-run mode: Digest preview
   Title: 📰 Daily Digest - ...
   Clusters: 5
   Total Articles: 23
```

### Test 4: CLI Post to Notion
```bash
npm run digest -- --post
```

**Expected Output**:
```
📤 Posting to Notion...
✅ Successfully posted to Notion!
📄 Page URL: https://notion.so/...
```

---

## Manual Verification in Notion

After running tests, check your Notion database:

### ✅ Database View
- [ ] New pages appear in the database
- [ ] Properties are filled correctly
- [ ] Icons are displayed (📰, 📋, 📄, 📝)
- [ ] Dates are correct

### ✅ Page Content (Open a test page)

**Header**:
- [ ] Callout box with summary (blue background, 📊 icon)
- [ ] Shows total articles and quality score

**Table of Contents** (if enabled):
- [ ] TOC block appears
- [ ] Links to each cluster section

**Cluster Sections**:
- [ ] Heading 2 with cluster topic
- [ ] Summary paragraph
- [ ] "Key Takeaways" heading (H3)
- [ ] Bulleted list of takeaways
- [ ] "Articles" heading (H3)

**Articles**:
- [ ] Articles with URLs: Bookmark blocks (rich preview)
- [ ] Articles without URLs: Bulleted list
- [ ] If collapsed: Articles in toggle blocks
- [ ] If expanded: Articles as regular list

**Dividers**:
- [ ] Dividers between clusters

---

## Troubleshooting

### Error: "Could not find database"
**Cause**: Database not shared with integration

**Fix**:
1. Open database in Notion
2. Click "Share" → "Invite"
3. Select your integration
4. Click "Invite"

### Error: "NOTION_API_KEY environment variable is required"
**Cause**: Missing API key in `.env`

**Fix**:
1. Copy `.env.example` to `.env`
2. Add your integration token to `NOTION_API_KEY`

### Error: "NOTION_DATABASE_ID environment variable is required"
**Cause**: Missing database ID in `.env`

**Fix**:
1. Get database ID from URL
2. Add to `NOTION_DATABASE_ID` in `.env`

### Error: "unauthorized" or "invalid_grant"
**Cause**: Invalid or expired API key

**Fix**:
1. Go to https://www.notion.so/my-integrations
2. Find your integration
3. Click "Show" to reveal token
4. Copy new token to `.env`

---

## Expected Results

### Successful Test Run
- ✅ 4 test pages created in Notion
- ✅ All properties populated
- ✅ Rich formatting displayed correctly
- ✅ Bookmarks show previews
- ✅ TOC links work
- ✅ Toggles expand/collapse

### What to Look For
1. **Visual Appeal**: Pages should look professional
2. **Readability**: Content should be well-organized
3. **Functionality**: Links and toggles should work
4. **Consistency**: All pages should follow same format

---

## Cleanup

After testing, you can delete test pages:
1. Open Notion database
2. Select test pages (checkbox on left)
3. Click "Delete" (trash icon)
4. Confirm deletion

---

## Next Steps

Once testing is successful:
1. ✅ Notion integration is working
2. ✅ Ready to generate real digests
3. ✅ Run `npm run digest -- --post` for production use

For production:
- Set up scheduled digest generation (cron job)
- Monitor Notion API usage
- Adjust formatting options as needed

