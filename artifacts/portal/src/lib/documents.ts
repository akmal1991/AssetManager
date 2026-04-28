type DownloadableDocument = {
  downloadUrl?: string;
  fileName?: string;
};

export async function downloadProtectedDocument(file: DownloadableDocument) {
  if (!file.downloadUrl) {
    throw new Error("Document download link is missing");
  }

  const response = await fetch(file.downloadUrl);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Document download failed (${response.status})`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const fileName = file.fileName || "document";
  const isPdf = blob.type === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    const opened = window.open(objectUrl, "_blank", "noopener,noreferrer");
    if (opened) {
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      return;
    }
  }

  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 5_000);
}
