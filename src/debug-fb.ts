
import dotenv from "dotenv";
dotenv.config();

const PAGE_ID = process.env.FB_PAGE_ID;
const ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const API_VERSION = "v19.0";

async function testPermissions() {
    console.log("=== Facebook Permission Diagnostic Tool ===\n");

    if (!PAGE_ID || !ACCESS_TOKEN) {
        console.error("Error: FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN not found in .env");
        return;
    }

    const endpoints = [
        { name: "Basic Identity", path: "/me?fields=id,name,link" },
        { name: "Permissions Check", path: `/${PAGE_ID}/permissions` },
        { name: "Page Feed (Posts)", path: `/${PAGE_ID}/feed?limit=3` },
        { name: "Page Info", path: `/${PAGE_ID}?fields=about,emails,description` }
    ];

    for (const ep of endpoints) {
        console.log(`[Testing] ${ep.name}...`);
        const url = `https://graph.facebook.com/${API_VERSION}${ep.path}&access_token=${ACCESS_TOKEN}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (response.ok) {
                console.log(`✅ Success: ${ep.name}`);
                console.log(JSON.stringify(data, null, 2).substring(0, 300) + "...");
            } else {
                console.log(`❌ Failed: ${ep.name}`);
                console.log(`Status: ${response.status}`);
                console.log(`Error: ${JSON.stringify(data.error)}`);
            }
        } catch (err) {
            console.error(`💥 Request Error:`, err);
        }
        console.log("\n-------------------\n");
    }
}

testPermissions();
