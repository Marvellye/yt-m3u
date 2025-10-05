import express from "express";
import fetch from "node-fetch";

const app = express();

app.get("/", async (req, res) => {
  const target = req.query.url;
  if (!target) {
    return res.status(400).send("Usage: /?url=https://www.youtube.com/@channel/live");
  }

  const headers = {
    "User-Agent": "com.google.android.youtube/19.10.34 (Linux; U; Android 11)",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://www.youtube.com",
    "Referer": "https://www.youtube.com/"
  };

  const response = await fetch(target, { headers });
  const html = await response.text();

  const metaRedirect = html.match(/<meta http-equiv="refresh" content="0; url=([^"]+)"/i);
  if (metaRedirect && metaRedirect[1]) {
    const nextUrl = "https://www.youtube.com" + metaRedirect[1].replace(/&amp;/g, "&");
    const nextRes = await fetch(nextUrl, { headers });
    const nextHtml = await nextRes.text();
    const match2 = nextHtml.match(/"hlsManifestUrl":"(https:[^"]+\\.m3u8)"/);
    if (match2) return res.redirect(decodeURIComponent(match2[1]));
  }

  const match = html.match(/"hlsManifestUrl":"(https:[^"]+\\.m3u8)"/);
  if (match) return res.redirect(decodeURIComponent(match[1]));

  res.status(404).send("⚠️ No live stream found (channel may be offline)");
});

app.listen(3000, () => console.log("Server running on port 3000"));
