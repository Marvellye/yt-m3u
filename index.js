import express from "express";
import fetch from "node-fetch";

const app = express();

app.get("*", async (req, res) => {
  try {
    const urlObj = new URL(req.protocol + "://" + req.get("host") + req.originalUrl);
    let target = urlObj.searchParams.get("url");

    // handle path-style: /https://www.youtube.com/@channel/live
    if (!target) {
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      if (pathParts.length > 0) {
        target = decodeURIComponent("https://" + pathParts.join("/"));
      } else {
        return res.status(400).send("Usage: /?url=https://www.youtube.com/@channel/live");
      }
    }

    // fetch target page
    const yt = await fetch(target, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    const html = await yt.text();

    // detect meta redirect (YouTube often uses it on /live)
    const metaRedirect = html.match(/<meta http-equiv="refresh" content="0; url=([^"]+)"/i);
    if (metaRedirect && metaRedirect[1]) {
      const nextUrl = "https://www.youtube.com" + metaRedirect[1].replace(/&amp;/g, "&");

      const nextRes = await fetch(nextUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept-Language": "en-US,en;q=0.9"
        }
      });

      const nextHtml = await nextRes.text();
      const match2 = nextHtml.match(/"hlsManifestUrl":"(https:[^"]+\.m3u8)"/);
      if (match2) {
        const stream = decodeURIComponent(match2[1]);
        return res.redirect(stream);
      }
    }

    // try to find HLS manifest directly
    const match = html.match(/"hlsManifestUrl":"(https:[^"]+\.m3u8)"/);
    if (!match) {
      return res.status(404).send("⚠️ No live stream found (channel may be offline)");
    }

    const stream = decodeURIComponent(match[1]);
    return res.redirect(stream);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});