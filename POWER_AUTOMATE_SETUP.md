# Automatic PDF Delivery — Power Automate Setup

When a candidate finishes, the app sends the report (as HTML) to this flow. The flow
converts it to a **PDF** and emails it to the People Lead automatically.
One flow serves all People Leads — the recipient email is passed in dynamically.

> **Why HTML, not a PDF, from the app?** Browsers can't reliably generate a PDF on their
> own. Instead the app sends HTML and Power Automate does the conversion using OneDrive's
> file converter (free, no premium connectors).

## 1. Create the flow

1. Go to **https://make.powerautomate.com** → **Create** → **Instant cloud flow**.
2. Name it `Interview Report Delivery`, choose **"When an HTTP request is received"**, click **Create**.

## 2. Configure the trigger

Click the trigger → **"Use sample payload to generate schema"** and paste:

```json
{
  "plEmail": "name@unosquare.com",
  "candidateName": "Jane Doe",
  "role": "Mid Fullstack Developer",
  "date": "June 26, 2026",
  "average": "7.5",
  "sentiment": "Positive",
  "filename": "Interview_Report_Jane_Doe",
  "html": "<html>...</html>"
}
```

You can use `candidateName` in the email subject and body too (e.g. subject
`Interview Report — [candidateName] — [date]`).

## 3. Save the HTML as a Word-readable file (OneDrive)

`+ New step` → **OneDrive for Business → "Create file"**:
- **Folder Path:** `/InterviewReports` (create this folder in OneDrive first, or pick any folder)
- **File Name:** `@{triggerBody()?['filename']}.doc`  ← note the **`.doc`** extension
- **File Content:** `html` (dynamic content from the trigger)

> Word opens HTML content saved with a `.doc` extension, which lets the next step convert it.

## 4. Convert the file to PDF

`+ New step` → **OneDrive for Business → "Convert file"** (sometimes "Convert file using path"):
- **File:** the **Id** from the *Create file* step (dynamic content)
- **Target type:** `PDF`

## 5. Email the PDF to the People Lead

`+ New step` → **Office 365 Outlook → "Send an email (V2)"**. Sign in / connect the
**`people.mgmt@unosquare.com`** mailbox (if the flow is owned by another account, use
**"Send an email from a shared mailbox (V2)"** and set the mailbox to `people.mgmt@unosquare.com`):
- **To:** `plEmail` (dynamic)
- **Subject:** `Interview Report — ` `role` ` — ` `date`
- **Body:**
  ```
  A candidate has completed their mock interview.

  Role: [role]
  Date: [date]
  Average Score: [average]/10
  Overall Sentiment: [sentiment]

  The full evaluation report is attached as a PDF.
  ```
- Expand **Advanced parameters** → **Attachments**:
  - **Attachments Name – 1:** `@{triggerBody()?['filename']}.pdf`
  - **Attachments Content – 1:** the **File Content** output of the *Convert file* step (dynamic content)

## 6. (Optional) Clean up

`+ New step` → **OneDrive → "Delete file"** → File = the *Create file* step's **Id**, so the
temporary `.doc` files don't pile up.

## 7. Save & copy the URL

1. Click **Save**.
2. Re-open the **trigger** — copy the generated **HTTP POST URL**.

## 8. Paste the URL into the app

Open `src/constants.js` and set:

```js
export const FLOW_URL = "https://prod-XX.westus.logic.azure.com:443/workflows/.....";
```

Save and redeploy. Candidate reports now convert to PDF and email automatically.

---

### Notes

- **From address:** every report is sent *from* `people.mgmt@unosquare.com`, *to* the People Lead.
- **Fidelity:** Word's HTML→PDF engine renders the report's table-based layout cleanly
  (colors, score bars, sentiment, per-question feedback). It will look slightly flatter than
  the on-screen version (no rounded corners/gradients) but is clean and professional.
- **Security:** the flow URL contains an access signature and is embedded in the app's client
  code — treat the app as internal-only. Regenerate the URL anytime by re-creating the trigger.
- **Fallback:** if `FLOW_URL` is empty, or the send fails, the candidate sees manual
  **Open & Save as PDF** + **Email to People Lead** buttons (Chrome's native Save-as-PDF,
  which is pixel-perfect to what they see on screen).
