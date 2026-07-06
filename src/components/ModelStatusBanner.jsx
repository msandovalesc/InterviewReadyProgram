export default function ModelStatusBanner({ status }) {
  if (status === "available") return null;

  if (status === "downloadable") {
    return (
      <div className="model-banner model-banner-info">
        Gemini Nano needs to download before first use. Click "Evaluate with AI"
        to trigger the download.
      </div>
    );
  }

  if (status === "downloading") {
    return (
      <div className="model-banner model-banner-info">
        <span className="spinner" /> Gemini Nano is downloading... this may take
        a few minutes.
      </div>
    );
  }

  if (status === "unavailable") {
    return (
      <div className="model-banner model-banner-error">
        Your device doesn't meet the requirements for on-device AI. You need
        Chrome 138+, a GPU with &gt;4 GB VRAM (or 16 GB RAM + 4 cores), and
        22 GB free storage.
      </div>
    );
  }

  return (
    <div className="model-banner model-banner-error">
      Chrome Built-in AI is not available. Make sure you've enabled the flag at{" "}
      <code>chrome://flags/#prompt-api-for-gemini-nano</code> and restarted
      Chrome.
    </div>
  );
}
